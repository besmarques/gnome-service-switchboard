# Architecture

```text
GNOME Shell
    |
    +-- ServicePanel
    |      |
    |      +-- PopupSwitchMenuItem: Service A [toggle]
    |      +-- PopupSwitchMenuItem: Service B [toggle]
    |      +-- Preferences
    |
    +-- ServiceController
           |
           +-- systemctl --user
           +-- docker
```

Preferences are stored in GSettings.

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
