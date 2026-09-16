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
import type { InformeSinteticoCarrera } from "../types/InformeSintetico";
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

export default function InformesSinteticosRespondidos() {
  const [informes, setInformes] = useState<InformeSinteticoCarrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==================== ESTADOS DE FILTROS ====================
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterAnio, setFilterAnio] = useState("all");
  const [filterCuatri, setFilterCuatri] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const personaId = getPersonaIdFromToken();
        if (personaId == null) {
          throw new Error(
            "No se pudo determinar el usuario de departamento a partir del token"
          );
        }

        const res = await apiFetch(
          `/informe-sintetico-carrera/departamento/${personaId}`
        );

        if (!res.ok)
          throw new Error("Error al cargar informes sintéticos respondidos");

        const data = await res.json();
        setInformes(data);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCuatrimestre = (informe: InformeSinteticoCarrera) => {
    return informe.informes_asignaturas?.[0]?.asignatura?.cursado || "";
  };

  const carrerasDisponibles = useMemo(() => {
    const map = new Map();
    informes.forEach(i => {
      const nombre = i.carrera?.nombre;
      const id = i.carrera?.id;
      if (id && nombre) map.set(id.toString(), nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [informes]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set(informes.map(i => i.ciclo_lectivo));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [informes]);

  //  FILTRADO Y ORDENAMIENTO
  const itemsProcesados = useMemo(() => {
    let result = [...informes];

    // Filtro Carrera
    if (filterCarrera !== "all") {
      result = result.filter(i => 
        i.carrera?.id?.toString() === filterCarrera
      );
    }

    // Filtro Año
    if (filterAnio !== "all") {
      result = result.filter(i => String(i.ciclo_lectivo) === filterAnio);
    }

    // Filtro Cuatrimestre
    if (filterCuatri !== "all") {
      result = result.filter(i => {
        const cuatri = getCuatrimestre(i);
        return cuatri.includes(filterCuatri);
      });
    }

    // Ordenamiento
    result.sort((a, b) => {
      // 1. Ciclo Lectivo 
      if (a.ciclo_lectivo !== b.ciclo_lectivo) {
        return sortOrder === "desc" 
          ? Number(b.ciclo_lectivo) - Number(a.ciclo_lectivo) 
          : Number(a.ciclo_lectivo) - Number(b.ciclo_lectivo);
      }
      
      // 2. Cuatrimestre
      const cuatriA = getCuatrimestre(a);
      const cuatriB = getCuatrimestre(b);
      if (cuatriA !== cuatriB) {
        const orderA = cuatriA.includes("1") ? 1 : 2;
        const orderB = cuatriB.includes("1") ? 1 : 2;
        return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      }

      // 3. Nombre Carrera
      const nombreA = a.carrera?.nombre || "";
      const nombreB = b.carrera?.nombre || "";
      return nombreA.localeCompare(nombreB);
    });

    return result;
  }, [informes, filterCarrera, filterAnio, filterCuatri, sortOrder]);


  if (loading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Cargando historial...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-4">
        <Alert variant="danger">Error: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Row>
        <Col md={10} lg={8} className="mx-auto">
          <Card className="border rounded shadow-sm bg-white">
            
            <Card.Header className="bg-secondary text-white py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0" style={{ fontWeight: "normal" }}>
                Historial de Informes Sintéticos Enviados
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
                  No has enviado ningún informe sintético que coincida con los filtros.
                </ListGroup.Item>
              ) : (
                itemsProcesados.map((informe) => {
                  const cuatrimestre = getCuatrimestre(informe);

                  return (
                    <ListGroup.Item
                      key={informe.id}
                      className="d-flex align-items-start"
                    >
                      <div className="me-3 flex-grow-1 text-start">
                        <span className="fw fs-5">
                          {informe.carrera?.nombre}
                        </span>
                        <br />
                        <small className="text-muted">
                          Comisión {informe.comision_asesora}
                        </small>
                        <br />
                        <small className="text-muted">
                          Sede: {informe.sede}
                        </small>
                        <br />
                        <small className="text-muted">
                          {`Ciclo lectivo: ${informe.ciclo_lectivo} | Cursado: ${cuatrimestre}`}
                        </small>
                      </div>

                      <Link
                        to={`/departamento/informes-sinteticos-respondidos/${informe.id}`}
                        className="btn btn-outline-primary btn-sm align-self-center"
                        title="Ver Informe Completo"
                      >
                        <i className="bi bi-file-earmark-text-fill me-2" />
                        <span className="d-none d-md-inline">Ver</span>
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