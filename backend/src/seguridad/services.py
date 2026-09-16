from typing import Iterable, List
from sqlalchemy.orm import Session
from sqlalchemy import select
from src.seguridad.models import (
    Role, Permission, RoleName, PermissionName, PersonaRole, RolePermission
)

ROLE_PERMISSION_MAP = {
    RoleName.alumno: {
        PermissionName.RESPONDER_ENCUESTA,
        PermissionName.VER_MIS_RESPUESTAS,
    },
    RoleName.docente: {
        PermissionName.VER_REPORTES,
        PermissionName.RESPONDER_INFORME_CURRICULAR,
        PermissionName.VER_MIS_INFORMES,
        PermissionName.VER_RESUMENES_BASICOS,
    },
    RoleName.departamento: {
        PermissionName.VER_INFORMES_CURRICULARES,
        PermissionName.GENERAR_INFORMES_SINTETICOS,
        PermissionName.VER_MIS_SINTETICOS,
        PermissionName.VER_RESUMENES_BASICOS,
        PermissionName.RESPONDER_INFORME_CURRICULAR,
    },
    RoleName.secretaria_academica: {
        PermissionName.CREAR_PLANTILLAS,
        PermissionName.ADMINISTRAR_PERIODOS,
    },
}

all_permissions = set().union(*ROLE_PERMISSION_MAP.values())
ROLE_PERMISSION_MAP[RoleName.admin] = all_permissions

class SeguridadService:
    def __init__(self, db: Session):
        self.db = db

    def seed(self) -> None:
        # Roles
        existing_roles = {r.name for r in self.db.scalars(select(Role)).all()}
        for r in RoleName:
            if r.value not in existing_roles:
                self.db.add(Role(name=r.value))
        # Permisos
        existing_perms = {p.name for p in self.db.scalars(select(Permission)).all()}
        for p in PermissionName:
            if p.value not in existing_perms:
                self.db.add(Permission(name=p.value))
        self.db.flush()

        # Vinculaciones
        roles_by_name = {r.name: r for r in self.db.scalars(select(Role)).all()}
        perms_by_name = {p.name: p for p in self.db.scalars(select(Permission)).all()}

        # admin = todos los permisos
        admin_role = roles_by_name[RoleName.admin.value]
        admin_role.permissions = list(perms_by_name.values())

        for role_name, perms in ROLE_PERMISSION_MAP.items():
            role = roles_by_name[role_name.value]
            role.permissions = [perms_by_name[p.value] for p in perms]

        self.db.commit()

    def assign_roles(self, persona_id: int, roles: Iterable[RoleName]) -> None:
        # borro asignaciones anteriores
        for pr in self.db.scalars(select(PersonaRole).where(PersonaRole.persona_id == persona_id)).all():
            self.db.delete(pr)
        role_objs = self.db.scalars(select(Role).where(Role.name.in_([r.value for r in roles]))).all()
        for r in role_objs:
            self.db.add(PersonaRole(persona_id=persona_id, role_id=r.id))
        self.db.commit()

    def get_roles_by_persona_id(self, persona_id: int) -> List[RoleName]:
        stmt = (
            select(Role.name)
            .join(PersonaRole, PersonaRole.role_id == Role.id)
            .where(PersonaRole.persona_id == persona_id)
        )
        return [RoleName(row[0]) for row in self.db.execute(stmt).all()]

    def get_permissions_by_persona_id(self, persona_id: int) -> List[PermissionName]:
        stmt = (
            select(Permission.name)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(Role, Role.id == RolePermission.role_id)
            .join(PersonaRole, PersonaRole.role_id == Role.id)
            .where(PersonaRole.persona_id == persona_id)
        )
        return list({PermissionName(row[0]) for row in self.db.execute(stmt).all()})