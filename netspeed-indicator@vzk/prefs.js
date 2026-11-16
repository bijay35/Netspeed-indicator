import GLib from 'gi://GLib';
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

        // Temperature unit
        const tempUnitRow = new Adw.ComboRow({
            title: 'Temperature Unit',
            subtitle: 'Choose Celsius or Fahrenheit',
        });
        const tempUnitModel = new Gtk.StringList();
        tempUnitModel.append('Celsius (°C)');
        tempUnitModel.append('Fahrenheit (°F)');
        tempUnitRow.set_model(tempUnitModel);

        const tempUnitMap = ['celsius', 'fahrenheit'];
        let currentTempUnit = settings.get_string('temperature-unit');
        tempUnitRow.set_selected(tempUnitMap.indexOf(currentTempUnit));
        tempUnitRow.connect('notify::selected', () => {
            settings.set_string('temperature-unit', tempUnitMap[tempUnitRow.get_selected()]);
        });
        weatherGroup.add(tempUnitRow);

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

        // -- World Clock Page --
        const clockPage = new Adw.PreferencesPage({
            title: 'World Clock',
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(clockPage);

        const clockGroup = new Adw.PreferencesGroup({
            title: 'World Clock Settings',
            description: 'Show times from different timezones',
        });
        clockPage.add(clockGroup);

        // Enable world clock
        const showClockRow = new Adw.SwitchRow({
            title: 'Enable World Clock',
            subtitle: 'Show timezone info in panel and dropdown',
        });
        settings.bind('show-dual-time', showClockRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        clockGroup.add(showClockRow);

        // Clock format
        const clockFormatRow = new Adw.ComboRow({
            title: 'Clock Format',
            subtitle: 'Choose 12-hour or 24-hour display',
        });
        const clockFormatModel = new Gtk.StringList();
        clockFormatModel.append('24-hour (14:30)');
        clockFormatModel.append('12-hour (2:30 PM)');
        clockFormatRow.set_model(clockFormatModel);

        const clockFormatMap = ['24h', '12h'];
        let currentFormat = settings.get_string('clock-format');
        clockFormatRow.set_selected(clockFormatMap.indexOf(currentFormat));
        clockFormatRow.connect('notify::selected', () => {
            settings.set_string('clock-format', clockFormatMap[clockFormatRow.get_selected()]);
        });
        clockGroup.add(clockFormatRow);

        // Default timezone selector
        const defaultTzRow = new Adw.ComboRow({
            title: 'Default Timezone',
            subtitle: 'Shown in the top bar beside weather',
        });
        clockGroup.add(defaultTzRow);

        // Timezone list group
        const tzListGroup = new Adw.PreferencesGroup({
            title: 'Timezones',
            description: 'Add up to 5 timezones (IANA format)',
        });
        clockPage.add(tzListGroup);

        // Helper to get short label from tz ID
        const getTzLabel = (tzId) => {
            let parts = tzId.split('/');
            return parts[parts.length - 1].replace(/_/g, ' ');
        };

        // Helper to rebuild the timezone list UI
        const rebuildTzList = () => {
            // Clear existing rows from the list group (keep only the add row at the end)
            let locations = settings.get_strv('timezone-locations');

            // Remove all dynamic rows
            if (this._tzRows) {
                this._tzRows.forEach(row => tzListGroup.remove(row));
            }
            this._tzRows = [];

            for (let i = 0; i < locations.length; i++) {
                let tzId = locations[i];
                let row = new Adw.ActionRow({
                    title: getTzLabel(tzId),
                    subtitle: tzId,
                });

                let removeBtn = new Gtk.Button({
                    icon_name: 'list-remove-symbolic',
                    valign: Gtk.Align.CENTER,
                    css_classes: ['flat'],
                });
                removeBtn.connect('clicked', () => {
                    let locs = settings.get_strv('timezone-locations');
                    let idx = locs.indexOf(tzId);
                    if (idx !== -1) {
                        locs.splice(idx, 1);
                        settings.set_strv('timezone-locations', locs);
                        // Adjust default index if needed
                        let defIdx = settings.get_int('default-timezone-index');
                        if (defIdx >= locs.length && locs.length > 0)
                            settings.set_int('default-timezone-index', locs.length - 1);
                        else if (locs.length === 0)
                            settings.set_int('default-timezone-index', 0);
                        rebuildTzList();
                        rebuildDefaultCombo();
                    }
                });
                row.add_suffix(removeBtn);
                tzListGroup.add(row);
                this._tzRows.push(row);
            }
        };

        // Helper to rebuild the default timezone combo
        const rebuildDefaultCombo = () => {
            let locations = settings.get_strv('timezone-locations');
            let model = new Gtk.StringList();
            for (let tz of locations) {
                model.append(getTzLabel(tz));
            }
            defaultTzRow.set_model(model);
            if (locations.length > 0) {
                let idx = settings.get_int('default-timezone-index');
                if (idx < 0 || idx >= locations.length) idx = 0;
                defaultTzRow.set_selected(idx);
            }
        };

        defaultTzRow.connect('notify::selected', () => {
            let locations = settings.get_strv('timezone-locations');
            let sel = defaultTzRow.get_selected();
            if (sel >= 0 && sel < locations.length) {
                settings.set_int('default-timezone-index', sel);
            }
        });

        // Add timezone row
        const addTzGroup = new Adw.PreferencesGroup({
            title: 'Add Timezone',
        });
        clockPage.add(addTzGroup);

        const addTzEntry = new Adw.EntryRow({
            title: 'Timezone ID',
        });
        addTzGroup.add(addTzEntry);

        const addTzBtn = new Adw.ActionRow({
            title: 'Add Timezone',
            activatable: true,
        });
        addTzBtn.add_suffix(new Gtk.Image({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        addTzBtn.connect('activated', () => {
            let tzId = addTzEntry.get_text().trim();
            if (!tzId) return;

            let locations = settings.get_strv('timezone-locations');
            if (locations.length >= 5) return;
            if (locations.includes(tzId)) return;

            // Validate timezone
            try {
                let tz = GLib.TimeZone.new_identifier(tzId);
                let dt = GLib.DateTime.new_now(tz);
                if (!dt) return;
            } catch (e) {
                return;
            }

            locations.push(tzId);
            settings.set_strv('timezone-locations', locations);
            addTzEntry.set_text('');
            rebuildTzList();
            rebuildDefaultCombo();
        });
        addTzGroup.add(addTzBtn);

        const tzHintGroup = new Adw.PreferencesGroup({
            title: 'Examples',
            description: 'Use IANA timezone IDs: America/New_York, Europe/London, Asia/Tokyo, Asia/Kathmandu, Australia/Sydney',
        });
        clockPage.add(tzHintGroup);

        // Initial build
        rebuildTzList();
        rebuildDefaultCombo();
    }
}
