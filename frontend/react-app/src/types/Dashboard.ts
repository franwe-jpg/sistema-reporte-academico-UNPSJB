export interface Indicador {
  titulo: string;
  valor: string | number;
  bg: string; 
}

export interface Dimension {
  nombre: string;
  valor: number; 
}

export interface Valoracion {
  label: string;
  valor: number;
}

export interface TopAsignatura {
  nombre: string;
  alumnos: number;
  avance: number; 
}

export interface Alerta {
  tipo: string;
  asignatura: string;
  detalle: string;
  severidad: "Alta" | "Media" | "Baja" | string; 
}

export interface DashboardData {
  indicadores: Indicador[];
  dimensiones: Dimension[];
  valoraciones: Valoracion[];
  top_asignaturas: TopAsignatura[];
  alertas: Alerta[];
  keywords: string[];
}