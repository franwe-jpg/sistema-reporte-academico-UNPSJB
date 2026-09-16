from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Cursada(ModeloBase):
    __tablename__ = "cursadas" 

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    id_persona: Mapped[int] = mapped_column(ForeignKey("personas.id"))
    id_asignatura: Mapped[int] = mapped_column(ForeignKey("asignaturas.id"))
    ciclo_lectivo: Mapped[int] = mapped_column(Integer) 
    persona = relationship("Persona", back_populates="cursadas")
    asignatura = relationship("Asignatura", back_populates="cursadas")