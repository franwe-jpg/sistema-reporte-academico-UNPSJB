from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import extract
from collections import defaultdict, Counter
from typing import List

# Modelos
from src.encuestas_asignaturas.models import EncuestaAsignatura
from src.respuestas.models import Respuesta
from src.detalle_respuesta.models import DetalleRespuesta
from src.pregunta_opcion.models import PreguntaOpcion
try:
    from src.opciones_respuesta.models import OpcionRespuesta
except ImportError:
    from src.opciones_respuestas.models import OpcionRespuesta
from src.preguntas.models import Pregunta
from src.variables.models import Variable
from src.asignaturas.models import Asignatura
from src.encuestas_base.models import EncuestaBase
from src.estadisticas.schemas import DashboardDTO, Indicador, Dimension, Valoracion, TopAsignatura, Alerta

class EstadisticaService:
    def __init__(self, db: Session):
        self.db = db
        
        # Constantes de Escalas (Reglamento)
        self.ESCALA_POS = ["Excelente", "Muy Bueno", "Bueno", "Satisfactorio", "Muy Satisfactorio", "Si", "Siempre", "Más de 50%", "Suficientes", "Muy Bueno (4)", "Bueno (3)", "4", "3"]
        self.ESCALA_NEG = ["Malo", "Regular", "Insuficiente", "No Satisfactorio", "Poco Satisfactorio", "No", "Nunca", "Escasos", "Malo (1)", "Regular (2)", "2", "1"]
        self.ESCALA_TOTAL = self.ESCALA_POS + self.ESCALA_NEG

    # ==============================================================================
    # 1. MÉTODO PRINCIPAL (ORQUESTADOR)
    # ==============================================================================
    def get_dashboard_data(self, ciclo_lectivo: int, cuatrimestre: str = None, nivel: str = None) -> DashboardDTO:
        
        # PASO A: Traer TODO lo del año (Eager Loading para velocidad)
        query = self.db.query(EncuestaAsignatura)\
            .join(Asignatura)\
            .filter(extract('year', EncuestaAsignatura.fecha_inicio) == ciclo_lectivo)\
            .options(
                joinedload(EncuestaAsignatura.asignatura),
                joinedload(EncuestaAsignatura.encuesta_base).selectinload(EncuestaBase.variables),
                selectinload(EncuestaAsignatura.respuestas)
                    .selectinload(Respuesta.detalles)
                    .selectinload(DetalleRespuesta.pregunta_opcion)
                    .joinedload(PreguntaOpcion.opcion_respuesta),
                 selectinload(EncuestaAsignatura.respuestas)
                    .selectinload(Respuesta.detalles)
                    .selectinload(DetalleRespuesta.pregunta_opcion)
                    .joinedload(PreguntaOpcion.pregunta).joinedload(Pregunta.variable)
            )
        
        todas = query.all()
        
        # PASO B: Filtrar en memoria (Python) - ¡CON TU LÓGICA ROBUSTA!
        encuestas_filtradas = []
        
        # print(f"--- DEBUG FILTROS: Ciclo={ciclo_lectivo} | Cuatri={cuatrimestre} | Nivel={nivel} ---")

        for enc in todas:
            # 1. Filtro Cuatrimestre (Normalizamos strings quitando espacios)
            if cuatrimestre and cuatrimestre != "todos":
                # Convertimos a string por si es un objeto Enum, quitamos espacios y a minúsculas
                val_bd = str(enc.asignatura.cursado).replace(" ", "").lower()
                # Si es un objeto Enum de python (ej: Cursado.cuatrimestre1), str() puede dar "Cursado.cuatrimestre1"
                if "." in val_bd: val_bd = val_bd.split(".")[1] 
                
                val_filtro = cuatrimestre.replace(" ", "").lower()
                
                if val_bd != val_filtro:
                    continue # Saltar

            # 2. Filtro Nivel (Ciclo)
            if nivel and nivel != "todos":
                c_base = str(enc.encuesta_base.ciclo).lower()
                
                # Lógica flexible: si el string contiene "basico" o "superior"
                es_basico_bd = "basico" in c_base or "básico" in c_base
                es_superior_bd = "superior" in c_base

                if nivel == "basico" and not es_basico_bd: continue
                if nivel == "superior" and not es_superior_bd: continue

            encuestas_filtradas.append(enc)

        if not encuestas_filtradas:
            return self._generar_vacio()

        # PASO C: Calcular usando funciones atómicas
        return DashboardDTO(
            indicadores=self._calcular_kpis(encuestas_filtradas),
            dimensiones=self._calcular_dimensiones(encuestas_filtradas),
            valoraciones=self._calcular_valoraciones(encuestas_filtradas),
            top_asignaturas=self._calcular_top(encuestas_filtradas),
            alertas=self._generar_alertas(encuestas_filtradas),
            keywords=self._extraer_keywords(encuestas_filtradas)
        )

    # ==============================================================================
    # 2. FUNCIONES DE CÁLCULO (ATÓMICAS)
    # ==============================================================================

    def _calcular_kpis(self, encuestas: List[EncuestaAsignatura]) -> List[Indicador]:
        docentes = set()
        total_resp = 0
        votos_pos = 0
        votos_tot = 0

        for enc in encuestas:
            docentes.add(enc.asignatura.nombre_docente)
            total_resp += len(enc.respuestas)
            
            for r in enc.respuestas:
                for d in r.detalles:
                    if d.pregunta_opcion and d.pregunta_opcion.opcion_respuesta:
                        txt = d.pregunta_opcion.opcion_respuesta.texto_opcion
                        if any(p in txt for p in self.ESCALA_POS):
                            votos_pos += 1
                            votos_tot += 1
                        elif any(n in txt for n in self.ESCALA_NEG):
                            votos_tot += 1
        
        sat = int((votos_pos / votos_tot) * 100) if votos_tot > 0 else 0

        return [
            Indicador(titulo="Asignaturas evaluadas", valor=len(encuestas)),
            Indicador(titulo="Docentes participantes", valor=len(docentes)),
            Indicador(titulo="Total de Respuestas", valor=total_resp),
            Indicador(titulo="Satisfacción Global", valor=f"{sat}%"),
        ]

    def _calcular_dimensiones(self, encuestas: List[EncuestaAsignatura]) -> List[Dimension]:
        conteo = defaultdict(int)
        total = 0
        
        for enc in encuestas:
            for r in enc.respuestas:
                for d in r.detalles:
                    if d.pregunta_opcion:
                        # Navegamos seguro
                        try: 
                            var_nom = d.pregunta_opcion.pregunta.variable.nombre
                            conteo[var_nom] += 1
                            total += 1
                        except: pass
        
        if total == 0: return []
        return [Dimension(nombre=k, valor=round((v/total)*100, 1)) for k, v in conteo.items()]

    def _calcular_valoraciones(self, encuestas: List[EncuestaAsignatura]) -> List[Valoracion]:
        conteo = defaultdict(int)
        target = ["Excelente", "Muy Bueno", "Bueno", "Regular", "Malo", "Insuficiente", "Si", "No"]
        
        for enc in encuestas:
            for r in enc.respuestas:
                for d in r.detalles:
                    if d.pregunta_opcion and d.pregunta_opcion.opcion_respuesta:
                        txt = d.pregunta_opcion.opcion_respuesta.texto_opcion
                        for t in target:
                            if t in txt: # Coincidencia parcial ("Muy Bueno (4)" matches "Muy Bueno")
                                conteo[t] += 1
                                break
        
        vals = [Valoracion(label=k, valor=v) for k, v in conteo.items()]
        return vals if vals else [Valoracion(label="Sin datos", valor=1)]

    def _calcular_top(self, encuestas: List[EncuestaAsignatura]) -> List[TopAsignatura]:
        conteo = defaultdict(int)
        for enc in encuestas:
            conteo[enc.asignatura.nombre] += len(enc.respuestas)
            
        # Ordenar y tomar top 4
        top = sorted(conteo.items(), key=lambda x: x[1], reverse=True)[:4]
        res = []
        for nom, cant in top:
            avance = int((cant/50)*100)
            res.append(TopAsignatura(nombre=nom, alumnos=50, avance=min(100, avance)))
        return res

    def _generar_alertas(self, encuestas: List[EncuestaAsignatura]) -> List[Alerta]:
        alertas = []
        quejas_infra = defaultdict(int)
        quejas_calidad = defaultdict(int)
        
        for enc in encuestas:
            nombre = enc.asignatura.nombre
            
            # 1. Participación (si tiene 0 respuestas)
            if len(enc.respuestas) == 0:
                alertas.append(Alerta(tipo="Participación", asignatura=nombre, detalle="Sin respuestas.", severidad="Baja"))
            
            # 2. Análisis de respuestas
            for r in enc.respuestas:
                for d in r.detalles:
                    if d.pregunta_opcion and d.pregunta_opcion.opcion_respuesta:
                        txt = d.pregunta_opcion.opcion_respuesta.texto_opcion
                        es_malo = any(n in txt for n in self.ESCALA_NEG)
                        
                        if es_malo:
                            try:
                                var_cod = d.pregunta_opcion.pregunta.variable.codigo
                                if "F" in var_cod: quejas_infra[nombre] += 1
                                if "E" in var_cod: quejas_calidad[nombre] += 1
                            except: pass

        # Convertir contadores a alertas
        for nom, c in quejas_infra.items():
            if c >= 1: alertas.append(Alerta(tipo="Infraestructura", asignatura=nom, detalle=f"{c} quejas de recursos.", severidad="Media"))
        for nom, c in quejas_calidad.items():
            if c >= 2: alertas.append(Alerta(tipo="Calidad Docente", asignatura=nom, detalle=f"{c} valoraciones negativas.", severidad="Alta"))
            
        sev_map = {"Alta": 0, "Media": 1, "Baja": 2}
        alertas.sort(key=lambda x: sev_map.get(x.severidad, 3))
        return alertas[:8]

    def _extraer_keywords(self, encuestas: List[EncuestaAsignatura]) -> List[str]:
        words = []
        stops = ["para", "pero", "como", "esta", "este", "todo", "nada", "poco", "mucho", "bien", "malo", "los", "las", "una", "unos"]
        
        for enc in encuestas:
            for r in enc.respuestas:
                for d in r.detalles:
                    if d.texto_respuesta_abierta:
                        t = d.texto_respuesta_abierta.lower()
                        words.extend([w.strip(".,") for w in t.split() if len(w) > 4 and w not in stops])
        
        return [w[0] for w in Counter(words).most_common(8)]

    def _generar_vacio(self) -> DashboardDTO:
        return DashboardDTO(
            indicadores=[
                Indicador(titulo="Asignaturas evaluadas", valor=0),
                Indicador(titulo="Docentes participantes", valor=0),
                Indicador(titulo="Total de Respuestas", valor=0),
                Indicador(titulo="Satisfacción Global", valor="0%"),
            ],
            dimensiones=[], valoraciones=[], top_asignaturas=[], alertas=[], keywords=[]
        )