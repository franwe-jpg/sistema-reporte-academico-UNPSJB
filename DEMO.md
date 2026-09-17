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

> **Para resetear entre tandas usá siempre `./reset.sh`, nunca `seed_demo.py`.**
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

**El usuario es el DNI** (no el email) y **todas las contraseñas son `1234`**.

| Rol | DNI | Persona | |
|---|---|---|---|
| Alumno | `44601165` | Franco Soler | ← para la demo |
| Alumno | `44850306` | Nicolás Arenas | |
| Docente | `1001` | Leonardo Ordinez | ← para la demo |
| Departamento | `2001` | Claudia López | ← para la demo |
| Admin | `1111` | Admin Sistema | |

Los demás docentes, por si querés mostrar otra cátedra:

| DNI | Docente | Materia |
|---|---|---|
| `1002` | Lucy Marticorena | Programación Orientada a Objetos |
| `1003` | Lautaro Pecile | Paradigmas y Lenguajes de Programación |
| `1004` | Cristian Parise | Bases de Datos II |
| `1005` | Sebastián Schanz | Ingeniería de Software I |
| `1006` | Guillermo Zamora | Aspectos Legales y Profesionales |
| `1007` | Bruno Zapellini | Administración de Redes y Seguridad |
| `1008` | Diego Firmenitch | Fundamentos Teóricos de Informática |
| `1009` | Carlos | Álgebra |

### Crear un usuario en el momento

En la pantalla de login, **"Solicitar alta de nuevo usuario"** abre un formulario
que pide solo nombre, apellido, DNI y contraseña. Sirve para dar de alta al chico
al que le estás enseñando y que vea su propio nombre en el sistema.

El alta:

- crea la persona con **perfil de alumno**,
- **lo inscribe automáticamente** en las materias que tienen encuesta abierta, así
  entra y ya tiene las 3 encuestas pendientes,
- e **inicia sesión sola**, sin volver a pedir credenciales.

El usuario creado así desaparece con el próximo `./reset.sh`.

### Si te olvidás una contraseña

**"¿Olvidaste tu contraseña?"** pide el DNI y *"última contraseña que recuerdes"*.
Al continuar aparece un tercer campo, **Nueva contraseña**, y esa es la que queda
guardada. No hay restricciones de longitud ni de complejidad.

> El campo de la contraseña anterior **no se valida ni se guarda**: es una
> verificación informal. Alcanza con que el DNI exista. Está bien para una demo,
> no para producción.

---

## 5. Atajos para no perder tiempo en vivo

**Botón "Completar de ejemplo"** — está en los tres formularios: la encuesta del
alumno, el informe de actividad curricular del docente y el informe sintético del
departamento. Carga todos los campos de una (en la encuesta marca las opciones
más positivas) para que no tengas que completar dieciséis preguntas a mano
delante de la gente. Después revisás y enviás.

**Botón "Cerrar y generar reporte"** — en el panel del docente, arriba del
listado, aparece la tarjeta **Encuestas en curso** con las encuestas abiertas de
sus materias y cuántas respuestas llevan. Mientras una encuesta sigue abierta no
existe su reporte, así que no hay nada que informar. Ese botón hace lo mismo que
el proceso automático cuando vence la fecha: la cierra y consolida el reporte.

Con esos dos, el circuito completo se puede recorrer en pocos minutos:

> el chico se da de alta y responde → Leo cierra esa encuesta y genera el reporte
> → hace el informe sobre **esa misma respuesta** → Claudia consolida la carrera.

---

## 6. Guion de la demo

Los tres roles forman una cadena: **lo que hace cada uno habilita al siguiente**.
Ese es el punto que conviene que se lleven.

### Alumno — responder una encuesta *(~3 min)*

1. Entrar con `44601165` / `1234` (Franco Soler), o crear al chico en el momento
   con **"Solicitar alta de nuevo usuario"**.
2. **Encuestas pendientes**: tiene 3 materias esperando respuesta
   (Desarrollo de Software, Programación Orientada a Objetos y
   Administración de Redes y Seguridad).
