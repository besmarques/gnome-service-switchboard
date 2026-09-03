import {execute} from '../services/subprocess.js';
import {
    TYPE_DOCKER,
    TYPE_SYSTEMD_USER,
} from '../services/serviceTypes.js';

function assertSuccess(result, message) {
    if (result.success)
        return;

    const detail = result.stderr.trim() || result.stdout.trim() ||
        `process exited with status ${result.status}`;
    throw new Error(`${message}: ${detail}`);
}

function isSystemManaged(fragmentPath) {
    return fragmentPath.length === 0 ||
        fragmentPath.startsWith('/usr/lib/systemd/user/') ||
        fragmentPath.startsWith('/lib/systemd/user/') ||
        fragmentPath.includes('/systemd/generator');
}

async function addSystemdOrigins(services) {
    if (services.length === 0)
        return;

    const result = await execute([
        'systemctl', '--user', 'show',
        '--property=Id', '--property=FragmentPath',
        ...services.map(service => service.target),
    ], {localeC: true});
    assertSuccess(result, 'Could not identify user service origins');

    const paths = new Map();
    for (const block of result.stdout.trim().split(/\n\s*\n/)) {
        const properties = new Map(block.split('\n').map(line => {
            const separator = line.indexOf('=');
            return [line.slice(0, separator), line.slice(separator + 1)];
        }));
        if (properties.has('Id'))
            paths.set(properties.get('Id'), properties.get('FragmentPath') ?? '');
    }

    for (const service of services) {
        const fragmentPath = paths.get(service.target) ?? '';
        service.fragmentPath = fragmentPath;
        service.protected = isSystemManaged(fragmentPath);
    }
}

async function discoverSystemdUserServices() {
    const [filesResult, unitsResult] = await Promise.all([
        execute([
            'systemctl', '--user', 'list-unit-files',
            '--type=service', '--no-legend', '--no-pager', '--plain',
        ], {localeC: true}),
        execute([
            'systemctl', '--user', 'list-units', '--type=service', '--all',
            '--no-legend', '--no-pager', '--plain',
        ], {localeC: true}),
    ]);
    assertSuccess(filesResult, 'Could not discover user services');
    assertSuccess(unitsResult, 'Could not read user service status');

    const loadedUnits = new Map();
    for (const line of unitsResult.stdout.split('\n')) {
        const fields = line.trim().split(/\s+/);
        const unit = fields[0];
        if (fields.length >= 4 && unit?.endsWith('.service') &&
            fields[1] === 'loaded') {
            loadedUnits.set(unit, {
                name: fields.slice(4).join(' ') ||
                    unit.slice(0, -'.service'.length),
                running: fields[2] === 'active',
            });
        }
    }

    const services = [];
    const seen = new Set();
    for (const line of filesResult.stdout.split('\n')) {
        const [unit] = line.trim().split(/\s+/);
        if (!unit?.endsWith('.service') || unit.includes('@.') || seen.has(unit))
            continue;

        seen.add(unit);
        const loaded = loadedUnits.get(unit);
        services.push({
            name: loaded?.name ?? unit.slice(0, -'.service'.length),
            type: TYPE_SYSTEMD_USER,
            target: unit,
            running: loaded?.running ?? false,
        });
    }

    for (const [unit, loaded] of loadedUnits) {
        if (seen.has(unit) || unit.includes('@.'))
            continue;
        services.push({
            name: loaded.name,
            type: TYPE_SYSTEMD_USER,
            target: unit,
            running: loaded.running,
        });
    }

    await addSystemdOrigins(services);
    return services;
}

async function discoverDockerContainers() {
    const result = await execute([
        'docker', 'container', 'ls', '--all',
        '--format={{.Names}}\t{{.State}}',
    ], {localeC: true});
    assertSuccess(result, 'Could not discover Docker containers');

    return result.stdout.split('\n').flatMap(line => {
        const [name, state] = line.trim().split('\t');
        return name ? [{
            name,
            type: TYPE_DOCKER,
            target: name,
            running: state === 'running',
        }] : [];
    });
}

export async function discoverServices() {
    const results = await Promise.allSettled([
        discoverSystemdUserServices(),
        discoverDockerContainers(),
    ]);
    const services = [];
    const errors = [];

    for (const result of results) {
        if (result.status === 'fulfilled')
            services.push(...result.value);
        else
            errors.push(result.reason?.message ?? String(result.reason));
    }

    services.sort((left, right) =>
        left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
    return {services, errors};
}
