from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.estadisticas.services import EstadisticaService
from src.estadisticas.schemas import DashboardDTO
from typing import Optional

router = APIRouter(prefix="/estadisticas", tags=["Estadísticas"])

@router.get("/dashboard", response_model=DashboardDTO)
def obtener_dashboard(
    ciclo: int = 2025, 
    # Recibimos los parámetros de la URL
    cuatrimestre: Optional[str] = Query(None), 
    nivel: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    service = EstadisticaService(db)
    
    # Limpiamos "todos" para enviar None al servicio
    c_filtro = cuatrimestre if cuatrimestre and cuatrimestre != "todos" else None
    n_filtro = nivel if nivel and nivel != "todos" else None
    
    # ¡AQUÍ ESTABA EL PROBLEMA! 
    # Hay que pasar las 3 variables, no solo 'ciclo'
    return service.get_dashboard_data(ciclo, c_filtro, n_filtro)