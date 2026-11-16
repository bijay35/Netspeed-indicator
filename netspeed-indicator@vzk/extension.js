import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const NetSpeedIndicator = GObject.registerClass(
class NetSpeedIndicator extends PanelMenu.Button {
    _init(ext) {
        super._init(0.0, 'Net Speed Indicator');

        this._ext = ext;
        this._settings = ext.getSettings();
        this._prevRxBytes = 0;
        this._prevTxBytes = 0;
        this._prevTime = 0;
        this._soupSession = null;
        this._weatherText = '';

        // Top bar layout
        this._box = new St.BoxLayout({style_class: 'panel-status-menu-box'});

        // Speed label in the panel
        this._label = new St.Label({
            text: '--- / ---',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px; font-weight: bold; margin-left: 4px;',
        });
        this._box.add_child(this._label);

        this.add_child(this._box);

        // Dropdown menu items
        this._downloadItem = new PopupMenu.PopupMenuItem('Download: ---');
        this._downloadItem.sensitive = false;
        this.menu.addMenuItem(this._downloadItem);

        this._uploadItem = new PopupMenu.PopupMenuItem('Upload: ---');
        this._uploadItem.sensitive = false;
        this.menu.addMenuItem(this._uploadItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Data usage section
        this._dataUsedItem = new PopupMenu.PopupMenuItem('Data Used: ---');
        this._dataUsedItem.sensitive = false;
        this.menu.addMenuItem(this._dataUsedItem);

        this._dataUpItem = new PopupMenu.PopupMenuItem('Uploaded: ---');
        this._dataUpItem.sensitive = false;
        this.menu.addMenuItem(this._dataUpItem);

        this._dataDownItem = new PopupMenu.PopupMenuItem('Downloaded: ---');
        this._dataDownItem.sensitive = false;
        this.menu.addMenuItem(this._dataDownItem);

        this._trackingSinceItem = new PopupMenu.PopupMenuItem('Since: ---');
        this._trackingSinceItem.sensitive = false;
        this.menu.addMenuItem(this._trackingSinceItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Weather section
        this._weatherHeaderItem = new PopupMenu.PopupMenuItem('Weather: ---');
        this._weatherHeaderItem.sensitive = false;
        this.menu.addMenuItem(this._weatherHeaderItem);

        this._weatherTempItem = new PopupMenu.PopupMenuItem('Temperature: ---');
        this._weatherTempItem.sensitive = false;
        this.menu.addMenuItem(this._weatherTempItem);

        this._weatherCondItem = new PopupMenu.PopupMenuItem('Condition: ---');
        this._weatherCondItem.sensitive = false;
        this.menu.addMenuItem(this._weatherCondItem);

        this._weatherHumidityItem = new PopupMenu.PopupMenuItem('Humidity: ---');
        this._weatherHumidityItem.sensitive = false;
        this.menu.addMenuItem(this._weatherHumidityItem);

        this._refreshWeatherItem = new PopupMenu.PopupMenuItem('\uD83D\uDD04 Refresh Weather');
        this._refreshWeatherItem.connect('activate', () => this._fetchWeather());
        this.menu.addMenuItem(this._refreshWeatherItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Unit selector submenu
        let unitMenu = new PopupMenu.PopupSubMenuMenuItem('Speed Unit');
        this._unitAdaptive = new PopupMenu.PopupMenuItem('  Adaptive');
        this._unitKbps = new PopupMenu.PopupMenuItem('  KB/s');
        this._unitMbps = new PopupMenu.PopupMenuItem('  MB/s');

        this._unitAdaptive.connect('activate', () => this._settings.set_string('speed-unit', 'adaptive'));
        this._unitKbps.connect('activate', () => this._settings.set_string('speed-unit', 'kbps'));
        this._unitMbps.connect('activate', () => this._settings.set_string('speed-unit', 'mbps'));

        unitMenu.menu.addMenuItem(this._unitAdaptive);
        unitMenu.menu.addMenuItem(this._unitKbps);
        unitMenu.menu.addMenuItem(this._unitMbps);
        this.menu.addMenuItem(unitMenu);

        // Reset data usage
        let resetItem = new PopupMenu.PopupMenuItem('Reset Data Usage');
        resetItem.connect('activate', () => this._resetDataUsage());
        this.menu.addMenuItem(resetItem);

        // Settings
        let settingsItem = new PopupMenu.PopupMenuItem('Preferences...');
        settingsItem.connect('activate', () => ext.openPreferences());
        this.menu.addMenuItem(settingsItem);

        // Init tracking date if not set
        if (this._settings.get_string('tracking-start-date') === '') {
            this._settings.set_string('tracking-start-date', new Date().toISOString().split('T')[0]);
        }

        // Check monthly reset
        this._checkMonthlyReset();

        // Read initial network bytes
        [this._prevRxBytes, this._prevTxBytes] = this._getNetworkBytes();
        this._prevTime = GLib.get_monotonic_time();

        // Start update loop
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT,
            this._settings.get_int('refresh-interval'),
            () => {
                this._update();
                return GLib.SOURCE_CONTINUE;
            });

        this._settingsChangedId = this._settings.connect('changed::speed-unit', () => {
            this._updateUnitMarkers();
        });
        this._updateUnitMarkers();

        // Weather setup
        this._updateWeatherVisibility();
        this._weatherSettingsIds = [
            this._settings.connect('changed::show-weather', () => {
                this._updateWeatherVisibility();
                if (this._settings.get_boolean('show-weather'))
                    this._fetchWeather();
            }),
            this._settings.connect('changed::weather-location', () => {
                if (this._settings.get_boolean('show-weather'))
                    this._fetchWeather();
            }),
            this._settings.connect('changed::show-weather-in-panel', () => {
                // Panel label updates on next speed refresh cycle
            }),
        ];

        // Fetch weather now and every 10 minutes
        if (this._settings.get_boolean('show-weather'))
            this._fetchWeather();

        this._weatherTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 600, () => {
            if (this._settings.get_boolean('show-weather'))
                this._fetchWeather();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _updateUnitMarkers() {
        let unit = this._settings.get_string('speed-unit');
        this._unitAdaptive.label.text = (unit === 'adaptive' ? '> ' : '  ') + 'Adaptive';
        this._unitKbps.label.text = (unit === 'kbps' ? '> ' : '  ') + 'KB/s';
        this._unitMbps.label.text = (unit === 'mbps' ? '> ' : '  ') + 'MB/s';
    }

    _getNetworkBytes() {
        let rx = 0, tx = 0;
        try {
            let [ok, contents] = GLib.file_get_contents('/proc/net/dev');
            if (!ok) return [0, 0];

            let lines = new TextDecoder().decode(contents).split('\n');
            for (let i = 2; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line === '' || line.startsWith('lo:')) continue;

                let parts = line.split(/\s+/);
                if (parts.length < 10) continue;

                rx += parseInt(parts[1]) || 0;
                tx += parseInt(parts[9]) || 0;
            }
        } catch (e) {
            // ignore
        }
        return [rx, tx];
    }

    _formatSpeed(bytesPerSec) {
        let unit = this._settings.get_string('speed-unit');

        if (unit === 'kbps' || (unit === 'adaptive' && bytesPerSec < 1024 * 1024)) {
            let kbps = bytesPerSec / 1024;
            return `${kbps.toFixed(1)} KB/s`;
        } else {
            let mbps = bytesPerSec / (1024 * 1024);
            return `${mbps.toFixed(2)} MB/s`;
        }
    }

    _formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    _checkMonthlyReset() {
        if (!this._settings.get_boolean('monthly-reset')) return;

        let today = new Date();
        let resetDay = this._settings.get_int('reset-day');
        let startDateStr = this._settings.get_string('tracking-start-date');

        if (startDateStr === '') return;

        let startDate = new Date(startDateStr);
        // If we've passed the reset day in a new month since tracking started
        if (today.getDate() >= resetDay &&
            (today.getMonth() > startDate.getMonth() ||
             today.getFullYear() > startDate.getFullYear())) {
            this._resetDataUsage();
        }
    }

    _resetDataUsage() {
        this._settings.set_value('total-bytes-downloaded', GLib.Variant.new_int64(0));
        this._settings.set_value('total-bytes-uploaded', GLib.Variant.new_int64(0));
        this._settings.set_string('tracking-start-date', new Date().toISOString().split('T')[0]);
    }

    _update() {
        let now = GLib.get_monotonic_time();
        let [rxBytes, txBytes] = this._getNetworkBytes();

        let elapsed = (now - this._prevTime) / 1000000; // microseconds to seconds
        if (elapsed <= 0) elapsed = 1;

        let rxSpeed = (rxBytes - this._prevRxBytes) / elapsed;
        let txSpeed = (txBytes - this._prevTxBytes) / elapsed;

        // Avoid negative speeds on counter reset
        if (rxSpeed < 0) rxSpeed = 0;
        if (txSpeed < 0) txSpeed = 0;

        // Update data usage tracking
        let rxDelta = rxBytes - this._prevRxBytes;
        let txDelta = txBytes - this._prevTxBytes;
        if (rxDelta > 0) {
            let prev = this._settings.get_value('total-bytes-downloaded').get_int64();
            this._settings.set_value('total-bytes-downloaded', GLib.Variant.new_int64(prev + rxDelta));
        }
        if (txDelta > 0) {
            let prev = this._settings.get_value('total-bytes-uploaded').get_int64();
            this._settings.set_value('total-bytes-uploaded', GLib.Variant.new_int64(prev + txDelta));
        }

        this._prevRxBytes = rxBytes;
        this._prevTxBytes = txBytes;
        this._prevTime = now;

        // Update panel label
        let downStr = this._formatSpeed(rxSpeed);
        let upStr = this._formatSpeed(txSpeed);

        let showUp = this._settings.get_boolean('show-upload');
        let showDown = this._settings.get_boolean('show-download');

        let labelParts = [];
        if (showDown) labelParts.push(`\u2193${downStr}`);
        if (showUp) labelParts.push(`\u2191${upStr}`);

        // Append weather to the same line
        if (this._weatherText && this._settings.get_boolean('show-weather') &&
            this._settings.get_boolean('show-weather-in-panel')) {
            labelParts.push(this._weatherText);
        }

        this._label.text = labelParts.join(' ') || '---';

        // Update menu items
        this._downloadItem.label.text = `\u2193 Download: ${downStr}`;
        this._uploadItem.label.text = `\u2191 Upload: ${upStr}`;

        // Update data usage
        let totalDown = this._settings.get_value('total-bytes-downloaded').get_int64();
        let totalUp = this._settings.get_value('total-bytes-uploaded').get_int64();
        let totalData = totalDown + totalUp;

        this._dataUsedItem.label.text = `Total Data: ${this._formatBytes(totalData)}`;
        this._dataDownItem.label.text = `\u2193 Downloaded: ${this._formatBytes(totalDown)}`;
        this._dataUpItem.label.text = `\u2191 Uploaded: ${this._formatBytes(totalUp)}`;

        let sinceDate = this._settings.get_string('tracking-start-date');
        this._trackingSinceItem.label.text = `Since: ${sinceDate || 'N/A'}`;
    }

    _getWeatherEmoji(code) {
        // WMO weather codes to emoji mapping
        let c = parseInt(code);
        if (c === 113) return '\u2600\uFE0F';       // Sunny
        if (c === 116) return '\u26C5';              // Partly cloudy
        if (c === 119 || c === 122) return '\u2601\uFE0F'; // Cloudy/Overcast
        if ([143, 248, 260].includes(c)) return '\uD83C\uDF2B\uFE0F'; // Fog
        if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(c))
            return '\uD83C\uDF27\uFE0F';            // Rain
        if ([179, 182, 185, 227, 230, 320, 323, 326, 329, 332, 335, 338, 362, 365, 368, 371, 374, 377].includes(c))
            return '\u2744\uFE0F';                   // Snow
        if ([200, 386, 389, 392, 395].includes(c))
            return '\u26A1';                         // Thunder
        return '\uD83C\uDF24\uFE0F';                // Default
    }

    _getConditionText(code) {
        let c = parseInt(code);
        if (c === 113) return 'Sunny';
        if (c === 116) return 'Partly Cloudy';
        if (c === 119) return 'Cloudy';
        if (c === 122) return 'Overcast';
        if ([143, 248, 260].includes(c)) return 'Foggy';
        if ([176, 263, 266, 293, 296].includes(c)) return 'Light Rain';
        if ([299, 302, 305, 308, 353, 356, 359].includes(c)) return 'Rain';
        if ([179, 323, 326].includes(c)) return 'Light Snow';
        if ([227, 230, 329, 332, 335, 338].includes(c)) return 'Snow';
        if ([182, 185, 311, 314, 317, 320, 362, 365, 368, 371, 374, 377].includes(c)) return 'Sleet';
        if ([200, 386, 389, 392, 395].includes(c)) return 'Thunderstorm';
        return 'Unknown';
    }

    _updateWeatherVisibility() {
        let show = this._settings.get_boolean('show-weather');
        this._weatherHeaderItem.visible = show;
        this._weatherTempItem.visible = show;
        this._weatherCondItem.visible = show;
        this._weatherHumidityItem.visible = show;
        this._refreshWeatherItem.visible = show;
    }

    _fetchWeather() {
        let location = this._settings.get_string('weather-location').trim();
        if (!location) {
            this._weatherHeaderItem.label.text = 'Weather: Set location in Preferences';
            this._weatherTempItem.visible = false;
            this._weatherCondItem.visible = false;
            this._weatherHumidityItem.visible = false;
            this._weatherText = '';
            return;
        }

        if (!this._soupSession)
            this._soupSession = new Soup.Session();

        let encodedLocation = encodeURIComponent(location);
        let url = `https://wttr.in/${encodedLocation}?format=j1`;
        let message = Soup.Message.new('GET', url);
        message.get_request_headers().append('User-Agent', 'gnome-shell-extension');

        this._soupSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                let bytes = session.send_and_read_finish(result);
                let statusCode = message.get_status();
                if (statusCode !== 200) {
                    this._weatherHeaderItem.label.text = `Weather: HTTP error ${statusCode}`;
                    return;
                }

                let data = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                let current = data.current_condition[0];
                let tempC = current.temp_C;
                let tempF = current.temp_F;
                let weatherCode = current.weatherCode;
                let humidity = current.humidity;
                let emoji = this._getWeatherEmoji(weatherCode);
                let condition = this._getConditionText(weatherCode);
                let areaName = data.nearest_area[0].areaName[0].value;

                this._weatherHeaderItem.label.text = `${emoji} Weather: ${areaName}`;
                this._weatherTempItem.label.text = `\uD83C\uDF21\uFE0F Temperature: ${tempC}°C / ${tempF}°F`;
                this._weatherCondItem.label.text = `${emoji} Condition: ${condition}`;
                this._weatherHumidityItem.label.text = `\uD83D\uDCA7 Humidity: ${humidity}%`;
                this._weatherTempItem.visible = true;
                this._weatherCondItem.visible = true;
                this._weatherHumidityItem.visible = true;

                this._weatherText = `${emoji}${tempC}°C ${condition}`;
            } catch (e) {
                this._weatherHeaderItem.label.text = `Weather: Error - ${e.message}`;
            }
        });
    }

    destroy() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
        if (this._weatherTimerId) {
            GLib.source_remove(this._weatherTimerId);
            this._weatherTimerId = null;
        }
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        if (this._weatherSettingsIds) {
            this._weatherSettingsIds.forEach(id => this._settings.disconnect(id));
            this._weatherSettingsIds = null;
        }
        if (this._soupSession) {
            this._soupSession.abort();
            this._soupSession = null;
        }
        super.destroy();
    }
});

export default class NetSpeedExtension extends Extension {
    enable() {
        this._indicator = new NetSpeedIndicator(this);
        // Add right after the network indicator (system status area, left side)
        Main.panel.addToStatusArea('netspeed-indicator', this._indicator, 1, 'right');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
