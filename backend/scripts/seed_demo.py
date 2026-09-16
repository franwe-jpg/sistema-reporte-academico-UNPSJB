"""
Demo database seeder — Universidad Abierta 2026.

Builds a deterministic, self-consistent demo dataset from scratch and stores a
pristine snapshot next to it so the database can be reset between visitor groups
in under a second (see scripts/reset_demo.sh).

Run from anywhere:

    backend/venv/bin/python backend/scripts/seed_demo.py

What it guarantees for the live demo:

  * One login per role (alumno / docente / departamento / admin).
  * The alumno has open surveys to answer right now (real system date).
  * The docente has a report with real answers behind it, plus a previous-year
    survey so the year-over-year comparison returns data.
  * The departamento has closed curricular reports to consolidate into a
    synthetic report.
  * The statistics dashboards have enough spread to show alerts and rankings.

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
    sys.exit("DB_URL is not set. Create backend/.env first (see scripts/README.md).")

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

# --- Academic calendar of the demo -------------------------------------------
# Kept in sync with frontend/react-app/src/calendarioAcademico.ts.
# The backend gates the alumno flow on the REAL system date, so the open survey
# window must span today.
CICLO_ACTUAL = 2026
CICLO_ANTERIOR = 2025

ENCUESTA_ANTERIOR = (date(2025, 3, 16), date(2025, 7, 10))   # closed, previous year
ENCUESTA_CERRADA = (date(2026, 3, 16), date(2026, 7, 10))    # closed, feeds the reports
ENCUESTA_ABIERTA = (date(2026, 8, 3), date(2026, 12, 12))    # open, spans today

PASSWORDS = {
    "alumno": "alumno123",
    "docente": "docente123",
    "departamento": "depto123",
    "admin": "admin123",
}

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

# Sampling weights per quality tier, aligned to each scale's option order.
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


def crear_plantilla_abierta(db, owner, preguntas: list[tuple[str, bool]], campo: str) -> None:
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

def escala_de(pregunta: Pregunta, po_por_pregunta: dict) -> list | None:
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
        print("    backend/venv/bin/python backend/scripts/reset_demo.py")
        print()
        print("Para regenerar la base desde cero, detene el backend y volve a correr")
        print("este script. Si igual queres forzarlo, agrega --force y REINICIA el")
        print("backend despues, o va a servir datos viejos.")
        sys.exit(1)

    # Drop and recreate the tables instead of deleting the file. Unlinking it
    # would leave any running backend holding connections to the old inode,
    # which then serves a mix of stale and fresh rows.
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
        # --- Roles and permissions -------------------------------------------
        seguridad = SeguridadService(db)
        seguridad.seed()
        db.commit()
        log("Roles y permisos cargados")

        # --- Careers ----------------------------------------------------------
        lic = Carrera(nombre="Licenciatura en Sistemas", sede="Trelew")
        apu = Carrera(nombre="Analista Programador Universitario", sede="Trelew")
        db.add_all([lic, apu])
        db.flush()

        # --- Subjects ---------------------------------------------------------
        # NOTE: Asignatura.nombre_docente is globally UNIQUE, so every subject
        # needs a distinct teacher name string.
        asignaturas_def = [
            # (nombre, año, nombre_docente, carrera, calidad de las respuestas)
            ("Desarrollo de Software", 4, "Ana Beatriz Ferreyra", lic, "alta"),
            ("Base de Datos", 3, "Silvia Noemi Quinteros", lic, "alta"),
            ("Algoritmos y Estructuras de Datos", 2, "Hugo Marcelo Petrucci", lic, "media"),
            ("Paradigmas de Programacion", 3, "Ricardo Damian Olivera", lic, "baja"),
            ("Analisis Matematico I", 1, "Raul Esteban Vidal", lic, "media"),
            ("Programacion Orientada a Objetos", 2, "Mariela Andrea Sosa", apu, "media"),
        ]

        asignaturas = {}
        for nombre, anio, docente, carrera, calidad in asignaturas_def:
            a = Asignatura(
                nombre=nombre,
                año=anio,
                nombre_docente=docente,
                cursado=Cursado.cuatrimestre1,
                sede="Trelew",
                id_carrera=carrera.id,
            )
            db.add(a)
            db.flush()
            asignaturas[nombre] = (a, calidad)
        log(f"{len(asignaturas)} asignaturas en 2 carreras")

        # --- People -----------------------------------------------------------
        def nueva_persona(nombre, apellido, dni, rol, password=None):
            p = Persona(
                nombre=nombre,
                apellido=apellido,
                dni=dni,
                telefono=f"0280-15{dni % 1000000:06d}",
                email=f"{nombre.split()[0].lower()}.{apellido.split()[0].lower()}{dni % 100}@unpsjb.edu.ar",
                contacto_emergencia=f"0280-15{(dni + 7) % 1000000:06d}",
            )
            p.set_password(password or PASSWORDS[rol])
            db.add(p)
            db.flush()
            seguridad.assign_roles(p.id, [RoleName(rol)])
            db.flush()
            return p

        alumno_demo = nueva_persona("Sofia Ailen", "Nunez", 45123456, "alumno")
        docente_demo = nueva_persona("Ana Beatriz", "Ferreyra", 24876543, "docente")
        depto_demo = nueva_persona("Marcela Ines", "Quiroga", 20345678, "departamento")
        admin_demo = nueva_persona("Franco", "Soler", 35111222, "admin")

        # Other teachers, so the department view is not a one-subject demo.
        otros_docentes = {}
        for idx, (nombre, anio, docente, carrera, calidad) in enumerate(asignaturas_def[1:], start=1):
            partes = docente.split()
            p = nueva_persona(" ".join(partes[:-1]), partes[-1], 24000000 + idx * 13571, "docente")
            otros_docentes[docente] = p

        # A cohort of students. They never log in during the demo, but they own
        # the survey answers that make the reports meaningful.
        alumnos = [alumno_demo]
        nombres = ["Lucia", "Mateo", "Valentina", "Bruno", "Camila", "Thiago", "Julieta",
                   "Benjamin", "Martina", "Joaquin", "Delfina", "Santino", "Renata",
                   "Ignacio", "Abril", "Lautaro", "Emilia", "Bautista", "Catalina",
                   "Facundo", "Guadalupe", "Tomas", "Zoe"]
        apellidos = ["Aguirre", "Barrientos", "Cabrera", "Duarte", "Escobar", "Figueroa",
                     "Gimenez", "Herrera", "Ibarra", "Juarez", "Leiva", "Maldonado",
                     "Navarro", "Ojeda", "Pereyra", "Quispe", "Rios", "Sandoval",
                     "Torres", "Uriarte", "Vera", "Wagner", "Zalazar"]
        for idx, (n, ap) in enumerate(zip(nombres, apellidos)):
            alumnos.append(nueva_persona(n, ap, 46000000 + idx * 1237, "alumno"))
        db.commit()
        log(f"{len(alumnos)} alumnos, {1 + len(otros_docentes)} docentes, 1 departamento, 1 admin")

        # --- Enrolments -------------------------------------------------------
        # Cursada is the join the app uses for BOTH sides: it decides which
        # surveys a student sees AND which reports a teacher sees.
        inscriptos = {}
        for nombre, (asig, _) in asignaturas.items():
            cohorte = random.sample(alumnos[1:], k=random.randint(14, 19))
            if nombre in ("Desarrollo de Software", "Base de Datos",
                          "Algoritmos y Estructuras de Datos"):
                cohorte = [alumno_demo] + cohorte
            inscriptos[nombre] = cohorte
            for alumno in cohorte:
                db.add(Cursada(id_persona=alumno.id, id_asignatura=asig.id,
                               ciclo_lectivo=CICLO_ACTUAL))

        # The demo teacher is on the cátedra of three subjects (RN-04 allows
        # team members, not only the titular), so her report list is not empty.
        for nombre in ("Desarrollo de Software", "Base de Datos",
                       "Algoritmos y Estructuras de Datos"):
            db.add(Cursada(id_persona=docente_demo.id,
                           id_asignatura=asignaturas[nombre][0].id,
                           ciclo_lectivo=CICLO_ACTUAL))

        for nombre, (asig, _) in asignaturas.items():
            titular = asig.nombre_docente
            if titular in otros_docentes:
                db.add(Cursada(id_persona=otros_docentes[titular].id,
                               id_asignatura=asig.id, ciclo_lectivo=CICLO_ACTUAL))
        db.commit()
        log("Cursadas cargadas (alumnos y docentes)")

        # --- Answer options ---------------------------------------------------
        opciones = {}
        for texto in dict.fromkeys(ESCALA_1_4 + ESCALA_SI_NO + ESCALA_SUFICIENCIA + ESCALA_PORCENTAJE):
            o = OpcionRespuesta(texto_opcion=texto)
            db.add(o)
            db.flush()
            opciones[texto] = o

        # --- Survey templates -------------------------------------------------
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
        log("2 encuestas base (ciclo basico y superior) con 5 variables y 16 preguntas cada una")

        # --- Report templates -------------------------------------------------
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

        # --- Index the question tree once ------------------------------------
        po_por_pregunta = {}
        for po in db.query(PreguntaOpcion).all():
            po_por_pregunta.setdefault(po.id_pregunta, []).append(po)

        preguntas_por_base = {}
        for base in (base_basico, base_superior):
            preguntas = (
                db.query(Pregunta)
                .join(Variable, Pregunta.id_variable == Variable.id)
                .filter(Variable.id_encuesta_base == base.id)
                .order_by(Pregunta.id)
                .all()
            )
            preguntas_por_base[base.id] = preguntas

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

        # --- Surveys per subject ---------------------------------------------
        reportes = {}
        for nombre, (asig, calidad) in asignaturas.items():
            base = base_para(asig)
            preguntas = preguntas_por_base[base.id]
            cohorte = inscriptos[nombre]

            # 1) Previous year — only for the demo subject, to feed the
            #    year-over-year comparison. Seeded one tier worse so the
            #    comparison shows improvement.
            if nombre == "Desarrollo de Software":
                calidad_anterior = "media"
                enc_ant = EncuestaAsignatura(
                    id_encuesta_base=base.id,
                    id_asignatura=asig.id,
                    fecha_inicio=ENCUESTA_ANTERIOR[0],
                    fecha_fin=ENCUESTA_ANTERIOR[1],
                    ciclo_lectivo=CICLO_ANTERIOR,
                    estado=EstadoEncuesta.cerrada,
                )
                db.add(enc_ant)
                db.flush()
                for alumno in random.sample(cohorte, k=min(11, len(cohorte))):
                    responder_encuesta(db, enc_ant, alumno, preguntas,
                                       po_por_pregunta, calidad_anterior)

            # 2) Current year, already closed — this is what the teacher
            #    reports on. A closed survey plus its Reporte is the invariant
            #    the app expects.
            enc_cerrada = EncuestaAsignatura(
                id_encuesta_base=base.id,
                id_asignatura=asig.id,
                fecha_inicio=ENCUESTA_CERRADA[0],
                fecha_fin=ENCUESTA_CERRADA[1],
                ciclo_lectivo=CICLO_ACTUAL,
                estado=EstadoEncuesta.cerrada,
            )
            db.add(enc_cerrada)
            db.flush()

            # "Analisis Matematico I" stays at zero responses on purpose: it is
            # what triggers the low-participation alert on the dashboard.
            if nombre != "Analisis Matematico I":
                n = random.randint(max(8, len(cohorte) // 2), len(cohorte) - 2)
                for alumno in random.sample(cohorte, k=n):
                    responder_encuesta(db, enc_cerrada, alumno, preguntas,
                                       po_por_pregunta, calidad)

            reporte = Reporte(id_encuesta_asignatura=enc_cerrada.id)
            db.add(reporte)
            db.flush()
            reportes[nombre] = reporte

            # 3) Second semester, open right now — the alumno's pending work.
            if nombre in ("Desarrollo de Software", "Base de Datos",
                          "Algoritmos y Estructuras de Datos"):
                enc_abierta = EncuestaAsignatura(
                    id_encuesta_base=base.id,
                    id_asignatura=asig.id,
                    fecha_inicio=ENCUESTA_ABIERTA[0],
                    fecha_fin=ENCUESTA_ABIERTA[1],
                    ciclo_lectivo=CICLO_ACTUAL,
                    estado=EstadoEncuesta.abierta,
                )
                db.add(enc_abierta)
                db.flush()
                # Some classmates already answered; the demo student has not,
                # so it stays in her pending list.
                otros = [a for a in cohorte if a.id != alumno_demo.id]
                for alumno in random.sample(otros, k=min(3, len(otros))):
                    responder_encuesta(db, enc_abierta, alumno, preguntas,
                                       po_por_pregunta, calidad)

            db.commit()
        log(f"{len(reportes)} reportes generados sobre encuestas cerradas")

        # --- Pre-filled curricular reports -----------------------------------
        # Every subject except the demo one already has a closed curricular
        # report, so the departamento has material to consolidate. The demo
        # teacher's own subject is left open on purpose: that is the live step.
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
            if nombre == "Desarrollo de Software":
                continue  # left for the live demo
            titular = asig.nombre_docente
            autor = otros_docentes.get(titular, docente_demo)
            informe = InformeAsignatura(
                sede=Sede.tw,
                ciclo_lectivo=CICLO_ACTUAL,
                docente=titular,
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
            # Submitting an answer is what closes the report in the real flow.
            informe.estado = EstadoInforme.cerrado
            db.add(informe)
            informes_creados += 1
        db.commit()
        log(f"{informes_creados} informes curriculares cerrados (queda 1 abierto para la demo)")

        # --- One already-filed synthetic report -------------------------------
        # For the APU career, so the departamento's "Mis Informes Enviados" is
        # not empty. Licenciatura en Sistemas is left pending on purpose.
        textos_sintetico = [
            "Durante el primer cuatrimestre se dictaron las actividades curriculares previstas, "
            "con informes de catedra presentados en tiempo y forma.",
            "Se destaca la valoracion positiva del vinculo docente-estudiante y la claridad de las "
            "consignas de trabajos practicos.",
            "Persisten dificultades vinculadas al equipamiento de laboratorio y a la conectividad, "
            "que fueron elevadas a la Secretaria Academica.",
            "Las propuestas de mejora del periodo anterior referidas a horarios de consulta fueron "
            "implementadas por la mayoria de las catedras.",
            "Se solicita considerar la actualizacion del equipamiento informatico para el proximo ciclo.",
        ]
        sintetico_apu = InformeSinteticoCarrera(
            ciclo_lectivo=str(CICLO_ACTUAL),
            comision_asesora="Comision Asesora de Analista Programador Universitario",
            sede="Trelew",
            integrantes="Marcela Ines Quiroga, Mariela Andrea Sosa, Raul Esteban Vidal",
            estado=EstadoSintetico.abierto,
            id_carrera=apu.id,
            id_informe_sintetico_base=sintetico_base.id,
        )
        db.add(sintetico_apu)
        db.flush()
        responder_plantilla(db, depto_demo, preguntas_sintetico, po_por_pregunta,
                            textos_sintetico, id_informe_sintetico_carrera=sintetico_apu.id)
        sintetico_apu.estado = EstadoSintetico.cerrado

        # Link the APU curricular report to it, the way the real endpoint does.
        informe_apu = (
            db.query(InformeAsignatura)
            .filter(InformeAsignatura.id_asignatura ==
                    asignaturas["Programacion Orientada a Objetos"][0].id)
            .first()
        )
        if informe_apu:
            informe_apu.id_informe_sintetico_carrera = sintetico_apu.id
        db.commit()
        log("1 informe sintetico ya presentado (APU); Lic. en Sistemas queda pendiente")

        # --- Summary ----------------------------------------------------------
        conteos = {
            "personas": db.query(Persona).count(),
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

    print("\n--- Usuarios de la demo (el usuario es el DNI) ---")
    print(f"  Alumno        DNI 45123456  /  {PASSWORDS['alumno']}       Sofia Ailen Nunez")
    print(f"  Docente       DNI 24876543  /  {PASSWORDS['docente']}      Ana Beatriz Ferreyra")
    print(f"  Departamento  DNI 20345678  /  {PASSWORDS['departamento']}        Marcela Ines Quiroga")
    print(f"  Admin         DNI 35111222  /  {PASSWORDS['admin']}       Franco Soler")
    print("\nListo.\n")


if __name__ == "__main__":
    main()
