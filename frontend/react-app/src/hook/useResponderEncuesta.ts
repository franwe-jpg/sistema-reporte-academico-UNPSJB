import { useState, useEffect } from "react";
import type {
  EncuestaBase,
  Asignatura,
  EncuestaAsignatura,
  RespuestaCreate,
  DetalleRespuestaCreate,
} from "../types/Encuesta";

import { obtenerNombreCampo } from "../validaciones/Encuesta";
import { apiFetch } from "../api/client";

export function useResponderEncuesta(idEncuestaAsignatura: number | null) {
  const [encuesta, setEncuesta] = useState<EncuestaBase | null>(null);
  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // 1️⃣ Cargar ENCUESTA COMPLETA (detalle + base)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!idEncuestaAsignatura) {
      setLoading(false);
      return;
    }

    const fetchEncuestaCompleta = async () => {
      setLoading(true);
      setError(null);
      setEncuesta(null);
      setAsignatura(null);

      try {
        // *** USAMOS apiFetch ***
        const resAsignatura = await apiFetch(
          `/encuestas-asignaturas/${idEncuestaAsignatura}`
        );
        if (!resAsignatura.ok)
          throw new Error(
            `Error al cargar la asignatura (ID: ${idEncuestaAsignatura})`
          );

        const dataAsignatura: EncuestaAsignatura = await resAsignatura.json();
        setAsignatura(dataAsignatura.asignatura);

        const idEncuestaBase = dataAsignatura.id_encuesta_base;

        // *** USAMOS apiFetch ***
        const resEncuesta = await apiFetch(`/encuestas-base/${idEncuestaBase}`);
        if (!resEncuesta.ok)
          throw new Error(
            `Error al cargar la encuesta base (ID: ${idEncuestaBase})`
          );

        const dataEncuesta: EncuestaBase = await resEncuesta.json();
        setEncuesta(dataEncuesta);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEncuestaCompleta();
  }, [idEncuestaAsignatura]);

  // ─────────────────────────────────────────────
  // 2️⃣ GUARDAR RESPUESTAS (POST /respuestas)
  // ─────────────────────────────────────────────
  const guardarRespuestas = async (
    idPersona: number,
    formData: Record<string, any>
  ) => {
    if (!encuesta || !idEncuestaAsignatura) {
      setError(
        "No se puede guardar: la encuesta o la asignatura no están cargadas."
      );
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const detalles: DetalleRespuestaCreate[] = [];

      encuesta.variables.forEach((variable) => {
        variable.preguntas.forEach((pregunta) => {
          const fieldName = obtenerNombreCampo(pregunta.id);
          const valorRespuesta = formData[fieldName];

          if (
            valorRespuesta === undefined ||
            valorRespuesta === null ||
            valorRespuesta === ""
          )
            return;

          if (pregunta.tipo === "open") {
            const po = pregunta.pregunta_opcion.find(
              (p) => p.id_opcion_respuesta === null
            );
            if (po) {
              detalles.push({
                id_pregunta_opcion: po.id,
                texto_respuesta_abierta: valorRespuesta as string,
              });
            }
          } else if (pregunta.tipo === "single_choice") {
            const po = pregunta.pregunta_opcion.find(
              (p) => p.id_opcion_respuesta === valorRespuesta
            );
            if (po) detalles.push({ id_pregunta_opcion: po.id });
          } else if (pregunta.tipo === "multiple_choice") {
            (valorRespuesta as number[]).forEach((idOpcion) => {
              const po = pregunta.pregunta_opcion.find(
                (p) => p.id_opcion_respuesta === idOpcion
              );
              if (po) detalles.push({ id_pregunta_opcion: po.id });
            });
          }
        });
      });

      const payload: RespuestaCreate = {
        id_persona: idPersona,
        id_encuesta_asignatura: idEncuestaAsignatura,
        detalles: detalles,
      };

      const response = await apiFetch("/respuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error al guardar las respuestas");
      }

      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    encuesta,
    asignatura,
    loading,
    error,
    guardarRespuestas,
  };
}
