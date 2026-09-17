# Publicar la demo en internet

Para que los visitantes entren desde sus propios celulares, sin exponer tu
computadora.

## Cómo queda repartido

| Parte | Dónde | Dirección |
|---|---|---|
| Frontend (React, archivos estáticos) | **Cloudflare Pages** | `encuestas-unpsjb.pages.dev` |
| Backend (FastAPI + SQLite) | **Render** | `encuestas-unpsjb-api.onrender.com` |

> **El backend no puede ir en Cloudflare.** Workers y Pages no ejecutan procesos
> Python con SQLAlchemy y SQLite; Pages sirve solo archivos estáticos. Por eso el
> subdominio `*.workers.dev` que configuraste no aplica acá: el frontend en Pages
> usa `*.pages.dev`.

**Hay que desplegar el backend primero**, porque el frontend necesita su
dirección al compilarse.

---

## 1. Backend en Render

1. Entrá a <https://render.com> e iniciá sesión con GitHub.
2. **New → Web Service** → conectá el repositorio
   `franwe-jpg/sistema-reporte-academico-UNPSJB`.
3. Elegí la rama **`feat/mejoras-expo-2026`**.
4. Si Render detecta el archivo `render.yaml` del repo, ya viene todo cargado.
   Si te pide los datos a mano:

   | Campo | Valor |
   |---|---|
   | Root Directory | `backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt && python scripts/seed_demo.py --force` |
   | Start Command | `uvicorn src.main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | `Free` |

5. En **Environment**, agregá estas variables:

   ```
   PYTHON_VERSION = 3.12.7
   ENV            = dev
   ROOT_PATH_DEV  =            (vacía)
   DB_URL         = sqlite:///./demo.db
   CORS_ORIGINS   = *
   DEMO_RESET     = 1
   ```

6. **Create Web Service** y esperá a que termine (unos minutos).
7. Copiá la dirección que te queda, algo como
   `https://encuestas-unpsjb-api.onrender.com`.
8. Comprobá que responde abriendo `<esa dirección>/docs` en el navegador.

La base se arma durante el build, así que el sistema arranca ya con las diez
materias, los usuarios y los informes cargados.

---

## 2. Frontend en Cloudflare Pages

1. En el panel de Cloudflare: **Workers & Pages → Create → Pages →
   Connect to Git**.
2. Elegí el repositorio y la rama **`feat/mejoras-expo-2026`**.
3. Configuración de compilación:

   | Campo | Valor |
   |---|---|
   | Framework preset | `Vite` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `frontend/react-app` |

4. En **Environment variables (Production)**, agregá:

   ```
   VITE_API_URL = https://encuestas-unpsjb-api.onrender.com     ← la del paso 1
   NODE_VERSION = 20
   ```

   > `VITE_API_URL` se compila dentro del bundle. Si después cambiás la dirección
   > del backend, hay que **volver a desplegar** el frontend, no alcanza con
   > editar la variable.

5. **Save and Deploy**.
6. Te queda `https://<nombre-del-proyecto>.pages.dev`. Esa es la dirección que
   compartís con los visitantes.

---

## 3. Comprobar

1. Abrí la dirección de Pages en el celular.
2. Entrá con `44601165` / `1234`.
3. Si la pantalla queda cargando, es el backend despertándose: esperá y recargá.

---

## Lo que hay que tener en cuenta

- **El plan gratuito de Render duerme a los 15 minutos sin uso.** El primer
  acceso después de una pausa tarda unos **50 segundos**. Antes de que llegue
  cada tanda de visitantes, abrí la dirección del backend para despertarlo.
- **La base se reinicia en cada despliegue.** Es disco efímero: lo que carguen
  los visitantes se pierde cuando Render reconstruye el servicio. Para la demo
  da igual, y el botón de reinicio del login sigue funcionando.
- **El botón de reinicio queda público.** Cualquiera que abra el login puede
  reiniciar los datos. Para desactivarlo, poné `DEMO_RESET = 0` en Render.
- Para una dirección propia (`encuestas.unpsjb.edu.ar`, por ejemplo) hace falta
  un dominio registrado; los subdominios `.pages.dev` y `.onrender.com` son
  gratuitos y salen al instante.

---

## Plan B si Render falla el día de la exposición

Queda en el repo `publicar.sh`, que publica la demo desde tu propia máquina con
túneles de Cloudflare. No necesita cuenta ni deploy: da direcciones https en dos
minutos y sin arranque en frío, pero expone tu computadora mientras corre y las
direcciones son aleatorias y cambian en cada arranque.

Requiere tener instalado `cloudflared`. Es la red de emergencia, no la opción
recomendada.
