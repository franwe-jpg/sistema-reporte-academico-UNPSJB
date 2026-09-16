// En: frontend/react-app/src/config/academicCalendar.ts

/**
 * ¡IMPORTANTE! Los meses en JavaScript se cuentan desde 0:
 * Enero = 0, Febrero = 1, Marzo = 2, Abril = 3, Mayo = 4, Junio = 5,
 * Julio = 6, Agosto = 7, Septiembre = 8, Octubre = 9, Noviembre = 10, Diciembre = 11
 */

// --- 1. VENTANAS PARA RESPONDER ENCUESTAS (ALUMNOS) 
//Período C1
export const ENCUESTA_C1_START = new Date(2025, 5, 23); 
export const ENCUESTA_C1_END = new Date(2025, 11, 12);   // lo formal es 2025-06-31
// Período C2/Anual
export const ENCUESTA_C2_START = new Date(2025, 10, 10);  
export const ENCUESTA_C2_END = new Date(2025, 11, 12);  

// --- 2. VENTANAS PARA GENERAR INFORMES CURRICULARES (DOCENTES) ---
// Período C1 
export const IC_C1_START = new Date(2025, 7, 1);
export const IC_C1_END = new Date(2025, 11, 12); // solo seria un mes
// Período C2/Anual 
export const IC_C2_START = new Date(2025, 11, 13); 
export const IC_C2_END = new Date(2026, 0, 12); 

// --- 3. VENTANAS PARA GENERAR INFORMES SINTÉTICOS (DEPARTAMENTO) ---

// Período C1
export const IS_C1_START = new Date(2025, 8, 1); 
export const IS_C1_END = new Date(2025, 11, 12);  //solo seria un mes
// Período C2/Anual 
export const IS_C2_START = new Date(2026, 0, 13);   
export const IS_C2_END = new Date(2026, 1, 16);  


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
  return new Date(); //fecha actual
  
  // Opción B: Fecha Fija para Pruebas (descomenta la que necesites)
  //return new Date(2024, 7, 15); // Simula Agosto 2026 (Permite IC C1)
  // return new Date(2025, 11, 15); // Simula Diciembre 2025 (Permite IC C2 e IS C1)
  // return new Date(2025, 4, 15); // Simula Mayo 2025 (No permite nada)
}