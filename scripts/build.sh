#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT="$ROOT/extension"
DIST="$ROOT/dist"
UUID="service-switchboard@besmarques.eu"

mkdir -p "$DIST"
rm -f "$DIST/$UUID.zip"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas --strict --dry-run "$EXT/schemas"
fi

if command -v node >/dev/null 2>&1; then
  while IFS= read -r -d '' file; do
    cp "$file" /tmp/service-switchboard-check.mjs
    node --check /tmp/service-switchboard-check.mjs
  done < <(find "$EXT" -name '*.js' -print0)
  rm -f /tmp/service-switchboard-check.mjs
fi

(
  cd "$EXT"
  zip -q -r "$DIST/$UUID.zip" \
    metadata.json \
    extension.js \
    prefs.js \
    stylesheet.css \
    components \
    discovery \
    pages \
    panel \
    preferences \
    services \
    schemas
)

echo "Built:"
echo "  $DIST/$UUID.zip"
