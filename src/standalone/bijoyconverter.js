#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Unicode to Bijoy (ANSI) and Bijoy to Unicode Converter
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Standalone Suite
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;

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

// Mapping tables for Unicode <-> Bijoy (SutonnyMJ / ANSI)
const DIGIT_MAP = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

const REV_DIGIT_MAP = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const CONJUNCTS = [
    ['ক্ষ্ম', '¶¥'],
    ['ক্ষ্ণ', '¶&Y'],
    ['ক্ষ', '¶'],
    ['জ্ঞ', 'Á'],
    ['ঞ্চ', 'Â'],
    ['ঞ্ছ', 'Ã'],
    ['ঞ্জ', 'Ä'],
    ['ট্ট', 'Æ'],
    ['ড্ড', 'Ç'],
    ['ণ্ট', 'È'],
    ['ণ্ঠ', 'É'],
    ['ণ্ড', 'Ê'],
    ['ত্ত', 'Ë'],
    ['ত্থ', 'Ì'],
    ['ত্ম', 'Í'],
    ['ত্র', 'Î'],
    ['দ্দ', 'Ï'],
    ['দ্ধ', '×'],
    ['দ্ব', 'Ø'],
    ['দ্ম', 'Ù'],
    ['ন্থ', 'Ú'],
    ['ন্দ', 'Û'],
    ['ন্ধ', 'Ü'],
    ['ন্স', 'Ý'],
    ['প্ট', 'Þ'],
    ['প্ত', 'ß'],
    ['প্প', 'à'],
    ['প্স', 'á'],
    ['ব্জ', 'â'],
    ['బ్ద', 'ã'],
    ['ব্ধ', 'ä'],
    ['ভ্র', 'å'],
    ['ম্ন', 'æ'],
    ['ম্ফ', 'ç'],
    ['ল্ক', 'é'],
    ['ল্গ', 'ê'],
    ['ল্ট', 'ë'],
    ['ল্ড', 'ì'],
    ['ল্প', 'í'],
    ['ল্ফ', 'î'],
    ['শ্চ', 'ð'],
    ['শ্ছ', 'ñ'],
    ['ষ্ণ', 'ò'],
    ['ষ্ট', 'ó'],
    ['ষ্ঠ', 'ô'],
    ['ষ্ফ', 'õ'],
    ['স্খ', 'ö'],
    ['স্ট', '÷'],
    ['স্ন', 'ø'],
    ['স্ফ', 'ù'],
    ['হ্ন', 'ý'],
    ['হ্ম', 'þ'],
    ['ক্ক', '°'],
    ['ক্ট', '±'],
    ['ক্ত', '³'],
    ['ক্ম', '´'],
    ['ক্র', 'µ'],
    ['ক্স', '·'],
    ['গ্গ', '¹'],
    ['গ্দ', 'º'],
    ['গ্ধ', '»'],
    ['ঙ্ক', '¼'],
    ['ঙ্গ', '½'],
    ['জ্জ', '¾'],
    ['হু', 'û'],
    ['হৃ', 'ü'],
    ['গু', '¸'],
    ['শু', 'ï']
];

const CHAR_MAP = [
    // Vowels
    ['অ', 'A'],
    ['আ', 'Av'],
    ['ই', 'B'],
    ['ঈ', 'C'],
    ['উ', 'D'],
    ['ঊ', 'E'],
    ['ঋ', 'F'],
    ['এ', 'G'],
    ['ঐ', 'H'],
    ['ও', 'I'],
    ['ঔ', 'J'],

    // Consonants
    ['ক', 'K'], ['খ', 'L'], ['গ', 'M'], ['ঘ', 'N'], ['ঙ', 'O'],
    ['চ', 'P'], ['ছ', 'Q'], ['জ', 'R'], ['ঝ', 'S'], ['ঞ', 'T'],
    ['ট', 'U'], ['ঠ', 'V'], ['ড', 'W'], ['ঢ', 'X'], ['ণ', 'Y'],
    ['ত', 'Z'], ['থ', '_'], ['দ', '`'], ['ধ', 'a'], ['ন', 'b'],
    ['প', 'c'], ['ফ', 'd'], ['ব', 'e'], ['ভ', 'f'], ['ম', 'g'],
    ['য', 'h'], ['র', 'i'], ['ল', 'j'], ['শ', 'k'], ['ষ', 'l'],
    ['স', 'm'], ['হ', 'n'], ['ড়', 'o'], ['ঢ়', 'p'], ['য়', 'q'],
    ['ৎ', 'r'], ['ং', 's'], ['ঃ', 't'], ['ঁ', 'u'],

    // Modifiers & Punctuation
    ['্', '&'],
    ['।', '|'],
    ['৳', '$']
];

