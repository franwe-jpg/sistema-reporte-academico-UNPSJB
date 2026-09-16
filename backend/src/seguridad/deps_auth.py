from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from src.database import get_db
from src.personas import services as persona_services
from src.auth.services import SECRET, ALGORITHM  # usamos los valores reales del módulo auth

# Esquema de seguridad tipo Bearer (Authorization: Bearer <token>)
oauth2_scheme = HTTPBearer()


def get_current_token(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
) -> str:
    """
    Devuelve solo el string del token (sin el 'Bearer ').
    """
    return credentials.credentials


def get_current_persona(
    token: str = Depends(get_current_token),
    db: Session = Depends(get_db),
):
    """
    Extrae el persona_id desde el JWT y devuelve la Persona correspondiente.
    """
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        persona_id: int | None = payload.get("persona_id")

        if persona_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: falta persona_id",
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    persona = persona_services.leer_persona(db, persona_id)

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Persona no encontrada",
        )

    return persona
