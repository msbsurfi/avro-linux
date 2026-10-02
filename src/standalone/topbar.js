#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Windows-Style Floating Avro TopBar (Remastered Edition)
    SPDX-License-Identifier: MPL-2.0
    Developer & Maintainer: MD Shifat Bin Siddique Urfi
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

let IBus = null;
try {
    IBus = imports.gi.IBus;
    IBus.init();
} catch (e) {}

/* ─── Search paths ──────────────────────────────────────────────────────── */
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = (typeof ARGV !== 'undefined' && ARGV[0]) ? ARGV[0] : '.';
    let scriptDir  = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

for (let p of [
    './src/standalone',
    './src/preferences',
    baseDir + '/standalone',
    baseDir + '/preferences',
]) {
    imports.searchPath.unshift(p);
}

let AvroPad       = null; try { AvroPad       = imports.avropad;       } catch (e) {}
let LayoutViewer  = null; try { LayoutViewer  = imports.layoutviewer;  } catch (e) {}
let BijoyConverter= null; try { BijoyConverter= imports.bijoyconverter;} catch (e) {}
let AvroMouse     = null; try { AvroMouse     = imports.avromouse;     } catch (e) {}
let PrefApp       = null; try { PrefApp       = imports.pref;          } catch (e) {}

/* ═══════════════════════════════════════════════════════════════════════════
/* ═══════════════════════════════════════════════════════════════════════════
   Themes & TopBar Skins
   ═══════════════════════════════════════════════════════════════════════════ */
