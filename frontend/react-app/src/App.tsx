import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import LayoutHome from "./componentes/LayoutHome.tsx";
import LayoutAlumno from "./componentes/LayoutAlumno.tsx";
import LayoutDocente from "./componentes/LayoutDocente.tsx";
import LayoutDepartamento from "./componentes/LayoutDepartamento.tsx";
import EncuestasPendientes from "./paginas/EncuestasPendientes.tsx";
import Encuesta from "./paginas/ResponderEncuesta.tsx";
import Reporte from "./paginas/Reporte.tsx";
import InformesCurricularesDisponibles from "./paginas/InformesCurricularesDisponibles.tsx";
import InformeCurricular from "./paginas/InformeCurricular.tsx";
import ReportesDisponibles from "./paginas/ReportesDisponibles.tsx";
import EncuestasRespondidas from "./paginas/EncuestasRespondidas.tsx";
import InformesSinteticosDisponibles from "./paginas/InformesSinteticosDisponibles.tsx";
import InformeSintetico from "./paginas/InformeSintetico.tsx";
import VerInformeCurricular from "./paginas/VerInformeCurricularRespondido.tsx";
import EstadisticasDepartamentoPage from "./paginas/EstadisticasDepartamentoPage.tsx";
import GenerarInformeSintetico from "./paginas/GenerarInformeSintetico.tsx";
import VerEncuesta from "./paginas/VerEncuestaRespondida.tsx";
import InformesCurricularesRespondidos from "./paginas/InformesCurricularesRespondidos.tsx";
import VerInformeCurricularRespondido from "./paginas/VerInformeCurricularRespondido.tsx";
import InformesSinteticosRespondidos from "./paginas/InformesSinteticosRespondidos.tsx";
import VerInformeSinteticoRespondido from "./paginas/VerInformeSinteticoRespondido.tsx";
import EstadisticasDocentePage from "./paginas/EstadisticasDocentePage.tsx";
import LoginPage from "./paginas/LoginPage.tsx";

function App() {
  return (
    <Routes>
      {/* 👉 RUTA DE LOGIN */}
      <Route path="/login" element={<LoginPage />} />

      {/* 👉 HOME */}
      <Route path="/" element={<LayoutHome />}></Route>

      {/* 👉 ALUMNO */}
      <Route path="/alumno" element={<LayoutAlumno />}>
        <Route index element={<EncuestasPendientes />} />

        <Route path="encuestas-pendientes">
          <Route path=":id" element={<Encuesta />} />
          <Route index element={<EncuestasPendientes />} />
        </Route>

        <Route path="encuestas-respondidas">
          <Route index element={<EncuestasRespondidas />} />
          <Route path=":id" element={<VerEncuesta />} />
        </Route>
      </Route>

      {/* 👉 DOCENTE */}
      <Route path="/docente" element={<LayoutDocente />}>
        <Route index element={<ReportesDisponibles />} />

        <Route path="reportes">
          <Route path=":id" element={<Reporte />} />
          <Route index element={<ReportesDisponibles />} />
        </Route>

        <Route path="nuevo-informe">
          <Route path=":reporteId" element={<InformeCurricular />} />
          <Route index element={<ReportesDisponibles />} />
        </Route>

        <Route path="informes-curriculares-respondidos">
          <Route index element={<InformesCurricularesRespondidos />} />
          <Route path=":id" element={<VerInformeCurricularRespondido />} />
        </Route>
        {/* Nueva ruta para estadísticas */}
        <Route path="estadisticas/:id" element={<EstadisticasDocentePage />} />
      </Route>

      {/* 👉 DEPARTAMENTO */}
      <Route path="/departamento" element={<LayoutDepartamento />}>
        <Route index element={<InformesSinteticosDisponibles />} />

        <Route path="informes-sinteticos-respondidos">
          <Route index element={<InformesSinteticosRespondidos />} />
          <Route path=":id" element={<VerInformeSinteticoRespondido />} />
        </Route>

        <Route
          path="generar-informe/:carreraId"
          element={<GenerarInformeSintetico />}
        />
        <Route path="informes">
          <Route index element={<InformesCurricularesDisponibles />} />
          <Route path=":id" element={<VerInformeCurricularRespondido />} />
        </Route>

        <Route
          path="informes-sinteticos"
          element={<InformesSinteticosDisponibles />}
        />

        <Route path="estadisticas" element={<EstadisticasDepartamentoPage />} />
      </Route>
    </Routes>
  );
}

export default App;
