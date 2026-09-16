from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from src.database import get_db
from src.seguridad.services import SeguridadService
from src.seguridad.models import RoleName, PermissionName
from src.seguridad.deps_auth import get_current_persona

def require_roles(*roles: RoleName):
    def dep(current=Depends(get_current_persona), db: Session = Depends(get_db)):
        svc = SeguridadService(db)
        roles_actuales = set(svc.get_roles_by_persona_id(current.id))
        if RoleName.admin in roles_actuales:
            return
        if not roles_actuales.intersection(set(roles)):
            raise HTTPException(status_code=403, detail="No autorizado (rol)")
    return dep

def require_permissions(*perms: PermissionName):
    def dep(current=Depends(get_current_persona), db: Session = Depends(get_db)):
        svc = SeguridadService(db)
        roles_actuales = set(svc.get_roles_by_persona_id(current.id))
        if RoleName.admin in roles_actuales:
            return
        permisos_actuales = set(svc.get_permissions_by_persona_id(current.id))
        faltantes = [p for p in perms if p not in permisos_actuales]
        if faltantes:
            raise HTTPException(status_code=403, detail=f"No autorizado (permiso: {faltantes})")
    return dep