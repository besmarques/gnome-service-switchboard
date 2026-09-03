#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UUID="service-switchboard@besmarques.eu"

"$ROOT/scripts/install-local.sh"

echo
echo "Starting a nested GNOME Shell development session."
echo "If the extension is not enabled inside it, open a nested terminal and run:"
echo "  gnome-extensions enable $UUID"
echo
echo "Close the nested desktop window to stop the test session."

exec dbus-run-session -- gnome-shell --devkit --wayland
