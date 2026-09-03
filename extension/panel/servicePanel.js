import GLib from 'gi://GLib';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
    addActor,
    addPanelEmptyItem,
    addPanelSeparator,
    addPanelSubmenu,
    createPanelIndicator,
    createPanelMenuSection,
    createPanelServiceRow,
    createPanelServiceScrollView,
} from '../components/panelMenu.js';

import {
    getActiveStates,
    isServiceActive,
    setServiceActive,
} from '../services/serviceController.js';
import {loadConfiguredServices} from '../services/serviceSettings.js';

const MIN_MENU_HEIGHT = 220;
const MAX_MENU_HEIGHT = 360;
const MENU_HEIGHT_RATIO = 0.5;
const VISIBLE_SERVICE_ROWS = 5;
const SERVICE_ROW_HEIGHT = 30;
const SERVICE_GROUP_PADDING = 8;

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
        activeStates: new Map(),
        scrollActors: new Map(),
        destroyed: false,
        refreshing: false,
        refreshSourceId: 0,
        settingsChangedId: 0,
        intervalChangedId: 0,
        menuOpenChangedId: 0,
        monitorsChangedId: 0,
    };

    const indicator = createPanelIndicator({
        title: _('Service Switchboard'),
        iconName: 'system-run-symbolic',
    });
    panel.indicator = indicator;

    const updateMenuHeight = () => {
        const screenHeight = Main.layoutManager.primaryMonitor?.height ??
            global.stage.height;
        const menuHeight = Math.min(
            MAX_MENU_HEIGHT,
            Math.max(MIN_MENU_HEIGHT, Math.floor(screenHeight * MENU_HEIGHT_RATIO))
        );
        const groupHeight =
            (VISIBLE_SERVICE_ROWS * SERVICE_ROW_HEIGHT) + SERVICE_GROUP_PADDING;
        indicator.menu.actor.set_style(
            `max-height: ${menuHeight}px;`);
        for (const [actor, rowCount] of panel.scrollActors) {
            const visibleRows = Math.min(rowCount, VISIBLE_SERVICE_ROWS);
            const visibleHeight =
                (visibleRows * SERVICE_ROW_HEIGHT) + SERVICE_GROUP_PADDING;
            actor.set_style(rowCount > VISIBLE_SERVICE_ROWS
                ? `height: ${groupHeight}px; max-height: ${groupHeight}px;`
                : `max-height: ${visibleHeight}px;`);
        }
    };

    const updateActiveState = (service, active) => {
        const oldActive = panel.activeStates.get(service.id) === true;
        const newActive = active === true;
        panel.activeStates.set(service.id, newActive);
        return oldActive !== newActive;
    };

    const sortServices = services => [...services].sort((left, right) =>
        Number(panel.activeStates.get(right.id) === true) -
        Number(panel.activeStates.get(left.id) === true) ||
        left.name.localeCompare(right.name));

    const getGroupedServices = services => [
        {
            label: _('Your services'),
            services: sortServices(services.filter(service =>
                service.type === 'systemd-user' && !service.protected)),
        },
        {
            label: _('Desktop and system'),
            services: sortServices(services.filter(service =>
                service.type === 'systemd-user' && service.protected)),
        },
        {
            label: _('Docker'),
            services: sortServices(services.filter(service =>
                service.type === 'docker')),
        },
    ];

    const getOrderSignature = services => getGroupedServices(services)
        .map(group => `${group.label}:${group.services
            .map(service => `${service.id}:${panel.activeStates.get(service.id)}`)
            .join(',')}`)
        .join('|');

    const refreshLayoutAfterStateChange = () => {
        const services = loadConfiguredServices(settings);
        const orderSignature = getOrderSignature(services);
        if (orderSignature !== panel.orderSignature)
            rebuildMenu({refresh: false});
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
        if (!panel.destroyed && !state.busy) {
            const changed = updateActiveState(state.service, active);
            if (changed) {
                refreshLayoutAfterStateChange();
                return;
            }
            setRowState(state, active);
        }
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
                if (panel.rows.get(state.service.id) === state)
                    state.row.sensitive = true;
            }
        }
    };

    const addServiceRow = (service, menu) => {
        const row = createPanelServiceRow(
            service.name,
            panel.activeStates.get(service.id) === true
        );
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
        const submenu = addPanelSubmenu(indicator.menu, label);
        const section = createPanelMenuSection();
        const scrollView = createPanelServiceScrollView();
        addActor(scrollView, section.actor);
        addActor(submenu.menu.box, scrollView);
        panel.scrollActors.set(scrollView, services.length);

        services.forEach(service => addServiceRow(service, section));
        updateMenuHeight();
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
            let changed = false;
            for (const state of rows) {
                changed = updateActiveState(
                    state.service,
                    states.get(state.service.id)
                ) || changed;
            }
            if (changed) {
                refreshLayoutAfterStateChange();
                return;
            }
            for (const state of rows) {
                if (!state.busy && panel.rows.get(state.service.id) === state)
                    setRowState(state, states.get(state.service.id));
            }
        } finally {
            panel.refreshing = false;
        }
    };

    const rebuildMenu = ({refresh = true} = {}) => {
        if (panel.destroyed)
            return;
        indicator.menu.removeAll();
        panel.rows.clear();
        panel.scrollActors.clear();
        const services = loadConfiguredServices(settings);
        panel.orderSignature = getOrderSignature(services);

        if (services.length === 0) {
            addPanelEmptyItem(indicator.menu, _('No services configured'));
        } else {
            getGroupedServices(services).forEach(group =>
                addServiceGroup(group.label, group.services));
        }

        addPanelSeparator(indicator.menu);
        indicator.menu.addAction(_('Preferences'), openPreferences);
        updateMenuHeight();
        if (refresh)
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
        'changed::services-json', () => rebuildMenu());
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
