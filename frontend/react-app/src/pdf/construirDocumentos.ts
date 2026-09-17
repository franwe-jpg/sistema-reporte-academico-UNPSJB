import apiFetch from "../api/client";
import type { DocumentoPdf, ItemPdf, SeccionPdf } from "./documentoPdf";
import { nombreArchivo } from "./documentoPdf";

/**
 * Arma los DocumentoPdf de cada tipo de documento del circuito a partir de lo
 * que devuelve la API, sin depender de que la vista de detalle este abierta.
 */

type Detalle = {
  texto_respuesta_abierta: string | null;
  pregunta_opcion?: {
    id_pregunta: number;
    opcion_respuesta?: { texto_opcion: string } | null;
  } | null;
};

/** Texto legible de una respuesta: la opcion elegida o lo que se escribio. */
function textoDeDetalle(detalle: Detalle): string {
  const opcion = detalle.pregunta_opcion?.opcion_respuesta?.texto_opcion;
  if (opcion) return opcion;
  return detalle.texto_respuesta_abierta?.trim() || "—";
}

/** Indexa las respuestas por id de pregunta. */
function respuestasPorPregunta(detalles: Detalle[]): Map<number, string> {
  const mapa = new Map<number, string>();
  detalles.forEach((d) => {
    const idPregunta = d.pregunta_opcion?.id_pregunta;
    if (idPregunta == null) return;
    const texto = textoDeDetalle(d);
    // Una pregunta de opcion multiple puede traer varios detalles.
    mapa.set(idPregunta, mapa.has(idPregunta) ? `${mapa.get(idPregunta)}, ${texto}` : texto);
  });
  return mapa;
}

function itemsDePlantilla(preguntas: any[], respuestas: Map<number, string>): ItemPdf[] {
  return (preguntas ?? []).map((p) => ({
    pregunta: p.texto_pregunta ?? "Pregunta",
    respuesta: respuestas.get(p.id) ?? "—",
  }));
}

// =============================================================================
// Encuesta de asignatura respondida por el alumno
// =============================================================================

export async function documentoDeEncuesta(encuesta: any): Promise<DocumentoPdf> {
  const res = await apiFetch(`/respuestas/?encuesta_asignatura_id=${encuesta.id}`);
  if (!res.ok) throw new Error("No se pudieron leer las respuestas");
  const respuestas = await res.json();
  const detalles: Detalle[] = respuestas?.[0]?.detalles ?? [];
  const porPregunta = respuestasPorPregunta(detalles);

  const secciones: SeccionPdf[] = (encuesta.encuesta_base?.variables ?? []).map(
    (variable: any) => ({
      titulo: `${variable.codigo}. ${variable.nombre}`,
      items: itemsDePlantilla(variable.preguntas, porPregunta),
    })
  );

  const asignatura = encuesta.asignatura ?? {};

  return {
    titulo: "Encuesta de Evaluación de Asignatura",
    subtitulo: encuesta.encuesta_base?.nombre,
    encabezado: [
      { etiqueta: "Asignatura", valor: asignatura.nombre ?? "—" },
      { etiqueta: "Carrera", valor: asignatura.carrera?.nombre ?? "—" },
      { etiqueta: "Docente", valor: asignatura.nombre_docente ?? "—" },
      { etiqueta: "Sede", valor: asignatura.sede ?? "—" },
      {
        etiqueta: "Ciclo lectivo",
        valor: `${encuesta.ciclo_lectivo ?? "—"} | Cursado: ${asignatura.cursado ?? "—"}`,
      },
    ],
    secciones,
    nombreArchivo: nombreArchivo("encuesta", asignatura.nombre, encuesta.ciclo_lectivo),
  };
}

// =============================================================================
// Informe de actividad curricular
// =============================================================================