const THEMES = {
    "Royal Dark": `
* { outline: none; }
.avro-topbar-window {
    background: linear-gradient(180deg, #1f2433 0%, #161924 100%);
    border: 1px solid rgba(74,144,217,0.35);
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.75), 0 0 16px rgba(74,144,217,0.15);
}
.avro-logo-btn {
    background: linear-gradient(135deg, #1a3a6e, #2454a0);
    color: #e8f0ff;
    font-weight: 900;
    font-size: 13px;
    border-radius: 12px;
    padding: 4px 12px;
    border: 1px solid rgba(255,255,255,0.2);
    margin: 0 2px;
}
.avro-logo-btn:hover {
    background: linear-gradient(135deg, #2454a0, #3168c0);
    color: #ffffff;
}
.avro-mode-bangla {
    background: linear-gradient(135deg, #00a88a, #6bbf2e);
    color: #041e0f;
    font-weight: 900;
    font-size: 13px;
    border-radius: 12px;
    padding: 5px 18px;
    border: 1px solid #6bbf2e;
    box-shadow: 0 0 10px rgba(107,191,46,0.4);
    margin: 0 2px;
}
.avro-mode-bangla:hover {
    background: linear-gradient(135deg, #00c0a0, #80d940);
}
.avro-mode-english {
    background: linear-gradient(135deg, #2e3348, #3d6db0);
    color: #e8f0ff;
    font-weight: 900;
    font-size: 13px;
    border-radius: 12px;
    padding: 5px 18px;
    border: 1px solid rgba(255,255,255,0.18);
    margin: 0 2px;
}
.avro-mode-english:hover {
    background: linear-gradient(135deg, #3d6db0, #5286d0);
}
.avro-layout-btn {
    background: rgba(255,255,255,0.07);
    color: #a0aac0;
    font-size: 12px;
    border-radius: 10px;
    padding: 4px 10px;
    border: 1px solid rgba(255,255,255,0.08);
    margin: 0 2px;
}
.avro-layout-btn:hover {
    background: rgba(255,255,255,0.14);
    color: #d0d8f0;
    border-color: rgba(255,255,255,0.18);
}
.avro-tool-btn {
    background: rgba(255,255,255,0.06);
    color: #8899c0;
    font-size: 14px;
    border-radius: 10px;
    padding: 4px 9px;
    border: none;
    margin: 0 1px;
}
.avro-tool-btn:hover {
    background: rgba(255,255,255,0.16);
    color: #d0d8f0;
}
.avro-pin-btn {
    background: rgba(255,255,255,0.06);
    color: #f39c12;
    font-size: 13px;
    border-radius: 10px;
    padding: 4px 8px;
    border: none;
    margin: 0 1px;
}
.avro-pin-btn:hover {
    background: rgba(243,156,18,0.25);
}
.avro-close-btn {
    background: transparent;
    color: #5a6580;
    border-radius: 10px;
    padding: 4px 9px;
    border: none;
    font-size: 14px;
    margin: 0 1px;
}
.avro-close-btn:hover {
    background: #c0392b;
    color: #ffffff;
}
tooltip {
    background-color: #1a1d28;
    color: #c0ccdd;
    border: 1px solid #2a3350;
    border-radius: 8px;
}
`,
    "Classic Windows Avro": `
* { outline: none; }
.avro-topbar-window {
    background: linear-gradient(180deg, #2b5c8f 0%, #17385c 100%);
    border: 1px solid #4a8cd4;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 12px rgba(74,140,212,0.3);
}
.avro-logo-btn {
    background: linear-gradient(135deg, #10447a, #1b6cb8);
    color: #ffffff;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 4px 12px;
    border: 1px solid #6cb5ff;
    margin: 0 2px;
}
.avro-logo-btn:hover {
    background: linear-gradient(135deg, #1b6cb8, #2e88de);
}
.avro-mode-bangla {
    background: linear-gradient(135deg, #137736, #2bb656);
    color: #ffffff;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 5px 18px;
    border: 1px solid #73e895;
    box-shadow: 0 0 8px rgba(43,182,86,0.5);
    margin: 0 2px;
}
.avro-mode-bangla:hover {
    background: linear-gradient(135deg, #1c9b47, #3ed66e);
}
.avro-mode-english {
    background: linear-gradient(135deg, #30445c, #48688a);
    color: #ffffff;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 5px 18px;
    border: 1px solid #7c9ebf;
    margin: 0 2px;
}
.avro-mode-english:hover {
    background: linear-gradient(135deg, #48688a, #5f88b3);
}
.avro-layout-btn {
    background: rgba(255,255,255,0.15);
    color: #ffffff;
    font-size: 12px;
    border-radius: 8px;
    padding: 4px 10px;
    border: 1px solid rgba(255,255,255,0.25);
    margin: 0 2px;
}
.avro-layout-btn:hover {
    background: rgba(255,255,255,0.28);
}
.avro-tool-btn {
    background: rgba(255,255,255,0.12);
    color: #ffffff;
    font-size: 14px;
    border-radius: 8px;
    padding: 4px 9px;
    border: none;
    margin: 0 1px;
}
.avro-tool-btn:hover {
    background: rgba(255,255,255,0.26);
}
.avro-pin-btn {
    background: rgba(255,255,255,0.12);
    color: #ffd166;
    font-size: 13px;
    border-radius: 8px;
    padding: 4px 8px;
    border: none;
    margin: 0 1px;
}
.avro-pin-btn:hover {
    background: rgba(255,209,102,0.3);
}
.avro-close-btn {
    background: transparent;
    color: #cad8e6;
    border-radius: 8px;
    padding: 4px 9px;
    border: none;
    font-size: 14px;
    margin: 0 1px;
}
.avro-close-btn:hover {
    background: #d9383a;
    color: #ffffff;
}
`,
    "Obsidian Black": `
* { outline: none; }
.avro-topbar-window {
    background: #090d16;
    border: 1px solid #00e5a0;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.9), 0 0 12px rgba(0,229,160,0.25);
}
.avro-logo-btn {
    background: #111a28;
    color: #00e5a0;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 4px 12px;
    border: 1px solid #00e5a0;
    margin: 0 2px;
}
.avro-logo-btn:hover {
    background: #00e5a0;
    color: #090d16;
}
.avro-mode-bangla {
    background: #00e5a0;
    color: #090d16;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 5px 18px;
    border: 1px solid #00e5a0;
    margin: 0 2px;
}
.avro-mode-bangla:hover {
    background: #33eab3;
}
.avro-mode-english {
    background: #1a2230;
    color: #8b9bb4;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 5px 18px;
    border: 1px solid #2d384e;
    margin: 0 2px;
}
.avro-mode-english:hover {
    background: #253147;
    color: #ffffff;
}
.avro-layout-btn {
    background: #141c2b;
    color: #8b9bb4;
    font-size: 12px;
    border-radius: 8px;
    padding: 4px 10px;
    border: 1px solid #283650;
    margin: 0 2px;
}
.avro-layout-btn:hover {
    color: #ffffff;
    border-color: #00e5a0;
}
.avro-tool-btn {
    background: #141c2b;
    color: #8b9bb4;
    font-size: 14px;
    border-radius: 8px;
    padding: 4px 9px;
    border: none;
    margin: 0 1px;
}
.avro-tool-btn:hover {
    background: #222f46;
    color: #00e5a0;
}
.avro-pin-btn {
    background: #141c2b;
    color: #f39c12;
    font-size: 13px;
    border-radius: 8px;
    padding: 4px 8px;
    border: none;
    margin: 0 1px;
}
.avro-close-btn {
    background: transparent;
    color: #6e7681;
    border-radius: 8px;
    padding: 4px 9px;
    border: none;
    font-size: 14px;
    margin: 0 1px;
}
.avro-close-btn:hover {
    background: #e63946;
    color: #ffffff;
}
`,
    "Paper Light": `
* { outline: none; }
.avro-topbar-window {
    background: #ffffff;
    border: 1px solid #d0d7de;
    border-radius: 16px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}
.avro-logo-btn {
    background: #0969da;
    color: #ffffff;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 4px 12px;
    border: 1px solid #0550ae;
    margin: 0 2px;
}
.avro-logo-btn:hover {
    background: #1177ee;
}
.avro-mode-bangla {
    background: #1f883d;
    color: #ffffff;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 5px 18px;
    border: 1px solid #1a7f37;
    margin: 0 2px;
}
.avro-mode-bangla:hover {
    background: #269b46;
}
.avro-mode-english {
    background: #f6f8fa;
    color: #24292f;
    font-weight: 900;
    font-size: 13px;
    border-radius: 10px;
    padding: 5px 18px;
    border: 1px solid #d0d7de;
    margin: 0 2px;
}
.avro-mode-english:hover {
    background: #eaeef2;
}
.avro-layout-btn {
    background: #f6f8fa;
    color: #24292f;
    font-size: 12px;
    border-radius: 8px;
    padding: 4px 10px;
    border: 1px solid #d0d7de;
    margin: 0 2px;
}
.avro-layout-btn:hover {
    background: #eaeef2;
}
.avro-tool-btn {
    background: #f6f8fa;
    color: #57606a;
    font-size: 14px;
    border-radius: 8px;
    padding: 4px 9px;
    border: 1px solid #d0d7de;
    margin: 0 1px;
}
.avro-tool-btn:hover {
    background: #eaeef2;
    color: #0969da;
}
.avro-pin-btn {
    background: #f6f8fa;
    color: #b08800;
    font-size: 13px;
    border-radius: 8px;
    padding: 4px 8px;
    border: 1px solid #d0d7de;
    margin: 0 1px;
}
.avro-close-btn {
    background: transparent;
    color: #57606a;
    border-radius: 8px;
    padding: 4px 9px;
    border: none;
    font-size: 14px;
    margin: 0 1px;
}
.avro-close-btn:hover {
    background: #cf222e;
    color: #ffffff;
}
`
};

