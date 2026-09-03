import {execute} from './subprocess.js';
import {
    TYPE_DOCKER,
    TYPE_SYSTEMD_USER,
} from './serviceTypes.js';

function validateTarget(target) {
    if (typeof target !== 'string' || target.trim().length === 0)
        throw new Error('Service target is empty');
}

function throwOnFailure(result, action, target) {
    if (result.success)
        return;

    const detail = result.stderr || result.stdout ||
        `process exited with status ${result.status}`;
    throw new Error(`Could not ${action} ${target}: ${detail}`);
}

async function getSystemdActiveStates(services) {
    if (services.length === 0)
        return new Map();

    services.forEach(service => validateTarget(service.target));
    const result = await execute([
        'systemctl', '--user', 'is-active',
        ...services.map(service => service.target),
    ]);
    const output = result.stdout.trimEnd().split('\n');
    return new Map(services.map((service, index) => [
        service.id,
        output[index]?.trim() === 'active',
    ]));
}

async function getDockerActiveStates(services) {
    if (services.length === 0)
        return new Map();

    services.forEach(service => validateTarget(service.target));
    const result = await execute([
        'docker', 'inspect',
        '--format={{.Id}}\t{{.Name}}\t{{.State.Running}}',
        ...services.map(service => service.target),
    ]);
    const containers = result.stdout.split('\n').flatMap(line => {
        const [id, rawName, running] = line.trim().split('\t');
        return id && rawName
            ? [{id, name: rawName.replace(/^\//, ''), running}]
            : [];
    });

    return new Map(services.map(service => {
        const container = containers.find(candidate =>
            candidate.name === service.target ||
            candidate.id.startsWith(service.target)
        );
        return [service.id, container?.running === 'true'];
    }));
}

export async function getActiveStates(services) {
    const states = new Map(services.map(service => [service.id, false]));
    const systemd = services.filter(service =>
        service.type === TYPE_SYSTEMD_USER);
    const docker = services.filter(service =>
        service.type === TYPE_DOCKER);
    const results = await Promise.allSettled([
        getSystemdActiveStates(systemd),
        getDockerActiveStates(docker),
    ]);

    for (const result of results) {
        if (result.status === 'fulfilled') {
            for (const [id, active] of result.value)
                states.set(id, active);
        } else {
            console.warn(
                `Service Switchboard: batched status check failed: ` +
                (result.reason?.message ?? String(result.reason)));
        }
    }
    return states;
}

export async function isServiceActive(service) {
    validateTarget(service.target);

    if (service.type === TYPE_SYSTEMD_USER) {
        const result = await execute([
            'systemctl', '--user', 'is-active', '--quiet', service.target,
        ]);
        return result.success;
    }

    if (service.type === TYPE_DOCKER) {
        const result = await execute([
            'docker', 'inspect', '--format={{.State.Running}}', service.target,
        ]);
        return result.success && result.stdout.trim() === 'true';
    }

    throw new Error(`Unsupported service type: ${service.type}`);
}

export async function setServiceActive(service, active) {
    validateTarget(service.target);
    let result;

    if (service.type === TYPE_SYSTEMD_USER) {
        result = await execute([
            'systemctl', '--user', active ? 'start' : 'stop', service.target,
        ]);
    } else if (service.type === TYPE_DOCKER) {
        result = await execute([
            'docker', active ? 'start' : 'stop', service.target,
        ]);
    } else {
        throw new Error(`Unsupported service type: ${service.type}`);
    }

    throwOnFailure(result, active ? 'start' : 'stop', service.target);
}
