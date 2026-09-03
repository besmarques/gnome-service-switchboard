import {
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {createFlatButton} from '../components/buttons.js';
import {
  addComboRow,
  addEntryRow,
  addExpanderRow,
  addSwitchRow,
} from '../components/preferenceRows.js';
import {
    saveServices,
    serviceSubtitle,
    syncServiceSafety,
    TYPE_DOCKER,
    TYPE_SYSTEMD_USER,
} from './serviceModel.js';

export function addConfiguredServiceRow(state, service, index, actions) {
    let protectionRow;
    let updatingProtection = false;
    const removeButton = createFlatButton({
        icon_name: 'user-trash-symbolic',
        tooltip_text: _('Remove service'),
    });
    const row = addExpanderRow(state.servicesGroup, {
        title: service.name || _('Unnamed service'),
        subtitle: serviceSubtitle(service),
        useMarkup: false,
        suffix: removeButton,
    });

    removeButton.connect('clicked', () => {
        state.services.splice(index, 1);
        saveServices(state);
        actions.renderConfiguredServices();
        actions.renderDiscoveredServices();
    });

    addEntryRow(row, {
        title: _('Display name'),
        text: service.name ?? '',
        onChanged: nameRow => {
            service.name = nameRow.text.trim();
            row.title = service.name || _('Unnamed service');
            saveServices(state);
        },
    });

    addComboRow(row, {
        title: _('Type'),
        labels: [
            _('User systemd service'),
            _('Docker container'),
        ],
        selected: service.type === TYPE_DOCKER ? 1 : 0,
        onSelected: typeRow => {
            service.type = typeRow.selected === 1
                ? TYPE_DOCKER
                : TYPE_SYSTEMD_USER;
            service.protectionOverride = undefined;
            syncServiceSafety(state, service);
            updatingProtection = true;
            protectionRow.active = service.protected;
            updatingProtection = false;
            row.subtitle = serviceSubtitle(service);
            saveServices(state);
            actions.renderDiscoveredServices();
        },
    });

    addEntryRow(row, {
        title: _('Unit or container name'),
        text: service.target ?? '',
        onChanged: targetRow => {
            service.target = targetRow.text.trim();
            service.protectionOverride = undefined;
            syncServiceSafety(state, service);
            updatingProtection = true;
            protectionRow.active = service.protected;
            updatingProtection = false;
            row.subtitle = serviceSubtitle(service);
            saveServices(state);
            actions.renderDiscoveredServices();
        },
    });

    protectionRow = addSwitchRow(row, {
        title: _('Stop protection'),
        subtitle: _('Require a second toggle before stopping this service.'),
        active: service.protected === true,
        onActiveChanged: protection => {
            if (updatingProtection)
                return;
            service.protected = protection.active;
            service.protectionOverride = protection.active;
            row.subtitle = serviceSubtitle(service);
            saveServices(state);
        },
    });
    return row;
}
