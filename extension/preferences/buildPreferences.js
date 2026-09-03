import {addAboutPage} from '../pages/aboutPage.js';
import {addActiveServicesPage} from '../pages/activeServicesPage.js';
import {addServicesPage} from '../pages/addServicesPage.js';

function showPage(window, page) {
    if (!page)
        return;
    if (typeof window.set_visible_page === 'function') {
        window.set_visible_page(page);
        return;
    }
    try {
        window.visible_page = page;
    } catch (error) {}
}

export function buildPreferences({settings, metadata}, window) {
    window._settings = settings;
    window.set_default_size(640, 620);
    window.search_enabled = true;

    const activeServices = addActiveServicesPage(window, settings);
    addServicesPage(window, settings, {
        onCustomServiceSaved: service => {
            activeServices.focusService(service.id);
            showPage(window, activeServices.page);
        },
    });
    addAboutPage(window, metadata);
}
