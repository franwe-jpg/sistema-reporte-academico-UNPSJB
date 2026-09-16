import { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  ProgressBar,
  Spinner,
  Alert,
  Form,
  ButtonGroup,
  Button // Importamos ButtonGroup
} from "react-bootstrap";
import { useEstadisticasDepartamento } from "../hook/useEstadisticasDepartamento";

// --- HELPERS DE ESTILO ---
const getColorByLabel = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("excelente") || l.includes("muy") || l.includes("si")) return "#198754";
  if (l.includes("bueno") || l.includes("satisfactorio")) return "#0d6efd";
  if (l.includes("regular")) return "#ffc107";
  if (l.includes("malo") || l.includes("no")) return "#dc3545";
  return "#6c757d";
};

const getBadgeVariant = (severidad: string) => {
  switch (severidad) {
    case "Alta": return "danger";
    case "Media": return "warning";
    default: return "success";
  }
};

const getTextColor = (bg: string) => {
  switch (bg) {
    case "primary": return "text-primary";
    case "success": return "text-success";
    case "info": return "text-info";
    case "warning": return "text-warning";
    default: return "text-dark";
  }
};

// --- COMPONENTE DONUT ---
const DonutManual = ({ data }: { data: { label: string; valor: number }[] }) => {
  const total = data.reduce((acc, v) => acc + v.valor, 0);
  if (total === 0) return <div className="text-center py-5 text-muted">Sin datos</div>;

  let acc = 0;
  const stops = data.map((v) => {
    const color = getColorByLabel(v.label);
    const start = (acc / total) * 360;
    acc += v.valor;
    const end = (acc / total) * 360;
    return `${color} ${start}deg ${end}deg`;
  });

  return (
    <div className="d-flex flex-column align-items-center">
      <div style={{
          width: 180, height: 180, borderRadius: "50%",
          background: `conic-gradient(${stops.join(", ")})`,
          position: "relative"
      }}>
        <div style={{
            position: "absolute", inset: 30, background: "white", borderRadius: "50%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#333"
        }}>
          <span className="h3 mb-0 fw-bold">{total}</span>
          <small className="text-muted">Votos</small>
        </div>
      </div>
      <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
        {data.map((v, i) => (
          <div key={i} className="d-flex align-items-center gap-1 small">
             <span style={{width: 10, height: 10, backgroundColor: getColorByLabel(v.label), borderRadius: "50%"}}></span>
             <span className="fw-bold">{v.label}</span>
             <span className="text-muted">({Math.round(v.valor/total*100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function EstadisticasDepartamentoPage() {
  // Filtros
  const [ciclo, setCiclo] = useState(2025);
  const [cuatrimestre, setCuatrimestre] = useState("todos");
  // Estado para los botones de Ciclo (Básico / Superior)
  const [nivel, setNivel] = useState("todos"); 

  const { data, loading, error } = useEstadisticasDepartamento(ciclo, cuatrimestre, nivel);

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" variant="primary"/></Container>;
  if (error) return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  if (!data) return <Container className="mt-5"><Alert variant="info">No hay datos.</Alert></Container>;

  return (
    <Container className="my-4">
      
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-4 border-bottom pb-3 gap-3">
        <div>
            <h2 className="text-primary fw-bold mb-1">Estadisticas Facultad de Ingenieria</h2>
        </div>
        
        <div className="d-flex flex-wrap align-items-end gap-3">
            
            {/* --- BOTONES DE CICLO (NIVEL) --- */}
            <Form.Group>
                <Form.Label className="d-block small text-muted fw-bold mb-1">Nivel / Ciclo</Form.Label>
                <ButtonGroup>
                    <Button 
                        variant={nivel === "todos" ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => setNivel("todos")}
                    >
                        Todos
                    </Button>
                    <Button 
                        variant={nivel === "basico" ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => setNivel("basico")}
                    >
                        Ciclo Básico
                    </Button>
                    <Button 
                        variant={nivel === "superior" ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => setNivel("superior")}
                    >
                        Ciclo Superior
                    </Button>
                </ButtonGroup>
            </Form.Group>

            {/* Filtro Cuatrimestre */}
            <Form.Group>
                <Form.Label className="small text-muted fw-bold mb-1">Período</Form.Label>
                <Form.Select size="sm" value={cuatrimestre} onChange={(e) => setCuatrimestre(e.target.value)} style={{width: '150px'}}>
                    <option value="todos">Todo el año</option>
                    <option value="cuatrimestre1">1° Cuatrimestre</option> {/* Sin espacio */}
                    <option value="cuatrimestre2">2° Cuatrimestre</option> {/* Sin espacio */}
                </Form.Select>
            </Form.Group>

            {/* Filtro Año */}
            <Form.Group>
                <Form.Label className="small text-muted fw-bold mb-1">Año</Form.Label>
                <Form.Select size="sm" value={ciclo} onChange={(e) => setCiclo(Number(e.target.value))} style={{width: '90px'}}>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                </Form.Select>
            </Form.Group>
        </div>
      </div>

      {/* KPIs */}
      <Row className="g-3 mb-4">
        {data.indicadores.map((item, idx) => (
          <Col key={idx} md={3}>
            <Card className="shadow-sm border h-100 text-center py-2">
              <Card.Body>
                <small className="text-muted fw-bold text-uppercase">{item.titulo}</small>
                <div className={`display-6 fw-bold mt-1 ${getTextColor(idx === 3 ? 'warning' : idx === 2 ? 'success' : 'primary')}`}>
                    {item.valor}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {/* Gráficos */}
      <Row className="mb-4 g-4">
        <Col lg={8}>
          <Card className="shadow-sm border h-100">
            <Card.Header className="bg-white fw-bold text-primary">Participación por Variable</Card.Header>
            <Card.Body>
              {data.dimensiones.length === 0 ? <p className="text-muted text-center py-5">Sin datos para este nivel.</p> : 
               data.dimensiones.map((d) => (
                <div key={d.nombre} className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-bold">{d.nombre}</span>
                    <span>{d.valor}%</span>
                  </div>
                  <ProgressBar now={d.valor} variant="primary" style={{height: "8px"}} />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="shadow-sm border h-100">
            <Card.Header className="bg-white fw-bold text-primary">Valoraciones</Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <DonutManual data={data.valoraciones} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
       <br />
      {/* Top Asignaturas */}
      <h5 className="text-primary fw-bold mb-3 border-bottom pb-2">Asignaturas con Mayor Participación</h5>
      <Row className="g-3 mb-4">
        {data.top_asignaturas.length === 0 ? <Col><p className="text-muted">No hay asignaturas en este nivel.</p></Col> :
         data.top_asignaturas.map((a, i) => (
          <Col key={i} md={3}>
            <div className="p-3 border rounded bg-light h-100 shadow-sm">
              <div className="fw-bold text-truncate" title={a.nombre}>{a.nombre}</div>
              <small className="text-muted d-block mb-2">Inscriptos (Est.): {a.alumnos}</small>
              <div className="d-flex justify-content-between small fw-bold">
                <span>Participación</span>
                <span className="text-success">{a.avance}%</span>
              </div>
              <ProgressBar now={a.avance} variant="success" style={{height: "5px"}} />
            </div>
          </Col>
        ))}
      </Row>
        <br />
      {/* Alertas */}
      <Row className="g-4">
        <Col lg={12}>
          <Card className="shadow-sm border h-100">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                 <h5 className="text-primary fw-bold mb-0">Alertas y Observaciones</h5>
                 {data.alertas.length > 0 && <Badge bg="danger" pill>{data.alertas.length}</Badge>}
            </Card.Header>
            <Table hover responsive className="mb-0 align-middle text-center small">
                 <thead className="table-light">
                    <tr><th>Tipo</th><th>Asignatura</th><th>Detalle</th><th>Severidad</th></tr>
                 </thead>
                 <tbody>
                    {data.alertas.length === 0 ? <tr><td colSpan={4} className="text-muted py-3">Sin alertas activas.</td></tr> :
                     data.alertas.map((a, i) => (
                        <tr key={i}>
                            <td className="fw-semibold">{a.tipo}</td>
                            <td>{a.asignatura}</td>
                            <td className="text-start text-muted">{a.detalle}</td>
                            <td><Badge bg={getBadgeVariant(a.severidad)}>{a.severidad}</Badge></td>
                        </tr>
                     ))}
                 </tbody>
            </Table>
          </Card>
        </Col>
        {/* <Col lg={4}>
          <Card className="shadow-sm border h-100">
            <Card.Header className="bg-white"><h5 className="text-primary fw-bold mb-0">Términos</h5></Card.Header>
            <Card.Body>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                {data.keywords.length === 0 ? <span className="text-muted">Sin comentarios.</span> :
                 data.keywords.map((kw, i) => <Badge key={i} bg="secondary" className="fw-normal">{kw}</Badge>)}
              </div>
            </Card.Body>
          </Card>
        </Col> */}
      </Row>
    </Container>
  );
}