import GLib from 'gi://GLib';

import {
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    createFlatButton,
    createFlatToggleButton,
    createHeaderActions,
} from '../components/buttons.js';
import {
    addPreferencesGroup,
    addPreferencesPage,
} from '../components/preferenceLayout.js';
import {
    addActionRow,
    addComboRow,
    addEntryRow,
    addSpinnerRow,
    addSwitchRow,
} from '../components/preferenceRows.js';
import {addScrollDrawer} from '../components/scrollDrawer.js';
import {discoverServices} from '../discovery/serviceDiscovery.js';
import {
    addDiscoveryMessage,
    clearDiscoveryRows,
    renderDiscoveryBackend,
} from '../preferences/discoveryRows.js';
import {
    isConfigured,
    loadServices,
    saveServices,
    TYPE_DOCKER,
    TYPE_SYSTEMD_USER,
    updateSafetyMetadata,
} from '../preferences/serviceModel.js';

function getCustomServiceDraft(state) {
    return {
        name: state.customNameRow.text.trim(),
        type: state.customTypeRow.selected === 1 ? TYPE_DOCKER : TYPE_SYSTEMD_USER,
        target: state.customTargetRow.text.trim(),
        protected: state.customProtectionRow.active,
    };
}

function updateCustomSaveButton(state) {
    const draft = getCustomServiceDraft(state);
    const duplicate = state.services.some(service =>
        service.type === draft.type && service.target === draft.target);
    state.customSaveButton.sensitive = draft.target.length > 0 && !duplicate;
}

function resetCustomServiceForm(state) {
    state.customNameRow.text = '';
    state.customTypeRow.selected = 0;
    state.customTargetRow.text = '';
    state.customProtectionRow.active = false;
    updateCustomSaveButton(state);
}

function hideCustomServiceForm(state) {
    state.customFormGroup.visible = false;
    state.customSetupButton.sensitive = true;
}

function cancelCustomServiceForm(state) {
    resetCustomServiceForm(state);
    hideCustomServiceForm(state);
}

function showCustomServiceForm(state) {
    state.customFormGroup.visible = true;
    state.customSetupButton.sensitive = false;
}

function addCustomServiceGroup(page, state, onCustomServiceSaved) {
    const notifyCustomServiceSaved = typeof onCustomServiceSaved === 'function'
        ? onCustomServiceSaved
        : () => {};

    state.customSetupButton = createFlatButton({
        icon_name: 'list-add-symbolic',
        tooltip_text: _('Add a custom service manually'),
    });
    addPreferencesGroup(page, {
        title: _('Custom service'),
        description: _('Use manual setup for services that discovery cannot find.'),
        headerSuffix: createHeaderActions([state.customSetupButton]),
    });

    state.customFormGroup = addPreferencesGroup(page, {
        title: _('Manual setup'),
        description: _('Fill in the service details, then save.'),
    });
    state.customFormGroup.visible = false;

    state.customNameRow = addEntryRow(state.customFormGroup, {
        title: _('Display name'),
        onChanged: () => updateCustomSaveButton(state),
    });

    state.customTypeRow = addComboRow(state.customFormGroup, {
        title: _('Type'),
        labels: [
            _('User systemd service'),
            _('Docker container'),
        ],
        selected: 0,
        onSelected: () => updateCustomSaveButton(state),
    });

    state.customTargetRow = addEntryRow(state.customFormGroup, {
        title: _('Unit or container name'),
        onChanged: () => updateCustomSaveButton(state),
    });

    state.customProtectionRow = addSwitchRow(state.customFormGroup, {
        title: _('Stop protection'),
        subtitle: _('Require a second toggle before stopping this service.'),
        active: false,
    });

    state.customSaveButton = createFlatButton({
        label: _('Save'),
        tooltip_text: _('Save this service'),
        sensitive: false,
    });
    state.customCancelButton = createFlatButton({
        label: _('Cancel'),
        tooltip_text: _('Close manual setup without saving'),
    });
    addActionRow(state.customFormGroup, {
        title: _('Actions'),
        subtitle: _('Save adds the service; Cancel closes this form.'),
        suffix: createHeaderActions([
            state.customCancelButton,
            state.customSaveButton,
        ]),
    });

    state.customSetupButton.connect('clicked', () => showCustomServiceForm(state));
    state.customCancelButton.connect('clicked', () => cancelCustomServiceForm(state));
    state.customSaveButton.connect('clicked', () => {
        state.services = loadServices(state.settings);
        const draft = getCustomServiceDraft(state);
        if (draft.target.length === 0 || isConfigured(state, draft))
            return;

        const service = {
            id: GLib.uuid_string_random(),
            name: draft.name || draft.target,
            type: draft.type,
            target: draft.target,
            protected: draft.protected,
            protectionOverride: draft.protected,
        };
        state.services.unshift(service);
        saveServices(state);
        resetCustomServiceForm(state);
        hideCustomServiceForm(state);
        notifyCustomServiceSaved(service);
    });
}

