#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Mouse (On-Screen Click & Type Bengali Virtual Keyboard)
    SPDX-License-Identifier: MPL-2.0
    Developer & Maintainer: MD Shifat Bin Siddique Urfi
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;

const MOUSE_CSS = `
* {
    outline: none;
}

.avro-mouse-window {
    background: #141822;
    border: 1px solid rgba(88, 166, 255, 0.25);
    border-radius: 12px;
}

.avro-mouse-header {
    background: linear-gradient(135deg, #1b2838, #0e1726);
    padding: 8px 14px;
    border-bottom: 1px solid rgba(88, 166, 255, 0.2);
    border-radius: 12px 12px 0 0;
}

.avro-mouse-title {
    color: #58a6ff;
    font-size: 15px;
    font-weight: bold;
}

.avro-mouse-subtitle {
    color: #8b9bb4;
    font-size: 11px;
}

.avro-mouse-textview {
    background: #0d1117;
    color: #58a6ff;
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    font-size: 18px;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.avro-key-btn {
    background: #1e2638;
    color: #e6edf3;
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    font-size: 16px;
    font-weight: bold;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 6px 10px;
    min-width: 36px;
    min-height: 36px;
}

.avro-key-btn:hover {
    background: #28354f;
    border-color: #58a6ff;
    color: #58a6ff;
}

.avro-key-btn:active {
    background: #00e5a0;
    color: #0b141a;
}

.avro-vowel-btn {
    background: #182a3d;
    border-color: rgba(88, 166, 255, 0.3);
}

.avro-kar-btn {
    background: #232238;
    color: #d2a8ff;
    border-color: rgba(210, 168, 255, 0.3);
}

.avro-hasanta-btn {
    background: #3e2230;
    color: #ff7b72;
    border-color: rgba(255, 123, 114, 0.4);
    font-size: 18px;
}

.avro-action-btn {
    background: #21262d;
    color: #c9d1d9;
    font-size: 13px;
    font-weight: bold;
    border-radius: 6px;
    padding: 6px 14px;
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.avro-action-btn:hover {
    background: #30363d;
    color: #ffffff;
}

.avro-copy-btn {
    background: linear-gradient(135deg, #1f6feb, #238636);
    color: #ffffff;
    font-weight: bold;
    border: none;
}

.avro-copy-btn:hover {
    background: linear-gradient(135deg, #388bfd, #2ea043);
}

.section-label {
    color: #8b9bb4;
    font-size: 11px;
    font-weight: bold;
    margin-top: 4px;
    margin-bottom: 2px;
}
`;

