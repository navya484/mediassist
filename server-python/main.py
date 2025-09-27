# server.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
import numpy as np
from faster_whisper import WhisperModel
import noisereduce as nr
from transformers import pipeline
import google.generativeai as genai
import torch
import soundfile as sf
import io
import datetime
from pymongo import MongoClient

# =========================
# CONFIG
# =========================
app = FastAPI(title="Medical Audio Processing API")

MODEL_NAME = "base.en"
DEVICE = "cuda"
COMPUTE_TYPE = "float16"

genai.configure(api_key="AIzaSyDPJ4PamEcGXGVkc9XfVF_6SMVgfZSWC0c")
model_gen = genai.GenerativeModel("gemini-2.5-flash")

ner_model = pipeline("ner", model="d4data/biomedical-ner-all", aggregation_strategy="simple")
whisper_model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)

# MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["medical_records"]
collection = db["soap_notes"]

# Standard code mappings
icd10_mapping = {"chest pain": "R07", "shortness of breath": "R06.0", "hypertension": "I10", "diabetes": "E11"}
cpt_mapping = {"blood tests": "80053", "ecg": "93000"}
atc_mapping = {"metformin": "A10BA02"}

# =========================
# HELPER FUNCTIONS
# =========================
def preprocess_audio(y, sr):
    if len(y) == 0:
        return y
    peak = np.max(np.abs(y))
    if peak > 0:
        y = y / peak
    y = nr.reduce_noise(y=y, sr=sr, prop_decrease=0.9)
    return y

def map_to_codes(text):
    result = {"Diagnosis": [], "Procedures": [], "Medications": []}
    text_lower = text.lower()
    for term, code in icd10_mapping.items():
        if term in text_lower: result["Diagnosis"].append(f"{term} → {code}")
    for term, code in cpt_mapping.items():
        if term in text_lower: result["Procedures"].append(f"{term} → {code}")
    for term, code in atc_mapping.items():
        if term in text_lower: result["Medications"].append(f"{term} → {code}")
    return result

def process_audio_file(audio_bytes):
    # Load audio from bytes
    audio_np, sr = sf.read(io.BytesIO(audio_bytes))
    audio_np = np.mean(audio_np, axis=1) if audio_np.ndim > 1 else audio_np
    audio_np = preprocess_audio(audio_np, sr)

    # Transcribe
    segments, _ = whisper_model.transcribe(audio_np, beam_size=1, vad_filter=False)
    transcript_text = " ".join([seg.text.strip() for seg in segments]).strip()

    # NER
    entities = ner_model(transcript_text)
    entity_words = list(set([e['word'] for e in entities]))

    # Summary
    prompt_summary = f"Summarize the following medical entities:\n{', '.join(entity_words)}"
    summary = model_gen.generate_content(prompt_summary).text.strip()

    # SOAP note
    prompt_soap = f"""
You are a clinical assistant.
Extract medical info from the transcript and return a SOAP note.

Transcript:
{transcript_text}

Return in format:
S: 
O: 
A: 
P:
"""
    soap_note_text = model_gen.generate_content(prompt_soap).text.strip()
    soap_data = {"subjective": "", "objective": "", "assessment": "", "plan": ""}
    for line in soap_note_text.splitlines():
        if line.startswith("S:"): soap_data["subjective"] = line[2:].strip()
        elif line.startswith("O:"): soap_data["objective"] = line[2:].strip()
        elif line.startswith("A:"): soap_data["assessment"] = line[2:].strip()
        elif line.startswith("P:"): soap_data["plan"] = line[2:].strip()

    # Standard codes
    mapped_codes = map_to_codes(transcript_text)

    # Gemini Drug Recommendation
    if mapped_codes["Medications"]:
        prompt_drug = f"""
Patient standardized codes:
Diagnosis (ICD-10): {', '.join([d.split(' → ')[1] for d in mapped_codes['Diagnosis']])}
Procedures (CPT): {', '.join([p.split(' → ')[1] for p in mapped_codes['Procedures']])}
Medications (ATC): {', '.join([m.split(' → ')[1] for m in mapped_codes['Medications']])}

Suggest appropriate drug recommendations: drug class, example drugs, and treatment notes.
"""
        drug_recommendation = model_gen.generate_content(prompt_drug).text.strip()
    else:
        drug_recommendation = "No medications detected."

    return transcript_text, summary, soap_data, mapped_codes, entities, drug_recommendation

# =========================
# API ROUTE
# =========================
@app.post("/process_audio/")
async def process_audio(
    patient_name: str = Form(...),
    doctor_name: str = Form(...),
    files: list[UploadFile] = File(...)
):
    results = []
    for file in files:
        audio_bytes = await file.read()
        transcript_text, summary, soap_data, mapped_codes, entities, drug_recommendation = process_audio_file(audio_bytes)

        # Save to MongoDB
        patient_id = f"{patient_name}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        entities_mongo = [{"entity_group": e["entity_group"], "word": e["word"], 
                           "start": e["start"], "end": e["end"], "score": float(e["score"])} 
                          for e in entities]
        mongo_record = {
            "patientId": patient_id,
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "summary": summary,
            "soap": soap_data,
            "entities": entities_mongo,
            "mapped_codes": mapped_codes,
            "drug_recommendation": drug_recommendation,
            "transcript": transcript_text,
            "timestamp": datetime.datetime.now().isoformat()
        }
        collection.insert_one(mongo_record)

        results.append({
            "patient_id": patient_id,
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "summary": summary,
            "soap": soap_data,
            "mapped_codes": mapped_codes,
            "drug_recommendation": drug_recommendation
        })

    return JSONResponse(content={"results": results})
