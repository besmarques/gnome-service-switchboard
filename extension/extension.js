// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {ServicePanel} from './servicePanel.js';

export default class ServiceSwitchboardExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._panel = new ServicePanel({
            settings: this._settings,
            openPreferences: () => this.openPreferences(),
        });

        Main.panel.addToStatusArea(this.uuid, this._panel.indicator);
    }

    disable() {
        this._panel?.destroy();
        this._panel = null;
        this._settings = null;
    }
}
