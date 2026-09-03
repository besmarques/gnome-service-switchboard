# Service Switchboard

A compact GNOME Shell extension for starting and stopping local services from
the top panel.

The panel menu stays simple: service name + toggle.

## Features

- User `systemd --user` services
- Docker containers
- Automatic discovery in Preferences
- One-click add for discovered services
- Manual setup for edge cases
- Running services shown first
- Stop protection for desktop/system services
- Native GNOME Shell, GTK, and libadwaita UI

## Install locally

```bash
./scripts/install-local.sh
gnome-extensions enable service-switchboard@besmarques.eu
```

Open preferences:

```bash
gnome-extensions prefs service-switchboard@besmarques.eu
```

## Develop

Run a clean nested GNOME Shell session:

```bash
./scripts/run-nested.sh
```

This builds, installs, starts a nested Shell, and enables the extension there.
Close the nested desktop window when finished.

VS Code tasks are included for:

- nested GNOME Shell
- build ZIP
- local install
- open preferences
- source check

## Build

```bash
./scripts/build.sh
```

The installable ZIP is written to:

```text
dist/service-switchboard@besmarques.eu.zip
```

Tagged pushes build and publish the ZIP through GitHub Actions.

## Notes

- GNOME Shell version declared: `50`
- UUID: `service-switchboard@besmarques.eu`
- Settings schema: `org.gnome.shell.extensions.service-switchboard`
- Commands are executed with fixed argv arrays, not through `/bin/sh -c`
- No root access or `pkexec`

More detail:

- [Architecture](docs/ARCHITECTURE.md)
- [GNOME compatibility notes](docs/GNOME-50-51.md)

## Support

If this extension is useful to you, you can
[buy me a coffee](https://mc.buymeacoffee.com/links/SyEkVMsyaFWlbffAdjfMsEffcXYiHflkffADJfPSAFdMvwVgfMCgYAElkXiIEVBsbiqkFAVRKfFaDJFRsXgGVMk/3779507?link=besmarques).

## License

GPL-3.0-or-later
