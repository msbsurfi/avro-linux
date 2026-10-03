/*
    =============================================================================
    Avro Linux - Start Avro TopBar on login
    SPDX-License-Identifier: MPL-2.0

    The TopBar starts on login through an XDG autostart entry in the user's
    configuration directory (~/.config/autostart/avro-topbar.desktop).
    =============================================================================
*/

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

var ENTRY = "[Desktop Entry]\n" +
            "Type=Application\n" +
            "Name=Avro TopBar\n" +
            "Comment=Floating Avro Keyboard toolbar\n" +
            "Exec=avro-topbar\n" +
            "Icon=avro-bangla\n" +
            "Terminal=false\n" +
            "Categories=Utility;\n" +
            "X-GNOME-Autostart-enabled=true\n";

function entryPath() {
    return GLib.build_filenamev([GLib.get_user_config_dir(), "autostart", "avro-topbar.desktop"]);
}

/** Whether the user has an autostart entry for the TopBar at all. */
function hasEntry() {
    return GLib.file_test(entryPath(), GLib.FileTest.EXISTS);
}

/** Whether the TopBar starts on login. Desktops switch an entry off with
    Hidden=true or X-GNOME-Autostart-enabled=false instead of deleting it. */
function isEnabled() {
    let kf = new GLib.KeyFile();
    try {
        kf.load_from_file(entryPath(), GLib.KeyFileFlags.NONE);
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

/** Turn starting on login on or off; returns false when that failed. */
function setEnabled(enable) {
    try {
        let path = entryPath();
        if (enable) {
            GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
            GLib.file_set_contents(path, ENTRY);
        } else if (hasEntry()) {
            Gio.File.new_for_path(path).delete(null);
        }
        return true;
    } catch (e) {
        return false;
    }
}
