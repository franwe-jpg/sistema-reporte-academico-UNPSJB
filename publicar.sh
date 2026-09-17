#!/usr/bin/env bash
#
# Publica la demo en internet con dos túneles de Cloudflare, para que los
# visitantes entren desde sus propios celulares.
#
#   ./publicar.sh
#
# Levanta el backend y el frontend en esta máquina y los expone con direcciones
# https públicas. No hace falta cuenta de Cloudflare ni abrir puertos del router:
# cloudflared abre una conexión saliente y solo publica el puerto indicado.
#
# Ctrl+C cierra todo y las direcciones dejan de funcionar.
#
# Requiere cloudflared:
#   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$RAIZ/backend"
FRONTEND="$RAIZ/frontend/react-app"
PY="$BACKEND/venv/bin/python"

PUERTO_API=8000
PUERTO_WEB=4173
LOGS="$(mktemp -d)"

fallar() { echo "ERROR: $*" >&2; exit 1; }

command -v cloudflared >/dev/null || fallar "Falta cloudflared. Instalalo desde
  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
[[ -x "$PY" ]] || fallar "No existe el entorno virtual del backend"
[[ -d "$FRONTEND/node_modules" ]] || fallar "Faltan las dependencias del frontend"
[[ -f "$BACKEND/demo_snapshot.db" ]] || fallar "No hay base de demo. Corré backend/scripts/seed_demo.py"

pids=()
limpiar() {
  echo
  echo ">> Cerrando. Las direcciones públicas dejan de funcionar."
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  rm -rf "$LOGS"
}
trap limpiar EXIT INT TERM

# Espera a que cloudflared imprima la dirección que asignó.
esperar_url() {
  local archivo="$1" intentos=0
  while (( intentos < 60 )); do
    local url
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$archivo" 2>/dev/null | head -1 || true)
    if [[ -n "$url" ]]; then echo "$url"; return 0; fi
    sleep 1
    (( intentos++ ))
  done
  return 1
}

# --- 1. Backend ---------------------------------------------------------------
echo ">> Levantando el backend..."
# CORS_ORIGINS=* porque la dirección del frontend recién se conoce más abajo.
( cd "$BACKEND" && CORS_ORIGINS='*' "$PY" -m uvicorn src.main:app \
    --host 127.0.0.1 --port "$PUERTO_API" > "$LOGS/api.log" 2>&1 ) &
pids+=($!)

for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/openapi.json" && break
  sleep 0.5
done

echo ">> Publicando el backend..."
cloudflared tunnel --url "http://127.0.0.1:$PUERTO_API" > "$LOGS/tunel-api.log" 2>&1 &
pids+=($!)
URL_API=$(esperar_url "$LOGS/tunel-api.log") || fallar "El túnel del backend no respondió"
echo "   API: $URL_API"

# --- 2. Frontend --------------------------------------------------------------
# La dirección de la API se compila dentro del bundle, así que el build tiene
# que hacerse después de conocerla.
echo ">> Compilando el frontend contra esa API..."
( cd "$FRONTEND" && VITE_API_URL="$URL_API" npm run build > "$LOGS/build.log" 2>&1 ) \
  || { cat "$LOGS/build.log"; fallar "Falló el build del frontend"; }

( cd "$FRONTEND" && npm run preview -- --port "$PUERTO_WEB" --strictPort \
    > "$LOGS/web.log" 2>&1 ) &
pids+=($!)

for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_WEB" && break
  sleep 0.5
done

echo ">> Publicando el frontend..."
cloudflared tunnel --url "http://127.0.0.1:$PUERTO_WEB" > "$LOGS/tunel-web.log" 2>&1 &
pids+=($!)
URL_WEB=$(esperar_url "$LOGS/tunel-web.log") || fallar "El túnel del frontend no respondió"

# --- 3. Listo -----------------------------------------------------------------
echo
echo "════════════════════════════════════════════════════════════"
echo "   Los chicos entran acá:"
echo
echo "   $URL_WEB"
echo "════════════════════════════════════════════════════════════"
echo

if command -v qrencode >/dev/null; then
  qrencode -t ANSIUTF8 -m 1 "$URL_WEB"
  echo "   (que escaneen el QR con la cámara del celular)"
  echo
fi

echo "   Usuarios — el usuario es el DNI, la contraseña 1234:"
echo "     Alumno        44601165    Franco Soler"
echo "     Docente       1001        Leonardo Ordinez"
echo "     Departamento  2001        Claudia López"
echo
echo "   Para reiniciar los datos: el botón en la pantalla de login,"
echo "   o ./reset.sh desde otra terminal."
echo
echo "   Ctrl+C cierra todo."
echo

wait