var runAvroMouse = function runAvroMouse(parentWindow) {
    let cssProvider = new Gtk.CssProvider();
    try {
        cssProvider.load_from_data(MOUSE_CSS);
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            cssProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
    } catch (e) {}

    let win = new Gtk.Window({
        type: Gtk.WindowType.TOPLEVEL,
        title: "Avro Mouse — On-Screen Click & Type",
        default_width: 580,
        default_height: 480,
        transient_for: parentWindow || null,
        window_position: Gtk.WindowPosition.CENTER
    });
    win.get_style_context().add_class("avro-mouse-window");

    let rootBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });

    // 1. Header
    let headerBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
    headerBox.get_style_context().add_class("avro-mouse-header");

    let titleVBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2 });
    let lblTitle = new Gtk.Label({ label: "🖱️ Avro Mouse — On-Screen Keyboard", xalign: 0 });
    lblTitle.get_style_context().add_class("avro-mouse-title");
    let lblSub = new Gtk.Label({ label: "Click any Bengali letter or sign to type • Remastered by MD Shifat Bin Siddique Urfi", xalign: 0 });
    lblSub.get_style_context().add_class("avro-mouse-subtitle");
    titleVBox.pack_start(lblTitle, false, false, 0);
    titleVBox.pack_start(lblSub, false, false, 0);

    headerBox.pack_start(titleVBox, true, true, 0);
    rootBox.pack_start(headerBox, false, false, 0);

    let contentBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin: 12 });

    // 2. Text Input & Preview Area
    let scrolledText = new Gtk.ScrolledWindow({
        min_content_height: 70,
        hexpand: true,
        vexpand: false
    });
    let textView = new Gtk.TextView({
        wrap_mode: Gtk.WrapMode.WORD_CHAR,
        hexpand: true
    });
    textView.get_style_context().add_class("avro-mouse-textview");
    let textBuffer = textView.get_buffer();
    scrolledText.add(textView);
    contentBox.pack_start(scrolledText, false, false, 0);

    // 3. Actions Row (Copy, Space, Backspace, Clear)
    let actionRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });

    let btnCopy = new Gtk.Button({ label: "📋 Copy Text" });
    btnCopy.get_style_context().add_class("avro-copy-btn");
    btnCopy.get_style_context().add_class("avro-action-btn");
    btnCopy.connect("clicked", () => {
        let text = textBuffer.text;
        if (text && text.length > 0) {
            let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
            clipboard.set_text(text, -1);
            btnCopy.set_label("✓ Copied!");
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                btnCopy.set_label("📋 Copy Text");
                return false;
            });
        }
    });

    let btnSpace = new Gtk.Button({ label: "␣ Space" });
    btnSpace.get_style_context().add_class("avro-action-btn");
    btnSpace.connect("clicked", () => {
        textBuffer.insert_at_cursor(" ", 1);
    });

    let btnBackspace = new Gtk.Button({ label: "⌫ Backspace" });
    btnBackspace.get_style_context().add_class("avro-action-btn");
    btnBackspace.connect("clicked", () => {
        let [hasSel, start, end] = textBuffer.get_selection_bounds();
        if (hasSel) {
            textBuffer.delete(start, end);
        } else {
            let mark = textBuffer.get_insert();
            let iter = textBuffer.get_iter_at_mark(mark);
            if (iter.backward_char()) {
                let endIter = textBuffer.get_iter_at_mark(mark);
                textBuffer.delete(iter, endIter);
            }
        }
    });

    let btnClear = new Gtk.Button({ label: "✕ Clear" });
    btnClear.get_style_context().add_class("avro-action-btn");
    btnClear.connect("clicked", () => {
        textBuffer.set_text("", 0);
    });

    actionRow.pack_start(btnCopy, false, false, 0);
    actionRow.pack_start(btnSpace, false, false, 0);
    actionRow.pack_start(btnBackspace, false, false, 0);
    actionRow.pack_end(btnClear, false, false, 0);
    contentBox.pack_start(actionRow, false, false, 0);

    // Helper to append a char button
    function makeKey(char, extraClass) {
        let b = new Gtk.Button({ label: char });
        b.set_can_focus(false);
        b.set_focus_on_click(false);
        b.get_style_context().add_class("avro-key-btn");
        if (extraClass) b.get_style_context().add_class(extraClass);
        b.connect("clicked", () => {
            textBuffer.insert_at_cursor(char, -1);
        });
        return b;
    }

    // 4. Vowels (স্বরবর্ণ)
    let lblVowels = new Gtk.Label({ label: "স্বরবর্ণ (Vowels):", xalign: 0 });
    lblVowels.get_style_context().add_class("section-label");
    contentBox.pack_start(lblVowels, false, false, 0);

    let vowelsGrid = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
    const VOWELS = ["অ", "আ", "ই", "ঈ", "উ", "ঊ", "ঋ", "এ", "ঐ", "ও", "ঔ"];
    VOWELS.forEach(v => vowelsGrid.pack_start(makeKey(v, "avro-vowel-btn"), false, false, 0));
    contentBox.pack_start(vowelsGrid, false, false, 0);

    // 5. Kar Signs (কার ও যুক্তচিহ্ন)
    let lblKars = new Gtk.Label({ label: "কার ও হসন্ত (Vowel Signs & Conjunct Builder):", xalign: 0 });
    lblKars.get_style_context().add_class("section-label");
    contentBox.pack_start(lblKars, false, false, 0);

    let karsGrid = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
    const KARS = ["া", "ি", "ী", "ু", "ূ", "ৃ", "ে", "ৈ", "ো", "ৌ"];
    KARS.forEach(k => karsGrid.pack_start(makeKey(k, "avro-kar-btn"), false, false, 0));
    // Hasanta for conjuncts
    let btnHasanta = makeKey("্", "avro-hasanta-btn");
    btnHasanta.set_tooltip_text("হসন্ত (্) — click between two consonants to form conjuncts (যেমন: ক + ্ + ষ = ক্ষ)");
    karsGrid.pack_start(btnHasanta, false, false, 0);
    // Dari
    let btnDari = makeKey("।", "avro-kar-btn");
    karsGrid.pack_start(btnDari, false, false, 0);

    contentBox.pack_start(karsGrid, false, false, 0);

    // 6. Consonants (ব্যঞ্জনবর্ণ)
    let lblCons = new Gtk.Label({ label: "ব্যঞ্জনবর্ণ (Consonants):", xalign: 0 });
    lblCons.get_style_context().add_class("section-label");
    contentBox.pack_start(lblCons, false, false, 0);

    const CONSONANT_ROWS = [
        ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ", "ঝ", "ঞ"],
        ["ট", "ঠ", "ড", "ঢ", "ণ", "ত", "থ", "দ", "ধ", "ন"],
        ["প", "ফ", "ব", "ভ", "ম", "য", "র", "ল", "শ", "ষ"],
        ["স", "হ", "ড়", "ঢ়", "য়", "ৎ", "ং", "ঃ", "ঁ"]
    ];

    CONSONANT_ROWS.forEach(rowList => {
        let rowBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
        rowList.forEach(c => rowBox.pack_start(makeKey(c, null), false, false, 0));
        contentBox.pack_start(rowBox, false, false, 0);
    });

    // 7. Digits (সংখ্যা)
    let lblDigits = new Gtk.Label({ label: "সংখ্যা (Bengali Numerals):", xalign: 0 });
    lblDigits.get_style_context().add_class("section-label");
    contentBox.pack_start(lblDigits, false, false, 0);

    let digitsBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
    const DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    DIGITS.forEach(d => digitsBox.pack_start(makeKey(d, null), false, false, 0));
    contentBox.pack_start(digitsBox, false, false, 0);

    rootBox.pack_start(contentBox, true, true, 0);
    win.add(rootBox);

    win.show_all();
    return win;
};

// Standalone execution check
let _isMain = false;
try {
    let prog = imports.system.programInvocationName || "";
    if (prog.indexOf("avromouse") !== -1 || prog.indexOf("avro-mouse") !== -1) {
        _isMain = true;
    }
    if (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1) {
        _isMain = true;
    }
} catch (e) {}

if (_isMain) {
    Gtk.init(null);
    let w = runAvroMouse();
    w.connect("destroy", () => Gtk.main_quit());
    Gtk.main();
}
