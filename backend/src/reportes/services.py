from typing import List
from src.informes_asignaturas.models import EstadoInforme
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy.sql.expression import func # <-- NECESARIO PARA strftime
from src.reportes.models import Reporte
from src.encuestas_asignaturas.models import EncuestaAsignatura, EstadoEncuesta
from src.encuestas_base.models import EncuestaBase
from src.respuestas.models import Respuesta
from src.detalle_respuesta.models import DetalleRespuesta
from src.pregunta_opcion.models import PreguntaOpcion
from src.preguntas.models import Pregunta
from src.variables.models import Variable
from collections import defaultdict
from src.reportes import schemas, exceptions
from src.cursadas.models import Cursada

def listar_reportes(db: Session, persona_id: int) -> List[schemas.Reporte]:    
    # 1. Subquery: Asignaturas del docente
    subquery_asignaturas = select(Cursada.id_asignatura).where(
        Cursada.id_persona == persona_id
    )

    # 2. Filtrar Reportes que pertenezcan a esas asignaturas
    query = (
        select(Reporte)
        .join(Reporte.encuesta_asignatura)
        .where(EncuestaAsignatura.id_asignatura.in_(subquery_asignaturas))
        .options(
            # Cargamos la relación para que el schema no falle
            selectinload(Reporte.encuesta_asignatura).selectinload(EncuestaAsignatura.asignatura)
        )
    )
    
    return db.scalars(query).all()

def listar_reportes_disponibles(db: Session, persona_id: int) -> list[schemas.ReporteListadoItem]:
    # 1. Subquery: Asignaturas del docente
    subquery_asignaturas = select(Cursada.id_asignatura).where(
        Cursada.id_persona == persona_id
    )

    # 2. Filtramos la query original con el JOIN a EncuestaAsignatura
    reportes = db.scalars(
        select(Reporte)
        .join(Reporte.encuesta_asignatura)
        .where(EncuestaAsignatura.id_asignatura.in_(subquery_asignaturas))
        .options(selectinload(Reporte.informes_asignaturas))
    ).all()

    items: list[schemas.ReporteListadoItem] = []
    for rep in reportes:
        informes = rep.informes_asignaturas or []
        # Si hubiera más de un informe por reporte, tomamos el más reciente (id mayor)
        informe_sel = max(informes, key=lambda x: x.id) if informes else None

        has_informe = informe_sel is not None
        has_respuesta = bool(informe_sel and getattr(informe_sel, "estado", None) == EstadoInforme.cerrado)
        informe_id = informe_sel.id if informe_sel else None

        items.append(
            schemas.ReporteListadoItem(
                id=rep.id,
                has_informe=has_informe,
                has_respuesta=has_respuesta,
                informe_id=informe_id,
            )
        )
    return items

def crear_reporte(db: Session, reporte: schemas.ReporteCreate) -> schemas.Reporte:
    _reporte = Reporte(**reporte.model_dump())
    db.add(_reporte)
    encuesta = db.get(EncuestaAsignatura, reporte.id_encuesta_asignatura)
    if encuesta.estado != EstadoEncuesta.cerrada:
        encuesta.estado = EstadoEncuesta.cerrada
        db.add(encuesta) 
    db.commit()
    db.refresh(_reporte)
    return _reporte

def leer_reporte(db: Session, reporte_id: int)-> schemas.Reporte:
    db_reporte = db.scalar(select(Reporte).where(Reporte.id == reporte_id))
    if db_reporte is None:
        raise exceptions.ReporteNoEncontrado()
    return db_reporte

def eliminar_reporte(db: Session, reporte_id: int) -> None:    
    db_reporte = leer_reporte(db, reporte_id)
    nombre_reporte = db_reporte.asignatura
    db.delete(db_reporte)
    db.commit()
    return {"message": f"Reporte {nombre_reporte} eliminado"}

def actualizar_reporte(db: Session, reporte_id: int, reporte: schemas.ReporteUpdate) -> schemas.Reporte:
    db_reporte = leer_reporte(db, reporte_id)
    for key, value in reporte.model_dump().items():
        setattr(db_reporte, key, value)
    db.commit()
    db.refresh(db_reporte)
    return db_reporte

def leer_reporte_con_relaciones_completas(db: Session, reporte_id: int):

    return db.query(Reporte).options(
        selectinload(Reporte.encuesta_asignatura).options(
            selectinload(EncuestaAsignatura.encuesta_base)
                .selectinload(EncuestaBase.variables)
                .selectinload(Variable.preguntas)
                .selectinload(Pregunta.pregunta_opcion)
                .selectinload(PreguntaOpcion.opcion_respuesta), 
            selectinload(EncuestaAsignatura.respuestas)
                .selectinload(Respuesta.detalles)
                .selectinload(DetalleRespuesta.pregunta_opcion).options(
                    selectinload(PreguntaOpcion.pregunta).selectinload(Pregunta.variable), 
                    selectinload(PreguntaOpcion.opcion_respuesta) 
                )
        )
    ).filter(Reporte.id == reporte_id).first()

