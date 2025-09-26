from transformers import pipeline

# Load a free biomedical NER model from Hugging Face
ner_pipeline = pipeline("ner", model="d4data/biomedical-ner-all", aggregation_strategy="simple")

# Sample SOAP note
soap_note = """
Patient complains of headache and dizziness.
Blood pressure monitoring performed.
Assessment: Type 2 diabetes mellitus and hypertension.
Plan: Prescribed Metformin.
"""

# Step 1: Extract entities
entities = ner_pipeline(soap_note)

print("🔍 Extracted Entities:")
for ent in entities:
    print(f"{ent['word']} → {ent['entity_group']}")

# Step 2: Map entities to standard codes (basic local mappings for demo)
icd10_mapping = {
    "type 2 diabetes mellitus": "E11",
    "hypertension": "I10",
    "headache": "R51",
    "dizziness": "R42"
}

cpt_mapping = {
    "blood pressure monitoring": "93784"
}

atc_mapping = {
    "metformin": "A10BA02"
}

def map_to_codes(text):
    result = {"Diagnosis": [], "Procedures": [], "Medications": []}

    for term, code in icd10_mapping.items():
        if term in text.lower():
            result["Diagnosis"].append(f"{term} → {code}")

    for term, code in cpt_mapping.items():
        if term in text.lower():
            result["Procedures"].append(f"{term} → {code}")

    for term, code in atc_mapping.items():
        if term in text.lower():
            result["Medications"].append(f"{term} → {code}")

    return result

# Step 3: Run mapping
mapped_codes = map_to_codes(soap_note)

print("\n✅ Mapped Codes:")
print("Diagnosis:", mapped_codes["Diagnosis"])
print("Procedures:", mapped_codes["Procedures"])
print("Medications:", mapped_codes["Medications"])
