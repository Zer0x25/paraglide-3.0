#!/usr/bin/env bash
# Compatibilidad: delega al adaptador compartido de hooks.
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
HOST="${GUARD_HOST:-antigravity}"
exec node "$ROOT/.agents/scripts/guard-dev-db.mjs" --host "$HOST" "$@"
