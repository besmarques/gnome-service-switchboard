# GNOME 50 / 51 compatibility notes

## GNOME Shell 50

GNOME 50 made no relevant changes to `metadata.json`, `extension.js`, or `prefs.js` for this extension's architecture.

This project does not rely on X11-only Shell restart behavior. GNOME Shell 50 removed X11 support, so development/testing assumes Wayland.

## GNOME Shell 51

The GNOME 51 porting guide currently lists no relevant metadata or preferences changes for this project.

One important rule is explicitly handled here:

- `disable()` must not be async.

The project also avoids deprecated direct actor event-signal patterns mentioned in the GNOME 51 guide.

## Metadata policy

Until GNOME 51 is released stable and the extension is tested on it, the EGO package should declare only:

```json
"shell-version": ["50"]
```

After stable GNOME 51 testing, change that to:

```json
"shell-version": ["50", "51"]
```

Do not claim future versions.
