import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {createServicePanel} from './panel/servicePanel.js';

// GNOME Shell loads this default class directly; the implementation stays in
// plain function modules under panel/ and services/.
export default class ServiceSwitchboardExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._panel = createServicePanel({
            settings: this._settings,
            openPreferences: () => this.openPreferences(),
        });

        Main.panel.addToStatusArea(this.uuid, this._panel.indicator);
        this._panel.indicator.show();
    }

    disable() {
        this._panel?.destroy();
        this._panel = null;
        this._settings = null;
    }
}
