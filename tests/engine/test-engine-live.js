#!/usr/bin/env gjs
/*
    Live Engine Test Suite for Avro Linux
    SPDX-License-Identifier: MPL-2.0

    Runs the real Avro engine (src/engine/main-gjs.js) on a private IBus
    daemon of its own, types into an IBus input context and checks what the
    engine commits and shows as preedit: Avro Phonetic and the fixed
    keyboard layouts. Nothing touches the desktop's IBus or settings.
*/

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const rootDir = GLib.get_current_dir();

// A private configuration directory and settings file, before anything reads them
const tmpDir = GLib.dir_make_tmp("avro-live-XXXXXX");
GLib.setenv("XDG_CONFIG_HOME", tmpDir + "/config", true);
GLib.setenv("XDG_CACHE_HOME", tmpDir + "/cache", true);
GLib.setenv("GSETTINGS_BACKEND", "keyfile", true);
GLib.setenv("GSETTINGS_SCHEMA_DIR", rootDir + "/data/gsettings", true);
GLib.setenv("IBUS_ADDRESS", "unix:path=" + tmpDir + "/ibus-socket", true);
GLib.setenv("IBUS_COMPONENT_PATH", tmpDir + "/components", true);
GLib.mkdir_with_parents(tmpDir + "/components", 0o700);

let [, xmlBytes] = GLib.file_get_contents(rootDir + "/data/ibus/ibus-avro.xml");
let xmlStr = (new TextDecoder().decode(xmlBytes)).replace(
    /<exec>.*<\/exec>/,
    "<exec>" + rootDir + "/bin/avro-engine --ibus</exec>"
);
GLib.file_set_contents(tmpDir + "/components/ibus-avro.xml", xmlStr);

const IBus = imports.gi.IBus;

let passed = 0;
let failed = 0;
let procs = [];
let bus = null;

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

function assertTrue(condition, description) {
    if (condition) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + description);
    }
}

function finish(code) {
    // The daemon quits on request; its private D-Bus session ends with it
    try {
        if (bus && bus.is_connected()) bus.exit(false);
    } catch (e) {}
    for (let p of procs.slice().reverse()) {
        try {
            p.send_signal(15);
            let done = false;
            p.wait_async(null, () => { done = true; });
            waitFor(() => done, 2000);
            if (!done) p.force_exit();
        } catch (e) {}
    }
    try { GLib.spawn_command_line_sync("rm -rf " + GLib.shell_quote(tmpDir)); } catch (e) {}
    print("Results: " + passed + " passed, " + failed + " failed.");
    imports.system.exit(code);
}

function pump(ms) {
    let end = GLib.get_monotonic_time() + ms * 1000;
    let ctx = GLib.MainContext.default();
    while (GLib.get_monotonic_time() < end) {
        if (!ctx.iteration(false)) GLib.usleep(2000);
    }
}

function waitFor(condition, ms) {
    let end = GLib.get_monotonic_time() + ms * 1000;
    let ctx = GLib.MainContext.default();
    while (!condition() && GLib.get_monotonic_time() < end) {
        if (!ctx.iteration(false)) GLib.usleep(5000);
    }
    return condition();
}

// AVRO_TEST_VERBOSE=1 shows the output of the daemon and the engine
function spawn(argv) {
    let quiet = GLib.getenv("AVRO_TEST_VERBOSE") ? Gio.SubprocessFlags.NONE
        : Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE;
    let p = Gio.Subprocess.new(argv, quiet);
    procs.push(p);
    return p;
}

print("=== Running Live Engine Tests ===");

if (!GLib.find_program_in_path("ibus-daemon") || !GLib.find_program_in_path("dbus-run-session")) {
    print("SKIPPED: ibus-daemon or dbus-run-session is not installed.");
    finish(0);
}

