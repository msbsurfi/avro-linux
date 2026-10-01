#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Visual Keyboard Layout Viewer & Phonetic Reference
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Standalone Suite
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;

const KEYBOARD_ROWS = [
    // Row 1 (Numbers)
    [
        { normal: '`', shift: '~', bnNormal: '`', bnShift: '~' },
        { normal: '1', shift: '!', bnNormal: '১', bnShift: '!' },
        { normal: '2', shift: '@', bnNormal: '২', bnShift: '@' },
        { normal: '3', shift: '#', bnNormal: '৩', bnShift: '#' },
        { normal: '4', shift: '$', bnNormal: '৪', bnShift: '৳' },
        { normal: '5', shift: '%', bnNormal: '৫', bnShift: '%' },
        { normal: '6', shift: '^', bnNormal: '৬', bnShift: 'ঁ' },
        { normal: '7', shift: '&', bnNormal: '৭', bnShift: '্' },
        { normal: '8', shift: '*', bnNormal: '৮', bnShift: '*' },
        { normal: '9', shift: '(', bnNormal: '৯', bnShift: '(' },
        { normal: '0', shift: ')', bnNormal: '০', bnShift: ')' },
        { normal: '-', shift: '_', bnNormal: '-', bnShift: '_' },
        { normal: '=', shift: '+', bnNormal: '=', bnShift: '+' }
    ],
    // Row 2
    [
        { normal: 'q', shift: 'Q', bnNormal: 'য়', bnShift: 'ৎ' },
        { normal: 'w', shift: 'W', bnNormal: 'ও', bnShift: 'ঔ' },
        { normal: 'e', shift: 'E', bnNormal: 'এ', bnShift: 'ঐ' },
        { normal: 'r', shift: 'R', bnNormal: 'র', bnShift: 'ড়' },
        { normal: 't', shift: 'T', bnNormal: 'ত', bnShift: 'ট' },
        { normal: 'y', shift: 'Y', bnNormal: 'ইয়', bnShift: 'য়' },
        { normal: 'u', shift: 'U', bnNormal: 'উ', bnShift: 'ঊ' },
        { normal: 'i', shift: 'I', bnNormal: 'ই', bnShift: 'ঈ' },
        { normal: 'o', shift: 'O', bnNormal: 'অ', bnShift: 'ও' },
        { normal: 'p', shift: 'P', bnNormal: 'প', bnShift: 'ফ' },
        { normal: '[', shift: '{', bnNormal: '[', bnShift: '{' },
        { normal: ']', shift: '}', bnNormal: ']', bnShift: '}' }
    ],
    // Row 3
    [
        { normal: 'a', shift: 'A', bnNormal: 'আ', bnShift: 'আ' },
        { normal: 's', shift: 'S', bnNormal: 'স', bnShift: 'ষ' },
        { normal: 'd', shift: 'D', bnNormal: 'দ', bnShift: 'ড' },
        { normal: 'f', shift: 'F', bnNormal: 'ফ', bnShift: 'ঋ' },
        { normal: 'g', shift: 'G', bnNormal: 'গ', bnShift: 'ঘ' },
        { normal: 'h', shift: 'H', bnNormal: 'হ', bnShift: 'ঃ' },
        { normal: 'j', shift: 'J', bnNormal: 'জ', bnShift: 'ঝ' },
        { normal: 'k', shift: 'K', bnNormal: 'ক', bnShift: 'খ' },
        { normal: 'l', shift: 'L', bnNormal: 'ল', bnShift: 'ং' },
        { normal: ';', shift: ':', bnNormal: ';', bnShift: ':' },
        { normal: "'", shift: '"', bnNormal: '’', bnShift: '”' }
    ],
    // Row 4
    [
        { normal: 'z', shift: 'Z', bnNormal: 'য', bnShift: '্য' },
        { normal: 'x', shift: 'X', bnNormal: 'ক্স', bnShift: 'ঢ়' },
        { normal: 'c', shift: 'C', bnNormal: 'চ', bnShift: 'ছ' },
        { normal: 'v', shift: 'V', bnNormal: 'ভ', bnShift: 'ভ' },
        { normal: 'b', shift: 'B', bnNormal: 'ব', bnShift: 'ভ' },
        { normal: 'n', shift: 'N', bnNormal: 'ন', bnShift: 'ণ' },
        { normal: 'm', shift: 'M', bnNormal: 'ম', bnShift: 'ঙ' },
        { normal: ',', shift: '<', bnNormal: ',', bnShift: '্‌' },
        { normal: '.', shift: '>', bnNormal: '।', bnShift: '॥' },
        { normal: '/', shift: '?', bnNormal: '/', bnShift: '?' }
    ]
];

