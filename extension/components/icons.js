import Gtk from 'gi://Gtk';

export function createIcon({
    iconName,
    tooltipText,
}) {
    return new Gtk.Image({
        icon_name: iconName,
        tooltip_text: tooltipText,
    });
}
