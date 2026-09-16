import { useState, useMemo } from 'react';
import { useEncuestas } from '../hook/useEncuestas';
import { Link } from "react-router-dom";
import { 
  Container, 
  Col, 
  Row, 
  Card, 
  ListGroup, 
  Spinner, 
  Alert,
  Badge,
  Form,
  Button
} from "react-bootstrap";
import { getRangoFechasEncuesta } from "../calendarioAcademico";

export default function EncuestasPendientes() {
  // 1. Desestructuramos la nueva propiedad 'encuestasPendientes'
  const { encuestasPendientes, loading, error } = useEncuestas();

  // ==================== ESTADOS DE FILTROS ====================
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterAnio, setFilterAnio] = useState("all");
  const [filterCuatri, setFilterCuatri] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");

  // 1. Base: SOLO encuestas PENDIENTES (abiertas)
  const pendientesBase = useMemo(() => {
    return encuestasPendientes.filter((encuesta) => encuesta.estado === "abierta");
  }, [encuestasPendientes]);

  // 2. Datos para los selects
  const carrerasDisponibles = useMemo(() => {
    const map = new Map();
    pendientesBase.forEach(e => {
      const nombre = e.asignatura?.carrera?.nombre;
      const id = e.asignatura?.carrera?.id;
      if (id && nombre) map.set(id.toString(), nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [pendientesBase]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set(pendientesBase.map(e => e.ciclo_lectivo));
    return Array.from(years).sort((a, b) => b - a);
  }, [pendientesBase]);

  // 3. Filtrado y Ordenamiento
  const itemsProcesados = useMemo(() => {
    let result = [...pendientesBase];

    // Filtros
    if (filterCarrera !== "all") {
      result = result.filter(e => 
        e.asignatura?.carrera?.id?.toString() === filterCarrera
      );
    }
    if (filterAnio !== "all") {
      result = result.filter(e => e.ciclo_lectivo === Number(filterAnio));
    }
    if (filterCuatri !== "all") {
      result = result.filter(e => e.asignatura?.cursado?.includes(filterCuatri));
    }

    // Ordenamiento
    result.sort((a, b) => {
      // Ordenar por año
      if (a.ciclo_lectivo !== b.ciclo_lectivo) {
        return sortOrder === "desc" ? b.ciclo_lectivo - a.ciclo_lectivo : a.ciclo_lectivo - b.ciclo_lectivo;
      }
      
      // Ordenar por cuatrimestre
      const cuatriA = a.asignatura?.cursado || "";
      const cuatriB = b.asignatura?.cursado || "";
      if (cuatriA !== cuatriB) {
        const orderA = cuatriA.includes("1") ? 1 : 2;
        const orderB = cuatriB.includes("1") ? 1 : 2;
        return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      }

      // Ordenar por nombre asignatura
      const nombreA = a.asignatura?.nombre || "";
      const nombreB = b.asignatura?.nombre || "";
      return nombreA.localeCompare(nombreB);
    });

    return result;
  }, [pendientesBase, filterCarrera, filterAnio, filterCuatri, sortOrder]);


  if (loading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Cargando encuestas...</p>
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
          
          <Card className="border rounded shadow-sm">
            
            {/* Header Azul  */}
            <Card.Header className="bg-primary text-white text-center py-3">
              <h5 className="mb-0 fw-normal">
                Encuestas Pendientes
                <Badge bg="light" text="primary" pill className="ms-2 fs-6 align-middle"> 
                </Badge>
              </h5>
            </Card.Header>
            
            {/* BARRA DE FILTROS */}
            <div className="bg-light border-bottom px-3 py-2">
              <div className="d-flex align-items-center flex-wrap gap-2">
                
                <span className="text-muted fw-bold small text-nowrap me-1">Filtrar:</span>

                <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                    <div style={{ minWidth: '200px', maxWidth: '300px', flexGrow: 1 }}>
                        <Form.Select 
                          size="sm" 
                          className="border-secondary-subtle" 
                          value={filterCarrera} 
                          onChange={e => setFilterCarrera(e.target.value)}
                        >
                            <option value="all">Todas las Carreras</option>
                            {carrerasDisponibles.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </Form.Select>
                    </div>

                    <div style={{ width: '100px' }}>
                        <Form.Select 
                          size="sm" 
                          value={filterAnio} 
                          onChange={e => setFilterAnio(e.target.value)}
                        >
                            <option value="all">Año (Todos)</option>
                            {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                        </Form.Select>
                    </div>

                    <div style={{ width: '130px' }}>
                        <Form.Select 
                          size="sm" 
                          value={filterCuatri} 
                          onChange={e => setFilterCuatri(e.target.value)}
                        >
                            <option value="all">Cuatri (Todos)</option>
                            <option value="1">1° Cuat.</option>
                            <option value="2">2° Cuat.</option>
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
            
            <ListGroup variant="flush">
              {itemsProcesados.length === 0 ? (
                <ListGroup.Item className="text-muted text-center py-3">
                   No hay encuestas pendientes.
                </ListGroup.Item>
              ) : (
                itemsProcesados.map(encuesta => {
                   const fechaCierre = encuesta.asignatura.cursado 
                    ? getRangoFechasEncuesta(encuesta.asignatura.cursado) 
                    : "Consultar fecha";
                  return (
                    <ListGroup.Item
                      key={encuesta.id}
                      className="d-flex align-items-start"
                    > 
                      <div className="me-3 flex-grow-1 text-start">
                        <span className="fw-bold fs-5">{encuesta.asignatura?.nombre}</span>
                        
                        <span className="text-danger fw-bold ms-3" style={{ fontSize: '0.9rem' }}>
                          <i className="bi bi-clock-history me-1"></i>
                          Cierre: {fechaCierre}
                        </span>

                        <div className="text-muted small mt-1">
                          <div><strong>Docente:</strong> {encuesta.asignatura.nombre_docente}</div>
                          <div><strong>Ciclo:</strong> {encuesta.ciclo_lectivo || 2025} | <strong>Cursado:</strong> {encuesta.asignatura.cursado}</div>
                          <div><strong>Carrera:</strong> {encuesta.asignatura.carrera?.nombre || encuesta.asignatura.carrera?.nombre}</div>
                        </div>
                      </div>

                      <Link
                        to={`/alumno/encuestas-pendientes/${encuesta.id}`}
                        className="btn btn-primary btn-sm align-self-center"
                        title="Responder la encuesta"
                      >
                        <i className="bi bi-pencil-square"></i>
                        <span className="ms-2 d-none d-md-inline">Responder</span>
                      </Link>
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