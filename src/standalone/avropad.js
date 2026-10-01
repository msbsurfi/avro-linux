#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Pad (Standalone Bengali Text Editor)
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

imports.searchPath.unshift(baseDir + '/avro-core/phonetic');
imports.searchPath.unshift(baseDir + '/avro-core/dictionary');
imports.searchPath.unshift(baseDir + '/avro-core/autocorrect');
imports.searchPath.unshift(baseDir + '/avro-core/suggestions');
imports.searchPath.unshift(baseDir + '/standalone');
imports.searchPath.unshift(baseDir + '/src/standalone');
imports.searchPath.unshift('./src/standalone');
imports.searchPath.unshift('./src/avro-core/phonetic');
imports.searchPath.unshift('./src/avro-core/dictionary');
imports.searchPath.unshift('./src/avro-core/autocorrect');
imports.searchPath.unshift('./src/avro-core/suggestions');

const Avro = imports.avrolib;
let SuggestionBuilder = null;
try {
    SuggestionBuilder = imports.suggestionbuilder;
} catch (e) {}

let BijoyConverter = null;
try {
    BijoyConverter = imports.bijoyconverter;
} catch (e) {}

let LayoutViewer = null;
try {
    LayoutViewer = imports.layoutviewer;
} catch (e) {}

function runAvroPad(initialText) {
    let window = new Gtk.Window({
        title: "Avro Pad — Bengali Text Editor",
        default_width: 820,
        default_height: 580,
        window_position: Gtk.WindowPosition.CENTER
    });

    let sBuilder = null;
    if (SuggestionBuilder && SuggestionBuilder.SuggestionBuilder) {
        try {
            sBuilder = new SuggestionBuilder.SuggestionBuilder();
        } catch (e) {}
    }

    let isBangla = true;
    let currentBuffer = "";
    let fontSize = 15;
    let candidates = [];
    let selectedCandidateIdx = 0;

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });

    /* ========================================================================= */
    /* TOOLBAR                                                                   */
    /* ========================================================================= */
    let toolbar = new Gtk.Toolbar();
    toolbar.get_style_context().add_class("primary-toolbar");

    // Mode Toggle Button
    let btnMode = new Gtk.ToolButton();
    function updateModeButtonUI() {
        if (isBangla) {
            btnMode.set_label("বাংলা (F12)");
            btnMode.set_tooltip_text("Current Mode: Bangla (Press F12 to switch to English)");
        } else {
            btnMode.set_label("English (F12)");
            btnMode.set_tooltip_text("Current Mode: English (Press F12 to switch to Bangla)");
        }
    }
    updateModeButtonUI();
    btnMode.connect("clicked", () => {
        isBangla = !isBangla;
        commitActiveBuffer();
        updateModeButtonUI();
    });
    toolbar.insert(btnMode, -1);

    toolbar.insert(new Gtk.SeparatorToolItem(), -1);

    // Copy Button
    let btnCopy = new Gtk.ToolButton({ icon_name: "edit-copy", label: "Copy Text" });
    btnCopy.set_is_important(true);
    btnCopy.set_tooltip_text("Copy all text to clipboard");
    toolbar.insert(btnCopy, -1);

    // Bijoy Converter Button
    let btnBijoy = new Gtk.ToolButton({ icon_name: "document-properties", label: "Convert to Bijoy" });
    btnBijoy.set_tooltip_text("Open Unicode to Bijoy (SutonnyMJ) Converter");
    btnBijoy.connect("clicked", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog) {
            BijoyConverter.runConverterDialog(window);
        }
    });
    toolbar.insert(btnBijoy, -1);

    // Layout Guide Button
    let btnLayout = new Gtk.ToolButton({ icon_name: "help-browser", label: "Keyboard Layout" });
    btnLayout.set_tooltip_text("Open visual Avro Phonetic layout and rules guide");
    btnLayout.connect("clicked", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog) {
            LayoutViewer.runLayoutViewerDialog(window);
        }
    });
    toolbar.insert(btnLayout, -1);

    toolbar.insert(new Gtk.SeparatorToolItem(), -1);

    // Font size controls
    let btnZoomIn = new Gtk.ToolButton({ icon_name: "zoom-in", label: "A+" });
    let btnZoomOut = new Gtk.ToolButton({ icon_name: "zoom-out", label: "A-" });
    toolbar.insert(btnZoomIn, -1);
    toolbar.insert(btnZoomOut, -1);

    toolbar.insert(new Gtk.SeparatorToolItem(), -1);

    // Clear Button
    let btnClear = new Gtk.ToolButton({ icon_name: "edit-clear", label: "Clear" });
    btnClear.set_tooltip_text("Clear document");
    toolbar.insert(btnClear, -1);

    mainBox.pack_start(toolbar, false, false, 0);

    /* ========================================================================= */
    /* SUGGESTION / CANDIDATE BAR                                                */
    /* ========================================================================= */
    let candBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, border_width: 6 });
    let candLabel = new Gtk.Label({ label: "<b>Suggestions:</b>", use_markup: true });
    let candListLabel = new Gtk.Label({ label: "Type phonetically in Latin characters (e.g. 'amader bangla')", xalign: 0 });
    candListLabel.get_style_context().add_class("dim-label");
    candBox.pack_start(candLabel, false, false, 4);
    candBox.pack_start(candListLabel, true, true, 4);
    mainBox.pack_start(candBox, false, false, 0);

    /* ========================================================================= */
    /* TEXT EDITOR AREA                                                          */
    /* ========================================================================= */
    let scrolled = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN, hexpand: true, vexpand: true });
    let textView = new Gtk.TextView({
        wrap_mode: Gtk.WrapMode.WORD,
        left_margin: 16,
        right_margin: 16,
        top_margin: 16,
        bottom_margin: 16
    });

    let cssProvider = new Gtk.CssProvider();
    function updateFontCss() {
        let css = "textview text { font-size: " + fontSize + "pt; font-family: 'Noto Sans Bengali', 'Kalpurush', 'Siyam Rupali', 'SolaimanLipi', sans-serif; }";
        try {
            cssProvider.load_from_data(css);
            textView.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        } catch (e) {}
    }
    updateFontCss();

    btnZoomIn.connect("clicked", () => {
        if (fontSize < 36) {
            fontSize += 2;
            updateFontCss();
        }
    });

    btnZoomOut.connect("clicked", () => {
        if (fontSize > 10) {
            fontSize -= 2;
            updateFontCss();
        }
    });

    let textBuffer = textView.get_buffer();
    if (initialText) {
        textBuffer.set_text(initialText, -1);
    }

    scrolled.add(textView);
    mainBox.pack_start(scrolled, true, true, 0);

    /* ========================================================================= */
    /* STATUS BAR                                                                */
    /* ========================================================================= */
    let statusBar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12, border_width: 6 });
    let statusLeft = new Gtk.Label({ label: "Ready | Avro Phonetic Engine Active", xalign: 0 });
    statusLeft.get_style_context().add_class("dim-label");
    let statusRight = new Gtk.Label({ label: "Press F12 to switch Bangla / English", xalign: 1 });
    statusRight.get_style_context().add_class("dim-label");
    statusBar.pack_start(statusLeft, true, true, 4);
    statusBar.pack_end(statusRight, false, false, 4);
    mainBox.pack_start(statusBar, false, false, 0);

    /* ========================================================================= */
    /* EDITING & PHONETIC TRANSLITERATION LOGIC                                  */
    /* ========================================================================= */
    function commitText(str) {
        textBuffer.insert_at_cursor(str, -1);
    }

    function updateCandidates() {
        if (!currentBuffer) {
            candListLabel.set_text("Type phonetically in Latin characters (e.g. 'amader bangla')");
            candListLabel.get_style_context().add_class("dim-label");
            candidates = [];
            return;
        }

        candidates = [];
        if (sBuilder && typeof sBuilder.build === 'function') {
            try {
                let res = sBuilder.build(currentBuffer);
                if (res && res.words) {
                    candidates = res.words;
                }
            } catch (e) {}
        }

        if (candidates.length === 0) {
            candidates = [Avro.parse(currentBuffer)];
        }

        selectedCandidateIdx = 0;

        let display = "";
        for (let i = 0; i < Math.min(candidates.length, 7); i++) {
            let num = i + 1;
            if (i === selectedCandidateIdx) {
                display += "<b>[" + num + ". " + candidates[i] + "]</b>   ";
            } else {
                display += num + ". " + candidates[i] + "   ";
            }
        }
        candListLabel.set_markup(display);
    }

    function commitActiveBuffer() {
        if (!currentBuffer) return;
        let wordToCommit = candidates.length > 0 ? candidates[selectedCandidateIdx] : Avro.parse(currentBuffer);
        commitText(wordToCommit);
        currentBuffer = "";
        updateCandidates();
    }

    textView.connect("key-press-event", (widget, event) => {
        let [, keyval] = event.get_keyval();
        let state = event.get_state()[1];

        // Check for F12 (Toggle mode)
        if (keyval === Gdk.KEY_F12) {
            isBangla = !isBangla;
            commitActiveBuffer();
            updateModeButtonUI();
            return true;
        }

        // If in English mode, standard text editor behavior
        if (!isBangla) {
            return false;
        }

        // Ignore Ctrl, Alt, Super key combinations (allow shortcuts like Ctrl+C, Ctrl+V, Ctrl+Z)
        if ((state & (Gdk.ModifierType.CONTROL_MASK | Gdk.ModifierType.MOD1_MASK | Gdk.ModifierType.SUPER_MASK)) !== 0) {
            if (currentBuffer) {
                commitActiveBuffer();
            }
            return false;
        }

        // Handle Escape: cancel current phonetic buffer
        if (keyval === Gdk.KEY_Escape) {
            if (currentBuffer) {
                currentBuffer = "";
                updateCandidates();
                return true;
            }
            return false;
        }

        // Handle Backspace
        if (keyval === Gdk.KEY_BackSpace) {
            if (currentBuffer.length > 0) {
                currentBuffer = currentBuffer.slice(0, -1);
                updateCandidates();
                return true;
            }
            return false;
        }

        // Handle Number selection keys 1..9 if buffer active
        if (currentBuffer && keyval >= Gdk.KEY_1 && keyval <= Gdk.KEY_9) {
            let idx = keyval - Gdk.KEY_1;
            if (idx < candidates.length) {
                commitText(candidates[idx] + " ");
                currentBuffer = "";
                updateCandidates();
                return true;
            }
        }

        // Handle Space
        if (keyval === Gdk.KEY_space) {
            if (currentBuffer) {
                let chosen = candidates.length > 0 ? candidates[selectedCandidateIdx] : Avro.parse(currentBuffer);
                commitText(chosen + " ");
                currentBuffer = "";
                updateCandidates();
                return true;
            }
            return false;
        }

        // Handle Return / Enter
        if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
            if (currentBuffer) {
                let chosen = candidates.length > 0 ? candidates[selectedCandidateIdx] : Avro.parse(currentBuffer);
                commitText(chosen + "\n");
                currentBuffer = "";
                updateCandidates();
                return true;
            }
            return false;
        }

        // Handle Punctuation
        if (keyval === Gdk.KEY_period) {
            if (currentBuffer) {
                commitActiveBuffer();
            }
            commitText("।");
            return true;
        }

        // Handle printable Latin characters
        let unicodeChar = Gdk.keyval_to_unicode(keyval);
        if (unicodeChar > 0) {
            let charStr = String.fromCharCode(unicodeChar);
            if (/[A-Za-z0-9`~@#\$%\^&*\-_=+;:'",<>\/?]/.test(charStr)) {
                currentBuffer += charStr;
                updateCandidates();
                return true;
            } else {
                if (currentBuffer) {
                    commitActiveBuffer();
                }
            }
        }

        return false;
    });

    btnCopy.connect("clicked", () => {
        let start = textBuffer.get_start_iter();
        let end = textBuffer.get_end_iter();
        let text = textBuffer.get_text(start, end, false);
        let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
        clipboard.set_text(text, -1);
        statusLeft.set_text("Text successfully copied to clipboard!");
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            statusLeft.set_text("Ready | Avro Phonetic Engine Active");
            return GLib.SOURCE_REMOVE;
        });
    });

    btnClear.connect("clicked", () => {
        textBuffer.set_text("", 0);
        currentBuffer = "";
        updateCandidates();
    });

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
    if (scriptPath.indexOf('avropad.js') !== -1) {
        isMain = true;
    }
} catch (e) {}

if (isMain) {
    Gtk.init(null);
    runAvroPad(null);
}
