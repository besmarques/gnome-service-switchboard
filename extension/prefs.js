// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {
    ExtensionPreferences,
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const TYPE_SYSTEMD_USER = 'systemd-user';
const TYPE_DOCKER = 'docker';

export default class ServiceSwitchboardPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();
        this._services = this._loadServices();
        this._serviceRows = [];

        window._settings = this._settings;
        window.set_default_size(640, 620);

        const page = new Adw.PreferencesPage({
            title: _('Services'),
            icon_name: 'system-run-symbolic',
        });
        window.add(page);

        this._servicesGroup = new Adw.PreferencesGroup({
            title: _('Services'),
            description: _(
                'Add user systemd services or Docker containers to the panel menu.'
            ),
        });

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Add service'),
        });
        addButton.add_css_class('flat');
        addButton.connect('clicked', () => this._addService());

        this._servicesGroup.set_header_suffix(addButton);
        page.add(this._servicesGroup);

        const generalGroup = new Adw.PreferencesGroup({
            title: _('General'),
        });
        page.add(generalGroup);

        const adjustment = new Gtk.Adjustment({
            lower: 2,
            upper: 300,
            step_increment: 1,
            page_increment: 10,
            value: 10,
        });

        const refreshRow = new Adw.SpinRow({
            title: _('Refresh interval'),
            subtitle: _('How often service status is checked, in seconds.'),
            adjustment,
        });
        generalGroup.add(refreshRow);

        this._settings.bind(
            'refresh-interval',
            refreshRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        const infoGroup = new Adw.PreferencesGroup({
            title: _('Supported backends'),
        });
        page.add(infoGroup);

        infoGroup.add(new Adw.ActionRow({
            title: _('User systemd services'),
            subtitle: _('Controlled with systemctl --user. No root access is used.'),
        }));

        infoGroup.add(new Adw.ActionRow({
            title: _('Docker containers'),
            subtitle: _(
                'Controlled with the Docker CLI using the current user permissions.'
            ),
        }));

        this._renderServices();
    }

    _addService() {
        this._services.push({
            id: GLib.uuid_string_random(),
            name: _('New service'),
            type: TYPE_SYSTEMD_USER,
            target: '',
        });

        this._saveServices();
        this._renderServices(this._services.length - 1);
    }

    _renderServices(expandIndex = -1) {
        for (const row of this._serviceRows)
            this._servicesGroup.remove(row);

        this._serviceRows = [];

        this._services.forEach((service, index) => {
            const row = this._createServiceRow(service, index);
            row.expanded = index === expandIndex;
            this._serviceRows.push(row);
            this._servicesGroup.add(row);
        });

        if (this._services.length === 0) {
            const emptyRow = new Adw.ActionRow({
                title: _('No services yet'),
                subtitle: _('Use the + button to add your first service.'),
            });
            emptyRow.sensitive = false;
            this._serviceRows.push(emptyRow);
            this._servicesGroup.add(emptyRow);
        }
    }

    _createServiceRow(service, index) {
        const row = new Adw.ExpanderRow({
            title: service.name || _('Unnamed service'),
            subtitle: this._serviceSubtitle(service),
        });

        const removeButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Remove service'),
        });
        removeButton.add_css_class('flat');
        removeButton.connect('clicked', () => {
            this._services.splice(index, 1);
            this._saveServices();
            this._renderServices();
        });
        row.add_suffix(removeButton);

        const nameRow = new Adw.EntryRow({
            title: _('Display name'),
            text: service.name ?? '',
        });
        nameRow.connect('changed', () => {
            service.name = nameRow.text.trim();
            row.title = service.name || _('Unnamed service');
            this._saveServices();
        });
        row.add_row(nameRow);

        const typeModel = Gtk.StringList.new([
            _('User systemd service'),
            _('Docker container'),
        ]);

        const typeRow = new Adw.ComboRow({
            title: _('Type'),
            model: typeModel,
            selected: service.type === TYPE_DOCKER ? 1 : 0,
        });
        typeRow.connect('notify::selected', () => {
            service.type = typeRow.selected === 1
                ? TYPE_DOCKER
                : TYPE_SYSTEMD_USER;
            row.subtitle = this._serviceSubtitle(service);
            this._saveServices();
        });
        row.add_row(typeRow);

        const targetRow = new Adw.EntryRow({
            title: _('Unit or container name'),
            text: service.target ?? '',
        });
        targetRow.connect('changed', () => {
            service.target = targetRow.text.trim();
            row.subtitle = this._serviceSubtitle(service);
            this._saveServices();
        });
        row.add_row(targetRow);

        return row;
    }

    _serviceSubtitle(service) {
        const type = service.type === TYPE_DOCKER
            ? _('Docker')
            : _('systemd user');

        const target = service.target?.trim()
            ? service.target.trim()
            : _('not configured');

        return `${type} · ${target}`;
    }

    _saveServices() {
        this._settings.set_string(
            'services-json',
            JSON.stringify(this._services)
        );
    }

    _loadServices() {
        try {
            const parsed = JSON.parse(
                this._settings.get_string('services-json')
            );

            if (!Array.isArray(parsed))
                return [];

            return parsed.map(service => ({
                id: typeof service?.id === 'string'
                    ? service.id
                    : GLib.uuid_string_random(),
                name: typeof service?.name === 'string'
                    ? service.name
                    : '',
                type: service?.type === TYPE_DOCKER
                    ? TYPE_DOCKER
                    : TYPE_SYSTEMD_USER,
                target: typeof service?.target === 'string'
                    ? service.target
                    : '',
            }));
        } catch (error) {
            console.warn(
                `Service Switchboard preferences: invalid configuration: ` +
                error.message
            );
            return [];
        }
    }
}
