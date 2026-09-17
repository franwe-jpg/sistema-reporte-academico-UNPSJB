import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import apiFetch from "../api/client";

/**
 * Devuelve la base de demostración a su punto inicial, entre una tanda de
 * visitantes y la siguiente, sin salir del navegador.
 *
 * Solo aparece si el backend tiene el reinicio habilitado (variable DEMO_RESET)
 * y existe el snapshot. Pide confirmación porque borra todo lo cargado.
 */
export default function BotonReiniciarDemo() {
  const [disponible, setDisponible] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await apiFetch("/demo/estado");
        if (!res.ok) return;
        const { habilitado, hay_snapshot } = await res.json();
        if (!cancelado) setDisponible(Boolean(habilitado && hay_snapshot));
      } catch {
        /* sin backend disponible, el botón simplemente no se muestra */
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const reiniciar = useCallback(async () => {
    setReiniciando(true);
    setResultado(null);
    try {
      const res = await apiFetch("/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      setResultado({ ok: true, texto: "Datos reiniciados. Ya podés empezar de nuevo." });
    } catch {
      setResultado({ ok: false, texto: "No se pudo reiniciar. Probá de nuevo." });
    } finally {
      setReiniciando(false);
      setConfirmando(false);
    }
  }, []);

  if (!disponible) return null;

  return (
    <div className="border-top mt-3 pt-3 text-center">
      {resultado && (
        <Alert
          variant={resultado.ok ? "success" : "danger"}
          className="py-2 small mb-2"
        >
          {resultado.texto}
        </Alert>
      )}

      {!confirmando ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="text-secondary text-decoration-none p-0"
          onClick={() => {
            setResultado(null);
            setConfirmando(true);
          }}
        >
          <i className="bi bi-arrow-counterclockwise me-2" />
          Reiniciar datos de la demostración
        </Button>
      ) : (
        <div className="d-flex flex-column gap-2">
          <span className="small text-muted">
            Se borra todo lo cargado y vuelve al punto inicial. ¿Seguro?
          </span>
          <div className="d-flex justify-content-center gap-2">
            <Button
              type="button"
              variant="outline-danger"
              size="sm"
              onClick={reiniciar}
              disabled={reiniciando}
            >
              {reiniciando ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Reiniciando...
                </>
              ) : (
                "Sí, reiniciar"
              )}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              onClick={() => setConfirmando(false)}
              disabled={reiniciando}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
