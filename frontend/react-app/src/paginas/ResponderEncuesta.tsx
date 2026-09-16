import { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Form,      
    Button,    
    Alert,     
    Spinner,
    Col,
    Row,
    Card,
    Tabs,
    Tab
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useResponderEncuesta } from '../hook/useResponderEncuesta';
import Variable from '../componentes/Variable';
import {
    construirEsquemaEncuesta,
    construirValoresPorDefecto,
    obtenerNombreCampo
} from '../validaciones/Encuesta';

import { useAlertaFlotante } from '../hook/useAlertaFlotante';
import AlertaFlotante from '../componentes/AlertaFlotante';

type SurveyFormData = Record<string, any>;

function ResponderEncuesta() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const idEncuesta = id ? Number(id) : null;

    const {
        encuesta,
        asignatura,
        loading,
        error,
        guardarRespuestas
    } = useResponderEncuesta(idEncuesta);

    const { alerta, mostrarAlerta, cerrarAlerta } = useAlertaFlotante();

    const handleAlertExited = () => {
        if (alerta.variant === 'success') {
            navigate('/alumno');
        }
    };

    const { defaultValues, schema } = useMemo(() => {
        if (!encuesta || !encuesta.variables) {
            return { defaultValues: {}, schema: undefined };
        }
        return {
            defaultValues: construirValoresPorDefecto(encuesta),
            schema: construirEsquemaEncuesta(encuesta)
        };
    }, [encuesta]);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        trigger
    } = useForm<SurveyFormData>({
        defaultValues: defaultValues,
        resolver: schema ? zodResolver(schema) : undefined,
        mode: 'onChange' 
    });

    const [activeTab, setActiveTab] = useState<string | null>(null);

    useEffect(() => {
        reset(defaultValues); 
    }, [defaultValues, reset]);

    useEffect(() => {
        if (encuesta && encuesta.variables && encuesta.variables.length > 0 && activeTab === null) {
            setActiveTab(encuesta.variables[0].id.toString());
        }
    }, [encuesta, activeTab]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    };

    const onSubmit = async (data: SurveyFormData) => {
        try {
            const idPersona = 1; 
            const resultado = await guardarRespuestas(idPersona, data);
            
            const ok = typeof resultado === "object" ? resultado?.ok !== false : !!resultado;

            if (ok) {
                mostrarAlerta("success", "¡Encuesta guardada con éxito! ✔");
            } else {
                mostrarAlerta("danger", "No se pudieron guardar las respuestas.");
            }
        } catch (err: any) {
            console.error(err);
            mostrarAlerta("danger", err?.message || "Ocurrió un error inesperado.");
        }
    };

    if (loading) return <Container className="py-4 text-center"><Spinner animation="border" /></Container>;
    if (!encuesta || !encuesta.variables) return <Container className="py-4 text-center"><Alert variant="danger">Error al cargar.</Alert></Container>;
    if (encuesta.variables.length === 0) return <Container className="py-4 text-center"><Alert variant="info">No hay preguntas.</Alert></Container>;
    if (activeTab === null) return <Container className="py-4 text-center">Iniciando...</Container>;

    const activeTabIndex = encuesta.variables.findIndex(v => v.id.toString() === activeTab);
    const isLastTab = activeTabIndex === encuesta.variables.length - 1;
    
    if (activeTabIndex === -1) {
        setActiveTab(encuesta.variables[0].id.toString());
        return null;
    }

    const handlePrevious = (e: React.MouseEvent) => {
        e.preventDefault(); 
        const previousTabKey = encuesta.variables[activeTabIndex - 1].id.toString();
        setActiveTab(previousTabKey);
    };

    const validateCurrentTab = async () => {
        const currentVariable = encuesta.variables[activeTabIndex];
        const fieldsToValidate = currentVariable.preguntas
            .filter(p => p.obligatoria && p.tipo === 'single_choice')
            .map(p => obtenerNombreCampo(p.id));
        
        if (fieldsToValidate.length === 0) return true;
        return await trigger(fieldsToValidate);
    };

    const handleNext = async (e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        const isValid = await validateCurrentTab();
        if (isValid) {
            const nextTabKey = encuesta.variables[activeTabIndex + 1].id.toString();
            setActiveTab(nextTabKey);
        }
    };

    const handleTabSelect = async (key: string | null) => {
        if (key === null || key === activeTab) return;
        const newTabIndex = encuesta.variables.findIndex(v => v.id.toString() === key);
        
        if (newTabIndex < activeTabIndex) {
            setActiveTab(key);
            return;
        }
        const isValid = await validateCurrentTab();
        if (isValid) {
            setActiveTab(key);
        }
    };

    return (
        <Container className="py-4">
          
          <AlertaFlotante 
            show={alerta.show}
            variant={alerta.variant}
            message={alerta.message}
            onClose={cerrarAlerta}
            onExited={handleAlertExited}
          />

          <Row>
            <Col md={8} className="mx-auto">
              <Card className="border rounded shadow-sm bg-white">
                <Card.Header as="h4" className="bg-primary text-white text-center">
                  {asignatura?.nombre}
                </Card.Header>
                <Card.Body className="p-4">
                  <Form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}> 
                    
                    {error && <Alert variant="danger" className="mb-3">Error: {error}</Alert>}
                    
                    <Tabs
                      activeKey={activeTab}
                      onSelect={handleTabSelect} 
                      id="variable-tabs"
                      className="mb-3"
                      transition={false}
                    >
                      {encuesta.variables.map(variable => (
                        <Tab
                          key={variable.id}
                          eventKey={variable.id.toString()} 
                          title={variable.codigo}
                        >
                          <div className="py-3">
                            <Variable
                                variable={variable}
                                control={control}
                                errors={errors}
                            />
                          </div>
                        </Tab>
                      ))}
                    </Tabs>

                    {Object.keys(errors).length > 0 && (
                        <Alert variant="warning" className="mt-4">
                            Debes completar <strong>{Object.keys(errors).length}</strong> preguntas obligatorias marcadas en rojo.
                        </Alert>
                    )}

                    <div className="d-flex justify-content-between mt-4">
                      <Button 
                          variant="secondary" 
                          onClick={handlePrevious}
                          disabled={activeTabIndex === 0}
                          type="button"
                      >
                          Anterior
                      </Button>

                      <Button
                        variant="primary"
                        type={isLastTab ? "submit" : "button"}
                        onClick={isLastTab ? undefined : handleNext}
                        disabled={isSubmitting}
                      >
                        {isLastTab ? (
                            isSubmitting ? (
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
                                'Guardar Respuestas'
                            )
                        ) : (
                            "Siguiente"
                        )}
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>  
          </Row>
        </Container>
    );
}

export default ResponderEncuesta;