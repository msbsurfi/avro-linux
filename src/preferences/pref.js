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

// Discover base path (gjs does not put the script itself in ARGV)
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = imports.system.programPath || '.';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

// Its own tree first (the last unshift is searched first)
imports.searchPath.unshift('/usr/share/avro-linux/common');
imports.searchPath.unshift(baseDir + '/src/common');
imports.searchPath.unshift(baseDir + '/common');

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

function autostartModule() {
    try {
        return imports.autostart;
    } catch (e) {
        return null;
    }
}

function isTopBarAutostart() {
    let autostart = autostartModule();
    return autostart ? autostart.isEnabled() : false;
}

function setTopBarAutostart(enable) {
    let autostart = autostartModule();
    return autostart ? autostart.setEnabled(enable) : false;
}

/* The settings, or null when the schema is not installed (Gio.Settings
   aborts the whole program for a missing schema). */
function avroSettings() {
    try {
        let source = Gio.SettingsSchemaSource.get_default();
        let schema = source ? source.lookup("com.omicronlab.avro", true) : null;
        return schema ? new Gio.Settings({ settings_schema: schema }) : null;
    } catch (e) {
        return null;
    }
}

/* [id, name] of Avro Phonetic and the fixed keyboard layouts. */
function keyboardLayoutChoices() {
    let choices = [["phonetic", "Avro Phonetic (English to Bangla)"]];
    try {
        let fixed = imports.fixedlayout;
        for (let id of fixed.layoutIds()) {
            choices.push([id, fixed.getLayout(id).name]);
        }
    } catch (e) {}
    return choices;
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

function runpref() {
    Gtk.init(null);

    let window = new Gtk.Window({
        title: "Avro Preferences",
        default_width: 540,
        default_height: 480,
        window_position: Gtk.WindowPosition.CENTER
    });
    try { window.set_wmclass("avro-preferences", "AvroPreferences"); } catch (e) {}

    // Try setting icon
    let iconPath = getPkgDataDir() + "/icons/avro-bangla.png";
    if (GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
        try {
            window.set_icon_from_file(iconPath);
        } catch (e) {}
    } else if (GLib.file_test("/usr/share/pixmaps/avro-bangla.png", GLib.FileTest.EXISTS)) {
        try {
            window.set_icon_from_file("/usr/share/pixmaps/avro-bangla.png");
        } catch (e) {}
    }

    // Connect to GSettings
    let setting = avroSettings();
    if (!setting) {
        print("Warning: GSettings schema com.omicronlab.avro is not installed; settings cannot be saved.");
    }

    let notebook = new Gtk.Notebook();
    notebook.set_border_width(12);

    /* ========================================================================= */
    /* 1. GENERAL TAB                                                            */
    /* ========================================================================= */
    let generalBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18, border_width: 16 });

    // Preview Window Toggle
    let previewBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let previewLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let previewTitle = new Gtk.Label({ label: "<b>Show Preview Window</b>", use_markup: true, xalign: 0 });
    let previewSubtitle = new Gtk.Label({
        label: "Shows the English text you type and the Bangla suggestions next to the cursor",
        xalign: 0
    });
    previewSubtitle.get_style_context().add_class("dim-label");
    previewLabelBox.pack_start(previewTitle, false, false, 0);
    previewLabelBox.pack_start(previewSubtitle, false, false, 0);
    let switchPreview = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    previewBox.pack_start(previewLabelBox, true, true, 0);
    previewBox.pack_end(switchPreview, false, false, 0);
    generalBox.pack_start(previewBox, false, false, 0);

    // Preview window style
    let styleBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let styleLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let styleTitle = new Gtk.Label({ label: "<b>Preview Window Style</b>", use_markup: true, xalign: 0 });
    let styleSubtitle = new Gtk.Label({ label: "Avro's Windows-style window, or your desktop's candidate panel", xalign: 0 });
    styleSubtitle.get_style_context().add_class("dim-label");
    styleLabelBox.pack_start(styleTitle, false, false, 0);
    styleLabelBox.pack_start(styleSubtitle, false, false, 0);
    let cboxStyle = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxStyle.append("auto", "Automatic");
    cboxStyle.append("classic", "Avro (Windows style)");
    cboxStyle.append("system", "Desktop panel (IBus)");
    styleBox.pack_start(styleLabelBox, true, true, 0);
    styleBox.pack_end(cboxStyle, false, false, 0);
    generalBox.pack_start(styleBox, false, false, 0);

    // Preview window theme
    let themeBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let themeLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let themeTitle = new Gtk.Label({ label: "<b>Preview Window Theme</b>", use_markup: true, xalign: 0 });
    let themeSubtitle = new Gtk.Label({ label: "Colours of the Windows-style Preview Window", xalign: 0 });
    themeSubtitle.get_style_context().add_class("dim-label");
    themeLabelBox.pack_start(themeTitle, false, false, 0);
    themeLabelBox.pack_start(themeSubtitle, false, false, 0);
    let cboxTheme = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxTheme.append("classic", "Classic (light)");
    cboxTheme.append("dark", "Dark");
    themeBox.pack_start(themeLabelBox, true, true, 0);
    themeBox.pack_end(cboxTheme, false, false, 0);
    generalBox.pack_start(themeBox, false, false, 0);

    // Orientation selector
    let orientBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let orientLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let orientTitle = new Gtk.Label({ label: "<b>Candidate List Orientation</b>", use_markup: true, xalign: 0 });
    let orientSubtitle = new Gtk.Label({ label: "Direction of the list in the desktop (IBus) candidate panel", xalign: 0 });
    orientSubtitle.get_style_context().add_class("dim-label");
    orientLabelBox.pack_start(orientTitle, false, false, 0);
    orientLabelBox.pack_start(orientSubtitle, false, false, 0);
    let cboxOrient = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxOrient.append_text("Horizontal");
    cboxOrient.append_text("Vertical");
    cboxOrient.set_active(0);
    orientBox.pack_start(orientLabelBox, true, true, 0);
    orientBox.pack_end(cboxOrient, false, false, 0);
    generalBox.pack_start(orientBox, false, false, 0);

    // Desktop Tools Row
    let toolsFrame = new Gtk.Frame({ label: " Avro Desktop Tools " });
    let toolsBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, margin: 10 });
    let btnLaunchTopbar = new Gtk.Button({ label: "Avro TopBar" });
    let btnLaunchPreview = new Gtk.Button({ label: "Preview Demo" });
    let btnLaunchDoctor = new Gtk.Button({ label: "Avro Doctor" });

    btnLaunchTopbar.connect("clicked", () => GLib.spawn_command_line_async("avro-topbar"));
    btnLaunchPreview.connect("clicked", () => {
        let theme = cboxTheme.get_active_id() || "classic";
        GLib.spawn_command_line_async("avro-preview --demo amader --theme " + theme + " --timeout 8");
    });
    btnLaunchDoctor.connect("clicked", () => GLib.spawn_command_line_async("avro-doctor"));

    toolsBox.pack_start(btnLaunchTopbar, true, true, 0);
    toolsBox.pack_start(btnLaunchPreview, true, true, 0);
    toolsBox.pack_start(btnLaunchDoctor, true, true, 0);
    toolsFrame.add(toolsBox);
    generalBox.pack_start(toolsFrame, false, false, 4);

    // Reset settings
    let resetBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12, margin_top: 16 });
    let resetLabel = new Gtk.Label({ label: "Restore all preferences to their factory defaults", xalign: 0 });
    let btnReset = new Gtk.Button({ label: "Reset to Defaults", valign: Gtk.Align.CENTER });
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
            setting.reset("keyboard-layout");
            setting.reset("fixed-typing-style");
            setting.reset("fixed-old-reph");
            setting.reset("fixed-vowel-forming");
            setting.reset("fixed-fix-chandra");
            setting.reset("fixed-numpad-bangla");
            setting.reset("switch-dict");
            setting.reset("switch-newline");
            setting.reset("lutable-size");
            setting.reset("cboxorient");
            setting.reset("mode-bangla");
            readFromSettings();
        }
    });
    resetBox.pack_start(resetLabel, true, true, 0);
    resetBox.pack_end(btnReset, false, false, 0);
    generalBox.pack_start(resetBox, false, false, 0);

    notebook.append_page(generalBox, new Gtk.Label({ label: "General" }));

    /* ========================================================================= */
    /* 2. TYPING TAB                                                             */
    /* ========================================================================= */
    let typingBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18, border_width: 16 });

    // Enter / Return Key behavior
    let newlineBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let newlineLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let newlineTitle = new Gtk.Label({ label: "<b>Insert a Newline after Commit</b>", use_markup: true, xalign: 0 });
    let newlineSubtitle = new Gtk.Label({
        label: "Pressing Enter commits the candidate, then inserts a newline",
        xalign: 0
    });
    newlineSubtitle.get_style_context().add_class("dim-label");
    newlineLabelBox.pack_start(newlineTitle, false, false, 0);
    newlineLabelBox.pack_start(newlineSubtitle, false, false, 0);
    let switchNewline = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    newlineBox.pack_start(newlineLabelBox, true, true, 0);
    newlineBox.pack_end(switchNewline, false, false, 0);
    typingBox.pack_start(newlineBox, false, false, 0);

    // Candidate List Size
    let sizeBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let sizeLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let sizeTitle = new Gtk.Label({ label: "<b>Maximum Suggestions</b>", use_markup: true, xalign: 0 });
    let sizeSubtitle = new Gtk.Label({ label: "Maximum number of candidate words shown in list (5 - 15)", xalign: 0 });
    sizeSubtitle.get_style_context().add_class("dim-label");
    sizeLabelBox.pack_start(sizeTitle, false, false, 0);
    sizeLabelBox.pack_start(sizeSubtitle, false, false, 0);
    let adjSize = new Gtk.Adjustment({ lower: 5, upper: 15, step_increment: 1, page_increment: 2, value: 15 });
    let spinSize = new Gtk.SpinButton({ adjustment: adjSize, climb_rate: 1, digits: 0, valign: Gtk.Align.CENTER });
    sizeBox.pack_start(sizeLabelBox, true, true, 0);
    sizeBox.pack_end(spinSize, false, false, 0);
    typingBox.pack_start(sizeBox, false, false, 0);

    notebook.append_page(typingBox, new Gtk.Label({ label: "Typing" }));

    /* ========================================================================= */
    /* KEYBOARD LAYOUTS TAB (the Avro Keyboard "Fixed Keyboard Layouts" options) */
    /* ========================================================================= */
    let layoutsBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14, border_width: 16 });

    function optionRow(box, title, subtitle, control) {
        let row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
        let labels = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
        labels.pack_start(new Gtk.Label({ label: "<b>" + title + "</b>", use_markup: true, xalign: 0 }), false, false, 0);
        if (subtitle) {
            let sub = new Gtk.Label({ label: subtitle, xalign: 0, wrap: true, max_width_chars: 52 });
            sub.get_style_context().add_class("dim-label");
            labels.pack_start(sub, false, false, 0);
        }
        row.pack_start(labels, true, true, 0);
        row.pack_end(control, false, false, 0);
        box.pack_start(row, false, false, 0);
        return row;
    }

    let cboxLayout = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    for (let [id, name] of keyboardLayoutChoices()) {
        cboxLayout.append(id, name);
    }
    optionRow(layoutsBox, "Keyboard layout",
              "Avro Phonetic, or a fixed layout of Avro Keyboard. F12 switches Bangla and English with all of them.",
              cboxLayout);

    let styleFrame = new Gtk.Frame({ label: " Typing Style in Fixed Keyboard Layouts " });
    let styleBoxFixed = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin: 10 });
    let radioModern = new Gtk.RadioButton({ label: "Use Modern Style Typing" });
    let radioOld = Gtk.RadioButton.new_with_label_from_widget(radioModern, "Use Full Old Style Typing");
    let modernHint = new Gtk.Label({ label: "(Type Kar/Matra/Short Form Of Vowel always AFTER consonants)", xalign: 0, margin_left: 26 });
    let oldHint = new Gtk.Label({ label: "(Use Type writer or old ASCII based typing style)", xalign: 0, margin_left: 26 });
    modernHint.get_style_context().add_class("dim-label");
    oldHint.get_style_context().add_class("dim-label");
    let checkOldReph = new Gtk.CheckButton({ label: "Enable \"Old Style Reph\"", margin_left: 26 });
    let checkVowelForming = new Gtk.CheckButton({ label: "Enable \"Automatic vowel Forming\"", margin_left: 26 });
    let checkFixChandra = new Gtk.CheckButton({ label: "Automatically fix \"Chandra\" position", margin_left: 26 });
    styleBoxFixed.pack_start(radioModern, false, false, 0);
    styleBoxFixed.pack_start(modernHint, false, false, 0);
    styleBoxFixed.pack_start(checkOldReph, false, false, 0);
    styleBoxFixed.pack_start(checkVowelForming, false, false, 0);
    styleBoxFixed.pack_start(checkFixChandra, false, false, 0);
    styleBoxFixed.pack_start(radioOld, false, false, 6);
    styleBoxFixed.pack_start(oldHint, false, false, 0);
    styleFrame.add(styleBoxFixed);
    layoutsBox.pack_start(styleFrame, false, false, 0);

    let switchNumpad = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    optionRow(layoutsBox, "Enable Bangla in Number Pad", "The number pad types Bangla digits in fixed keyboard layouts", switchNumpad);

    let btnShowLayout = new Gtk.Button({ label: "Show keyboard layout", halign: Gtk.Align.START });
    btnShowLayout.connect("clicked", () => GLib.spawn_command_line_async("avro-layout"));
    layoutsBox.pack_start(btnShowLayout, false, false, 0);

    function updateTypingStyle() {
        let modern = radioModern.get_active();
        checkOldReph.set_sensitive(modern);
        checkVowelForming.set_sensitive(modern);
        checkFixChandra.set_sensitive(modern);
    }

    notebook.append_page(layoutsBox, new Gtk.Label({ label: "Keyboard Layouts" }));

    /* ========================================================================= */
    /* TOPBAR TAB (the Avro Keyboard "General" and "Interface" options)          */
    /* ========================================================================= */
    let topbarBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18, border_width: 16 });

    function topbarRow(title, subtitle, control) {
        let row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
        let labels = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
        labels.pack_start(new Gtk.Label({ label: "<b>" + title + "</b>", use_markup: true, xalign: 0 }), false, false, 0);
        if (subtitle) {
            let sub = new Gtk.Label({ label: subtitle, xalign: 0 });
            sub.get_style_context().add_class("dim-label");
            labels.pack_start(sub, false, false, 0);
        }
        row.pack_start(labels, true, true, 0);
        row.pack_end(control, false, false, 0);
        topbarBox.pack_start(row, false, false, 0);
    }

    let cboxSkin = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxSkin.append("classic", "Avro Classic (dark)");
    cboxSkin.append("royal", "Avro Royal Blue");
    cboxSkin.append("mint", "Avro Flat Mint");
    cboxSkin.append("light", "Avro Paper Light");
    topbarRow("Interface Skin", "Look of the Avro TopBar", cboxSkin);

    let switchTransparent = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    topbarRow("Make TopBar semi transparent when it is inactive",
              "Fades after 5 seconds without mouse activity (needs desktop compositing)", switchTransparent);

    let scaleLevel = new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        adjustment: new Gtk.Adjustment({ lower: 0, upper: 255, step_increment: 1, page_increment: 16 }),
        digits: 0, value_pos: Gtk.PositionType.RIGHT, width_request: 200, valign: Gtk.Align.CENTER
    });
    topbarRow("Transparency level (0-255)", "0 = fully transparent, 255 = fully visible", scaleLevel);

    let cboxXButton = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxXButton.append("menu", "Show option for both");
    cboxXButton.append("minimize", "Minimize to the system tray");
    cboxXButton.append("exit", "Close the TopBar");
    topbarRow("When I click the power button on TopBar", "A right click always shows both options", cboxXButton);

    let cboxStartup = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    cboxStartup.append("topbar", "Top Bar (on desktop, as toolbar)");
    cboxStartup.append("tray", "System tray icon");
    cboxStartup.append("last", "UI mode used last time");
    topbarRow("At startup, Avro TopBar will run as", null, cboxStartup);

    let switchAutostart = new Gtk.Switch({ valign: Gtk.Align.CENTER, active: isTopBarAutostart() });
    switchAutostart.connect("notify::active", () => {
        setTopBarAutostart(switchAutostart.get_active());
        // The user's choice: the TopBar never adds itself back
        if (setting && setting.settings_schema.has_key("topbar-autostart-done")) {
            setting.set_boolean("topbar-autostart-done", true);
        }
    });
    topbarRow("Start Avro TopBar when I log in", "Adds the TopBar to your desktop's autostart programs", switchAutostart);

    let btnOpenTopbar = new Gtk.Button({ label: "Open Avro TopBar", halign: Gtk.Align.START });
    btnOpenTopbar.connect("clicked", () => GLib.spawn_command_line_async("avro-topbar restore"));
    topbarBox.pack_start(btnOpenTopbar, false, false, 0);

    notebook.append_page(topbarBox, new Gtk.Label({ label: "TopBar" }));

    /* ========================================================================= */
    /* 3. DICTIONARY & AUTOCORRECT TAB                                           */
    /* ========================================================================= */
    let dictBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18, border_width: 16 });

    // Dictionary Suggestion Toggle
    let dictToggleBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let dictLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let dictTitle = new Gtk.Label({ label: "<b>Dictionary-Assisted Suggestions</b>", use_markup: true, xalign: 0 });
    let dictSubtitle = new Gtk.Label({
        label: "Matches input against Bengali dictionary and grammatical suffix rules",
        xalign: 0
    });
    dictSubtitle.get_style_context().add_class("dim-label");
    dictLabelBox.pack_start(dictTitle, false, false, 0);
    dictLabelBox.pack_start(dictSubtitle, false, false, 0);
    let switchDict = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    dictToggleBox.pack_start(dictLabelBox, true, true, 0);
    dictToggleBox.pack_end(switchDict, false, false, 0);
    dictBox.pack_start(dictToggleBox, false, false, 0);

    // Personal dictionary is deliberately separate from the shipped dictionary.
    // It stays in XDG_CONFIG_HOME and is read by the engine without a restart.
    let personalDict = getUserDictionary();
    let personalBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin_top: 12 });
    let personalTitle = new Gtk.Label({ label: "<b>Personal Dictionary</b>", use_markup: true, xalign: 0 });
    let personalHint = new Gtk.Label({
        label: "Add a phonetic spelling and its Bengali word. Remove uses the same exact pair.",
        xalign: 0
    });
    personalHint.get_style_context().add_class("dim-label");
    let personalRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
    let phoneticEntry = new Gtk.Entry({ placeholder_text: "Phonetic spelling (for example, amarnaam)", hexpand: true });
    let bengaliEntry = new Gtk.Entry({ placeholder_text: "Bengali word", hexpand: true });
    let addWord = new Gtk.Button({ label: "Add" });
    let removeWord = new Gtk.Button({ label: "Remove" });
    let personalStatus = new Gtk.Label({ xalign: 0 });
    personalStatus.get_style_context().add_class("dim-label");
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
    personalBox.pack_start(personalTitle, false, false, 0);
    personalBox.pack_start(personalHint, false, false, 0);
    personalBox.pack_start(personalRow, false, false, 0);
    personalBox.pack_start(personalStatus, false, false, 0);
    dictBox.pack_start(personalBox, false, false, 0);

    // Learned Choices Management
    let learnedBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12, margin_top: 16 });
    let learnedLabelBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let learnedTitle = new Gtk.Label({ label: "<b>Learned Word Selections</b>", use_markup: true, xalign: 0 });
    let learnedSubtitle = new Gtk.Label({
        label: "Avro remembers your preferred candidate choices for ambiguous phonetic inputs",
        xalign: 0
    });
    learnedSubtitle.get_style_context().add_class("dim-label");
    learnedLabelBox.pack_start(learnedTitle, false, false, 0);
    learnedLabelBox.pack_start(learnedSubtitle, false, false, 0);
    let btnClearLearned = new Gtk.Button({ label: "Clear Learned Choices", valign: Gtk.Align.CENTER });
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
    learnedBox.pack_start(learnedLabelBox, true, true, 0);
    learnedBox.pack_end(btnClearLearned, false, false, 0);
    dictBox.pack_start(learnedBox, false, false, 0);

    notebook.append_page(dictBox, new Gtk.Label({ label: "Dictionary" }));

    /* ========================================================================= */
    /* 4. SHORTCUTS TAB                                                          */
    /* ========================================================================= */
    let shortcutsBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, border_width: 16 });
    let shortcutsTitle = new Gtk.Label({ label: "<b>Avro Phonetic Keyboard Shortcuts</b>", use_markup: true, xalign: 0 });
    shortcutsBox.pack_start(shortcutsTitle, false, false, 4);

    let gridShortcuts = new Gtk.Grid({ row_spacing: 10, column_spacing: 16 });
    let shortcutsList = [
        ["F12", "Toggle Bangla/English while Avro is the active IBus engine"],
        ["Space / Tab / Return", "Commit current Bengali candidate"],
        ["Left / Right / Up / Down", "Navigate candidate suggestions"],
        ["Backspace", "Edit preedit buffer (deletes previous character)"],
        ["Escape", "Cancel active preedit and clear suggestion list"],
        ["System input-source shortcut", "Switch between English and Avro; configure this in your desktop settings"],
        ["IBus Menu → Mode", "Toggle between Bangla and English mode directly inside Avro"]
    ];

    for (let i = 0; i < shortcutsList.length; i++) {
        let keyLabel = new Gtk.Label({ label: "<tt><b>" + shortcutsList[i][0] + "</b></tt>", use_markup: true, xalign: 0 });
        let descLabel = new Gtk.Label({ label: shortcutsList[i][1], xalign: 0 });
        gridShortcuts.attach(keyLabel, 0, i, 1, 1);
        gridShortcuts.attach(descLabel, 1, i, 1, 1);
    }
    shortcutsBox.pack_start(gridShortcuts, false, false, 8);

    notebook.append_page(shortcutsBox, new Gtk.Label({ label: "Shortcuts" }));

    /* ========================================================================= */
    /* 5. DIAGNOSTICS TAB (Privacy Preserving)                                   */
    /* ========================================================================= */
    let diagBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, border_width: 16 });
    let diagTitle = new Gtk.Label({ label: "<b>System &amp; Runtime Diagnostics</b>", use_markup: true, xalign: 0 });
    let diagNotice = new Gtk.Label({
        label: "Diagnostics contain technical environment state only. Typed user text is never collected or shown.",
        xalign: 0
    });
    diagNotice.get_style_context().add_class("dim-label");
    diagBox.pack_start(diagTitle, false, false, 0);
    diagBox.pack_start(diagNotice, false, false, 4);

    // Build diagnostic summary text
    let diagText = createDiagnosticReport();

    let diagScrolled = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN, height_request: 140 });
    let diagTextView = new Gtk.TextView({ editable: false, cursor_visible: false, monospace: true, border_width: 8 });
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
    btnDoctor.connect("clicked", () => {
        GLib.spawn_command_line_async("avro-doctor");
    });

    diagActionBox.pack_start(btnCopyDiag, false, false, 0);
    diagActionBox.pack_start(btnDoctor, false, false, 0);
    diagBox.pack_start(diagActionBox, false, false, 0);

    notebook.append_page(diagBox, new Gtk.Label({ label: "Diagnostics" }));

    /* ========================================================================= */
    /* 6. ABOUT TAB                                                              */
    /* ========================================================================= */
    let aboutBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, border_width: 20, halign: Gtk.Align.CENTER });
    
    let appNameLabel = new Gtk.Label({ label: "<big><b>Avro Linux (Remastered Edition)</b></big>", use_markup: true });
    let appVerLabel = new Gtk.Label({ label: "Version " + appVersion() + " — Modern Linux Edition" });
    appVerLabel.get_style_context().add_class("dim-label");
    let appDescLabel = new Gtk.Label({
        label: "Modern Linux implementation of Avro Phonetic Bengali input method\nwith Windows-style floating TopBar, standalone Avro Pad, and Bijoy converter.",
        justify: Gtk.Justification.CENTER
    });

    let creditsLabel = new Gtk.Label({
        label: "<b>Lead Developer & Remaster Maintainer:</b>\n" +
               "• <b>MD Shifat Bin Siddique Urfi</b>\n\n" +
               "<b>Original Authors & Historical Attribution:</b>\n" +
               "• OmicronLab (Dr. Mehdi Hasan Khan & Rifat Nabi)\n" +
               "• Sarim Khan (ibus-avro)\n" +
               "• Debian Maintainers (Gunnar Hjalmarsson, Boyuan Yang)\n" +
               "• Avro Linux Contributors",
        use_markup: true,
        justify: Gtk.Justification.CENTER,
        margin_top: 8
    });

    let licenseLabel = new Gtk.Label({
        label: "Licensed under the Mozilla Public License, v. 2.0 (MPL-2.0)",
        margin_top: 8
    });
    licenseLabel.get_style_context().add_class("dim-label");

    let btnWebsite = new Gtk.LinkButton({
        uri: "https://github.com/avro-linux/avro-linux",
        label: "Visit Project Repository",
        margin_top: 6
    });

    aboutBox.pack_start(appNameLabel, false, false, 0);
    aboutBox.pack_start(appVerLabel, false, false, 0);
    aboutBox.pack_start(appDescLabel, false, false, 4);
    aboutBox.pack_start(creditsLabel, false, false, 4);
    aboutBox.pack_start(licenseLabel, false, false, 0);
    aboutBox.pack_start(btnWebsite, false, false, 0);

    notebook.append_page(aboutBox, new Gtk.Label({ label: "About" }));

    window.add(notebook);

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
        setting.bind("keyboard-layout", cboxLayout, "active-id", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("fixed-old-reph", checkOldReph, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("fixed-vowel-forming", checkVowelForming, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("fixed-fix-chandra", checkFixChandra, "active", Gio.SettingsBindFlags.DEFAULT);
        setting.bind("fixed-numpad-bangla", switchNumpad, "active", Gio.SettingsBindFlags.DEFAULT);
        let readTypingStyle = () => {
            let old = setting.get_string("fixed-typing-style") === "old";
            (old ? radioOld : radioModern).set_active(true);
            updateTypingStyle();
        };
        radioModern.connect("toggled", () => {
            let style = radioModern.get_active() ? "modern" : "old";
            if (setting.get_string("fixed-typing-style") !== style) {
                setting.set_string("fixed-typing-style", style);
            }
            updateTypingStyle();
        });
        setting.connect("changed::fixed-typing-style", readTypingStyle);
        readTypingStyle();
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
