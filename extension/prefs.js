import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {
    ExtensionPreferences,
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {discoverServices} from './serviceDiscovery.js';

const TYPE_SYSTEMD_USER = 'systemd-user';
const TYPE_DOCKER = 'docker';
const BUY_ME_A_COFFEE_URL =
    'https://mc.buymeacoffee.com/links/' +
    'SyEkVMsyaFWlbffAdjfMsEffcXYiHflkffADJfPSAFdMvwVgfMCgYAElkXiIEVBsbiqkFAVRKfFaDJFRsXgGVMk/' +
    '3779507?link=besmarques';

export default class ServiceSwitchboardPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();
        this._services = this._loadServices();
        this._serviceRows = [];
        this._discoveredServices = [];
        this._discoveryErrors = [];
        this._discoveryRows = [];

        window._settings = this._settings;
        window.set_default_size(640, 620);
        window.search_enabled = true;

        const page = new Adw.PreferencesPage({
            title: _('Services'),
            icon_name: 'system-run-symbolic',
        });
        window.add(page);

        this._discoveryGroup = new Adw.PreferencesGroup({
            title: _('Discovered services'),
            description: _(
                'User systemd services and Docker containers found on this computer.'
            ),
        });
        page.add(this._discoveryGroup);

        const discoveryActions = new Gtk.Box({
            spacing: 6,
            valign: Gtk.Align.CENTER,
        });

        this._showStoppedButton = new Gtk.ToggleButton({
            label: _('Show stopped'),
            tooltip_text: _('Include inactive services and stopped containers'),
        });
        this._showStoppedButton.add_css_class('flat');
        this._showStoppedButton.connect('toggled', () =>
            this._renderDiscoveredServices());
        discoveryActions.append(this._showStoppedButton);

        this._addAllRunningButton = new Gtk.Button({
            label: _('Add all running'),
            tooltip_text: _('Add every running service that is not configured yet'),
        });
        this._addAllRunningButton.add_css_class('flat');
        this._addAllRunningButton.connect('clicked', () =>
            this._addAllRunning());
        discoveryActions.append(this._addAllRunningButton);

        this._refreshDiscoveryButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            tooltip_text: _('Discover services again'),
        });
        this._refreshDiscoveryButton.add_css_class('flat');
        this._refreshDiscoveryButton.connect('clicked', () =>
            this._discoverServices());
        discoveryActions.append(this._refreshDiscoveryButton);
        this._discoveryGroup.set_header_suffix(discoveryActions);

        this._personalDiscoveryGroup = new Adw.PreferencesGroup({
            title: _('Your services'),
        });
        page.add(this._personalDiscoveryGroup);

        this._systemDiscoveryGroup = new Adw.PreferencesGroup({
            title: _('Desktop and system services'),
        });
        page.add(this._systemDiscoveryGroup);

        this._dockerDiscoveryGroup = new Adw.PreferencesGroup({
            title: _('Docker containers'),
        });
        page.add(this._dockerDiscoveryGroup);

        this._servicesGroup = new Adw.PreferencesGroup({
            title: _('Panel services'),
            description: _(
                'These services appear in the top-panel menu. Use + for manual setup.'
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

        this._addDetailsPage(window);

        this._renderServices();
        this._renderDiscoveryLoading();
        this._discoverServices();
    }

    _addDetailsPage(window) {
        const page = new Adw.PreferencesPage({
            title: _('Details'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const aboutGroup = new Adw.PreferencesGroup({
            title: _('Service Switchboard'),
            description: _(
                'Control selected local services from a compact GNOME Shell menu.'
            ),
        });
        page.add(aboutGroup);

        aboutGroup.add(new Adw.ActionRow({
            title: _('Version'),
            subtitle: this.metadata['version-name'] ??
                String(this.metadata.version),
        }));
        aboutGroup.add(new Adw.ActionRow({
            title: _('Service control'),
            subtitle: _(
                'Uses systemctl --user and Docker with your existing permissions.'
            ),
        }));
        aboutGroup.add(new Adw.ActionRow({
            title: _('Privacy'),
            subtitle: _('Discovery and service control stay on this computer.'),
        }));

        const linksGroup = new Adw.PreferencesGroup({
            title: _('Links'),
        });
        page.add(linksGroup);
        this._addLinkRow(
            linksGroup,
            _('Project website'),
            _('Source code, documentation, and issue tracker'),
            this.metadata.url
        );
        this._addLinkRow(
            linksGroup,
            _('Buy me a coffee'),
            'buymeacoffee.com/besmarques',
            BUY_ME_A_COFFEE_URL
        );

        const safetyGroup = new Adw.PreferencesGroup({
            title: _('Safety'),
        });
        page.add(safetyGroup);
        safetyGroup.add(new Adw.ActionRow({
            title: _('Protected services'),
            subtitle: _(
                'Desktop and system services require a second stop toggle ' +
                'within ten seconds.'
            ),
        }));
        safetyGroup.add(new Adw.ActionRow({
            title: _('Privileges'),
            subtitle: _(
                'The extension never requests root access or executes through a shell.'
            ),
        }));
    }

    _addLinkRow(group, title, subtitle, uri) {
        const row = new Adw.ActionRow({title, subtitle});
        const button = new Gtk.LinkButton({
            label: _('Open'),
            uri,
            valign: Gtk.Align.CENTER,
        });
        row.add_suffix(button);
        row.activatable_widget = button;
        group.add(row);
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

    async _discoverServices() {
        this._refreshDiscoveryButton.sensitive = false;
        this._renderDiscoveryLoading();

        try {
            const {services, errors} = await discoverServices();
            this._discoveredServices = services;
            this._discoveryErrors = errors;
            this._updateSafetyMetadata();
            this._renderDiscoveredServices(errors);
        } catch (error) {
            this._discoveredServices = [];
            this._discoveryErrors = [error.message];
            this._renderDiscoveredServices();
        } finally {
            this._refreshDiscoveryButton.sensitive = true;
            this._showStoppedButton.sensitive = true;
        }
    }

    _renderDiscoveryLoading() {
        this._clearDiscoveryRows();
        const row = new Adw.ActionRow({
            title: _('Discovering services…'),
        });
        row.add_suffix(new Gtk.Spinner({
            spinning: true,
            valign: Gtk.Align.CENTER,
        }));
        this._discoveryRows.push({group: this._discoveryGroup, row});
        this._discoveryGroup.add(row);
        this._personalDiscoveryGroup.visible = false;
        this._systemDiscoveryGroup.visible = false;
        this._dockerDiscoveryGroup.visible = false;
        this._showStoppedButton.sensitive = false;
        this._addAllRunningButton.sensitive = false;
    }

    _renderDiscoveredServices(errors = this._discoveryErrors) {
        this._clearDiscoveryRows();
        this._personalDiscoveryGroup.visible = true;
        this._systemDiscoveryGroup.visible = true;
        this._dockerDiscoveryGroup.visible = true;

        this._renderDiscoveryBackend(
            this._personalDiscoveryGroup,
            service => service.type === TYPE_SYSTEMD_USER && !service.protected
        );
        this._renderDiscoveryBackend(
            this._systemDiscoveryGroup,
            service => service.type === TYPE_SYSTEMD_USER && service.protected,
            _('Stopping these can disrupt your desktop session or applications.')
        );
        this._renderDiscoveryBackend(
            this._dockerDiscoveryGroup,
            service => service.type === TYPE_DOCKER
        );

        if (errors.length > 0) {
            this._addDiscoveryMessage(
                this._discoveryGroup,
                _('Some services could not be discovered'),
                errors.join('\n')
            );
        }

        this._addAllRunningButton.sensitive = this._discoveredServices.some(
            service => service.running && !this._isConfigured(service)
        );
    }

    _renderDiscoveryBackend(group, predicate, warning = '') {
        const discovered = this._discoveredServices.filter(
            predicate
        );
        const allAvailable = discovered.filter(service =>
            !this._isConfigured(service)
        );
        const available = allAvailable.filter(service =>
            service.running || this._showStoppedButton.active
        );
        available.sort((left, right) =>
            Number(right.running) - Number(left.running) ||
            left.name.localeCompare(right.name)
        );

        const running = allAvailable.filter(service => service.running).length;
        const stopped = allAvailable.length - running;
        const counts = this._showStoppedButton.active
            ? _('%d running · %d stopped')
                .replace('%d', running)
                .replace('%d', stopped)
            : _('%d running · %d stopped hidden')
                .replace('%d', running)
                .replace('%d', stopped);
        group.description = warning ? `${counts} · ${warning}` : counts;

        for (const service of available) {
            const state = service.running ? _('Running') : _('Stopped');
            const row = new Adw.ActionRow({
                title: service.name,
                subtitle: `${service.target} · ${state}`,
                use_markup: false,
            });
            row.add_prefix(new Gtk.Image({
                icon_name: service.protected
                    ? 'dialog-warning-symbolic'
                    : service.running
                        ? 'media-playback-start-symbolic'
                        : 'media-playback-stop-symbolic',
                tooltip_text: service.protected
                    ? _('Use caution when stopping this service')
                    : state,
            }));
            const addButton = new Gtk.Button({
                label: _('Add'),
                valign: Gtk.Align.CENTER,
            });
            addButton.add_css_class('flat');
            addButton.connect('clicked', () => this._addDiscovered(service));
            row.add_suffix(addButton);
            row.activatable_widget = addButton;
            this._discoveryRows.push({group, row});
            group.add(row);
        }

        if (available.length === 0) {
            let subtitle;
            let title;
            if (allAvailable.some(service => !service.running)) {
                title = _('No running services available');
                subtitle = _('Use Show stopped to see inactive services.');
            } else if (discovered.length > 0) {
                title = _('Nothing available to add');
                subtitle = _('Every discovered item is already in Panel services.');
            } else {
                title = _('Nothing available to add');
                subtitle = _('No services were discovered for this backend.');
            }
            this._addDiscoveryMessage(
                group,
                title,
                subtitle
            );
        }
    }

    _addDiscoveryMessage(group, title, subtitle) {
        const row = new Adw.ActionRow({title, subtitle});
        row.sensitive = false;
        this._discoveryRows.push({group, row});
        group.add(row);
    }

    _clearDiscoveryRows() {
        for (const {group, row} of this._discoveryRows)
            group.remove(row);
        this._discoveryRows = [];
    }

    _addDiscovered(discovered) {
        if (this._isConfigured(discovered))
            return;

        this._services.push({
            id: GLib.uuid_string_random(),
            name: discovered.name,
            type: discovered.type,
            target: discovered.target,
            protected: discovered.protected === true,
        });
        this._saveServices();
        this._renderServices();
        this._renderDiscoveredServices();
    }

    _addAllRunning() {
        const servicesToAdd = this._discoveredServices.filter(
            service => service.running && !this._isConfigured(service)
        );

        for (const service of servicesToAdd) {
            this._services.push({
                id: GLib.uuid_string_random(),
                name: service.name,
                type: service.type,
                target: service.target,
                protected: service.protected === true,
            });
        }

        if (servicesToAdd.length > 0)
            this._saveServices();
        this._renderServices();
        this._renderDiscoveredServices();
    }

    _isConfigured(service) {
        return this._services.some(configured =>
            configured.type === service.type &&
            configured.target === service.target
        );
    }

    _updateSafetyMetadata() {
        let changed = false;
        for (const configured of this._services) {
            const discovered = this._discoveredServices.find(service =>
                service.type === configured.type &&
                service.target === configured.target
            );
            if (!discovered ||
                typeof configured.protectionOverride === 'boolean' ||
                configured.protected === discovered.protected)
                continue;

            configured.protected = discovered.protected === true;
            changed = true;
        }

        if (changed)
            this._saveServices();
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
        let protectionRow;
        let updatingProtection = false;
        const row = new Adw.ExpanderRow({
            title: service.name || _('Unnamed service'),
            subtitle: this._serviceSubtitle(service),
            use_markup: false,
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
            this._renderDiscoveredServices();
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
            service.protectionOverride = undefined;
            this._syncServiceSafety(service);
            updatingProtection = true;
            protectionRow.active = service.protected;
            updatingProtection = false;
            row.subtitle = this._serviceSubtitle(service);
            this._saveServices();
            this._renderDiscoveredServices();
        });
        row.add_row(typeRow);

        const targetRow = new Adw.EntryRow({
            title: _('Unit or container name'),
            text: service.target ?? '',
        });
        targetRow.connect('changed', () => {
            service.target = targetRow.text.trim();
            service.protectionOverride = undefined;
            this._syncServiceSafety(service);
            updatingProtection = true;
            protectionRow.active = service.protected;
            updatingProtection = false;
            row.subtitle = this._serviceSubtitle(service);
            this._saveServices();
            this._renderDiscoveredServices();
        });
        row.add_row(targetRow);

        protectionRow = new Adw.SwitchRow({
            title: _('Stop protection'),
            subtitle: _(
                'Require a second toggle before stopping this service.'
            ),
            active: service.protected === true,
        });
        protectionRow.connect('notify::active', () => {
            if (updatingProtection)
                return;

            service.protected = protectionRow.active;
            service.protectionOverride = protectionRow.active;
            row.subtitle = this._serviceSubtitle(service);
            this._saveServices();
        });
        row.add_row(protectionRow);

        return row;
    }

    _serviceSubtitle(service) {
        const type = service.type === TYPE_DOCKER
            ? _('Docker')
            : _('systemd user');

        const target = service.target?.trim()
            ? service.target.trim()
            : _('not configured');

        const warning = service.protected
            ? ` · ${_('caution required when stopping')}`
            : '';
        return `${type} · ${target}${warning}`;
    }

    _syncServiceSafety(service) {
        const discovered = this._discoveredServices.find(candidate =>
            candidate.type === service.type &&
            candidate.target === service.target
        );
        service.protected = discovered?.protected === true;
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
                protected: service?.protected === true,
                protectionOverride:
                    typeof service?.protectionOverride === 'boolean'
                        ? service.protectionOverride
                        : undefined,
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
