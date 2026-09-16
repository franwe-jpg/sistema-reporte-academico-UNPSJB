import { useState, useMemo } from 'react';
import { useEncuestas } from "../hook/useEncuestas";
import { Link } from "react-router-dom";
import { 
  Container, 
  Col, 
  Row, 
  Card, 
  ListGroup, 
  Badge,
  Form,
  Button
} from "react-bootstrap";

export default function EncuestasRespondidas() {
  const { encuestasRespondidas, loading, error } = useEncuestas();

  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterAnio, setFilterAnio] = useState("all");
  const [filterCuatri, setFilterCuatri] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");

  const respondidasBase = useMemo(() => {
    return encuestasRespondidas || [];
  }, [encuestasRespondidas]);

  const carrerasDisponibles = useMemo(() => {
    const map = new Map();
    respondidasBase.forEach(e => {
      const nombre = e.asignatura?.carrera?.nombre;
      const id = e.asignatura?.carrera?.id;
      if (id && nombre) map.set(id.toString(), nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [respondidasBase]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set(respondidasBase.map(e => e.ciclo_lectivo));
    return Array.from(years).sort((a, b) => b - a);
  }, [respondidasBase]);

  const itemsProcesados = useMemo(() => {
    let result = [...respondidasBase];

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

    result.sort((a, b) => {
      if (a.ciclo_lectivo !== b.ciclo_lectivo) {
        return sortOrder === "desc" ? b.ciclo_lectivo - a.ciclo_lectivo : a.ciclo_lectivo - b.ciclo_lectivo;
      }
      
      const cuatriA = a.asignatura?.cursado || "";
      const cuatriB = b.asignatura?.cursado || "";
      if (cuatriA !== cuatriB) {
        const orderA = cuatriA.includes("1") ? 1 : 2;
        const orderB = cuatriB.includes("1") ? 1 : 2;
        return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      }

      const nombreA = a.asignatura?.nombre || "";
      const nombreB = b.asignatura?.nombre || "";
      return nombreA.localeCompare(nombreB);
    });

    return result;
  }, [respondidasBase, filterCarrera, filterAnio, filterCuatri, sortOrder]);


  if (loading) return <p className="text-center mt-4">Cargando encuestas respondidas...</p>;
  if (error) return <p className="text-center mt-4 text-danger">Error: {error}</p>;


  return (
     <Container className="my-4">
      <Row>
        <Col md={10} lg={8} className="mx-auto">

          <Card className="border rounded shadow-sm bg-white">
            
            <Card.Header className="bg-secondary text-white py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0" style={{ fontWeight: "normal" }}>
                EncuestasRespondidas
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
                            <option value="all">Cuat (Todos)</option>
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
                  No hay encuestas respondidas.
                </ListGroup.Item>
              ) : (
                itemsProcesados.map(encuesta => (
                  <ListGroup.Item 
                    key={encuesta.id} 
                    className="d-flex align-items-start"
                  >
                    <div className="me-3 flex-grow-1 text-start">
                      <span className="fw-bold fs-5">{encuesta.asignatura.nombre}</span>
                      <br/>
                      <small className="text-muted d-block mt-1">
                        {`Docente: ${encuesta.asignatura.nombre_docente}` }
                      </small>
                      <small className="text-muted">
                        {`Ciclo lectivo: ${encuesta.ciclo_lectivo} | Cursado: ${encuesta.asignatura.cursado}` }
                      </small>
                      <br />
                      <small className="text-muted">
                        {`Carrera: ${encuesta.asignatura?.carrera?.nombre}` }
                      </small>
                    </div>
                    
                    <Link 
                      to={`/alumno/encuestas-respondidas/${encuesta.id}`} 
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

// import { useEncuestas } from '../hook/useEncuestas';
// import { Link } from "react-router-dom";
// import { 
//   Container, 
//   Col, 
//   Row, 
//   Card, 
//   ListGroup, 
//   Badge, 
//   Spinner, 
//   Alert 
// } from "react-bootstrap";

// export default function EncuestasRespondidas() {
//   const { encuestasRespondidas, loading, error } = useEncuestas();

//   if (loading) {
//     return (
//       <Container className="my-4 text-center">
//         <Spinner animation="border" variant="primary" />
//         <p className="mt-2">Cargando historial...</p>
//       </Container>
//     );
//   }

//   if (error) {
//     return (
//       <Container className="my-4">
//         <Row>
//           <Col md={10} lg={8} className="mx-auto">
//             <Alert variant="danger">Error: {error}</Alert>
//           </Col>
//         </Row>
//       </Container>
//     );
//   }

//   const Historial = encuestasRespondidas.filter(
//     (encuesta) => encuesta.respondida === true || encuesta.estado === "cerrada"
//   );

//   return (
//     <Container className="my-4">
//       <Row>
//         <Col md={10} lg={8} className="mx-auto">
          
//           <Card className="border rounded shadow-sm bg-white">
            
//             <Card.Header as="h5" className="bg-primary text-white d-flex justify-content-between align-items-center">
//               Historial de Encuestas
//               <Badge bg="light" text="dark" pill>
//                 {Historial.length}
//               </Badge>
//             </Card.Header>
            
//             <ListGroup variant="flush">
//               {Historial.length === 0 ? (
//                 <ListGroup.Item>
//                   <p className="text-muted mb-0">No hay historial disponible.</p>
//                 </ListGroup.Item>
//               ) : (
//                 Historial.map((encuesta) => (
//                   <ListGroup.Item 
//                     key={encuesta.id}
//                     className="d-flex align-items-start"
//                   >
//                     <div className="me-3 flex-grow-1 text-start">
//                       <span className="fw-bold fs-5">{encuesta.asignatura?.nombre}</span>
                      
//                       {/* --- CAMBIO 2: BADGE DINÁMICO --- */}
//                       {encuesta.respondida ? (
//                         <Badge bg="success" className="ms-2">Completada</Badge>
//                       ) : (
//                         <Badge bg="danger" className="ms-2">No Respondida</Badge>
//                       )}

//                       <div className="text-muted small mt-1">
//                         <div><strong>Docente:</strong> {encuesta.asignatura.nombre_docente}</div>
//                         <div><strong>Ciclo:</strong> {encuesta.ciclo_lectivo || 2025} | <strong>Cursado:</strong> {encuesta.asignatura.cursado}</div>
                        
//                         {/* Mostrar fecha de finalización */}
//                         <div>
//                             <strong>Cierre: </strong> {encuesta.fecha_fin}
//                         </div>
//                       </div>
//                     </div>

//                     {encuesta.respondida ? (
//                       <Link
//                         to={`/alumno/encuestas-respondidas/${encuesta.id}`}
//                         className="btn btn-outline-primary btn-sm align-self-center"
//                         title="Ver mis respuestas"
//                       >
//                         <i className="bi bi-eye-fill"></i>
//                         <span className="ms-2 d-none d-md-inline">Ver</span>
//                       </Link>
//                     ) : (
//                       <span className="text-muted small align-self-center fst-italic">
//                         Cerrada
//                       </span>
//                     )}

//                   </ListGroup.Item>
//                 ))
//               )}
//             </ListGroup>
//           </Card>
//         </Col>
//       </Row>
//     </Container>
//   );
// }