# --- AUXILIAR: Carga completa de EncuestaAsignatura ---
def _leer_encuesta_asignatura_completa(db: Session, encuesta_asignatura_id: int) -> EncuestaAsignatura | None:
    """Obtiene la EncuestaAsignatura con todas las respuestas y preguntas necesarias para el resumen."""
    return db.query(EncuestaAsignatura).options(
        joinedload(EncuestaAsignatura.asignatura),
        joinedload(EncuestaAsignatura.encuesta_base).options(
            selectinload(EncuestaBase.variables).selectinload(Variable.preguntas).selectinload(Pregunta.pregunta_opcion).selectinload(PreguntaOpcion.opcion_respuesta)
        ),
        selectinload(EncuestaAsignatura.respuestas).selectinload(Respuesta.detalles).selectinload(DetalleRespuesta.pregunta_opcion).options(
            selectinload(PreguntaOpcion.opcion_respuesta)
        )
    ).filter(EncuestaAsignatura.id == encuesta_asignatura_id).first()



def generar_resumen_variable(db: Session, reporte_id: int) -> dict:
    """
    Se encarga de la generación del reporte completo,
    incluyendo tanto los resultados por pregunta como el resumen por variable.
    """
    
    # 1. Obtenemos el reporte con TODAS las relaciones anidadas ya cargadas
    db_reporte = leer_reporte_con_relaciones_completas(db, reporte_id)
    
    if not db_reporte:
        return {"error": "Reporte no encontrado"}

    encuesta_asig = db_reporte.encuesta_asignatura
    
    resultados_preguntas = _generar_resultados_preguntas_cerradas(encuesta_asig)
    resumen_variables = _generar_resumen_por_variable(encuesta_asig)
    
    return {
        "message": "Reporte de encuesta asignatura generado",
        "resultados_por_pregunta": resultados_preguntas,
        "resumen_por_variable": resumen_variables
    }


def _generar_resultados_preguntas_cerradas(encuesta_asig: EncuestaAsignatura) -> dict:
    
    # --- Conteo de votos por PREGUNTA ---
    conteo_opciones = defaultdict(lambda: defaultdict(int))
    total_respuestas_por_pregunta = defaultdict(int)
    
    for respuesta in encuesta_asig.respuestas:
        for detalle in respuesta.detalles:
            if detalle.pregunta_opcion:
                pregunta_id = detalle.pregunta_opcion.id_pregunta
                opcion_id = detalle.pregunta_opcion.id_opcion_respuesta
                
                conteo_opciones[pregunta_id][opcion_id] += 1
                total_respuestas_por_pregunta[pregunta_id] += 1

    # --- Estructura del resumen por PREGUNTA ---
    resultados_por_pregunta = {}

    for variable in encuesta_asig.encuesta_base.variables:
        preguntas_de_la_variable = []
        
        for pregunta in variable.preguntas:
            
            # Filtramos solo por preguntas cerradas
            if pregunta.tipo == "single_choice":
                
                total_votos = total_respuestas_por_pregunta[pregunta.id]
                opciones_con_porcentaje = []
                
                for pregunta_opcion_obj in pregunta.pregunta_opcion:
                    opcion = pregunta_opcion_obj.opcion_respuesta
                    
                    if opcion is None:
                        continue 

                    votos_opcion = conteo_opciones[pregunta.id][opcion.id]
                    porcentaje = (votos_opcion / total_votos * 100) if total_votos > 0 else 0
                    
                    opciones_con_porcentaje.append({
                        "opcion_texto": opcion.texto_opcion,
                        "porcentaje": round(porcentaje, 2)
                    })
                
                if opciones_con_porcentaje:
                    preguntas_de_la_variable.append({
                        "pregunta_texto": pregunta.texto_pregunta,
                        "opciones": opciones_con_porcentaje
                    })

        if preguntas_de_la_variable:
            resultados_por_pregunta[variable.nombre] = {
                "variable_id": variable.id,
                "codigo": variable.codigo,
                "preguntas": preguntas_de_la_variable
            }
            
    return resultados_por_pregunta



