from pydantic import BaseModel, ConfigDict
from src.personas.schemas import Persona
from src.asignaturas.schemas import AsignaturaRead

class CursadaBase(BaseModel):
    ciclo_lectivo: int 

class CursadaCreate(CursadaBase):
    id_persona: int
    id_asignatura: int

class CursadaUpdate(BaseModel):
    pass

class CursadaRead(CursadaBase):
    id: int
    persona: Persona
    asignatura: AsignaturaRead
    
    model_config = ConfigDict(from_attributes=True)