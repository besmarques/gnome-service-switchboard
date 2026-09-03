import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

export function addActor(parent, child) {
    if (typeof parent.add_child === 'function')
        parent.add_child(child);
    else
        parent.add_actor(child);
}

export function createPanelIndicator({
    title,
    iconName,
}) {
    const indicator = new PanelMenu.Button(0.0, title, false);
    indicator.add_child(new St.Icon({
        icon_name: iconName,
        style_class: 'system-status-icon',
    }));
    return indicator;
}

export function createPanelServiceScrollView() {
    return new St.ScrollView({
        style_class: 'service-switchboard-service-scroll',
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        overlay_scrollbars: true,
        enable_mouse_scrolling: true,
    });
}

export function createPanelServiceRow(label, active) {
    const row = new PopupMenu.PopupSwitchMenuItem(label, active, {});
    row.add_style_class_name('service-switchboard-service-row');
    return row;
}

export function addPanelEmptyItem(menu, label) {
    menu.addMenuItem(new PopupMenu.PopupMenuItem(
        label, {reactive: false, can_focus: false}));
}

export function addPanelSeparator(menu) {
    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
}

export function addPanelSubmenu(menu, label) {
    const submenu = new PopupMenu.PopupSubMenuMenuItem(label, false);
    menu.addMenuItem(submenu);
    return submenu;
}

export function createPanelMenuSection() {
    return new PopupMenu.PopupMenuSection();
}
