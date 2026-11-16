import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class NetSpeedPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // -- Display Page --
        const displayPage = new Adw.PreferencesPage({
            title: 'Display',
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(displayPage);

        const displayGroup = new Adw.PreferencesGroup({
            title: 'Speed Display',
            description: 'Configure what is shown in the top bar',
        });
        displayPage.add(displayGroup);

        // Show download speed
        const showDownRow = new Adw.SwitchRow({
            title: 'Show Download Speed',
            subtitle: 'Display download speed in top bar',
        });
        settings.bind('show-download', showDownRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(showDownRow);

        // Show upload speed
        const showUpRow = new Adw.SwitchRow({
            title: 'Show Upload Speed',
            subtitle: 'Display upload speed in top bar',
        });
        settings.bind('show-upload', showUpRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(showUpRow);

        // Speed unit
        const unitRow = new Adw.ComboRow({
            title: 'Speed Unit',
            subtitle: 'Choose how speeds are displayed',
        });
        const unitModel = new Gtk.StringList();
        unitModel.append('Adaptive (auto KB/s or MB/s)');
        unitModel.append('KB/s');
        unitModel.append('MB/s');
        unitRow.set_model(unitModel);

        const unitMap = ['adaptive', 'kbps', 'mbps'];
        let currentUnit = settings.get_string('speed-unit');
        unitRow.set_selected(unitMap.indexOf(currentUnit));
        unitRow.connect('notify::selected', () => {
            settings.set_string('speed-unit', unitMap[unitRow.get_selected()]);
        });
        displayGroup.add(unitRow);

        // Refresh interval
        const intervalRow = new Adw.SpinRow({
            title: 'Refresh Interval',
            subtitle: 'Update speed every N seconds',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 10,
                step_increment: 1,
                value: settings.get_int('refresh-interval'),
            }),
        });
        settings.bind('refresh-interval', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(intervalRow);

        // -- Data Usage Page --
        const dataPage = new Adw.PreferencesPage({
            title: 'Data Usage',
            icon_name: 'network-transmit-receive-symbolic',
        });
        window.add(dataPage);

        const dataGroup = new Adw.PreferencesGroup({
            title: 'Data Tracking',
            description: 'Track and manage data usage',
        });
        dataPage.add(dataGroup);

        // Show total data
        const showDataRow = new Adw.SwitchRow({
            title: 'Show Data Usage',
            subtitle: 'Track total data used in dropdown menu',
        });
        settings.bind('show-total-data', showDataRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        dataGroup.add(showDataRow);

        // Monthly reset
        const monthlyResetRow = new Adw.SwitchRow({
            title: 'Auto Reset Monthly',
            subtitle: 'Automatically reset data usage each month',
        });
        settings.bind('monthly-reset', monthlyResetRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        dataGroup.add(monthlyResetRow);

        // Reset day
        const resetDayRow = new Adw.SpinRow({
            title: 'Reset Day',
            subtitle: 'Day of month to reset data counters',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 28,
                step_increment: 1,
                value: settings.get_int('reset-day'),
            }),
        });
        settings.bind('reset-day', resetDayRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        dataGroup.add(resetDayRow);

        // Current usage info
        const infoGroup = new Adw.PreferencesGroup({
            title: 'Current Usage',
        });
        dataPage.add(infoGroup);

        let totalDown = settings.get_value('total-bytes-downloaded').get_int64();
        let totalUp = settings.get_value('total-bytes-uploaded').get_int64();
        let sinceDate = settings.get_string('tracking-start-date');

        const formatBytes = (bytes) => {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        };

        const downloadedRow = new Adw.ActionRow({
            title: 'Downloaded',
            subtitle: formatBytes(totalDown),
        });
        infoGroup.add(downloadedRow);

        const uploadedRow = new Adw.ActionRow({
            title: 'Uploaded',
            subtitle: formatBytes(totalUp),
        });
        infoGroup.add(uploadedRow);

        const totalRow = new Adw.ActionRow({
            title: 'Total',
            subtitle: formatBytes(totalDown + totalUp),
        });
        infoGroup.add(totalRow);

        const sinceRow = new Adw.ActionRow({
            title: 'Tracking Since',
            subtitle: sinceDate || 'N/A',
        });
        infoGroup.add(sinceRow);

        // -- Weather Page --
        const weatherPage = new Adw.PreferencesPage({
            title: 'Weather',
            icon_name: 'weather-few-clouds-symbolic',
        });
        window.add(weatherPage);

        const weatherGroup = new Adw.PreferencesGroup({
            title: 'Weather Settings',
            description: 'Show current weather info using wttr.in (no API key needed)',
        });
        weatherPage.add(weatherGroup);

        // Enable weather
        const showWeatherRow = new Adw.SwitchRow({
            title: 'Show Weather',
            subtitle: 'Enable weather display in menu and panel',
        });
        settings.bind('show-weather', showWeatherRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        weatherGroup.add(showWeatherRow);

        // Show in panel
        const weatherPanelRow = new Adw.SwitchRow({
            title: 'Show in Top Bar',
            subtitle: 'Display weather info next to network speed',
        });
        settings.bind('show-weather-in-panel', weatherPanelRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        weatherGroup.add(weatherPanelRow);

        // Location entry
        const locationRow = new Adw.EntryRow({
            title: 'Location',
            text: settings.get_string('weather-location'),
        });
        locationRow.connect('changed', () => {
            settings.set_string('weather-location', locationRow.get_text());
        });
        weatherGroup.add(locationRow);

        const hintGroup = new Adw.PreferencesGroup({
            title: 'Examples',
            description: 'Enter a city name like: London, New York, Tokyo, Kathmandu',
        });
        weatherPage.add(hintGroup);
    }
}
