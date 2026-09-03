#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT="$ROOT/extension"

echo "Checking metadata..."
python3 -m json.tool "$EXT/metadata.json" >/dev/null

echo "Checking schema..."
glib-compile-schemas --strict --dry-run "$EXT/schemas"

if command -v node >/dev/null 2>&1; then
  echo "Checking JavaScript syntax..."
  tmp="$(mktemp --suffix=.mjs)"
  trap 'rm -f "$tmp"' EXIT
  for file in "$EXT"/*.js; do
    cp "$file" "$tmp"
    node --check "$tmp"
  done
fi

echo "Checking distribution exclusions..."
if find "$EXT" -name 'gschemas.compiled' -o -name '*.pyc' | grep -q .; then
  echo "Unexpected generated files found."
  exit 1
fi

echo "Checks passed."
