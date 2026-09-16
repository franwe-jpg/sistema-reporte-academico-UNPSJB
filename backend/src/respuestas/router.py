from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from src.database import get_db
from src.respuestas import schemas, services

from src.seguridad.deps_auth import get_current_persona
from src.seguridad.models import PermissionName

router = APIRouter(prefix="/respuestas", tags=["respuestas"])


def validar_permiso_respuesta(payload: schemas.RespuestaCreate, persona_actual):
    """
    Determina qué permiso necesita el usuario según el tipo de respuesta enviada
    (encuesta, informe curricular o informe sintético) y valida que lo tenga.
    """

    #set de permisos que tiene la persona
    permisos_persona: set[PermissionName] = {
        perm.name
        for role in persona_actual.roles
        for perm in role.permissions
    }

    # Alumno responde ENCUESTA
    if payload.id_encuesta_asignatura is not None:
        if PermissionName.RESPONDER_ENCUESTA not in permisos_persona:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permiso para responder encuestas",
            )
        return

    # Docente responde INFORME CURRICULAR
    if payload.id_informe_asignatura is not None:
        if PermissionName.RESPONDER_INFORME_CURRICULAR not in permisos_persona:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permiso para responder informes curriculares",
            )
        return

    # Departamento responde INFORME SINTÉTICO
    if payload.id_informe_sintetico_carrera is not None:
        if PermissionName.GENERAR_INFORMES_SINTETICOS not in permisos_persona:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permiso para generar informes sintéticos",
            )
        return

    # Si no vino ninguno de los ids esperados:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No se reconoce el tipo de respuesta enviada",
    )

@router.post("/", response_model=schemas.RespuestaRead)
def create_respuesta(
    respuesta: schemas.RespuestaCreate,
    db: Session = Depends(get_db),
    persona_actual=Depends(get_current_persona),
):
    # Verificación automática según el tipo de respuesta
    validar_permiso_respuesta(respuesta, persona_actual)

    # Crear respuesta usando SIEMPRE persona_actual.id
    return services.crear_respuesta(db, respuesta, persona_actual)

@router.get("/", response_model=List[schemas.RespuestaRead])
def read_respuestas(
    persona_id: Optional[int] = Query(None),
    encuesta_asignatura_id: Optional[int] = Query(None),
    informe_asignatura_id: Optional[int] = Query(None),
    informe_sintetico_carerra_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    persona_actual=Depends(get_current_persona),
):
    """
    Lista respuestas filtradas.

    - exige usuario autenticado (get_current_persona)
    - si persona_id no viene, usamos la del token
    - si viene persona_id distinto al del token, se bloquea
    """

    if persona_id is None:
        persona_id = persona_actual.id

    if persona_id != persona_actual.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede ver respuestas de otra persona",
        )

    respuestas = services.listar_respuestas(
        db,
        persona_id=persona_id,
        encuesta_asignatura_id=encuesta_asignatura_id,
        informe_asignatura_id=informe_asignatura_id,
        informe_sintetico_carerra_id=informe_sintetico_carerra_id,
    )
    return respuestas

@router.get("/{respuesta_id}", response_model=schemas.RespuestaRead)
def get_respuesta(
    respuesta_id: int,
    db: Session = Depends(get_db),
    persona_actual=Depends(get_current_persona),
):
    """
    Devuelve una respuesta por id.
    (Podrías agregar verificación de que la respuesta pertenezca a persona_actual)
    """
    return services.leer_respuesta(db, respuesta_id)
