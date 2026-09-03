import {
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    loadServiceSettings,
    saveServiceSettings,
} from '../services/serviceSettings.js';
import {
    TYPE_DOCKER,
    TYPE_SYSTEMD_USER,
} from '../services/serviceTypes.js';

export {
    TYPE_DOCKER,
    TYPE_SYSTEMD_USER,
};

export function loadServices(settings) {
    return loadServiceSettings(settings);
}

export function saveServices(state) {
    saveServiceSettings(state.settings, state.services);
}

export function isConfigured(state, service) {
    return state.services.some(configured =>
        configured.type === service.type && configured.target === service.target);
}

export function serviceSubtitle(service) {
    const type = service.type === TYPE_DOCKER ? _('Docker') : _('systemd user');
    const target = service.target?.trim() || _('not configured');
    const warning = service.protected
        ? ` · ${_('caution required when stopping')}`
        : '';
    return `${type} · ${target}${warning}`;
}

export function syncServiceSafety(state, service) {
    const discovered = state.discoveredServices.find(candidate =>
        candidate.type === service.type && candidate.target === service.target);
    service.protected = discovered?.protected === true;
}

export function updateSafetyMetadata(state) {
    let changed = false;
    for (const configured of state.services) {
        const discovered = state.discoveredServices.find(service =>
            service.type === configured.type &&
            service.target === configured.target);
        if (!discovered ||
            typeof configured.protectionOverride === 'boolean' ||
            configured.protected === discovered.protected)
            continue;

        configured.protected = discovered.protected === true;
        changed = true;
    }
    if (changed)
        saveServices(state);
}
