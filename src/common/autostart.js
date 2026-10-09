/*
    =============================================================================
    Avro Linux - Start Avro TopBar on login
    SPDX-License-Identifier: MPL-2.0

    The package installs a system-wide XDG autostart entry
    (/etc/xdg/autostart/avro-topbar.desktop). A user turns it off the XDG way:
    an entry of the same name in ~/.config/autostart with Hidden=true, which
    every desktop prefers over the system one. Turning it on again replaces
    that with a normal entry, so it also works where the package's entry is
    missing (a source install, for example).
    =============================================================================
*/

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

var FILE_NAME = "avro-topbar.desktop";

// TryExec: once Avro is uninstalled, a left-over entry is ignored instead of
// failing on every login.
var ENTRY = "[Desktop Entry]\n" +
            "Type=Application\n" +
            "Name=Avro TopBar\n" +
            "Comment=Floating Avro Keyboard toolbar\n" +
            "Exec=avro-topbar\n" +
            "TryExec=avro-topbar\n" +
            "Icon=avro-bangla\n" +
            "Terminal=false\n" +
            "Categories=Utility;\n" +
            "X-GNOME-Autostart-enabled=true\n";

function entryPath() {
    return GLib.build_filenamev([GLib.get_user_config_dir(), "autostart", FILE_NAME]);
}

/** The system-wide entries ($XDG_CONFIG_DIRS/autostart), first one wins. */
function systemEntryPath() {
    for (let dir of GLib.get_system_config_dirs()) {
        let path = GLib.build_filenamev([dir, "autostart", FILE_NAME]);
        if (GLib.file_test(path, GLib.FileTest.EXISTS)) return path;
    }
    return null;
}

/** Whether the user has an autostart entry for the TopBar at all. */
function hasEntry() {
    return GLib.file_test(entryPath(), GLib.FileTest.EXISTS);
}

/* An entry starts its program unless it is hidden or switched off. */
function entryEnabled(path) {
    let kf = new GLib.KeyFile();
    try {
        kf.load_from_file(path, GLib.KeyFileFlags.NONE);
    } catch (e) {
        return false;
    }
    let flag = (key, fallback) => {
        try {
            return kf.get_boolean("Desktop Entry", key);
        } catch (e) {
            return fallback;
        }
    };
    return !flag("Hidden", false) && flag("X-GNOME-Autostart-enabled", true);
}

/** Whether the TopBar starts on login: the user's entry decides; without
    one, the system-wide entry of the package does. */
function isEnabled() {
    if (hasEntry()) return entryEnabled(entryPath());
    let system = systemEntryPath();
    return system ? entryEnabled(system) : false;
}

/** Turn starting on login on or off; returns false when that failed. */
function setEnabled(enable) {
    try {
        let path = entryPath();
        GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
        GLib.file_set_contents(path, enable ? ENTRY : ENTRY + "Hidden=true\n");
        return true;
    } catch (e) {
        return false;
    }
}
