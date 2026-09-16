import { useCallback } from "react";
import { apiFetch } from "../api/client";

export function useInformeSinteticoBase() {
  const fetchInformeSinteticoBaseActual = useCallback(async () => {
    const res = await apiFetch("/informes-sinteticos-base/actual");
    if (!res.ok) {
      throw new Error("No se pudo obtener el informe base actual");
    }
    return await res.json();
  }, []);

  return { fetchInformeSinteticoBaseActual };
}
