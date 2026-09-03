import Gtk from 'gi://Gtk';

export function createFlatButton(options) {
    const button = new Gtk.Button({
        valign: Gtk.Align.CENTER,
        ...options,
    });
    button.add_css_class('flat');
    return button;
}

export function createFlatToggleButton(options) {
    const button = new Gtk.ToggleButton({
        valign: Gtk.Align.CENTER,
        ...options,
    });
    button.add_css_class('flat');
    return button;
}

export function createHeaderActions(children) {
    const box = new Gtk.Box({
        spacing: 6,
        valign: Gtk.Align.CENTER,
    });
    children.forEach(child => box.append(child));
    return box;
}