export function documentoDeInformeCurricular(informe: any): DocumentoPdf {
  const detalles: Detalle[] = informe.respuesta?.detalles ?? [];
  const porPregunta = respuestasPorPregunta(detalles);
  const asignatura = informe.asignatura ?? {};

  return {
    titulo: "Informe de Actividad Curricular",
    subtitulo: informe.informe_curricular_base?.titulo,
    encabezado: [
      { etiqueta: "Asignatura", valor: asignatura.nombre ?? "—" },
      { etiqueta: "Carrera", valor: asignatura.carrera?.nombre ?? "—" },
      { etiqueta: "Docente responsable", valor: informe.docente ?? "—" },
      { etiqueta: "Sede", valor: informe.sede ?? "—" },
      {
        etiqueta: "Ciclo lectivo",
        valor: `${informe.ciclo_lectivo ?? "—"} | Cursado: ${asignatura.cursado ?? "—"}`,
      },
      { etiqueta: "Alumnos inscriptos", valor: `${informe.cant_alumnos_insc ?? "—"}` },
      {
        etiqueta: "Comisiones",
        valor: `${informe.cant_comisiones_teoricas ?? "—"} teóricas, ${informe.cant_comisiones_practicas ?? "—"} prácticas`,
      },
      { etiqueta: "Estado", valor: informe.estado ?? "—" },
    ],
    secciones: [
      { items: itemsDePlantilla(informe.informe_curricular_base?.preguntas, porPregunta) },
    ],
    nombreArchivo: nombreArchivo(
      "informe-curricular",
      asignatura.nombre,
      informe.ciclo_lectivo
    ),
  };
}

// =============================================================================
// Informe sintetico de carrera
// =============================================================================

export async function documentoDeInformeSintetico(informe: any): Promise<DocumentoPdf> {
  const detalles: Detalle[] = informe.respuesta?.detalles ?? [];
  const porPregunta = respuestasPorPregunta(detalles);

  // El endpoint del informe sintetico devuelve la plantilla sin sus preguntas
  // (solo el titulo), asi que hay que pedirla aparte para poder imprimirlas.
  let preguntasPlantilla = informe.informe_sintetico_base?.preguntas;
  if (!preguntasPlantilla?.length) {
    const idBase = informe.id_informe_sintetico_base;
    const res = await apiFetch(
      idBase ? `/informes-sinteticos-base/${idBase}` : "/informes-sinteticos-base/actual"
    );
    if (res.ok) preguntasPlantilla = (await res.json())?.preguntas ?? [];
  }

  const asignaturasIncluidas: string[] = (informe.informes_asignaturas ?? [])
    .map((i: any) => i.asignatura?.nombre)
    .filter(Boolean);

  const secciones: SeccionPdf[] = [
    { items: itemsDePlantilla(preguntasPlantilla, porPregunta) },
  ];

  if (asignaturasIncluidas.length > 0) {
    secciones.push({
      titulo: "Actividades curriculares incluidas",
      items: asignaturasIncluidas.map((nombre, i) => ({
        pregunta: `${i + 1}.`,
        respuesta: nombre,
      })),
    });
  }

  return {
    titulo: "Informe Sintético de Carrera",
    subtitulo: informe.informe_sintetico_base?.titulo,
    encabezado: [
      { etiqueta: "Carrera", valor: informe.carrera?.nombre ?? "—" },
      { etiqueta: "Comisión asesora", valor: informe.comision_asesora ?? "—" },
      { etiqueta: "Integrantes", valor: informe.integrantes ?? "—" },
      { etiqueta: "Sede", valor: informe.sede ?? "—" },
      { etiqueta: "Ciclo lectivo", valor: `${informe.ciclo_lectivo ?? "—"}` },
      { etiqueta: "Estado", valor: informe.estado ?? "—" },
    ],
    secciones,
    nombreArchivo: nombreArchivo(
      "informe-sintetico",
      informe.carrera?.nombre,
      informe.ciclo_lectivo
    ),
  };
}
