import { Container, Row, Col, Card, ProgressBar, ListGroup, Dropdown, Spinner } from "react-bootstrap";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useReportes } from "../hook/useReportes";

// --- TIPOS ---
type Opcion = { opcion_texto: string; porcentaje: number };
type PreguntaReporte = { pregunta_texto: string; opciones: Opcion[] };
type VariableResumen = { codigo: string; opciones: Opcion[] };
type ResultadoPorPregunta = { codigo: string; preguntas: PreguntaReporte[] };
type PreguntaPonderada = { texto: string; valor: number; variableNombre: string };
type VariableProcesada = { nombre: string; color: string; promedio: number; preguntas: PreguntaPonderada[] };
type RawSummaryVariableData = { opciones?: Opcion[] };


const WEIGHTS: Record<string, number> = {
  'si': 100, 'no': 0, 'npo | no puedo opinar': 50,
  'suficientes': 100, 'escasos': 0,
  'más de 50%': 75, 'entre 0 y 50%': 25,
  '1': 0, '2': 33, '3': 67, '4': 100,
  'una': 50, 'más de una': 50,
};


function calcularScorePorOpciones(opciones: Opcion[]): number {
  let weightedSum = 0;
  for (const op of opciones) {
    const text = op.opcion_texto.toLowerCase();
    const weight = WEIGHTS[text] ?? 50;
    weightedSum += (weight * op.porcentaje);
  }
  return Math.round(weightedSum / 100);
}


function transformarResumenEnVariables(resumen: {
  resumen_por_variable: Record<string, VariableResumen>;
  resultados_por_pregunta: Record<string, ResultadoPorPregunta>;
}): VariableProcesada[] {
  const preguntasVars = resumen.resultados_por_pregunta || {};
  const colors = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#0dcaf0", "#6f42c1", "#e83e8c"];
  const allVariableData: VariableProcesada[] = [];

  Object.entries(preguntasVars).forEach(([name, data], i) => {
    const preguntas: PreguntaPonderada[] = data.preguntas.map((p) => ({
      texto: p.pregunta_texto,
      valor: calcularScorePorOpciones(p.opciones),
      variableNombre: name,
    }));

    const validQuestions = preguntas.filter(p => p.valor !== 50);
    const totalPromedio = validQuestions.length > 0
      ? validQuestions.reduce((acc, p) => acc + p.valor, 0) / validQuestions.length
      : 50;

    allVariableData.push({
      nombre: name,
      color: colors[i % colors.length],
      promedio: Math.round(totalPromedio),
      preguntas,
    });
  });

  return allVariableData;
}

// --- LÓGICAS DE RANKING ---
// Ranking de fortalezas y debilidades dentro de una variable
function obtenerRankingPorVariable(preguntas: PreguntaPonderada[]) {
  const rankingData = preguntas.filter(p => p.valor !== 50);
  const ordenadas = [...rankingData].sort((a, b) => b.valor - a.valor);
  return {
    fortalezas: ordenadas.slice(0, 3),
    debilidades: ordenadas.slice(-3).reverse(),
  };
}

// Ranking general considerando todas las variables
function obtenerRankingGeneral(variables: VariableProcesada[]) {
  const allQuestions: PreguntaPonderada[] = variables.flatMap(v => v.preguntas);
  const rankingData = allQuestions.filter(p => p.valor !== 50);
  const ordenadas = [...rankingData].sort((a, b) => b.valor - a.valor);
  return {
    fortalezas: ordenadas.slice(0, 3),
    debilidades: ordenadas.slice(-3).reverse(),
  };
}

// --- COMPARATIVA ---
// Convierte el resumen comparativo bruto en scores por variable
function calcularScoresComparativos(rawSummary: any): Record<string, number> {
  const scores: Record<string, number> = {};
  if (!rawSummary) return scores;

  for (const [variableName, data] of Object.entries(rawSummary)) {
    const variableData = data as RawSummaryVariableData;
    if (variableData?.opciones && Array.isArray(variableData.opciones)) {
      scores[variableName] = calcularScorePorOpciones(variableData.opciones);
    }
  }
  return scores;
}

