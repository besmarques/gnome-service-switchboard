#!/usr/bin/env bash
set -euo pipefail

UUID="service-switchboard@besmarques.eu"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP="$ROOT/dist/$UUID.zip"

"$ROOT/scripts/build.sh"
gnome-extensions install --force "$ZIP"

echo "Installed $UUID from:"
echo "  $ZIP"
echo
echo "Detected:"
gnome-shell --version || true
echo
echo "Enable with:"
echo "  gnome-extensions enable $UUID"
echo
echo "Preferences:"
echo "  gnome-extensions prefs $UUID"
