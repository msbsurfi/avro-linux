/*
    =============================================================================
    Avro Linux - KDE Plasma on Wayland: IBus as KWin's input method
    SPDX-License-Identifier: MPL-2.0

    On Wayland, KWin hands the keyboard to an input method only when one is
    chosen in System Settings -> Keyboard -> Virtual Keyboard, which stores it
    as [Wayland] InputMethod in kwinrc. Without "IBus Wayland" there, Wayland
    programs never reach IBus, so Avro cannot type in them. GNOME and the X11
    desktops need nothing of this.
    =============================================================================
*/

const GLib = imports.gi.GLib;

/* The desktop file of IBus' Wayland input method (part of the ibus package):
   what the Virtual Keyboard page writes into kwinrc for "IBus Wayland". */
var IBUS_WAYLAND_DESKTOP = "org.freedesktop.IBus.Panel.Wayland.Gtk3.desktop";

/* Runs argv without a shell: [succeeded (exit status 0), standard output]. */
function runArgv(argv) {
    try {
        let [ok, out, , status] = GLib.spawn_sync(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
        return [ok && status === 0, ok && out ? new TextDecoder("utf-8").decode(out) : ""];
    } catch (e) {
        return [false, ""];
    }
}

/* What this module looks at; the tests replace these. */
var Env = {
    getenv: (name) => GLib.getenv(name),
    configDirs: () => [GLib.get_user_config_dir()].concat(GLib.get_system_config_dirs()),
    dataDirs: () => [GLib.get_user_data_dir()].concat(GLib.get_system_data_dirs()),
    findProgram: (name) => GLib.find_program_in_path(name),
    run: runArgv
};

/** A KDE Plasma session on Wayland? */
function isKdeWayland() {
    let desktops = (Env.getenv("XDG_CURRENT_DESKTOP") || "").toUpperCase().split(":");
    let session = (Env.getenv("XDG_SESSION_TYPE") || "").toLowerCase();
    let wayland = session ? session === "wayland" : !!Env.getenv("WAYLAND_DISPLAY");
    return desktops.indexOf("KDE") !== -1 && wayland;
}

/** The InputMethod entry of the [Wayland] group in the text of a kwinrc
    ("" when it is empty), or null when the text has none. */
function parseInputMethod(text) {
    if (!text) return null;
    let group = "";
    for (let line of text.split("\n")) {
        line = line.trim();
        let m = line.match(/^\[(.*)\]$/);
        if (m) {
            group = m[1];
            continue;
        }
        if (group !== "Wayland") continue;
        // KConfig flags such as InputMethod[$e]= (a path entry)
        m = line.match(/^InputMethod(\[[^\]]*\])?\s*=(.*)$/);
        if (m) return m[2].trim();
    }
    return null;
}

/* The setting read from the kwinrc files themselves: the user's first, then
   the system-wide defaults ($XDG_CONFIG_DIRS). */
function inputMethodFromFiles() {
    for (let dir of Env.configDirs()) {
        try {
            let [ok, bytes] = GLib.file_get_contents(GLib.build_filenamev([dir, "kwinrc"]));
            let value = ok ? parseInputMethod(new TextDecoder("utf-8").decode(bytes)) : null;
            if (value !== null) return value;
        } catch (e) {}
    }
    return "";
}

/** KWin's input method setting: the desktop file of the chosen input method,
    or "" when none is chosen. */
function inputMethod() {
    // kreadconfig knows all of KConfig's rules; the files are the fallback
    for (let tool of ["kreadconfig6", "kreadconfig5"]) {
        if (!Env.findProgram(tool)) continue;
        let [ok, out] = Env.run([tool, "--file", "kwinrc", "--group", "Wayland", "--key", "InputMethod"]);
        if (ok) return out.trim();
    }
    return inputMethodFromFiles();
}

/** "ibus", "none", or "other" (fcitx, Maliit, ...: the user's choice). */
function inputMethodKind(value) {
    if (!value) return "none";
    return /ibus/i.test(value) ? "ibus" : "other";
}

/** The IBus Wayland desktop file, or null when it is not installed. */
function ibusWaylandDesktopFile() {
    for (let dir of Env.dataDirs()) {
        let path = GLib.build_filenamev([dir, "applications", IBUS_WAYLAND_DESKTOP]);
        if (GLib.file_test(path, GLib.FileTest.EXISTS)) return path;
    }
    return null;
}

/** What the Doctor, the TopBar and Setup need to know:
    { relevant, value, kind, name, desktopFile }. relevant: a KDE Plasma
    Wayland session, where kind "ibus" is needed for Avro to type. */
function status() {
    if (!isKdeWayland()) return { relevant: false, value: "", kind: "none", name: "", desktopFile: null };
    let value = inputMethod();
    return {
        relevant: true,
        value: value,
        kind: inputMethodKind(value),
        name: value ? GLib.path_get_basename(value).replace(/\.desktop$/, "") : "",
        desktopFile: ibusWaylandDesktopFile()
    };
}

/** Chooses IBus Wayland as KWin's input method, as the Virtual Keyboard page
    of System Settings does. Only when no input method is chosen yet: another
    one (fcitx, Maliit) is the user's choice and stays. True when IBus is
    KWin's input method afterwards (or nothing is needed: not KDE Wayland).
    It takes effect for sure after logging out and in again. */
function chooseIBusWayland() {
    let st = status();
    if (!st.relevant || st.kind === "ibus") return true;
    if (st.kind !== "none" || !st.desktopFile) return false;
    let tool = ["kwriteconfig6", "kwriteconfig5"].find(t => Env.findProgram(t));
    if (!tool) return false;
    let argv = [tool, "--file", "kwinrc", "--group", "Wayland", "--key", "InputMethod"];
    // --notify tells a running KWin, as System Settings does
    let [ok] = Env.run(argv.concat(["--notify", st.desktopFile]));
    if (!ok) [ok] = Env.run(argv.concat([st.desktopFile]));
    return ok && inputMethodKind(inputMethod()) === "ibus";
}
