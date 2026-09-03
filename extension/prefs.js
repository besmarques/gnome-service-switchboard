import {
    ExtensionPreferences,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {buildPreferences} from './preferences/buildPreferences.js';

// GNOME opens this default class for the Preferences window. Keeping it tiny
// makes the non-OOP part of the preferences easier to follow.
export default class ServiceSwitchboardPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        buildPreferences({
            settings: this.getSettings(),
            metadata: this.metadata,
        }, window);
    }
}
