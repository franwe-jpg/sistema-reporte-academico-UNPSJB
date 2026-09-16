from sqlalchemy import Integer, String, Enum as SQLEnum , ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from enum import Enum

class Cursado(str, Enum):
    cuatrimestre1 = "cuatrimestre 1"
    cuatrimestre2 = "cuatrimestre 2"
    anual= "anual"

class Asignatura(ModeloBase):
    __tablename__ = "asignaturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String, index=True)
    año: Mapped[int] = mapped_column(Integer, index=True)
    nombre_docente: Mapped[str] = mapped_column(String, unique=True, index=True)
    cursado: Mapped[Cursado] = mapped_column(SQLEnum(Cursado), nullable=False)
    sede: Mapped[str] = mapped_column(String, index=True)
    

    id_carrera: Mapped[int] = mapped_column(ForeignKey("carreras.id"))
    carrera = relationship("Carrera", back_populates="asignaturas")
    
    encuestas_asignaturas = relationship("EncuestaAsignatura", back_populates="asignatura")
    informes_asignaturas = relationship("InformeAsignatura", back_populates="asignatura")
    cursadas = relationship("Cursada", back_populates="asignatura")