def _generar_resumen_por_variable(encuesta_asig: EncuestaAsignatura) -> dict:

    # Conteo de votos por VARIABLE ---
    conteo_por_variable = defaultdict(lambda: defaultdict(int))
    total_votos_por_variable = defaultdict(int)

    for respuesta in encuesta_asig.respuestas:
        for detalle in respuesta.detalles:
            # Verificamos que el detalle tenga una 'pregunta_opcion' (buena práctica)
            if detalle.pregunta_opcion:
                # Obtenemos la variable y la opción
                variable = detalle.pregunta_opcion.pregunta.variable
                opcion = detalle.pregunta_opcion.opcion_respuesta # Esto puede ser None

                # ¡SOLO PROCESAMOS SI LA OPCIÓN EXISTE (NO ES NONE)!
                if opcion: 
                    # Agregamos el conteo usando el ID de la variable y el TEXTO de la opción
                    conteo_por_variable[variable.id][opcion.texto_opcion] += 1
                    total_votos_por_variable[variable.id] += 1
                
    # --- Estructura del resumen por VARIABLE ---
    resumen_final_variables = {}

    # Iteramos sobre la estructura de la encuesta para incluir todas las variables
    for variable in encuesta_asig.encuesta_base.variables:
        variable_id = variable.id
        total_votos = total_votos_por_variable[variable_id]
        conteos_opcion_texto = conteo_por_variable[variable_id]
        
        opciones_con_porcentaje = []
        
    # 1. Primero, creamos una lista de todos los textos de opción únicos
        #    que existen para esta variable. Usamos un 'set' para evitar duplicados.
        textos_de_opcion_unicos = set()
        for pregunta in variable.preguntas:
            for po_obj in pregunta.pregunta_opcion:
                if po_obj.opcion_respuesta:
                    textos_de_opcion_unicos.add(po_obj.opcion_respuesta.texto_opcion)

        # 2. Ahora, iteramos sobre esa lista estructural (ordenada)
        #    en lugar de iterar sobre los resultados del conteo.
        for texto_opcion in sorted(list(textos_de_opcion_unicos)):
            
            # 3. Buscamos los votos en nuestro diccionario.
            #    Usamos .get(texto_opcion, 0) para que devuelva 0 si no
            #    encuentra votos para esa opción (ej. "mas o menos").
            votos_opcion = conteos_opcion_texto.get(texto_opcion, 0)
            
            porcentaje = (votos_opcion / total_votos * 100) if total_votos > 0 else 0
            
            opciones_con_porcentaje.append({
                "opcion_texto": texto_opcion,
                "porcentaje": round(porcentaje, 2)
            })
        

        if opciones_con_porcentaje:
            resumen_final_variables[variable.nombre] = {
                "variable_id": variable.id,
                "codigo": variable.codigo,
                "opciones": opciones_con_porcentaje
            }
            
    return resumen_final_variables    



# --- NUEVA FUNCIÓN PRINCIPAL PARA COMPARATIVA REAL ---
def generar_resumen_comparativo_real(db: Session, reporte_id: int, ciclo_lectivo_comparar: int) -> dict | None:
    """
    Busca la EncuestaAsignatura anterior basada en la fecha_inicio y genera el resumen de variables.
    """
    
    # 1. Obtener parámetros del reporte actual
    db_reporte_actual = leer_reporte(db, reporte_id)
    encuesta_actual = db_reporte_actual.encuesta_asignatura
    
    if not encuesta_actual:
        return {} # No hay encuesta actual asociada

    asignatura_id = encuesta_actual.id_asignatura
    encuesta_base_id = encuesta_actual.id_encuesta_base

    # 2. Buscar la EncuestaAsignatura del año de comparación
    encuesta_anterior = db.scalar(
        select(EncuestaAsignatura)
        .where(
            EncuestaAsignatura.id_asignatura == asignatura_id,
            EncuestaAsignatura.id_encuesta_base == encuesta_base_id,
            # Filtro por año usando SQLite strftime en la fecha_inicio
            func.strftime('%Y', EncuestaAsignatura.fecha_inicio) == str(ciclo_lectivo_comparar)
        )
        .order_by(EncuestaAsignatura.id.desc()) # Tomar la más reciente si hay varias
        .limit(1)
    )
    
    if not encuesta_anterior:
        return {} # Devolver diccionario vacío si no se encuentra (No hay datos para ese año)

    # 3. Recargar la encuesta antigua con todas las relaciones (Respuestas, Detalles, etc.)
    encuesta_anterior_completa = _leer_encuesta_asignatura_completa(db, encuesta_anterior.id)
    
    if not encuesta_anterior_completa:
        return {}

    # 4. Generar el resumen por variable (reutilizando la lógica existente)
    # Reutilizamos _generar_resumen_por_variable pero con el objeto de la encuesta anterior
    resumen_comparativo = _generar_resumen_por_variable(encuesta_anterior_completa)
    
    # Devolvemos el mapa de resumen con porcentajes (el frontend calculará los scores)
    return resumen_comparativo


