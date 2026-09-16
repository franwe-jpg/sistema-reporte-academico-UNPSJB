from typing import Optional, List
from sqlalchemy import Integer, String, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from datetime import date
from enum import Enum


class EstadoEncuesta(str, Enum):
    abierta = "abierta"
    cerrada = "cerrada"
    

class EncuestaAsignatura(ModeloBase):
    __tablename__ = "encuestas_asignaturas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    id_encuesta_base: Mapped[int] = mapped_column(ForeignKey("encuestas_base.id"), nullable=False)
    id_asignatura: Mapped[int] = mapped_column(ForeignKey("asignaturas.id"), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, index=True)
    fecha_fin: Mapped[date] = mapped_column(Date, index=True) 
    ciclo_lectivo: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[EstadoEncuesta] = mapped_column(SQLEnum(EstadoEncuesta), nullable=False, default=EstadoEncuesta.abierta)

    encuesta_base = relationship("EncuestaBase", back_populates="encuestas_asignaturas")
    asignatura = relationship("Asignatura", back_populates="encuestas_asignaturas")
    reportes = relationship("Reporte", back_populates="encuesta_asignatura")
    respuestas = relationship("Respuesta", back_populates="encuesta_asignatura")
    