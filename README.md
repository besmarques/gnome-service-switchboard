# Service Switchboard

A compact GNOME Shell extension that puts local services in the top panel as **name + toggle** rows.

## What it does

- Adds one symbolic icon to the GNOME top panel.
- Shows each configured service as a native GNOME `PopupSwitchMenuItem`.
- Toggle on = start.
- Toggle off = stop.
- Refreshes status automatically and whenever the menu opens.
- Provides a GTK4/libadwaita preferences window.
- Supports:
  - user systemd services (`systemctl --user`)
  - Docker containers (`docker`)
- Does **not** run commands through a shell.
- Does **not** require root or `pkexec`.
- Does **not** ship helper binaries or external scripts.

## GNOME versions

The current distribution metadata declares GNOME Shell **50**.

The implementation intentionally follows the GNOME 50 and GNOME 51 porting rules. GNOME 51 is not yet stable as of September 3, 2026, so the project must not claim stable GNOME 51 support until it has been tested against the stable release.

After GNOME 51 is stable and tested, update:

```json
"shell-version": ["50", "51"]
```

## Project UUID

`service-switchboard@besmarques.eu`

## Settings schema

`org.gnome.shell.extensions.service-switchboard`

## Development install

From the repository root:

```bash
./scripts/install-local.sh
```

Then log out and back in if GNOME Shell does not immediately discover a newly installed extension, and enable it:

```bash
gnome-extensions enable service-switchboard@besmarques.eu
```

Open preferences:

```bash
gnome-extensions prefs service-switchboard@besmarques.eu
```

## Distribution package

Build the EGO-style ZIP:

```bash
./scripts/build.sh
```

The ZIP is created under `dist/`.

## Review-oriented design

This project is structured to follow current extensions.gnome.org review guidance:

- ES modules, GNOME 45+ style.
- No side effects before `enable()`.
- `disable()` is synchronous.
- All settings signal handlers and GLib timers are removed on destroy.
- GTK/libadwaita are used only in `prefs.js`.
- Shell modules and St are used only in the Shell process.
- Service commands use `Gio.Subprocess` asynchronously.
- No synchronous subprocess calls in the Shell process.
- No `/bin/sh -c`.
- No arbitrary user command execution.
- No privileged service control.
- No compiled GSettings schema is shipped.
- Runtime ZIP excludes repository build/install scripts.

## Important EGO maintainership notice

The JavaScript source currently contains the GNOME best-practices AI-generated-code notice:

```text
Generated with AI for personal use.
Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
and can maintain this code.
```

Before an EGO submission, review and understand the code yourself. If you are taking responsibility for maintaining it, remove those notice comments manually before submission.

## License

GPL-3.0-or-later
