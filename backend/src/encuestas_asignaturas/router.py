from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.seguridad.deps_auth import get_current_persona
from src.database import get_db
from src.encuestas_asignaturas import schemas, services
from src.seguridad.deps import require_permissions
from src.seguridad.models import PermissionName

router = APIRouter(
    prefix="/encuestas-asignaturas",
    tags=["encuestas-asignaturas"],
)

@router.get(
    "/",
    response_model=list[schemas.EncuestaListado], # <-- Usamos el nuevo Schema
    # dependencies=[Depends(require_permissions(PermissionName.RESPONDER_ENCUESTA))],
)
def read_encuestas_asignaturas(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_persona) # <-- Obtenemos el usuario logueado
):
    # Llamamos al servicio nuevo
    return services.listar_encuestas_para_usuario(db, current_user.id)

@router.get("/pendientes", response_model=list[schemas.EncuestaAsignaturaRead])
def read_encuestas_pendientes(db: Session = Depends(get_db),
    persona_actual = Depends(get_current_persona)):
    """
    Devuelve SOLO las encuestas que el alumno logueado debe responder.
    Filtra por su cursada y excluye las que ya respondió.
    """
    return services.listar_encuestas_pendientes_alumno(db, persona_actual.id)

@router.get("/cortas", response_model=list[schemas.EncuestaAsignaturaBase])
def read_encuestas_asignaturas_cortas(db: Session = Depends(get_db)):
    return services.listar_encuestas_asignaturas_cortas(db)

@router.post("/", response_model=schemas.EncuestaAsignaturaRead)
def create_encuesta_asignatura(
    encuesta: schemas.EncuestaAsignaturaCreate,
    db: Session = Depends(get_db),
):
    return services.crear_encuesta_asignatura(db, encuesta)


@router.get(
    "/{encuesta_id}",
    response_model=schemas.EncuestaAsignaturaRead,
    dependencies=[Depends(require_permissions(PermissionName.RESPONDER_ENCUESTA))],
)
def read_encuesta_asignatura(
    encuesta_id: int,
    db: Session = Depends(get_db),
):
    return services.leer_encuesta_asignatura(db, encuesta_id)


@router.get("/alumno/{persona_id}", response_model=list[schemas.EncuestaAsignaturaRead])
def read_encuestas_respondidas_alumno(
    persona_id: int,
    db: Session = Depends(get_db),
    persona_actual = Depends(get_current_persona),
):
    if persona_id != persona_actual.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No puede ver encuestas de otra persona")
    return services.listar_encuestas_respondidas_alumno(db, persona_actual.id)


@router.put("/{encuesta_id}", response_model=schemas.EncuestaAsignaturaRead)
def update_encuesta_asignatura(
    encuesta_id: int,
    encuesta: schemas.EncuestaAsignaturaUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_encuesta_asignatura(db, encuesta_id, encuesta)


@router.delete("/{encuesta_id}", response_model=dict)
def delete_encuesta_asignatura(
    encuesta_id: int,
    db: Session = Depends(get_db),
):
    return services.eliminar_encuesta_asignatura(db, encuesta_id)



@router.post("/{encuesta_id}/confirmar")
def confirmar_encuesta_asignatura(encuesta_id: int):
    return {"status": "ok", "mensaje": f"Encuesta {encuesta_id} confirmada"}