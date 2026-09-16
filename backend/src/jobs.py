import logging
from datetime import date
from sqlalchemy import select, update
from sqlalchemy.orm import Session
# Importamos el scheduler aquí
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from src.database import SessionLocal
from src.encuestas_asignaturas.models import EncuestaAsignatura, EstadoEncuesta
from src.informes_asignaturas.models import InformeAsignatura, EstadoInforme
from src.reportes.models import Reporte


log = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler()

def check_deadlines():
    """
    Job principal que se ejecuta periódicamente.
    """
    db: Session = SessionLocal()
    try:        
        today = date.today()
        #today = date(2025, 12, 31)  # Descomentar para pruebas con fecha fija
        
        log.info(f"Ejecutando check_deadlines (Fecha: {today})...")
        
        # --- Lógica Encuestas ---
        encuestas_a_cerrar_ids = db.scalars(
            select(EncuestaAsignatura.id)
            .where(
                EncuestaAsignatura.estado == EstadoEncuesta.abierta,
                EncuestaAsignatura.fecha_fin <= today
            )
        ).all()
        
        if encuestas_a_cerrar_ids:
            log.info(f"Cerrando {len(encuestas_a_cerrar_ids)} encuestas...")
            db.execute(
                update(EncuestaAsignatura)
                .where(EncuestaAsignatura.id.in_(encuestas_a_cerrar_ids))
                .values(estado=EstadoEncuesta.cerrada)
            )
            
            # Verificar reportes existentes
            reportes_existentes_ids = set(db.scalars(
                select(Reporte.id_encuesta_asignatura)
                .where(Reporte.id_encuesta_asignatura.in_(encuestas_a_cerrar_ids))
            ).all())
            
            # Crear reportes faltantes
            ids_para_crear = [eid for eid in encuestas_a_cerrar_ids if eid not in reportes_existentes_ids]
            
            if ids_para_crear:
                log.info(f"Creando {len(ids_para_crear)} reportes automáticos...")
                db.add_all([Reporte(id_encuesta_asignatura=eid) for eid in ids_para_crear])
            
            db.commit()
            
    except Exception as e:
        log.error(f"Error durante check_deadlines: {e}")
        db.rollback()
    finally:
        db.close()



def start_scheduler():
    """Inicia el scheduler con la configuración definida aquí."""
    if not _scheduler.running:
        # CONFIGURACIÓN DEL INTERVALO:
        # Ejemplos: hours=24, minutes=30, seconds=30
        _scheduler.add_job(check_deadlines, 'interval', hours=10000, id="check_deadlines_job")
        
        _scheduler.start()
        log.info("Scheduler iniciado (configurado en src/jobs.py).")

def shutdown_scheduler():
    """Detiene el scheduler."""
    if _scheduler.running:
        _scheduler.shutdown()
        log.info("Scheduler detenido.")