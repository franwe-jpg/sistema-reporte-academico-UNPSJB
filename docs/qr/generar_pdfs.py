"""
Genera los PDF para imprimir: un codigo QR grande y las credenciales de acceso.

    backend/venv/bin/python docs/qr/generar_pdfs.py

Produce, en esta misma carpeta:
  * sistema.pdf     hoja 1: QR del sistema / hoja 2: credenciales por rol
  * infografia.pdf  una hoja con el QR de la infografia

Las credenciales de los docentes se leen de la base, asi que basta con volver a
correrlo si cambian las materias. Si cambia la direccion publica, se ajusta
BASE_URL (o se pasa como primer argumento) y se regenera todo.

Los nombres de las personas no se imprimen: cada acceso se identifica por su rol
y, en el caso de los docentes, por la asignatura.
"""

from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
BASE_DATOS = RAIZ / "backend" / "demo_snapshot.db"
LOGO = RAIZ / "docs" / "identidad" / "logo-unpsjb.png"

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else (
    "https://sistema-reporte-academico-unpsjb.unpsjb.workers.dev"
)
PASSWORD = "1234"

# Colores oficiales del Manual de Identidad Institucional de la UNPSJB.
AZUL = HexColor("#004992")
AMBAR = HexColor("#FF9900")
TINTA = HexColor("#14202E")
GRIS = HexColor("#6B7D8F")
LINEA = HexColor("#CCD7E4")

ANCHO, ALTO = A4
MARGEN = 20 * 2.834645  # 20 mm en puntos


def mm(valor: float) -> float:
    return valor * 2.834645


def qr_png(texto: str) -> Path:
    """Genera el QR con qrencode, en correccion alta para que aguante impreso."""
    destino = Path(tempfile.mkdtemp()) / "qr.png"
    subprocess.run(
        ["qrencode", "-o", str(destino), "-s", "20", "-m", "2", "-l", "H", texto],
        check=True,
    )
    return destino


def membrete(c: canvas.Canvas) -> float:
    """Dibuja el logo institucional y el filete ambar. Devuelve la altura usada."""
    y = ALTO - MARGEN
    if LOGO.exists():
        logo = ImageReader(str(LOGO))
        ancho_logo = mm(75)
        w, h = logo.getSize()
        alto_logo = ancho_logo * h / w
        c.drawImage(logo, MARGEN, y - alto_logo, width=ancho_logo,
                    height=alto_logo, mask="auto")
        y -= alto_logo + mm(6)
    c.setFillColor(AMBAR)
    c.rect(MARGEN, y, ANCHO - 2 * MARGEN, mm(1.6), stroke=0, fill=1)
    return y - mm(12)


def centrado(c: canvas.Canvas, texto: str, y: float, fuente: str, tam: float, color) -> float:
    c.setFont(fuente, tam)
    c.setFillColor(color)
    c.drawCentredString(ANCHO / 2, y, texto)
    return y - tam * 1.35


def hoja_qr(c: canvas.Canvas, titulo: str, subtitulo: str, url: str, pie: str) -> None:
    y = membrete(c)

    y = centrado(c, subtitulo, y, "Helvetica-Bold", 10.5, AMBAR)
    y -= mm(4)

    # El titulo puede necesitar dos lineas.
    c.setFont("Helvetica-Bold", 22)
    palabras, linea, lineas = titulo.split(), "", []
    for p in palabras:
        prueba = f"{linea} {p}".strip()
        if c.stringWidth(prueba, "Helvetica-Bold", 22) > ANCHO - 2 * MARGEN:
            lineas.append(linea)
            linea = p
        else:
            linea = prueba
    lineas.append(linea)
    for l in lineas:
        y = centrado(c, l, y, "Helvetica-Bold", 22, AZUL)

    # QR grande y centrado.
    y -= mm(10)
    lado = mm(95)
    imagen = ImageReader(str(qr_png(url)))
    x = (ANCHO - lado) / 2
    c.drawImage(imagen, x, y - lado, width=lado, height=lado)

    # Marco sutil alrededor del codigo.
    c.setStrokeColor(LINEA)
    c.setLineWidth(0.8)
    c.rect(x - mm(4), y - lado - mm(4), lado + mm(8), lado + mm(8), stroke=1, fill=0)

    y = y - lado - mm(16)
    y = centrado(c, pie, y, "Helvetica", 12, GRIS)
    y -= mm(4)

    # La direccion va grande y en negrita: es la alternativa para quien no pueda
    # escanear el codigo y tenga que escribirla a mano.
    limpia = url.replace("https://", "")
    tam = 15
    while c.stringWidth(limpia, "Helvetica-Bold", tam) > ANCHO - 2 * MARGEN and tam > 8:
        tam -= 0.5
    centrado(c, limpia, y, "Helvetica-Bold", tam, AZUL)


