import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function appendRow(container, row) {
    if (typeof container.add === 'function')
        container.add(row);
    else if (typeof container.add_row === 'function')
        container.add_row(row);
    else
        container.append(row);
}

export function addActionRow(group, {
    title,
    subtitle,
    prefix,
    suffix,
    activatableWidget,
    sensitive = true,
    useMarkup,
}) {
    const options = {title};
    if (subtitle !== undefined)
        options.subtitle = subtitle;
    if (useMarkup !== undefined)
        options.use_markup = useMarkup;

    const row = new Adw.ActionRow(options);
    if (prefix)
        row.add_prefix(prefix);
    if (suffix)
        row.add_suffix(suffix);
    if (activatableWidget)
        row.activatable_widget = activatableWidget;
    row.sensitive = sensitive;
    appendRow(group, row);
    return row;
}

export function addExpanderRow(group, {
    title,
    subtitle,
    suffix,
    useMarkup,
}) {
    const options = {title};
    if (subtitle !== undefined)
        options.subtitle = subtitle;
    if (useMarkup !== undefined)
        options.use_markup = useMarkup;

    const row = new Adw.ExpanderRow(options);
    if (suffix)
        row.add_suffix(suffix);
    appendRow(group, row);
    return row;
}

export function addEntryRow(group, {
    title,
    text = '',
    onChanged,
}) {
    const row = new Adw.EntryRow({title, text});
    if (onChanged)
        row.connect('changed', () => onChanged(row));
    appendRow(group, row);
    return row;
}

export function addComboRow(group, {
    title,
    labels,
    selected = 0,
    onSelected,
}) {
    const row = new Adw.ComboRow({
        title,
        model: Gtk.StringList.new(labels),
        selected,
    });
    if (onSelected)
        row.connect('notify::selected', () => onSelected(row));
    appendRow(group, row);
    return row;
}

export function addSwitchRow(group, {
    title,
    subtitle,
    active = false,
    onActiveChanged,
}) {
    const row = new Adw.SwitchRow({
        title,
        subtitle,
        active,
    });
    if (onActiveChanged)
        row.connect('notify::active', () => onActiveChanged(row));
    appendRow(group, row);
    return row;
}

export function addSpinRow(group, {
    title,
    subtitle,
    lower,
    upper,
    stepIncrement = 1,
    pageIncrement = 10,
    value,
}) {
    const row = new Adw.SpinRow({
        title,
        subtitle,
        adjustment: new Gtk.Adjustment({
            lower,
            upper,
            step_increment: stepIncrement,
            page_increment: pageIncrement,
            value,
        }),
    });
    appendRow(group, row);
    return row;
}

export function addDisabledRow(group, title, subtitle) {
    return addActionRow(group, {
        title,
        subtitle,
        sensitive: false,
    });
}

export function addSpinnerRow(group, title) {
    return addActionRow(group, {
        title,
        suffix: new Gtk.Spinner({
            spinning: true,
            valign: Gtk.Align.CENTER,
        }),
    });
}

export function addLinkRow(group, title, subtitle, uri) {
    const button = new Gtk.LinkButton({
        label: _('Open'),
        uri,
        valign: Gtk.Align.CENTER,
    });
    return addActionRow(group, {
        title,
        subtitle,
        suffix: button,
        activatableWidget: button,
    });
}
