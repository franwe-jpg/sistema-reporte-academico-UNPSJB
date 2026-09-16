import { useState, useEffect } from "react";
import type { DashboardData } from "../types/Dashboard";

const API_URL = "http://localhost:8000";

// CORRECCIÓN: Ahora acepta los 3 parámetros
export function useEstadisticasDepartamento(
    ciclo: number, 
    cuatrimestre: string, 
    nivel: string
) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Construimos la URL con los parámetros dinámicos
        const params = new URLSearchParams();
        params.append("ciclo", ciclo.toString());
        
        // Solo agregamos si no es "todos"
        if (cuatrimestre && cuatrimestre !== "todos") {
            params.append("cuatrimestre", cuatrimestre);
        }
        if (nivel && nivel !== "todos") {
            params.append("nivel", nivel);
        }

        const res = await fetch(`${API_URL}/estadisticas/dashboard?${params.toString()}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "Error al cargar estadísticas");
        }
        
        const jsonData = await res.json();
        setData(jsonData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error de conexión");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ciclo, cuatrimestre, nivel]); // Se ejecuta cuando cambia cualquiera de los 3

  return { data, loading, error };
}