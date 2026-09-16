import {
  Container,
  Row,
  Col,
  Card,
  ProgressBar,
  Tabs,
  Tab,
} from "react-bootstrap";
import { useReportes } from "../hook/useReportes";
import { useEffect, useState, useMemo } from "react"; 
import { useParams, Link } from "react-router-dom";
import {EncabezadoReporte } from "../componentes/LayoutEncabezados";
import ResumenVariable from "../componentes/ResumenVariable";
import "../styles/Resumen-reporte.css"; 

export default function ResumenReporte() {
  const { id } = useParams();
  const idReporte = Number(id);
  const { fetchResumenByReporteId, fetchReporteById, loading, error } =
    useReportes();
  const [reporte, setReporte] = useState<any>(null);
  const [reporteCompleto, setReporteCompleto] = useState<any>(null);
  const [activeVariableKey, setActiveVariableKey] = useState<string | null>(
    null
  );


  useEffect(() => {
    if (!isNaN(idReporte)) {
      const cargarResumen = async () => {
        const data = await fetchResumenByReporteId(idReporte);
        setReporte(data);
        if (data && data.resultados_por_pregunta && !activeVariableKey) {
          const firstKey = Object.keys(data.resultados_por_pregunta)[0];
          if (firstKey) {
            setActiveVariableKey(firstKey);
          }
        }
      };
      cargarResumen();
    }
  }, [idReporte, fetchResumenByReporteId, activeVariableKey]);

  useEffect(() => {
    const cargarReporte = async () => {
      const data = await fetchReporteById(idReporte);
      if (data) setReporteCompleto(data);
    };
    cargarReporte();
  }, [idReporte, fetchReporteById]);

  // --- 2. ¡CORRECCIÓN! MOVEMOS useMemo AQUÍ ---
  // Lo ponemos ANTES de los 'return' condicionales
  const tabsData = useMemo(() => {
    if (!reporte || !reporte.resultados_por_pregunta) {
      return [];
    }
    return Object.entries(reporte.resultados_por_pregunta).map(
      ([nombreVariable, variableData]: [string, any]) => ({
        key: nombreVariable,
        title: nombreVariable,
        cod: variableData.codigo,
        content: (
          <div>
            {variableData.preguntas.map((pregunta: any, j: number) => (
              <div key={j} className={j > 0 ? "pregunta-block mt-2" : "pt-2"}>
                <h6 className="fw-bold mb-3">
                  {pregunta.pregunta_texto}
                </h6>
                {pregunta.opciones.map((opcion: any, k: number) => (
                  <div key={k} className="mb-3"> 
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted">{opcion.opcion_texto}</span>
                      <span className="fw-bold small">{opcion.porcentaje}%</span>
                    </div>
                    <ProgressBar
                      now={opcion.porcentaje}
                      label={`${opcion.porcentaje}%`}
                      variant="primary" 
                      className="progress-compact"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ),
      })
    );
  }, [reporte]); 


  if (loading) return <p>Cargando resumen...</p>;
  if (error) return <p>Error: {error}</p>;
  if (
    !reporte ||
    !reporteCompleto ||
    !reporte.resultados_por_pregunta ||
    !reporte.resumen_por_variable ||
    !activeVariableKey
  ) {
    return <p>No hay datos disponibles</p>;
  }


  const activeVariableSummary = reporte.resumen_por_variable[activeVariableKey];
  const Datosasignatura = reporteCompleto.encuesta_asignatura.asignatura;

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="text-primary fw-bold m-0">Reporte generado</h2>
      </div>
      
      <EncabezadoReporte
      
        asignatura={Datosasignatura.nombre}
        anio={Datosasignatura.año}
        docente={Datosasignatura.nombre_docente}
        carrera={Datosasignatura.carrera}
        ciclo_lectivo={reporteCompleto.encuesta_asignatura.ciclo_lectivo}
        sede={Datosasignatura.sede}
      >
        <Container className="my-4">
          <Row className="g-4">
            
            
            <Col xs={12} md={8} lg={8}>
              <Card className="border rounded shadow-sm">
                <Card.Header as="h5" className="bg-primary text-white">
                  Análisis de Respuestas por Variable
                </Card.Header>
                <Card.Body className="p-4">
                  <Tabs
                    id="variable-tabs"
                    activeKey={activeVariableKey}
                    onSelect={(k) => setActiveVariableKey(k || null)}
                    className="mb-3"
                    mountOnEnter
                    unmountOnExit
                  >
                    {tabsData.map((tab) => (
                      <Tab key={tab.key} eventKey={tab.key} title={tab.cod}>
                        <div className="mb-4 text-center">
                          <h5 className="mb-0">
                            {tab.cod}: {tab.title}
                          </h5>
                        </div>
                        {tab.content}
                      </Tab>
                    ))}
                  </Tabs>
                </Card.Body>
              </Card>
            </Col>

            
            <Col xs={12} md={4} lg={4}>
                    
              <aside className="right-rail">
                <div className="right-cta mb-3">
                  {reporteCompleto?.has_respuesta ? (
                    <Link
                      to={`/docente/informes-curriculares-respondidos/${reporteCompleto.informe_id}`}
                      className="btn btn-outline-primary btn-lg w-100"
                    >
                      Ver Informe
                    </Link>
                  ) : (
                    <Link
                        to={`/docente/nuevo-informe/${reporteCompleto.id}`}
                        className="btn btn-outline-success btn-lg w-100"
                      >
                        Nuevo Informe de Act.Curricular
                    </Link>
                  )}
                </div>
                
                <Card className="border rounded shadow-sm">
                  <Card.Header as="h6" className="bg-primary text-white">
                    Métricas de la Encuesta
                  </Card.Header>
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted fw-semibold small">
                        Total inscriptos
                      </span>
                      <span className="text-dark fw-bold">
                        25
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted fw-semibold small">
                        Encuestas procesadas
                      </span>
                      <span className="text-primary fw-bold">
                        {reporteCompleto.encuesta_asignatura.respuestas.length}
                      </span>
                    </div>
                  </Card.Body>
                </Card>
                <br />
                <Card className="border rounded shadow-sm mb-3 ">
                  <Card.Header as="h6" className="bg-primary text-white">
                    Resumen de la Variable
                  </Card.Header>
                  <ResumenVariable resumen={activeVariableSummary} />
                </Card>
              </aside>
            </Col>
          </Row>
        </Container>
      </EncabezadoReporte>
    </Container>
  );
}