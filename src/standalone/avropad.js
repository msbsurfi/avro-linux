#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Pad (Standalone Bengali Text Editor)
    SPDX-License-Identifier: MPL-2.0
    Developer & Maintainer: MD Shifat Bin Siddique Urfi
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
    let scriptPath = (typeof ARGV !== 'undefined' && ARGV[0]) ? ARGV[0] : '.';
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
        title: "Avro Pad — Bengali Text Editor (Remastered)",
        default_width: 860,
        default_height: 600,
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
    let inlineBengali = "";
    let fontSize = 16;
    let candidates = [];
    let selectedCandidateIdx = 0;

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });

    /* ========================================================================= */
    /* TOOLBAR                                                                   */
    /* ========================================================================= */
    let toolbar = new Gtk.Toolbar();
    toolbar.get_style_context().add_class("primary-toolbar");

    // Mode Toggle Button [F12]
    let btnMode = new Gtk.ToolButton();
    function updateModeButtonUI() {
        if (isBangla) {
            btnMode.set_label("বাংলা [F12]");
            btnMode.set_tooltip_text("Current Mode: বাংলা (Press F12 to switch to English)");
        } else {
            btnMode.set_label("English [F12]");
            btnMode.set_tooltip_text("Current Mode: English (Press F12 to switch to বাংলা)");
        }
    }
    updateModeButtonUI();
    btnMode.connect("clicked", () => {
        isBangla = !isBangla;
        commitInlineComposition();
        updateModeButtonUI();
    });
    toolbar.insert(btnMode, -1);

    toolbar.insert(new Gtk.SeparatorToolItem(), -1);

    // Copy Button
    let btnCopy = new Gtk.ToolButton({ icon_name: "edit-copy", label: "Copy Text" });
    btnCopy.set_is_important(true);
    btnCopy.set_tooltip_text("Copy entire document to clipboard");
    toolbar.insert(btnCopy, -1);

    // Bijoy Converter Button
    let btnBijoy = new Gtk.ToolButton({ icon_name: "document-properties", label: "Convert to Bijoy" });
    btnBijoy.set_tooltip_text("Open Unicode <-> Bijoy (SutonnyMJ) Text Converter");
    btnBijoy.connect("clicked", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog) {
            BijoyConverter.runConverterDialog(window);
        }
    });
    toolbar.insert(btnBijoy, -1);

    // Layout Guide Button
    let btnLayout = new Gtk.ToolButton({ icon_name: "help-browser", label: "Layout Viewer" });
    btnLayout.set_tooltip_text("Open visual Avro Phonetic keyboard layout viewer");
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

    // About Button
    let btnAbout = new Gtk.ToolButton({ icon_name: "help-about", label: "About" });
    btnAbout.set_tooltip_text("About Avro Pad Remastered");
    btnAbout.connect("clicked", () => {
        let dialog = new Gtk.AboutDialog({
            transient_for: window,
            modal: true,
            program_name: "Avro Pad (Remastered Edition)",
            version: "1.0.0",
            comments: "Full-featured standalone Bengali notepad with live phonetic typing.\n\nRemastered for Linux by MD Shifat Bin Siddique Urfi.",
            website: "https://github.com/avro-linux/avro-linux",
            authors: ["MD Shifat Bin Siddique Urfi (Remaster Developer)", "OmicronLab / Dr. Mehdi Hasan Khan"],
            license_type: Gtk.License.MPL_2_0
        });
        dialog.run();
        dialog.destroy();
    });
    toolbar.insert(btnAbout, -1);

    mainBox.pack_start(toolbar, false, false, 0);

    /* ========================================================================= */
    /* SUGGESTION / CANDIDATE BAR                                                */
    /* ========================================================================= */
    let candBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, border_width: 6 });
    let candLabel = new Gtk.Label({ label: "<b>Suggestions:</b>", use_markup: true });
    let candListLabel = new Gtk.Label({ label: "Type phonetically in Latin characters (e.g. 'ami banglay gan gai')", xalign: 0 });
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
        left_margin: 18,
        right_margin: 18,
        top_margin: 18,
        bottom_margin: 18
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
    let statusLeft = new Gtk.Label({ label: "Ready | Avro Phonetic Engine Active (Remastered by MD Shifat Bin Siddique Urfi)", xalign: 0 });
    statusLeft.get_style_context().add_class("dim-label");
    let statusRight = new Gtk.Label({ label: "Press F12 to toggle Bangla / English", xalign: 1 });
    statusRight.get_style_context().add_class("dim-label");
    statusBar.pack_start(statusLeft, true, true, 4);
    statusBar.pack_end(statusRight, false, false, 4);
    mainBox.pack_start(statusBar, false, false, 0);

    /* ========================================================================= */
    /* LIVE INLINE PHONETIC COMPOSITION LOGIC                                    */
    /* ========================================================================= */
    function computeCandidates() {
        if (!currentBuffer) {
            candidates = [];
            candListLabel.set_text("Type phonetically in Latin characters (e.g. 'ami banglay gan gai')");
            candListLabel.get_style_context().add_class("dim-label");
            return;
        }

        candidates = [];
        if (sBuilder && typeof sBuilder.build === 'function') {
            try {
                let res = sBuilder.build(currentBuffer);
                if (res && res.words && res.words.length > 0) {
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

    function updateInlineText() {
        computeCandidates();
        let newBengali = (candidates.length > 0) ? candidates[selectedCandidateIdx] : Avro.parse(currentBuffer);

        // Replace previous inline composition at cursor
        if (inlineBengali.length > 0) {
            let insertMark = textBuffer.get_insert();
            let endIter = textBuffer.get_iter_at_mark(insertMark);
            let startIter = endIter.copy();
            startIter.backward_chars(inlineBengali.length);
            textBuffer.delete(startIter, endIter);
        }

        if (newBengali && currentBuffer.length > 0) {
            textBuffer.insert_at_cursor(newBengali, -1);
            inlineBengali = newBengali;
        } else {
            inlineBengali = "";
        }
    }

    function commitInlineComposition() {
        currentBuffer = "";
        inlineBengali = "";
        candidates = [];
        selectedCandidateIdx = 0;
        candListLabel.set_text("Type phonetically in Latin characters (e.g. 'ami banglay gan gai')");
        candListLabel.get_style_context().add_class("dim-label");
    }

    textView.connect("key-press-event", (widget, event) => {
        let [, keyval] = event.get_keyval();
        let state = event.get_state()[1];

        // Check for F12 (Toggle mode)
        if (keyval === Gdk.KEY_F12) {
            isBangla = !isBangla;
            commitInlineComposition();
            updateModeButtonUI();
            return true;
        }

        // If in English mode, standard text editor typing
        if (!isBangla) {
            return false;
        }

        // Ignore Ctrl, Alt, Super shortcuts (allow Ctrl+C, Ctrl+V, Ctrl+Z, etc.)
        if ((state & (Gdk.ModifierType.CONTROL_MASK | Gdk.ModifierType.MOD1_MASK | Gdk.ModifierType.SUPER_MASK)) !== 0) {
            if (currentBuffer) {
                commitInlineComposition();
            }
            return false;
        }

        // Handle Escape: cancel current composition
        if (keyval === Gdk.KEY_Escape) {
            if (currentBuffer) {
                // Delete inline text and reset
                if (inlineBengali.length > 0) {
                    let insertMark = textBuffer.get_insert();
                    let endIter = textBuffer.get_iter_at_mark(insertMark);
                    let startIter = endIter.copy();
                    startIter.backward_chars(inlineBengali.length);
                    textBuffer.delete(startIter, endIter);
                }
                commitInlineComposition();
                return true;
            }
            return false;
        }

        // Handle Backspace
        if (keyval === Gdk.KEY_BackSpace) {
            if (currentBuffer.length > 0) {
                currentBuffer = currentBuffer.slice(0, -1);
                updateInlineText();
                return true;
            }
            return false;
        }

        // Handle Number selection keys 1..9 if candidate list active
        if (currentBuffer && keyval >= Gdk.KEY_1 && keyval <= Gdk.KEY_9) {
            let idx = keyval - Gdk.KEY_1;
            if (idx < candidates.length) {
                selectedCandidateIdx = idx;
                updateInlineText();
                // Commit chosen word and insert space
                commitInlineComposition();
                textBuffer.insert_at_cursor(" ", -1);
                return true;
            }
        }

        // Handle Space
        if (keyval === Gdk.KEY_space) {
            if (currentBuffer) {
                commitInlineComposition();
                textBuffer.insert_at_cursor(" ", -1);
                return true;
            }
            return false;
        }

        // Handle Return / Enter
        if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
            if (currentBuffer) {
                commitInlineComposition();
                textBuffer.insert_at_cursor("\n", -1);
                return true;
            }
            return false;
        }

        // Handle Punctuation (Dari '।')
        if (keyval === Gdk.KEY_period) {
            if (currentBuffer) {
                commitInlineComposition();
            }
            textBuffer.insert_at_cursor("।", -1);
            return true;
        }

        // Handle printable Latin characters for phonetic typing
        let unicodeChar = Gdk.keyval_to_unicode(keyval);
        if (unicodeChar > 0) {
            let charStr = String.fromCharCode(unicodeChar);
            if (/[A-Za-z0-9`~@#\$%\^&*\-_=+;:'",<>\/?]/.test(charStr)) {
                currentBuffer += charStr;
                updateInlineText();
                return true;
            } else {
                if (currentBuffer) {
                    commitInlineComposition();
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
            statusLeft.set_text("Ready | Avro Phonetic Engine Active (Remastered by MD Shifat Bin Siddique Urfi)");
            return GLib.SOURCE_REMOVE;
        });
    });

    btnClear.connect("clicked", () => {
        textBuffer.set_text("", 0);
        commitInlineComposition();
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
