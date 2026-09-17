"""
Reinicio de la base de demostracion desde la propia aplicacion.

Existe para poder dejar el sistema en su punto inicial entre una tanda de
visitantes y la siguiente sin salir del navegador. Hace lo mismo que
scripts/reset_demo.py: restaura el snapshot sobre el mismo archivo usando la API
de backup de SQLite.

ATENCION: borra todo lo que se haya cargado. El endpoint queda deshabilitado si
la variable de entorno DEMO_RESET vale "0", "false" o "off".
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.database import engine

router = APIRouter(prefix="/demo", tags=["demo"])

BACKEND_DIR = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = BACKEND_DIR / "demo_snapshot.db"

APAGADO = {"0", "false", "off", "no"}


class EstadoDemo(BaseModel):
    habilitado: bool
    hay_snapshot: bool


class ResultadoReset(BaseModel):
    restaurado: bool
    mensaje: str


def _reset_habilitado() -> bool:
    return os.getenv("DEMO_RESET", "1").strip().lower() not in APAGADO


def _ruta_base() -> Path:
    """Archivo SQLite que esta usando la aplicacion."""
    ruta = engine.url.database
    if not ruta:
        raise HTTPException(status_code=400, detail="La base no es un archivo SQLite")
    p = Path(ruta)
    return p if p.is_absolute() else (Path.cwd() / p).resolve()


@router.get("/estado", response_model=EstadoDemo)
def estado_demo():
    """Le permite al frontend mostrar el boton solo cuando tiene sentido."""
    return EstadoDemo(
        habilitado=_reset_habilitado(),
        hay_snapshot=SNAPSHOT_PATH.exists(),
    )


@router.post("/reset", response_model=ResultadoReset)
def reset_demo():
    if not _reset_habilitado():
        raise HTTPException(
            status_code=403,
            detail="El reinicio de la demo esta deshabilitado (DEMO_RESET)",
        )

    if not SNAPSHOT_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="No existe el snapshot. Genera la base con scripts/seed_demo.py",
        )

    destino_path = _ruta_base()

    # Cerrar las conexiones del pool antes de sobrescribir el archivo: si alguna
    # queda con una lectura abierta, el backup no puede tomar el bloqueo.
    engine.dispose()

    origen = sqlite3.connect(f"file:{SNAPSHOT_PATH}?mode=ro", uri=True)
    destino = sqlite3.connect(destino_path, timeout=10)
    try:
        origen.backup(destino)
        destino.commit()
    except sqlite3.OperationalError as e:
        raise HTTPException(
            status_code=409,
            detail=f"La base esta ocupada, intentalo de nuevo ({e})",
        )
    finally:
        destino.close()
        origen.close()

    return ResultadoReset(
        restaurado=True,
        mensaje="La base volvio a su punto inicial.",
    )
