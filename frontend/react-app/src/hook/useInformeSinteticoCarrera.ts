import { useState, useEffect } from "react";
import type { InformeSinteticoCarrera } from "../types/InformeSintetico";
import { apiFetch } from "../api/client";

export const useInformeSinteticoCarrera = (id: number | null) => {
  const [informe, setInforme] = useState<InformeSinteticoCarrera | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchInforme = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch(`/informe-sintetico-carrera/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Informe no encontrado");
          }
          throw new Error(`Error en la API: ${response.statusText}`);
        }

        const data: InformeSinteticoCarrera = await response.json();
        setInforme(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchInforme();
  }, [id]);

  return { informe, loading, error };
};
