"""
Demo database seeder — Universidad Abierta 2026.

Builds a deterministic demo dataset over the real Licenciatura en Sistemas
(Plan 2010) curriculum and stores a pristine snapshot next to it, so the
database can be reset between visitor groups in under a second
(see scripts/reset_demo.py, or ./reset.sh at the repo root).

Run with the backend STOPPED:

    backend/venv/bin/python backend/scripts/seed_demo.py

What it guarantees for the live demo:

  * One login per role, every password "1234".
  * The alumno has open surveys to answer right now (real system date).
  * The docente has a report with real answers behind it, plus a previous-year
    survey so the year-over-year comparison returns data.
  * The departamento has closed curricular reports to consolidate.

The three roles form a chain: what the alumno answers feeds the docente's
report, and what the docente submits feeds the departamento's consolidation.
"""

from __future__ import annotations

import os
import random
import shutil
import sys
import warnings
from datetime import date
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv

load_dotenv(BACKEND_DIR / ".env")

if not os.getenv("DB_URL"):
    sys.exit("DB_URL is not set. Create backend/.env first (see DEMO.md).")

from sqlalchemy import text  # noqa: E402

from src import models  # noqa: E402
from src.database import SessionLocal, engine  # noqa: E402

# Importing the app module registers every model on the shared metadata.
import src.main  # noqa: E402,F401

from src.asignaturas.models import Asignatura, Cursado  # noqa: E402
from src.carreras.models import Carrera  # noqa: E402
from src.cursadas.models import Cursada  # noqa: E402
from src.detalle_respuesta.models import DetalleRespuesta  # noqa: E402
from src.encuestas_asignaturas.models import EncuestaAsignatura, EstadoEncuesta  # noqa: E402
from src.encuestas_base.models import Ciclo, EncuestaBase  # noqa: E402
from src.informe_sintetico_carrera.models import InformeSinteticoCarrera  # noqa: E402
from src.informe_sintetico_carrera.models import EstadoInforme as EstadoSintetico  # noqa: E402
from src.informes_asignaturas.models import EstadoInforme, InformeAsignatura, Sede  # noqa: E402
from src.informes_curriculares_base.models import InformeCurricularBase  # noqa: E402
from src.informes_sinteticos_base.models import InformeSinteticoBase  # noqa: E402
from src.opciones_respuesta.models import OpcionRespuesta  # noqa: E402
from src.personas.models import Persona  # noqa: E402
from src.pregunta_opcion.models import PreguntaOpcion  # noqa: E402
from src.preguntas.models import Pregunta, TipoPreguntaEnum  # noqa: E402
from src.reportes.models import Reporte  # noqa: E402
from src.respuestas.models import Respuesta  # noqa: E402
from src.seguridad.models import RoleName  # noqa: E402
from src.seguridad.services import SeguridadService  # noqa: E402
from src.variables.models import Variable  # noqa: E402

SEED = 20260917
random.seed(SEED)

DB_PATH = BACKEND_DIR / "demo.db"
SNAPSHOT_PATH = BACKEND_DIR / "demo_snapshot.db"

PASSWORD = "1234"

# --- Academic calendar of the demo -------------------------------------------
# Kept in sync with frontend/react-app/src/calendarioAcademico.ts.
# The backend gates the alumno flow on the REAL system date, so the open survey
# window must span today.
CICLO_ACTUAL = 2026
CICLO_ANTERIOR = 2025

ENC_C1_CERRADA = (date(2026, 6, 23), date(2026, 7, 10))   # 1.er cuatrimestre, ya cerrada
ENC_C2_CERRADA = (date(2026, 8, 3), date(2026, 9, 10))    # 2.º cuatrimestre, recien cerrada
ENC_ABIERTA = (date(2026, 9, 14), date(2026, 12, 12))     # abierta hoy
ENC_ANTERIOR = (date(2025, 8, 4), date(2025, 9, 11))      # ciclo anterior, para la comparativa

# --- Carrera real -------------------------------------------------------------
CARRERA = "Licenciatura en Sistemas"
SEDE = "Trelew"

