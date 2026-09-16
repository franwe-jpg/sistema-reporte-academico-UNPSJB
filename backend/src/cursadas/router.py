from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from src.database import get_db
from src.cursadas import schemas, services

router = APIRouter(prefix="/cursadas", tags=["cursadas"])

@router.post("/", response_model=schemas.CursadaRead)
def create_cursada(cursada: schemas.CursadaCreate, db: Session = Depends(get_db)):
    return services.crear_cursada(db, cursada)

@router.get("/", response_model=List[schemas.CursadaRead])
def read_cursadas(db: Session = Depends(get_db)):
    return services.listar_cursadas(db)

@router.get("/{cursada_id}", response_model=schemas.CursadaRead)
def read_cursada(cursada_id: int, db: Session = Depends(get_db)):
    return services.leer_cursada(db, cursada_id)

@router.delete("/{cursada_id}")
def delete_cursada(cursada_id: int, db: Session = Depends(get_db)):
    return services.eliminar_cursada(db, cursada_id)