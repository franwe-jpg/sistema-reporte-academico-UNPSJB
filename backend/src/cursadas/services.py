from typing import List
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from src.cursadas.models import Cursada
from src.cursadas import schemas
from fastapi import HTTPException

def crear_cursada(db: Session, cursada: schemas.CursadaCreate) -> Cursada:
    # Opcional: Validar que no exista ya la inscripción para ese año
    # ...
    _cursada = Cursada(**cursada.model_dump())
    db.add(_cursada)
    db.commit()
    db.refresh(_cursada)
    return _cursada

def listar_cursadas(db: Session) -> List[Cursada]:
    return db.scalars(select(Cursada)).all()


def leer_cursada(db: Session, cursada_id: int) -> Cursada:
    db_cursada = db.get(Cursada, cursada_id)
    if db_cursada is None:
        raise HTTPException(status_code=404, detail="Cursada no encontrada")
    return db_cursada

def eliminar_cursada(db: Session, cursada_id: int) -> dict:
    db_cursada = leer_cursada(db, cursada_id)
    db.delete(db_cursada)
    db.commit()
    return {"message": "Cursada eliminada correctamente"}