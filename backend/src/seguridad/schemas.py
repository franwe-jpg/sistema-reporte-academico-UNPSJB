from pydantic import BaseModel
from typing import List
from src.seguridad.models import RoleName, PermissionName


class AssignRolesIn(BaseModel):
    persona_id: int
    roles: List[RoleName]


class PersonaPermissionsOut(BaseModel):
    persona_id: int
    nombre: str
    apellido: str
    roles: List[RoleName]
    permissions: List[PermissionName]
