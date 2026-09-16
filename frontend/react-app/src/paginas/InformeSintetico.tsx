import React from "react";
import { useParams, Link } from "react-router-dom";
import { useInformeSinteticoCarrera } from "../hook/useInformeSinteticoCarrera";
import type { Respuesta } from "../types/InformeSintetico";
import { Container, Form, Col, Card, Tabs, Tab } from "react-bootstrap"; 

const findRespuestaPorPreguntaId = (
  preguntaId: number,
  respuesta: Respuesta | null
): React.ReactNode => {
  if (!respuesta || !respuesta.detalles) {
    return <em className="text-muted">Sin Respuesta</em>;
  }

  const detalle = respuesta.detalles.find(
    (d) => d.pregunta_opcion?.id_pregunta === preguntaId
  );
  if (detalle) {
    if (detalle.texto_respuesta_abierta) {
      return detalle.texto_respuesta_abierta;
    }
    return <em className="text-muted">N/A (Sin texto)</em>;
  }
  return <em className="text-muted">Sin Respuesta</em>;
};

export default function InformeSintetico() {
  const { id } = useParams<{ id: string }>();
  const informeId = id ? parseInt(id, 10) : null;

  const { informe, loading, error } = useInformeSinteticoCarrera(informeId);

  if (loading || !informe) {
    return <Container className="mt-4">Cargando informe...</Container>;
  }
  if (error) {
    return (
      <Container className="mt-4 alert alert-danger">
        Error: {error.message}
      </Container>
    );
  }

  return (
    <Container>
      <Col md={10} lg={8} className="mx-auto mt-4">
        <Card className="mb-4 border rounded shadow-sm">
          <Card.Header as="h4" className="bg-primary text-white">
            Informe Sintético - {informe.carrera.nombre}
          </Card.Header>
          <Card.Body className="p-4 ">
            <Card.Text as="div" className="text-start">
              <p>
                <strong>Ciclo Lectivo:</strong> {informe.ciclo_lectivo}
              </p>
              <p>
                <strong>Comisión Asesora:</strong> {informe.comision_asesora}
              </p>
              <p>
                <strong>Sede:</strong> {informe.sede}
              </p>
              <p>
                <strong>Integrantes:</strong> {informe.integrantes}
              </p>
            </Card.Text>
          </Card.Body>
        </Card>


        <Card className="mb-4 border rounded shadow-sm">
          <Card.Header as="h5" className="bg-primary text-white">
            Detalle por Asignatura
          </Card.Header>
          <Card.Body className="p-4">
            <Tabs
              defaultActiveKey={informe.informes_asignaturas[0]?.id?.toString()}
              id="informes-tabs"
              className="mb-3"
              justify
            >
              {informe.informes_asignaturas.map((informeAsignatura) => {
                const preguntas =
                  informeAsignatura.informe_curricular_base?.preguntas || [];

                return (
                  <Tab
                    key={informeAsignatura.id}
                    eventKey={informeAsignatura.id.toString()}
                    title={informeAsignatura.asignatura?.nombre || "Asignatura"}
                  >

                    <div className="py-3">
                      <div className="p-3 bg-light rounded mb-3">
                        <strong>Docente:</strong> {informeAsignatura.docente} | 
                        <strong> Año:</strong> {informeAsignatura.asignatura?.año} | 
                        <strong> Inscriptos:</strong> {informeAsignatura.cant_alumnos_insc}
                      </div>

                      {preguntas.length > 0 ? (
                        preguntas.map((pregunta) => (
                          <div key={pregunta.id} className="border-top py-3">
                            <h6 className="fw-bold">
                              {pregunta.texto_pregunta}
                            </h6>
                            <div className="ps-3">
                              {findRespuestaPorPreguntaId(
                                pregunta.id,
                                informeAsignatura.respuesta
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-3">
                          <p className="text-muted">
                            No hay preguntas definidas para este informe.
                          </p>
                        </div>
                      )}
                    </div>
                  </Tab>
                );
              })}
            </Tabs>
          </Card.Body>
        </Card>


        <Card className="mb-4 border rounded shadow-sm">
          <Card.Header as="h5" className="bg-primary text-white">
            Comentarios Finales
          </Card.Header>
          <Card.Body className="p-4">

            <Form className="mb-0">
              <Form.Group controlId="comentariosGenerales">
                <Form.Label className="fw-bold">
                  <strong>Aca va la pregunta:</strong>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Comentarios generales sobre el informe..."
                ></Form.Control>
              </Form.Group>

              <Link
                to={`/departamento/informe-sintetico/${informe.id}`}
                className="btn btn-primary btn-lg mt-4"
              >
                Guarda informe sintetico
              </Link>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  );
}