function getSavedTheme() {
    let cfgFile = Gio.File.new_for_path(GLib.get_user_config_dir() + "/avro/topbar-theme.txt");
    try {
        if (cfgFile.query_exists(null)) {
            let [, contents] = cfgFile.load_contents(null);
            let t = String.fromCharCode.apply(null, contents).trim();
            if (THEMES[t]) return t;
        }
    } catch (e) {}
    return "Royal Dark";
}

function saveTheme(themeName) {
    try {
        let dir = GLib.get_user_config_dir() + "/avro";
        GLib.mkdir_with_parents(dir, 0o755);
        let cfgFile = Gio.File.new_for_path(dir + "/topbar-theme.txt");
        let stream = cfgFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
        stream.write_all(themeName, null);
        stream.close(null);
    } catch (e) {}
}

function isAutostartEnabled() {
    let autostartDir = GLib.get_user_config_dir() + "/autostart";
    let autostartFile = Gio.File.new_for_path(autostartDir + "/avro-topbar.desktop");
    return autostartFile.query_exists(null);
}

function setAutostartEnabled(enable) {
    let autostartDir = GLib.get_user_config_dir() + "/autostart";
    let autostartFile = Gio.File.new_for_path(autostartDir + "/avro-topbar.desktop");
    try {
        if (enable) {
            GLib.mkdir_with_parents(autostartDir, 0o755);
            let content = "[Desktop Entry]\nName=Avro TopBar\nComment=Sticky floating toolbar for Avro Keyboard\nExec=avro-topbar\nIcon=avro-bangla\nTerminal=false\nType=Application\nCategories=Utility;\nX-GNOME-Autostart-enabled=true\n";
            let stream = autostartFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
            stream.write_all(content, null);
            stream.close(null);
        } else {
            if (autostartFile.query_exists(null)) {
                autostartFile.delete(null);
            }
        }
    } catch (e) {}
}

