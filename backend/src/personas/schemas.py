from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class PersonaBase(BaseModel):
    apellido: str
    nombre: str
    dni: int
    telefono: str
    email: EmailStr
    contacto_emergencia: str


class PersonaCreate(PersonaBase):
    # contraseña en texto plano SOLO para creación
    password: str = Field(min_length=4, max_length=128)


class PersonaUpdate(BaseModel):
    apellido: Optional[str] = None
    nombre: Optional[str] = None
    dni: Optional[int] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    contacto_emergencia: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=4, max_length=128)


class Persona(PersonaBase):
    id: int
    model_config = {"from_attributes": True}
