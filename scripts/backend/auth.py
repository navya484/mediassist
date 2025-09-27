import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change")
JWT_ALG = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_minutes: int = 60 * 24):
  to_encode = data.copy()
  expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
  to_encode.update({"exp": expire})
  return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str):
  try:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
  except JWTError as e:
    raise e

def hash_password(password: str) -> str:
  return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
  return pwd_context.verify(password, hashed)
