import { Card, ListGroup } from "react-bootstrap";

type Opcion = { opcion_texto: string; porcentaje: number };
export type ResumenVariableData = { opciones: Opcion[] };

type Props = {
  resumen: ResumenVariableData | null;
  /** "default" | "compact" para mini-tarjeta */
  variant?: "default" | "compact";
  /** Control de sombra/borde */
  elevation?: "flat" | "soft" | "lifted";
};

export default function ResumenVariable({
  resumen,
  variant = "default",
  elevation = "flat",
}: Props) {
  const isCompact = variant === "compact";

  const elevationClass =
    elevation === "flat"
      ? "flat-card border" 
      : elevation === "soft"
      ? "shadow-sm border-0" 
      : "shadow border-0"; 

  if (
    !resumen ||
    !Array.isArray(resumen.opciones) ||
    resumen.opciones.length === 0
  ) {
    return (
      <Card className={elevationClass}>
        <Card.Body className={isCompact ? "p-3" : "p-4"}>
          <Card.Title className={isCompact ? "mb-2 fs-6" : "mb-4"}>
            <h6 className={isCompact ? "m-0 fw-semibold" : "m-0 fs-4"}>
              Resumen de la Variable:
            </h6>
          </Card.Title>
          <p className="text-muted mb-0">No hay datos disponibles.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card
      className={elevationClass}
      style={isCompact ? { fontSize: "0.9rem" } : undefined}
    >
      <Card.Body className={isCompact ? "p-3" : "p-4"}>
        <Card.Title className={isCompact ? "mb-2 fs-6" : "mb-4"}>
          <h6 className={isCompact ? "m-0 fw-semibold" : "m-0 fs-4"}>
            Resumen de la Variable:
          </h6>
        </Card.Title>

        <ListGroup variant="flush">
          {resumen.opciones.map((op, i) => (
            <ListGroup.Item
              key={i}
              className={
                isCompact
                  ? "d-flex justify-content-between align-items-center px-2 py-2"
                  : "d-flex justify-content-between align-items-center px-2 py-3"
              }
            >
              <span className={isCompact ? "text-truncate" : ""}>
                {op.opcion_texto}
              </span>
              <span
                className={
                  isCompact
                    ? "fw-semibold text-primary"
                    : "fw-bold text-primary"
                }
                style={{ fontSize: isCompact ? "0.95rem" : "1.1rem" }}
              >
                {Number(op.porcentaje) ?? 0}%
              </span>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
}
