import { useState, useMemo } from "react";
import { useReportes } from "../hook/useReportes";
import { Link } from "react-router-dom";
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  ListGroup, 
  Spinner, 
  Alert,
  Form,          
  Button         
} from "react-bootstrap";
import { isGeneracionInformeCurricularActiva, getToday, getRangoFechasInformeCurricular } from "../calendarioAcademico";

export default function ReportesDisponibles() {
  const { reportesDisponibles, loading, error } = useReportes();
  const today = getToday();
  const currentYear = today.getFullYear();

  //ESTADOS DE FILTROS
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterAnio, setFilterAnio] = useState("all");
  const [filterCuatri, setFilterCuatri] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all"); 
  const [sortOrder, setSortOrder] = useState("desc");

  // DATOS PARA SELECTS 
  const carrerasDisponibles = useMemo(() => {
    const map = new Map();
    reportesDisponibles.forEach(r => {
      const nombre = r.encuesta_asignatura.asignatura?.carrera?.nombre;
      const id = r.encuesta_asignatura.asignatura?.carrera?.id;
      if (id && nombre) map.set(id.toString(), nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [reportesDisponibles]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set(reportesDisponibles.map(r => r.encuesta_asignatura.ciclo_lectivo));
    return Array.from(years).sort((a, b) => b - a);
  }, [reportesDisponibles]);

  //FILTRADO Y ORDENAMIENTO
  const reportesFiltrados = useMemo(() => {
    let result = [...reportesDisponibles];

    if (filterCarrera !== "all") {
      result = result.filter(r => 
        r.encuesta_asignatura.asignatura?.carrera?.id?.toString() === filterCarrera
      );
    }
    if (filterAnio !== "all") {
      result = result.filter(r => r.encuesta_asignatura.ciclo_lectivo === Number(filterAnio));
    }
    if (filterCuatri !== "all") {
      result = result.filter(r => r.encuesta_asignatura.asignatura.cursado.includes(filterCuatri));
    }
    if (filterEstado !== "all") {
      result = result.filter(r => 
        filterEstado === "respondido" ? r.has_respuesta : !r.has_respuesta
      );
    }

    result.sort((a, b) => {
      const cicloA = a.encuesta_asignatura.ciclo_lectivo;
      const cicloB = b.encuesta_asignatura.ciclo_lectivo;
      if (cicloA !== cicloB) return sortOrder === "desc" ? cicloB - cicloA : cicloA - cicloB;

      const cuatriA = a.encuesta_asignatura.asignatura.cursado;
      const cuatriB = b.encuesta_asignatura.asignatura.cursado;
      if (cuatriA !== cuatriB) {
        const orderA = cuatriA.includes("1") ? 1 : 2;
        const orderB = cuatriB.includes("1") ? 1 : 2;
        return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      }

      return a.encuesta_asignatura.asignatura.nombre.localeCompare(b.encuesta_asignatura.asignatura.nombre);
    });

    return result;
  }, [reportesDisponibles, filterCarrera, filterAnio, filterCuatri, filterEstado, sortOrder]);

  if (loading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Cargando reportes...</p>
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="my-4">
        <Row>
          <Col md={10} lg={8} className="mx-auto">
            <Alert variant="danger">Error: {error}</Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Row>
        <Col md={10} lg={8} className="mx-auto">
          <Card className="border rounded shadow-sm ">
            
            {/* HEADER  */}
            <Card.Header className="bg-primary text-white text-center py-3">
              <h5 className="mb-0 fw-normal">Reportes Generados</h5>
            </Card.Header>

            {/* BARRA DE FILTROS */}
            <div className="bg-light border-bottom px-3 py-2">
              <div className="d-flex align-items-center flex-nowrap gap-2">

                <span className="text-muted fw-bold small text-nowrap me-1">Filtrar:</span>

                <div className="d-flex flex-grow-1 align-items-center gap-2 flex-nowrap overflow-auto">
                    <div style={{ minWidth: '200px', maxWidth: '300px', flexGrow: 1 }}>
                        <Form.Select size="sm" className="border-secondary-subtle" value={filterCarrera} onChange={e => setFilterCarrera(e.target.value)}>
                            <option value="all">Todas las Carreras</option>
                            {carrerasDisponibles.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </Form.Select>
                    </div>

                    <div style={{ width: '100px' }}>
                        <Form.Select size="sm" value={filterAnio} onChange={e => setFilterAnio(e.target.value)}>
                            <option value="all">Año (Todos)</option>
                            {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                        </Form.Select>
                    </div>

                    <div style={{ width: '130px' }}>
                        <Form.Select size="sm" value={filterCuatri} onChange={e => setFilterCuatri(e.target.value)}>
                            <option value="all">Cuatri (Todos)</option>
                            <option value="1">1° Cuat.</option>
                            <option value="2">2° Cuat.</option>
                        </Form.Select>
                    </div>

                    <div style={{ width: '140px' }}>
                        <Form.Select size="sm" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                            <option value="all">Estado (Todos)</option>
                            <option value="respondido">Respondidos</option>
                            <option value="pendiente">Pendientes</option>
                        </Form.Select>
                    </div>
                </div>

                <div className="d-flex align-items-center ms-auto ps-3 border-start">
                      <Button
                        variant="link"
                        size="sm"
                        className="text-decoration-none text-secondary p-0 fw-bold small text-nowrap d-flex align-items-center gap-1"
                        onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                      >
                        {sortOrder === "desc" ? (
                          <>
                            Más recientes
                            <i className="bi bi-arrow-down"></i>
                          </>
                        ) : (
                          <>
                            Más antiguos
                            <i className="bi bi-arrow-up"></i>
                          </>
                        )}
                      </Button>
                </div>
              </div>
            </div>

            {/* LISTADO  */}
            <ListGroup variant="flush">
              {reportesFiltrados.length === 0 ? (
                <ListGroup.Item>
                  <p className="text-muted mb-0">No hay reportes disponibles para tus materias.</p>
                </ListGroup.Item>
              ) : (
                reportesFiltrados.map((reporte) => {
                  const asignatura = reporte.encuesta_asignatura.asignatura;
                  const cicloLectivo = reporte.encuesta_asignatura.ciclo_lectivo;
                  
                  const puedeGenerar = ((cicloLectivo === currentYear) || (cicloLectivo === currentYear + 1)) && isGeneracionInformeCurricularActiva(asignatura.cursado, today);
                  const fechaCierre = getRangoFechasInformeCurricular(asignatura.cursado);
                  
                  return (
                    <ListGroup.Item 
                      key={reporte.id}
                      className="d-flex align-items-start"
                    >
                      <div className="me-3 flex-grow-1 text-start"> 
                        <span className="fw-bold fs-5">{asignatura.nombre}</span>
                        
                        {!reporte.has_respuesta && puedeGenerar && (
                          <span className="text-danger fw-bold ms-3">
                            Cierre: {fechaCierre}
                          </span>
                        )}
                        
                        <br/>
                        <small className="d-block m-1">
                          <strong>Docente: </strong> {asignatura.nombre_docente}
                        </small>
                        <small className="d-block m-1">
                          <strong>Ciclo lectivo: </strong>{`${reporte.encuesta_asignatura.ciclo_lectivo} | Cursado: ${asignatura.cursado}` }
                        </small>
                        <small className="d-block m-1">
                          <strong>Carrera: </strong>{`${asignatura?.carrera?.nombre} ` }
                        </small>
                      </div>

                      <div className="d-flex flex-column gap-3" style={{ minWidth: '130px' }}>
                        <Link
                          to={`/docente/reportes/${reporte.id}`}
                          className="btn btn-secondary btn-sm"
                          title="Ver Reporte"
                        >
                          <i className="bi bi-bar-chart-line-fill"></i>
                          <span className="ms-2 d-none d-md-inline">Ver Reporte</span>
                        </Link>

                        {reporte.has_respuesta ? (
                          <Link
                            to={`/docente/informes-curriculares-respondidos/${reporte.informe_id}`}
                            className="btn btn-outline-primary btn-sm"
                            title="Ver Informe"
                          >
                            <i className="bi bi-file-earmark-text-fill"></i>
                            <span className="ms-2 d-none d-md-inline">Ver Informe</span>
                          </Link>
                        ) : puedeGenerar ? (
                          <Link
                            to={`/docente/nuevo-informe/${reporte.id}`}
                            className="btn btn-primary btn-sm"
                            title="Nuevo Informe"
                          >
                            <i className="bi bi-plus-circle-fill"></i>
                            <span className="ms-2 d-none d-md-inline">Nuevo Informe</span>
                          </Link>
                        ) : (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled
                            title="El período para generar este informe ha finalizado."
                            style={{ cursor: 'not-allowed' }}
                          >
                            <i className="bi bi-x-circle-fill"></i>
                            <span className="ms-2 d-none d-md-inline">Fuera de término</span>
                          </button>
                        )}
                        
                        <Link
                          to={`/docente/estadisticas/${reporte.id}`}
                          className="btn btn-outline-success btn-sm"
                          title="Ver Estadísticas"
                        >
                          <i className="bi bi-graph-up-arrow"></i>
                          <span className="ms-2 d-none d-md-inline">Ver Estadísticas</span>
                        </Link>
                      </div>
                    </ListGroup.Item>
                  );
                })
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}