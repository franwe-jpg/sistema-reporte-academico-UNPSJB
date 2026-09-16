import { Button, Spinner } from 'react-bootstrap';
import '../styles/BotonDescargar.css'; // Asegúrate de que este archivo exista

// 1. Definimos la interfaz de las props
interface BotonDescargarProps {
    onClick: () => void; // Es una función que no retorna nada
    isGenerating: boolean; // Es verdadero o falso
}

// 2. Asignamos la interfaz al componente
export const BotonDescargar = ({ onClick, isGenerating }: BotonDescargarProps) => {
  return (
    <Button data-c2c="BotonDescargar.tsx|Button#9489"  
        className="btn-custom-red"
        onClick={onClick}
        disabled={isGenerating}
    >
        {isGenerating ? (
            <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Generando...
            </>
        ) : (
            <>
                <i className="bi bi-download me-2"></i>
                Descargar PDF
            </>
        )}
    </Button>
  );
};