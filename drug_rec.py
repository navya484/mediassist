from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import requests
from bs4 import BeautifulSoup

# -----------------------------
# 1. Sample SOAP note converted to standard codes
# -----------------------------
soap_standard = {
    "Diagnosis": ["E11", "I10"],           # ICD-10
    "Procedures": ["93784"],               # CPT
    "Medications": ["A10BA02"]             # ATC
}

# -----------------------------
# 2. Prepare input for TxAgent
# -----------------------------
patient_history_codes = " ".join(
    soap_standard["Diagnosis"] +
    soap_standard["Procedures"] +
    soap_standard["Medications"]
)

# -----------------------------
# 3. Load TxAgent Model
# -----------------------------
model_name = "mims-harvard/TxAgent-T1-Llama-3.1-8B"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

inputs = tokenizer(patient_history_codes, return_tensors="pt")
outputs = model.generate(**inputs, max_length=500)

# Decode the output
response = tokenizer.decode(outputs[0], skip_special_tokens=True)
print("TxAgent Response:", response)

# -----------------------------
# 4. Fetch drug class name and examples dynamically using ATC code
# -----------------------------
def fetch_drug_class_info(atc_code):
    """
    Fetch drug class name and example drugs from WHO ATC index.
    """
    url = f"https://www.whocc.no/atc_ddd_index/?code={atc_code}"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            # Class name
            header = soup.find("h2", class_="header")
            class_name = header.text.strip() if header else "Unknown"
            
            # Example drugs listed in table
            examples = []
            table = soup.find("table")
            if table:
                rows = table.find_all("tr")
                for row in rows:
                    cols = row.find_all("td")
                    if len(cols) >= 2:
                        drug_name = cols[1].text.strip()
                        if drug_name:
                            examples.append(drug_name)
            return class_name, examples
    except Exception as e:
        print("Error fetching ATC info:", e)
    return "Unknown", []

# -----------------------------
# 5. Map predicted drug class using the first medication ATC code
# -----------------------------
if soap_standard["Medications"]:
    atc_code = soap_standard["Medications"][0]
    drug_class_name, example_drugs = fetch_drug_class_info(atc_code)
else:
    drug_class_name, example_drugs = "Unknown", []

# -----------------------------
# 6. Display Output
# -----------------------------
print("\n📄 Patient Codes Input:", patient_history_codes)
print("💊 Recommended Drug Class Name (dynamic):", drug_class_name)
print("💊 Example Drugs:", ", ".join(example_drugs) if example_drugs else "N/A")
print("Medications (ATC):", ", ".join(soap_standard["Medications"]))