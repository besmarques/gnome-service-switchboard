import GLib from 'gi://GLib';

import {
    TYPE_DOCKER,
    TYPE_SYSTEMD_USER,
} from './serviceTypes.js';

function normalizeService(service) {
    return {
        id: typeof service?.id === 'string'
            ? service.id
            : GLib.uuid_string_random(),
        name: typeof service?.name === 'string' ? service.name : '',
        type: service?.type === TYPE_DOCKER
            ? TYPE_DOCKER
            : TYPE_SYSTEMD_USER,
        target: typeof service?.target === 'string' ? service.target : '',
        protected: service?.protected === true,
        protectionOverride:
            typeof service?.protectionOverride === 'boolean'
                ? service.protectionOverride
                : undefined,
    };
}

export function isCompleteService(service) {
    return typeof service?.id === 'string' &&
        typeof service?.name === 'string' &&
        typeof service?.type === 'string' &&
        typeof service?.target === 'string' &&
        service.name.trim().length > 0 &&
        service.target.trim().length > 0;
}

export function loadServiceSettings(settings) {
    try {
        const parsed = JSON.parse(settings.get_string('services-json'));
        return Array.isArray(parsed) ? parsed.map(normalizeService) : [];
    } catch (error) {
        console.warn(
            `Service Switchboard: invalid services configuration: ` +
            error.message);
        return [];
    }
}

export function loadConfiguredServices(settings) {
    return loadServiceSettings(settings).filter(isCompleteService);
}

export function saveServiceSettings(settings, services) {
    settings.set_string('services-json', JSON.stringify(services));
}
