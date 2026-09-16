import LayoutPrincipal from "../componentes/LayoutPrincipal";

const departamentoLinks = [
  { to: "/departamento/informes", label: "Informes curriculares" },
  { to: "/departamento/informes-sinteticos", label: "Informes sintéticos" },
  { to: "/departamento/estadisticas", label: "Estadísticas" },
  {
    to: "/departamento/informes-sinteticos-respondidos",
    label: "Mis Informes Enviados",
  },
];

export default function LayoutDepartamento() {
  return (
    <LayoutPrincipal links={departamentoLinks} requiredRole="departamento" />
  );
}
