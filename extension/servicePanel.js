// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import GLib from 'gi://GLib';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {ServiceController} from './serviceController.js';

export class ServicePanel {
    constructor({settings, openPreferences}) {
        this._settings = settings;
        this._openPreferences = openPreferences;
        this._controller = new ServiceController();
        this._rows = new Map();
        this._destroyed = false;
        this._refreshSourceId = 0;

        this.indicator = new PanelMenu.Button(
            0.0,
            _('Service Switchboard'),
            false
        );

        this.indicator.add_child(new St.Icon({
            icon_name: 'system-run-symbolic',
            style_class: 'system-status-icon',
        }));

        this._settingsChangedId = this._settings.connect(
            'changed::services-json',
            () => this._rebuildMenu()
        );

        this._intervalChangedId = this._settings.connect(
            'changed::refresh-interval',
            () => this._startRefreshTimer()
        );

        this._menuOpenChangedId = this.indicator.menu.connect(
            'open-state-changed',
            (_menu, open) => {
                if (open)
                    this.refreshAll();
            }
        );

        this._rebuildMenu();
        this._startRefreshTimer();
        this.refreshAll();
    }

    destroy() {
        if (this._destroyed)
            return;

        this._destroyed = true;

        if (this._refreshSourceId) {
            GLib.Source.remove(this._refreshSourceId);
            this._refreshSourceId = 0;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        if (this._intervalChangedId) {
            this._settings.disconnect(this._intervalChangedId);
            this._intervalChangedId = 0;
        }

        if (this._menuOpenChangedId) {
            this.indicator.menu.disconnect(this._menuOpenChangedId);
            this._menuOpenChangedId = 0;
        }

        this._rows.clear();
        this.indicator.destroy();
        this.indicator = null;
        this._settings = null;
        this._openPreferences = null;
        this._controller = null;
    }

    async refreshAll() {
        if (this._destroyed)
            return;

        const rows = [...this._rows.values()];
        await Promise.all(rows.map(row => this._refreshRow(row)));
    }

    _rebuildMenu() {
        if (this._destroyed)
            return;

        this.indicator.menu.removeAll();
        this._rows.clear();

        const services = this._loadServices();

        if (services.length === 0) {
            this.indicator.menu.addMenuItem(
                new PopupMenu.PopupMenuItem(_('No services configured'), {
                    reactive: false,
                    can_focus: false,
                })
            );
        } else {
            for (const service of services)
                this._addServiceRow(service);
        }

        this.indicator.menu.addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );

        this.indicator.menu.addAction(_('Preferences'), () => {
            this._openPreferences();
        });

        this.refreshAll();
    }

    _addServiceRow(service) {
        const row = new PopupMenu.PopupSwitchMenuItem(
            service.name,
            false,
            {}
        );

        const state = {
            service,
            row,
            busy: false,
            updating: false,
        };

        row.connect('toggled', (_item, active) => {
            if (state.updating || state.busy)
                return;

            this._setServiceState(state, active);
        });

        this._rows.set(service.id, state);
        this.indicator.menu.addMenuItem(row);
    }

    async _setServiceState(state, active) {
        state.busy = true;
        state.row.sensitive = false;

        try {
            await this._controller.setActive(state.service, active);
        } catch (error) {
            Main.notifyError(
                _('Service Switchboard'),
                error.message
            );
        } finally {
            if (!this._destroyed) {
                await this._refreshRow(state);
                state.row.sensitive = true;
                state.busy = false;
            }
        }
    }

    async _refreshRow(state) {
        if (this._destroyed || state.busy)
            return;

        let active = false;

        try {
            active = await this._controller.isActive(state.service);
        } catch (error) {
            console.warn(
                `Service Switchboard: status check failed for ` +
                `${state.service.name}: ${error.message}`
            );
        }

        if (this._destroyed || state.busy)
            return;

        if (state.row.state !== active) {
            state.updating = true;
            state.row.setToggleState(active);
            state.updating = false;
        }
    }

    _startRefreshTimer() {
        if (this._refreshSourceId) {
            GLib.Source.remove(this._refreshSourceId);
            this._refreshSourceId = 0;
        }

        if (this._destroyed)
            return;

        const seconds = Math.max(
            2,
            this._settings.get_uint('refresh-interval')
        );

        this._refreshSourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            seconds,
            () => {
                this.refreshAll();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _loadServices() {
        let parsed;

        try {
            parsed = JSON.parse(this._settings.get_string('services-json'));
        } catch (error) {
            console.warn(
                `Service Switchboard: invalid services configuration: ` +
                error.message
            );
            return [];
        }

        if (!Array.isArray(parsed))
            return [];

        return parsed.filter(service =>
            typeof service?.id === 'string' &&
            typeof service?.name === 'string' &&
            typeof service?.type === 'string' &&
            typeof service?.target === 'string' &&
            service.name.trim().length > 0 &&
            service.target.trim().length > 0
        );
    }
}
