#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Windows-Style Floating Avro TopBar
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Standalone Suite
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// Base paths
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = ARGV[0] || '.';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

imports.searchPath.unshift(baseDir + '/standalone');
imports.searchPath.unshift(baseDir + '/src/standalone');
imports.searchPath.unshift(baseDir + '/preferences');
imports.searchPath.unshift(baseDir + '/src/preferences');
imports.searchPath.unshift('./src/standalone');
imports.searchPath.unshift('./src/preferences');

let AvroPad = null;
try {
    AvroPad = imports.avropad;
} catch (e) {}

let LayoutViewer = null;
try {
    LayoutViewer = imports.layoutviewer;
} catch (e) {}

let BijoyConverter = null;
try {
    BijoyConverter = imports.bijoyconverter;
} catch (e) {}

let PrefApp = null;
try {
    PrefApp = imports.pref;
} catch (e) {}

function runAvroTopBar() {
    let window = new Gtk.Window({
        type: Gtk.WindowType.TOPLEVEL,
        title: "Avro TopBar",
        decorated: false,
        skip_taskbar_hint: false,
        skip_pager_hint: false,
        window_position: Gtk.WindowPosition.NONE
    });

    window.set_keep_above(true);

    // Initial position: top center of screen
    let screen = Gdk.Screen.get_default();
    if (screen) {
        let screenWidth = screen.get_width();
        let barWidth = 360;
        window.move(Math.floor((screenWidth - barWidth) / 2), 24);
    }

    // Modern custom CSS styling mimicking Windows Avro TopBar
    let cssProvider = new Gtk.CssProvider();
    let css = `
        window.avro-topbar-window {
            background: rgba(30, 32, 40, 0.94);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 20px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
            padding: 4px 8px;
        }
        .avro-logo-btn {
            background: linear-gradient(135deg, #2b5876, #4e4376);
            color: #ffffff;
            font-weight: bold;
            border-radius: 14px;
            padding: 2px 8px;
            border: none;
        }
        .avro-mode-bangla {
            background: linear-gradient(135deg, #11998e, #38ef7d);
            color: #0b2b18;
            font-weight: 900;
            border-radius: 14px;
            padding: 4px 14px;
            border: 1px solid #38ef7d;
        }
        .avro-mode-english {
            background: linear-gradient(135deg, #4b6cb7, #182848);
            color: #ffffff;
            font-weight: bold;
            border-radius: 14px;
            padding: 4px 14px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .avro-tool-btn {
            background: rgba(255, 255, 255, 0.08);
            color: #e0e0e0;
            border-radius: 12px;
            padding: 4px 8px;
            border: none;
        }
        .avro-tool-btn:hover {
            background: rgba(255, 255, 255, 0.22);
            color: #ffffff;
        }
        .avro-close-btn {
            background: transparent;
            color: #aaaaaa;
            border-radius: 12px;
            padding: 2px 6px;
            border: none;
        }
        .avro-close-btn:hover {
            background: #e74c3c;
            color: #ffffff;
        }
    `;
    try {
        cssProvider.load_from_data(css);
        Gtk.StyleContext.add_provider_for_screen(
            screen,
            cssProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
    } catch (e) {}

    window.get_style_context().add_class("avro-topbar-window");

    // Enable smooth dragging of the floating bar anywhere on screen
    window.connect("button-press-event", (widget, event) => {
        let [, button] = event.get_button();
        if (button === 1) { // Left click
            let [, xRoot, yRoot] = event.get_root_coords();
            window.begin_move_drag(button, xRoot, yRoot, event.get_time());
            return true;
        }
        return false;
    });

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, margin: 4 });

    /* 1. Avro Logo / Menu Button */
    let btnLogo = new Gtk.Button({ label: "অ Avro" });
    btnLogo.get_style_context().add_class("avro-logo-btn");
    btnLogo.set_tooltip_text("Avro Keyboard Main Menu");

    let menu = new Gtk.Menu();

    let itemPad = new Gtk.MenuItem({ label: "📝  Avro Pad (Text Editor)" });
    itemPad.connect("activate", () => {
        if (AvroPad && AvroPad.runAvroPad) {
            AvroPad.runAvroPad(null);
        }
    });
    menu.append(itemPad);

    let itemLayout = new Gtk.MenuItem({ label: "⌨️  Layout Viewer" });
    itemLayout.connect("activate", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog) {
            LayoutViewer.runLayoutViewerDialog(window);
        }
    });
    menu.append(itemLayout);

    let itemBijoy = new Gtk.MenuItem({ label: "🔄  Unicode to Bijoy Converter" });
    itemBijoy.connect("activate", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog) {
            BijoyConverter.runConverterDialog(window);
        }
    });
    menu.append(itemBijoy);

    let itemPref = new Gtk.MenuItem({ label: "⚙️  Preferences..." });
    itemPref.connect("activate", () => {
        if (PrefApp && PrefApp.runpref) {
            PrefApp.runpref();
        }
    });
    menu.append(itemPref);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemQuit = new Gtk.MenuItem({ label: "✕  Quit Avro TopBar" });
    itemQuit.connect("activate", () => {
        window.destroy();
    });
    menu.append(itemQuit);

    menu.show_all();

    btnLogo.connect("clicked", () => {
        menu.popup_at_widget(btnLogo, Gdk.Gravity.SOUTH_WEST, Gdk.Gravity.NORTH_WEST, null);
    });

    mainBox.pack_start(btnLogo, false, false, 0);

    /* 2. Language / Keyboard Mode Switcher (English / বাংলা) */
    let isBangla = true;
    let btnMode = new Gtk.Button();
    let btnModeLabel = new Gtk.Label({ label: "<b>বাংলা</b>", use_markup: true });
    btnMode.add(btnModeLabel);

    function updateModeUI() {
        btnMode.get_style_context().remove_class("avro-mode-bangla");
        btnMode.get_style_context().remove_class("avro-mode-english");

        if (isBangla) {
            btnMode.get_style_context().add_class("avro-mode-bangla");
            btnModeLabel.set_markup("<b>বাংলা</b>");
            btnMode.set_tooltip_text("Current Mode: বাংলা (Click or press F12 to switch to English)");
        } else {
            btnMode.get_style_context().add_class("avro-mode-english");
            btnModeLabel.set_markup("<b>English</b>");
            btnMode.set_tooltip_text("Current Mode: English (Click or press F12 to switch to বাংলা)");
        }
    }
    updateModeUI();

    btnMode.connect("clicked", () => {
        isBangla = !isBangla;
        updateModeUI();
    });

    mainBox.pack_start(btnMode, false, false, 0);

    /* 3. Layout Label */
    let layoutLabel = new Gtk.Label({ label: "<small><span color='#b0bec5'>Phonetic</span></small>", use_markup: true });
    mainBox.pack_start(layoutLabel, false, false, 4);

    /* 4. Quick Tool Buttons */
    let btnOpenPad = new Gtk.Button({ label: "📝" });
    btnOpenPad.get_style_context().add_class("avro-tool-btn");
    btnOpenPad.set_tooltip_text("Open Avro Pad Text Editor");
    btnOpenPad.connect("clicked", () => {
        if (AvroPad && AvroPad.runAvroPad) {
            AvroPad.runAvroPad(null);
        }
    });
    mainBox.pack_start(btnOpenPad, false, false, 0);

    let btnOpenLayout = new Gtk.Button({ label: "⌨️" });
    btnOpenLayout.get_style_context().add_class("avro-tool-btn");
    btnOpenLayout.set_tooltip_text("Open Keyboard Layout Guide");
    btnOpenLayout.connect("clicked", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog) {
            LayoutViewer.runLayoutViewerDialog(window);
        }
    });
    mainBox.pack_start(btnOpenLayout, false, false, 0);

    let btnOpenBijoy = new Gtk.Button({ label: "🔄" });
    btnOpenBijoy.get_style_context().add_class("avro-tool-btn");
    btnOpenBijoy.set_tooltip_text("Unicode to Bijoy Converter");
    btnOpenBijoy.connect("clicked", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog) {
            BijoyConverter.runConverterDialog(window);
        }
    });
    mainBox.pack_start(btnOpenBijoy, false, false, 0);

    let btnOpenPref = new Gtk.Button({ label: "⚙️" });
    btnOpenPref.get_style_context().add_class("avro-tool-btn");
    btnOpenPref.set_tooltip_text("Open Avro Preferences");
    btnOpenPref.connect("clicked", () => {
        if (PrefApp && PrefApp.runpref) {
            PrefApp.runpref();
        }
    });
    mainBox.pack_start(btnOpenPref, false, false, 0);

    /* 5. Close / Exit Button */
    let btnClose = new Gtk.Button({ label: "✕" });
    btnClose.get_style_context().add_class("avro-close-btn");
    btnClose.set_tooltip_text("Close Avro TopBar");
    btnClose.connect("clicked", () => {
        window.destroy();
    });
    mainBox.pack_start(btnClose, false, false, 2);

    window.add(mainBox);
    window.connect("destroy", () => {
        Gtk.main_quit();
    });

    window.show_all();
    Gtk.main();
    return window;
}

// Standalone execution entrypoint
let isMain = (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1);
try {
    let scriptPath = (typeof ARGV !== 'undefined' && ARGV[0]) ? ARGV[0] : '';
    if (scriptPath.indexOf('topbar.js') !== -1) {
        isMain = true;
    }
} catch (e) {}

if (isMain) {
    Gtk.init(null);
    runAvroTopBar();
}
