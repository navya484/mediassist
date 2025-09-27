from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserIn(BaseModel):
  name: str
  email: EmailStr
  password: str

class UserOut(BaseModel):
  id: str
  name: str
  email: EmailStr
  role: str

class LoginIn(BaseModel):
  email: EmailStr
  password: str

class SOAPOut(BaseModel):
  id: str | None = None
  subject: List[str]
  objective: List[str]
  assessment: List[str]
  plan: List[str]
  formatted: str
