#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Mouse (On-Screen Click & Type Bengali Virtual Keyboard)
    SPDX-License-Identifier: MPL-2.0
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET)
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;

const MOUSE_CSS = (p) => `
.avro-win .avro-mouse-label {
    color: ${p.subtext}; font-size: 9pt; font-weight: 600; margin-top: 6px;
}
.avro-win button.avro-key label {
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    font-size: 15pt; font-weight: 600;
}
.avro-win button.avro-key { min-width: 40px; min-height: 38px; padding: 2px 4px; }
.avro-win .avro-mouse-text, .avro-win .avro-mouse-text text {
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    font-size: 17pt;
}
`;

/* Locate and load the shared modern theme */
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

var runAvroMouse = function runAvroMouse(parentWindow) {
    // Only the first part of a program names it (the TopBar opens this too)
    if (!globalThis.__avroAppIdentity) {
        globalThis.__avroAppIdentity = true;
        try {
            GLib.set_prgname("avro-mouse");
            GLib.set_application_name("Avro Mouse");
        } catch (e) {}
    }

    let pal = Theme.apply();
    try {
        let mouseProvider = new Gtk.CssProvider();
        mouseProvider.load_from_data(MOUSE_CSS(pal));
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            mouseProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_USER
        );
    } catch (e) {}

    let win = new Gtk.Window({
        type: Gtk.WindowType.TOPLEVEL,
        title: "Avro Mouse — On-Screen Click & Type",
        default_width: 700,
        default_height: 640,
        transient_for: parentWindow || null,
        window_position: Gtk.WindowPosition.CENTER
    });
    win.set_icon_name("avro-mouse");
    try { win.set_wmclass("avro-mouse", "AvroMouse"); } catch (e) {}
    try { Gtk.Window.set_default_icon_name("avro-mouse"); } catch (e) {}
    Theme.styleWindow(win);
    win.set_titlebar(Theme.headerBar({
        icon: "avro-mouse",
        title: "Avro Mouse",
        subtitle: "Click any Bengali letter or sign to type"
    }));

    let rootBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
    let contentBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, margin: 16 });

    // 1. Text Input & Preview Area
    let scrolledText = new Gtk.ScrolledWindow({
        min_content_height: 96,
        hexpand: true,
        vexpand: false
    });
    scrolledText.get_style_context().add_class("avro-framed");
    let textView = new Gtk.TextView({
        wrap_mode: Gtk.WrapMode.WORD_CHAR,
        hexpand: true,
        left_margin: 12, right_margin: 12, top_margin: 10, bottom_margin: 10
    });
    textView.get_style_context().add_class("avro-mouse-text");
    let textBuffer = textView.get_buffer();
    scrolledText.add(textView);
    contentBox.pack_start(scrolledText, false, false, 0);

    // 2. Actions Row (Copy, Space, Backspace, Clear)
    let actionRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });

    function actionButton(icon, text) {
        let b = new Gtk.Button();
        let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
        box.pack_start(Gtk.Image.new_from_icon_name(icon, Gtk.IconSize.BUTTON), false, false, 0);
        let lbl = new Gtk.Label({ label: text });
        box.pack_start(lbl, false, false, 0);
        b.add(box);
        b._label = lbl;
        return b;
    }

    let btnCopy = actionButton("avro-copy-symbolic", "Copy Text");
    btnCopy.get_style_context().add_class("suggested-action");
    btnCopy.connect("clicked", () => {
        let text = textBuffer.text;
        if (text && text.length > 0) {
            let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
            clipboard.set_text(text, -1);
            btnCopy._label.set_label("Copied!");
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                btnCopy._label.set_label("Copy Text");
                return false;
            });
        }
    });

    let btnSpace = actionButton("avro-space-symbolic", "Space");
    btnSpace.connect("clicked", () => {
        textBuffer.insert_at_cursor(" ", 1);
    });

    let btnBackspace = actionButton("avro-backspace-symbolic", "Backspace");
    btnBackspace.connect("clicked", () => {
        let [hasSel, start, end] = textBuffer.get_selection_bounds();
        if (hasSel) {
            textBuffer.delete(start, end);
        } else {
            let mark = textBuffer.get_insert();
            let iter = textBuffer.get_iter_at_mark(mark);
            if (iter.backward_char()) {
                // A nukta (়) belongs to the letter before it: ড + ় is ড়
                if (iter.get_char() === "\u09BC") iter.backward_char();
                let endIter = textBuffer.get_iter_at_mark(mark);
                textBuffer.delete(iter, endIter);
            }
        }
    });

    let btnClear = actionButton("avro-clear-symbolic", "Clear");
    btnClear.get_style_context().add_class("destructive-action");
    btnClear.connect("clicked", () => {
        textBuffer.set_text("", 0);
    });

    actionRow.pack_start(btnCopy, false, false, 0);
    actionRow.pack_start(btnSpace, false, false, 0);
    actionRow.pack_start(btnBackspace, false, false, 0);
    actionRow.pack_end(btnClear, false, false, 0);
    contentBox.pack_start(actionRow, false, false, 0);

    // Keyboard card
    let keyCard = Theme.card(0);
    let keyBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin: 16, halign: Gtk.Align.CENTER });
    keyCard.pack_start(keyBox, true, true, 0);

    // Helper to append a char button
    function makeKey(char, extraClass) {
        let b = new Gtk.Button({ label: char });
        b.set_can_focus(false);
        b.set_focus_on_click(false);
        b.get_style_context().add_class("avro-key");
        if (extraClass) b.get_style_context().add_class(extraClass);
        b.connect("clicked", () => {
            textBuffer.insert_at_cursor(char, -1);
        });
        return b;
    }

    function keyRow(list, cls) {
        let row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 5, halign: Gtk.Align.START });
        list.forEach(c => row.pack_start(makeKey(c, cls), false, false, 0));
        return row;
    }

    function sectionLabel(text) {
        let l = new Gtk.Label({ label: text, xalign: 0 });
        l.get_style_context().add_class("avro-mouse-label");
        keyBox.pack_start(l, false, false, 0);
    }

    // 3. Vowels (স্বরবর্ণ)
    sectionLabel("স্বরবর্ণ (Vowels)");
    const VOWELS = ["অ", "আ", "ই", "ঈ", "উ", "ঊ", "ঋ", "এ", "ঐ", "ও", "ঔ"];
    keyBox.pack_start(keyRow(VOWELS, "avro-key-vowel"), false, false, 0);

    // 4. Kar Signs (কার ও যুক্তচিহ্ন)
    sectionLabel("কার ও হসন্ত (Vowel Signs & Conjunct Builder)");
    const KARS = ["া", "ি", "ী", "ু", "ূ", "ৃ", "ে", "ৈ", "ো", "ৌ"];
    let karsRow = keyRow(KARS, "avro-key-kar");
    // Hasanta for conjuncts
    let btnHasanta = makeKey("্", "avro-key-special");
    btnHasanta.set_tooltip_text("হসন্ত (্) — click between two consonants to form conjuncts (যেমন: ক + ্ + ষ = ক্ষ)");
    karsRow.pack_start(btnHasanta, false, false, 0);
    // Dari
    karsRow.pack_start(makeKey("।", "avro-key-special"), false, false, 0);
    keyBox.pack_start(karsRow, false, false, 0);

    // 5. Consonants (ব্যঞ্জনবর্ণ)
    sectionLabel("ব্যঞ্জনবর্ণ (Consonants)");
    const CONSONANT_ROWS = [
        ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ", "ঝ", "ঞ"],
        ["ট", "ঠ", "ড", "ঢ", "ণ", "ত", "থ", "দ", "ধ", "ন"],
        ["প", "ফ", "ব", "ভ", "ম", "য", "র", "ল", "শ", "ষ"],
        ["স", "হ", "\u09DC", "\u09DD", "\u09DF", "ৎ", "ং", "ঃ", "ঁ"]
    ];
    CONSONANT_ROWS.forEach(rowList => keyBox.pack_start(keyRow(rowList, null), false, false, 0));

    // 6. Digits (সংখ্যা)
    sectionLabel("সংখ্যা (Bengali Numerals)");
    const DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    keyBox.pack_start(keyRow(DIGITS, null), false, false, 0);

    contentBox.pack_start(keyCard, true, true, 0);
    let sw = new Gtk.ScrolledWindow({ hscrollbar_policy: Gtk.PolicyType.NEVER });
    sw.add(contentBox);
    rootBox.pack_start(sw, true, true, 0);
    win.add(rootBox);

    // Standalone (no parent window): own the main loop
    if (!parentWindow) {
        win.connect("destroy", () => Gtk.main_quit());
    }
    win.show_all();
    if (!parentWindow) {
        Gtk.main();
    }
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
    runAvroMouse();
}