function runLayoutViewerDialog(parentWindow) {
    let window = new Gtk.Window({
        title: "Avro Phonetic Keyboard Layout Viewer",
        default_width: 760,
        default_height: 540,
        window_position: Gtk.WindowPosition.CENTER
    });

    if (parentWindow) {
        window.set_transient_for(parentWindow);
    }

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, border_width: 14 });

    // Title
    let headerBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
    let title = new Gtk.Label({ label: "<b><big>Avro Phonetic Keyboard Layout Guide</big></b>", use_markup: true, xalign: 0 });
    let subtitle = new Gtk.Label({
        label: "Visual reference for keys, vowels, consonants, conjuncts (যুক্তবর্ণ), and typing shortcuts.",
        xalign: 0
    });
    subtitle.get_style_context().add_class("dim-label");
    headerBox.pack_start(title, false, false, 0);
    headerBox.pack_start(subtitle, false, false, 0);
    mainBox.pack_start(headerBox, false, false, 0);

    let notebook = new Gtk.Notebook();

    /* ========================================================================= */
    /* 1. INTERACTIVE KEYBOARD TAB                                               */
    /* ========================================================================= */
    let kbBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, border_width: 12 });

    let shiftBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let btnShift = new Gtk.ToggleButton({ label: "  Shift Key View  " });
    let hintLabel = new Gtk.Label({
        label: "Click any key to copy its Bengali character to clipboard",
        xalign: 0
    });
    hintLabel.get_style_context().add_class("dim-label");
    shiftBox.pack_start(btnShift, false, false, 0);
    shiftBox.pack_start(hintLabel, true, true, 0);
    kbBox.pack_start(shiftBox, false, false, 0);

    let rowsContainer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });

    let keyButtons = [];

    function renderKeyboard(isShift) {
        // Clear previous buttons
        let children = rowsContainer.get_children();
        for (let i = 0; i < children.length; i++) {
            rowsContainer.remove(children[i]);
        }
        keyButtons = [];

        for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
            let rowBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, halign: Gtk.Align.CENTER });
            let row = KEYBOARD_ROWS[r];
            for (let c = 0; c < row.length; c++) {
                let k = row[c];
                let latin = isShift ? k.shift : k.normal;
                let bn = isShift ? k.bnShift : k.bnNormal;

                let btn = new Gtk.Button();
                let lbl = new Gtk.Label({
                    label: "<small><span color='#888888'>" + latin + "</span></small>\n<b><big>" + bn + "</big></b>",
                    use_markup: true
                });
                btn.add(lbl);
                btn.set_size_request(48, 48);

                let charToCopy = bn;
                btn.connect("clicked", () => {
                    let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
                    clipboard.set_text(charToCopy, -1);
                    hintLabel.set_text("Copied '" + charToCopy + "' to clipboard!");
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                        hintLabel.set_text("Click any key to copy its Bengali character to clipboard");
                        return GLib.SOURCE_REMOVE;
                    });
                });

                rowBox.pack_start(btn, false, false, 0);
            }
            rowsContainer.pack_start(rowBox, false, false, 0);
        }
        rowsContainer.show_all();
    }

    btnShift.connect("toggled", () => {
        renderKeyboard(btnShift.get_active());
    });

    renderKeyboard(false);
    kbBox.pack_start(rowsContainer, true, true, 8);
    notebook.append_page(kbBox, new Gtk.Label({ label: "Visual Keyboard" }));

    /* ========================================================================= */
    /* 2. VOWELS & SIGNS TAB                                                     */
    /* ========================================================================= */
    let vowelsBox = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN, border_width: 10 });
    let vGrid = new Gtk.Grid({ column_spacing: 24, row_spacing: 10, margin: 16 });

    let vHeaders = ["English Key", "Full Vowel", "Kar Sign", "Example"];
    for (let h = 0; h < vHeaders.length; h++) {
        let hl = new Gtk.Label({ label: "<b>" + vHeaders[h] + "</b>", use_markup: true, xalign: 0 });
        vGrid.attach(hl, h, 0, 1, 1);
    }

    let vowelData = [
        ["o", "অ", "(inherent)", "onirban -> অনির্বাণ"],
        ["a / A", "আ", "া (a)", "amake -> আমাকে"],
        ["i", "ই", "ি (i)", "iti -> ইতি"],
        ["I", "ঈ", "ী (I)", "Id -> ঈদ"],
        ["u", "উ", "ু (u)", "upor -> উপর"],
        ["U", "ঊ", "ূ (U)", "Usha -> ঊষা"],
        ["r", "ঋ", "ৃ (r)", "rishi -> ঋষি"],
        ["e", "এ", "ে (e)", "ek -> এক"],
        ["OI", "ঐ", "ৈ (OI)", "Oikyo -> ঐক্য"],
        ["O / w", "ও", "ো (O)", "Oporadh -> অপরাধ"],
        ["OU", "ঔ", "ৌ (OU)", "OUshodh -> ঔষধ"]
    ];

    for (let i = 0; i < vowelData.length; i++) {
        let row = vowelData[i];
        for (let j = 0; j < row.length; j++) {
            let l = new Gtk.Label({ label: row[j], xalign: 0 });
            vGrid.attach(l, j, i + 1, 1, 1);
        }
    }
    vowelsBox.add(vGrid);
    notebook.append_page(vowelsBox, new Gtk.Label({ label: "Vowels (স্বরবর্ণ)" }));

    /* ========================================================================= */
    /* 3. CONJUNCTS & SPECIAL RULES TAB                                          */
    /* ========================================================================= */
    let conjBox = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN, border_width: 10 });
    let cGrid = new Gtk.Grid({ column_spacing: 24, row_spacing: 10, margin: 16 });

    let cHeaders = ["Rule / Feature", "Keys", "Bengali", "Example"];
    for (let h = 0; h < cHeaders.length; h++) {
        let hl = new Gtk.Label({ label: "<b>" + cHeaders[h] + "</b>", use_markup: true, xalign: 0 });
        cGrid.attach(hl, h, 0, 1, 1);
    }

    let conjData = [
        ["Reph (র্)", "rr", "র্", "korrmo -> কর্ম, shorrm -> শর্ম"],
        ["Z-Fola (্য)", "y / Z", "্য", "baky -> বাক্য, bZaboshta -> ব্যবস্থা"],
        ["R-Fola (্র)", "r", "্র", "gram -> গ্রাম, prothom -> প্রথম"],
        ["Khanda Ta (ৎ)", "t`", "ৎ", "ut`shob -> উৎসব, hot`hat` -> হঠাৎ"],
        ["Chandrabindu (ঁ)", "^", "ঁ", "ca^d -> চাঁদ, ha^shi -> হাসি"],
        ["Bisharga (ঃ)", ":", "ঃ", "du:kho -> দুঃখ"],
        ["Anusvara (ং)", "ng", "ং", "rong -> রং, bangla -> বাংলা"],
        ["Explicit Hasanta", ",,", "্‌", "k,, -> ক্‌ (ক + হসন্ত)"],
        ["k + k", "kk", "ক্ক", "ekka -> এক্কা"],
        ["k + Sh (ক্ষ)", "kkh / kS", "ক্ষ", "khoma -> ক্ষমা, rokkha -> রক্ষা"],
        ["j + NG (জ্ঞ)", "jng / jG", "জ্ঞ", "gGen / jnan -> জ্ঞান"],
        ["t + t (ত্ত)", "tt", "ত্ত", "uttor -> উত্তর"],
        ["t + r (ত্র)", "tr", "ত্র", "ratri -> রাত্রি"],
        ["s + th (স্থ)", "sth", "স্থ", "sthan -> স্থান"]
    ];

    for (let i = 0; i < conjData.length; i++) {
        let row = conjData[i];
        for (let j = 0; j < row.length; j++) {
            let l = new Gtk.Label({ label: row[j], xalign: 0 });
            cGrid.attach(l, j, i + 1, 1, 1);
        }
    }
    conjBox.add(cGrid);
    notebook.append_page(conjBox, new Gtk.Label({ label: "Conjuncts (যুক্তবর্ণ)" }));

    mainBox.pack_start(notebook, true, true, 0);

    window.add(mainBox);
    window.connect("destroy", () => {
        if (!parentWindow) {
            Gtk.main_quit();
        }
    });

    window.show_all();
    if (!parentWindow) {
        Gtk.main();
    }
    return window;
}

// Standalone execution entrypoint
let isMain = (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1);
try {
    let scriptPath = (typeof ARGV !== 'undefined' && ARGV[0]) ? ARGV[0] : '';
    if (scriptPath.indexOf('layoutviewer.js') !== -1) {
        isMain = true;
    }
} catch (e) {}

if (isMain) {
    Gtk.init(null);
    runLayoutViewerDialog(null);
}
