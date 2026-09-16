import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Container,
  Form,
  Col,
  Card,
  Tabs,
  Tab,
  Button,
  Row,
  Spinner,
} from "react-bootstrap";
import type { Respuesta } from "../types/InformeSintetico";

import { useInformeSinteticoBase } from "../hook/useInformeSinteticoBase";
import { useResponderInformeSintetico } from "../hook/useResponderInformeSintetico";
import { useInformesParaSintetico } from "../hook/useInformesParaSintetico";
import { useInformesSinteticos } from "../hook/useInformesSinteticos";

import { useAlertaFlotante } from "../hook/useAlertaFlotante";
import AlertaFlotante from "../componentes/AlertaFlotante";

import "../styles/informe.css";

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

export default function GenerarInformeSintetico() {
  const { carreraId } = useParams<{ carreraId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const numCarreraId = carreraId ? parseInt(carreraId, 10) : null;
  const numCiclo = searchParams.get("ciclo")
    ? parseInt(searchParams.get("ciclo")!, 10)
    : null;
  const cuatrimestre = searchParams.get("cuatrimestre") || "";

  const { fetchInformeSinteticoBaseActual } = useInformeSinteticoBase();
  const {
    informesFiltrados,
    carrera,
    loading: loadingInformes,
  } = useInformesParaSintetico(numCarreraId, numCiclo, cuatrimestre);
  const { crearInformeSinteticoCarrera } = useInformesSinteticos();
  const {
    answersByPreguntaOpcion,
    setTextoRespuesta,
    guardarRespuestaSintetico,
  } = useResponderInformeSintetico();

  const { alerta, mostrarAlerta, cerrarAlerta } = useAlertaFlotante();

  const handleAlertExited = () => {
    if (alerta.variant === "success") {
      navigate("/departamento/informes-sinteticos");
    }
  };

  const [informeBase, setInformeBase] = useState<any>(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [comisionAsesora, setComisionAsesora] = useState("");
  const [integrantes, setIntegrantes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInformeSinteticoBaseActual()
      .then(setInformeBase)
      .catch((err) => console.error(err))
      .finally(() => setLoadingBase(false));
  }, [fetchInformeSinteticoBaseActual]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !carrera ||
        !informeBase ||
        !numCiclo ||
        !informesFiltrados ||
        !cuatrimestre
      )
        return;

      setSaving(true);

      try {
        const payloadCabecera = {
          ciclo_lectivo: numCiclo.toString(),
          cursado: cuatrimestre,
          comision_asesora: comisionAsesora,
          sede: carrera.sede,
          integrantes: integrantes,
          id_carrera: carrera.id,
          id_informe_sintetico_base: informeBase.id,
          estado: "abierto" as const,
          informes_asignaturas: informesFiltrados.map((inf) => inf.id),
        };

        const informeCreado = await crearInformeSinteticoCarrera(
          payloadCabecera
        );

        const idDepartamento = 1;
        const resultGuardado = await guardarRespuestaSintetico(
          idDepartamento,
          informeCreado.id
        );

        if (!resultGuardado.ok) {
          throw new Error(
            resultGuardado.detail ||
              "No se pudo guardar la respuesta del informe."
          );
        }

        mostrarAlerta("success", "Informe Sintético guardado ✔");
      } catch (err: any) {
        console.error(err);
        mostrarAlerta("danger", err?.message || "Error al guardar el informe.");
      } finally {
        setSaving(false);
      }
    },
    [
      carrera,
      informeBase,
      numCiclo,
      cuatrimestre,
      informesFiltrados,
      comisionAsesora,
      integrantes,
      crearInformeSinteticoCarrera,
      guardarRespuestaSintetico,
      mostrarAlerta,
    ]
  );

  if (loadingInformes || loadingBase) {
    return <Container className="mt-4">Cargando datos...</Container>;
  }
  if (!carrera)
    return (
      <Container className="mt-4 alert alert-danger">
        Error: No se pudo cargar la Carrera.
      </Container>
    );
  if (!informeBase)
    return (
      <Container className="mt-4 alert alert-danger">
        Error: No se pudo cargar la Plantilla Base.
      </Container>
    );
  if (!informesFiltrados)
    return (
      <Container className="mt-4 alert alert-danger">
        Error: informesFiltrados es nulo.
      </Container>
    );

  return (
    <Container>
      <AlertaFlotante
        show={alerta.show}
        variant={alerta.variant}
        message={alerta.message}
        onClose={cerrarAlerta}
        onExited={handleAlertExited}
      />

      <Form onSubmit={handleSubmit}>
        <Col md={10} lg={8} className="mx-auto my-4">
          <Card className="mb-4 border rounded shadow-sm bg-white">
            <Card.Header as="h4" className="bg-primary text-white">
              Generar Informe Sintético - {carrera.nombre}
            </Card.Header>
            <Card.Body className="p-4">
              <Card.Title as="h5" className="mb-3">
                {informeBase.titulo}
              </Card.Title>
              <Row>
                <Col md={6}>
                  <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={5} className="fw-semibold">
                      Ciclo Lectivo:
                    </Form.Label>
                    <Col sm={7}>
                      <Form.Control
                        type="text"
                        value={numCiclo || ""}
                        readOnly
                        plaintext
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={5} className="fw-semibold">
                      Sede:
                    </Form.Label>
                    <Col sm={7}>
                      <Form.Control
                        type="text"
                        value={carrera.sede || ""}
                        readOnly
                        plaintext
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={5} className="fw-semibold">
                      Cursado:
                    </Form.Label>
                    <Col sm={7}>
                      <Form.Control
                        type="text"
                        value={cuatrimestre}
                        readOnly
                        plaintext
                      />
                    </Col>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3" controlId="formComision">
                    <Form.Label className="fw-semibold">
                      Comisión Asesora
                      <span className="text-danger ms-1">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={comisionAsesora}
                      onChange={(e) => setComisionAsesora(e.target.value)}
                      required
                      disabled={saving}
                      placeholder="Ej: Mg. Juan Perez"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formIntegrantes">
                    <Form.Label className="fw-semibold">
                      Integrantes
                      <span className="text-danger ms-1">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={integrantes}
                      onChange={(e) => setIntegrantes(e.target.value)}
                      required
                      disabled={saving}
                      placeholder="Ej: Dr. Ana Gomez, Ing. Luis Tapia"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4 border rounded shadow-sm bg-white">
            <Card.Header as="h5" className="bg-light">
              Informes Curriculares incluídos ({informesFiltrados.length})
            </Card.Header>
            <Card.Body className="p-4">
              <Tabs
                defaultActiveKey={informesFiltrados[0]?.id?.toString()}
                id="informes-tabs"
                className="mb-3"
                justify
              >
                {informesFiltrados.map((informeAsignatura) => {
                  const preguntas =
                    informeAsignatura.informe_curricular_base?.preguntas || [];
                  return (
                    <Tab
                      key={informeAsignatura.id}
                      eventKey={informeAsignatura.id.toString()}
                      title={
                        informeAsignatura.asignatura?.nombre || "Asignatura"
                      }
                    >
                      <div className="py-3">
                        <div className="p-3 bg-light rounded mb-3">
                          <strong>Docente:</strong> {informeAsignatura.docente}{" "}
                          |<strong> Año:</strong>{" "}
                          {informeAsignatura.asignatura?.año} |
                          <strong> Alumnos:</strong>{" "}
                          {informeAsignatura.cant_alumnos_insc}
                        </div>

                        {preguntas.length > 0 ? (
                          preguntas.map((pregunta) => (
                            <div
                              key={pregunta.id}
                              className="border-top py-3 text-start"
                            >
                              <h6 className="fw-bold">
                                {pregunta.texto_pregunta}
                              </h6>
                              <div
                                className="ps-3"
                                style={{ whiteSpace: "pre-wrap" }}
                              >
                                {findRespuestaPorPreguntaId(
                                  pregunta.id,
                                  informeAsignatura.respuesta as any
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-3">
                            <p className="text-muted">
                              No hay preguntas definidas.
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

          <Card className="border rounded shadow-sm bg-white mt-5">
            <Card.Header as="h5" className="bg-primary text-white">
              Análisis y Conclusiones del Departamento
            </Card.Header>
            <Card.Body className="p-4">
              {informeBase.preguntas?.map((pregunta: any) => {
                const primeraOpcion = pregunta.pregunta_opcion?.[0];
                const idPreguntaOpcion = primeraOpcion?.id;
                const esObligatoria = pregunta.obligatoria === true;
                const idHtml = `pregunta-${idPreguntaOpcion}`;

                return (
                  <Form.Group
                    className="mb-3 text-start"
                    key={idPreguntaOpcion ?? pregunta.id}
                    controlId={idHtml}
                  >
                    <Form.Label className="fw-bold">
                      {pregunta.texto_pregunta ?? "Pregunta"}
                      {esObligatoria && (
                        <span className="text-danger ms-1">*</span>
                      )}
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={
                        idPreguntaOpcion
                          ? answersByPreguntaOpcion[idPreguntaOpcion] ?? ""
                          : ""
                      }
                      onChange={(e) => {
                        if (idPreguntaOpcion) {
                          setTextoRespuesta(idPreguntaOpcion, e.target.value);
                        }
                      }}
                      required={esObligatoria}
                      disabled={saving}
                      style={{ minHeight: "100px" }}
                    />
                  </Form.Group>
                );
              })}

              <div className="d-flex justify-content-center mt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Informe Sintético"
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Form>
    </Container>
  );
}
