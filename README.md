# Net Speed Indicator

A GNOME Shell extension that displays real-time network upload/download speed in the top bar.

## Features

- Real-time upload and download speed display in the top bar
- Configurable speed units (KB/s, MB/s, or adaptive)
- Data usage tracking (total downloaded, uploaded, and combined)
- Monthly auto-reset for data usage counters
- Configurable refresh interval (1–10 seconds)
- Dropdown menu with detailed speed and usage stats
- Preferences dialog for full customization

## Supported GNOME Versions

GNOME Shell 45, 46, 47, 48, 49, 50

## Installation

### From .deb package (Debian/Ubuntu)

```bash
sudo dpkg -i netspeed-indicator_1.0.0_all.deb
```

### Manual installation

```bash
cp -r netspeed-indicator@vzk ~/.local/share/gnome-shell/extensions/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/netspeed-indicator@vzk/schemas/
```

Then restart GNOME Shell and enable:

```bash
gnome-extensions enable netspeed-indicator@vzk
```

On Wayland, log out and log back in instead of restarting GNOME Shell.

## Usage

Once enabled, the extension shows download/upload speeds in the top bar. Click on it to see:

- Current download and upload speeds
- Total data usage (downloaded, uploaded, combined)
- Tracking start date
- Speed unit selector
- Reset data usage option
- Preferences

## Preferences

Open preferences via the dropdown menu or:

```bash
gnome-extensions prefs netspeed-indicator@vzk
```

**Display settings:**
- Toggle download/upload speed visibility
- Choose speed unit (Adaptive, KB/s, MB/s)
- Set refresh interval

**Data usage settings:**
- Enable/disable data usage tracking
- Enable monthly auto-reset
- Set the day of month to reset counters

## Uninstall

### .deb package

```bash
sudo dpkg -r gnome-shell-extension-netspeed-indicator
```

### Manual

```bash
gnome-extensions uninstall netspeed-indicator@vzk
```

## License

This project is open source.
