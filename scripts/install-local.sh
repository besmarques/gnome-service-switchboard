#!/usr/bin/env bash
set -euo pipefail

UUID="service-switchboard@besmarques.eu"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/extension"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -a "$SOURCE" "$DEST"

echo "Installed $UUID to:"
echo "  $DEST"
echo
echo "Detected:"
gnome-shell --version || true
echo
echo "Enable with:"
echo "  gnome-extensions enable $UUID"
echo
echo "Preferences:"
echo "  gnome-extensions prefs $UUID"
