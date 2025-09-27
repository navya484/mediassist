# MedAssist
AI-Powered Real-Time Clinical Documentation & Prescription System

 Project Ideology

MediAssist AI aims to digitize and automate medical documentation by converting doctor-patient conversations into structured, standardized clinical records.

This system reduces manual effort, improves accuracy, and enables data-driven clinical decision support by:

🎙 Capturing real-time or uploaded consultation audio

📝 Transcribing conversations with Whisper / Faster Whisper

🔎 Extracting symptoms, diagnoses, medications, and procedures using NER models

📑 Generating structured SOAP notes

🌍 Mapping clinical data to standard codes (ICD-10, CPT, ATC)

💊 Providing AI-powered drug recommendations

🗄 Securely storing everything in MongoDB for future retrieval and analytics

 Methodology
1. Audio Capture / Upload

Real-time audio recording via mic 🎤 or uploaded consultation recordings

Preprocessing: normalization, noise reduction (using PyAudio + noisereduce)

2. Speech-to-Text Transcription

Uses OpenAI Whisper or Faster Whisper

Supports real-time streaming & batch transcription

3. Named Entity Recognition (NER)

Extracts symptoms, diagnoses, medications, procedures

Built with Hugging Face biomedical models

4. Summarization & SOAP Note Generation

Uses Google Gemini for clinical summarization

Generates structured SOAP notes:

S: Subjective (patient complaints)

O: Objective (clinical findings & vitals)

A: Assessment (diagnoses)

P: Plan (treatment, medications)

5. Mapping to Standard Codes

Converts extracted entities into standard codes:

🩺 ICD-10 → Diagnoses

🧾 CPT → Procedures

💊 ATC → Medications

6. Drug Recommendation

AI-powered recommendation system (Gemini + Transformers)

Suggests drug classes, examples, and treatment notes

7. Storage & Retrieval

Stores transcripts, SOAP notes, codes, and prescriptions in MongoDB

Supports multi-doctor collaboration & multi-patient records

 Tech Stack

Frontend → React.js, CSS

Backend → FastAPI (Python)

Audio Processing → PyAudio, NumPy, noisereduce

Speech-to-Text → Whisper / Faster Whisper

NER → Hugging Face Transformers

Generative AI → Google Gemini API

Database → MongoDB

Standardization → ICD-10, CPT, ATC

