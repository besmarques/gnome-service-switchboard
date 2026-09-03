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
  for file in "$EXT"/*.js; do
    cp "$file" /tmp/service-switchboard-check.mjs
    node --check /tmp/service-switchboard-check.mjs
  done
  rm -f /tmp/service-switchboard-check.mjs
fi

(
  cd "$EXT"
  zip -q -r "$DIST/$UUID.zip" \
    metadata.json \
    extension.js \
    servicePanel.js \
    serviceController.js \
    serviceDiscovery.js \
    prefs.js \
    stylesheet.css \
    schemas
)

echo "Built:"
echo "  $DIST/$UUID.zip"
