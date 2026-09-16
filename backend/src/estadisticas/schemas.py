from pydantic import BaseModel
from typing import List, Union

class Indicador(BaseModel):
    titulo: str
    valor: Union[str, int]

class Dimension(BaseModel):
    nombre: str
    valor: float

class Valoracion(BaseModel):
    label: str
    valor: int

class TopAsignatura(BaseModel):
    nombre: str
    alumnos: int
    avance: int

class Alerta(BaseModel):
    tipo: str
    asignatura: str
    detalle: str
    severidad: str

class DashboardDTO(BaseModel):
    indicadores: List[Indicador]
    dimensiones: List[Dimension]
    valoraciones: List[Valoracion]
    top_asignaturas: List[TopAsignatura]
    alertas: List[Alerta]
    keywords: List[str]