#!/usr/bin/env bash
#
# Vuelve la base de demo al punto inicial, entre una tanda de visitantes y la
# siguiente. No hace falta cortar el backend ni el frontend: alcanza con
# refrescar el navegador despues de correrlo.
#
#   ./reset.sh
#
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$RAIZ/backend/venv/bin/python" "$RAIZ/backend/scripts/reset_demo.py"
