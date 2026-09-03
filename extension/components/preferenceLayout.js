import Adw from 'gi://Adw';

export function addPreferencesPage(window, {
    title,
    iconName,
}) {
    const page = new Adw.PreferencesPage({
        title,
        icon_name: iconName,
    });
    window.add(page);
    return page;
}

export function addPreferencesGroup(page, {
    title,
    description,
    headerSuffix,
}) {
    const group = new Adw.PreferencesGroup({title});
    if (description)
        group.description = description;
    if (headerSuffix)
        group.set_header_suffix(headerSuffix);
    page.add(group);
    return group;
}
