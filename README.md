# Service Switchboard

A compact GNOME Shell extension that puts local services in the top panel as **name + toggle** rows.

## What it does

- Adds one symbolic icon to the GNOME top panel.
- Groups configured services into compact, collapsible native GNOME submenus.
- Shows each service inside its group as a native `PopupSwitchMenuItem`.
- Toggle on = start.
- Toggle off = stop.
- Refreshes status automatically and whenever the menu opens.
- Batches status polling into at most one process per backend per refresh.
- Provides a GTK4/libadwaita preferences window.
- Supports:
  - user systemd services (`systemctl --user`)
  - Docker containers (`docker`)
- Discovers available services and containers in Preferences.
- Adds a discovered item with one click, or all currently running items at once.
- Groups discovery by backend and shows running items first; stopped items can be
  revealed on demand.
- Separates personal/local units from desktop and system session services.
- Warns and requires confirmation before stopping a discovered system-managed
  service that could disrupt the desktop session.
- Allows stop protection to be enabled or disabled per configured service.
- Keeps manual service creation available for targets discovery cannot find.
- Uses only native GNOME Shell, GTK, and libadwaita widgets and semantic theme
  classes; it does not override theme colors or typography.
- Includes a Details page with project, safety, privacy, and support information.
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

This checks and builds the extension, then installs the ZIP with
`gnome-extensions install --force`, which also compiles its settings schema.

### Fast testing on Wayland

GNOME Shell caches extension JavaScript for the lifetime of the Shell process.
For panel and menu changes, start a clean nested GNOME Shell instead of logging
out of your main desktop:

```bash
./scripts/run-nested.sh
```

This installs the current source and opens a GNOME development session in a
window. If the extension is not enabled there, open a terminal inside the
nested desktop and run:

```bash
gnome-extensions enable service-switchboard@besmarques.eu
```

Close the nested desktop window when finished. After another code change, run
`./scripts/run-nested.sh` again so a fresh JavaScript engine loads it. GNOME 49+
may require the Mutter development-kit package (`mutter-dev-bin` on Ubuntu or
`mutter-devkit` on Fedora/Arch).

Preferences run in a separate process, so preference-only changes have a faster
loop: close the old Preferences window, reinstall, and reopen it:

```bash
./scripts/install-local.sh
gnome-extensions prefs service-switchboard@besmarques.eu
```

## Distribution package

Build the EGO-style ZIP:

```bash
./scripts/build.sh
```

The ZIP is created under `dist/`.

The exact output path is:

```text
dist/service-switchboard@besmarques.eu.zip
```

Pushing a tag (for example, `v0.2.0`) runs the GitHub Actions release workflow.
It checks the source, builds the installable ZIP, uploads it as a workflow
artifact, and attaches it to a GitHub release.

## Review-oriented design

This project is structured to follow current extensions.gnome.org review guidance:

- ES modules, GNOME 45+ style.
- Functional controller, discovery, and panel modules with closure-held state.
- Classes are limited to the two lifecycle adapters required by GNOME Shell.
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

## Support

If this extension is useful to you, you can
[buy me a coffee](https://mc.buymeacoffee.com/links/SyEkVMsyaFWlbffAdjfMsEffcXYiHflkffADJfPSAFdMvwVgfMCgYAElkXiIEVBsbiqkFAVRKfFaDJFRsXgGVMk/3779507?link=besmarques).
