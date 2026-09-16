# Guía de la demo — Universidad Abierta

Todo lo necesario para mostrar el sistema funcionando, con la base cargada y un
guion de recorrido para cada tanda de visitantes.

---

## 1. Preparación (una sola vez)

```bash
python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt
(cd frontend/react-app && npm install)
backend/venv/bin/python backend/scripts/seed_demo.py
```

El archivo `backend/.env` ya está creado y no se versiona. Contiene:

```
ENV=dev
ROOT_PATH_DEV=
DB_URL=sqlite:///./demo.db
```

## 2. Arrancar

Si ya tenes tu forma de levantar back y front, usala: lo unico que importa es
que el backend quede en el puerto 8000 y el frontend en el 5173.

`./demo.sh` es solo un atajo que levanta los dos juntos y corta los dos con
`Ctrl+C`:

```bash
./demo.sh
```

> El backend acepta CORS **solo** desde `http://localhost:5173`. Usá
> `localhost`, nunca `127.0.0.1`, o el navegador va a bloquear cada pedido.

## 3. Reset entre tandas

Desde otra terminal, **sin cortar nada**:

```bash
./reset.sh
```

Tarda menos de un segundo. Usa la API de backup de SQLite para sobrescribir la
base en el lugar, así que las conexiones que el backend tiene abiertas siguen
sirviendo y **no hace falta reiniciarlo**. Refrescá el navegador y listo.

Si querés empezar la jornada de cero: `./demo.sh --reset`.

> **Para resetear entre tandas usá siempre `reset_demo.py`, nunca `seed_demo.py`.**
> El seed rehace el esquema (DDL), y el backend mantiene un pool de conexiones
> SQLite que sobrevive a eso: algunas seguirían devolviendo filas viejas, y el
> sistema empieza a mostrarse inconsistente (un informe recién enviado que no
> aparece en el listado de reportes, por ejemplo). El seed detecta que el backend
> está levantado y se niega a correr, justamente para evitarlo. Si alguna vez lo
> forzás con `--force`, reiniciá el backend después.

Para confirmar que la base quedó sana antes de arrancar:

```bash
backend/venv/bin/python backend/scripts/verificar_demo.py
```

## 4. Usuarios

**El usuario es el DNI**, no el email.

| Rol | DNI | Contraseña | Persona |
|---|---|---|---|
| Alumno | `45123456` | `alumno123` | Sofía Ailén Núñez |
| Docente | `24876543` | `docente123` | Ana Beatriz Ferreyra |
| Departamento | `20345678` | `depto123` | Marcela Inés Quiroga |
| Admin | `35111222` | `admin123` | Franco Soler |

El resto de los alumnos y docentes sembrados usan `alumno123` / `docente123`.

---

## 5. Guion de la demo

Los tres roles forman una cadena: **lo que hace cada uno habilita al siguiente**.
Ese es el punto que conviene que se lleven.

### Alumno — responder una encuesta *(~3 min)*

1. Entrar con `45123456` / `alumno123`.
2. **Encuestas pendientes**: tiene 3 materias esperando respuesta.
3. Abrir **Desarrollo de Software**. Recorrer las solapas por variable
   (B a F: teóricas, prácticas, evaluaciones, docente, infraestructura).
4. Contestar y enviar.
5. Ir a **Encuestas respondidas**: aparece ahí, en modo lectura.
   → *"No la puede editar ni borrar, y el docente nunca va a ver que la
   respondió ella. Es anónima."*

### Docente — leer el reporte y hacer el informe *(~5 min)*

1. Salir y entrar con `24876543` / `docente123`.
2. **Listado de reportes disponibles**: tiene 3 materias.
   → *"El reporte no lo armó nadie: lo genera el sistema cuando cierra la
   encuesta."*
3. En **Desarrollo de Software** → **Ver Reporte**: porcentajes por pregunta,
   20 inscriptos, 15 encuestas procesadas.
4. **Ver Estadísticas**: participación 75%, satisfacción 81%, promedio por
   variable y la torta.
5. Bajar hasta **Comparativa de Scores** → comparar contra **2025**: mejoras de
   +17 a +31 puntos en todas las variables.
   → *"Esto es la regla RN-16: el docente puede medir su evolución."*
6. Volver al listado → **Nuevo Informe** (solo está habilitado en su materia;
   las otras dos ya tienen informe hecho).
7. Completar inscriptos / comisiones y los campos de texto. Enviar.
   → *"Desde que lo envía, queda cerrado. No se modifica ni se borra."*

### Departamento — consolidar la carrera *(~4 min)*

1. Salir y entrar con `20345678` / `depto123`.
2. **Informes sintéticos**: Licenciatura en Sistemas ahora muestra **5**
   informes (los 4 que ya estaban más el que acaba de hacer Ana).
3. **Generar** → se cargan los informes de la carrera como insumo. Completar
   comisión asesora, integrantes y conclusiones. Enviar.
