import {
    addPreferencesGroup,
    addPreferencesPage,
} from '../components/preferenceLayout.js';
import {
    addActionRow,
    addLinkRow,
} from '../components/preferenceRows.js';

import {
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/besmarques';

function addAboutPage(window, metadata) {
    const page = addPreferencesPage(window, {
        title: _('About'),
        iconName: 'help-about-symbolic',
    });

    const overviewGroup = addPreferencesGroup(page, {
        title: _('Service Switchboard'),
        description: _(
            'Control selected local services from a compact GNOME Shell menu.'),
    });
    addActionRow(overviewGroup, {
        title: _('Version'),
        subtitle: metadata['version-name'] ?? String(metadata.version),
    });
    addActionRow(overviewGroup, {
        title: _('Service control'),
        subtitle: _(
            'Uses systemctl --user and Docker with your existing permissions.'),
    });
    addActionRow(overviewGroup, {
        title: _('Privacy'),
        subtitle: _('Discovery and service control stay on this computer.'),
    });

    const linksGroup = addPreferencesGroup(page, {title: _('Links')});
    addLinkRow(
        linksGroup,
        _('Project website'),
        _('Source code, documentation, and issue tracker'),
        metadata.url);
    addLinkRow(
        linksGroup,
        _('Buy me a coffee'),
        'buymeacoffee.com/besmarques',
        BUY_ME_A_COFFEE_URL);

    const backendsGroup = addPreferencesGroup(page, {
        title: _('Supported backends'),
    });
    addActionRow(backendsGroup, {
        title: _('User systemd services'),
        subtitle: _('Controlled with systemctl --user. No root access is used.'),
    });
    addActionRow(backendsGroup, {
        title: _('Docker containers'),
        subtitle: _(
            'Controlled with the Docker CLI using the current user permissions.'),
    });

    const safetyGroup = addPreferencesGroup(page, {title: _('Safety')});
    addActionRow(safetyGroup, {
        title: _('Protected services'),
        subtitle: _(
            'Desktop and system services require a second stop toggle ' +
            'within ten seconds.'),
    });
    addActionRow(safetyGroup, {
        title: _('Privileges'),
        subtitle: _(
            'The extension never requests root access or executes through a shell.'),
    });
}

export {addAboutPage};
