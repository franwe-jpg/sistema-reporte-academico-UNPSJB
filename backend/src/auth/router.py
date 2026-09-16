from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.cursadas.models import Cursada
from src.database import get_db
from src.encuestas_asignaturas.models import EncuestaAsignatura, EstadoEncuesta
from src.personas.models import Persona
from src.seguridad.models import RoleName
from src.seguridad.services import SeguridadService

from .schemas import LoginIn, RegistroIn, RegistroOut, TokenOut
from .services import crear_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, db: Session = Depends(get_db)):

    persona = db.query(Persona).filter(Persona.dni == datos.dni).first()

    if not persona or not persona.password_hash:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    if not persona.verificar_password(datos.password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = crear_access_token({"persona_id": persona.id})

    return TokenOut(access_token=token)


@router.post("/registro", response_model=RegistroOut, status_code=201)
def registro(datos: RegistroIn, db: Session = Depends(get_db)):
    """Da de alta un alumno y lo deja listo para responder encuestas.

    Ademas de crear la persona y asignarle el rol de alumno, lo inscribe en las
    asignaturas que tienen una encuesta abierta hoy. Sin esa inscripcion el
    alumno entraria a un panel vacio, porque el listado de encuestas pendientes
    se arma a partir de las cursadas.
    """
    if db.query(Persona).filter(Persona.dni == datos.dni).first():
        raise HTTPException(status_code=409, detail="Ya existe una persona con ese DNI")

    nombre = datos.nombre.strip()
    apellido = datos.apellido.strip()

    persona = Persona(
        nombre=nombre,
        apellido=apellido,
        dni=datos.dni,
        # Campos obligatorios de Persona que el alta no pide: se derivan del DNI
        # para respetar las restricciones UNIQUE sin molestar a quien se registra.
        telefono=f"0280-15{datos.dni % 1_000_000:06d}",
        email=f"{datos.dni}@alumnos.unpsjb.edu.ar",
        contacto_emergencia="No informado",
    )
    persona.set_password(datos.password)
    db.add(persona)
    db.flush()

    SeguridadService(db).assign_roles(persona.id, [RoleName.alumno])

    hoy = date.today()
    asignaturas_abiertas = db.scalars(
        select(EncuestaAsignatura.id_asignatura)
        .where(
            EncuestaAsignatura.estado == EstadoEncuesta.abierta,
            EncuestaAsignatura.fecha_inicio <= hoy,
            EncuestaAsignatura.fecha_fin >= hoy,
        )
        .distinct()
    ).all()

    ciclo = hoy.year
    for id_asignatura in asignaturas_abiertas:
        db.add(Cursada(
            id_persona=persona.id,
            id_asignatura=id_asignatura,
            ciclo_lectivo=ciclo,
        ))

    db.commit()
    db.refresh(persona)

    return RegistroOut(
        persona_id=persona.id,
        nombre=persona.nombre,
        apellido=persona.apellido,
        access_token=crear_access_token({"persona_id": persona.id}),
        asignaturas_inscriptas=len(asignaturas_abiertas),
    )
