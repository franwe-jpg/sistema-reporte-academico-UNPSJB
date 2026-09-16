from pydantic import BaseModel, EmailStr
from typing import List
from enum import Enum
from src.asignaturas.models import Cursado
from datetime import date
from src.reportes.models import Reporte
from src.encuestas_asignaturas.schemas import EncuestaAsignaturaRead


class ReporteBase(BaseModel):
    pass

class ReporteCreate(ReporteBase):
    id_encuesta_asignatura: int

class ReporteUpdate(ReporteBase):
    id_encuesta_asignatura: int

class Reporte(ReporteBase):
    id: int
    encuesta_asignatura: EncuestaAsignaturaRead
    model_config = {"from_attributes": True}

class ReporteListadoItem(BaseModel):
    id: int
    has_informe: bool
    has_respuesta: bool
    informe_id: int | None


class EncuestaAbiertaItem(BaseModel):
    """Encuesta todavia en curso de una asignatura del docente."""
    id: int
    asignatura: str
    ciclo_lectivo: int
    fecha_fin: date
    respuestas: int
