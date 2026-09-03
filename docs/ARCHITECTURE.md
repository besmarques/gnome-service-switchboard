# Architecture

```text
GNOME Shell
    |
    +-- createServicePanel() closure
    |      |
    |      +-- Your services [submenu]
    |      |      +-- PopupSwitchMenuItem: Service A [toggle]
    |      +-- Desktop and system [submenu]
    |      |      +-- PopupSwitchMenuItem: Service B [toggle]
    |      +-- Docker [submenu]
    |      +-- Preferences
    |
    +-- services/serviceController.js functions
           |
           +-- systemctl --user
           +-- docker
```

Preferences are stored in GSettings.

The project uses functional modules and explicit closure state. The only
classes are the default extension and preferences entry points required by the
GNOME Shell extension APIs; service control, discovery, and panel behavior are
plain functions.

## Source layout

GNOME Shell expects two JavaScript entry files at the extension root:

- `extension.js` is loaded by GNOME Shell when the extension is enabled.
- `prefs.js` is loaded by the separate Preferences process.

Those files are intentionally small adapters. The real implementation is split
by responsibility:

```text
extension/
    extension.js              GNOME Shell lifecycle adapter
    prefs.js                  Preferences lifecycle adapter
    panel/                    top-panel indicator and menu rendering
    services/                 shared service model, command runner, and control
    discovery/                automatic systemd and Docker discovery
    preferences/              preferences state models and reusable rows
    pages/                    Active, Add, and About preference pages
    components/               shared GTK/libadwaita and Shell UI builders
    schemas/                  GSettings schema
```

The extension root is still what gets zipped and installed. Nested folders are
fine as long as `extension.js`, `prefs.js`, `metadata.json`, `stylesheet.css`,
and `schemas/` stay at the root level of the installed extension.

`components/` contains the reusable UI builders. Preference pages use flat
buttons, header action boxes, page/group creation, common rows, form rows,
icons, and scroll drawers from this folder. The top-panel menu also uses Shell
menu builders from this folder for its indicator, service rows, submenus,
sections, separators, and scroll views. Page-specific state and behavior should
stay in `pages/`, `preferences/`, `panel/`, `discovery/`, or `services/`.

Preferences run discovery asynchronously and independently for each backend:

- `systemctl --user list-unit-files` finds installed user service units, while
  `list-units` supplies current state and transient/instantiated units.
- `systemctl --user show` identifies each unit's fragment path. Distribution,
  generated, and desktop-session units are marked as protected; personal and
  locally installed units are presented separately.
- `docker container ls --all` finds containers and their current state.

Discovery never changes service state. A discovered service is copied into the
same settings model only when the user chooses **Add** or **Add running**.
Manual/custom services are saved only after the user opens the Add Services
form and chooses **Save**; **Cancel** closes the form without saving. Protected
services require a second stop toggle within ten seconds, after a desktop
notification explains the risk.

Service type constants, subprocess execution, and settings parsing live in
`services/` so the Shell panel, discovery code, and Preferences pages use the
same definitions without importing Shell-only or Preferences-only GNOME
resources across process boundaries.

The panel batches periodic status checks by backend. Regardless of how many
services are configured, a refresh launches at most one `systemctl` process and
one Docker process; overlapping timer refreshes are skipped.

The top-level menu is capped to a compact, screen-aware height. Preference
service groups are rendered as drawers with capped scroll areas, so long service
lists do not resize the Preferences window indefinitely. Each expanded panel
service group shows about five services before scrolling. The extension
stylesheet only adjusts row and switch geometry—not theme colors or visual
states.

The service list is serialized into the `services-json` string key. Keeping the transport as JSON makes it possible to add backend-specific properties later without changing the GSettings schema every time.

Supported service object:

```json
{
  "id": "stable-uuid",
  "name": "Open WebUI",
  "type": "docker",
  "target": "open-webui"
}
```

Supported `type` values:

- `systemd-user`
- `docker`

The Shell process never passes a user-supplied string to a shell interpreter. Only the target identifier is passed as one argument to a fixed command.
