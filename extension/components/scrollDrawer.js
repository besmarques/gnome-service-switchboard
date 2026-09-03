import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {createFlatButton} from './buttons.js';

const DEFAULT_MAX_VISIBLE_ROWS = 5;
const ROW_SLOT_HEIGHT = 56;

export function addScrollDrawer(page, {
    title,
    description,
    expanded = false,
    maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
}) {
    const group = new Adw.PreferencesGroup();
    const rows = [];
    let expandedState = expanded;
    let contentWidget = null;

    const toggleButton = createFlatButton({
        icon_name: expandedState ? 'pan-down-symbolic' : 'pan-end-symbolic',
        tooltip_text: title,
    });
    const header = new Adw.ActionRow({
        title,
        subtitle: description ?? '',
        activatable: true,
    });
    header.add_suffix(toggleButton);
    header.activatable_widget = toggleButton;
    group.add(header);

    const list = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
        vexpand: false,
    });
    list.add_css_class('boxed-list');

    const scroll = new Gtk.ScrolledWindow({
        hscrollbar_policy: Gtk.PolicyType.NEVER,
        vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
        propagate_natural_height: false,
        vexpand: false,
    });

    page.add(group);

    function detachContent() {
        if (!contentWidget)
            return;

        if (contentWidget === scroll) {
            group.remove(scroll);
            scroll.set_child(null);
        } else {
            group.remove(list);
        }
        contentWidget = null;
    }

    function attachPlainList() {
        if (contentWidget === list)
            return;

        detachContent();
        list.height_request = -1;
        group.add(list);
        contentWidget = list;
    }

    function attachScrolledList() {
        if (contentWidget === scroll)
            return;

        detachContent();
        list.height_request = -1;
        scroll.set_child(list);
        group.add(scroll);
        contentWidget = scroll;
    }

    function setExpanded(value) {
        expandedState = value;
        toggleButton.icon_name = expandedState
            ? 'pan-down-symbolic'
            : 'pan-end-symbolic';
        updateContent();
    }

    function updateContent() {
        if (!expandedState) {
            detachContent();
            return;
        }

        if (rows.length <= maxVisibleRows) {
            attachPlainList();
            return;
        }

        attachScrolledList();
        const height = maxVisibleRows * ROW_SLOT_HEIGHT;
        scroll.min_content_height = height;
        scroll.max_content_height = height;
        scroll.height_request = height;
    }

    toggleButton.connect('clicked', () => setExpanded(!expandedState));
    updateContent();

    return {
        get description() {
            return header.subtitle;
        },
        set description(value) {
            header.subtitle = value ?? '';
        },
        get visible() {
            return group.visible;
        },
        set visible(value) {
            group.visible = value;
        },
        add(row) {
            rows.push(row);
            list.append(row);
            updateContent();
        },
        remove(row) {
            const index = rows.indexOf(row);
            if (index >= 0)
                rows.splice(index, 1);
            list.remove(row);
            updateContent();
        },
        setExpanded,
    };
}
