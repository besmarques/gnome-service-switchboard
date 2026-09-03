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
    +-- serviceController functions
           |
           +-- systemctl --user
           +-- docker
```

Preferences are stored in GSettings.

The project uses functional modules and explicit closure state. The only
classes are the default extension and preferences entry points required by the
GNOME Shell extension APIs; service control, discovery, and panel behavior are
plain functions.

Preferences run discovery asynchronously and independently for each backend:

- `systemctl --user list-unit-files` finds installed user service units, while
  `list-units` supplies current state and transient/instantiated units.
- `systemctl --user show` identifies each unit's fragment path. Distribution,
  generated, and desktop-session units are marked as protected; personal and
  locally installed units are presented separately.
- `docker container ls --all` finds containers and their current state.

Discovery never changes service state. A discovered service is copied into the
same settings model only when the user chooses **Add** or **Add all running**.
Protected services require a second stop toggle within ten seconds, after a
desktop notification explains the risk.

The panel batches periodic status checks by backend. Regardless of how many
services are configured, a refresh launches at most one `systemctl` process and
one Docker process; overlapping timer refreshes are skipped.

The top-level menu is capped at 65% of the primary monitor height. GNOME Shell's
native submenu scroll view handles overflow, and the extension stylesheet only
adjusts row and switch geometry—not theme colors or visual states.

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
