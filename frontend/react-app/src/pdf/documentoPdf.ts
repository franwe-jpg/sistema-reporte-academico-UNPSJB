import jsPDF from "jspdf";

/**
 * Generador de PDF para los documentos del circuito (encuestas e informes).
 *
 * Arma el PDF escribiendo texto, no capturando la pantalla: el resultado se
 * puede seleccionar y buscar, pesa poco y no depende de que la vista de detalle
 * este abierta, asi que sirve para descargar desde los listados.
 */

export type CampoPdf = { etiqueta: string; valor: string };
export type ItemPdf = { pregunta: string; respuesta: string };
export type SeccionPdf = { titulo?: string; items: ItemPdf[] };

export type DocumentoPdf = {
  titulo: string;
  subtitulo?: string;
  encabezado: CampoPdf[];
  secciones: SeccionPdf[];
  nombreArchivo: string;
};

const MARGEN = 18;
const ANCHO_A4 = 210;
const ALTO_A4 = 297;
const ANCHO_UTIL = ANCHO_A4 - MARGEN * 2;

const GRIS = 110;
const NEGRO = 33;

export function generarPdf(documento: DocumentoPdf): void {
  const pdf = new jsPDF("p", "mm", "a4");
  let y = MARGEN;

  /** Reserva espacio; si no entra, abre una hoja nueva. */
  const reservar = (alto: number) => {
    if (y + alto > ALTO_A4 - MARGEN) {
      pdf.addPage();
      y = MARGEN;
    }
  };

  const escribir = (
    texto: string,
    opciones: { size?: number; style?: "normal" | "bold"; color?: number; sangria?: number } = {}
  ) => {
    const { size = 10, style = "normal", color = NEGRO, sangria = 0 } = opciones;
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(color);

    const lineas: string[] = pdf.splitTextToSize(texto, ANCHO_UTIL - sangria);
    const altoLinea = size * 0.5;

    lineas.forEach((linea) => {
      reservar(altoLinea);
      pdf.text(linea, MARGEN + sangria, y);
      y += altoLinea;
    });
  };

  const linea = () => {
    reservar(4);
    pdf.setDrawColor(200);
    pdf.line(MARGEN, y, ANCHO_A4 - MARGEN, y);
    y += 4;
  };

  // --- Titulo ---
  escribir(documento.titulo, { size: 15, style: "bold" });
  if (documento.subtitulo) {
    y += 1;
    escribir(documento.subtitulo, { size: 10, color: GRIS });
  }
  y += 3;
  linea();

  // --- Datos de cabecera ---
  if (documento.encabezado.length > 0) {
    documento.encabezado.forEach(({ etiqueta, valor }) => {
      escribir(`${etiqueta}: ${valor}`, { size: 10 });
      y += 1;
    });
    y += 2;
    linea();
  }

  // --- Preguntas y respuestas ---
  documento.secciones.forEach((seccion) => {
    if (seccion.titulo) {
      y += 3;
      reservar(10);
      escribir(seccion.titulo, { size: 11, style: "bold" });
      y += 2;
    }

    seccion.items.forEach(({ pregunta, respuesta }) => {
      y += 2;
      // Mantiene juntas la pregunta y su respuesta cuando hay poco lugar.
      reservar(14);
      escribir(pregunta, { size: 9.5, style: "bold", color: GRIS });
      escribir(respuesta || "—", { size: 10, sangria: 4 });
    });

    y += 2;
  });

  // --- Numeracion de paginas ---
  const paginas = pdf.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(GRIS);
    pdf.text(`${i} de ${paginas}`, ANCHO_A4 - MARGEN, ALTO_A4 - 10, { align: "right" });
    pdf.text(
      "Sistema de Gestión de Retroalimentación Académica — UNPSJB",
      MARGEN,
      ALTO_A4 - 10
    );
  }

  const nombre = documento.nombreArchivo.endsWith(".pdf")
    ? documento.nombreArchivo
    : `${documento.nombreArchivo}.pdf`;
  pdf.save(nombre);
}

/** Convierte un texto en un nombre de archivo seguro. */
export function nombreArchivo(...partes: (string | number | null | undefined)[]): string {
  return partes
    .filter((p) => p !== null && p !== undefined && `${p}`.trim() !== "")
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
