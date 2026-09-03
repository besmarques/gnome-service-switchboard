import Gio from 'gi://Gio';

import {
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    addPreferencesGroup,
    addPreferencesPage,
} from '../components/preferenceLayout.js';
import {addScrollDrawer} from '../components/scrollDrawer.js';
import {
    addDisabledRow,
    addSpinRow,
} from '../components/preferenceRows.js';
import {addConfiguredServiceRow} from '../preferences/configuredServices.js';
import {
    loadServices,
} from '../preferences/serviceModel.js';

function addPanelServicesGroup(page, state) {
    state.servicesGroup = addScrollDrawer(page, {
        title: _('Panel services'),
        description: _(
            'These services appear in the top-panel menu.'),
        expanded: true,
        maxVisibleRows: 5,
    });
}

function addGeneralGroup(page, settings) {
    const generalGroup = addPreferencesGroup(page, {title: _('General')});
    const refreshRow = addSpinRow(generalGroup, {
        title: _('Refresh interval'),
        subtitle: _('How often service status is checked, in seconds.'),
        lower: 2,
        upper: 300,
        stepIncrement: 1,
        pageIncrement: 10,
        value: 10,
    });
    settings.bind(
        'refresh-interval', refreshRow, 'value', Gio.SettingsBindFlags.DEFAULT);
}

function createActions(state) {
    const actions = {};

    actions.renderDiscoveredServices = () => {};

    actions.renderConfiguredServices = (expandIndex = -1) => {
        state.serviceRows.forEach(row => state.servicesGroup.remove(row));
        state.serviceRows = [];
        state.services.forEach((service, index) => {
            const row = addConfiguredServiceRow(state, service, index, actions);
            row.expanded = index === expandIndex;
            state.serviceRows.push(row);
        });
        if (state.services.length === 0) {
            const row = addDisabledRow(
                state.servicesGroup,
                _('No services yet'),
                _('Use Add Services to add your first service.')
            );
            state.serviceRows.push(row);
        }
    };

    actions.reloadConfiguredServices = () => {
        state.services = loadServices(state.settings);
        actions.renderConfiguredServices();
    };

    actions.focusService = serviceId => {
        state.services = loadServices(state.settings);
        const index = state.services.findIndex(service => service.id === serviceId);
        actions.renderConfiguredServices(index);
    };

    return actions;
}

export function addActiveServicesPage(window, settings) {
    const state = {
        settings,
        services: loadServices(settings),
        serviceRows: [],
    };

    const page = addPreferencesPage(window, {
        title: _('Active Services'),
        iconName: 'system-run-symbolic',
    });

    addPanelServicesGroup(page, state);
    addGeneralGroup(page, settings);

    const actions = createActions(state);

    settings.connect('changed::services-json', () =>
        actions.reloadConfiguredServices());

    actions.renderConfiguredServices();
    return {
        page,
        focusService: actions.focusService,
    };
}