# --- Plan de estudios ---------------------------------------------------------
# Materias y periodos tomados del plan real (Plan 2010, Lic. en Sistemas,
# orientacion Planificacion, Gestion y Control de Proyectos Informaticos).
# "calidad" gobierna como se sortean las respuestas de los alumnos.
# Asignatura.nombre_docente es UNIQUE en la base, por eso hay exactamente un
# docente por materia.
ASIGNATURAS = [
    # (nombre, año, cursado, nombre_docente, calidad)
    ("Álgebra", 1, Cursado.cuatrimestre1, "Carlos", "cero"),
    ("Ingeniería de Software I", 3, Cursado.cuatrimestre1, "Sebastián Schanz", "alta"),
    ("Bases de Datos II", 4, Cursado.cuatrimestre1, "Cristian Parise", "alta"),
    ("Paradigmas y Lenguajes de Programación", 4, Cursado.cuatrimestre1, "Lautaro Pecile", "media"),
    ("Análisis Matemático", 1, Cursado.cuatrimestre2, "Claudia López", "media"),
    ("Programación Orientada a Objetos", 2, Cursado.cuatrimestre2, "Lucy Marticorena", "alta"),
    ("Desarrollo de Software", 3, Cursado.cuatrimestre2, "Leonardo Ordinez", "alta"),
    ("Fundamentos Teóricos de Informática", 3, Cursado.cuatrimestre2, "Diego Firmenitch", "media"),
    ("Aspectos Legales y Profesionales", 4, Cursado.cuatrimestre2, "Guillermo Zamora", "media"),
    ("Administración de Redes y Seguridad", 4, Cursado.cuatrimestre2, "Bruno Zapellini", "baja"),
]

# Materia sobre la que el docente completa el informe EN VIVO: es la unica que
# queda con reporte generado y sin informe.
MATERIA_EN_VIVO = "Desarrollo de Software"

# Materias con encuesta abierta hoy, para que el alumno tenga que responder.
MATERIAS_CON_ENCUESTA_ABIERTA = [
    "Desarrollo de Software",
    "Programación Orientada a Objetos",
    "Administración de Redes y Seguridad",
]

# --- Usuarios reales ----------------------------------------------------------
# (dni, nombre, apellido, rol). DNIs cortos e inventados para los docentes,
# DNIs reales para los alumnos que van a usar el sistema.
DOCENTES = [
    (1001, "Leonardo", "Ordinez", "Desarrollo de Software"),
    (1002, "Lucy", "Marticorena", "Programación Orientada a Objetos"),
    (1003, "Lautaro", "Pecile", "Paradigmas y Lenguajes de Programación"),
    (1004, "Cristian", "Parise", "Bases de Datos II"),
    (1005, "Sebastián", "Schanz", "Ingeniería de Software I"),
    (1006, "Guillermo", "Zamora", "Aspectos Legales y Profesionales"),
    (1007, "Bruno", "Zapellini", "Administración de Redes y Seguridad"),
    (1008, "Diego", "Firmenitch", "Fundamentos Teóricos de Informática"),
    # Álgebra queda sin usuario: solo nos pasaron el nombre de pila del docente.
    (1009, "Carlos", "N.N.", "Álgebra"),
]

# Claudia López es la responsable del Departamento. Queda con ese rol (y no con
# el de docente) para que al entrar caiga directamente en su panel.
DEPARTAMENTO = (2001, "Claudia", "López")

ADMIN = (1111, "Admin", "Sistema")

# Alumnos que se usan para entrar.
ALUMNOS_REALES = [
    (44601165, "Franco", "Soler"),
    (44850306, "Nicolás", "Arenas"),
]

DOCENTE_EN_VIVO_DNI = 1001   # Leonardo Ordinez
ALUMNO_EN_VIVO_DNI = 44601165  # Franco Soler

# --- Answer scales ------------------------------------------------------------
# These exact strings matter. EstadisticasDocentePage.tsx scores options through
# a lowercase lookup table (WEIGHTS); anything missing from it silently scores
# 50 and drops out of the rankings. The statistics dashboard separately matches
# them against its positive/negative scales.
ESCALA_1_4 = ["1", "2", "3", "4"]
ESCALA_SI_NO = ["Si", "No", "NPO | No puedo opinar"]
ESCALA_SUFICIENCIA = ["Suficientes", "Escasos"]
ESCALA_PORCENTAJE = ["Más de 50%", "Entre 0 y 50%"]

ESCALAS = [ESCALA_1_4, ESCALA_SI_NO, ESCALA_SUFICIENCIA, ESCALA_PORCENTAJE]

PESOS = {
    "alta": {
        id(ESCALA_1_4): [0, 3, 31, 66],
        id(ESCALA_SI_NO): [80, 11, 9],
        id(ESCALA_SUFICIENCIA): [85, 15],
        id(ESCALA_PORCENTAJE): [82, 18],
    },
    "media": {
        id(ESCALA_1_4): [8, 22, 42, 28],
        id(ESCALA_SI_NO): [58, 30, 12],
        id(ESCALA_SUFICIENCIA): [60, 40],
        id(ESCALA_PORCENTAJE): [62, 38],
    },
    "baja": {
        id(ESCALA_1_4): [26, 34, 28, 12],
        id(ESCALA_SI_NO): [34, 54, 12],
        id(ESCALA_SUFICIENCIA): [30, 70],
        id(ESCALA_PORCENTAJE): [38, 62],
    },
}