function unicodeToBijoy(text) {
    if (!text) return "";
    let str = text;

    // Digits
    for (let d in DIGIT_MAP) {
        str = str.split(d).join(DIGIT_MAP[d]);
    }

    // Two-part vowel signs (O-kar and OU-kar)
    // ো = ে + া
    str = str.replace(/([ক-হড়-য়])ো/g, '†$1v');
    // ৌ = ে + ৗ
    str = str.replace(/([ক-হড়-য়])ৌ/g, '†$1Š');

    // Pre-base vowel signs (I-kar, E-kar, OI-kar)
    // In Unicode, vowel signs follow consonant; in Bijoy, they precede consonant
    str = str.replace(/([ক-হড়-য়](?:্[ক-হড়-য়])*)ি/g, 'w$1');
    str = str.replace(/([ক-হড়-য়](?:্[ক-হড়-য়])*)ে/g, '†$1');
    str = str.replace(/([ক-হড়-য়](?:্[ক-হড়-য়])*)ৈ/g, '‰$1');

    // Reph (র্) comes at start in Unicode, but after character in Bijoy
    str = str.replace(/র্([ক-হড়-য়])/g, '$1©');

    // Conjuncts
    for (let i = 0; i < CONJUNCTS.length; i++) {
        let [uni, bij] = CONJUNCTS[i];
        str = str.split(uni).join(bij);
    }

    // Post-base vowel signs
    str = str.replace(/া/g, 'v');
    str = str.replace(/ী/g, 'x');
    str = str.replace(/ু/g, 'y');
    str = str.replace(/ূ/g, '~');
    str = str.replace(/ৃ/g, '„');
    str = str.replace(/্য/g, '¨');
    str = str.replace(/্র/g, '«');

    // Single characters
    for (let i = 0; i < CHAR_MAP.length; i++) {
        let [uni, bij] = CHAR_MAP[i];
        str = str.split(uni).join(bij);
    }

    return str;
}

function bijoyToUnicode(text) {
    if (!text) return "";
    let str = text;

    // Digits
    for (let d in REV_DIGIT_MAP) {
        str = str.split(d).join(REV_DIGIT_MAP[d]);
    }

    // Reph (©) follows base character in Bijoy; move to front as র্
    str = str.replace(/([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])©/g, 'র্$1');

    // Pre-base vowel signs (w = ি, † = ে, ‰ = ৈ)
    // O-kar: † + base + v -> base + ো
    str = str.replace(/†([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])v/g, '$1ো');
    // OU-kar: † + base + Š -> base + ৌ
    str = str.replace(/†([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])Š/g, '$1ৌ');
    // E-kar: † + base -> base + ে
    str = str.replace(/†([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])/g, '$1ে');
    // I-kar: w + base -> base + ি
    str = str.replace(/w([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])/g, '$1ি');
    // OI-kar: ‰ + base -> base + ৈ
    str = str.replace(/‰([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])/g, '$1ৈ');

    // Conjuncts
    for (let i = 0; i < CONJUNCTS.length; i++) {
        let [uni, bij] = CONJUNCTS[i];
        str = str.split(bij).join(uni);
    }

    // Multi-char vowel forms (must precede v -> া)
    str = str.replace(/Av/g, 'আ');

    // Post-base vowel signs
    str = str.replace(/v/g, 'া');
    str = str.replace(/x/g, 'ী');
    str = str.replace(/y/g, 'ু');
    str = str.replace(/~/g, 'ূ');
    str = str.replace(/„/g, 'ৃ');
    str = str.replace(/¨/g, '্য');
    str = str.replace(/«/g, '্র');

    // Single characters
    for (let i = 0; i < CHAR_MAP.length; i++) {
        let [uni, bij] = CHAR_MAP[i];
        str = str.split(bij).join(uni);
    }

    return str;
}

