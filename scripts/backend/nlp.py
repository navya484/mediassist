from pydantic import BaseModel
from typing import List
import re

class SOAPOut(BaseModel):
  id: str | None = None
  subject: List[str]
  objective: List[str]
  assessment: List[str]
  plan: List[str]
  formatted: str

def extract_soap(text: str) -> SOAPOut:
  # Placeholder: simple rule-based splits. Replace with spaCy + HF pipelines.
  sentences = [s.strip() for s in re.split(r"[.\n]", text) if s.strip()]
  subject = [s for s in sentences if any(k in s.lower() for k in ["complain", "pain", "symptom", "since"])]
  objective = [s for s in sentences if any(k in s.lower() for k in ["bp", "hr", "temp", "vital", "exam", "findings"])]
  assessment = [s for s in sentences if any(k in s.lower() for k in ["diagnos", "assessment", "likely", "impress"])]
  plan = [s for s in sentences if any(k in s.lower() for k in ["start", "prescribe", "mg", "bid", "plan", "follow up", "advice"])]
  formatted = (
    "S (Subjective):\n- " + "\n- ".join(subject or ["N/A"]) + "\n\n" +
    "O (Objective):\n- " + "\n- ".join(objective or ["N/A"]) + "\n\n" +
    "A (Assessment):\n- " + "\n- ".join(assessment or ["N/A"]) + "\n\n" +
    "P (Plan):\n- " + "\n- ".join(plan or ["N/A"])
  )
  return SOAPOut(
    subject=subject, objective=objective, assessment=assessment, plan=plan, formatted=formatted
  )
