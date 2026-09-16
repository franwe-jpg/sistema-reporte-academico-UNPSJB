import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

type Flags = {
  id: number;
  has_informe: boolean;
  has_respuesta: boolean;
  informe_id: number | null;
};

export function useReportes() {
  const [reportesDisponibles, setReportesDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mergeWithFlags = (full: any[], flags: Flags[]) => {
    const flagsById = new Map(flags.map((f) => [f.id, f]));
    return full.map((r) => ({
      ...r,
      ...(flagsById.get(r.id) ?? {
        has_informe: false,
        has_respuesta: false,
        informe_id: null,
      }),
    }));
  };

  const fetchReportesDisponibles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [resFull, resFlags] = await Promise.all([
        apiFetch("/reportes"),
        apiFetch("/reportes/disponibles"),
      ]);

      if (!resFull.ok) {
        throw new Error("No se pudo obtener la lista de reportes");
      }
      if (!resFlags.ok) {
        throw new Error("No se pudieron obtener los flags de reportes");
      }

      const full = await resFull.json();
      const flags = (await resFlags.json()) as Flags[];

      setReportesDisponibles(mergeWithFlags(full, flags));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido al cargar reportes");
      setReportesDisponibles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReporteById = useCallback(async (id: string | number) => {
    const rid = Number(id);

    try {
      const [resFull, resFlags] = await Promise.all([
        apiFetch(`/reportes/${rid}`),
        apiFetch("/reportes/disponibles"),
      ]);

      if (!resFull.ok) throw new Error("No se pudo obtener el reporte");
      if (!resFlags.ok) {
        throw new Error("No se pudieron obtener los flags de reportes");
      }

      const full = await resFull.json();
      const flagsList = (await resFlags.json()) as Flags[];

      const flags = flagsList.find((f) => f.id === rid) ?? {
        id: rid,
        has_informe: false,
        has_respuesta: false,
        informe_id: null,
      };

      return { ...full, ...flags };
    } catch (error) {
      console.error("Error en fetchReporteById:", error);
      throw error;
    }
  }, []);

  const fetchResumenByReporteId = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/reportes/generar/${id}`);
      if (!res.ok) {
        throw new Error("Error al obtener el resumen");
      }
      return await res.json();
    } catch (err: any) {
      setError(err.message || "Error al obtener el resumen");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResumenComparativo = useCallback(
    async (
      idReporte: string | number,
      anio: number
    ): Promise<Record<string, number> | null> => {
      const rid = Number(idReporte);

      // Retorna null si el año actual es el seleccionado (se compara contra sí mismo)
      if (anio >= new Date().getFullYear()) {
        return null;
      }

      try {
        const res = await apiFetch(`/reportes/${rid}/comparativa/${anio}`);

        if (!res.ok) {
          throw new Error(
            `Error ${res.status} al obtener resumen comparativo para ${anio}`
          );
        }

        const data = await res.json();

        // Si el backend devuelve un objeto vacío => no hay datos para ese año.
        if (Object.keys(data).length === 0) return {};

        return data;
      } catch (err) {
        console.error(`Error fetching comparative summary for ${anio}:`, err);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    fetchReportesDisponibles();
  }, [fetchReportesDisponibles]);

  return {
    reportesDisponibles,
    loading,
    error,
    refetch: fetchReportesDisponibles,
    fetchReporteById,
    fetchResumenByReporteId,
    fetchResumenComparativo,
  };
}
