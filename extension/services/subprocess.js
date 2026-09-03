import Gio from 'gi://Gio';

export function execute(argv, {
    localeC = false,
} = {}) {
    let process;
    try {
        const launcher = new Gio.SubprocessLauncher({
            flags: Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE,
        });
        if (localeC)
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
