from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload
from src.informes_asignaturas.models import InformeAsignatura
from src.informes_asignaturas import schemas
from typing import List

# (Asegúrate de importar todos los modelos necesarios)
from src.informes_asignaturas.models import InformeAsignatura
from src.asignaturas.models import Asignatura
from src.respuestas.models import Respuesta
from src.detalle_respuesta.models import DetalleRespuesta
from src.pregunta_opcion.models import PreguntaOpcion
from src.preguntas.models import Pregunta
from src.carreras.models import Carrera
# ¡Importante! El "molde" del docente (Anexo I)
from src.informes_curriculares_base.models import InformeCurricularBase 


def _get_query_con_joins():
    return select(InformeAsignatura).options(
        # Carga Asignatura
        joinedload(InformeAsignatura.asignatura).joinedload(Asignatura.carrera),
        
        # Carga Informe Base + Preguntas + Opciones
        joinedload(InformeAsignatura.informe_curricular_base).options(
            selectinload(InformeCurricularBase.preguntas).options(
                selectinload(Pregunta.pregunta_opcion).options(
                    joinedload(PreguntaOpcion.opcion_respuesta)
                )
            )
        ),
        # Carga Respuesta + Detalles + PreguntaOpcion
        joinedload(InformeAsignatura.respuesta).options(
            selectinload(Respuesta.detalles).options(
                joinedload(DetalleRespuesta.pregunta_opcion).options(
                    joinedload(PreguntaOpcion.pregunta) # Opcional, pero bueno
                )
            )
        )
    )

def listar_informes_asignaturas(db:Session) -> list[schemas.InformeAsignaturaRead]:
    query = _get_query_con_joins()
    # .unique() es clave para evitar duplicados por los joins
    return db.scalars(query).unique().all()

def crear_informe_asignatura(db: Session, informe: schemas.InformeAsignaturaCreate) -> schemas.InformeAsignaturaRead:
    _informe = InformeAsignatura(**informe.model_dump())
    db.add(_informe)
    db.commit()
    db.refresh(_informe)
    return _informe

def listar_informes_respondidos_docente(db: Session, persona_id: int) -> list[InformeAsignatura]:
    query = _get_query_con_joins().join(Respuesta, InformeAsignatura.respuesta) \
            .filter(Respuesta.id_persona == persona_id)
            
    return db.scalars(query).unique().all()

def leer_informe_asignatura(db: Session, informe_id: int)-> schemas.InformeAsignaturaRead:
    db_informe = db.scalar(select(InformeAsignatura).where(InformeAsignatura.id == informe_id))
    if db_informe is None:
        return {"message": "Informe no encontrado"}
    return db_informe

