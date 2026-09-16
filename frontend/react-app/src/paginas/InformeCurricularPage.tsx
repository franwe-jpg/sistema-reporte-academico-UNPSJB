import { useParams } from "react-router-dom";
import { useInformesCurriculares } from "../hook/useInformesCurriculares";
import { useEffect, useState } from "react";
import type { InformeCurricular } from "../types/models/InformeCurricular";
// import { IC_C1_START, IC_C1_END, IC_C2_START, IC_C2_END}from "../calendarioAcademico";

export default function InformeDetallePage() {
  const { id } = useParams();
  const { fetchInformeById } = useInformesCurriculares();

  const [informe, setInforme] = useState<InformeCurricular | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  console.log("ID recibido desde URL:", id);

  if (!id) {
    setError("ID inválido en la URL.");
    setLoading(false);
    return;
  }

  fetchInformeById(Number(id))
    .then((data) => {
      console.log("Informe recibido:", data);
      setInforme(data);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Error al obtener informe:", err);
      setError("No se pudo cargar el informe.");
      setLoading(false);
    });
}, [id, fetchInformeById]);


  if (loading) return <p>Cargando informe...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!informe) return <p>No se encontró el informe solicitado.</p>;

   console.log("Informe recibido:", informe);

  return (
    <div style={{ padding: "1rem" }}>
      <h1>{informe.asignatura.nombre}</h1>
      <p><strong>Docente:</strong> {informe.docente}</p>
      <p><strong>Ciclo lectivo:</strong> {informe.ciclo_lectivo}</p>
      {/* <p><strong>Periodo:</strong> {informe.fecha_inicio} al {informe.fecha_fin}</p> */}
      <p><strong>Sede:</strong> {informe.sede}</p>
      <p><strong>Estado:</strong> {informe.estado}</p>
      <p><strong>Alumnos inscriptos:</strong> {informe.cant_alumnos_insc}</p>
      <p><strong>Comisiones teóricas:</strong> {informe.cant_comisiones_teoricas}</p>
      <p><strong>Comisiones prácticas:</strong> {informe.cant_comisiones_practicas}</p>
      <p><strong>Carrera:</strong> {informe.asignatura.carrera.nombre}</p>
      <p><strong>Año:</strong> {informe.asignatura.año}</p>
      <p><strong>Cursado:</strong> {informe.asignatura.cursado}</p>
    </div>
  );
}
