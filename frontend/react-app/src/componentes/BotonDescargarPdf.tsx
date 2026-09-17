import { useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { generarPdf } from "../pdf/documentoPdf";
import type { DocumentoPdf } from "../pdf/documentoPdf";

type Props = {
  /** Arma el documento. Puede ser asincrónico si hay que pedir datos a la API. */
  construir: () => DocumentoPdf | Promise<DocumentoPdf>;
  titulo?: string;
  className?: string;
};

/**
 * Descarga en PDF un documento ya enviado, desde el listado, sin necesidad de
 * abrir antes la vista de detalle.
 */
export default function BotonDescargarPdf({
  construir,
  titulo = "Descargar en PDF",
  className = "",
}: Props) {
  const [generando, setGenerando] = useState(false);

  const descargar = async () => {
    setGenerando(true);
    try {
      generarPdf(await construir());
    } catch (err) {
      console.error("No se pudo generar el PDF:", err);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={descargar}
      disabled={generando}
      title={titulo}
      className={className}
    >
      {generando ? (
        <Spinner as="span" animation="border" size="sm" />
      ) : (
        <i className="bi bi-download" />
      )}
      <span className="ms-2 d-none d-md-inline">
        {generando ? "Generando..." : "Descargar"}
      </span>
    </Button>
  );
}
