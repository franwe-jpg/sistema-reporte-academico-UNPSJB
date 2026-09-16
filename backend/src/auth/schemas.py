from pydantic import BaseModel, Field

class LoginIn(BaseModel):
    dni: int
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegistroIn(BaseModel):
    """Alta de un alumno desde la pantalla de login.

    Solo se piden los datos imprescindibles; el resto de los campos
    obligatorios de Persona se completan a partir del DNI.
    """
    nombre: str = Field(min_length=2, max_length=60)
    apellido: str = Field(min_length=2, max_length=60)
    dni: int = Field(gt=0, lt=100_000_000)
    password: str = Field(min_length=4, max_length=72)


class RegistroOut(BaseModel):
    """Devuelve el token para poder entrar sin volver a escribir las credenciales."""
    persona_id: int
    nombre: str
    apellido: str
    access_token: str
    token_type: str = "bearer"
    asignaturas_inscriptas: int
