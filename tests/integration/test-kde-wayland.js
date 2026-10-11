#!/usr/bin/env gjs
/*
    KDE Plasma (Wayland) input method tests for Avro Linux
    SPDX-License-Identifier: MPL-2.0

    On KDE Plasma (Wayland), Avro types only when IBus Wayland is KWin's input
    method ([Wayland] InputMethod in kwinrc). src/common/kdewayland.js reads
    that setting, and chooses IBus Wayland only when nothing is chosen yet.
*/

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const rootDir = GLib.get_current_dir();

imports.searchPath.unshift(rootDir + "/src/common");
const kde = imports.kdewayland;

let passed = 0;
let failed = 0;

function assertTrue(condition, description) {
    if (condition) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + description);
    }
}

function assertEqual(actual, expected, description) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + description);
        print("  Expected: " + expected);
        print("  Actual:   " + actual);
    }
}

print("=== Running KDE Plasma (Wayland) Input Method Tests ===");

const realEnv = Object.assign({}, kde.Env);
const IBUS = "/usr/share/applications/" + kde.IBUS_WAYLAND_DESKTOP;
const FCITX = "/usr/share/applications/org.fcitx.Fcitx5.desktop";

// 1. Reading kwinrc
assertEqual(kde.parseInputMethod("[Wayland]\nInputMethod[$e]=" + IBUS + "\n"), IBUS, "InputMethod[$e] entry of [Wayland] (as System Settings writes it)");
assertEqual(kde.parseInputMethod("[Wayland]\nInputMethod=\n"), "", "An empty InputMethod");
assertEqual(kde.parseInputMethod("[Compositing]\nInputMethod=x\n[Wayland]\nVirtualKeyboardEnabled=true\n"), null, "InputMethod of another group is ignored");
assertEqual(kde.parseInputMethod(""), null, "Empty file");
assertEqual(kde.parseInputMethod("[Wayland]\r\nInputMethod = " + FCITX + "\r\n"), FCITX, "Spaces around = and CRLF line ends");

// 2. Kinds of input method
assertEqual(kde.inputMethodKind(""), "none", "No input method");
assertEqual(kde.inputMethodKind(IBUS), "ibus", "IBus Wayland");
assertEqual(kde.inputMethodKind(FCITX), "other", "fcitx is another input method");
assertEqual(kde.inputMethodKind("/usr/share/applications/com.github.maliit.keyboard.desktop"), "other", "Maliit is another input method");

// 3. Which sessions need it
let env = {};
kde.Env.getenv = (name) => env[name] || null;
env = { XDG_CURRENT_DESKTOP: "KDE", XDG_SESSION_TYPE: "wayland" };
assertTrue(kde.isKdeWayland(), "KDE Plasma on Wayland");
env = { XDG_CURRENT_DESKTOP: "KDE", XDG_SESSION_TYPE: "x11" };
assertTrue(!kde.isKdeWayland(), "KDE Plasma on X11 needs nothing");
env = { XDG_CURRENT_DESKTOP: "ubuntu:GNOME", XDG_SESSION_TYPE: "wayland" };
assertTrue(!kde.isKdeWayland(), "GNOME needs nothing");
env = { XDG_CURRENT_DESKTOP: "KDE", WAYLAND_DISPLAY: "wayland-0" };
assertTrue(kde.isKdeWayland(), "KDE Plasma with WAYLAND_DISPLAY and no XDG_SESSION_TYPE");

// 4. Reading and choosing the setting: temporary folders, fake KDE tools
let tmp = GLib.dir_make_tmp("avro-kde-test-XXXXXX");
let userConfig = tmp + "/config", systemConfig = tmp + "/xdg", dataDir = tmp + "/data";
for (let d of [userConfig, systemConfig, dataDir + "/applications"]) GLib.mkdir_with_parents(d, 0o755);
let desktopFile = dataDir + "/applications/" + kde.IBUS_WAYLAND_DESKTOP;

function writeKwinrc(dir, text) { GLib.file_set_contents(dir + "/kwinrc", text); }
function removeKwinrc(dir) { try { Gio.File.new_for_path(dir + "/kwinrc").delete(null); } catch (e) {} }

let tools = {};
let calls = [];
let kreadValue = "";
let notifyWorks = true;
kde.Env.configDirs = () => [userConfig, systemConfig];
kde.Env.dataDirs = () => [dataDir];
kde.Env.findProgram = (name) => tools[name] ? "/fake/bin/" + name : null;
kde.Env.run = (argv) => {
    calls.push(argv.join(" "));
    if (/^kreadconfig/.test(argv[0])) return [true, kreadValue + "\n"];
    if (/^kwriteconfig/.test(argv[0])) {
        if (argv.indexOf("--notify") !== -1 && !notifyWorks) return [false, ""];
        writeKwinrc(userConfig, "[Wayland]\nInputMethod=" + argv[argv.length - 1] + "\n");
        return [true, ""];
    }
    return [false, ""];
};

