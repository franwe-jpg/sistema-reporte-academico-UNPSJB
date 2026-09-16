import { useState, useEffect } from "react";
import type { EncuestaAsignatura } from "../types/Encuesta";
import { apiFetch } from "../api/client";

// Helper local para sacar persona_id del JWT
function getPersonaIdFromToken(): number | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    return typeof payload.persona_id === "number" ? payload.persona_id : null;
  } catch (e) {
    console.error("No se pudo decodificar el token JWT", e);
    return null;
  }
}

export function useEncuestas() {
  const [encuestasPendientes, setEncuestasPendientes] = useState<EncuestaAsignatura[]>([]);
  const [encuestasRespondidas, setEncuestasRespondidas] = useState<
    EncuestaAsignatura[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      
      // El backend ya filtra por token: Cursada + Fechas + Estado Abierto + No Respondida
      const response = await apiFetch("/encuestas-asignaturas/pendientes");
      
      if (!response.ok) {
        throw new Error("Error al obtener las encuestas pendientes");
      }

      const data = await response.json();
      setEncuestasPendientes(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error desconocido al cargar pendientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchRespondidas = async () => {
    try {
      setLoading(true);

      const personaId = getPersonaIdFromToken();
      if (personaId == null) {
        throw new Error(
          "No se pudo determinar la persona logueada a partir del token"
        );
      }

      const response = await apiFetch(
        `/encuestas-asignaturas/alumno/${personaId}`
      );
      if (!response.ok) {
        throw new Error("Error al cargar encuestas respondidas");
      }

      const data = await response.json();
      setEncuestasRespondidas(data);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
    fetchRespondidas();
  }, []);

  return {
    loading,
    error,
    encuestasPendientes,
    encuestasRespondidas,

  };
}



// import { useState, useEffect, useCallback } from "react";
// import { apiFetch } from "../api/client";
// // Importamos la interfaz centralizada
// import type { EncuestaAsignatura } from "../types/Encuesta"; 

// // Helper local para sacar persona_id del JWT
// function getPersonaIdFromToken(): number | null {
//   const token = localStorage.getItem("token");
//   if (!token) return null;

//   try {
//     const payloadBase64 = token.split(".")[1];
//     const payloadJson = atob(payloadBase64);
//     const payload = JSON.parse(payloadJson);
//     return typeof payload.persona_id === "number" ? payload.persona_id : null;
//   } catch (e) {
//     console.error("No se pudo decodificar el token JWT", e);
//     return null;
//   }
// }

// export function useEncuestas() {
//   const [encuestasPendientes, setEncuestasPendientes] = useState<EncuestaAsignatura[]>([]);
//   const [encuestasRespondidas, setEncuestasRespondidas] = useState<
//     EncuestaAsignatura[]
//   >([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchPendientes = async () => {
//     try {
//       setLoading(true);
      
//       // El backend ya filtra por token: Cursada + Fechas + Estado Abierto + No Respondida
//       const response = await apiFetch("/encuestas-asignaturas/pendientes");
      
//       if (!response.ok) {
//         throw new Error("Error al obtener las encuestas pendientes");
//       }

//       const data = await response.json();
      
//       // El pequeño hack para el ciclo lectivo sigue siendo útil aquí
//       // para asegurar que el frontend tenga el año aunque el backend no lo mande directo
//       const dataConCiclo = data.map((e: any) => ({
//         ...e,
//         ciclo_lectivo: e.ciclo_lectivo || new Date(e.fecha_inicio).getFullYear()
//       }));
//       setEncuestasPendientes(data);
//       setError(null);
//     } catch (err: any) {
//       console.error(err);
//       setError(err.message ?? "Error desconocido al cargar pendientes");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchRespondidas = async () => {
//     try {
//       setLoading(true);

//       const personaId = getPersonaIdFromToken();
//       if (personaId == null) {
//         throw new Error(
//           "No se pudo determinar la persona logueada a partir del token"
//         );
//       }
//       const response = await apiFetch(
//         `/encuestas-asignaturas/alumno/${personaId}`
//       );
//       if (!response.ok) {
//         throw new Error("Error al cargar encuestas respondidas");
//       }

//       const data = await response.json();
//       setEncuestasRespondidas(dataConCiclo);

//     } catch (err: any) {
//       console.error(err);
//       setError(err.message ?? "Error desconocido");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchPendientes();
//     fetchRespondidas();
//   }, []);

//   return {
//     loading,
//     error,
//     encuestasPendientes,
//     encuestasRespondidas,

//   };
// }