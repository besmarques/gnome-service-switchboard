// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import GLib from 'gi://GLib';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    getActiveStates,
    isServiceActive,
    setServiceActive,
} from './serviceController.js';

function loadServices(settings) {
    let parsed;
    try {
        parsed = JSON.parse(settings.get_string('services-json'));
    } catch (error) {
        console.warn(
            `Service Switchboard: invalid services configuration: ${error.message}`);
        return [];
    }

    return Array.isArray(parsed) ? parsed.filter(service =>
        typeof service?.id === 'string' &&
        typeof service?.name === 'string' &&
        typeof service?.type === 'string' &&
        typeof service?.target === 'string' &&
        service.name.trim().length > 0 &&
        service.target.trim().length > 0
    ) : [];
}

function setRowState(state, active) {
    if (state.row.state === active)
        return;
    state.updating = true;
    state.row.setToggleState(active);
    state.updating = false;
}

export function createServicePanel({settings, openPreferences}) {
    const panel = {
        rows: new Map(),
        destroyed: false,
        refreshing: false,
        refreshSourceId: 0,
        settingsChangedId: 0,
        intervalChangedId: 0,
        menuOpenChangedId: 0,
        monitorsChangedId: 0,
    };

    const indicator = new PanelMenu.Button(0.0, _('Service Switchboard'), false);
    panel.indicator = indicator;
    indicator.add_child(new St.Icon({
        icon_name: 'system-run-symbolic',
        style_class: 'system-status-icon',
    }));

    const updateMenuHeight = () => {
        const screenHeight = Main.layoutManager.primaryMonitor?.height ??
            global.stage.height;
        indicator.menu.actor.set_style(
            `max-height: ${Math.max(320, Math.floor(screenHeight * 0.65))}px;`);
    };

    const refreshRow = async state => {
        if (panel.destroyed || state.busy)
            return;
        let active = false;
        try {
            active = await isServiceActive(state.service);
        } catch (error) {
            console.warn(
                `Service Switchboard: status check failed for ` +
                `${state.service.name}: ${error.message}`);
        }
        if (!panel.destroyed && !state.busy)
            setRowState(state, active);
    };

    const setState = async (state, active) => {
        state.busy = true;
        state.row.sensitive = false;
        try {
            await setServiceActive(state.service, active);
        } catch (error) {
            Main.notifyError(_('Service Switchboard'), error.message);
        } finally {
            state.busy = false;
            if (!panel.destroyed) {
                await refreshRow(state);
                state.row.sensitive = true;
            }
        }
    };

    const addServiceRow = (service, menu) => {
        const row = new PopupMenu.PopupSwitchMenuItem(service.name, false, {});
        row.add_style_class_name('service-switchboard-service-row');
        const state = {
            service,
            row,
            busy: false,
            updating: false,
            confirmStopUntil: 0,
        };

        row.connect('toggled', (_item, active) => {
            if (state.updating || state.busy)
                return;
            if (!active && service.protected === true &&
                Date.now() > state.confirmStopUntil) {
                state.confirmStopUntil = Date.now() + 10000;
                setRowState(state, true);
                Main.notify(
                    _('Service Switchboard safety warning'),
                    _(
                        'Stopping this desktop or system service may disrupt ' +
                        'your session. Toggle it off again within 10 seconds ' +
                        'to confirm.'));
                return;
            }
            state.confirmStopUntil = 0;
            setState(state, active);
        });

        panel.rows.set(service.id, state);
        menu.addMenuItem(row);
    };

    const addServiceGroup = (label, services) => {
        if (services.length === 0)
            return;
        const submenu = new PopupMenu.PopupSubMenuMenuItem(label, false);
        indicator.menu.addMenuItem(submenu);
        services.forEach(service => addServiceRow(service, submenu.menu));
    };

    const refreshAll = async () => {
        if (panel.destroyed || panel.refreshing)
            return;
        panel.refreshing = true;
        const rows = [...panel.rows.values()];
        try {
            const states = await getActiveStates(rows.map(row => row.service));
            if (panel.destroyed)
                return;
            for (const state of rows) {
                if (!state.busy && panel.rows.get(state.service.id) === state)
                    setRowState(state, states.get(state.service.id));
            }
        } finally {
            panel.refreshing = false;
        }
    };

    const rebuildMenu = () => {
        if (panel.destroyed)
            return;
        indicator.menu.removeAll();
        panel.rows.clear();
        const services = loadServices(settings);

        if (services.length === 0) {
            indicator.menu.addMenuItem(new PopupMenu.PopupMenuItem(
                _('No services configured'), {reactive: false, can_focus: false}));
        } else {
            addServiceGroup(_('Your services'), services.filter(service =>
                service.type === 'systemd-user' && !service.protected));
            addServiceGroup(_('Desktop and system'), services.filter(service =>
                service.type === 'systemd-user' && service.protected));
            addServiceGroup(_('Docker'), services.filter(service =>
                service.type === 'docker'));
        }

        indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        indicator.menu.addAction(_('Preferences'), openPreferences);
        refreshAll();
    };

    const startRefreshTimer = () => {
        if (panel.refreshSourceId)
            GLib.Source.remove(panel.refreshSourceId);
        panel.refreshSourceId = 0;
        if (panel.destroyed)
            return;
        const seconds = Math.max(2, settings.get_uint('refresh-interval'));
        panel.refreshSourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, seconds, () => {
                refreshAll();
                return GLib.SOURCE_CONTINUE;
            });
    };

    panel.monitorsChangedId = Main.layoutManager.connect(
        'monitors-changed', updateMenuHeight);
    panel.settingsChangedId = settings.connect(
        'changed::services-json', rebuildMenu);
    panel.intervalChangedId = settings.connect(
        'changed::refresh-interval', startRefreshTimer);
    panel.menuOpenChangedId = indicator.menu.connect(
        'open-state-changed', (_menu, open) => {
            if (open)
                refreshAll();
        });

    const destroy = () => {
        if (panel.destroyed)
            return;
        panel.destroyed = true;
        if (panel.refreshSourceId)
            GLib.Source.remove(panel.refreshSourceId);
        if (panel.settingsChangedId)
            settings.disconnect(panel.settingsChangedId);
        if (panel.intervalChangedId)
            settings.disconnect(panel.intervalChangedId);
        if (panel.menuOpenChangedId)
            indicator.menu.disconnect(panel.menuOpenChangedId);
        if (panel.monitorsChangedId)
            Main.layoutManager.disconnect(panel.monitorsChangedId);
        panel.rows.clear();
        indicator.destroy();
    };

    updateMenuHeight();
    rebuildMenu();
    startRefreshTimer();
    refreshAll();
    return {indicator, destroy};
}
