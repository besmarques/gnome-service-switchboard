// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gio from 'gi://Gio';

export const ServiceType = Object.freeze({
    SYSTEMD_USER: 'systemd-user',
    DOCKER: 'docker',
});

export class ServiceController {
    async isActive(service) {
        switch (service.type) {
        case ServiceType.SYSTEMD_USER:
            return this._systemdIsActive(service.target);
        case ServiceType.DOCKER:
            return this._dockerIsActive(service.target);
        default:
            throw new Error(`Unsupported service type: ${service.type}`);
        }
    }

    async setActive(service, active) {
        switch (service.type) {
        case ServiceType.SYSTEMD_USER:
            return this._setSystemdActive(service.target, active);
        case ServiceType.DOCKER:
            return this._setDockerActive(service.target, active);
        default:
            throw new Error(`Unsupported service type: ${service.type}`);
        }
    }

    async _systemdIsActive(unit) {
        this._validateTarget(unit);

        const result = await this._execute([
            'systemctl',
            '--user',
            'is-active',
            '--quiet',
            unit,
        ]);

        return result.success;
    }

    async _setSystemdActive(unit, active) {
        this._validateTarget(unit);

        const result = await this._execute([
            'systemctl',
            '--user',
            active ? 'start' : 'stop',
            unit,
        ]);

        this._throwOnFailure(result, active ? 'start' : 'stop', unit);
    }

    async _dockerIsActive(container) {
        this._validateTarget(container);

        const result = await this._execute([
            'docker',
            'inspect',
            '--format={{.State.Running}}',
            container,
        ]);

        if (!result.success)
            return false;

        return result.stdout.trim() === 'true';
    }

    async _setDockerActive(container, active) {
        this._validateTarget(container);

        const result = await this._execute([
            'docker',
            active ? 'start' : 'stop',
            container,
        ]);

        this._throwOnFailure(
            result,
            active ? 'start' : 'stop',
            container
        );
    }

    _validateTarget(target) {
        if (typeof target !== 'string' || target.trim().length === 0)
            throw new Error('Service target is empty');
    }

    _throwOnFailure(result, action, target) {
        if (result.success)
            return;

        const detail = result.stderr || result.stdout ||
            `process exited with status ${result.status}`;

        throw new Error(`Could not ${action} ${target}: ${detail}`);
    }

    _execute(argv) {
        let process;

        try {
            process = Gio.Subprocess.new(
                argv,
                Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE
            );
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
