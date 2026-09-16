from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Carrera(ModeloBase):
    __tablename__ = "carreras"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String, index=True)
    sede: Mapped[str] = mapped_column(String, index=True)

    asignaturas = relationship("Asignatura", back_populates="carrera")
    informes_sinteticos_carreras = relationship("InformeSinteticoCarrera", back_populates="carrera")