// Settings the engine starts with: no preview window, Avro Phonetic
const schema = Gio.SettingsSchemaSource.get_default().lookup("com.omicronlab.avro", true);
const settings = new Gio.Settings({ settings_schema: schema });
settings.set_boolean("switch-preview", false);
settings.set_string("keyboard-layout", "phonetic");
settings.set_boolean("mode-bangla", true);
Gio.Settings.sync();

// A private IBus daemon (on a private D-Bus session, so that its helpers,
// ibus-portal for one, never take over names of the developer's desktop
// session) and the engine from the source tree
spawn(["dbus-run-session", "--", "ibus-daemon", "--address=" + GLib.getenv("IBUS_ADDRESS"),
       "--panel=disable", "--config=disable", "--emoji-extension=disable", "--cache=none", "--single"]);

IBus.init();
waitFor(() => {
    bus = new IBus.Bus();
    return bus.is_connected();
}, 8000);
if (!bus || !bus.is_connected()) {
    print("SKIPPED: the private IBus daemon did not start.");
    finish(0);
}

spawn(["gjs", rootDir + "/src/engine/main-gjs.js", "--ibus"]);

let ic = bus.create_input_context("avro-live-test");
let committed = "";
let preedit = "";
let label = "";
ic.connect("commit-text", (c, text) => { committed += text.get_text(); });
ic.connect("update-preedit-text", (c, text, cursor, visible) => { preedit = visible ? text.get_text() : ""; });
ic.connect("hide-preedit-text", () => { preedit = ""; });
ic.connect("update-property", (c, prop) => {
    if (prop.get_key() === "mode") label = prop.get_label().get_text();
});
ic.set_capabilities(IBus.Capabilite.PREEDIT_TEXT | IBus.Capabilite.FOCUS | IBus.Capabilite.PROPERTY);
ic.focus_in();

// The engine registers itself with the daemon once it has started; until
// then selecting it fails. Asked asynchronously: the synchronous calls that
// return engine descriptions crash GJS. Once active, the engine shows its
// mode property ("বাংলা (Avro)").
function activeEngineName() {
    let name = null;
    let done = false;
    ic.get_engine_async(-1, null, (c, res) => {
        try {
            let desc = c.get_engine_async_finish(res);
            name = desc ? desc.get_name() : null;
        } catch (e) {}
        done = true;
    });
    waitFor(() => done, 2000);
    return name;
}

let engineReady = waitFor(() => {
    let cur = activeEngineName();
    if (cur === "ibus-avro") return true;
    try { bus.set_global_engine_async("ibus-avro", -1, null, () => {}); } catch (e) {}
    try { ic.set_engine("ibus-avro"); } catch (e) {}
    try { ic.focus_out(); pump(50); ic.focus_in(); pump(50); } catch (e) {}
    return waitFor(() => activeEngineName() === "ibus-avro", 3000);
}, 20000);
if (engineReady) {
    engineReady = waitFor(() => label !== "", 20000);
    pump(300);
}
assertTrue(engineReady, "The engine starts and becomes the active engine");
if (!engineReady) finish(1);

const SHIFT = IBus.ModifierType.SHIFT_MASK;
const MOD1 = IBus.ModifierType.MOD1_MASK;
const RELEASE = IBus.ModifierType.RELEASE_MASK;

// evdev key codes of the US letters and the number pad
const KEYCODES = { a: 30, b: 48, c: 46, d: 32, e: 18, f: 33, g: 34, h: 35, i: 23, j: 36, k: 37, l: 38,
                   m: 50, n: 49, o: 24, p: 25, q: 16, r: 19, s: 31, t: 20, u: 22, v: 47, w: 17, x: 45,
                   y: 21, z: 44, " ": 57 };

function press(keyval, keycode, state) {
    let handled = ic.process_key_event(keyval, keycode, state || 0);
    ic.process_key_event(keyval, keycode, (state || 0) | RELEASE);
    pump(40);
    return handled;
}

