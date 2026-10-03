#!/usr/bin/env gjs
/*
    =============================================================================
    *****************************************************************************
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.

    The Original Code is ibus-avro
    Initial Developer: Sarim Khan <sarim2005@gmail.com>
    Copyright (C) Sarim Khan. All Rights Reserved.

    Contributor(s): Mehdi Hasan Khan <mhasan@omicronlab.com>
                    Avro Linux Contributors
    *****************************************************************************
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;

// Discover base path
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = ARGV[0] || '.';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

imports.searchPath.unshift(baseDir + '/common');
imports.searchPath.unshift(baseDir + '/src/common');
imports.searchPath.unshift('/usr/share/avro-linux/common');


// Shared modern theme (src/common/avrotheme.js)
let Theme = null;
(function loadTheme() {
    let dirs = ['/usr/share/avro-linux/common'];
    try {
        let m = new Error().stack.match(/(?:^|@|\()(?:file:\/\/)?([^\s:()@]+\.js):\d+/m);
        if (m) {
            let d = GLib.path_get_dirname(GLib.canonicalize_filename(m[1], GLib.get_current_dir()));
            dirs.unshift(d + '/../common', d + '/../src/common');
        }
    } catch (e) {}
    for (let d of dirs) {
        if (GLib.file_test(d + '/avrotheme.js', GLib.FileTest.EXISTS)) {
            imports.searchPath.unshift(d);
            try { Theme = imports.avrotheme; } catch (e) { printerr('Avro theme: ' + e); }
            break;
        }
    }
})();

let eevars = null;
try {
    eevars = imports.evars;
    eevars.init_search_paths(baseDir);
} catch (e) {}

function getPkgDataDir() {
    if (eevars && typeof eevars.get_pkgdatadir === 'function') {
        return eevars.get_pkgdatadir();
    }
    return '/usr/share/avro-linux';
}

function appVersion() {
    if (eevars && typeof eevars.get_version === 'function') {
        return eevars.get_version();
    }
    return '';
}

function topBarAutostartFile() {
    return Gio.File.new_for_path(GLib.get_user_config_dir() + "/autostart/avro-topbar.desktop");
}

function isTopBarAutostart() {
    return topBarAutostartFile().query_exists(null);
}

function setTopBarAutostart(enable) {
    let file = topBarAutostartFile();
    try {
        if (enable) {
            GLib.mkdir_with_parents(GLib.get_user_config_dir() + "/autostart", 0o755);
            let content = "[Desktop Entry]\nName=Avro TopBar\nComment=Floating Avro Keyboard toolbar\n" +
                          "Exec=avro-topbar\nIcon=avro-bangla\nTerminal=false\nType=Application\n" +
                          "Categories=Utility;\nX-GNOME-Autostart-enabled=true\n";
            file.replace_contents(new TextEncoder().encode(content), null, false,
                                  Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        } else if (file.query_exists(null)) {
            file.delete(null);
        }
    } catch (e) {}
}

function getCandidateSelectionsFile() {
    let configDir = GLib.get_user_config_dir();
    let xdgFile = Gio.File.new_for_path(configDir + "/avro/candidate-selections.json");
    if (xdgFile.query_exists(null)) {
        return xdgFile;
    }
    let legacyFile = Gio.File.new_for_path(GLib.get_home_dir() + "/.candidate-selections.json");
    if (legacyFile.query_exists(null)) {
        return legacyFile;
    }
    return xdgFile;
}

function getUserDictionary() {
    try {
        return new imports.userdictionary.UserDictionary();
    } catch (e) {
        return null;
    }
}

function createDiagnosticReport() {
    let diagText = "";
    diagText += "Application: Avro Linux\n";
    diagText += "Version: " + appVersion() + "\n";
    diagText += "Engine: IBus Avro Phonetic Engine\n";
    try {
        diagText += "System: " + (GLib.get_os_info("PRETTY_NAME") || "Linux") + "\n";
    } catch (e) {
        diagText += "System: Linux\n";
    }
    diagText += "GJS Version: " + (typeof imports.system !== 'undefined' && imports.system.version ? imports.system.version : "Modern") + "\n";
    diagText += "GTK Version: " + Gtk.MAJOR_VERSION + "." + Gtk.MINOR_VERSION + "." + Gtk.MICRO_VERSION + "\n";
    diagText += "GSettings Schema: com.omicronlab.avro\n";
    diagText += "Display server: " + (GLib.getenv("XDG_SESSION_TYPE") || "unknown") + "\n";
    diagText += "Desktop session: " + (GLib.getenv("XDG_CURRENT_DESKTOP") || "unknown") + "\n";
    diagText += "IBus session address: " + (GLib.getenv("IBUS_ADDRESS") ? "available" : "not detected") + "\n";
    diagText += "User Storage: " + getCandidateSelectionsFile().get_path() + "\n";
    diagText += "Installation Prefix: " + getPkgDataDir() + "\n";
    return diagText;
}

function hasKey(settings, key) {
    if (!settings) return false;
    try {
        return settings.settings_schema.has_key(key);
    } catch (e) {
        try {
            return settings.list_keys().indexOf(key) !== -1;
        } catch (e2) {
            return false;
        }
    }
}

function runpref() {
    try {
        GLib.set_prgname("avro-preferences");
        GLib.set_application_name("Avro Preferences");
    } catch (e) {}

    Gtk.init(null);
    try { Gtk.Window.set_default_icon_name("avro-preferences"); } catch (e) {}

    let window = new Gtk.Window({
        title: "Avro Preferences",
        default_width: 940,
        default_height: 660,
        window_position: Gtk.WindowPosition.CENTER
    });
    window.set_icon_name("avro-preferences");
    window.set_size_request(760, 520);
    try { window.set_wmclass("avro-preferences", "AvroPreferences"); } catch (e) {}
    Theme.styleWindow(window);
    window.set_titlebar(Theme.headerBar({
        icon: "avro-preferences",
        title: "Avro Preferences",
        subtitle: "Remastered Edition" + (appVersion() ? " · v" + appVersion() : "")
    }));

    // Connect to GSettings
    let setting = null;
    try {
        setting = new Gio.Settings({ schema_id: "com.omicronlab.avro" });
    } catch (e) {
        print("Warning: Could not connect to GSettings schema com.omicronlab.avro: " + e.message);
    }

    /* ========================================================================= */
    /* Layout: sidebar navigation + page stack                                   */
    /* ========================================================================= */
    let rootBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0 });
    let stack = new Gtk.Stack({ transition_type: Gtk.StackTransitionType.CROSSFADE, transition_duration: 140 });

    let sidebar = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0, width_request: 220 });
    sidebar.get_style_context().add_class("avro-sidebar");

    let brand = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10, margin_start: 18, margin_end: 12, margin_top: 18, margin_bottom: 14 });
    brand.pack_start(new Gtk.Image({ icon_name: "avro-bangla", pixel_size: 40 }), false, false, 0);
    let brandText = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0, valign: Gtk.Align.CENTER });
    brandText.pack_start(Theme.label("Avro Keyboard", "avro-row-title"), false, false, 0);
    brandText.pack_start(Theme.label("Bengali input for Linux", "avro-row-sub"), false, false, 0);
    brand.pack_start(brandText, true, true, 0);
    sidebar.pack_start(brand, false, false, 0);

    let nav = new Gtk.ListBox({ selection_mode: Gtk.SelectionMode.SINGLE });
    nav.get_style_context().add_class("avro-nav");
    sidebar.pack_start(nav, false, false, 0);
    let credit = Theme.label("© Remastered by MD Shifat Bin Siddique Urfi & MD Mehedi Hasan", "avro-row-sub");
    credit.set_margin_start(18);
    sidebar.pack_end(credit, false, false, 14);

    function addNav(name, icon, text) {
        let row = new Gtk.ListBoxRow();
        let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
        box.pack_start(Gtk.Image.new_from_icon_name(icon, Gtk.IconSize.BUTTON), false, false, 0);
        box.pack_start(new Gtk.Label({ label: text, xalign: 0 }), true, true, 0);
        row.add(box);
        row.pageName = name;
        nav.add(row);
        return row;
    }

    function makePage(name, title, subtitle) {
        let box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL, spacing: 14,
            margin_start: 32, margin_end: 32, margin_top: 26, margin_bottom: 28
        });
        let head = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2, margin_bottom: 6 });
        head.pack_start(Theme.label(title, "avro-page-title"), false, false, 0);
        if (subtitle) head.pack_start(Theme.label(subtitle, "avro-sub"), false, false, 0);
        box.pack_start(head, false, false, 0);
        let sw = new Gtk.ScrolledWindow({ hscrollbar_policy: Gtk.PolicyType.NEVER });
        sw.add(box);
        stack.add_named(sw, name);
        return box;
    }

    function addCard(page, rows) {
        let c = Theme.card();
        Theme.fillCard(c, rows);
        page.pack_start(c, false, false, 0);
        return c;
    }

    function openTool(cmd) {
        try { GLib.spawn_command_line_async(cmd); } catch (e) {}
    }

    /* ========================================================================= */
    /* 1. GENERAL                                                                */
    /* ========================================================================= */
    addNav("general", "avro-general-symbolic", "General");
    let generalBox = makePage("general", "General", "Suggestion window, desktop tools and defaults");

    let switchPreview = new Gtk.Switch({ valign: Gtk.Align.CENTER });

    let cboxStyle = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxStyle.append("auto", "Automatic");
    cboxStyle.append("classic", "Avro (Windows style)");
    cboxStyle.append("system", "Desktop panel (IBus)");

    let cboxTheme = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxTheme.append("classic", "Classic (light)");
    cboxTheme.append("dark", "Dark");

    let cboxOrient = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxOrient.append_text("Horizontal");
    cboxOrient.append_text("Vertical");
    cboxOrient.set_active(0);

    let btnLaunchPreview = new Gtk.Button({ label: "Show Demo", valign: Gtk.Align.CENTER });
    btnLaunchPreview.connect("clicked", () => {
        let theme = cboxTheme.get_active_id() || "classic";
        GLib.spawn_command_line_async("avro-preview --demo amader --theme " + theme + " --timeout 8");
    });

    generalBox.pack_start(Theme.sectionTitle("Preview Window"), false, false, 0);
    addCard(generalBox, [
        Theme.settingRow("Show Preview Window", "Shows the English text you type and the Bangla suggestions next to the cursor", switchPreview),
        Theme.settingRow("Preview Window Style", "Avro's Windows-style window, or your desktop's candidate panel", cboxStyle),
        Theme.settingRow("Preview Window Theme", "Colours of the Windows-style Preview Window", cboxTheme),
        Theme.settingRow("Candidate List Orientation", "Direction of the list in the desktop (IBus) candidate panel", cboxOrient),
        Theme.settingRow("Try it out", "Shows the preview window with a sample word", btnLaunchPreview)
    ]);

    // Desktop tools: one tile per Avro application
    generalBox.pack_start(Theme.sectionTitle("Avro Desktop Tools"), false, false, 0);
    let toolsGrid = new Gtk.Grid({ row_spacing: 10, column_spacing: 10, column_homogeneous: true });
    function toolTile(icon, title, sub, cmd) {
        let b = new Gtk.Button();
        let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12, margin: 4 });
        box.pack_start(new Gtk.Image({ icon_name: icon, pixel_size: 40 }), false, false, 0);
        let col = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 1, valign: Gtk.Align.CENTER });
        col.pack_start(Theme.label(title, "avro-row-title"), false, false, 0);
        col.pack_start(Theme.label(sub, "avro-row-sub"), false, false, 0);
        box.pack_start(col, true, true, 0);
        b.add(box);
        b.set_tooltip_text(title);
        b.connect("clicked", () => openTool(cmd));
        return b;
    }
    let btnLaunchTopbar = toolTile("avro-bangla", "Avro TopBar", "Floating toolbar", "avro-topbar");
    let btnLaunchPad = toolTile("avro-pad", "Avro Pad", "Bengali text editor", "avro-pad");
    let btnLaunchConverter = toolTile("avro-converter", "Converter", "Unicode ⇄ Bijoy", "avro-converter");
    let btnLaunchLayout = toolTile("avro-layout", "Layout Viewer", "Keys & rules guide", "avro-layout");
    let btnLaunchMouse = toolTile("avro-mouse", "Avro Mouse", "On-screen keyboard", "avro-mouse");
    let btnLaunchDoctor = toolTile("avro-doctor", "Avro Doctor", "Check & repair setup", "avro-doctor");
    [btnLaunchTopbar, btnLaunchPad, btnLaunchConverter, btnLaunchLayout, btnLaunchMouse, btnLaunchDoctor].forEach((b, i) => {
        toolsGrid.attach(b, i % 2, Math.floor(i / 2), 1, 1);
    });
    generalBox.pack_start(toolsGrid, false, false, 0);

    // Reset settings
    let btnReset = new Gtk.Button({ label: "Reset to Defaults", valign: Gtk.Align.CENTER });
    btnReset.get_style_context().add_class("destructive-action");
    btnReset.connect("clicked", function() {
        let dialog = new Gtk.MessageDialog({
            transient_for: window,
            modal: true,
            message_type: Gtk.MessageType.QUESTION,
            buttons: Gtk.ButtonsType.OK_CANCEL,
            text: "Reset All Settings?",
            secondary_text: "Are you sure you want to reset all Avro configuration settings to defaults?"
        });
        let res = dialog.run();
        dialog.destroy();
        if (res === Gtk.ResponseType.OK && setting) {
            setting.reset("switch-preview");
            setting.reset("preview-style");
            setting.reset("preview-theme");
            setting.reset("preview-pinned");
            setting.reset("preview-pin-x");
            setting.reset("preview-pin-y");
            setting.reset("topbar-skin");
            setting.reset("topbar-transparent");
            setting.reset("topbar-transparency-level");
            setting.reset("topbar-x-button");
            setting.reset("topbar-startup-ui");
            setting.reset("switch-dict");
            setting.reset("switch-newline");
            setting.reset("lutable-size");
            setting.reset("cboxorient");
            setting.reset("mode-bangla");
            if (hasKey(setting, "switch-splash")) setting.reset("switch-splash");
            readFromSettings();
        }
    });
    generalBox.pack_start(Theme.sectionTitle("Defaults"), false, false, 0);
    addCard(generalBox, [
        Theme.settingRow("Restore factory settings", "Restore all preferences to their factory defaults", btnReset)
    ]);

    /* ========================================================================= */
    /* 2. TYPING                                                                 */
    /* ========================================================================= */
    addNav("typing", "avro-typing-symbolic", "Typing");
    let typingBox = makePage("typing", "Typing", "How suggestions behave while you type");

    let switchNewline = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    let adjSize = new Gtk.Adjustment({ lower: 5, upper: 15, step_increment: 1, page_increment: 2, value: 15 });
    let spinSize = new Gtk.SpinButton({ adjustment: adjSize, climb_rate: 1, digits: 0, valign: Gtk.Align.CENTER });
    addCard(typingBox, [
        Theme.settingRow("Insert a Newline after Commit", "Pressing Enter commits the candidate, then inserts a newline", switchNewline),
        Theme.settingRow("Maximum Suggestions", "Maximum number of candidate words shown in list (5 - 15)", spinSize)
    ]);

    /* ========================================================================= */
    /* 3. TOPBAR (the Avro Keyboard "General" and "Interface" options)           */
    /* ========================================================================= */
    addNav("topbar", "avro-topbar-symbolic", "TopBar");
    let topbarBox = makePage("topbar", "TopBar", "Look and behaviour of the floating Avro TopBar");

    let cboxSkin = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxSkin.append("classic", "Avro Classic (dark)");
    cboxSkin.append("royal", "Avro Royal Blue");
    cboxSkin.append("mint", "Avro Flat Mint");
    cboxSkin.append("light", "Avro Paper Light");

    let switchTransparent = new Gtk.Switch({ valign: Gtk.Align.CENTER });

    let scaleLevel = new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        adjustment: new Gtk.Adjustment({ lower: 0, upper: 255, step_increment: 1, page_increment: 16 }),
        digits: 0, value_pos: Gtk.PositionType.RIGHT, width_request: 220, valign: Gtk.Align.CENTER
    });

    let cboxXButton = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxXButton.append("menu", "Show option for both");
    cboxXButton.append("minimize", "Minimize to the system tray");
    cboxXButton.append("exit", "Close the TopBar");

    let cboxStartup = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxStartup.append("topbar", "Top Bar (on desktop, as toolbar)");
    cboxStartup.append("tray", "System tray icon");
    cboxStartup.append("last", "UI mode used last time");

    let switchAutostart = new Gtk.Switch({ valign: Gtk.Align.CENTER, active: isTopBarAutostart() });
    switchAutostart.connect("notify::active", () => setTopBarAutostart(switchAutostart.get_active()));

    let switchSplash = new Gtk.Switch({ valign: Gtk.Align.CENTER });

    let btnOpenTopbar = new Gtk.Button({ label: "Open Avro TopBar", valign: Gtk.Align.CENTER });
    btnOpenTopbar.get_style_context().add_class("suggested-action");
    btnOpenTopbar.connect("clicked", () => GLib.spawn_command_line_async("avro-topbar restore"));

    topbarBox.pack_start(Theme.sectionTitle("Appearance"), false, false, 0);
    addCard(topbarBox, [
        Theme.settingRow("Interface Skin", "Look of the Avro TopBar", cboxSkin),
        Theme.settingRow("Make TopBar semi transparent when it is inactive", "Fades after 5 seconds without mouse activity (needs desktop compositing)", switchTransparent),
        Theme.settingRow("Transparency level (0-255)", "0 = fully transparent, 255 = fully visible", scaleLevel)
    ]);
    topbarBox.pack_start(Theme.sectionTitle("Behaviour"), false, false, 0);
    addCard(topbarBox, [
        Theme.settingRow("When I click the power button on TopBar", "A right click always shows both options", cboxXButton),
        Theme.settingRow("At startup, Avro TopBar will run as", null, cboxStartup),
        Theme.settingRow("Start Avro TopBar when I log in", "Adds the TopBar to your desktop's autostart programs", switchAutostart),
        Theme.settingRow("Show splash screen on startup", "Display the classic Avro splash screen when TopBar launches", switchSplash),
        Theme.settingRow("Avro TopBar", "Bring the TopBar back to the top of your screen", btnOpenTopbar)
    ]);

    /* ========================================================================= */
    /* 4. DICTIONARY & AUTOCORRECT                                               */
    /* ========================================================================= */
    addNav("dictionary", "avro-dictionary-symbolic", "Dictionary");
    let dictBox = makePage("dictionary", "Dictionary", "Dictionary-assisted suggestions and your own words");

    let switchDict = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    addCard(dictBox, [
        Theme.settingRow("Dictionary-Assisted Suggestions", "Matches input against Bengali dictionary and grammatical suffix rules", switchDict)
    ]);

    // Personal dictionary is deliberately separate from the shipped dictionary.
    // It stays in XDG_CONFIG_HOME and is read by the engine without a restart.
    let personalDict = getUserDictionary();
    dictBox.pack_start(Theme.sectionTitle("Personal Dictionary"), false, false, 0);
    let personalBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, margin: 18 });
    let personalHint = Theme.label("Add a phonetic spelling and its Bengali word. Remove uses the same exact pair.", "avro-row-sub");
    let personalRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
    let phoneticEntry = new Gtk.Entry({ placeholder_text: "Phonetic spelling (for example, amarnaam)", hexpand: true });
    let bengaliEntry = new Gtk.Entry({ placeholder_text: "Bengali word", hexpand: true });
    let addWord = new Gtk.Button({ label: "Add" });
    addWord.get_style_context().add_class("suggested-action");
    let removeWord = new Gtk.Button({ label: "Remove" });
    let personalStatus = new Gtk.Label({ xalign: 0 });
    personalStatus.get_style_context().add_class("avro-sub");
    function changePersonalDictionary(action) {
        if (!personalDict) {
            personalStatus.set_text("Personal dictionary is unavailable in this installation.");
            return;
        }
        let phonetic = phoneticEntry.get_text();
        let bengali = bengaliEntry.get_text();
        let ok = action === "add" ? personalDict.add(phonetic, bengali) : personalDict.remove(phonetic, bengali);
        personalStatus.set_text(ok ? (action === "add" ? "Word saved." : "Word removed.") : "Enter a valid exact phonetic/Bengali pair.");
        if (ok) bengaliEntry.set_text("");
    }
    addWord.connect("clicked", function() { changePersonalDictionary("add"); });
    removeWord.connect("clicked", function() { changePersonalDictionary("remove"); });
    personalRow.pack_start(phoneticEntry, true, true, 0);
    personalRow.pack_start(bengaliEntry, true, true, 0);
    personalRow.pack_start(addWord, false, false, 0);
    personalRow.pack_start(removeWord, false, false, 0);
    personalBox.pack_start(personalHint, false, false, 0);
    personalBox.pack_start(personalRow, false, false, 0);
    personalBox.pack_start(personalStatus, false, false, 0);
    addCard(dictBox, [personalBox]);

    // Learned Choices Management
    let btnClearLearned = new Gtk.Button({ label: "Clear Learned Choices", valign: Gtk.Align.CENTER });
    btnClearLearned.get_style_context().add_class("destructive-action");
    btnClearLearned.connect("clicked", function() {
        let f = getCandidateSelectionsFile();
        try {
            if (f.query_exists(null)) {
                f.delete(null);
            }
            let infoDialog = new Gtk.MessageDialog({
                transient_for: window,
                modal: true,
                message_type: Gtk.MessageType.INFO,
                buttons: Gtk.ButtonsType.OK,
                text: "Learned Choices Cleared",
                secondary_text: "All custom candidate selection history has been cleared successfully."
            });
            infoDialog.run();
            infoDialog.destroy();
        } catch (e) {}
    });
    dictBox.pack_start(Theme.sectionTitle("Learning"), false, false, 0);
    addCard(dictBox, [
        Theme.settingRow("Learned Word Selections", "Avro remembers your preferred candidate choices for ambiguous phonetic inputs", btnClearLearned)
    ]);

    /* ========================================================================= */
    /* 5. SHORTCUTS                                                              */
    /* ========================================================================= */
    addNav("shortcuts", "avro-shortcuts-symbolic", "Shortcuts");
    let shortcutsBox = makePage("shortcuts", "Shortcuts", "Avro Phonetic keyboard shortcuts");

    let shortcutsList = [
        ["F12", "Toggle Bangla/English while Avro is the active IBus engine"],
        ["Space / Tab / Return", "Commit current Bengali candidate"],
        ["← → ↑ ↓", "Navigate candidate suggestions"],
        ["Backspace", "Edit preedit buffer (deletes previous character)"],
        ["Escape", "Cancel active preedit and clear suggestion list"],
        ["System shortcut", "Switch between English and Avro; configure this in your desktop settings"],
        ["IBus Menu → Mode", "Toggle between Bangla and English mode directly inside Avro"]
    ];
    let shortcutRows = shortcutsList.map(s => {
        let cap = new Gtk.Label({ label: s[0], xalign: 0.5, valign: Gtk.Align.CENTER });
        cap.get_style_context().add_class("avro-keycap");
        return Theme.settingRow(s[1], null, cap);
    });
    addCard(shortcutsBox, shortcutRows);

    /* ========================================================================= */
    /* 6. DIAGNOSTICS (Privacy Preserving)                                       */
    /* ========================================================================= */
    addNav("diagnostics", "avro-diagnostics-symbolic", "Diagnostics");
    let diagBox = makePage("diagnostics", "Diagnostics", "Technical environment state only. Typed user text is never collected or shown.");

    // Build diagnostic summary text
    let diagText = createDiagnosticReport();

    let diagScrolled = new Gtk.ScrolledWindow({ height_request: 200 });
    diagScrolled.get_style_context().add_class("avro-framed");
    let diagTextView = new Gtk.TextView({ editable: false, cursor_visible: false, monospace: true, margin: 10 });
    diagTextView.get_buffer().set_text(diagText, -1);
    diagScrolled.add(diagTextView);
    diagBox.pack_start(diagScrolled, true, true, 0);

    let diagActionBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
    let btnCopyDiag = new Gtk.Button({ label: "Copy Diagnostics to Clipboard" });
    btnCopyDiag.connect("clicked", function() {
        let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
        clipboard.set_text(diagText, -1);
        btnCopyDiag.set_label("Copied!");
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, function() {
            btnCopyDiag.set_label("Copy Diagnostics to Clipboard");
            return GLib.SOURCE_REMOVE;
        });
    });

    let btnDoctor = new Gtk.Button({ label: "Open Avro Doctor Interactive Tool" });
    btnDoctor.get_style_context().add_class("suggested-action");
    btnDoctor.connect("clicked", () => {
        GLib.spawn_command_line_async("avro-doctor");
    });

    diagActionBox.pack_start(btnCopyDiag, false, false, 0);
    diagActionBox.pack_start(btnDoctor, false, false, 0);
    diagBox.pack_start(diagActionBox, false, false, 0);

    /* ========================================================================= */
    /* 7. ABOUT                                                                  */
    /* ========================================================================= */
    addNav("about", "avro-about-symbolic", "About");
    let aboutPage = makePage("about", "About", null);

    let hero = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, halign: Gtk.Align.CENTER, margin_top: 4 });
    hero.pack_start(new Gtk.Image({ icon_name: "avro-bangla", pixel_size: 96 }), false, false, 0);
    let appNameLabel = Theme.label("Avro Linux (Remastered Edition)", "avro-hero-title");
    appNameLabel.set_justify(Gtk.Justification.CENTER);
    appNameLabel.set_xalign(0.5);
    hero.pack_start(appNameLabel, false, false, 0);
    let verBadge = Theme.badge("Version " + appVersion(), "info");
    verBadge.set_halign(Gtk.Align.CENTER);
    hero.pack_start(verBadge, false, false, 0);
    let appDescLabel = Theme.label("Modern Linux implementation of Avro Phonetic Bengali input method\nwith Windows-style floating TopBar, standalone Avro Pad, and Bijoy converter.", "avro-sub");
    appDescLabel.set_justify(Gtk.Justification.CENTER);
    appDescLabel.set_xalign(0.5);
    hero.pack_start(appDescLabel, false, false, 6);
    aboutPage.pack_start(hero, false, false, 0);

    let creditsBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin: 18 });
    let creditsLabel = new Gtk.Label({
        label: "<b>Remastered by</b>\n" +
               "MD Shifat Bin Siddique Urfi (DMC, K-79)\n" +
               "and MD Mehedi Hasan (BUET, 2021-22)\n\n" +
               "<b>Original Authors &amp; Historical Attribution</b>\n" +
               "OmicronLab (Dr. Mehdi Hasan Khan &amp; Rifat Nabi)\n" +
               "Sarim Khan (ibus-avro)\n" +
               "Debian Maintainers (Gunnar Hjalmarsson, Boyuan Yang)\n" +
               "Avro Linux Contributors",
        use_markup: true,
        justify: Gtk.Justification.CENTER
    });
    creditsBox.pack_start(creditsLabel, false, false, 0);
    addCard(aboutPage, [creditsBox]);

    let licenseLabel = Theme.label("Licensed under the Mozilla Public License, v. 2.0 (MPL-2.0)", "avro-sub");
    licenseLabel.set_xalign(0.5);
    licenseLabel.set_justify(Gtk.Justification.CENTER);
    aboutPage.pack_start(licenseLabel, false, false, 0);

    let btnWebsite = new Gtk.LinkButton({
        uri: "https://github.com/avro-linux/avro-linux",
        label: "Visit Project Repository",
        halign: Gtk.Align.CENTER
    });
    aboutPage.pack_start(btnWebsite, false, false, 0);

    nav.connect("row-selected", (lb, row) => {
        if (row && row.pageName) stack.set_visible_child_name(row.pageName);
    });
    let startRow = nav.get_row_at_index(0);
    let wantedPage = GLib.getenv("AVRO_PREF_PAGE");
    if (wantedPage) {
        for (let i = 0; nav.get_row_at_index(i); i++) {
            if (nav.get_row_at_index(i).pageName === wantedPage) startRow = nav.get_row_at_index(i);
        }
    }
    nav.select_row(startRow);

    rootBox.pack_start(sidebar, false, false, 0);
    rootBox.pack_start(stack, true, true, 0);
    window.add(rootBox);

    /* ========================================================================= */
    /* GSETTINGS BINDINGS & LOGIC                                                */
    /* ========================================================================= */
    function readFromSettings() {
        if (!setting) return;
        try {
            switchPreview.set_active(setting.get_boolean("switch-preview"));
            switchDict.set_active(setting.get_boolean("switch-dict"));
            switchNewline.set_active(setting.get_boolean("switch-newline"));
            spinSize.set_value(setting.get_int("lutable-size"));
            cboxOrient.set_active(setting.get_int("cboxorient"));
            cboxStyle.set_active_id(setting.get_string("preview-style"));
            cboxTheme.set_active_id(setting.get_string("preview-theme"));
            if (hasKey(setting, "switch-splash")) {
                switchSplash.set_active(setting.get_boolean("switch-splash"));
            }
            updateSensitivities();
        } catch (e) {}
    }

    function updateSensitivities() {
        let previewActive = switchPreview.get_active();
        switchDict.set_sensitive(previewActive);
        switchNewline.set_sensitive(previewActive);
        spinSize.set_sensitive(previewActive);
        cboxOrient.set_sensitive(previewActive);
        cboxStyle.set_sensitive(previewActive);
        cboxTheme.set_sensitive(previewActive);
    }

    if (setting) {
        setting.bind("switch-preview", switchPreview, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("switch-dict", switchDict, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("switch-newline", switchNewline, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("lutable-size", spinSize, "value", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("cboxorient", cboxOrient, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("preview-style", cboxStyle, "active-id", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("preview-theme", cboxTheme, "active-id", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("topbar-skin", cboxSkin, "active-id", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("topbar-transparent", switchTransparent, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("topbar-transparency-level", scaleLevel.get_adjustment(), "value", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("topbar-x-button", cboxXButton, "active-id", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("topbar-startup-ui", cboxStartup, "active-id", Gio.SettingsBindFlags.DEFAULT);
        if (hasKey(setting, "switch-splash")) {
            setting.bind("switch-splash", switchSplash, "active", Gio.SettingsBindFlags.DEFAULT);
        }
        scaleLevel.set_sensitive(switchTransparent.get_active());
        switchTransparent.connect("notify::active", () => scaleLevel.set_sensitive(switchTransparent.get_active()));

        switchPreview.connect("notify::active", function() {
            updateSensitivities();
        });

        readFromSettings();
    }

    window.connect("destroy", function() {
        Gtk.main_quit();
    });

    window.show_all();
    Gtk.main();
}

let isMain = (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1);
try {
    let scriptPath = (typeof ARGV !== 'undefined' && ARGV[0]) ? ARGV[0] : '';
    if (scriptPath.indexOf('pref.js') !== -1) {
        isMain = true;
    }
} catch (e) {}

if (isMain) {
    runpref();
}
