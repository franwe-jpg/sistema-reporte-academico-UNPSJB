import { useEffect } from "react";
import { useReportes } from "../hook/useReportes";

export default function EstadisticasDocentePage() {
  const { fetchResumenByReporteId } = useReportes();

  useEffect(() => {
    const cargarResumen = async () => {
      const resumen = await fetchResumenByReporteId(1);
      console.log("Resumen del backend:", resumen);
    };
    cargarResumen();
  }, [fetchResumenByReporteId]);

  return (
    <div>
      <h2>Dashboard de Estadísticas</h2>
    </div>
  );
}
