import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, ListGroup, Spinner } from "react-bootstrap";
import apiFetch from "../api/client";

type EncuestaAbierta = {
  id: number;
  asignatura: string;
  ciclo_lectivo: number;
  fecha_fin: string;
  respuestas: number;
};

type Props = {
  /** Se llama después de cerrar una encuesta, para refrescar el listado de reportes. */
  onReporteGenerado?: () => void;
};

/**
 * Encuestas todavía abiertas de las materias que integra el docente.
 *
 * Mientras una encuesta sigue abierta no existe su reporte, así que no hay nada
 * que informar. El cierre lo hace normalmente el proceso automático cuando vence
 * la fecha (RN-09); acá se ofrece la misma operación a pedido, para poder
 * consolidar el reporte sin esperar al vencimiento.
 */
export default function EncuestasEnCurso({ onReporteGenerado }: Props) {
  const [encuestas, setEncuestas] = useState<EncuestaAbierta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cerrandoId, setCerrandoId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const res = await apiFetch("/reportes/encuestas-abiertas");
      if (!res.ok) throw new Error("No se pudieron leer las encuestas en curso");
      setEncuestas(await res.json());
      setError("");
    } catch {
      setEncuestas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cerrar = async (id: number) => {
    setCerrandoId(id);
    setError("");
    try {
      const res = await apiFetch(`/reportes/desde-encuesta/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("No se pudo cerrar la encuesta");
      await cargar();
      onReporteGenerado?.();
    } catch {
      setError("No se pudo cerrar la encuesta. Intentá de nuevo.");
    } finally {
      setCerrandoId(null);
    }
  };

  if (cargando) return null;
  if (encuestas.length === 0) return null;

  return (
    <Card className="border rounded shadow-sm mb-4">
      <Card.Header as="h5" className="bg-secondary text-white">
        Encuestas en curso
      </Card.Header>

      <Card.Body className="pb-0">
        <p className="text-muted small text-start mb-0">
          Todavía están abiertas, así que aún no tienen reporte. Al cerrarlas se
          consolidan las respuestas recibidas y ya podés elaborar el informe.
        </p>
      </Card.Body>

      {error && (
        <Alert variant="danger" className="mx-3 mt-3 mb-0 py-2 small">
          {error}
        </Alert>
      )}

      <ListGroup variant="flush">
        {encuestas.map((e) => (
          <ListGroup.Item key={e.id} className="d-flex align-items-center">
            <div className="flex-grow-1 text-start">
              <span className="fw-bold">{e.asignatura}</span>
              <div className="small text-muted">
                Ciclo {e.ciclo_lectivo} · cierra el{" "}
                {new Date(`${e.fecha_fin}T00:00:00`).toLocaleDateString("es-AR")} ·{" "}
                <span className="fw-semibold">
                  {e.respuestas} {e.respuestas === 1 ? "respuesta" : "respuestas"}
                </span>{" "}
                recibidas
              </div>
            </div>

            <Button
              variant="outline-secondary"
              size="sm"
              disabled={cerrandoId === e.id}
              onClick={() => cerrar(e.id)}
            >
              {cerrandoId === e.id ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Cerrando...
                </>
              ) : (
                "Cerrar y generar reporte"
              )}
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
}
