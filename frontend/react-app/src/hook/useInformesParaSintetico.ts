import { useState, useEffect } from "react";
import type { InformeCurricular } from "../types/models/InformeCurricular";
import type { Carrera } from "../types/models/Carrera";
import { apiFetch } from "../api/client";

export function useInformesParaSintetico(
  carreraId: number | null,
  ciclo: number | null,
  cuatrimestre: string | null
) {
  const [informesFiltrados, setInformesFiltrados] = useState<
    InformeCurricular[]
  >([]);
  const [carrera, setCarrera] = useState<Carrera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!carreraId || !ciclo || !cuatrimestre) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const resCarrera = await apiFetch(`/carreras/${carreraId}`);
        if (!resCarrera.ok)
          throw new Error(`No se encontró la carrera (ID: ${carreraId})`);
        const dataCarrera: Carrera = await resCarrera.json();
        setCarrera(dataCarrera);

        // Traer TODOS los informes curriculares
        // Departamento debe ver la vista "solo lectura" de informes:
        const resInformes = await apiFetch(
          `/informes-asignaturas/departamento`
        );
        if (!resInformes.ok)
          throw new Error("Error al cargar los informes curriculares");
        const todosInformes: InformeCurricular[] = await resInformes.json();

        const filtrados = todosInformes.filter((informe) => {
          const cursado = informe.asignatura?.cursado; // ej: "cuatrimestre 1"
          const etiquetaCuatrimestre =
            cursado === "cuatrimestre 1"
              ? "1° cuatrimestre"
              : cursado === "cuatrimestre 2"
              ? "2° cuatrimestre"
              : cursado === "anual"
              ? "2° cuatrimestre"
              : null;

          return (
            informe.asignatura?.carrera?.id === carreraId &&
            informe.ciclo_lectivo === ciclo &&
            etiquetaCuatrimestre === cuatrimestre &&
            informe.estado === "cerrado"
          );
        });

        setInformesFiltrados(filtrados);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [carreraId, ciclo, cuatrimestre]);

  return { informesFiltrados, carrera, loading, error };
}
