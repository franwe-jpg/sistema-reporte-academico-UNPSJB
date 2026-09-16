import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from src.database import engine
from src import models
from sqlalchemy.orm import sessionmaker

import logging
from src.jobs import start_scheduler, shutdown_scheduler 

from src.personas.router import router as personas_router 
from src.encuestas_base.router import router as encuestas_base_router
from src.informes_curriculares_base.router import router as informes_curriculares_base_router
from src.reportes.router import router as reportes_router
from src.variables.router import router as variables_router
from src.preguntas.router import router as preguntas_router
from src.opciones_respuesta.router import router as opciones_respuestas_router
from src.asignaturas.router import router as asignaturas_router
from src.encuestas_asignaturas.router import router as encuestas_asignaturas_router
from src.respuestas.router import router as respuestas_router
from src.detalle_respuesta.router import router as detalle_respuesta_router
from src.pregunta_opcion.router import router as pregunta_opcion_router
from src.informes_asignaturas.router import router as informes_asignaturas_router
from src.informes_sinteticos_base.router import router as informes_sinteticos_base_router
from src.carreras.router import router as carreras_router
from src.informe_sintetico_carrera.router import router as informe_sintetico_carrera_router
from src.estadisticas.router import router as estadisticas_router

from src.cursadas.router import router as cursadas_router
from src.seguridad.router import router as seguridad_router
from src.auth.router import router as auth_router
from src.seguridad.services import SeguridadService

from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

ENV = os.getenv("ENV")
ROOT_PATH = os.getenv(f"ROOT_PATH_{ENV.upper()}")

# ---------- SEED DE ROLES/PERMISOS (idempotente) ----------

SessionForSeed = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_seed_once() -> None:
    """Crea roles, permisos y vínculos si no existen.
    Es idempotente, se puede llamar en cada arranque sin problemas.
    """
    with SessionForSeed() as db:
        SeguridadService(db).seed()

# ---------- LIFESPAN: crea tablas y luego hace seed ----------
# --- CONFIGURACIÓN DE LOGGING y PROGRAMADOR DE TAREAS---
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
log = logging.getLogger(__name__)

logging.getLogger('apscheduler').setLevel(logging.INFO)
logging.getLogger('src.jobs').setLevel(logging.INFO)

@asynccontextmanager
async def db_creation_lifespan(app: FastAPI):
    models.ModeloBase.metadata.create_all(bind=engine)
    run_seed_once()
    start_scheduler()
    yield
    shutdown_scheduler()

# ---------- APP FASTAPI ----------

app = FastAPI(root_path=ROOT_PATH, lifespan=db_creation_lifespan)

# ---------- CORS (para permitir frontend React 5173) ----------

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- ROUTERS (auth primero) ----------

app.include_router(auth_router)          
app.include_router(seguridad_router)     
app.include_router(personas_router)
app.include_router(encuestas_base_router)
app.include_router(variables_router)
app.include_router(preguntas_router)
app.include_router(opciones_respuestas_router)
app.include_router(asignaturas_router)
app.include_router(encuestas_asignaturas_router)
app.include_router(informes_curriculares_base_router)
app.include_router(reportes_router)
app.include_router(respuestas_router)
app.include_router(detalle_respuesta_router)
app.include_router(pregunta_opcion_router)
app.include_router(informes_asignaturas_router)
app.include_router(informes_sinteticos_base_router)
app.include_router(carreras_router)
app.include_router(informe_sintetico_carrera_router)
app.include_router(estadisticas_router)
app.include_router(cursadas_router)
