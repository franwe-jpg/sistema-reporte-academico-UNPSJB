from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.seguridad.schemas import AssignRolesIn, PersonaPermissionsOut
from src.seguridad.services import SeguridadService
from src.seguridad.deps_auth import get_current_persona

router = APIRouter(prefix="/seguridad", tags=["Seguridad"])


@router.post("/seed", status_code=204)
def seed_seguridad(db: Session = Depends(get_db)):
    SeguridadService(db).seed()


@router.post("/roles/assign", status_code=204)
def assign_roles(payload: AssignRolesIn, db: Session = Depends(get_db)):
    SeguridadService(db).assign_roles(
        persona_id=payload.persona_id,
        roles=payload.roles,
    )


@router.get("/me/permissions", response_model=PersonaPermissionsOut)
def me_permissions(
    current=Depends(get_current_persona),
    db: Session = Depends(get_db),
):
    svc = SeguridadService(db)
    return PersonaPermissionsOut(
        persona_id=current.id,
        nombre=current.nombre,
        apellido=current.apellido,
        roles=svc.get_roles_by_persona_id(current.id),
        permissions=svc.get_permissions_by_persona_id(current.id),
    )

