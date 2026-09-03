#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UUID="service-switchboard@besmarques.eu"

if [[ "${SERVICE_SWITCHBOARD_NESTED_BUS:-0}" != "1" ]]; then
  if [[ ! -x /usr/libexec/mutter-devkit ]] && \
     ! command -v mutter-devkit >/dev/null 2>&1; then
    echo "Cannot start the nested desktop: Mutter Devkit is not installed." >&2
    echo "Install it on Ubuntu with:" >&2
    echo "  sudo apt install mutter-dev-bin" >&2
    echo "On Fedora or Arch, install the mutter-devkit package." >&2
    exit 1
  fi

  "$ROOT/scripts/install-local.sh"

  echo
  echo "Starting a nested GNOME Shell development session."
  echo "The extension will be enabled automatically when Shell is ready."
  echo "Close the nested desktop window to stop the test session."

  exec env SERVICE_SWITCHBOARD_NESTED_BUS=1 \
    dbus-run-session -- "$0"
fi

gnome-shell --devkit --wayland &
shell_pid=$!

cleanup() {
  if kill -0 "$shell_pid" 2>/dev/null; then
    kill "$shell_pid"
  fi
}
trap cleanup EXIT INT TERM

if ! gdbus wait --session --timeout=30 org.gnome.Shell; then
  echo "Nested GNOME Shell did not become ready within 30 seconds." >&2
  exit 1
fi

echo
echo "Enabling $UUID in the nested session..."
gnome-extensions enable "$UUID"
gnome-extensions info "$UUID"
echo
echo "Look above for: Service Switchboard: panel indicator registered=true"
echo "If the nested desktop starts in Overview, press Escape before checking the panel."

set +e
wait "$shell_pid"
shell_status=$?
set -e
trap - EXIT INT TERM
exit "$shell_status"