// --- COMPONENTE PRINCIPAL ---
export default function EstadisticasDocentePage() {
  const { id } = useParams();
  const idReporte = Number(id);

  // Hooks de datos
  const { fetchResumenByReporteId, fetchReporteById, fetchResumenComparativo } = useReportes();

  // Estados principales
  const [variables, setVariables] = useState<VariableProcesada[]>([]);
  const [variableSeleccionada, setVariableSeleccionada] = useState<VariableProcesada | null>(null);
  const [reporteCompleto, setReporteCompleto] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados para comparativa
  const [calculatedComparativeScores, setCalculatedComparativeScores] = useState<Record<string, number> | null>(null);
  const [loadingComparative, setLoadingComparative] = useState(false);
  const [rankingSource, setRankingSource] = useState<'general' | string>('general');
  const [comparisonYear, setComparisonYear] = useState<number>(new Date().getFullYear() - 1);

  const inscriptos = 2;

  // --- EFECTO DE CARGA INICIAL ---
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const data = await fetchReporteById(idReporte);
        setReporteCompleto(data);

        const resumen = await fetchResumenByReporteId(idReporte);
        const parsed = transformarResumenEnVariables(resumen);
        setVariables(parsed);

        if (parsed.length > 0) {
          setVariableSeleccionada(parsed[0]);
          setRankingSource('general');
        }
      } catch (e) {
        console.error("Error cargando datos iniciales", e);
      }
      setLoading(false);
    };
    cargarDatosIniciales();
  }, [idReporte, fetchResumenByReporteId, fetchReporteById]);

  // --- EFECTO DE CARGA DE COMPARATIVA ---
  useEffect(() => {
    const cargarComparativa = async () => {
      const currentYear = new Date().getFullYear();
      if (comparisonYear >= currentYear) {
        setCalculatedComparativeScores(null);
        return;
      }
      setLoadingComparative(true);
      const rawComparativeData = await fetchResumenComparativo(idReporte, comparisonYear);

      if (rawComparativeData && Object.keys(rawComparativeData).length > 0) {
        const calculatedScores = calcularScoresComparativos(rawComparativeData);
        setCalculatedComparativeScores(calculatedScores);
      } else {
        setCalculatedComparativeScores({});
      }
      setLoadingComparative(false);
    };
    cargarComparativa();
  }, [idReporte, comparisonYear, fetchResumenComparativo]);

  // --- CÁLCULOS DERIVADOS ---
  const { preguntasParaRanking, rankingTitle } = useMemo(() => {
    if (rankingSource === 'general') {
      const { fortalezas, debilidades } = obtenerRankingGeneral(variables);
      return { preguntasParaRanking: { fortalezas, debilidades }, rankingTitle: "General" };
    }
    const selectedVar = variables.find(v => v.nombre === rankingSource);
    if (selectedVar) {
      const { fortalezas, debilidades } = obtenerRankingPorVariable(selectedVar.preguntas);
      return { preguntasParaRanking: { fortalezas, debilidades }, rankingTitle: selectedVar.nombre };
    }
    return { preguntasParaRanking: { fortalezas: [], debilidades: [] }, rankingTitle: "Seleccionar variable" };
  }, [rankingSource, variables]);

  // --- RENDERIZACIÓN ---
  if (loading) return <div className="text-center my-5">Cargando estadísticas...</div>;
  if (!reporteCompleto || variables.length === 0) return <div className="text-center my-5">No hay datos disponibles</div>;

  const participantes = reporteCompleto?.encuesta_asignatura?.respuestas?.length || 0;
  const participacion = inscriptos > 0 ? Math.round((participantes / inscriptos) * 100) : 0;
  const satisfaccionGeneral = variables.length
    ? Math.round(variables.reduce((acc, v) => acc + v.promedio, 0) / variables.length)
    : 0;

  const preguntasDetalle = variableSeleccionada?.preguntas || [];


  // --- Renderización del Ranking Unificado ---
  const renderRankingSection = () => {
    const { fortalezas, debilidades } = preguntasParaRanking;
    const rankingData = [...fortalezas, ...debilidades];
    
    return (
        <Card className="shadow-sm">
            <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <Card.Title className="m-0">Ranking de Fortalezas y Debilidades</Card.Title>
                    <Dropdown onSelect={(key) => setRankingSource(key as 'general' | string)}>
                        <Dropdown.Toggle variant="primary" id="dropdown-ranking-scope">
                            {rankingTitle === "General" ? "Ranking General" : rankingTitle}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey="general">Ranking General (Encuesta completa)</Dropdown.Item>
                            <Dropdown.Divider />
                            {variables.map((v, i) => (
                                <Dropdown.Item key={i} eventKey={v.nombre}>
                                    {v.nombre}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                {rankingTitle !== "Seleccionar variable" ? (
                    <>
                        <p className="text-muted">
                            Mostrando ranking para: <strong>{rankingTitle}</strong>.
                        </p>
                        <Row>
                            <Col md={6}>
                                <h6>Fortalezas (Mejor evaluadas)</h6>
                                <ListGroup>
                                    {fortalezas.length > 0 ? fortalezas.map((f, i) => (
                                        <ListGroup.Item key={i} className="d-flex justify-content-between">
                                            <span title={f.texto}>{f.texto.substring(0, 70)}...</span>
                                            <span className="fw-bold text-success">{f.valor}%</span>
                                        </ListGroup.Item>
                                    )) : <ListGroup.Item className="text-muted">No hay fortalezas destacables.</ListGroup.Item>}
                                </ListGroup>
                            </Col>
                            <Col md={6}>
                                <h6>Debilidades (Peor evaluadas)</h6>
                                <ListGroup>
                                    {debilidades.length > 0 ? debilidades.map((d, i) => (
                                        <ListGroup.Item key={i} className="d-flex justify-content-between">
                                            <span title={d.texto}>{d.texto.substring(0, 70)}...</span>
                                            <span className="fw-bold text-danger">{d.valor}%</span>
                                        </ListGroup.Item>
                                    )) : <ListGroup.Item className="text-muted">No hay debilidades destacables.</ListGroup.Item>}
                                </ListGroup>
                            </Col>
                        </Row>
                        <div className="mt-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart
                              data={[...rankingData].sort((a, b) => a.valor - b.valor)} // ← copia antes de ordenar
                              margin={{ top: 5, right: 30, left: 20, bottom: 100 }}
                            >
                              <XAxis
                                dataKey="texto"
                                interval={0}
                                angle={-30}
                                textAnchor="end"
                                height={110}
                                style={{ fontSize: '0.7rem' }}
                                tickFormatter={(value: unknown) => {
                                  const text = typeof value === 'string' ? value : '';
                                  const trunc = text.length > 30 ? text.substring(0, 30) + '...' : text;
                                  return rankingSource === 'general' ? trunc : trunc;
                                }}
                              />
                              <YAxis tickFormatter={(value: number) => `${value}%`} />
                              <Tooltip
                                formatter={(value: unknown, _name: unknown, props: any) => {
                                  const v = typeof value === 'number' && isFinite(value) ? value : 0;
                                  const varName =
                                    props?.payload?.variableNombre ??
                                    (typeof props?.label === 'string' ? props.label : ''); // fallback
                                  return [`${v}%`, varName];
                                }}
                                cursor={{ fill: 'rgba(13,110,253,0.08)' }} // opcional: mejora hover
                              />
                              <Bar dataKey="valor" fill="#0d6efd" name="Score" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                    </>
                ) : (
                    <p className="text-muted">Utiliza el selector de arriba para elegir el alcance del ranking (General o por Variable).</p>
                )}
            </Card.Body>
        </Card>
    );
  };
  
  // --- Renderización de la Comparativa Anual ---
// --- Renderización de la Comparativa Anual (Actualizado para usar datos reales) ---
const renderComparativaSection = () => {
    const currentYear = new Date().getFullYear();
    const comparativeScores = calculatedComparativeScores;
    const isComparativeYear = comparisonYear !== currentYear;

    return (
        <Card className="shadow-sm">
            <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <Card.Title className="m-0">Comparativa de Scores</Card.Title>
                    <Dropdown onSelect={(key) => setComparisonYear(Number(key))}>
                        <Dropdown.Toggle variant="primary" id="dropdown-year-scope">
                            Comparando con: {comparisonYear === currentYear ? 'Actual (2025)' : `Año Anterior (${comparisonYear})`}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey={currentYear}>Actual ({currentYear})</Dropdown.Item>
                            <Dropdown.Item eventKey="2024">Año Anterior (2024)</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                <p className="text-muted">
                    {loadingComparative 
                        ? <Spinner animation="border" size="sm" /> 
                        : isComparativeYear && comparativeScores && Object.keys(comparativeScores).length === 0
                            ? <span className="text-danger fw-bold">No hay datos de comparación disponibles para el año {comparisonYear}.</span> 
                            : `Diferencia de promedio por variable entre el ciclo actual (${currentYear}) y el seleccionado (${comparisonYear}).`
                    }
                </p>
                
                {!(isComparativeYear && (!comparativeScores || Object.keys(comparativeScores).length === 0)) && (
                    <ListGroup variant="flush">
                        {variables.map((v) => {
                            const score2025 = v.promedio;
                            const variableKey = v.nombre;
                            
                            // Obtener el score del año comparativo, o usar el score de 2025 si es el año actual
                            const scoreComparative = isComparativeYear && comparativeScores && comparativeScores[variableKey] !== undefined
                                ? comparativeScores[variableKey]
                                : score2025;
                            
                            const delta = score2025 - scoreComparative;
                            const isPositive = delta >= 0;
                            const variant = isPositive ? 'success' : 'danger';
                            
                            return (
                                <ListGroup.Item key={v.nombre} className="d-flex justify-content-between align-items-center">
                                    <span className="fw-semibold" style={{ color: v.color }}>
                                        {v.nombre}
                                    </span>
                                    <div>
                                        <span className="me-3 text-muted" style={{fontSize: '0.9rem'}}>
                                            Score {currentYear}: {score2025}% (vs {comparisonYear}: {scoreComparative}%)
                                        </span>
                                        {isComparativeYear && (
                                            <span className={`fw-bold text-${variant}`}>
                                                {isPositive ? '▲' : '▼'} {Math.abs(delta)} pts
                                            </span>
                                        )}
                                    </div>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                )}
            </Card.Body>
        </Card>
    );
};

  return (
    <Container className="my-4">
      <div className="text-center mb-4">
          <h2 className="text-primary fw-bold m-0">Estadisticas {reporteCompleto?.encuesta_asignatura?.asignatura?.nombre}</h2>
      </div>
      
      {/* 1. Indicadores Clave (KPIs) - Altura reducida con py-2 */}
      <Row className="g-4 mb-4">
        {[
          { titulo: "Alumnos Inscriptos", valor: inscriptos, bg: "primary" },
          { titulo: "Alumnos participantes", valor: participantes, bg: "info" },
          { titulo: "Participación", valor: `${participacion}%`, bg: "success" },
          { titulo: "Satisfacción general", valor: `${satisfaccionGeneral}%`, bg: "warning" },
        ].map((item, idx) => (
          <Col key={idx} xs={12} md={6} lg={3}>
            <Card bg={item.bg as any} text="white" className="shadow-sm">
              <Card.Body className="text-center py-2"> 
                <Card.Title className="fs-6">{item.titulo}</Card.Title>
                <div className="display-6 fw-bold">{item.valor}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 2. Promedio por variable + Pie Chart */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title> 
                Promedio por variable </Card.Title>
              {variables.map((v) => (
                <div key={v.nombre} className="mb-3">
                  <div className="d-flex justify-content-between">
                    <strong>{v.nombre}</strong>
                    <span className="text-muted">{v.promedio}%</span>
                  </div>
                  <ProgressBar
                    now={v.promedio}
                    label={`${v.promedio}%`}
                    style={{ backgroundColor: "#eee" }}
                    variant="info"
                  />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mt-4 mt-lg-0">
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title className="mb-4">Distribución de Promedios</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={variables}
                    dataKey="promedio"
                    nameKey="nombre"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={2}
                    // FIX: Agregando el valor del promedio como etiqueta simple
                    label={(props: any) => `${props.promedio}%`} 
                    labelLine={true} 
                  >
                    {variables.map((v, i) => (
                      <Cell key={i} fill={v.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Score Promedio']} />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda de variables debajo del Pie Chart */}
              <ListGroup variant="flush" className="mt-3" style={{fontSize: '0.9rem'}}>
                {variables.map((v, i) => (
                    <ListGroup.Item key={i} className="d-flex align-items-center px-0 py-1">
                        <span style={{ 
                            width: '12px', 
                            height: '12px', 
                            backgroundColor: v.color, 
                            display: 'inline-block', 
                            marginRight: '8px',
                            borderRadius: '3px'
                        }} />
                        <span className="text-truncate" title={v.nombre}>
                          {v.nombre}
                        </span>
                        <span className="ms-auto fw-semibold text-muted">{v.promedio}%</span>
                    </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* 3. COMPARATIVA ANUAL (MOVIMIENTO: INMEDIATAMENTE DEBAJO DEL PROMEDIO) */}
      <Row className="mb-4">
        <Col>
            {renderComparativaSection()}
        </Col>
      </Row>


      {/* 4. Detalle por Pregunta */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title>Detalle por pregunta</Card.Title>
                <Dropdown onSelect={(key) => {
                    const selectedIndex = Number(key);
                    setVariableSeleccionada(variables[selectedIndex]);
                }}>
                  {/* FIX: Se mantiene variant="primary" */}
                  <Dropdown.Toggle variant="primary" id="dropdown-basic"> 
                    {variableSeleccionada?.nombre || "Seleccionar variable"}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {variables.map((v, i) => (
                      <Dropdown.Item key={i} eventKey={i.toString()}>
                        {v.nombre}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              {variableSeleccionada ? (
                <>
                  {preguntasDetalle.map((p) => (
                    <div key={p.texto} className="mb-3">
                      <div className="d-flex justify-content-between">
                        <strong>{p.texto}</strong>
                        <span className="text-muted">{p.valor}%</span>
                      </div>
                      <ProgressBar now={p.valor} label={`${p.valor}%`} />
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-muted">Seleccioná una variable para ver el detalle de sus preguntas.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 5. RANKING UNIFICADO (Al final de todo) */}
      <Row className="mb-4">
        <Col>
            {renderRankingSection()}
        </Col>
      </Row>
    </Container>
  );
}