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

// Base search paths
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = (typeof ARGV !== 'undefined' && ARGV[0]) ? ARGV[0] : '.';
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
        skip_taskbar_hint: true,
        skip_pager_hint: true,
        accept_focus: false, // Critical: do NOT steal keyboard focus from active apps
        role: "avro-topbar"
    });

    // Make window sticky (visible across all virtual desktops / workspaces)
    window.stick();
    // Keep window above all other windows (always-on-top like Windows Avro)
    window.set_keep_above(true);
    window.set_type_hint(Gdk.WindowTypeHint.UTILITY);

    // Watchdog timer: ensure TopBar remains above all windows and sticky
    GLib.timeout_add(GLib.PRIORITY_LOW, 2000, () => {
        if (window.get_visible()) {
            window.set_keep_above(true);
            window.stick();
        }
        return true;
    });

    let isPinned = true;
    let isMini = false;
    let isBangla = true;
    let currentLayout = "Avro Phonetic";

    // Snapping logic: default to top center of primary display
    function snapToTopCenter() {
        let screen = Gdk.Screen.get_default();
        if (screen) {
            let monitor = 0;
            if (typeof screen.get_primary_monitor === 'function') {
                monitor = screen.get_primary_monitor();
            }
            let geom = screen.get_monitor_geometry(monitor);
            let [w] = window.get_size();
            let targetX = geom.x + Math.floor((geom.width - (w || 380)) / 2);
            let targetY = geom.y + 10;
            window.move(targetX, targetY);
        }
    }

    // Windows Avro TopBar custom CSS styling
    let cssProvider = new Gtk.CssProvider();
    let css = `
        window.avro-topbar-window {
            background: linear-gradient(180deg, rgba(34, 40, 49, 0.98), rgba(20, 24, 33, 0.98));
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: 22px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 0 0 12px rgba(66, 133, 244, 0.25);
            padding: 4px 10px;
        }
        .avro-logo-btn {
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: #ffffff;
            font-weight: 900;
            font-size: 13px;
            border-radius: 14px;
            padding: 3px 10px;
            border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .avro-logo-btn:hover {
            background: linear-gradient(135deg, #2a5298, #3b7dd8);
        }
        .avro-mode-bangla {
            background: linear-gradient(135deg, #00b09b, #96c93d);
            color: #062b16;
            font-weight: 900;
            font-size: 13px;
            border-radius: 14px;
            padding: 4px 16px;
            border: 1px solid #96c93d;
            box-shadow: 0 0 10px rgba(150, 201, 61, 0.45);
        }
        .avro-mode-bangla:hover {
            background: linear-gradient(135deg, #02c39a, #a8e063);
        }
        .avro-mode-english {
            background: linear-gradient(135deg, #373b44, #4286f4);
            color: #ffffff;
            font-weight: 900;
            font-size: 13px;
            border-radius: 14px;
            padding: 4px 16px;
            border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .avro-mode-english:hover {
            background: linear-gradient(135deg, #4286f4, #5b9bf8);
        }
        .avro-layout-btn {
            background: rgba(255, 255, 255, 0.08);
            color: #d1d8e0;
            font-size: 12px;
            border-radius: 12px;
            padding: 3px 8px;
            border: none;
        }
        .avro-layout-btn:hover {
            background: rgba(255, 255, 255, 0.18);
            color: #ffffff;
        }
        .avro-tool-btn {
            background: rgba(255, 255, 255, 0.07);
            color: #e0e6ed;
            font-size: 13px;
            border-radius: 12px;
            padding: 3px 8px;
            border: none;
        }
        .avro-tool-btn:hover {
            background: rgba(255, 255, 255, 0.22);
            color: #ffffff;
        }
        .avro-pin-active {
            color: #f39c12;
            font-weight: bold;
        }
        .avro-close-btn {
            background: transparent;
            color: #95a5a6;
            border-radius: 12px;
            padding: 2px 7px;
            border: none;
        }
        .avro-close-btn:hover {
            background: #e74c3c;
            color: #ffffff;
        }
    `;
    try {
        cssProvider.load_from_data(css);
        let screen = Gdk.Screen.get_default();
        if (screen) {
            Gtk.StyleContext.add_provider_for_screen(
                screen,
                cssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );
        }
    } catch (e) {}

    window.get_style_context().add_class("avro-topbar-window");

    // Enable smooth dragging of the floating bar across the desktop
    window.connect("button-press-event", (widget, event) => {
        let [, button] = event.get_button();
        if (button === 1) { // Left click
            isPinned = false;
            let [, xRoot, yRoot] = event.get_root_coords();
            window.begin_move_drag(button, xRoot, yRoot, event.get_time());
            return true;
        }
        return false;
    });

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, margin: 3 });

    /* ------------------------------------------------------------------------- */
    /* 1. Avro Logo & Full Windows Menu                                         */
    /* ------------------------------------------------------------------------- */
    let btnLogo = new Gtk.Button({ label: "অ Avro" });
    btnLogo.get_style_context().add_class("avro-logo-btn");
    btnLogo.set_tooltip_text("Avro Keyboard Menu (Remastered for Linux)");

    let menu = new Gtk.Menu();

    // Layout submenu
    let itemLayouts = new Gtk.MenuItem({ label: "⌨️  Select Keyboard Layout" });
    let layoutSubMenu = new Gtk.Menu();
    let layouts = ["Avro Phonetic (Default)", "Avro Easy", "Bornona", "National (Jatiya)", "Probhat"];
    layouts.forEach(lName => {
        let cleanName = lName.split(" ")[0];
        let subItem = new Gtk.MenuItem({ label: (lName.includes("Phonetic") ? "✓ " : "   ") + lName });
        subItem.connect("activate", () => {
            currentLayout = cleanName;
            btnLayoutLabel.set_text(cleanName + " ▼");
        });
        layoutSubMenu.append(subItem);
    });
    layoutSubMenu.show_all();
    itemLayouts.set_submenu(layoutSubMenu);
    menu.append(itemLayouts);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemPad = new Gtk.MenuItem({ label: "📝  Avro Pad (Text Editor)" });
    itemPad.connect("activate", () => {
        if (AvroPad && AvroPad.runAvroPad) {
            AvroPad.runAvroPad(null);
        } else {
            GLib.spawn_command_line_async("avro-pad");
        }
    });
    menu.append(itemPad);

    let itemBijoy = new Gtk.MenuItem({ label: "🔄  Unicode to Bijoy Converter" });
    itemBijoy.connect("activate", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog) {
            BijoyConverter.runConverterDialog(window);
        } else {
            GLib.spawn_command_line_async("avro-converter");
        }
    });
    menu.append(itemBijoy);

    let itemLayoutViewer = new Gtk.MenuItem({ label: "📖  Keyboard Layout Viewer" });
    itemLayoutViewer.connect("activate", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog) {
            LayoutViewer.runLayoutViewerDialog(window);
        } else {
            GLib.spawn_command_line_async("avro-layout");
        }
    });
    menu.append(itemLayoutViewer);

    let itemFontCheck = new Gtk.MenuItem({ label: "🔍  Bengali Font Check & Info" });
    itemFontCheck.connect("activate", () => {
        let msg = "Recommended Bengali Fonts:\n\n• Noto Sans Bengali (Installed by default)\n• Kalpurush / SolaimanLipi\n• Siyam Rupali\n\nAll Unicode Bengali fonts are fully supported.";
        let dialog = new Gtk.MessageDialog({
            transient_for: window,
            modal: true,
            message_type: Gtk.MessageType.INFO,
            buttons: Gtk.ButtonsType.OK,
            text: "Avro Bengali Font Checker",
            secondary_text: msg
        });
        dialog.run();
        dialog.destroy();
    });
    menu.append(itemFontCheck);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemPref = new Gtk.MenuItem({ label: "⚙️  Preferences..." });
    itemPref.connect("activate", () => {
        if (PrefApp && PrefApp.runpref) {
            PrefApp.runpref();
        } else {
            GLib.spawn_command_line_async("avro-preferences");
        }
    });
    menu.append(itemPref);

    let itemAbout = new Gtk.MenuItem({ label: "ℹ️  About Avro Remastered..." });
    itemAbout.connect("activate", () => {
        let dialog = new Gtk.AboutDialog({
            transient_for: window,
            modal: true,
            program_name: "Avro Linux (Remastered Edition)",
            version: "1.0.0",
            comments: "The popular Avro Phonetic Bengali input method remastered with a native Windows-style interface for Linux.\n\nRemastered for modern Linux by MD Shifat Bin Siddique Urfi.\n\nOriginal Avro by Dr. Mehdi Hasan Khan (OmicronLab).\nOriginal Linux IBus port by Sarim Khan.",
            website: "https://github.com/avro-linux/avro-linux",
            authors: [
                "MD Shifat Bin Siddique Urfi (Remastered Edition Lead)",
                "Sarim Khan (ibus-avro)",
                "Dr. Mehdi Hasan Khan (Avro Keyboard / OmicronLab)",
                "Rifat Nabi (jsAvroPhonetic)"
            ],
            license_type: Gtk.License.MPL_2_0
        });
        dialog.run();
        dialog.destroy();
    });
    menu.append(itemAbout);

    menu.append(new Gtk.SeparatorMenuItem());

    let itemQuit = new Gtk.MenuItem({ label: "✕  Exit Avro TopBar" });
    itemQuit.connect("activate", () => {
        window.destroy();
    });
    menu.append(itemQuit);

    menu.show_all();

    btnLogo.connect("clicked", () => {
        menu.popup_at_widget(btnLogo, Gdk.Gravity.SOUTH_WEST, Gdk.Gravity.NORTH_WEST, null);
    });

    mainBox.pack_start(btnLogo, false, false, 0);

    /* ------------------------------------------------------------------------- */
    /* 2. Language Mode Toggle Button [F12] (বাংলা / English)                    */
    /* ------------------------------------------------------------------------- */
    let btnMode = new Gtk.Button();
    let btnModeLabel = new Gtk.Label({ label: "<b>[F12] বাংলা</b>", use_markup: true });
    btnMode.add(btnModeLabel);

    let ibusBus = null;
    if (IBus) {
        try {
            ibusBus = new IBus.Bus();
            if (ibusBus.is_connected()) {
                // Listen to global engine changes to automatically synchronize button state
                ibusBus.connect("global-engine-changed", (b, engineName) => {
                    if (engineName && engineName.includes("avro")) {
                        isBangla = true;
                    } else {
                        isBangla = false;
                    }
                    updateModeUI();
                });
            }
        } catch (e) {}
    }

    function setSystemEngine(bangla) {
        if (bangla) {
            try {
                if (ibusBus && ibusBus.is_connected()) {
                    ibusBus.set_global_engine_async("ibus-avro", -1, null, null);
                }
            } catch (e) {}
            GLib.spawn_command_line_async("ibus engine ibus-avro");
        } else {
            try {
                if (ibusBus && ibusBus.is_connected()) {
                    ibusBus.set_global_engine_async("xkb:us::eng", -1, null, null);
                }
            } catch (e) {}
            GLib.spawn_command_line_async("ibus engine xkb:us::eng");
        }
    }

    function updateModeUI() {
        btnMode.get_style_context().remove_class("avro-mode-bangla");
        btnMode.get_style_context().remove_class("avro-mode-english");

        if (isBangla) {
            btnMode.get_style_context().add_class("avro-mode-bangla");
            btnModeLabel.set_markup("<b>[F12] বাংলা</b>");
            btnMode.set_tooltip_text("Active: বাংলা (Click or press F12 anywhere to switch to English)");
        } else {
            btnMode.get_style_context().add_class("avro-mode-english");
            btnModeLabel.set_markup("<b>[F12] English</b>");
            btnMode.set_tooltip_text("Active: English (Click or press F12 to switch to বাংলা)");
        }
    }
    updateModeUI();

    btnMode.connect("clicked", () => {
        isBangla = !isBangla;
        setSystemEngine(isBangla);
        updateModeUI();
    });

    mainBox.pack_start(btnMode, false, false, 0);

    /* ------------------------------------------------------------------------- */
    /* 3. Layout Selector Button (Avro Phonetic ▼)                               */
    /* ------------------------------------------------------------------------- */
    let btnLayout = new Gtk.Button();
    let btnLayoutLabel = new Gtk.Label({ label: "Phonetic ▼" });
    btnLayout.add(btnLayoutLabel);
    btnLayout.get_style_context().add_class("avro-layout-btn");
    btnLayout.set_tooltip_text("Switch Keyboard Layout");

    let layoutMenu = new Gtk.Menu();
    layouts.forEach(lName => {
        let cleanName = lName.split(" ")[0];
        let subItem = new Gtk.MenuItem({ label: lName });
        subItem.connect("activate", () => {
            currentLayout = cleanName;
            btnLayoutLabel.set_text(cleanName + " ▼");
        });
        layoutMenu.append(subItem);
    });
    layoutMenu.show_all();

    btnLayout.connect("clicked", () => {
        layoutMenu.popup_at_widget(btnLayout, Gdk.Gravity.SOUTH_WEST, Gdk.Gravity.NORTH_WEST, null);
    });

    mainBox.pack_start(btnLayout, false, false, 2);

    /* ------------------------------------------------------------------------- */
    /* 4. Quick Tools Menu (🛠️ Tools ▼)                                         */
    /* ------------------------------------------------------------------------- */
    let toolsBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });

    let btnOpenPad = new Gtk.Button({ label: "📝" });
    btnOpenPad.get_style_context().add_class("avro-tool-btn");
    btnOpenPad.set_tooltip_text("Avro Pad — Bengali Notepad");
    btnOpenPad.connect("clicked", () => {
        if (AvroPad && AvroPad.runAvroPad) {
            AvroPad.runAvroPad(null);
        } else {
            GLib.spawn_command_line_async("avro-pad");
        }
    });
    toolsBox.pack_start(btnOpenPad, false, false, 0);

    let btnOpenBijoy = new Gtk.Button({ label: "🔄" });
    btnOpenBijoy.get_style_context().add_class("avro-tool-btn");
    btnOpenBijoy.set_tooltip_text("Unicode to Bijoy (SutonnyMJ) Converter");
    btnOpenBijoy.connect("clicked", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog) {
            BijoyConverter.runConverterDialog(window);
        } else {
            GLib.spawn_command_line_async("avro-converter");
        }
    });
    toolsBox.pack_start(btnOpenBijoy, false, false, 0);

    let btnOpenLayout = new Gtk.Button({ label: "⌨️" });
    btnOpenLayout.get_style_context().add_class("avro-tool-btn");
    btnOpenLayout.set_tooltip_text("Keyboard Layout Viewer");
    btnOpenLayout.connect("clicked", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog) {
            LayoutViewer.runLayoutViewerDialog(window);
        } else {
            GLib.spawn_command_line_async("avro-layout");
        }
    });
    toolsBox.pack_start(btnOpenLayout, false, false, 0);

    let btnOpenPref = new Gtk.Button({ label: "⚙️" });
    btnOpenPref.get_style_context().add_class("avro-tool-btn");
    btnOpenPref.set_tooltip_text("Avro Settings & Preferences");
    btnOpenPref.connect("clicked", () => {
        if (PrefApp && PrefApp.runpref) {
            PrefApp.runpref();
        } else {
            GLib.spawn_command_line_async("avro-preferences");
        }
    });
    toolsBox.pack_start(btnOpenPref, false, false, 0);

    mainBox.pack_start(toolsBox, false, false, 2);

    /* ------------------------------------------------------------------------- */
    /* 5. Window Controls: Pin, Mini/Full, Close                                */
    /* ------------------------------------------------------------------------- */
    let btnPin = new Gtk.Button({ label: "📌" });
    btnPin.get_style_context().add_class("avro-tool-btn");
    btnPin.get_style_context().add_class("avro-pin-active");
    btnPin.set_tooltip_text("Pinned to Top Center (Click to unpin and float)");
    btnPin.connect("clicked", () => {
        isPinned = !isPinned;
        if (isPinned) {
            btnPin.get_style_context().add_class("avro-pin-active");
            btnPin.set_tooltip_text("Pinned to Top Center (Click to unpin and float)");
            snapToTopCenter();
        } else {
            btnPin.get_style_context().remove_class("avro-pin-active");
            btnPin.set_tooltip_text("Floating freely (Click to snap and pin to top center)");
        }
    });
    mainBox.pack_start(btnPin, false, false, 0);

    let btnMini = new Gtk.Button({ label: "▲" });
    btnMini.get_style_context().add_class("avro-tool-btn");
    btnMini.set_tooltip_text("Collapse to compact mini bar");
    btnMini.connect("clicked", () => {
        isMini = !isMini;
        if (isMini) {
            btnLayout.hide();
            toolsBox.hide();
            btnMini.set_label("▼");
            btnMini.set_tooltip_text("Expand to full Avro bar");
        } else {
            btnLayout.show();
            toolsBox.show();
            btnMini.set_label("▲");
            btnMini.set_tooltip_text("Collapse to compact mini bar");
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
    btnClose.connect("clicked", () => {
        window.destroy();
    });
    mainBox.pack_start(btnClose, false, false, 0);

    window.add(mainBox);
    window.connect("destroy", () => {
        Gtk.main_quit();
    });

    // Check initial global IBus engine status
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        snapToTopCenter();
        try {
            let [res, stdout] = GLib.spawn_command_line_sync("ibus engine");
            if (res) {
                let out = String.fromCharCode.apply(null, stdout).trim();
                isBangla = out.includes("avro");
                updateModeUI();
            }
        } catch (e) {}
        return false;
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
