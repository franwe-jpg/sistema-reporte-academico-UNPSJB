import { useState, useEffect, useCallback } from 'react';

type Variant = "success" | "danger" | "warning" | "info";

interface AlertaState {
    show: boolean;
    variant: Variant;
    message: string;
}

export function useAlertaFlotante() {
    const [alerta, setAlerta] = useState<AlertaState>({
        show: false,
        variant: "success",
        message: ""
    });

    const mostrarAlerta = useCallback((variant: Variant, message: string) => {
        setAlerta({ show: true, variant, message });
    }, []);

    const cerrarAlerta = useCallback(() => {
        setAlerta(prev => ({ ...prev, show: false }));
    }, []);

    useEffect(() => {
        if (alerta.show) {
            const timer = setTimeout(() => {
                setAlerta(prev => ({ ...prev, show: false }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [alerta.show]);

    return { 
        alerta, 
        mostrarAlerta, 
        cerrarAlerta 
    };
}