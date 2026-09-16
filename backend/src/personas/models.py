from typing import List
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from passlib.hash import pbkdf2_sha256

class Persona(ModeloBase):
    __tablename__ = "personas"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    apellido: Mapped[str] = mapped_column(String, index=True)
    nombre: Mapped[str] = mapped_column(String, index=True)
    dni: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    telefono: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    contacto_emergencia: Mapped[str] = mapped_column(String, index=True)

    password_hash: Mapped[str] = mapped_column(String, nullable=True)

    respuestas: Mapped[List["Respuesta"]] = relationship(
        back_populates="persona"
    )
    roles: Mapped[List["Role"]] = relationship(
        secondary="personas_roles",
        back_populates="personas",
        lazy="selectin"
    )
    cursadas = relationship("Cursada", back_populates="persona")
    
    # 🔐 MÉTODO PARA VALIDAR CONTRASEÑA
    def verificar_password(self, password_plano: str) -> bool:
        return pbkdf2_sha256.verify(password_plano, self.password_hash)

    # 🔐 MÉTODO PARA SETEAR CONTRASEÑA
    def set_password(self, password: str):
        self.password_hash = pbkdf2_sha256.hash(password)
