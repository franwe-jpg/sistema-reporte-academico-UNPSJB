import { useState, useMemo } from "react";
import { useInformesCurriculares } from "../hook/useInformesCurriculares";
import { Link } from "react-router-dom";
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  ListGroup, 
  Badge, 
  Spinner, 
  Alert,
  Form,
  Button
} from "react-bootstrap";

export default function InformesCurricularesDisponibles() {
  const { informesCurriculares, loading, error } = useInformesCurriculares();
  
  // ESTADOS DE FILTROS 
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterAnio, setFilterAnio] = useState("all");
  const [filterCuatri, setFilterCuatri] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");

  // 1. Obtener la base: SOLO informes CERRADOS
  const cerradosBase = useMemo(() => {
    return informesCurriculares.filter((informe) => informe.estado === "cerrado");
  }, [informesCurriculares]);

  // 2. Datos para los selects (Calculados sobre los cerrados disponibles)
  const carrerasDisponibles = useMemo(() => {
    const map = new Map();
    cerradosBase.forEach(r => {
      const nombre = r.asignatura?.carrera?.nombre;
      const id = r.asignatura?.carrera?.id;
      if (id && nombre) map.set(id.toString(), nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [cerradosBase]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set(cerradosBase.map(r => r.ciclo_lectivo));
    return Array.from(years).sort((a, b) => b - a);
  }, [cerradosBase]);

  // 3. Filtrado y Ordenamiento
  const itemsProcesados = useMemo(() => {
    let result = [...cerradosBase];

    // Filtro Carrera
    if (filterCarrera !== "all") {
      result = result.filter(r => 
        r.asignatura?.carrera?.id?.toString() === filterCarrera
      );
    }

    // Filtro Año
    if (filterAnio !== "all") {
      result = result.filter(r => r.ciclo_lectivo === Number(filterAnio));
    }

    // Filtro Cuatrimestre
    if (filterCuatri !== "all") {
      result = result.filter(r => r.asignatura?.cursado?.includes(filterCuatri));
    }

    // Ordenamiento
    result.sort((a, b) => {
      const cicloA = a.ciclo_lectivo;
      const cicloB = b.ciclo_lectivo;
      
      // Ordenar por año
      if (cicloA !== cicloB) return sortOrder === "desc" ? cicloB - cicloA : cicloA - cicloB;

      const cuatriA = a.asignatura?.cursado || "";
      const cuatriB = b.asignatura?.cursado || "";
      
      // Ordenar por cuatrimestre
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
  }, [cerradosBase, filterCarrera, filterAnio, filterCuatri, sortOrder]);


  if (loading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Cargando informes...</p>
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
            
            {/* Header */}
            <Card.Header className="bg-secondary text-white py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0" style={{ fontWeight: "normal" }}>
               Informes Cerrados
              </h5> 

              <Badge 
                bg="white" 
                text="secondary" 
                className="fs-6 px-3 py-2 shadow-sm rounded-pill"
                style={{ minWidth: '3rem', textAlign: 'center' }}
              >
                {itemsProcesados.length}
              </Badge>
            </Card.Header>
            
            {/* BARRA DE FILTROS */}
            <div className="bg-light border-bottom px-3 py-2">
              <div className="d-flex align-items-center flex-nowrap gap-2">

                <span className="text-muted fw-bold small text-nowrap me-1">Filtrar:</span>

                <div className="d-flex flex-grow-1 align-items-center gap-2 flex-nowrap overflow-auto">
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

                {/* Botón alineado a la derecha */}
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
                  No hay informes cerrados que coincidan con los filtros.
                </ListGroup.Item>
              ) : (
                itemsProcesados.map(informe => (
                  <ListGroup.Item 
                    key={informe.id} 
                    className="d-flex align-items-start"
                  >
                    <div className="me-3 flex-grow-1 text-start">
                      <span className="fw fs-5">{informe.asignatura?.nombre}</span>
                      <br/>
                      <small className="text-muted d-block mt-1">
                        Docente: {informe.docente}
                      </small>
                      <small className="text-muted">
                        {`Ciclo lectivo: ${informe.ciclo_lectivo} | Cursado: ${informe.asignatura.cursado}` }
                      </small>
                      <br />
                      <small className="text-muted">
                        {`Carrera: ${informe.asignatura?.carrera?.nombre} ` }
                      </small>
                    </div>
                    <Link 
                      to={`/departamento/informes/${informe.id}`} 
                      className="btn btn-outline-primary btn-sm align-self-center"
                      title="Ver Informe"
                    >
                      <i className="bi bi-file-earmark-text-fill"></i>
                      <span className="ms-2 d-none d-md-inline">Ver</span>
                    </Link>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Card>
          
        </Col>
      </Row>
    </Container>
  );
}