def credenciales_docentes() -> list[tuple[str, str, int]]:
    """(materia, dni, año) de cada docente, tomados de la base."""
    con = sqlite3.connect(BASE_DATOS)
    con.row_factory = sqlite3.Row
    filas = con.execute(
        """
        SELECT p.dni, a.nombre AS materia, a.año AS anio
        FROM personas p
        JOIN asignaturas a ON a.nombre_docente = (p.nombre || ' ' || p.apellido)
        WHERE p.dni BETWEEN 1000 AND 1099
        ORDER BY a.año, a.nombre
        """
    ).fetchall()
    con.close()
    return [(f["materia"], str(f["dni"]), f["anio"]) for f in filas]


def bloque(c: canvas.Canvas, y: float, titulo: str, filas: list[tuple[str, str]]) -> float:
    """Un rol con sus accesos. Devuelve la nueva altura."""
    c.setFillColor(AZUL)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawString(MARGEN, y, titulo)
    y -= mm(2)
    c.setStrokeColor(AMBAR)
    c.setLineWidth(1.4)
    c.line(MARGEN, y, ANCHO - MARGEN, y)
    y -= mm(7)

    for etiqueta, dni in filas:
        c.setFillColor(TINTA)
        c.setFont("Helvetica", 10.5)
        c.drawString(MARGEN + mm(3), y, etiqueta)

        c.setFont("Helvetica-Bold", 10.5)
        c.drawRightString(ANCHO - MARGEN - mm(30), y, f"DNI {dni}")
        c.setFont("Helvetica", 10.5)
        c.setFillColor(GRIS)
        c.drawRightString(ANCHO - MARGEN, y, f"clave {PASSWORD}")

        y -= mm(5.2)
        c.setStrokeColor(LINEA)
        c.setLineWidth(0.4)
        c.line(MARGEN + mm(3), y + mm(1.4), ANCHO - MARGEN, y + mm(1.4))
        y -= mm(1.6)

    return y - mm(6)


def hoja_credenciales(c: canvas.Canvas) -> None:
    y = membrete(c)

    y = centrado(c, "ACCESOS AL SISTEMA", y, "Helvetica-Bold", 10.5, AMBAR)
    y -= mm(3)
    y = centrado(c, "Credenciales de prueba", y, "Helvetica-Bold", 20, AZUL)
    y -= mm(3)
    y = centrado(
        c,
        f"El usuario es el DNI. La contraseña es {PASSWORD} en todos los casos.",
        y, "Helvetica", 10, GRIS,
    )
    y -= mm(8)

    y = bloque(c, y, "Alumno", [
        ("Estudiante 1", "44601165"),
        ("Estudiante 2", "44850306"),
    ])

    docentes = [(f"{materia}  ·  {anio}.º año", dni) for materia, dni, anio in credenciales_docentes()]
    y = bloque(c, y, "Docente", docentes)

    y = bloque(c, y, "Departamento", [
        ("Facultad de Ingeniería", "2001"),
    ])

    c.setFillColor(GRIS)
    c.setFont("Helvetica-Oblique", 8.5)
    c.drawCentredString(
        ANCHO / 2, MARGEN,
        "Datos de demostración. Las respuestas cargadas se reinician entre visitas.",
    )


def main() -> None:
    os.makedirs(AQUI, exist_ok=True)

    # --- Sistema: QR + credenciales ---
    ruta = AQUI / "sistema.pdf"
    c = canvas.Canvas(str(ruta), pagesize=A4)
    c.setTitle("Sistema de Gestión de Retroalimentación Académica")
    hoja_qr(
        c,
        "Sistema de Gestión de Retroalimentación Académica",
        "FACULTAD DE INGENIERÍA · SEDE TRELEW",
        f"{BASE_URL}/login",
        "Escaneá el código para entrar desde tu celular",
    )
    c.showPage()
    hoja_credenciales(c)
    c.showPage()
    c.save()
    print(f"  {ruta.relative_to(RAIZ)}")

    # --- Infografia ---
    ruta = AQUI / "infografia.pdf"
    c = canvas.Canvas(str(ruta), pagesize=A4)
    c.setTitle("Circuito de Retroalimentación Académica")
    hoja_qr(
        c,
        "El circuito de retroalimentación académica",
        "DESARROLLO DE SOFTWARE · ISFPP 2025",
        f"{BASE_URL}/infografia",
        "Escaneá el código para ver de qué se trata",
    )
    c.showPage()
    c.save()
    print(f"  {ruta.relative_to(RAIZ)}")


if __name__ == "__main__":
    print(f"\nDireccion publica: {BASE_URL}\n")
    main()
    print()
