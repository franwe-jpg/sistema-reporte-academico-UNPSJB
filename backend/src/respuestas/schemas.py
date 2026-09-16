from pydantic import BaseModel, model_validator, ConfigDict
from typing import Optional, List
from src.detalle_respuesta.schemas import DetalleRespuestaCreate, DetalleRespuestaRead


class RespuestaBase(BaseModel):
    #ya no pedimos id_persona acá, lo toma el backend del token
    id_encuesta_asignatura: Optional[int] = None
    id_informe_asignatura: Optional[int] = None
    id_informe_sintetico_carrera: Optional[int] = None


class RespuestaCreate(RespuestaBase):
    detalles: List[DetalleRespuestaCreate]

    @model_validator(mode="after")
    def check_exactly_one_context(self):
        # si vienen 2 o más → error
        if (
            (self.id_encuesta_asignatura and self.id_informe_asignatura)
            or (self.id_encuesta_asignatura and self.id_informe_sintetico_carrera)
            or (self.id_informe_asignatura and self.id_informe_sintetico_carrera)
        ):
            raise ValueError(
                "La respuesta no puede pertenecer a más de un contexto a la vez "
                "(encuesta, informe asignatura o informe sintetico de carrera)."
            )
        # si no viene ninguno → error
        if (
            not self.id_encuesta_asignatura
            and not self.id_informe_asignatura
            and not self.id_informe_sintetico_carrera
        ):
            raise ValueError(
                "La respuesta debe pertenecer exactamente a un contexto "
                "(encuesta, informe asignatura o informe sintetico de carrera)."
            )
        return self


class RespuestaRead(RespuestaBase):
    id: int
    # En las respuestas que devolvemos SÍ mostramos quién la hizo
    id_persona: int

    detalles: List[DetalleRespuestaRead] = []

    model_config = ConfigDict(from_attributes=True)