COMENTARIOS_POSITIVOS = [
    "El equipo docente siempre mantuvo excelente predisposicion para responder consultas.",
    "Las clases practicas estuvieron muy bien organizadas y el material resulto claro.",
    "Buena articulacion entre la teoria y los trabajos practicos de laboratorio.",
    "La bibliografia recomendada fue accesible y estuvo disponible desde el campus.",
    "Valoro mucho las devoluciones detalladas sobre cada entrega del cuatrimestre.",
]

COMENTARIOS_MEJORA = [
    "Seria util contar con mas horarios de consulta antes de cada parcial.",
    "El proyector del aula fallo varias veces durante las clases teoricas.",
    "La conectividad del laboratorio resulta insuficiente para trabajar comodos.",
    "Convendria distribuir mejor las entregas para evitar superposicion con otras materias.",
    "Falta equipamiento actualizado en el laboratorio de computacion.",
]

COMENTARIOS_INFRA = [
    "El aula queda chica cuando asistimos todos los inscriptos de la comision.",
    "Hace falta mejorar la conectividad y renovar las computadoras del laboratorio.",
    "La iluminacion del aula dificulta la lectura del pizarron desde el fondo.",
    "Seria bueno disponer de mas enchufes para las notebooks durante la practica.",
    "El equipamiento resulto adecuado para el desarrollo de los trabajos practicos.",
]


def log(msg: str) -> None:
    print(f"  {msg}")


def backend_en_ejecucion(puerto: int = 8000) -> bool:
    """True if something is already listening on the API port."""
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1", puerto)) == 0


# =============================================================================
# Structure builders
# =============================================================================

def crear_variables_y_preguntas(db, encuesta_base: EncuestaBase, opciones: dict) -> None:
    """Create the five standard variables and their questions for one survey template.

    Variable codes carry meaning downstream: InformeCurricular.tsx only renders
    summary cards for codes B/C/D/E, and the statistics dashboard raises an
    Infrastructure alert for codes containing "F" and a Teaching Quality alert
    for codes containing "E".
    """
    # The number of questions per variable is deliberately uneven: the
    # department dashboard plots each variable's share of total answers, so
    # equal-sized variables would render as a flat 20% across the board.
    definicion = [
        ("B", "Desarrollo de las clases teoricas", [
            ("¿El equipo docente presenta los temas con claridad?", ESCALA_1_4, True),
            ("¿Se respetan los horarios de inicio y finalizacion de las clases?", ESCALA_SI_NO, True),
            ("¿Los contenidos teoricos se relacionan con la practica profesional?", ESCALA_1_4, True),
            ("¿El material de estudio disponible resulto suficiente?", ESCALA_SUFICIENCIA, True),
        ]),
        ("C", "Desarrollo de las clases practicas", [
            ("¿Las guias de trabajos practicos son claras?", ESCALA_1_4, True),
            ("¿La cantidad de actividades practicas resulta adecuada?", ESCALA_SUFICIENCIA, True),
            ("¿Que porcentaje de los trabajos practicos pudiste completar?", ESCALA_PORCENTAJE, True),
            ("¿El acompanamiento durante las practicas fue adecuado?", ESCALA_1_4, True),
        ]),
        ("D", "Evaluaciones", [
            ("¿Los criterios de evaluacion fueron informados al inicio del cursado?", ESCALA_SI_NO, True),
            ("¿Las evaluaciones se corresponden con lo trabajado en clase?", ESCALA_1_4, True),
            ("¿Los tiempos de devolucion de las correcciones fueron adecuados?", ESCALA_1_4, True),
        ]),
        ("E", "Desempeno del equipo docente", [
            ("¿El equipo docente responde consultas fuera del horario de clase?", ESCALA_SI_NO, True),
            ("¿Como calificas la predisposicion general del equipo docente?", ESCALA_1_4, True),
            ("Comentarios sobre el desempeno del equipo docente", None, False),
        ]),
        ("F", "Infraestructura y recursos", [
            ("¿El aula y el equipamiento resultaron adecuados para el dictado?", ESCALA_1_4, True),
            ("Sugerencias sobre infraestructura y recursos", None, False),
        ]),
    ]

    for codigo, nombre, preguntas in definicion:
        variable = Variable(nombre=nombre, codigo=codigo, encuesta_base=encuesta_base)
        db.add(variable)
        db.flush()

        for texto, escala, obligatoria in preguntas:
            if escala is None:
                pregunta = Pregunta(
                    texto_pregunta=texto,
                    tipo=TipoPreguntaEnum.open,
                    obligatoria=obligatoria,
                    id_variable=variable.id,
                )
                db.add(pregunta)
                db.flush()
                # An open question still needs one connector row, with no option.
                db.add(PreguntaOpcion(id_pregunta=pregunta.id, id_opcion_respuesta=None))
            else:
                pregunta = Pregunta(
                    texto_pregunta=texto,
                    tipo=TipoPreguntaEnum.single_choice,
                    obligatoria=obligatoria,
                    id_variable=variable.id,
                )
                db.add(pregunta)
                db.flush()
                for texto_opcion in escala:
                    db.add(PreguntaOpcion(
                        id_pregunta=pregunta.id,
                        id_opcion_respuesta=opciones[texto_opcion].id,
                    ))
        db.flush()


