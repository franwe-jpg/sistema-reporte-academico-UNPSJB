import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../api/client"; // 👈 usamos tu helper

export interface InformeSinteticoCarreraPayload {
  ciclo_lectivo: string;
  comision_asesora: string;
  sede: string;
  integrantes: string;
  id_carrera: number;
  id_informe_sintetico_base: number;
  estado: "abierto" | "cerrado";
  informes_asignaturas: number[];
  cursado: string;
}

// Interfaz para el objeto resumen que usará la vista
export interface ResumenSinteticoItem {
  uniqueKey: string; // para key de react
  carrera: any;
  ciclo: number;
  cuatrimestre: string; // "1° cuatrimestre" | "2° cuatrimestre"
  totalInformes: number;
  publicados: number;
  sinteticoId: number | null;
  estadoGeneral: 'pendiente' | 'creado'; // Para facilitar el filtro
}

// Eliminamos los argumentos obligatorios para traer TODO si se desea
export function useInformesSinteticos() {
  const [resumenes, setResumenes] = useState<ResumenSinteticoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resCarreras, resCurriculares, resSinteticos] = await Promise.all([
            apiFetch("/carreras"),
            apiFetch("/informes-asignaturas"),
            apiFetch("/informe-sintetico-carrera"),
        ]);

        if (!resCarreras.ok || !resCurriculares.ok || !resSinteticos.ok) {
          throw new Error("Error al cargar datos");
        }

        const carreras = await resCarreras.json();
        const curriculares = await resCurriculares.json();
        const sinteticos = await resSinteticos.json();

        // 1. Identificar todas las combinaciones únicas de Carrera + Ciclo + Cuatrimestre
        //    basadas en los informes curriculares existentes.
        const combinaciones = new Map<string, { carreraId: number, ciclo: number, cuatrimestreStr: string }>();

        curriculares.forEach((inf: any) => {
            if(!inf.asignatura?.carrera?.id) return;
            
            const cursado = inf.asignatura.cursado;
            const cuatrimestreStr = 
                cursado === "cuatrimestre 1" ? "1° cuatrimestre" :
                cursado === "cuatrimestre 2" ? "2° cuatrimestre" :
                cursado === "anual" ? "2° cuatrimestre" : null; // Asumimos anual en el 2do

            if(cuatrimestreStr) {
                const key = `${inf.asignatura.carrera.id}-${inf.ciclo_lectivo}-${cuatrimestreStr}`;
                if (!combinaciones.has(key)) {
                    combinaciones.set(key, {
                        carreraId: inf.asignatura.carrera.id,
                        ciclo: Number(inf.ciclo_lectivo),
                        cuatrimestreStr
                    });
                }
            }
        });

        // 2. Construir el resumen para cada combinación encontrada
        const listaResumenes: ResumenSinteticoItem[] = [];

        combinaciones.forEach((combo, key) => {
            const carrera = carreras.find((c: any) => c.id === combo.carreraId);
            if (!carrera) return;

            // Filtrar curriculares para este combo
            const informesPorCarrera = curriculares.filter((informe: any) => {
                const cursado = informe.asignatura?.cursado;
                const etiqueta = 
                    cursado === "cuatrimestre 1" ? "1° cuatrimestre" :
                    cursado === "cuatrimestre 2" ? "2° cuatrimestre" :
                    cursado === "anual" ? "2° cuatrimestre" : null;
                
                return (
                    informe.asignatura?.carrera?.id === combo.carreraId &&
                    Number(informe.ciclo_lectivo) === combo.ciclo &&
                    etiqueta === combo.cuatrimestreStr
                );
            });

            const publicados = informesPorCarrera.filter((i: any) => i.estado === "cerrado");

            // Buscar si ya existe sintético
            const sintetico = sinteticos.find((s: any) => {
                // Mismo criterio de búsqueda que tenías, pero adaptado
                const primerHijo = s.informes_asignaturas?.[0];
                const cursadoSint = primerHijo?.asignatura?.cursado;
                const etiquetaSint = 
                    cursadoSint === "cuatrimestre 1" ? "1° cuatrimestre" :
                    cursadoSint === "cuatrimestre 2" ? "2° cuatrimestre" :
                    cursadoSint === "anual" ? "2° cuatrimestre" : null;

                return (
                    Number(s.carrera?.id) === Number(combo.carreraId) &&
                    Number(s.ciclo_lectivo) === Number(combo.ciclo) &&
                    etiquetaSint === combo.cuatrimestreStr &&
                    s.respuesta !== null
                );
            });

            listaResumenes.push({
                uniqueKey: key,
                carrera,
                ciclo: combo.ciclo,
                cuatrimestre: combo.cuatrimestreStr,
                totalInformes: informesPorCarrera.length,
                publicados: publicados.length,
                sinteticoId: sintetico?.id ?? null,
                estadoGeneral: sintetico?.id ? 'creado' : 'pendiente'
            });
        });

        // Ordenar por defecto (más reciente primero)
        listaResumenes.sort((a, b) => b.ciclo - a.ciclo);

        setResumenes(listaResumenes);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const crearInformeSinteticoCarrera = useCallback(
    async (payload: InformeSinteticoCarreraPayload) => {
      const res = await apiFetch("/informe-sintetico-carrera/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al crear informe");
      }
      return await res.json();
    },
    []
  );

  return { 
    resumenes, 
    loading, 
    error,
    crearInformeSinteticoCarrera 
  };
}




