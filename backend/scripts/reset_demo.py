"""
Restore the demo database to its seeded starting point.

Designed to run BETWEEN visitor groups, with the backend still running: it uses
SQLite's online backup API to overwrite the live database in place instead of
replacing the file. That keeps the same inode, so the connections SQLAlchemy has
pooled stay valid and the API does not need to be restarted.

    backend/venv/bin/python backend/scripts/reset_demo.py

If the snapshot is missing it tells you to run seed_demo.py first.
"""

from __future__ import annotations

import os
import sqlite3
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BACKEND_DIR / "demo.db"
SNAPSHOT_PATH = BACKEND_DIR / "demo_snapshot.db"

RETRIES = 5
RETRY_WAIT = 0.6


def main() -> int:
    if not SNAPSHOT_PATH.exists():
        print(f"No existe el snapshot: {SNAPSHOT_PATH}")
        print("Genera la base primero:")
        print("  backend/venv/bin/python backend/scripts/seed_demo.py")
        return 1

    nueva = not DB_PATH.exists()

    origen = sqlite3.connect(f"file:{SNAPSHOT_PATH}?mode=ro", uri=True)
    try:
        for intento in range(1, RETRIES + 1):
            destino = sqlite3.connect(DB_PATH, timeout=10)
            try:
                origen.backup(destino)
                destino.commit()
                return finalizar(nueva)
            except sqlite3.OperationalError as e:
                if intento == RETRIES:
                    print(f"No se pudo restaurar la base: {e}")
                    print("Detene el backend (Ctrl+C) y volve a intentarlo.")
                    return 1
                print(f"  Base ocupada, reintento {intento}/{RETRIES - 1}...")
                time.sleep(RETRY_WAIT)
            finally:
                destino.close()
    finally:
        origen.close()

    return 1


def finalizar(nueva: bool) -> int:

    tam = DB_PATH.stat().st_size / 1024
    print(f"Base restaurada{'  (creada desde cero)' if nueva else ''} — {DB_PATH.name}, {tam:.0f} KB")
    print("No hace falta reiniciar el backend.")
    print()
    print("Usuarios (el usuario es el DNI):")
    print("  Alumno        45123456 / alumno123")
    print("  Docente       24876543 / docente123")
    print("  Departamento  20345678 / depto123")
    print("  Admin         35111222 / admin123")
    return 0


if __name__ == "__main__":
    os.chdir(BACKEND_DIR)
    sys.exit(main())