def crear_plantilla_abierta(db, owner, preguntas, campo: str) -> None:
    """Attach a list of open questions to a curricular or synthetic template."""
    for texto, obligatoria in preguntas:
        pregunta = Pregunta(
            texto_pregunta=texto,
            tipo=TipoPreguntaEnum.open,
            obligatoria=obligatoria,
            **{campo: owner.id},
        )
        db.add(pregunta)
        db.flush()
        db.add(PreguntaOpcion(id_pregunta=pregunta.id, id_opcion_respuesta=None))
    db.flush()


# =============================================================================
# Answer builders
# =============================================================================

def escala_de(pregunta: Pregunta, po_por_pregunta: dict):
    """Recover which scale a question uses from its option connectors."""
    conectores = po_por_pregunta[pregunta.id]
    textos = [c.opcion_respuesta.texto_opcion for c in conectores if c.opcion_respuesta]
    if not textos:
        return None
    for escala in ESCALAS:
        if set(textos) == set(escala):
            return escala
    return None


def responder_encuesta(db, encuesta, persona, preguntas, po_por_pregunta, calidad) -> Respuesta:
    """Create one complete survey response for a person."""
    respuesta = Respuesta(id_persona=persona.id, id_encuesta_asignatura=encuesta.id)
    db.add(respuesta)
    db.flush()

    for pregunta in preguntas:
        conectores = po_por_pregunta[pregunta.id]
        if pregunta.tipo == TipoPreguntaEnum.open:
            conector = conectores[0]
            if calidad == "baja":
                texto = random.choice(COMENTARIOS_MEJORA + COMENTARIOS_INFRA)
            elif calidad == "alta":
                texto = random.choice(COMENTARIOS_POSITIVOS)
            else:
                texto = random.choice(COMENTARIOS_POSITIVOS + COMENTARIOS_MEJORA)
            db.add(DetalleRespuesta(
                id_pregunta_opcion=conector.id,
                id_respuesta=respuesta.id,
                texto_respuesta_abierta=texto,
            ))
            continue

        escala = escala_de(pregunta, po_por_pregunta)
        if escala is None:
            continue
        pesos = PESOS[calidad][id(escala)]
        elegido = random.choices(escala, weights=pesos, k=1)[0]
        conector = next(
            c for c in conectores
            if c.opcion_respuesta and c.opcion_respuesta.texto_opcion == elegido
        )
        db.add(DetalleRespuesta(
            id_pregunta_opcion=conector.id,
            id_respuesta=respuesta.id,
            texto_respuesta_abierta=None,
        ))

    db.flush()
    return respuesta


def responder_plantilla(db, persona, preguntas, po_por_pregunta, textos, **contexto) -> Respuesta:
    """Create a filled-in curricular or synthetic report response."""
    respuesta = Respuesta(id_persona=persona.id, **contexto)
    db.add(respuesta)
    db.flush()
    for idx, pregunta in enumerate(preguntas):
        conector = po_por_pregunta[pregunta.id][0]
        db.add(DetalleRespuesta(
            id_pregunta_opcion=conector.id,
            id_respuesta=respuesta.id,
            texto_respuesta_abierta=textos[idx % len(textos)],
        ))
    db.flush()
    return respuesta


# =============================================================================
# Main
# =============================================================================

