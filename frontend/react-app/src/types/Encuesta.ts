import type {Carrera} from "./models/Carrera";
export interface OpcionRespuesta {
  id: number;
  texto_opcion: string;
}

export interface PreguntaOpcion {
  id: number; 
  id_pregunta: number;
  id_opcion_respuesta?: number;
  opcion_respuesta?: OpcionRespuesta;
}

export interface Pregunta {
  id: number;
  texto_pregunta: string;
  tipo: 'single_choice' | 'multiple_choice' | 'open';
  obligatoria: Boolean;
  pregunta_opcion: PreguntaOpcion[];
}

export interface Variable {
  id: number;
  nombre: string;
  codigo: string;
  preguntas: Pregunta[];
}

export interface EncuestaBase {
  id: number;
  nombre: string;
  variables: Variable[];
}

export interface Asignatura {
  id: number;
  nombre: string;
  año: number; 
  nombre_docente: string; // ✅ Correcto
  cursado: string;
  carrera: Carrera;
  sede: string;
}

export interface EncuestaAsignatura {
  id: number;
  id_encuesta_base: number;
  id_asignatura: number;
  fecha_inicio: string; 
  fecha_fin: string; 
  ciclo_lectivo: number;    // ✅ Correcto
  estado: "abierta" | "cerrada"; 
  asignatura: Asignatura; 
  
  // --- ¡FALTABA ESTO! ---
  // Es vital para que los filtros de Pendientes/Respondidas funcionen
  respondida: boolean; 
}

// --- Tipos para enviar respuestas (Payloads) ---

export interface DetalleRespuestaCreate {
  id_pregunta_opcion: number;
  texto_respuesta_abierta?: string;
}

export interface RespuestaCreate {
  id_persona: number;
  id_encuesta_asignatura: number;
  detalles: DetalleRespuestaCreate[];
}