function runConverterDialog(parentWindow) {
    try {
        GLib.set_prgname("avro-converter");
        GLib.set_application_name("Avro Unicode to Bijoy Converter");
    } catch (e) {}

    Theme.apply();

    let dialog = new Gtk.Window({
        title: "Avro Unicode to Bijoy (ANSI) Converter",
        default_width: 860,
        default_height: 560,
        window_position: Gtk.WindowPosition.CENTER
    });
    dialog.set_icon_name("avro-converter");
    try { dialog.set_wmclass("avro-converter", "AvroConverter"); } catch (e) {}
    try { Gtk.Window.set_default_icon_name("avro-converter"); } catch (e) {}
    Theme.styleWindow(dialog);
    dialog.set_size_request(640, 420);

    if (parentWindow) {
        dialog.set_transient_for(parentWindow);
    }

    dialog.set_titlebar(Theme.headerBar({
        icon: "avro-converter",
        title: "Unicode ↔ Bijoy Converter",
        subtitle: "Convert between Unicode and legacy ANSI / SutonnyMJ"
    }));

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14, margin: 20 });

    // Panes
    function makePane(titleText, subText) {
        let pane = Theme.card();
        let head = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, margin_start: 16, margin_end: 10, margin_top: 10, margin_bottom: 8 });
        let col = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0, valign: Gtk.Align.CENTER });
        col.pack_start(Theme.label(titleText, "avro-row-title"), false, false, 0);
        col.pack_start(Theme.label(subText, "avro-row-sub"), false, false, 0);
        head.pack_start(col, true, true, 0);
        pane.pack_start(head, false, false, 0);
        pane.pack_start(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }), false, false, 0);
        let sw = new Gtk.ScrolledWindow({ hexpand: true, vexpand: true });
        let tv = new Gtk.TextView({ wrap_mode: Gtk.WrapMode.WORD, left_margin: 14, right_margin: 14, top_margin: 12, bottom_margin: 12 });
        sw.add(tv);
        pane.pack_start(sw, true, true, 0);
        return { pane: pane, head: head, textView: tv };
    }

    let uniPane = makePane("Unicode Bengali", "Avro, web and modern apps");
    let bijPane = makePane("Bijoy / ANSI", "SutonnyMJ and legacy formats");
    let uniTextView = uniPane.textView;
    let bijTextView = bijPane.textView;

    let grid = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 14, homogeneous: true });
    grid.pack_start(uniPane.pane, true, true, 0);
    grid.pack_start(bijPane.pane, true, true, 0);
    mainBox.pack_start(grid, true, true, 0);

    // Action Buttons
    let actionBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10, halign: Gtk.Align.CENTER });

    let btnUniToBij = new Gtk.Button({ label: "Convert to Bijoy  ➡" });
    btnUniToBij.get_style_context().add_class("suggested-action");
    btnUniToBij.connect("clicked", function() {
        let buf = uniTextView.get_buffer();
        let start = buf.get_start_iter();
        let end = buf.get_end_iter();
        let text = buf.get_text(start, end, false);
        let converted = unicodeToBijoy(text);
        bijTextView.get_buffer().set_text(converted, -1);
    });

    let btnBijToUni = new Gtk.Button({ label: "⬅  Convert to Unicode" });
    btnBijToUni.get_style_context().add_class("suggested-action");
    btnBijToUni.connect("clicked", function() {
        let buf = bijTextView.get_buffer();
        let start = buf.get_start_iter();
        let end = buf.get_end_iter();
        let text = buf.get_text(start, end, false);
        let converted = bijToUnicode(text);
        uniTextView.get_buffer().set_text(converted, -1);
    });

    function copyButton(text) {
        let b = new Gtk.Button();
        let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
        box.pack_start(Gtk.Image.new_from_icon_name("avro-copy-symbolic", Gtk.IconSize.BUTTON), false, false, 0);
        let lbl = new Gtk.Label({ label: text });
        box.pack_start(lbl, false, false, 0);
        b.add(box);
        b._label = lbl;
        b.get_style_context().add_class("flat");
        return b;
    }

    let btnCopyBijoy = copyButton("Copy Bijoy");
    btnCopyBijoy.connect("clicked", function() {
        let buf = bijTextView.get_buffer();
        let start = buf.get_start_iter();
        let end = buf.get_end_iter();
        let text = buf.get_text(start, end, false);
        let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
        clipboard.set_text(text, -1);
        btnCopyBijoy._label.set_label("Copied!");
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            btnCopyBijoy._label.set_label("Copy Bijoy");
            return GLib.SOURCE_REMOVE;
        });
    });

    let btnCopyUni = copyButton("Copy Unicode");
    btnCopyUni.connect("clicked", function() {
        let buf = uniTextView.get_buffer();
        let start = buf.get_start_iter();
        let end = buf.get_end_iter();
        let text = buf.get_text(start, end, false);
        let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
        clipboard.set_text(text, -1);
        btnCopyUni._label.set_label("Copied!");
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            btnCopyUni._label.set_label("Copy Unicode");
            return GLib.SOURCE_REMOVE;
        });
    });

    uniPane.head.pack_end(btnCopyUni, false, false, 0);
    bijPane.head.pack_end(btnCopyBijoy, false, false, 0);

    let btnClear = new Gtk.Button({ label: "Clear All" });
    btnClear.get_style_context().add_class("destructive-action");
    btnClear.connect("clicked", function() {
        uniTextView.get_buffer().set_text("", 0);
        bijTextView.get_buffer().set_text("", 0);
    });

    actionBox.pack_start(btnUniToBij, false, false, 0);
    actionBox.pack_start(btnBijToUni, false, false, 0);
    actionBox.pack_start(btnClear, false, false, 0);

    mainBox.pack_start(actionBox, false, false, 0);

    dialog.add(mainBox);
    dialog.connect("destroy", function() {
        if (!parentWindow) {
            Gtk.main_quit();
        }
    });

    dialog.show_all();
    if (!parentWindow) {
        Gtk.main();
    }
    return dialog;
}

// Standalone execution entrypoint
let isMain = (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1);
try {
    let scriptPath = (typeof ARGV !== 'undefined' && ARGV[0]) ? ARGV[0] : '';
    if (scriptPath.indexOf('bijoyconverter.js') !== -1) {
        isMain = true;
    }
} catch (e) {}

if (isMain) {
    Gtk.init(null);
    runConverterDialog(null);
}
