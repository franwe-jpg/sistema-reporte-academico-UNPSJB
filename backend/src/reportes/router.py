from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.reportes import schemas, services

from src.seguridad.deps import require_permissions
from src.seguridad.models import PermissionName
from src.seguridad.deps_auth import get_current_persona

router = APIRouter(
    prefix="/reportes",
    tags=["reportes"],
)


@router.get(
    "/",
    response_model=list[schemas.Reporte],
    dependencies=[Depends(require_permissions(PermissionName.VER_REPORTES))],
)
def read_reportes(db: Session = Depends(get_db),
    current_persona = Depends(get_current_persona)):
    return services.listar_reportes(db, current_persona.id)


@router.get(
    "/disponibles",
    response_model=list[schemas.ReporteListadoItem],
    dependencies=[Depends(require_permissions(PermissionName.VER_REPORTES))],
)
def read_reportes_disponibles(db: Session = Depends(get_db),
    current_persona = Depends(get_current_persona)):
    return services.listar_reportes_disponibles(db, current_persona.id)


# Endpoint para pedir el informe y usar "Ver Informe" a partir del id del reporte
@router.get(
    "/{reporte_id}/informe",
    response_model=dict | None,
    dependencies=[Depends(require_permissions(PermissionName.VER_REPORTES))],
)
def read_informe_por_reporte(reporte_id: int, db: Session = Depends(get_db)):
    rep = services.leer_reporte(db, reporte_id)
    informes = rep.informes_asignaturas or []
    informe_sel = max(informes, key=lambda x: x.id) if informes else None
    if not informe_sel:
        return None
    return {"id": informe_sel.id, "estado": informe_sel.estado.name}


@router.get(
    "/{reporte_id}",
    response_model=schemas.Reporte,
    dependencies=[Depends(require_permissions(PermissionName.VER_REPORTES))],
)
def read_reporte(reporte_id: int, db: Session = Depends(get_db)):
    return services.leer_reporte(db, reporte_id)


# Estos endpoints los usará admin/secretaría más adelante; por ahora sin permisos extra:
@router.post("/", response_model=schemas.Reporte)
def create_reporte(reporte: schemas.ReporteCreate, db: Session = Depends(get_db)):
    return services.crear_reporte(db, reporte)


@router.delete("/{reporte_id}", response_model=dict)
def delete_reporte(reporte_id: int, db: Session = Depends(get_db)):
    return services.eliminar_reporte(db, reporte_id)


@router.put("/{reporte_id}", response_model=schemas.Reporte)
def update_reporte(
    reporte_id: int,
    reporte: schemas.ReporteUpdate,
    db: Session = Depends(get_db),
):
    return services.actualizar_reporte(db, reporte_id, reporte)


@router.get(
    "/generar/{reporte_id}",
    response_model=dict,
    dependencies=[Depends(require_permissions(PermissionName.VER_RESUMENES_BASICOS))],
)
def resumir_variable(reporte_id: int, db: Session = Depends(get_db)):
    return services.generar_resumen_variable(db, reporte_id)
# Endpoint para la comparativa anual
@router.get("/{reporte_id}/comparativa/{ciclo_lectivo_comparar}", response_model=dict | None)
def read_resumen_comparativo(reporte_id: int, ciclo_lectivo_comparar: int, db: Session = Depends(get_db)):
    """
    Obtiene el resumen por variable para la EncuestaAsignatura del mismo ID de Asignatura/EncuestaBase
    correspondiente a un ciclo lectivo anterior.
    """
    # Llama a la nueva función REAL que busca en la BD
    resumen_comparativo = services.generar_resumen_comparativo_real(db, reporte_id, ciclo_lectivo_comparar)
    
    if resumen_comparativo is None:
        return None
    
    # Devuelve un diccionario vacío si no hay datos de comparación para ese año/asignatura
    return resumen_comparativo