4. **Estadísticas**: 9 asignaturas, 6 docentes, 74 respuestas, 71% de
   satisfacción global, participación por variable y alertas.
5. En **Alertas y Observaciones**, al final de la lista:
   **Participación · Análisis Matemático I · Sin respuestas**.
   → *"El sistema detecta solo las materias donde nadie contestó."*
   Si querés aislarla, filtrá por **Ciclo Básico**: quedan 5 alertas y esa
   sobresale.

---

## 6. Qué hay en la base

- **2 carreras** (Lic. en Sistemas, APU) y **6 asignaturas**, todas de
  1.º cuatrimestre, sede Trelew.
- **32 personas**: 24 alumnos, 6 docentes, 1 departamento, 1 admin.
- **10 encuestas de asignatura**:
  - las de **2025**, cerradas, que alimentan la comparativa interanual;
  - las de **2026 ya cerradas**, que generaron los 6 reportes;
  - **3 abiertas** hasta el 12/12/2026, que son las pendientes del alumno.
- **5 informes curriculares cerrados**. El de *Desarrollo de Software* queda
  abierto a propósito: es el paso en vivo del docente.
- **1 informe sintético** ya presentado (APU). El de Lic. en Sistemas queda
  pendiente: es el paso en vivo del departamento.
- **Análisis Matemático I** no tiene ninguna respuesta, para que dispare la
  alerta de participación.

Los datos son deterministas (semilla fija): después de cada reset, los números
son exactamente los mismos.

---

## 7. Cosas a tener en cuenta

- **No uses el link "Ver" de Departamento → Informes curriculares.** El endpoint
  `/respuestas/` filtra siempre por la persona del token, así que el
  departamento ve el formulario con todos los campos vacíos. Mostrá los informes
  desde la cuenta del docente.
- **La sesión dura 60 minutos** y el frontend no avisa cuando vence: si algo
  deja de cargar después de un rato, volvé a iniciar sesión.
- El panel de alertas muestra **como máximo 8**, ordenadas por severidad (Alta,
  Media, Baja). Con los datos actuales la alerta de participación entra justo en
  el último lugar; si alguna vez no aparece, filtrá por "Ciclo Básico".
- Las tarjetas con el resumen de las variables B–E dentro del formulario del
  informe curricular se renderizan **solo al lado de la pregunta con `id === 35`**
  (está hardcodeado en `InformeCurricular.tsx`). El seed es determinista y deja
  esa pregunta justo en el id 35, así que funciona; pero si cambiás la cantidad
  de preguntas de las encuestas, las tarjetas desaparecen.
- Las fechas del calendario académico están fijas en el código
  (`frontend/react-app/src/calendarioAcademico.ts`). Hoy están puestas para
  2026; después del **12/12/2026** los botones de "Nuevo Informe" y "Generar"
  se deshabilitan y hay que correr las ventanas.

---

## 8. Qué se cambió para esta demo

Rama `feat/mejoras-expo-2026`, sobre `main` con `dev` ya mergeado.

| Archivo | Cambio | Por qué |
|---|---|---|
| `frontend/.../calendarioAcademico.ts` | Ventanas movidas de 2025 a 2026/2027 | Con las fechas viejas, **todos** los botones de acción salían "Fuera de término" |
| `frontend/.../EstadisticasDepartamentoPage.tsx` | Año por defecto y opciones derivadas de la fecha actual | Estaba fijo en 2025/2024 y el dashboard salía vacío |
| `frontend/.../EstadisticasDocentePage.tsx` | Etiqueta y año de comparación derivados de la fecha actual | Decía "Actual (2025)" y ofrecía "2024" fijo |
| `frontend/.../hook/useInscriptos.ts` | Nuevo: cuenta inscriptos desde las cursadas | Reemplaza los valores fijos de abajo |
| `frontend/.../Reporte.tsx` | "Total inscriptos" ya no es el literal `25` | Contradecía los datos reales |
| `frontend/.../EstadisticasDocentePage.tsx` | `inscriptos` ya no es el literal `2` | Con 15 respuestas la participación mostraba 750% |
| `backend/src/estadisticas/services.py` | `_calcular_top` usa cursadas reales | Mostraba "Inscriptos (Est.): 50" para toda materia |
| `backend/src/estadisticas/router.py` | Ciclo por defecto = año actual | Estaba fijo en 2025 |
| `frontend` (varios) | Se quitaron 8 variables/imports sin usar | `npm run build` fallaba por `TS6133` |
| `backend/scripts/` | Nuevos: `seed_demo.py`, `reset_demo.py`, `verificar_demo.py` | No existía ningún seed en el repo |
| `demo.sh`, `DEMO.md`, `.claude/launch.json` | Nuevos | Arranque y guion |

`backend/demo.db` y `backend/demo_snapshot.db` no se versionan (`*.db` ya está
en `.gitignore`). Se regeneran con `seed_demo.py`.