def main() -> None:
    print("\n=== Seed de demo — Universidad Abierta 2026 ===\n")

    # Rebuilding the schema is DDL, and the running backend keeps a pool of
    # SQLite connections whose cached state survives it: some would keep serving
    # rows from before the rebuild. Resetting between groups does NOT need this
    # script — reset_demo.py restores the same data without touching the schema.
    if backend_en_ejecucion() and "--force" not in sys.argv:
        print("El backend esta corriendo en el puerto 8000.")
        print()
        print("Para volver la base al punto inicial (no hace falta cortar nada):")
        print("    ./reset.sh")
        print()
        print("Para regenerar la base desde cero, detene el backend y volve a correr")
        print("este script. Si igual queres forzarlo, agrega --force y REINICIA el")
        print("backend despues, o va a servir datos viejos.")
        sys.exit(1)

    if DB_PATH.exists():
        # respuestas <-> informes_asignaturas is a known FK cycle, so SQLAlchemy
        # cannot topologically sort the DROPs. SQLite does not enforce foreign
        # keys on a plain connection, so dropping in any order is fine here.
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="Can't sort tables for DROP")
            models.ModeloBase.metadata.drop_all(bind=engine)
    models.ModeloBase.metadata.create_all(bind=engine)
    log(f"Esquema recreado en {DB_PATH.name}")

    db = SessionLocal()
    db.execute(text("PRAGMA foreign_keys = ON"))

    try:
        seguridad = SeguridadService(db)
        seguridad.seed()
        db.commit()
        log("Roles y permisos cargados")

        # --- Carrera y plan de estudios --------------------------------------
        carrera = Carrera(nombre=CARRERA, sede=SEDE)
        db.add(carrera)
        db.flush()

        asignaturas = {}
        for nombre, anio, cursado, docente, calidad in ASIGNATURAS:
            a = Asignatura(
                nombre=nombre,
                año=anio,
                nombre_docente=docente,
                cursado=cursado,
                sede=SEDE,
                id_carrera=carrera.id,
            )
            db.add(a)
            db.flush()
            asignaturas[nombre] = (a, calidad)
        db.commit()
        log(f"{len(asignaturas)} materias del plan real de {CARRERA}")

        # --- Personas ---------------------------------------------------------
        def nueva_persona(nombre, apellido, dni, rol):
            p = Persona(
                nombre=nombre,
                apellido=apellido,
                dni=dni,
                telefono=f"0280-15{dni % 1_000_000:06d}",
                email=f"{nombre.split()[0].lower()}.{apellido.split()[0].lower()}{dni % 1000}@unpsjb.edu.ar",
                contacto_emergencia=f"0280-15{(dni + 7) % 1_000_000:06d}",
            )
            p.set_password(PASSWORD)
            db.add(p)
            db.flush()
            seguridad.assign_roles(p.id, [RoleName(rol)])
            db.flush()
            return p

        docentes = {}
        for dni, nombre, apellido, materia in DOCENTES:
            docentes[materia] = nueva_persona(nombre, apellido, dni, "docente")

        depto = nueva_persona(DEPARTAMENTO[1], DEPARTAMENTO[2], DEPARTAMENTO[0], "departamento")
        nueva_persona(ADMIN[1], ADMIN[2], ADMIN[0], "admin")

        alumnos = [nueva_persona(n, a, dni, "alumno") for dni, n, a in ALUMNOS_REALES]
        alumno_demo = next(a for a in alumnos if a.dni == ALUMNO_EN_VIVO_DNI)

        # Cohorte de companeros: no entran al sistema, pero son quienes dejaron
        # las respuestas que hacen que los reportes tengan contenido.
        nombres = ["Lucía", "Mateo", "Valentina", "Bruno", "Camila", "Thiago", "Julieta",
                   "Benjamín", "Martina", "Joaquín", "Delfina", "Santino", "Renata",
                   "Ignacio", "Abril", "Lautaro", "Emilia", "Bautista", "Catalina",
                   "Facundo", "Guadalupe", "Tomás"]
        apellidos = ["Aguirre", "Barrientos", "Cabrera", "Duarte", "Escobar", "Figueroa",
                     "Giménez", "Herrera", "Ibarra", "Juárez", "Leiva", "Maldonado",
                     "Navarro", "Ojeda", "Pereyra", "Quispe", "Ríos", "Sandoval",
                     "Torres", "Uriarte", "Vera", "Zalazar"]
        for idx, (n, ap) in enumerate(zip(nombres, apellidos)):
            alumnos.append(nueva_persona(n, ap, 46000000 + idx * 1237, "alumno"))
        db.commit()
        log(f"{len(docentes)} docentes, 1 departamento, 1 admin, {len(alumnos)} alumnos")

        # --- Cursadas ---------------------------------------------------------
        # Cursada es la tabla que usa la app para los DOS lados: decide que
        # encuestas ve un alumno y que reportes ve un docente.
        inscriptos = {}
        for nombre, (asig, _) in asignaturas.items():
            cohorte = random.sample(alumnos[2:], k=random.randint(14, 19))
            # Los dos alumnos que entran al sistema cursan las materias que
            # tienen encuesta abierta.
            if nombre in MATERIAS_CON_ENCUESTA_ABIERTA:
                cohorte = alumnos[:2] + cohorte
            inscriptos[nombre] = cohorte
            for alumno in cohorte:
                db.add(Cursada(id_persona=alumno.id, id_asignatura=asig.id,
                               ciclo_lectivo=CICLO_ACTUAL))

        # Cada docente cursa (integra la catedra de) su materia.
        for materia, persona in docentes.items():
            db.add(Cursada(id_persona=persona.id,
                           id_asignatura=asignaturas[materia][0].id,
                           ciclo_lectivo=CICLO_ACTUAL))

        # El docente que expone integra ademas otras dos catedras, para que su
        # listado de reportes no tenga una sola fila (RN-04 admite integrantes
        # del equipo, no solo al titular).
        docente_demo = docentes[MATERIA_EN_VIVO]
        for materia in ("Ingeniería de Software I", "Fundamentos Teóricos de Informática"):
            db.add(Cursada(id_persona=docente_demo.id,
                           id_asignatura=asignaturas[materia][0].id,
                           ciclo_lectivo=CICLO_ACTUAL))
        db.commit()
        log("Cursadas cargadas (alumnos y docentes)")

        # --- Opciones de respuesta -------------------------------------------
        opciones = {}
        for texto in dict.fromkeys(ESCALA_1_4 + ESCALA_SI_NO + ESCALA_SUFICIENCIA + ESCALA_PORCENTAJE):
            o = OpcionRespuesta(texto_opcion=texto)
            db.add(o)
            db.flush()
            opciones[texto] = o

        # --- Plantillas de encuesta ------------------------------------------
        base_basico = EncuestaBase(
            nombre="Encuesta de Evaluacion de Asignatura — Ciclo Basico",
            ciclo=Ciclo.ciclo_basico,
        )
        base_superior = EncuestaBase(
            nombre="Encuesta de Evaluacion de Asignatura — Ciclo Superior",
            ciclo=Ciclo.ciclo_superior,
        )
        db.add_all([base_basico, base_superior])
        db.flush()
        crear_variables_y_preguntas(db, base_basico, opciones)
        crear_variables_y_preguntas(db, base_superior, opciones)
        db.commit()
        log("2 encuestas base (ciclo basico y superior), 5 variables y 16 preguntas cada una")

        # --- Plantillas de informe -------------------------------------------
        informe_base = InformeCurricularBase(
            titulo="Informe de Actividad Curricular — Res. CDFI N.º 283/2015",
        )
        db.add(informe_base)
        db.flush()
        crear_plantilla_abierta(db, informe_base, [
            ("Describa el desarrollo general de la actividad curricular durante el ciclo lectivo.", True),
            ("Analice los resultados de la encuesta de estudiantes y senale los aspectos mas destacados.", True),
            ("Indique las dificultades detectadas en el proceso de ensenanza y aprendizaje.", True),
            ("Describa las actividades de extension, investigacion o capacitacion del equipo docente.", False),
            ("Proponga acciones de mejora para el proximo dictado.", True),
            ("Observaciones adicionales.", False),
        ], "id_informe_curricular_base")

        sintetico_base = InformeSinteticoBase(
            titulo="Informe Sintetico de Carrera — Res. CDFI N.º 283/2015",
        )
        db.add(sintetico_base)
        db.flush()
        crear_plantilla_abierta(db, sintetico_base, [
            ("Sintesis de las actividades curriculares del periodo.", True),
            ("Principales fortalezas detectadas en los informes de catedra.", True),
            ("Principales dificultades y propuestas de mejora elevadas por los equipos docentes.", True),
            ("Seguimiento de las propuestas de mejora del periodo anterior.", False),
            ("Observaciones para la Secretaria Academica.", False),
        ], "id_informe_sintetico_base")
        db.commit()
        log("Plantillas de informe curricular y sintetico cargadas")

        # --- Indice del arbol de preguntas -----------------------------------
        po_por_pregunta = {}
        for po in db.query(PreguntaOpcion).all():
            po_por_pregunta.setdefault(po.id_pregunta, []).append(po)

        preguntas_por_base = {}
        for base in (base_basico, base_superior):
            preguntas_por_base[base.id] = (
                db.query(Pregunta)
                .join(Variable, Pregunta.id_variable == Variable.id)
                .filter(Variable.id_encuesta_base == base.id)
                .order_by(Pregunta.id)
                .all()
            )

        preguntas_informe = (
            db.query(Pregunta)
            .filter(Pregunta.id_informe_curricular_base == informe_base.id)
            .order_by(Pregunta.id).all()
        )
        preguntas_sintetico = (
            db.query(Pregunta)
            .filter(Pregunta.id_informe_sintetico_base == sintetico_base.id)
            .order_by(Pregunta.id).all()
        )

        def base_para(asig: Asignatura) -> EncuestaBase:
            return base_basico if asig.año <= 2 else base_superior

        # --- Encuestas por asignatura ----------------------------------------
        reportes = {}
        for nombre, (asig, calidad) in asignaturas.items():
            base = base_para(asig)
            preguntas = preguntas_por_base[base.id]
            cohorte = inscriptos[nombre]
            es_c1 = asig.cursado == Cursado.cuatrimestre1
            ventana = ENC_C1_CERRADA if es_c1 else ENC_C2_CERRADA

            # 1) Ciclo anterior, solo para la materia que se expone en vivo:
            #    alimenta la comparativa interanual. Se siembra un escalon peor
            #    para que la comparacion muestre mejora.
            if nombre == MATERIA_EN_VIVO:
                enc_ant = EncuestaAsignatura(
                    id_encuesta_base=base.id,
                    id_asignatura=asig.id,
                    fecha_inicio=ENC_ANTERIOR[0],
                    fecha_fin=ENC_ANTERIOR[1],
                    ciclo_lectivo=CICLO_ANTERIOR,
                    estado=EstadoEncuesta.cerrada,
                )
                db.add(enc_ant)
                db.flush()
                for alumno in random.sample(cohorte, k=min(11, len(cohorte))):
                    responder_encuesta(db, enc_ant, alumno, preguntas, po_por_pregunta, "media")

            # 2) Encuesta del ciclo actual, ya cerrada: es la que genero el
            #    reporte sobre el que trabaja el docente.
            enc_cerrada = EncuestaAsignatura(
                id_encuesta_base=base.id,
                id_asignatura=asig.id,
                fecha_inicio=ventana[0],
                fecha_fin=ventana[1],
                ciclo_lectivo=CICLO_ACTUAL,
                estado=EstadoEncuesta.cerrada,
            )
            db.add(enc_cerrada)
            db.flush()

            # calidad "cero": nadie respondio. Es lo que dispara la alerta de
            # baja participacion en el tablero del departamento.
            if calidad != "cero":
                n = random.randint(max(8, len(cohorte) // 2), len(cohorte) - 2)
                for alumno in random.sample(cohorte, k=n):
                    responder_encuesta(db, enc_cerrada, alumno, preguntas,
                                       po_por_pregunta, calidad)

            reporte = Reporte(id_encuesta_asignatura=enc_cerrada.id)
            db.add(reporte)
            db.flush()
            reportes[nombre] = reporte

            # 3) Encuesta abierta hoy: el trabajo pendiente del alumno.
            if nombre in MATERIAS_CON_ENCUESTA_ABIERTA:
                enc_abierta = EncuestaAsignatura(
                    id_encuesta_base=base.id,
                    id_asignatura=asig.id,
                    fecha_inicio=ENC_ABIERTA[0],
                    fecha_fin=ENC_ABIERTA[1],
                    ciclo_lectivo=CICLO_ACTUAL,
                    estado=EstadoEncuesta.abierta,
                )
                db.add(enc_abierta)
                db.flush()
                # Algunos companeros ya respondieron; los alumnos que entran a
                # la demo no, asi que les queda pendiente.
                otros = [a for a in cohorte if a not in alumnos[:2]]
                for alumno in random.sample(otros, k=min(3, len(otros))):
                    responder_encuesta(db, enc_abierta, alumno, preguntas,
                                       po_por_pregunta, calidad if calidad != "cero" else "media")

            db.commit()
        log(f"{len(reportes)} reportes generados sobre encuestas cerradas")

        # --- Informes curriculares ya presentados ----------------------------
        textos_informe = [
            "El dictado se desarrollo segun el cronograma previsto, con una carga practica sostenida "
            "a lo largo del cuatrimestre y un nivel de asistencia estable.",
            "Los resultados de la encuesta muestran una valoracion positiva de la claridad expositiva "
            "y de la predisposicion del equipo docente para atender consultas.",
            "Se detectaron dificultades en la disponibilidad de equipamiento de laboratorio y en la "
            "superposicion de fechas de entrega con otras asignaturas del mismo nivel.",
            "El equipo participo en jornadas de actualizacion docente y en la revision del programa "
            "analitico de la asignatura.",
            "Se propone incorporar instancias de consulta adicionales previas a cada parcial y "
            "redistribuir el cronograma de entregas.",
            "Se agradece el acompanamiento del Departamento en la gestion de los recursos solicitados.",
        ]

        informes_creados = 0
        for nombre, (asig, _) in asignaturas.items():
            if nombre == MATERIA_EN_VIVO:
                continue  # queda abierto: es el paso en vivo del docente
            # Analisis Matematico lo dicta Claudia Lopez, que en el sistema
            # figura con el rol de departamento, no con el de docente.
            autor = docentes.get(nombre, depto)
            informe = InformeAsignatura(
                sede=Sede.tw,
                ciclo_lectivo=CICLO_ACTUAL,
                docente=asig.nombre_docente,
                cant_alumnos_insc=len(inscriptos[nombre]),
                cant_comisiones_teoricas=1,
                cant_comisiones_practicas=random.randint(1, 3),
                estado=EstadoInforme.abierto,
                id_informe_curricular_base=informe_base.id,
                id_asignatura=asig.id,
                id_reporte=reportes[nombre].id,
            )
            db.add(informe)
            db.flush()
            responder_plantilla(db, autor, preguntas_informe, po_por_pregunta,
                                textos_informe, id_informe_asignatura=informe.id)
            # Enviar la respuesta es lo que cierra el informe en el flujo real.
            informe.estado = EstadoInforme.cerrado
            db.add(informe)
            informes_creados += 1
        db.commit()
        log(f"{informes_creados} informes curriculares cerrados "
            f"(queda abierto el de {MATERIA_EN_VIVO})")

        # --- Informe sintetico del 1.er cuatrimestre, ya presentado ----------
        # El del 2.º cuatrimestre queda pendiente a proposito: es el paso en
        # vivo del departamento, y ahi entra el informe que acaba de hacer el
        # docente sobre la materia que se expone.
        textos_sintetico = [
            "Durante el periodo se dictaron las actividades curriculares previstas, con informes de "
            "catedra presentados en tiempo y forma.",
            "Se destaca la valoracion positiva del vinculo docente-estudiante y la claridad de las "
            "consignas de trabajos practicos.",
            "Persisten dificultades vinculadas al equipamiento de laboratorio y a la conectividad, "
            "que fueron elevadas a la Secretaria Academica.",
            "Las propuestas de mejora del periodo anterior referidas a horarios de consulta fueron "
            "implementadas por la mayoria de las catedras.",
            "Se solicita considerar la actualizacion del equipamiento informatico para el proximo ciclo.",
        ]
        sintetico_c1 = InformeSinteticoCarrera(
            ciclo_lectivo=str(CICLO_ACTUAL),
            comision_asesora=f"Comision Asesora de {CARRERA}",
            sede=SEDE,
            integrantes="Claudia Lopez, Sebastian Schanz, Cristian Parise",
            estado=EstadoSintetico.abierto,
            id_carrera=carrera.id,
            id_informe_sintetico_base=sintetico_base.id,
        )
        db.add(sintetico_c1)
        db.flush()
        responder_plantilla(db, depto, preguntas_sintetico, po_por_pregunta,
                            textos_sintetico, id_informe_sintetico_carrera=sintetico_c1.id)
        sintetico_c1.estado = EstadoSintetico.cerrado

        # Vincular los informes del 1.er cuatrimestre, como hace el endpoint real.
        for nombre, (asig, _) in asignaturas.items():
            if asig.cursado != Cursado.cuatrimestre1:
                continue
            inf = (db.query(InformeAsignatura)
                     .filter(InformeAsignatura.id_asignatura == asig.id).first())
            if inf:
                inf.id_informe_sintetico_carrera = sintetico_c1.id
        db.commit()
        log("1 informe sintetico presentado (1.er cuatrimestre); el 2.º queda pendiente")

        conteos = {
            "personas": db.query(Persona).count(),
            "asignaturas": db.query(Asignatura).count(),
            "cursadas": db.query(Cursada).count(),
            "encuestas": db.query(EncuestaAsignatura).count(),
            "respuestas": db.query(Respuesta).count(),
            "detalles": db.query(DetalleRespuesta).count(),
            "reportes": db.query(Reporte).count(),
            "informes": db.query(InformeAsignatura).count(),
            "sinteticos": db.query(InformeSinteticoCarrera).count(),
        }
    finally:
        db.close()

    engine.dispose()
    shutil.copy2(DB_PATH, SNAPSHOT_PATH)

    print("\n--- Resumen ---")
    for k, v in conteos.items():
        print(f"  {k:<12} {v}")

    print(f"\n  Base:     {DB_PATH}")
    print(f"  Snapshot: {SNAPSHOT_PATH}")

    print(f"\n--- Usuarios (el usuario es el DNI, la contrasena es {PASSWORD}) ---")
    print(f"  Alumno        {ALUMNOS_REALES[0][0]}   Franco Soler        <- para la demo")
    print(f"  Alumno        {ALUMNOS_REALES[1][0]}   Nicolás Arenas")
    print(f"  Docente       {DOCENTE_EN_VIVO_DNI}       Leonardo Ordinez    <- para la demo")
    print(f"  Departamento  {DEPARTAMENTO[0]}       Claudia López       <- para la demo")
    print(f"  Admin         {ADMIN[0]}       Admin Sistema")
    print("  Otros docentes: 1002 Marticorena · 1003 Pecile · 1004 Parise · 1005 Schanz")
    print("                  1006 Zamora · 1007 Zapellini · 1008 Firmenitch · 1009 Carlos")
    print("\nListo.\n")


if __name__ == "__main__":
    main()
