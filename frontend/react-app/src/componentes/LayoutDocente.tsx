import LayoutPrincipal from "../componentes/LayoutPrincipal";

const docenteLinks = [
  { to: "/docente/reportes", label: "Listado de reportes disponibles" },
  {
    to: "/docente/informes-curriculares-respondidos",
    label: "Mis Informes Enviados",
  },
];

export default function LayoutDocente() {
  return <LayoutPrincipal links={docenteLinks} requiredRole="docente" />;
}
