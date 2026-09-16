import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Col,
  Row,
  Card,
  ListGroup,
  Badge,
  Spinner,
  Alert,
  Form,
  Button
} from "react-bootstrap";
import type { InformeCurricular } from "../types/models/InformeCurricular";
import apiFetch from "../api/client";

// Helper para obtener persona_id desde el JWT
function getPersonaIdFromToken(): number | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    return typeof payload.persona_id === "number" ? payload.persona_id : null;
  } catch (e) {
    console.error("No se pudo decodificar el token JWT", e);
    return null;
  }
}

export default function InformesRespondidos() {
  const [informes, setInformes] = useState<InformeCurricular[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. ESTADOS DE FILTROS
  const [filterCarrera, setFilterCarrera] = useState<string>("all");
  const [filterAnio, setFilterAnio] = useState<string>("all");
  const [filterCuatri, setFilterCuatri] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    const fetchRespondidos = async () => {
      try {
        setLoading(true);

        const personaId = getPersonaIdFromToken();
        if (personaId == null) {
          throw new Error(
            "No se pudo determinar el docente logueado a partir del token"
          );
        }

        const res = await apiFetch(
          `/informes-asignaturas/docente/${personaId}`
        );
        if (!res.ok) throw new Error("Error al cargar informes respondidos");

        const data = await res.json();
        setInformes(data);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchRespondidos();
  }, []);

  // 2. DATOS PARA SELECTS (Memoizados)
  const carrerasDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    informes.forEach(r => {
      const nombre = r.asignatura?.carrera?.nombre;
      const id = r.asignatura?.carrera?.id;
      if (id && nombre) map.set(id.toString(), nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [informes]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set(informes.map(r => r.ciclo_lectivo));
    return Array.from(years).sort((a, b) => b - a);
  }, [informes]);

  // 3. FILTRADO Y ORDENAMIENTO
  const informesFiltrados = useMemo(() => {
    let result = [...informes];

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
      result = result.filter(r => r.asignatura.cursado.includes(filterCuatri));
    }

    // Ordenamiento
    result.sort((a, b) => {
      const cicloA = a.ciclo_lectivo;
      const cicloB = b.ciclo_lectivo;
      if (cicloA !== cicloB) return sortOrder === "desc" ? cicloB - cicloA : cicloA - cicloB;

      const cuatriA = a.asignatura.cursado;
      const cuatriB = b.asignatura.cursado;
      if (cuatriA !== cuatriB) {
        // Orden simplificado para cuatrimestres
        const orderA = cuatriA.includes("1") ? 1 : 2;
        const orderB = cuatriB.includes("1") ? 1 : 2;
        return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      }

      return a.asignatura.nombre.localeCompare(b.asignatura.nombre);
    });

    return result;
  }, [informes, filterCarrera, filterAnio, filterCuatri, sortOrder]);


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
          <Card className="border rounded shadow-sm bg-white">
            
            {/* HEADER*/}
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
                {informesFiltrados.length}
              </Badge>
            </Card.Header>

            {/* BARRA DE FILTROS  */}
            <div className="bg-light border-bottom px-3 py-2">
              <div className="d-flex align-items-center flex-wrap gap-2">
                
                <span className="text-muted fw-bold small text-nowrap me-1">Filtrar:</span>

                {/* Filtros */}
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
              {informesFiltrados.length === 0 ? (
                <ListGroup.Item className="text-muted text-center py-3">
                  No hay informes respondidos que coincidan con los filtros.
                </ListGroup.Item>
              ) : (
                informesFiltrados.map((informe) => (
                  <ListGroup.Item
                    key={informe.id}
                    className="d-flex align-items-start"
                  >
                    <div className="me-3 flex-grow-1 text-start">
                      <span className="fw fs-5">
                        {informe.asignatura?.nombre}
                      </span>
                      <br />
                      <small className="text-muted d-block mt-1">
                        Docente: {informe.docente}
                      </small>
                      <small className="text-muted">
                        {`Ciclo lectivo: ${informe.ciclo_lectivo} | Cursado: ${informe.asignatura.cursado}`}
                      </small>
                      <br />
                      <small className="text-muted">
                        {`Carrera: ${
                          informe.asignatura?.carrera?.nombre ?? ""
                        } `}
                      </small>
                    </div>

                    <Link
                      to={`/docente/informes-curriculares-respondidos/${informe.id}`}
                      className="btn btn-outline-primary btn-sm align-self-center"
                      title="Ver Informe Completo"
                    >
                      <i className="bi bi-file-earmark-text-fill me-2" />
                      <span className="d-none d-md-inline">Ver</span>
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