3. Abrir una. Recorrer las solapas por variable
   (B a F: teóricas, prácticas, evaluaciones, docente, infraestructura).
4. Contestar y enviar.
5. Ir a **Encuestas respondidas**: aparece ahí, en modo lectura.
   → *"No la puede editar ni borrar, y el docente nunca va a ver que la
   respondió ella. Es anónima."*

### Docente — leer el reporte y hacer el informe *(~5 min)*

1. Salir y entrar con `1001` / `1234` (Leonardo Ordinez).
2. Ve **2 reportes generados** (Ingeniería de Software I, ya informado, y
   Fundamentos Teóricos de Informática, pendiente) y, arriba, la tarjeta
   **Encuestas en curso** con Desarrollo de Software.
   → *"El reporte no lo armó nadie: lo genera el sistema cuando cierra la
   encuesta."*
3. En **Fundamentos Teóricos** → **Ver Reporte**: porcentajes por pregunta,
   inscriptos y encuestas procesadas.
4. **Ver Estadísticas**: participación, satisfacción, promedio por variable y
   la torta.
5. Bajar hasta **Comparativa de Scores** → comparar contra **2025**: la materia
   mejoró en todas las variables.
   → *"Esto es la regla RN-16: el docente puede medir su evolución."*
6. Para hacer el informe hay **dos caminos**:
   - **Rápido**: *Fundamentos Teóricos de Informática* ya tiene su reporte listo
     → **Nuevo Informe**.
   - **Completo** (el que muestra la cadena): arriba del listado está la tarjeta
     **Encuestas en curso** con *Desarrollo de Software* y las respuestas
     recibidas —incluida la del chico que acaba de responder—. **Cerrar y
     generar reporte** consolida esas respuestas, y recién ahí aparece en el
     listado con **Nuevo Informe**.
7. Completar con **"Completar de ejemplo"** y enviar.
   → *"Desde que lo envía, queda cerrado. No se modifica ni se borra."*

### Departamento — consolidar la carrera *(~4 min)*

1. Salir y entrar con `2001` / `1234` (Claudia López).
2. **Informes sintéticos**: hay dos filas de Licenciatura en Sistemas, una por
   cuatrimestre. La del **2.º cuatrimestre** suma el informe que acaba de hacer
   Leo y tiene **Generar**; la del 1.º ya está presentada y muestra
   **Ver informe**.
3. **Generar** → se cargan los informes del período como insumo. Completar
   comisión asesora, integrantes y conclusiones. Enviar.
4. **Estadísticas**: asignaturas evaluadas, docentes, respuestas, satisfacción
   global, participación por variable y alertas.
5. Filtrar por **Ciclo Básico** → aparece la alerta
   **Participación · Álgebra · Sin respuestas**.
   → *"El sistema detecta solo las materias donde nadie contestó."*

---

## 7. Qué hay en la base

Todo sobre la carrera real: **Licenciatura en Sistemas**, sede Trelew, con
**10 materias del plan 2010** y sus docentes reales.

| Materia | Año | Cursado | Docente |
|---|---|---|---|
| Álgebra | 1.º | 1.er cuat. | Carlos |
| Ingeniería de Software I | 3.º | 1.er cuat. | Sebastián Schanz |
| Bases de Datos II | 4.º | 1.er cuat. | Cristian Parise |
| Paradigmas y Lenguajes de Programación | 4.º | 1.er cuat. | Lautaro Pecile |
| Análisis Matemático | 1.º | 2.º cuat. | Claudia López |
| Programación Orientada a Objetos | 2.º | 2.º cuat. | Lucy Marticorena |
| **Desarrollo de Software** | 3.º | 2.º cuat. | **Leonardo Ordinez** |
| Fundamentos Teóricos de Informática | 3.º | 2.º cuat. | Diego Firmenitch |
| Aspectos Legales y Profesionales | 4.º | 2.º cuat. | Guillermo Zamora |
| Administración de Redes y Seguridad | 4.º | 2.º cuat. | Bruno Zapellini |