/* Type US characters ("J" = Shift+J); returns committed + "|" + preedit. */
function type(text) {
    for (let ch of text) {
        let lower = ch.toLowerCase();
        let shift = ch !== lower ? SHIFT : 0;
        press(ch.charCodeAt(0), KEYCODES[lower] || 0, shift);
    }
    pump(80);
    return committed + "|" + preedit;
}

function reset() {
    press(0xff1b, 1, 0);   // Escape
    pump(50);
    committed = "";
    preedit = "";
}

function setLayout(id, expectLabel) {
    reset();
    settings.set_string("keyboard-layout", id);
    Gio.Settings.sync();
    return waitFor(() => label === expectLabel, 5000);
}

// 1. Avro Phonetic
assertEqual(type("ami "), "আমি |", "Avro Phonetic: ami + Space commits আমি");
reset();
assertEqual(type("bangla"), "|বাংলা", "Avro Phonetic: the word is the preedit while typing");

// 2. National (Jatiya), Modern Style Typing
assertTrue(setLayout("national", "বাংলা (National (Jatiya))"), "The engine switches to National (Jatiya)");
assertEqual(type("jh"), "|কা", "National: ক + া");
assertEqual(type(" "), "কা |", "Space commits the word");
assertEqual(type("h"), "কা |আ", "Automatic Vowel Forming after Space");
reset();
assertEqual(type("jgN"), "|ক্ষ", "National: ক্ষ");
reset();
assertEqual(type("jzh"), "|কাঁ", "Chandrabindu position fixed");
reset();
type("jh");
press(0xff08, 14, 0);   // BackSpace
assertEqual(committed + "|" + preedit, "|ক", "Backspace edits the word");
reset();
ic.process_key_event(0xffea, 100, 0);           // Right Alt down
press(0x68, 35, MOD1);                          // h while it is held: AltGr+H
ic.process_key_event(0xffea, 100, MOD1 | RELEASE);
pump(50);
assertEqual(committed + "|" + preedit, "|আ", "Right Alt types the AltGr characters");
reset();
assertTrue(press(0xffb1, 79, 0), "The number pad key is taken");
assertEqual(committed + "|" + preedit, "|১", "The number pad types Bangla digits");
reset();

// F12 switches to English and back, also with a fixed layout
press(0xffc9, 88, 0);
assertTrue(waitFor(() => label === "English", 3000), "F12 switches to English");
assertTrue(!press(0x6a, 36, 0), "English mode passes keys to the application");
press(0xffc9, 88, 0);
assertTrue(waitFor(() => label === "বাংলা (National (Jatiya))", 3000), "F12 switches back to Bangla");

// 3. Old Style Typing
settings.set_string("fixed-typing-style", "old");
Gio.Settings.sync();
pump(800);
reset();
assertEqual(type("cj"), "|কে", "Old Style Typing: e-kar typed before ক");
reset();
assertEqual(type("cjh"), "|কো", "Old Style Typing: e-kar + ক + a-kar = কো");
settings.set_string("fixed-typing-style", "modern");
Gio.Settings.sync();

// 4. Avro Easy (reph key) and back to Avro Phonetic
assertTrue(setLayout("avro-easy", "বাংলা (Avro Easy)"), "The engine switches to Avro Easy");
pump(800);
assertEqual(type("kZ"), "|র্ক", "Old Style Reph in Modern Style Typing");
assertTrue(setLayout("phonetic", "বাংলা (Avro)"), "The engine switches back to Avro Phonetic");
assertEqual(type("ami "), "আমি |", "Avro Phonetic works again");

// 5. A focus change keeps the word in its field
reset();
settings.set_string("keyboard-layout", "national");
Gio.Settings.sync();
waitFor(() => label === "বাংলা (National (Jatiya))", 5000);
type("jh");
ic.focus_out();
pump(200);
assertEqual(committed, "কা", "Focus out commits the word being typed");

finish(failed > 0 ? 1 : 0);
