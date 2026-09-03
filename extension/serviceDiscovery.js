// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gio from 'gi://Gio';

export const DiscoveredServiceType = Object.freeze({
    SYSTEMD_USER: 'systemd-user',
    DOCKER: 'docker',
});

export class ServiceDiscovery {
    async discover() {
        const results = await Promise.allSettled([
            this._discoverSystemdUserServices(),
            this._discoverDockerContainers(),
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
            left.type.localeCompare(right.type) ||
            left.name.localeCompare(right.name)
        );
        return {services, errors};
    }

    async _discoverSystemdUserServices() {
        const [filesResult, unitsResult] = await Promise.all([
            this._execute([
                'systemctl', '--user', 'list-unit-files',
                '--type=service', '--no-legend', '--no-pager', '--plain',
            ]),
            this._execute([
                'systemctl', '--user', 'list-units', '--type=service', '--all',
                '--no-legend', '--no-pager', '--plain',
            ]),
        ]);

        this._throwOnFailure(filesResult, 'Could not discover user services');
        this._throwOnFailure(unitsResult, 'Could not read user service status');

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
            if (!unit?.endsWith('.service') || unit.includes('@.') ||
                seen.has(unit))
                continue;

            seen.add(unit);
            const loaded = loadedUnits.get(unit);
            services.push({
                name: loaded?.name ?? unit.slice(0, -'.service'.length),
                type: DiscoveredServiceType.SYSTEMD_USER,
                target: unit,
                running: loaded?.running ?? false,
            });
        }

        // Include transient and instantiated units that have no standalone unit
        // file entry, while skipping uninstantiated templates such as foo@.service.
        for (const [unit, loaded] of loadedUnits) {
            if (seen.has(unit) || unit.includes('@.'))
                continue;

            services.push({
                name: loaded.name,
                type: DiscoveredServiceType.SYSTEMD_USER,
                target: unit,
                running: loaded.running,
            });
        }

        await this._addSystemdOrigins(services);
        return services;
    }

    async _addSystemdOrigins(services) {
        if (services.length === 0)
            return;

        const result = await this._execute([
            'systemctl', '--user', 'show',
            '--property=Id', '--property=FragmentPath',
            ...services.map(service => service.target),
        ]);
        this._throwOnFailure(result, 'Could not identify user service origins');

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
            service.protected = this._isSystemManaged(fragmentPath);
        }
    }

    _isSystemManaged(fragmentPath) {
        return fragmentPath.length === 0 ||
            fragmentPath.startsWith('/usr/lib/systemd/user/') ||
            fragmentPath.startsWith('/lib/systemd/user/') ||
            fragmentPath.includes('/systemd/generator');
    }

    async _discoverDockerContainers() {
        const result = await this._execute([
            'docker', 'container', 'ls', '--all',
            '--format={{.Names}}\t{{.State}}',
        ]);
        this._throwOnFailure(result, 'Could not discover Docker containers');

        const services = [];
        for (const line of result.stdout.split('\n')) {
            const [name, state] = line.trim().split('\t');
            if (!name)
                continue;

            services.push({
                name,
                type: DiscoveredServiceType.DOCKER,
                target: name,
                running: state === 'running',
            });
        }
        return services;
    }

    _throwOnFailure(result, message) {
        if (result.success)
            return;

        const detail = result.stderr.trim() || result.stdout.trim() ||
            `process exited with status ${result.status}`;
        throw new Error(`${message}: ${detail}`);
    }

    _execute(argv) {
        let process;
        try {
            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.STDOUT_PIPE |
                    Gio.SubprocessFlags.STDERR_PIPE,
            });
            launcher.setenv('LC_ALL', 'C', true);
            process = launcher.spawnv(argv);
        } catch (error) {
            return Promise.reject(error);
        }

        return new Promise((resolve, reject) => {
            process.communicate_utf8_async(null, null, (subprocess, result) => {
                try {
                    const [, stdout, stderr] =
                        subprocess.communicate_utf8_finish(result);
                    resolve({
                        success: subprocess.get_successful(),
                        status: subprocess.get_exit_status(),
                        stdout: stdout ?? '',
                        stderr: stderr ?? '',
                    });
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
}
