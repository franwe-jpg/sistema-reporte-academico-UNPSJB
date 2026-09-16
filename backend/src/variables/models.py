from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class Variable(ModeloBase):
    __tablename__ = "variables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String, index=True)
    codigo: Mapped[str] = mapped_column(String, unique=False, index=True)
    id_encuesta_base: Mapped[int] = mapped_column(ForeignKey("encuestas_base.id"), nullable=False)
    encuesta_base = relationship("EncuestaBase", back_populates="variables")
    
    preguntas = relationship("Pregunta", back_populates="variable")