env = { XDG_CURRENT_DESKTOP: "KDE", XDG_SESSION_TYPE: "wayland" };
let st = kde.status();
assertTrue(st.relevant && st.kind === "none" && st.desktopFile === null, "No kwinrc: no input method; IBus Wayland not installed");
assertTrue(!kde.chooseIBusWayland() && calls.length === 0, "Without the IBus Wayland desktop file nothing is written");

GLib.file_set_contents(desktopFile, "[Desktop Entry]\nName=IBus Wayland\nExec=ibus-ui-gtk3 --enable-wayland-im\n");
assertEqual(kde.status().desktopFile, desktopFile, "The IBus Wayland desktop file is found in the data folders");
assertTrue(!kde.chooseIBusWayland() && calls.length === 0, "Without kwriteconfig nothing is written");

tools = { kwriteconfig6: true };
assertTrue(kde.chooseIBusWayland(), "IBus Wayland is chosen when no input method is set");
assertEqual(calls[0], "kwriteconfig6 --file kwinrc --group Wayland --key InputMethod --notify " + desktopFile,
            "kwriteconfig6 writes [Wayland] InputMethod and tells KWin (--notify)");
st = kde.status();
assertTrue(st.kind === "ibus" && st.value === desktopFile, "kwinrc now names IBus Wayland");

calls = [];
assertTrue(kde.chooseIBusWayland() && calls.length === 0, "Already IBus Wayland: nothing is written again");

writeKwinrc(userConfig, "[Wayland]\nInputMethod[$e]=" + FCITX + "\n");
st = kde.status();
assertTrue(st.kind === "other" && st.name === "org.fcitx.Fcitx5", "fcitx chosen: reported by name");
assertTrue(!kde.chooseIBusWayland() && calls.length === 0, "Another input method (fcitx) is never replaced");

removeKwinrc(userConfig);
writeKwinrc(systemConfig, "[Wayland]\nInputMethod=" + IBUS + "\n");
assertEqual(kde.status().kind, "ibus", "The system-wide kwinrc counts when the user has none");
writeKwinrc(userConfig, "[Wayland]\nInputMethod=\n");
assertEqual(kde.status().kind, "none", "The user's own (empty) setting wins over the system-wide one");
removeKwinrc(systemConfig);

removeKwinrc(userConfig);
tools = { kwriteconfig5: true };
notifyWorks = false;
calls = [];
assertTrue(kde.chooseIBusWayland(), "kwriteconfig5 without --notify support still works");
assertTrue(calls.length === 2 && calls[1] === "kwriteconfig5 --file kwinrc --group Wayland --key InputMethod " + desktopFile,
           "Written again without --notify when that fails");
notifyWorks = true;

tools = { kreadconfig6: true };
kreadValue = FCITX;
assertEqual(kde.inputMethod(), FCITX, "kreadconfig6 is asked first when it is installed");
kreadValue = "";
assertEqual(kde.status().kind, "none", "kreadconfig6 printing nothing: no input method");

env = { XDG_CURRENT_DESKTOP: "GNOME", XDG_SESSION_TYPE: "wayland" };
calls = [];
assertTrue(!kde.status().relevant, "Not relevant on GNOME");
assertTrue(kde.chooseIBusWayland() && calls.length === 0, "Nothing to do outside KDE Plasma (Wayland)");

// 5. The real KDE tools, when installed (KDE Frameworks' kreadconfig and kwriteconfig)
let realWrite = ["kwriteconfig6", "kwriteconfig5"].find(t => GLib.find_program_in_path(t));
let realRead = ["kreadconfig6", "kreadconfig5"].find(t => GLib.find_program_in_path(t));
if (realWrite && realRead) {
    let home = tmp + "/real-config", xdg = tmp + "/real-xdg";
    GLib.mkdir_with_parents(home, 0o755);
    GLib.mkdir_with_parents(xdg, 0o755);
    GLib.setenv("XDG_CONFIG_HOME", home, true);
    GLib.setenv("XDG_CONFIG_DIRS", xdg, true);
    kde.Env.findProgram = realEnv.findProgram;
    kde.Env.run = realEnv.run;
    kde.Env.configDirs = () => [home, xdg];
    env = { XDG_CURRENT_DESKTOP: "KDE", XDG_SESSION_TYPE: "wayland" };
    assertEqual(kde.status().kind, "none", realRead + ": no input method in a new kwinrc");
    assertTrue(kde.chooseIBusWayland(), realWrite + " chooses IBus Wayland");
    assertEqual(kde.inputMethod(), desktopFile, realRead + " reads back IBus Wayland");
    let [, bytes] = GLib.file_get_contents(home + "/kwinrc");
    assertEqual(kde.parseInputMethod(new TextDecoder("utf-8").decode(bytes)), desktopFile, "kwinrc has [Wayland] InputMethod");
} else {
    print("SKIPPED: real kreadconfig / kwriteconfig (KDE Frameworks not installed)");
}

Object.assign(kde.Env, realEnv);

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
