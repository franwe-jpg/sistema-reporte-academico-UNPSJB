import { Alert, Fade } from 'react-bootstrap'; 

interface Props {
    show: boolean;
    variant: string;
    message: string;
    onClose: () => void;
    onExited?: () => void;
}

export default function AlertaFlotante({ show, variant, message, onClose, onExited }: Props) {
    
    return (
        <div 
            className="position-fixed top-0 start-50 translate-middle-x mt-4" 
            style={{ 
                zIndex: 1050, 
                minWidth: "300px", 
                maxWidth: "90%",
                pointerEvents: 'none' 
            }}
        >
            <Fade in={show} onExited={onExited} unmountOnExit>
                <div> 
                    <Alert 
                        variant={variant} 
                        onClose={onClose}
                        dismissible
                        className="shadow-lg text-center fw-bold mb-0"
                        style={{ pointerEvents: 'auto' }}
                    >
                        {message}
                    </Alert>
                </div>
            </Fade>
        </div>
    );
}