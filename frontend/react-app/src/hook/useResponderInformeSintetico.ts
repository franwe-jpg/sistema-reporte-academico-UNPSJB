import { useState, useCallback } from "react";
import { apiFetch } from "../api/client";

// Este hook maneja el ESTADO de las respuestas (los textareas)
// y la lógica de GUARDAR esas respuestas.
export function useResponderInformeSintetico() {
  const [answersByPreguntaOpcion, setAnswersByPreguntaOpcion] = useState<
    Record<number, string>
  >({});

  const setTextoRespuesta = useCallback(
    (id_pregunta_opcion: number, texto: string) => {
      setAnswersByPreguntaOpcion((prev) => ({
        ...prev,
        [id_pregunta_opcion]: texto,
      }));
    },
    []
  );

  const guardarRespuestaSintetico = useCallback(
    async (idPersona: number, idInformeSinteticoCarrera: number) => {
      const detalles = Object.entries(answersByPreguntaOpcion).map(
        ([id_pregunta_opcion_str, texto_respuesta_abierta]) => ({
          id_pregunta_opcion: Number(id_pregunta_opcion_str),
          texto_respuesta_abierta,
        })
      );

      const payload = {
        id_persona: idPersona,
        id_informe_sintetico_carrera: idInformeSinteticoCarrera,
        detalles,
      };

      const res = await apiFetch("/respuestas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        return {
          ok: false,
          conflict: true,
          detail: j.detail || "El informe sintético ya tiene una respuesta.",
        };
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.detail ||
            "No se pudieron guardar las respuestas del informe sintético"
        );
      }

      const data = await res.json();
      return { ok: true, conflict: false, data };
    },
    [answersByPreguntaOpcion]
  );

  return {
    answersByPreguntaOpcion,
    setTextoRespuesta,
    guardarRespuestaSintetico,
  };
}
