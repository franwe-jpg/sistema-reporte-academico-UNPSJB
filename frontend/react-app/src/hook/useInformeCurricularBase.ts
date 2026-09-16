import { useCallback } from "react";
import { apiFetch } from "../api/client";

export function useInformeCurricularBase() {
  const fetchInformeBaseActual = useCallback(async () => {
    const res = await apiFetch("/informes-curriculares-base/actual");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.detail || "No se pudo obtener el informe base actual"
      );
    }
    return await res.json();
  }, []);

  return { fetchInformeBaseActual };
}
