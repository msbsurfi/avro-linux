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
let PrefApp       = null; try { PrefApp       = imports.pref;          } catch (e) {}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS — Royal Dark Floating Bar
   ═══════════════════════════════════════════════════════════════════════════ */
const BAR_CSS = `
* { outline: none; }

.avro-topbar-window {
    background: linear-gradient(180deg, #1f2433 0%, #161924 100%);
    border: 1px solid rgba(74,144,217,0.25);
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

/* Tooltip overrides */
tooltip {
    background-color: #1a1d28;
    color: #c0ccdd;
    border: 1px solid #2a3350;
    border-radius: 8px;
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   runAvroTopBar()
   ═══════════════════════════════════════════════════════════════════════════ */
function runAvroTopBar() {

    /* Apply CSS globally */
    let cssProvider = new Gtk.CssProvider();
    try {
        cssProvider.load_from_data(BAR_CSS);
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
        role:              "avro-topbar"
    });
    window.get_style_context().add_class("avro-topbar-window");

    /* Always-on-top + stick to all workspaces */
    window.stick();
    window.set_keep_above(true);
    window.set_type_hint(Gdk.WindowTypeHint.UTILITY);

    /* Watchdog: re-assert always-on-top every 1.5 s (some DEs override it) */
    GLib.timeout_add(GLib.PRIORITY_LOW, 1500, () => {
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
    let btnModeLabel = new Gtk.Label({ use_markup: true });
    btnMode.add(btnModeLabel);

    /* IBus connection to auto-sync with ibus engine changes */
    let ibusBus = null;
    if (IBus) {
        try {
            ibusBus = new IBus.Bus();
            if (ibusBus.is_connected()) {
                ibusBus.connect("global-engine-changed", (_b, engineName) => {
                    isBangla = !!(engineName && engineName.includes("avro"));
                    updateModeUI();
                });
            }
        } catch (e) {}
    }

    function setSystemEngine(bangla) {
        let engineName = bangla ? "ibus-avro" : "xkb:us::eng";
        try {
            if (ibusBus && ibusBus.is_connected())
                ibusBus.set_global_engine_async(engineName, -1, null, null);
        } catch (e) {}
        try {
            GLib.spawn_command_line_async("ibus engine " + engineName);
        } catch (e) {}
    }

    function updateModeUI() {
        btnMode.get_style_context().remove_class("avro-mode-bangla");
        btnMode.get_style_context().remove_class("avro-mode-english");
        if (isBangla) {
            btnModeLabel.set_markup("<b>বাংলা  [F12]</b>");
            btnMode.get_style_context().add_class("avro-mode-bangla");
            btnMode.set_tooltip_text("Mode: বাংলা — click or press F12 to switch to English");
        } else {
            btnModeLabel.set_markup("<b>English  [F12]</b>");
            btnMode.get_style_context().add_class("avro-mode-english");
            btnMode.set_tooltip_text("Mode: English — click or press F12 to switch to বাংলা");
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

    toolsBox.pack_start(makeToolBtn("⚙", "Preferences", () => {
        if (PrefApp && PrefApp.runpref) PrefApp.runpref();
        else GLib.spawn_command_line_async("avro-preferences");
    }), false, false, 0);

    mainBox.pack_start(toolsBox, false, false, 2);

    /* ═══════════════════════════════════════════════════════════════════════
       5. Window Controls: Pin / Mini / Close
       ═══════════════════════════════════════════════════════════════════════ */
    let btnPin = new Gtk.Button({ label: "📌" });
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
    btnClose.get_style_context().add_class("avro-close-btn");
    btnClose.set_tooltip_text("Close Avro TopBar");
    btnClose.connect("clicked", () => window.destroy());
    mainBox.pack_start(btnClose, false, false, 0);

    /* ── Finish ── */
    window.add(mainBox);
    window.connect("destroy", () => Gtk.main_quit());

    /* Position and show */
    window.show_all();

    /* After show: snap to top and sync IBus state */
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        snapToTopCenter();
        /* Read current IBus engine to sync button state */
        try {
            let [ok, stdout] = GLib.spawn_command_line_sync("ibus engine");
            if (ok && stdout) {
                let out = "";
                for (let c of stdout) out += String.fromCharCode(c);
                isBangla = out.trim().includes("avro");
                updateModeUI();
            }
        } catch (e) {}
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
