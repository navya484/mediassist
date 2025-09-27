from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Any
import os
import io
import base64
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId
from openai import OpenAI
from .auth import create_access_token, decode_token, hash_password, verify_password
from .nlp import extract_soap
from .prescriptions import generate_prescription_pdf_and_qr
from .schemas import UserIn, UserOut, LoginIn, SOAPOut

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/mediassist")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change")

app = FastAPI(title="MediAssist AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client.get_default_database()
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# ===== Auth =====

@app.post("/auth/register")
async def register(user: UserIn):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    doc = {
        "name": user.name,
        "email": user.email,
        "password_hash": hash_password(user.password),
        "role": "doctor",
        "created_at": datetime.utcnow(),
    }
    res = await db.users.insert_one(doc)
    return {"ok": True, "id": str(res.inserted_id)}

@app.post("/auth/login")
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token({"sub": str(user["_id"]), "name": user["name"], "role": user.get("role", "doctor")})
    return {"token": token}

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    token = creds.credentials if creds else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(token)
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = None
        try:
            user = await db.users.find_one({"_id": ObjectId(uid)})
        except Exception:
            user = None
        return user or payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== Transcription =====

@app.websocket("/ws/transcribe")
async def ws_transcribe(ws: WebSocket):
    await ws.accept()
    from tempfile import NamedTemporaryFile
    buffer = bytearray()
    CHUNK_THRESHOLD = 400_000  # ~0.4MB before sending to Whisper
    try:
        while True:
            try:
                data = await ws.receive_bytes()
                buffer.extend(data)
                if len(buffer) >= CHUNK_THRESHOLD:
                    with NamedTemporaryFile(suffix=".webm") as tmp:
                        tmp.write(buffer)
                        tmp.flush()
                        try:
                            resp = openai_client.audio.transcriptions.create(
                                model="whisper-1",
                                file=open(tmp.name, "rb"),
                                response_format="json"
                            )
                            text = getattr(resp, "text", "") or ""
                            if text:
                                await ws.send_json({"type": "partial", "text": text})
                        except Exception:
                            pass
                    buffer.clear()
            except RuntimeError:
                msg = await ws.receive_text()
                if msg.strip() == '{"type":"done"}' or msg.strip() == "done":
                    if buffer:
                        with NamedTemporaryFile(suffix=".webm") as tmp:
                            tmp.write(buffer)
                            tmp.flush()
                            try:
                                resp = openai_client.audio.transcriptions.create(
                                    model="whisper-1",
                                    file=open(tmp.name, "rb"),
                                    response_format="json"
                                )
                                text = getattr(resp, "text", "") or ""
                                if text:
                                    await ws.send_json({"type": "final", "text": text})
                            except Exception:
                                pass
                    await ws.close()
                    break
    except WebSocketDisconnect:
        pass

class SOAPIn(BaseModel):
    text: str

@app.post("/soap", response_model=SOAPOut)
async def soap(payload: SOAPIn, user: Any = Depends(get_current_user)):
    data = extract_soap(payload.text)
    doc = {**data.dict(), "raw_text": payload.text, "doctor_id": user.get("sub") if isinstance(user, dict) else None, "created_at": datetime.utcnow()}
    res = await db.soap.insert_one(doc)
    data.id = str(res.inserted_id)
    return data

class PrescriptionIn(BaseModel):
    patient_name: str
    patient_id: str
    note: str

@app.post("/prescription")
async def prescription(payload: PrescriptionIn, user: Any = Depends(get_current_user)):
    pdf_bytes, qr_png_b64 = generate_prescription_pdf_and_qr(
        patient_name=payload.patient_name,
        patient_id=payload.patient_id,
        doctor_name=(user.get("name") if isinstance(user, dict) else "Doctor"),
        note=payload.note,
        jwt_secret=JWT_SECRET,
    )

    pres = {
        "patient_name": payload.patient_name,
        "patient_id": payload.patient_id,
        "doctor_name": (user.get("name") if isinstance(user, dict) else "Doctor"),
        "note": payload.note,
        "created_at": datetime.utcnow(),
    }
    res = await db.prescriptions.insert_one(pres)
    pres_id = str(res.inserted_id)

    await db.files.insert_one({
        "prescription_id": pres_id,
        "content_type": "application/pdf",
        "data_base64": base64.b64encode(pdf_bytes).decode("utf-8"),
        "created_at": datetime.utcnow(),
    })

    view_token = create_access_token({"prescription_id": pres_id})
    share_url = f"{os.getenv('PUBLIC_WEB_BASE_URL', 'http://localhost:3000')}/prescription/{pres_id}?token={view_token}"

    return {
        "id": pres_id,
        "qr_base64": f"data:image/png;base64,{qr_png_b64}",
        "share_url": share_url,
        "pdf_url": f"{os.getenv('PUBLIC_API_BASE_URL', 'http://localhost:8000')}/prescription/{pres_id}/pdf",
    }

@app.get("/prescription/{prescription_id}")
async def prescription_view(prescription_id: str, token: Optional[str] = None, auth: Any = Depends(get_current_user)):
    try:
        if token:
            payload = decode_token(token)
            pres_id_in_token = payload.get("prescription_id")
            if pres_id_in_token and pres_id_in_token != prescription_id:
                raise HTTPException(403, "Token not authorized for this prescription")
    except Exception:
        raise HTTPException(401, "Invalid token")
    doc = await db.prescriptions.find_one({"_id": ObjectId(prescription_id)})
    if not doc:
        raise HTTPException(404, "Not found")
    return {
        "id": prescription_id,
        "patient_name": doc["patient_name"],
        "patient_id": doc["patient_id"],
        "doctor_name": doc["doctor_name"],
        "note": doc["note"],
        "pdf_url": f"{os.getenv('PUBLIC_API_BASE_URL', 'http://localhost:8000')}/prescription/{prescription_id}/pdf",
    }

@app.get("/prescription/{prescription_id}/pdf")
async def prescription_pdf(prescription_id: str):
    file = await db.files.find_one({"prescription_id": prescription_id})
    if not file:
        raise HTTPException(404, "PDF not found")
    b64 = file["data_base64"]
    from fastapi.responses import Response
    return Response(content=base64.b64decode(b64), media_type="application/pdf")

class SyncIn(BaseModel):
    notes: List[Any] = []
    prescriptions: List[Any] = []

@app.post("/sync")
async def sync(payload: SyncIn, user: Any = Depends(get_current_user)):
    for n in payload.notes:
        n["doctor_id"] = user.get("sub") if isinstance(user, dict) else None
        await db.soap.insert_one(n)
    for p in payload.prescriptions:
        p["doctor_id"] = user.get("sub") if isinstance(user, dict) else None
        await db.prescriptions.insert_one(p)
    return {"ok": True}

@app.get("/records/{patient_id}")
async def records(patient_id: str, user: Any = Depends(get_current_user)):
    notes = [ {**n, "_id": str(n["_id"])} async for n in db.soap.find({"patient_id": patient_id}) ]
    pres = [ {**p, "_id": str(p["_id"])} async for p in db.prescriptions.find({"patient_id": patient_id}) ]
    return {"notes": notes, "prescriptions": pres}