/* ═══════════════════════════════════════════════════════════════════════════
   runAvroTopBar()
   ═══════════════════════════════════════════════════════════════════════════ */
function runAvroTopBar() {

    /* Apply initial theme */
    let currentThemeName = getSavedTheme();
    let cssProvider = new Gtk.CssProvider();
    function applyTheme(name) {
        if (!THEMES[name]) name = "Royal Dark";
        try {
            cssProvider.load_from_data(THEMES[name]);
        } catch (e) {}
    }
    applyTheme(currentThemeName);

    try {
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            cssProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
    } catch (e) {}

    /* Window — undecorated, no taskbar, no pager, no focus steal */
    let window = new Gtk.Window({
        type:              Gtk.WindowType.TOPLEVEL,
        title:             "Avro TopBar",
        decorated:         false,
        skip_taskbar_hint: true,
        skip_pager_hint:   true,
        accept_focus:      false,
        focus_on_map:      false,
        role:              "avro-topbar"
    });
    window.get_style_context().add_class("avro-topbar-window");

    /* Always-on-top + stick to all workspaces */
    window.stick();
    window.set_keep_above(true);
    window.set_type_hint(Gdk.WindowTypeHint.DOCK);

    /* Watchdog: re-assert always-on-top every 1.0 s */
    GLib.timeout_add(GLib.PRIORITY_LOW, 1000, () => {
        try {
            if (window.get_visible()) {
                window.set_keep_above(true);
                window.stick();
            }
        } catch (e) {}
        return true;  // repeat
    });

    /* State */
    let isPinned       = true;
    let isMini         = false;
    let isBangla       = true;
    let currentLayout  = "Avro Phonetic";

    /* Snap to top-center of primary monitor */
    function snapToTopCenter() {
        try {
            let screen  = Gdk.Screen.get_default();
            let monitor = (typeof screen.get_primary_monitor === 'function')
                          ? screen.get_primary_monitor() : 0;
            let geom    = screen.get_monitor_geometry(monitor);
            let [w]     = window.get_size();
            let x = geom.x + Math.floor((geom.width - (w || 420)) / 2);
            let y = geom.y + 6;
            window.move(x, y);
        } catch (e) {}
    }

    /* Allow dragging the bar */
    window.connect("button-press-event", (_w, event) => {
        let [, button] = event.get_button();
        if (button === 1) {
            isPinned = false;
            let [, xr, yr] = event.get_root_coords();
            window.begin_move_drag(button, xr, yr, event.get_time());
            return true;
        }
        return false;
    });

    /* ─── Main horizontal box ─── */
    let mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 4,
        margin: 4
    });

    /* ═══════════════════════════════════════════════════════════════════════
       1. Logo + Full Windows Menu
       ═══════════════════════════════════════════════════════════════════════ */
    let btnLogo = new Gtk.Button({ label: "অ Avro" });
    btnLogo.set_can_focus(false);
    btnLogo.set_focus_on_click(false);
    btnLogo.get_style_context().add_class("avro-logo-btn");
    btnLogo.set_tooltip_text("Avro Keyboard Menu");

    let menu       = new Gtk.Menu();
    let layouts    = ["Avro Phonetic (Default)", "Avro Easy", "Bornona", "National (Jatiya)", "Probhat"];
    let btnLayoutLabel; // forward ref

    /* Layouts submenu */
    let itemLayouts    = new Gtk.MenuItem({ label: "Select Keyboard Layout" });
    let layoutSubMenu  = new Gtk.Menu();
    layouts.forEach(lName => {
        let sub = new Gtk.MenuItem({ label: lName });
        sub.connect("activate", () => {
            currentLayout = lName.split(" ")[0];
            if (btnLayoutLabel) btnLayoutLabel.set_text(currentLayout + " ▼");
        });
        layoutSubMenu.append(sub);
    });
    layoutSubMenu.show_all();
    itemLayouts.set_submenu(layoutSubMenu);
    menu.append(itemLayouts);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemPad = new Gtk.MenuItem({ label: "Avro Pad — Bengali Text Editor" });
    itemPad.connect("activate", () => {
        if (AvroPad && AvroPad.runAvroPad) AvroPad.runAvroPad(null);
        else GLib.spawn_command_line_async("avro-pad");
    });
    menu.append(itemPad);

    let itemBijoy = new Gtk.MenuItem({ label: "Unicode to Bijoy Converter" });
    itemBijoy.connect("activate", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog)
            BijoyConverter.runConverterDialog(window);
        else GLib.spawn_command_line_async("avro-converter");
    });
    menu.append(itemBijoy);

    let itemLV = new Gtk.MenuItem({ label: "Keyboard Layout Viewer" });
    itemLV.connect("activate", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog)
            LayoutViewer.runLayoutViewerDialog(window);
        else GLib.spawn_command_line_async("avro-layout");
    });
    menu.append(itemLV);

    let itemMouse = new Gtk.MenuItem({ label: "Avro Mouse — On-Screen Click & Type Keyboard" });
    itemMouse.connect("activate", () => {
        if (AvroMouse && AvroMouse.runAvroMouse)
            AvroMouse.runAvroMouse(window);
        else GLib.spawn_command_line_async("avro-mouse");
    });
    menu.append(itemMouse);

    let itemPreview = new Gtk.MenuItem({ label: "Floating Candidate Preview Window" });
    itemPreview.connect("activate", () => {
        GLib.spawn_command_line_async("avro-preview");
    });
    menu.append(itemPreview);

    let itemDoctor = new Gtk.MenuItem({ label: "Avro Doctor — Diagnostics & Health Check" });
    itemDoctor.connect("activate", () => {
        GLib.spawn_command_line_async("avro-doctor");
    });
    menu.append(itemDoctor);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemThemes = new Gtk.MenuItem({ label: "TopBar Skin & Theme" });
    let themeSubMenu = new Gtk.Menu();
    Object.keys(THEMES).forEach(tName => {
        let tItem = new Gtk.MenuItem({ label: tName });
        tItem.connect("activate", () => {
            applyTheme(tName);
            saveTheme(tName);
        });
        themeSubMenu.append(tItem);
    });
    themeSubMenu.show_all();
    itemThemes.set_submenu(themeSubMenu);
    menu.append(itemThemes);

    let itemAutostart = new Gtk.CheckMenuItem({ label: "Start Avro TopBar automatically on login" });
    itemAutostart.set_active(isAutostartEnabled());
    itemAutostart.connect("toggled", () => {
        setAutostartEnabled(itemAutostart.get_active());
    });
    menu.append(itemAutostart);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemPref = new Gtk.MenuItem({ label: "Preferences..." });
    itemPref.connect("activate", () => {
        if (PrefApp && PrefApp.runpref) PrefApp.runpref();
        else GLib.spawn_command_line_async("avro-preferences");
    });
    menu.append(itemPref);

    let itemAbout = new Gtk.MenuItem({ label: "About Avro Linux (Remastered)..." });
    itemAbout.connect("activate", () => showAboutDialog(window));
    menu.append(itemAbout);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemQuit = new Gtk.MenuItem({ label: "Exit Avro TopBar" });
    itemQuit.connect("activate", () => window.destroy());
    menu.append(itemQuit);

    menu.show_all();

    btnLogo.connect("clicked", () => {
        menu.popup_at_widget(btnLogo, Gdk.Gravity.SOUTH_WEST, Gdk.Gravity.NORTH_WEST, null);
    });
    mainBox.pack_start(btnLogo, false, false, 0);

    /* ═══════════════════════════════════════════════════════════════════════
       2. Mode Toggle (বাংলা / English)  [F12]
       ═══════════════════════════════════════════════════════════════════════ */
    let btnMode      = new Gtk.Button();
    btnMode.set_can_focus(false);
    btnMode.set_focus_on_click(false);
    let btnModeLabel = new Gtk.Label({ use_markup: true });
    btnMode.add(btnModeLabel);

    /* ─── Mode Setting Sync via GSettings ─── */
    let setting = null;
    try {
        setting = new Gio.Settings({ schema_id: "com.omicronlab.avro" });
        if (setting && setting.list_keys().indexOf('mode-bangla') !== -1) {
            isBangla = setting.get_boolean('mode-bangla');
            setting.connect('changed::mode-bangla', () => {
                isBangla = setting.get_boolean('mode-bangla');
                updateModeUI();
            });
        }
    } catch (e) {}

    function ensureDaemonRunning() {
        try {
            let [ok, out] = GLib.spawn_command_line_sync("pgrep -x ibus-daemon");
            if (!ok || !out || out.length === 0) {
                GLib.spawn_command_line_async("ibus-daemon -drx");
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                    GLib.spawn_command_line_async("ibus engine ibus-avro");
                    return false;
                });
            } else {
                GLib.spawn_command_line_async("ibus engine ibus-avro");
            }
        } catch (e) {}
    }

    function setSystemEngine(bangla) {
        if (setting) {
            try {
                setting.set_boolean('mode-bangla', bangla);
            } catch (e) {}
        }
        ensureDaemonRunning();
    }

    function updateModeUI() {
        btnMode.get_style_context().remove_class("avro-mode-bangla");
        btnMode.get_style_context().remove_class("avro-mode-english");
        if (isBangla) {
            btnModeLabel.set_markup("<b>বাংলা  [F12]</b>");
            btnMode.get_style_context().add_class("avro-mode-bangla");
            btnMode.set_tooltip_text("Mode: বাংলা — click or press F12 anywhere to switch to English");
        } else {
            btnModeLabel.set_markup("<b>English  [F12]</b>");
            btnMode.get_style_context().add_class("avro-mode-english");
            btnMode.set_tooltip_text("Mode: English — click or press F12 anywhere to switch to বাংলা");
        }
    }
    updateModeUI();

    btnMode.connect("clicked", () => {
        isBangla = !isBangla;
        setSystemEngine(isBangla);
        updateModeUI();
    });
    mainBox.pack_start(btnMode, false, false, 0);


    /* ═══════════════════════════════════════════════════════════════════════
       3. Layout Selector
       ═══════════════════════════════════════════════════════════════════════ */
    let btnLayout = new Gtk.Button();
    btnLayout.set_can_focus(false);
    btnLayout.set_focus_on_click(false);
    btnLayoutLabel = new Gtk.Label({ label: "Phonetic ▼" });
    btnLayout.add(btnLayoutLabel);
    btnLayout.get_style_context().add_class("avro-layout-btn");
    btnLayout.set_tooltip_text("Switch Keyboard Layout");

    let layoutMenu = new Gtk.Menu();
    layouts.forEach(lName => {
        let sub = new Gtk.MenuItem({ label: lName });
        sub.connect("activate", () => {
            currentLayout = lName.split(" ")[0];
            btnLayoutLabel.set_text(currentLayout + " ▼");
        });
        layoutMenu.append(sub);
    });
    layoutMenu.show_all();
    btnLayout.connect("clicked", () => {
        layoutMenu.popup_at_widget(btnLayout, Gdk.Gravity.SOUTH_WEST, Gdk.Gravity.NORTH_WEST, null);
    });
    mainBox.pack_start(btnLayout, false, false, 0);

    /* ═══════════════════════════════════════════════════════════════════════
       4. Quick-Tool Icon Buttons
       ═══════════════════════════════════════════════════════════════════════ */
    function makeToolBtn(label, tip, onClick) {
        let b = new Gtk.Button({ label: label });
        b.set_can_focus(false);
        b.set_focus_on_click(false);
        b.get_style_context().add_class("avro-tool-btn");
        b.set_tooltip_text(tip);
        b.connect("clicked", onClick);
        return b;
    }

    let toolsBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2 });

    toolsBox.pack_start(makeToolBtn("📝", "Avro Pad — Bengali Notepad", () => {
        if (AvroPad && AvroPad.runAvroPad) AvroPad.runAvroPad(null);
        else GLib.spawn_command_line_async("avro-pad");
    }), false, false, 0);

    toolsBox.pack_start(makeToolBtn("🔄", "Unicode ↔ Bijoy Converter", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog)
            BijoyConverter.runConverterDialog(window);
        else GLib.spawn_command_line_async("avro-converter");
    }), false, false, 0);

    toolsBox.pack_start(makeToolBtn("⌨", "Keyboard Layout Viewer", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog)
            LayoutViewer.runLayoutViewerDialog(window);
        else GLib.spawn_command_line_async("avro-layout");
    }), false, false, 0);

    toolsBox.pack_start(makeToolBtn("🖱️", "Avro Mouse — On-Screen Click & Type Keyboard", () => {
        if (AvroMouse && AvroMouse.runAvroMouse)
            AvroMouse.runAvroMouse(window);
        else GLib.spawn_command_line_async("avro-mouse");
    }), false, false, 0);

    toolsBox.pack_start(makeToolBtn("👁", "Toggle Floating Candidate Preview Window", () => {
        GLib.spawn_command_line_async("avro-preview");
    }), false, false, 0);

    toolsBox.pack_start(makeToolBtn("🩺", "Avro Doctor — Diagnostics & Health Check", () => {
        GLib.spawn_command_line_async("avro-doctor");
    }), false, false, 0);

    toolsBox.pack_start(makeToolBtn("⚙", "Preferences", () => {
        if (PrefApp && PrefApp.runpref) PrefApp.runpref();
        else GLib.spawn_command_line_async("avro-preferences");
    }), false, false, 0);

    mainBox.pack_start(toolsBox, false, false, 2);

    /* ═══════════════════════════════════════════════════════════════════════
       5. Window Controls: Pin / Mini / Close
       ═══════════════════════════════════════════════════════════════════════ */
    let btnPin = new Gtk.Button({ label: "📌" });
    btnPin.set_can_focus(false);
    btnPin.set_focus_on_click(false);
    btnPin.get_style_context().add_class("avro-pin-btn");
    btnPin.set_tooltip_text("Pinned to top-center (click to unpin)");
    btnPin.connect("clicked", () => {
        isPinned = !isPinned;
        if (isPinned) {
            btnPin.set_tooltip_text("Pinned to top-center (click to unpin)");
            snapToTopCenter();
        } else {
            btnPin.set_tooltip_text("Floating (click to snap to top-center)");
        }
    });
    mainBox.pack_start(btnPin, false, false, 0);

    let btnMini = new Gtk.Button({ label: "▲" });
    btnMini.set_can_focus(false);
    btnMini.set_focus_on_click(false);
    btnMini.get_style_context().add_class("avro-tool-btn");
    btnMini.set_tooltip_text("Collapse to mini bar");
    btnMini.connect("clicked", () => {
        isMini = !isMini;
        if (isMini) {
            btnLayout.hide();
            toolsBox.hide();
            btnMini.set_label("▼");
            btnMini.set_tooltip_text("Expand full bar");
        } else {
            btnLayout.show();
            toolsBox.show();
            btnMini.set_label("▲");
            btnMini.set_tooltip_text("Collapse to mini bar");
        }
        if (isPinned) {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                snapToTopCenter();
                return false;
            });
        }
    });
    mainBox.pack_start(btnMini, false, false, 0);

    let btnClose = new Gtk.Button({ label: "✕" });
    btnClose.set_can_focus(false);
    btnClose.set_focus_on_click(false);
    btnClose.get_style_context().add_class("avro-close-btn");
    btnClose.set_tooltip_text("Close Avro TopBar");
    btnClose.connect("clicked", () => window.destroy());
    mainBox.pack_start(btnClose, false, false, 0);

    /* ── Finish ── */
    window.add(mainBox);
    window.connect("destroy", () => Gtk.main_quit());

    /* Position and show */
    window.show_all();

    /* After show: snap to top, ensure background engine is active, sync mode */
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        snapToTopCenter();
        ensureDaemonRunning();
        if (setting && setting.list_keys().indexOf('mode-bangla') !== -1) {
            isBangla = setting.get_boolean('mode-bangla');
            updateModeUI();
        }
        return false;
    });

    Gtk.main();
    return window;
}