Y además:

- **35 personas**: 24 alumnos, 9 docentes, 1 departamento, 1 admin.
- **Cada materia tiene una sola encuesta por ciclo lectivo**: o está abierta o ya
  cerró. Nunca las dos, para que una misma materia no aparezca al mismo tiempo
  en "pendientes" y en "respondidas".
  - **3 abiertas** hasta el 12/12/2026 (Desarrollo de Software, Programación
    Orientada a Objetos, Administración de Redes y Seguridad) → lo pendiente del
    alumno. Al no haber cerrado, **todavía no tienen reporte**.
  - **7 cerradas**, que generaron sus reportes.
  - **2 de 2025** (Desarrollo de Software y Fundamentos Teóricos), que alimentan
    la comparativa interanual.
- **6 informes curriculares cerrados**. El de *Fundamentos Teóricos* queda sin
  hacer a propósito: es el atajo del docente.
- **1 informe sintético** presentado (1.er cuatrimestre). El del 2.º queda
  pendiente: es el paso en vivo del departamento.
- **Franco y Nicolás** tienen 3 encuestas pendientes y 2 respondidas, de
  **materias distintas**, así el historial no se confunde con lo pendiente.
- **Álgebra** no tiene ninguna respuesta, para que dispare la alerta de
  participación.

Los datos son deterministas (semilla fija): después de cada reset, los números
son exactamente los mismos.

---

## 8. Cosas a tener en cuenta

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
- **Claudia López** figura como docente de Análisis Matemático pero en el sistema
  tiene **solo el rol de departamento**, para que al entrar caiga directo en su
  panel. Si querés que además vea el panel docente, avisá y le sumo ese rol
  (entraría primero a /docente y tendría que ir a Inicio para cambiar).
- Del docente de **Álgebra** solo tenemos el nombre de pila: figura como
  "Carlos" y su usuario quedó con apellido `N.N.`. Pasame el apellido y lo
  corrijo.
- Las fechas del calendario académico están fijas en el código
  (`frontend/react-app/src/calendarioAcademico.ts`). Hoy están puestas para
  2026 y las seis ventanas (encuesta / informe curricular / sintético, por
  cuatrimestre) están abiertas hoy. Después del **12/12/2026** empiezan a
  cerrarse y hay que correrlas.

---

## 9. Qué se cambió para esta demo

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
| `backend/src/auth/` | Nuevo `POST /auth/recuperar-password` | Cambiar la contraseña desde el login, sin depender de recordar la anterior |
| `backend/src/auth/` | Nuevo `POST /auth/registro` | Alta de alumno desde el login, para crear al visitante en el momento |
| `backend/src/reportes/` | Nuevos `GET /reportes/encuestas-abiertas` y `POST /reportes/desde-encuesta/{id}` | Sin esto el docente no puede ver la respuesta que acaba de dejar el visitante: el reporte solo existe cuando la encuesta cierra |
| `frontend/.../EncuestasEnCurso.tsx` | Nuevo: encuestas abiertas + "Cerrar y generar reporte" | Expone la operación anterior en el panel del docente |
| `frontend/.../BotonAutocompletar.tsx` y `datosDeEjemplo.ts` | Nuevos: botón "Completar de ejemplo" en los tres formularios | Completar 16 preguntas a mano en vivo no aporta nada |
| `frontend/.../LoginPage.tsx` | "Solicitar alta de nuevo usuario" ahora abre un formulario real | El link existía con `href="#"` y no hacía nada |
| `frontend/.../LoginPage.tsx` | Se lee `permData.nombre` además de `nombres` | El menú mostraba solo el apellido |
| `backend/scripts/` | Nuevos: `seed_demo.py`, `reset_demo.py`, `verificar_demo.py` | No existía ningún seed en el repo |
| `demo.sh`, `DEMO.md`, `.claude/launch.json` | Nuevos | Arranque y guion |

`backend/demo.db` y `backend/demo_snapshot.db` no se versionan (`*.db` ya está
en `.gitignore`). Se regeneran con `seed_demo.py`.
