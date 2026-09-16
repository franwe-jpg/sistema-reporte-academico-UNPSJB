#!/usr/bin/env bash
#
# Levanta el sistema completo para la demo: backend (puerto 8000) y frontend
# (puerto 5173). Ctrl+C detiene los dos.
#
#   ./demo.sh            levanta todo
#   ./demo.sh --reset    restaura la base al punto inicial y levanta todo
#
# Para restaurar la base SIN cortar la demo, abri otra terminal y corre:
#   backend/venv/bin/python backend/scripts/reset_demo.py
#
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$RAIZ/backend"
FRONTEND="$RAIZ/frontend/react-app"
PY="$BACKEND/venv/bin/python"

fallar() { echo "ERROR: $*" >&2; exit 1; }

[[ -x "$PY" ]] || fallar "No existe el entorno virtual. Corre: python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt"
[[ -f "$BACKEND/.env" ]] || fallar "Falta backend/.env"
[[ -d "$FRONTEND/node_modules" ]] || fallar "Faltan dependencias del frontend. Corre: (cd frontend/react-app && npm install)"

if [[ ! -f "$BACKEND/demo_snapshot.db" ]]; then
  echo ">> No hay base de demo todavia. Generandola..."
  "$PY" "$BACKEND/scripts/seed_demo.py"
elif [[ "${1:-}" == "--reset" ]]; then
  echo ">> Restaurando la base al punto inicial..."
  "$PY" "$BACKEND/scripts/reset_demo.py"
fi

pids=()
limpiar() {
  echo
  echo ">> Cerrando..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap limpiar EXIT INT TERM

echo ">> Backend  http://localhost:8000  (docs en /docs)"
( cd "$BACKEND" && "$PY" -m uvicorn src.main:app --host 127.0.0.1 --port 8000 ) &
pids+=($!)

# El backend permite CORS unicamente desde http://localhost:5173, asi que el
# frontend tiene que quedar en ese puerto exacto.
echo ">> Frontend http://localhost:5173"
( cd "$FRONTEND" && npm run dev -- --port 5173 --strictPort ) &
pids+=($!)

echo
echo "   Usuarios (el usuario es el DNI):"
echo "     Alumno        45123456 / alumno123"
echo "     Docente       24876543 / docente123"
echo "     Departamento  20345678 / depto123"
echo "     Admin         35111222 / admin123"
echo
echo "   Ctrl+C para detener todo."
echo

wait
