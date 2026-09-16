import Form from "react-bootstrap/Form";
import Pregunta from "./Pregunta";
import type { Variable as ApiVariable } from "../types/Encuesta";
import type { Control, FieldErrors } from 'react-hook-form';

interface Props {
  variable: ApiVariable;
  control: Control<any>;
  errors: FieldErrors;
  disabled?: boolean;
}

export default function Variable({
  variable,
  control,
  errors,
  disabled = false
}: Props) { 


  if (!variable) {
    console.error("ERROR: El componente Variable recibió una prop 'variable' nula o undefined.");
    return null; 
  }


  const preguntasLimpias = (variable.preguntas || []).filter(p => p && p.id != null);

  if (variable.preguntas && variable.preguntas.length !== preguntasLimpias.length) {
    console.warn("ADVERTENCIA: Se filtraron preguntas 'sucias' (null o sin ID) de la variable:", variable.nombre);
  }

  return (
    <Form.Group as="fieldset" className="border p-3 mt-4 rounded" disabled={disabled}>
      <div className="h5 w-auto px-2 mb-3 fw-bold">
        {variable.nombre}
      </div>
      {preguntasLimpias.map((pregunta) => (
        <Pregunta
          key={pregunta.id}
          pregunta={pregunta}
          control={control}
          errors={errors}
          disabled={disabled} 
        />
      ))}
    </Form.Group>
  );
}