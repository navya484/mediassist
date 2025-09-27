import os  # Added missing import
import re
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from dotenv import load_dotenv  # Corrected import statement for clarity

load_dotenv()

app = FastAPI()

API_KEY = os.getenv("API_KEY")

class TranscriptionData(BaseModel):
    transcription: str

class StructuredData(BaseModel):
    name: str
    diagnosis: str
    meds: str
    transcription: str

@app.post("/parse")
async def parse_transcription(data: TranscriptionData, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    transcription = data.transcription

    # Simple parsing for PoC (assume format: "Patient name: X. Diagnosis: Y. Medications: Z.")
    name_match = re.search(r"Patient name: (.*?)\.", transcription, re.IGNORECASE)
    diagnosis_match = re.search(r"Diagnosis: (.*?)\.", transcription, re.IGNORECASE)
    meds_match = re.search(r"Medications: (.*?)\.", transcription, re.IGNORECASE)

    structured = {
        "name": name_match.group(1) if name_match else "Unknown",
        "diagnosis": diagnosis_match.group(1) if diagnosis_match else "Unknown",
        "meds": meds_match.group(1) if meds_match else "Unknown",
        "transcription": transcription
    }

    return structured