import { Button } from "react-bootstrap";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Carga el formulario con datos de ejemplo.
 *
 * Existe para las demostraciones: completar una encuesta de dieciséis preguntas
 * o un informe de seis campos a mano delante de la gente lleva varios minutos y
 * no aporta nada a lo que se quiere mostrar.
 */
export default function BotonAutocompletar({ onClick, disabled, className }: Props) {
  return (
    <Button
      type="button"
      variant="outline-secondary"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title="Completa el formulario con datos de ejemplo"
    >
      <i className="bi bi-magic me-2" />
      Completar de ejemplo
    </Button>
  );
}
