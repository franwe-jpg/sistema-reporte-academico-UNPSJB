from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.personas.models import Persona
from src.personas import schemas, exceptions


def crear_persona(db: Session, persona: schemas.PersonaCreate) -> Persona:
    # Sacamos password del schema para no pasarlo directo al modelo
    data = persona.model_dump(exclude={"password"})

    _persona = Persona(**data)

    # 🔐 Hashear y guardar el password
    _persona.set_password(persona.password)

    db.add(_persona)
    db.commit()
    db.refresh(_persona)
    return _persona


def listar_personas(db: Session) -> List[Persona]:
    return db.scalars(select(Persona)).all()


def leer_persona(db: Session, persona_id: int) -> Persona:
    db_persona = db.scalar(select(Persona).where(Persona.id == persona_id))
    if db_persona is None:
        raise exceptions.PersonaNoEncontrada()
    return db_persona


def modificar_persona(
    db: Session, persona_id: int, persona: schemas.PersonaUpdate
) -> Persona:
    db_persona = leer_persona(db, persona_id)

    # Solo campos enviados (exclude_unset=True)
    data = persona.model_dump(exclude_unset=True)

    # Sacamos password si viene, para tratarlo aparte
    password = data.pop("password", None)

    # Actualizamos atributos "normales"
    for field, value in data.items():
        setattr(db_persona, field, value)

    # Si vino password en el update, lo rehasheamos
    if password is not None:
        db_persona.set_password(password)

    db.commit()
    db.refresh(db_persona)
    return db_persona


def eliminar_persona(db: Session, persona_id: int) -> dict:
    db_persona = leer_persona(db, persona_id)
    nombre_persona = db_persona.nombre
    db.delete(db_persona)
    db.commit()
    return {"message": f"Persona {nombre_persona} eliminada"}
