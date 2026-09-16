from __future__ import annotations
from enum import Enum
from typing import List, TYPE_CHECKING
from sqlalchemy import Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.personas.models import Persona

class RoleName(str, Enum):
    admin = "admin"
    alumno = "alumno"
    docente = "docente"
    departamento = "departamento"
    secretaria_academica = "secretaria_academica"

class PermissionName(str, Enum):
    RESPONDER_ENCUESTA = "RESPONDER_ENCUESTA"
    VER_MIS_RESPUESTAS = "VER_MIS_RESPUESTAS"

    VER_REPORTES = "VER_REPORTES"
    RESPONDER_INFORME_CURRICULAR = "RESPONDER_INFORME_CURRICULAR"
    VER_MIS_INFORMES = "VER_MIS_INFORMES"

    VER_INFORMES_CURRICULARES = "VER_INFORMES_CURRICULARES"
    GENERAR_INFORMES_SINTETICOS = "GENERAR_INFORMES_SINTETICOS"
    VER_MIS_SINTETICOS = "VER_MIS_SINTETICOS"

    VER_RESUMENES_BASICOS = "VER_RESUMENES_BASICOS"

    CREAR_PLANTILLAS = "CREAR_PLANTILLAS"
    ADMINISTRAR_PERIODOS = "ADMINISTRAR_PERIODOS"

class Role(ModeloBase):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)

    personas: Mapped[List["Persona"]] = relationship(
        secondary="personas_roles", back_populates="roles", lazy="selectin"
    )
    permissions: Mapped[List["Permission"]] = relationship(
        secondary="roles_permissions", back_populates="roles", lazy="selectin"
    )

class Permission(ModeloBase):
    __tablename__ = "permissions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)

    roles: Mapped[List[Role]] = relationship(
        secondary="roles_permissions", back_populates="permissions", lazy="selectin"
    )

class PersonaRole(ModeloBase):
    __tablename__ = "personas_roles"
    __table_args__ = (UniqueConstraint("persona_id", "role_id", name="uq_persona_role"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personas.id", ondelete="CASCADE"))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"))

class RolePermission(ModeloBase):
    __tablename__ = "roles_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"))
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"))