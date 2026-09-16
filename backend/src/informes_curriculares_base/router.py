from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.database import get_db
from src.informes_curriculares_base import schemas, services

from src.seguridad.deps import require_permissions
from src.seguridad.models import PermissionName

router = APIRouter(prefix="/informes-curriculares-base", tags=["informes-curriculares-base"])


@router.get("/", response_model=list[schemas.InformeCurricularBaseRead])
def read_informes_base(db: Session = Depends(get_db)):
    return services.listar_informes_base(db)


# 2) OBTENER EL "ACTUAL" (DOCENTE lo usa para armar el formulario)
@router.get(
    "/actual",
    response_model=schemas.InformeCurricularBaseRead,
    dependencies=[Depends(require_permissions(PermissionName.RESPONDER_INFORME_CURRICULAR))],
)
def read_informe_base_actual(db: Session = Depends(get_db)):
    informe_base = services.leer_informe_base_actual(db)
    if informe_base is None:
        raise HTTPException(
            status_code=404,
            detail="No hay informe base disponible"
        )
    return informe_base


# 3) OBTENER UNO POR ID (también lo dejamos para DOCENTE + SECRETARÍA)
@router.get(
    "/{informe_base_id}",
    response_model=schemas.InformeCurricularBaseRead,
    dependencies=[Depends(require_permissions(PermissionName.RESPONDER_INFORME_CURRICULAR))],
)
def read_informe_base(informe_base_id: int, db: Session = Depends(get_db)):
    informe_base = services.leer_informe_base(db, informe_base_id)
    if informe_base is None:
        raise HTTPException(status_code=404, detail="Informe base no encontrado")
    return informe_base


@router.post("/", response_model=schemas.InformeCurricularBaseRead)
def create_informe_base(
    informe_base: schemas.InformeCurricularBaseCreate,
    db: Session = Depends(get_db),
):
    return services.crear_informe_base(db, informe_base)


@router.put("/{informe_base_id}", response_model=schemas.InformeCurricularBaseRead)
def update_informe_base(
    informe_base_id: int,
    informe_base: schemas.InformeCurricularBaseUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_informe_base(db, informe_base_id, informe_base)