/* ── About dialog ── */
function showAboutDialog(parent) {
    let dialog = new Gtk.AboutDialog({
        transient_for: parent,
        modal:         true,
        program_name:  "Avro Linux (Remastered Edition)",
        version:       "1.0.0",
        comments:      "The popular Avro Phonetic Bengali input method\nremastered with a native Windows-style interface for Linux.\n\nRemastered for modern Linux by MD Shifat Bin Siddique Urfi.\n\nOriginal Avro by Dr. Mehdi Hasan Khan (OmicronLab).\nOriginal Linux IBus port by Sarim Khan.",
        website:       "https://github.com/avro-linux/avro-linux",
        authors: [
            "MD Shifat Bin Siddique Urfi — Remastered Edition Lead",
            "Sarim Khan — ibus-avro",
            "Dr. Mehdi Hasan Khan — Avro Keyboard / OmicronLab",
            "Rifat Nabi — jsAvroPhonetic"
        ],
        license_type: Gtk.License.MPL_2_0
    });
    dialog.run();
    dialog.destroy();
}

/* ═══════════════════════════════════════════════════════════════════════════
   Standalone entrypoint
   ═══════════════════════════════════════════════════════════════════════════ */
let _isMain = false;
try {
    if (typeof ARGV !== 'undefined') {
        for (let a of ARGV) {
            if (a === '--standalone' || a.indexOf('topbar.js') !== -1) {
                _isMain = true;
                break;
            }
        }
    }
} catch (e) {}

if (_isMain) {
    Gtk.init(null);
    runAvroTopBar();
}
