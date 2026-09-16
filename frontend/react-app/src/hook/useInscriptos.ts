import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type CursadaLigera = { asignatura?: { id: number } | null };

/**
 * Cantidad de personas inscriptas a una asignatura, contada sobre las cursadas
 * registradas. Reemplaza los valores fijos que antes se mostraban en el reporte
 * y en las estadisticas del docente.
 *
 * Devuelve null mientras carga o si la consulta falla, para que la vista pueda
 * mostrar un guion en lugar de un numero inventado.
 */
export function useInscriptos(idAsignatura?: number | null): number | null {
  const [inscriptos, setInscriptos] = useState<number | null>(null);

  useEffect(() => {
    if (!idAsignatura) {
      setInscriptos(null);
      return;
    }

    let cancelado = false;

    const contar = async () => {
      try {
        const res = await apiFetch("/cursadas/");
        if (!res.ok) throw new Error("No se pudieron leer las cursadas");
        const cursadas: CursadaLigera[] = await res.json();
        const total = cursadas.filter((c) => c.asignatura?.id === idAsignatura).length;
        if (!cancelado) setInscriptos(total);
      } catch {
        if (!cancelado) setInscriptos(null);
      }
    };

    contar();
    return () => {
      cancelado = true;
    };
  }, [idAsignatura]);

  return inscriptos;
}
