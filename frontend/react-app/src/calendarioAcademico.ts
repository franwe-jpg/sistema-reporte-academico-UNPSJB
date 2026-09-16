// En: frontend/react-app/src/config/academicCalendar.ts

/**
 * ¡IMPORTANTE! Los meses en JavaScript se cuentan desde 0:
 * Enero = 0, Febrero = 1, Marzo = 2, Abril = 3, Mayo = 4, Junio = 5,
 * Julio = 6, Agosto = 7, Septiembre = 8, Octubre = 9, Noviembre = 10, Diciembre = 11
 */

// --- 1. VENTANAS PARA RESPONDER ENCUESTAS (ALUMNOS)
// Periodo C1
export const ENCUESTA_C1_START = new Date(2026, 5, 23);   // 2026-06-23
export const ENCUESTA_C1_END = new Date(2026, 11, 12);    // 2026-12-12
// Periodo C2/Anual
export const ENCUESTA_C2_START = new Date(2026, 10, 10);  // 2026-11-10
export const ENCUESTA_C2_END = new Date(2026, 11, 12);    // 2026-12-12

// --- 2. VENTANAS PARA GENERAR INFORMES CURRICULARES (DOCENTES) ---
// Periodo C1
export const IC_C1_START = new Date(2026, 7, 1);          // 2026-08-01
export const IC_C1_END = new Date(2026, 11, 12);          // 2026-12-12
// Periodo C2/Anual
export const IC_C2_START = new Date(2026, 11, 13);        // 2026-12-13
export const IC_C2_END = new Date(2027, 0, 12);           // 2027-01-12

// --- 3. VENTANAS PARA GENERAR INFORMES SINTETICOS (DEPARTAMENTO) ---
// Periodo C1
export const IS_C1_START = new Date(2026, 8, 1);          // 2026-09-01
export const IS_C1_END = new Date(2026, 11, 12);          // 2026-12-12
// Periodo C2/Anual
export const IS_C2_START = new Date(2027, 0, 13);         // 2027-01-13
export const IS_C2_END = new Date(2027, 1, 16);           // 2027-02-16

const CUATRIMESTRE_1 = "cuatrimestre 1";
const CUATRIMESTRE_2 = "cuatrimestre 2";
const ANUAL = "anual";

/**
 * FUNCIÓN PARA DOCENTES (Informes Curriculares)
 * Verifica si se puede generar un Informe Curricular (Reporte)
 */
export function isGeneracionInformeCurricularActiva(cursado: string, today: Date): boolean {
  if (cursado === CUATRIMESTRE_1) {
    return today >= IC_C1_START && today <= IC_C1_END;
  }
  
  if (cursado === CUATRIMESTRE_2 || cursado === ANUAL) {
    return today >= IC_C2_START && today <= IC_C2_END;
  }
  return false;
}

/**
 * FUNCIÓN PARA DEPARTAMENTO (Informes Sintéticos)
 * Verifica si se puede generar un Informe Sintético
 */
export function isGeneracionInformeSinteticoActivo(cursado: string, today: Date): boolean {
  if (cursado === CUATRIMESTRE_1) {
    return today >= IS_C1_START && today <= IS_C1_END;
  }
  
  if (cursado === CUATRIMESTRE_2 || cursado === ANUAL) {
    return today >= IS_C2_START && today <= IS_C2_END;
  }
  return false;
}

/**
 * FUNCIÓN PARA ALUMNOS (Encuestas)
 * Verifica si se puede responder una Encuesta
 */
export function isRespuestaEncuestaActiva(cursado: string, today: Date): boolean {
  if (cursado === CUATRIMESTRE_1) {
    return today >= ENCUESTA_C1_START && today <= ENCUESTA_C1_END;
  }
  
  if (cursado === CUATRIMESTRE_2 || cursado === ANUAL) {
    return today >= ENCUESTA_C2_START && today <= ENCUESTA_C2_END;
  }
  return false;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

};
//Devuelve el rango de fechas formateado para ENCUESTAS 
export function getRangoFechasEncuesta(cursado: string): string {
  if (cursado === CUATRIMESTRE_1) {
    return `${formatDate(ENCUESTA_C1_END)}`;
  }
  if (cursado === CUATRIMESTRE_2 || cursado === ANUAL) {
    return `${formatDate(ENCUESTA_C2_END)}`;
  }
  return "Fechas no definidas";
}

//Devuelve el rango de fechas formateado para INFORMES CURRICULARES

export function getRangoFechasInformeCurricular(cursado: string): string {
  if (cursado === CUATRIMESTRE_1) {
    return `${formatDate(IC_C1_END)}`;
  }
  if (cursado === CUATRIMESTRE_2 || cursado === ANUAL) {
    return `${formatDate(IC_C2_END)}`;
  }
  return "Fechas no definidas";
}

 //Devuelve el rango de fechas formateado para INFORMES SINTÉTICOS

export function getRangoFechasInformeSintetico(cursado: string): string {
  if (cursado === CUATRIMESTRE_1) {
    return `${formatDate(IS_C1_END)}`;
  }
  if (cursado === CUATRIMESTRE_2 || cursado === ANUAL) {
    return `${formatDate(IS_C2_END)}`;
  }
  return "Fechas no definidas";
}

// (Opcional) Puedes añadir también una función para hardcodear la fecha de prueba
export function getToday(): Date {
  return new Date();
}
