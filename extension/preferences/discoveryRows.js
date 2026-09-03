import {
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {createFlatButton} from '../components/buttons.js';
import {createIcon} from '../components/icons.js';
import {
    addActionRow,
    addDisabledRow,
} from '../components/preferenceRows.js';
import {isConfigured} from './serviceModel.js';

export function clearDiscoveryRows(state) {
    for (const {group, row} of state.discoveryRows)
        group.remove(row);
    state.discoveryRows = [];
}

export function addDiscoveryMessage(state, group, title, subtitle) {
    const row = addDisabledRow(group, title, subtitle);
    state.discoveryRows.push({group, row});
}

export function renderDiscoveryBackend(state, {
    group,
    predicate,
    warning = '',
    onAdd,
}) {
    const discovered = state.discoveredServices.filter(predicate);
    const allAvailable = discovered.filter(service =>
        !isConfigured(state, service));
    const available = allAvailable.filter(service =>
        service.running || state.showStoppedButton.active);

    available.sort((left, right) =>
        Number(right.running) - Number(left.running) ||
        left.name.localeCompare(right.name));

    const running = allAvailable.filter(service => service.running).length;
    const stopped = allAvailable.length - running;
    const counts = state.showStoppedButton.active
        ? _('%d running · %d stopped')
            .replace('%d', running)
            .replace('%d', stopped)
        : _('%d running · %d stopped hidden')
            .replace('%d', running)
            .replace('%d', stopped);
    group.description = warning ? `${counts} · ${warning}` : counts;

    for (const service of available) {
        const serviceState = service.running ? _('Running') : _('Stopped');
        const stateIcon = createIcon({
            iconName: service.protected
                ? 'dialog-warning-symbolic'
                : service.running
                    ? 'media-playback-start-symbolic'
                    : 'media-playback-stop-symbolic',
            tooltipText: service.protected
                ? _('Use caution when stopping this service')
                : serviceState,
        });
        const addButton = createFlatButton({
            icon_name: 'list-add-symbolic',
            tooltip_text: _('Add this service to the panel menu'),
        });
        addButton.connect('clicked', () => onAdd(service));
        const row = addActionRow(group, {
            title: service.name,
            subtitle: `${service.target} · ${serviceState}`,
            prefix: stateIcon,
            suffix: addButton,
            activatableWidget: addButton,
            useMarkup: false,
        });
        state.discoveryRows.push({group, row});
    }

    if (available.length > 0)
        return;

    if (allAvailable.some(service => !service.running)) {
        addDiscoveryMessage(
            state,
            group,
            _('No running services available'),
            _('Enable Stopped to see inactive services.'));
    } else if (discovered.length > 0) {
        addDiscoveryMessage(
            state,
            group,
            _('Nothing available to add'),
            _('Every discovered item is already in Panel services.'));
    } else {
        addDiscoveryMessage(
            state,
            group,
            _('Nothing available to add'),
            _('No services were discovered for this backend.'));
    }
}
