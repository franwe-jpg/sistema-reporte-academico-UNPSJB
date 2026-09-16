/**
 * Textos y criterios de selección usados por el botón "Completar de ejemplo".
 *
 * Son datos de relleno para demostraciones: no representan respuestas reales de
 * ningún estudiante ni de ninguna cátedra.
 */

/** Respuesta para las preguntas abiertas de la encuesta de asignatura. */
export const TEXTO_ENCUESTA =
  "La cursada estuvo bien organizada y el equipo docente mantuvo buena " +
  "predisposición para responder consultas. Como mejora, sumaría más " +
  "horarios de consulta antes de los parciales.";

/** Respuesta para las preguntas abiertas del informe de actividad curricular. */
export const TEXTO_INFORME_CURRICULAR =
  "El dictado se desarrolló según el cronograma previsto, con una carga " +
  "práctica sostenida y asistencia estable. Los resultados de la encuesta " +
  "muestran una valoración positiva de la claridad expositiva. Como " +
  "dificultad se detectó la superposición de fechas de entrega con otras " +
  "asignaturas del mismo nivel; se propone redistribuir el cronograma y " +
  "agregar instancias de consulta previas a cada parcial.";

/** Respuesta para las preguntas abiertas del informe sintético de carrera. */
export const TEXTO_INFORME_SINTETICO =
  "Durante el período se dictaron las actividades curriculares previstas y " +
  "los equipos docentes presentaron sus informes en tiempo y forma. Se " +
  "destaca la valoración positiva del vínculo docente-estudiante. Persisten " +
  "dificultades vinculadas al equipamiento de laboratorio y a la " +
  "conectividad, que se elevan a la Secretaría Académica.";

export const COMISION_ASESORA_EJEMPLO = "Comisión Asesora de la Carrera";
export const INTEGRANTES_EJEMPLO =
  "Claudia López, Sebastián Schanz, Cristian Parise";

/** Valores administrativos del informe de actividad curricular. */
export const COMISIONES_TEORICAS_EJEMPLO = 1;
export const COMISIONES_PRACTICAS_EJEMPLO = 2;

/**
 * Orden de preferencia al elegir una opción en las preguntas cerradas.
 * Se busca una valoración positiva para que el reporte resultante se lea bien;
 * si ninguna coincide, se usa la primera opción disponible.
 */
const PREFERIDAS = [
  "4",
  "si",
  "suficientes",
  "más de 50%",
  "mas de 50%",
  "excelente",
  "muy bueno",
  "bueno",
  "3",
];

type OpcionElegible = { texto: string; valor: number };

/** Devuelve el valor de la opción más positiva disponible. */
export function elegirOpcion(opciones: OpcionElegible[]): number | null {
  if (opciones.length === 0) return null;

  for (const preferida of PREFERIDAS) {
    const encontrada = opciones.find(
      (o) => o.texto.trim().toLowerCase() === preferida
    );
    if (encontrada) return encontrada.valor;
  }

  return opciones[0].valor;
}