/*
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../api/client"; // 👈 usamos tu helper

export interface InformeSinteticoCarreraPayload {
  ciclo_lectivo: string;
  comision_asesora: string;
  sede: string;
  integrantes: string;
  id_carrera: number;
  id_informe_sintetico_base: number;
  estado: "abierto" | "cerrado";
  informes_asignaturas: number[]; // IDs de informes curriculares
  cursado: string; // Cuatrimestre
}

export function useInformesSinteticos(
  cicloLectivo: number,
  cuatrimestre: string
) {
  const [resumenes, setResumenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [resCarreras, resCurriculares, resSinteticos] = await Promise.all(
          [
            apiFetch("/carreras"),
            apiFetch("/informes-asignaturas"),
            apiFetch("/informe-sintetico-carrera"),
          ]
        );

        if (!resCarreras.ok || !resCurriculares.ok || !resSinteticos.ok) {
          throw new Error("Error al cargar datos");
        }

        const carreras = await resCarreras.json();
        const curriculares = await resCurriculares.json();
        const sinteticos = await resSinteticos.json();

        const resumenesCalculados = carreras.map((carrera: any) => {
          const informesPorCarrera = curriculares.filter((informe: any) => {
            const cursado = informe.asignatura?.cursado;
            const etiquetaCuatrimestre =
              cursado === "cuatrimestre 1"
                ? "1° cuatrimestre"
                : cursado === "cuatrimestre 2"
                ? "2° cuatrimestre"
                : cursado === "anual"
                ? "2° cuatrimestre"
                : null;

            console.log("Cursado:", cursado, "→", etiquetaCuatrimestre);

            return (
              informe.asignatura?.carrera?.id === carrera.id &&
              Number(informe.ciclo_lectivo) === Number(cicloLectivo) &&
              etiquetaCuatrimestre === cuatrimestre
            );
          });

          const publicados = informesPorCarrera.filter(
            (informe: any) => informe.estado === "cerrado"
          );

          const sintetico = sinteticos.find((s: any) => {
            const primerInformeHijo = s.informes_asignaturas?.[0];
            const cursadoSintetico = primerInformeHijo?.asignatura?.cursado;

            const etiquetaCuatrimestreSintetico =
              cursadoSintetico === "cuatrimestre 1"
                ? "1° cuatrimestre"
                : cursadoSintetico === "cuatrimestre 2"
                ? "2° cuatrimestre"
                : cursadoSintetico === "anual"
                ? "2° cuatrimestre"
                : null;

            return (
              Number(s.carrera?.id) === Number(carrera.id) &&
              Number(s.ciclo_lectivo) === Number(cicloLectivo) &&
              etiquetaCuatrimestreSintetico === cuatrimestre &&
              s.respuesta !== null
            );
          });

          return {
            carrera,
            totalInformes: informesPorCarrera.length,
            publicados: publicados.length,
            sinteticoId: sintetico?.id ?? null,
          };
        });

        setResumenes(resumenesCalculados);
      } catch (err: any) {
        setError(err?.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cicloLectivo, cuatrimestre]);

  // --- POST para crear cabecera de informe sintético de carrera ---
  const crearInformeSinteticoCarrera = useCallback(
    async (payload: InformeSinteticoCarreraPayload) => {
      const res = await apiFetch("/informe-sintetico-carrera/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("Error al crear el informe sintético:", errData || res);
        throw new Error(
          errData?.detail || "Error al crear la cabecera del informe sintético"
        );
      }

      return await res.json();
    },
    []
  );

  return {
    resumenes,
    loading,
    error,
    crearInformeSinteticoCarrera,
  };
}

*/