import type { Asignatura } from "./Asignatura";
import type { Reporte } from "./Reporte";
import type { Respuesta } from "./Respuesta";
import type { InformeBase } from "./InformeBase";

enum EstadoInformeCurricular {
  abierto = "abierto",
  cerrado = "cerrado",
}

export interface InformeCurricular {
  id: number; 
  sede: string;
  ciclo_lectivo: number;
  docente: string;
  cant_alumnos_insc: number;
  cant_comisiones_teoricas: number;
  cant_comisiones_practicas: number;
  estado: EstadoInformeCurricular;
  informe_curricular_base: InformeBase; 
  respuesta: Respuesta | null; 
  asignatura: Asignatura;
  reporte: Reporte;
}


export interface InformeCurricularPayload {
  estado: string;
  sede: string;
  ciclo_lectivo: number;
  docente: string;
  cant_alumnos_insc: number;
  cant_comisiones_teoricas: number;
  cant_comisiones_practicas: number;
  id_informe_curricular_base: number;
  id_asignatura: number;
  id_reporte: number;
}