import type { Pregunta as ApiPregunta } from "../types/Encuesta";
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form'; 
import { obtenerNombreCampo } from '../validaciones/Encuesta';

// Importamos Row, Col, y Form (ya no necesitamos Card)
import { Row, Col, Form } from 'react-bootstrap';

interface Props {
  pregunta: ApiPregunta;
  control: Control<any>;
  errors: FieldErrors;
  disabled?: boolean;
}

export default function Pregunta({
  pregunta,
  control,
  errors,
  disabled = false
}: Props) { 

  if (!pregunta || !pregunta.id) {
    console.error(
      "ERROR: El componente <Pregunta> recibió un prop 'pregunta' inválido.", 
      pregunta 
    );
    return null; 
  }

  const fieldName = obtenerNombreCampo(pregunta.id); 
  const error = errors[fieldName];

  const opcionesDeChoice = (pregunta.pregunta_opcion || []).filter(
    (po) => po && po.id_opcion_respuesta != null && po.opcion_respuesta != null
  );
  return (
    <div className="border-top py-3">
      <Row>
        <Col xs={12} className="text-start">
          
          <Form.Label as="div" className="mb-0 fw-bold">
            {pregunta.texto_pregunta}
            {pregunta.obligatoria && <span className="text-danger ms-1">*</span>}
          </Form.Label>
          
          {error && (
            <Form.Text className="text-danger d-block mt-1">
              {error.message as string}
            </Form.Text>
          )}
        </Col>

        <Col xs={12} className="text-start mt-3">
          <Controller
            name={fieldName}
            control={control}
            render={({ field }) => {
              
              switch (pregunta.tipo) {

                case 'open':
                  return (
                    <Form.Control
                      {...field}
                      as="textarea"
                      rows={3}
                      placeholder="Escriba su respuesta aquí"
                      isInvalid={!!error}
                      disabled={disabled}
                    />
                  );

                case 'single_choice':
                  return (
                    <div className="d-flex flex-column gap-3">
                      {opcionesDeChoice.map((opcion) => (
                        <Form.Check
                          {...field}
                          key={opcion.id}
                          style={{color: "rgba(0,0,0)"}}
                          type="radio"
                          id={`opcion-${opcion.id}`}
                          label={opcion.opcion_respuesta!.texto_opcion}
                          value={opcion.id_opcion_respuesta!}
                          checked={field.value == opcion.id_opcion_respuesta!}
                          onChange={() => field.onChange(opcion.id_opcion_respuesta!)}
                          isInvalid={!!error}
                          disabled={disabled}
                        />
                      ))}
                    </div>
                  );

                default:
                  console.warn(`Tipo de pregunta no reconocido: ${pregunta.tipo}`);
                  return <></>; 
              }
            }}
          />
        </Col>
      </Row>
    </div>
  );
}