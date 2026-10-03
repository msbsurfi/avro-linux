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
    try {
        GLib.set_prgname("avro-layout");
        GLib.set_application_name("Avro Layout Viewer");
    } catch (e) {}

    let pal = Theme.apply();

    let window = new Gtk.Window({
        title: "Avro Phonetic Keyboard Layout Viewer",
        default_width: 880,
        default_height: 640,
        window_position: Gtk.WindowPosition.CENTER
    });
    window.set_icon_name("avro-layout");
    try { window.set_wmclass("avro-layout", "AvroLayout"); } catch (e) {}
    try { Gtk.Window.set_default_icon_name("avro-layout"); } catch (e) {}
    Theme.styleWindow(window);

    if (parentWindow) {
        window.set_transient_for(parentWindow);
    }

    let header = Theme.headerBar({
        icon: "avro-layout",
        title: "Keyboard Layout Guide",
        subtitle: "Avro Phonetic reference"
    });
    window.set_titlebar(header);

    let stack = new Gtk.Stack({ transition_type: Gtk.StackTransitionType.CROSSFADE, transition_duration: 140 });
    let switcher = new Gtk.StackSwitcher({ stack: stack, valign: Gtk.Align.CENTER });
    switcher.get_style_context().add_class("avro-switcher");
    header.set_custom_title(switcher);

    function pageBox() {
        return new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL, spacing: 12,
            margin_start: 24, margin_end: 24, margin_top: 20, margin_bottom: 22
        });
    }

    /* Striped reference table inside a card */
    function buildTable(headers, data, bengaliCol) {
        let tableCard = Theme.card();
        let grid = new Gtk.Grid({ column_spacing: 0, row_spacing: 0, column_homogeneous: false, margin: 4 });
        headers.forEach((h, c) => {
            let l = new Gtk.Label({ label: h, xalign: 0, hexpand: c === headers.length - 1 });
            l.get_style_context().add_class("avro-cell");
            l.get_style_context().add_class("avro-cell-head");
            grid.attach(l, c, 0, 1, 1);
        });
        data.forEach((row, i) => {
            row.forEach((text, c) => {
                let l = new Gtk.Label({ label: text, xalign: 0, hexpand: c === row.length - 1, selectable: true });
                let ctx = l.get_style_context();
                ctx.add_class("avro-cell");
                if (i % 2 === 1) ctx.add_class("avro-cell-alt");
                if (c === bengaliCol) ctx.add_class("avro-cell-bn");
                grid.attach(l, c, i + 1, 1, 1);
            });
        });
        tableCard.pack_start(grid, false, false, 0);
        return tableCard;
    }

    function scrollPage(box) {
        let sw = new Gtk.ScrolledWindow({ hscrollbar_policy: Gtk.PolicyType.NEVER });
        sw.add(box);
        return sw;
    }

    /* ========================================================================= */
    /* 1. INTERACTIVE KEYBOARD TAB                                               */
    /* ========================================================================= */
    let kbBox = pageBox();

    let shiftBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let btnShift = new Gtk.ToggleButton({ label: "⇧  Shift view" });
    btnShift.get_style_context().add_class("avro-pill");
    let hintLabel = new Gtk.Label({
        label: "Click any key to copy its Bengali character to clipboard",
        xalign: 0
    });
    hintLabel.get_style_context().add_class("avro-sub");
    shiftBox.pack_start(btnShift, false, false, 0);
    shiftBox.pack_start(hintLabel, true, true, 0);
    kbBox.pack_start(shiftBox, false, false, 0);

    let kbCard = Theme.card();
    let rowsContainer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin: 20, halign: Gtk.Align.CENTER });
    kbCard.pack_start(rowsContainer, true, true, 0);

    let keyButtons = [];

    function renderKeyboard(isShift) {
        // Clear previous buttons
        let children = rowsContainer.get_children();
        for (let i = 0; i < children.length; i++) {
            rowsContainer.remove(children[i]);
        }
        keyButtons = [];

        for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
            // Staggered rows like a real keyboard
            let rowBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, halign: Gtk.Align.CENTER,
                margin_start: r * 14
            });
            let row = KEYBOARD_ROWS[r];
            for (let c = 0; c < row.length; c++) {
                let k = row[c];
                let latin = isShift ? k.shift : k.normal;
                let bn = isShift ? k.bnShift : k.bnNormal;

                let btn = new Gtk.Button();
                btn.get_style_context().add_class("avro-key");
                let lbl = new Gtk.Label({
                    label: "<small><span color='" + pal.faint + "'>" + Theme.esc(latin) + "</span></small>\n<b><big>" + Theme.esc(bn) + "</big></b>",
                    use_markup: true,
                    justify: Gtk.Justification.CENTER
                });
                btn.add(lbl);
                btn.set_size_request(52, 54);

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
    kbBox.pack_start(kbCard, false, false, 4);
    stack.add_titled(scrollPage(kbBox), "keyboard", "Visual Keyboard");

    /* ========================================================================= */
    /* 2. VOWELS & SIGNS TAB                                                     */
    /* ========================================================================= */
    let vowelsPage = pageBox();
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
    vowelsPage.pack_start(buildTable(["English Key", "Full Vowel", "Kar Sign", "Example"], vowelData, 1), false, false, 0);
    stack.add_titled(scrollPage(vowelsPage), "vowels", "Vowels (স্বরবর্ণ)");

    /* ========================================================================= */
    /* 3. CONJUNCTS & SPECIAL RULES TAB                                          */
    /* ========================================================================= */
    let conjPage = pageBox();
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
    conjPage.pack_start(buildTable(["Rule / Feature", "Keys", "Bengali", "Example"], conjData, 2), false, false, 0);
    stack.add_titled(scrollPage(conjPage), "conjuncts", "Conjuncts (যুক্তবর্ণ)");

    window.add(stack);
    window.connect("destroy", () => {
        if (!parentWindow) {
            Gtk.main_quit();
        }
    });

    window.show_all();
    let startPage = GLib.getenv("AVRO_LAYOUT_PAGE");
    if (startPage && stack.get_child_by_name(startPage)) stack.set_visible_child_name(startPage);
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