function addDiscoveryGroups(page, state) {
    state.showStoppedButton = createFlatToggleButton({
        label: _('Stopped'),
        tooltip_text: _('Include inactive services and stopped containers'),
    });
    state.addAllRunningButton = createFlatButton({
        label: _('Add running'),
        tooltip_text: _('Add every running service that is not configured yet'),
    });
    state.refreshDiscoveryButton = createFlatButton({
        icon_name: 'view-refresh-symbolic',
        tooltip_text: _('Discover services again'),
    });
    state.discoveryGroup = addPreferencesGroup(page, {
        title: _('Discovery'),
        headerSuffix: createHeaderActions([
            state.showStoppedButton,
            state.addAllRunningButton,
            state.refreshDiscoveryButton,
        ]),
    });

    state.personalDiscoveryGroup = addScrollDrawer(page, {
        title: _('Your services'),
        maxVisibleRows: 5,
    });
    state.systemDiscoveryGroup = addScrollDrawer(page, {
        title: _('Desktop and system services'),
        maxVisibleRows: 5,
    });
    state.dockerDiscoveryGroup = addScrollDrawer(page, {
        title: _('Docker containers'),
        maxVisibleRows: 5,
    });
}

function createActions(state) {
    const actions = {};

    actions.renderDiscoveredServices = (
        errors = state.discoveryErrors
    ) => {
        state.services = loadServices(state.settings);
        clearDiscoveryRows(state);
        state.personalDiscoveryGroup.visible = true;
        state.systemDiscoveryGroup.visible = true;
        state.dockerDiscoveryGroup.visible = true;
        const onAdd = service => actions.addDiscovered(service);
        renderDiscoveryBackend(state, {
            group: state.personalDiscoveryGroup,
            predicate: service =>
                service.type === TYPE_SYSTEMD_USER && !service.protected,
            onAdd,
        });
        renderDiscoveryBackend(state, {
            group: state.systemDiscoveryGroup,
            predicate: service =>
                service.type === TYPE_SYSTEMD_USER && service.protected,
            warning: _(
                'Stopping these can disrupt your desktop session or applications.'),
            onAdd,
        });
        renderDiscoveryBackend(state, {
            group: state.dockerDiscoveryGroup,
            predicate: service => service.type === TYPE_DOCKER,
            onAdd,
        });
        if (errors.length > 0) {
            addDiscoveryMessage(
                state,
                state.discoveryGroup,
                _('Some services could not be discovered'),
                errors.join('\n'));
        }
        state.addAllRunningButton.sensitive = state.discoveredServices.some(
            service => service.running && !isConfigured(state, service));
    };

    actions.renderDiscoveryLoading = () => {
        clearDiscoveryRows(state);
        const row = addSpinnerRow(
            state.discoveryGroup,
            _('Discovering services...')
        );
        state.discoveryRows.push({group: state.discoveryGroup, row});
        state.personalDiscoveryGroup.visible = false;
        state.systemDiscoveryGroup.visible = false;
        state.dockerDiscoveryGroup.visible = false;
        state.showStoppedButton.sensitive = false;
        state.addAllRunningButton.sensitive = false;
    };

    actions.discover = async () => {
        state.refreshDiscoveryButton.sensitive = false;
        actions.renderDiscoveryLoading();
        try {
            const {services, errors} = await discoverServices();
            state.discoveredServices = services;
            state.discoveryErrors = errors;
            updateSafetyMetadata(state);
            actions.renderDiscoveredServices(errors);
        } catch (error) {
            state.discoveredServices = [];
            state.discoveryErrors = [error.message];
            actions.renderDiscoveredServices();
        } finally {
            state.refreshDiscoveryButton.sensitive = true;
            state.showStoppedButton.sensitive = true;
        }
    };

    actions.addDiscovered = discovered => {
        if (isConfigured(state, discovered))
            return;
        state.services.push({
            id: GLib.uuid_string_random(),
            name: discovered.name,
            type: discovered.type,
            target: discovered.target,
            protected: discovered.protected === true,
        });
        saveServices(state);
        actions.renderDiscoveredServices();
    };

    actions.addAllRunning = () => {
        const services = state.discoveredServices.filter(service =>
            service.running && !isConfigured(state, service));
        services.forEach(service => state.services.push({
            id: GLib.uuid_string_random(),
            name: service.name,
            type: service.type,
            target: service.target,
            protected: service.protected === true,
        }));
        if (services.length > 0)
            saveServices(state);
        actions.renderDiscoveredServices();
    };

    return actions;
}

export function addServicesPage(window, settings, {
    onCustomServiceSaved,
} = {}) {
    const state = {
        settings,
        services: loadServices(settings),
        discoveredServices: [],
        discoveryErrors: [],
        discoveryRows: [],
    };

    const page = addPreferencesPage(window, {
        title: _('Add Services'),
        iconName: 'list-add-symbolic',
    });

    addCustomServiceGroup(page, state, onCustomServiceSaved);
    addDiscoveryGroups(page, state);

    const actions = createActions(state);
    state.showStoppedButton.connect(
        'toggled', () => actions.renderDiscoveredServices());
    state.addAllRunningButton.connect('clicked', actions.addAllRunning);
    state.refreshDiscoveryButton.connect('clicked', actions.discover);
    settings.connect('changed::services-json', () => {
        actions.renderDiscoveredServices();
        updateCustomSaveButton(state);
    });

    actions.renderDiscoveryLoading();
    actions.discover();
}
