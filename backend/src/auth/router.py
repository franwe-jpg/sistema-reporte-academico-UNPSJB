from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.database import get_db
from src.personas.models import Persona
from .schemas import LoginIn, TokenOut
from .services import crear_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, db: Session = Depends(get_db)):

    persona = db.query(Persona).filter(Persona.dni == datos.dni).first()

    if not persona or not persona.password_hash:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    if not persona.verificar_password(datos.password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = crear_access_token({"persona_id": persona.id})

    return TokenOut(access_token=token)