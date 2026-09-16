from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select
from fastapi import HTTPException
from typing import List

from . import schemas
# (Asegúrate de importar todos los modelos necesarios)
from src.informe_sintetico_carrera.models import InformeSinteticoCarrera
from src.informes_asignaturas.models import InformeAsignatura
from src.asignaturas.models import Asignatura
from src.respuestas.models import Respuesta
from src.detalle_respuesta.models import DetalleRespuesta
from src.pregunta_opcion.models import PreguntaOpcion
from src.preguntas.models import Pregunta
from src.carreras.models import Carrera
from src.informes_sinteticos_base.models import InformeSinteticoBase
# ¡Importante! El "molde" del docente (Anexo I)
from src.informes_curriculares_base.models import InformeCurricularBase 

def _get_query_con_joins():
    return select(InformeSinteticoCarrera).options(
        
        joinedload(InformeSinteticoCarrera.carrera),
        
        joinedload(InformeSinteticoCarrera.informe_sintetico_base).options(
            selectinload(InformeSinteticoBase.preguntas) # <-- Esto faltaba
        ),
        
        joinedload(InformeSinteticoCarrera.respuesta).options(
            selectinload(Respuesta.detalles).options(
                joinedload(DetalleRespuesta.pregunta_opcion).options(
                    joinedload(PreguntaOpcion.pregunta)
                )
            )
        ),
        
        selectinload(InformeSinteticoCarrera.informes_asignaturas)
        .options(
            joinedload(InformeAsignatura.asignatura),
            
            joinedload(InformeAsignatura.informe_curricular_base).options(
                selectinload(InformeCurricularBase.preguntas) 
            ),
            
            joinedload(InformeAsignatura.respuesta).options(
                selectinload(Respuesta.detalles).options(
                    joinedload(DetalleRespuesta.pregunta_opcion).options(
                        joinedload(PreguntaOpcion.pregunta)
                    )
                )
            )
        )
    )

def listar_informes_sinteticos_carrera(db: Session) -> List[InformeSinteticoCarrera]:
    query = _get_query_con_joins()
    # .unique() es clave para evitar duplicados por los joins
    return db.scalars(query).unique().all()


def listar_informes_respondidos_departamento(db: Session, persona_id: int) -> List[InformeSinteticoCarrera]:
    query = _get_query_con_joins().join(Respuesta, InformeSinteticoCarrera.respuesta) \
            .filter(Respuesta.id_persona == persona_id)
            
    return db.scalars(query).unique().all()

def crear_informe_sintetico_carrera(db: Session, informe: schemas.InformeSinteticoCarreraCreate) -> InformeSinteticoCarrera:
    _informe = InformeSinteticoCarrera(**informe.model_dump(exclude={"informes_asignaturas"}))
    db.add(_informe)
    db.commit()
    db.refresh(_informe)
    
     # Vincular informes de asignaturas ya existentes
    if informe.informes_asignaturas:
        db.query(InformeAsignatura).filter(
            InformeAsignatura.id.in_(informe.informes_asignaturas)
        ).update(
            {"id_informe_sintetico_carrera": _informe.id},
            synchronize_session=False
        )
        db.commit()

    db.refresh(_informe)

    return leer_informe_sintetico_carrera(db, _informe.id)


def leer_informe_sintetico_carrera(db: Session, informe_id: int) -> InformeSinteticoCarrera:
    query = _get_query_con_joins().where(InformeSinteticoCarrera.id == informe_id)
    # Usar .scalars().first() es más seguro con joins complejos
    db_informe = db.scalars(query).first() 
    
    if db_informe is None:
        raise HTTPException(
            status_code=404, 
            detail="Informe sintético de carrera no encontrado"
        )
    
    return db_informe