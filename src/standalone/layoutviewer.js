#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Layout Viewer
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Standalone Suite

    Shows the active keyboard layout, like the Layout Viewer of Avro Keyboard:
    the Avro Phonetic guide, or a picture of the keyboard for a fixed layout
    with a Normal View (normal and Shift characters) and an AltGr View
    (AltGr and Shift+AltGr characters). It follows layout changes made in the
    TopBar or in Preferences.

    Usage: avro-layout [LAYOUT]   (phonetic, avro-easy, bornona, munir-optima,
                                   national, probhat; default: the active one)
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;

// The fixed layouts live in avro-core/fixed next to the program's folder;
// the installed copy is the last resort.
try {
    let scriptDir = GLib.path_get_dirname(imports.system.programPath || '');
    if (GLib.file_test(scriptDir + '/../avro-core/fixed/fixedlayout.js', GLib.FileTest.EXISTS)) {
        imports.searchPath.unshift(GLib.path_get_dirname(scriptDir) + '/avro-core/fixed');
    } else if (GLib.file_test(scriptDir + '/../src/avro-core/fixed/fixedlayout.js', GLib.FileTest.EXISTS)) {
        imports.searchPath.unshift(GLib.path_get_dirname(scriptDir) + '/src/avro-core/fixed');
    }
} catch (e) {}
imports.searchPath.push('/usr/share/avro-linux/avro-core/fixed');

let FixedLayout = null;
try { FixedLayout = imports.fixedlayout; } catch (e) {}

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
        { normal: 'q', shift: 'Q', bnNormal: 'য়', bnShift: 'ৎ' },
        { normal: 'w', shift: 'W', bnNormal: 'ও', bnShift: 'ঔ' },
        { normal: 'e', shift: 'E', bnNormal: 'এ', bnShift: 'ঐ' },
        { normal: 'r', shift: 'R', bnNormal: 'র', bnShift: 'ড়' },
        { normal: 't', shift: 'T', bnNormal: 'ত', bnShift: 'ট' },
        { normal: 'y', shift: 'Y', bnNormal: 'ইয়', bnShift: 'য়' },
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
        { normal: 'x', shift: 'X', bnNormal: 'ক্স', bnShift: 'ঢ়' },
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

/* A keyboard drawn for the fixed layouts: [Avro key name or label, width in key units]. */
var KEYBOARD = [
    [['OEM3', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1],
     ['9', 1], ['0', 1], ['MINUS', 1], ['PLUS', 1], ['Backspace', 2]],
    [['Tab', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1],
     ['O', 1], ['P', 1], ['OEM4', 1], ['OEM6', 1], ['OEM5', 1.5]],
    [['Caps Lock', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1],
     ['K', 1], ['L', 1], ['OEM1', 1], ['OEM7', 1], ['Enter', 2.25]],
    [['Shift', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1],
     ['COMMA', 1], ['PERIOD', 1], ['OEM2', 1], ['Shift', 2.75]],
    [['Ctrl', 1.25], ['Super', 1.25], ['Alt', 1.25], ['', 6.25], ['AltGr', 1.25], ['Super', 1.25],
     ['Menu', 1.25], ['Ctrl', 1.25]]
];
var KEYBOARD_UNITS = 15;

function avroSettings() {
    try {
        let source = Gio.SettingsSchemaSource.get_default();
        let schema = source ? source.lookup("com.omicronlab.avro", true) : null;
        return schema ? new Gio.Settings({ settings_schema: schema }) : null;
    } catch (e) {
        return null;
    }
}

/* Invisible characters get a name on the key. */
function keyCapText(text) {
    if (text === '‌') return 'ZWNJ';
    if (text === '‍') return 'ZWJ';
    return text || '';
}

function hasAltGr(layout) {
    for (let key in layout.keys) {
        if (layout.keys[key][2] || layout.keys[key][3]) return true;
    }
    return false;
}

function roundedRect(cr, x, y, w, h, r) {
    cr.newSubPath();
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
    cr.closePath();
}

function drawText(cr, text, family, sizePx, x, y, color, align) {
    if (!text) return;
    let layout = PangoCairo.create_layout(cr);
    let font = Pango.FontDescription.from_string(family);
    font.set_absolute_size(Math.max(1, sizePx) * Pango.SCALE);
    layout.set_font_description(font);
    layout.set_text(text, -1);
    let [, logical] = layout.get_pixel_extents();
    let dx = align === 'center' ? -logical.width / 2 : (align === 'right' ? -logical.width : 0);
    cr.setSourceRGBA(color[0], color[1], color[2], color[3]);
    cr.moveTo(x + dx, y);
    PangoCairo.show_layout(cr, layout);
}

/**
 * Draw the keyboard of a fixed layout into width × height.
 * Normal view: Shift character above, normal character below.
 * AltGr view: Shift+AltGr character above, AltGr character below.
 */
function drawKeyboard(cr, width, height, layout, altGrView) {
    let rows = KEYBOARD.length;
    let unit = Math.min((width - 16) / KEYBOARD_UNITS, (height - 16) / rows);
    let gap = Math.max(2, Math.round(unit * 0.07));
    let left = (width - unit * KEYBOARD_UNITS) / 2;
    let top = (height - unit * rows) / 2;
    let bangla = "Noto Sans Bengali, Noto Sans, sans";
    let latin = "Noto Sans, DejaVu Sans, sans";

    cr.setSourceRGB(0.20, 0.22, 0.25);
    roundedRect(cr, left - 6, top - 6, unit * KEYBOARD_UNITS + 12, unit * rows + 12, 8);
    cr.fill();

    for (let r = 0; r < rows; r++) {
        let x = left;
        let y = top + r * unit;
        for (let [name, units] of KEYBOARD[r]) {
            let w = units * unit;
            let values = layout.keys[name];
            let isChar = FixedLayout && FixedLayout.US_KEYS[name] !== undefined;
            roundedRect(cr, x + gap / 2, y + gap / 2, w - gap, unit - gap, Math.max(3, unit * 0.1));
            cr.setSourceRGB(isChar ? 0.97 : 0.84, isChar ? 0.97 : 0.85, isChar ? 0.95 : 0.87);
            cr.fillPreserve();
            cr.setSourceRGB(0.55, 0.57, 0.60);
            cr.setLineWidth(1);
            cr.stroke();

            let pad = gap / 2 + unit * 0.09;
            if (isChar) {
                let us = FixedLayout.US_KEYS[name];
                let latinLabel = /[A-Z]/.test(name) && name.length === 1 ? name : us[0];
                drawText(cr, latinLabel, latin, unit * 0.17, x + w - pad, y + pad * 0.6, [0.45, 0.47, 0.50, 1], 'right');
                if (values) {
                    let upper = keyCapText(values[altGrView ? 3 : 1]);
                    let lower = keyCapText(values[altGrView ? 2 : 0]);
                    let small = (s) => s.length > 2 && /^[A-Z]+$/.test(s);
                    drawText(cr, upper, small(upper) ? latin : bangla, unit * (small(upper) ? 0.15 : 0.28),
                             x + pad, y + pad * 0.4, [0.05, 0.25, 0.60, 1], 'left');
                    drawText(cr, lower, small(lower) ? latin : bangla, unit * (small(lower) ? 0.15 : 0.34),
                             x + pad, y + unit * 0.42, [0, 0, 0, 1], 'left');
                }
            } else if (name) {
                drawText(cr, name, latin, unit * 0.18, x + pad, y + unit - gap / 2 - unit * 0.34,
                         [0.25, 0.27, 0.30, 1], 'left');
            }
            x += w;
        }
    }
}

/* The Avro Phonetic guide (the Layout Viewer for Avro Phonetic). */
function buildPhoneticGuide() {
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

    function renderKeyboard(isShift) {
        // Clear previous buttons
        let children = rowsContainer.get_children();
        for (let i = 0; i < children.length; i++) {
            rowsContainer.remove(children[i]);
        }

        for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
            let rowBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, halign: Gtk.Align.CENTER });
            let row = KEYBOARD_ROWS[r];
            for (let c = 0; c < row.length; c++) {
                let k = row[c];
                let latinKey = isShift ? k.shift : k.normal;
                let bn = isShift ? k.bnShift : k.bnNormal;

                let btn = new Gtk.Button();
                let lbl = new Gtk.Label({
                    label: "<small><span color='#888888'>" + GLib.markup_escape_text(latinKey, -1) + "</span></small>\n<b><big>" +
                           GLib.markup_escape_text(bn, -1) + "</big></b>",
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

    return notebook;
}

function runLayoutViewerDialog(parentWindow, layoutId) {
    let settings = avroSettings();
    let explicit = (layoutId === 'phonetic' || (FixedLayout && FixedLayout.getLayout(layoutId))) ? layoutId : null;
    let altGrView = false;

    let window = new Gtk.Window({
        title: "Layout Viewer",
        default_width: 860,
        default_height: 420,
        window_position: Gtk.WindowPosition.CENTER
    });
    try { window.set_wmclass("avro-layout", "AvroLayoutViewer"); } catch (e) {}
    if (parentWindow) {
        window.set_transient_for(parentWindow);
    }

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, border_width: 12 });

    // Toolbar: Normal View | AltGr View, Show on Top, About layout...
    let bar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
    let btnNormal = new Gtk.RadioButton({ label: "Normal View", draw_indicator: false });
    let btnAltGr = Gtk.RadioButton.new_with_label_from_widget(btnNormal, "AltGr View");
    btnAltGr.set_mode(false);
    let btnOnTop = new Gtk.ToggleButton({ label: "Show on Top" });
    let btnAbout = new Gtk.Button({ label: "About layout..." });
    bar.pack_start(btnNormal, false, false, 0);
    bar.pack_start(btnAltGr, false, false, 0);
    bar.pack_end(btnAbout, false, false, 0);
    bar.pack_end(btnOnTop, false, false, 0);
    mainBox.pack_start(bar, false, false, 0);

    let content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    mainBox.pack_start(content, true, true, 0);

    let area = null;
    let currentLayout = null;

    function currentId() {
        if (explicit) return explicit;
        let id = settings ? settings.get_string('keyboard-layout') : 'phonetic';
        return (FixedLayout && FixedLayout.getLayout(id)) ? id : 'phonetic';
    }

    function rebuild() {
        for (let child of content.get_children()) {
            content.remove(child);
            child.destroy();
        }
        let id = currentId();
        currentLayout = id === 'phonetic' ? null : FixedLayout.getLayout(id);
        if (currentLayout) {
            window.set_title(currentLayout.name + " :: Layout Viewer");
            area = new Gtk.DrawingArea();
            area.set_size_request(600, 220);
            area.connect('draw', (w, cr) => {
                drawKeyboard(cr, w.get_allocated_width(), w.get_allocated_height(), currentLayout, altGrView);
                cr.$dispose();
                return true;
            });
            content.pack_start(area, true, true, 0);
            let altGr = hasAltGr(currentLayout);
            btnAltGr.set_sensitive(altGr);
            if (!altGr && altGrView) btnNormal.set_active(true);
        } else {
            window.set_title("Avro Phonetic :: Layout Viewer");
            area = null;
            content.pack_start(buildPhoneticGuide(), true, true, 0);
            btnAltGr.set_sensitive(false);
        }
        btnNormal.set_sensitive(!!currentLayout);
        content.show_all();
    }

    let onView = () => {
        altGrView = btnAltGr.get_active();
        if (area) area.queue_draw();
    };
    btnNormal.connect('toggled', onView);
    btnAltGr.connect('toggled', onView);
    btnOnTop.connect('toggled', () => window.set_keep_above(btnOnTop.get_active()));
    btnAbout.connect('clicked', () => {
        let text, secondary;
        if (currentLayout) {
            text = "Internal Name : " + currentLayout.name;
            secondary = "Version : " + currentLayout.version + "\nDeveloper : " + currentLayout.developer +
                        "\n\nDeveloper's comment :\n" + currentLayout.comment;
        } else {
            text = "Internal Name : Avro Phonetic";
            secondary = "Developer : Mehdi Hasan (OmicronLab)\n\nDeveloper's comment :\n" +
                        "Avro Phonetic is not a fixed keyboard layout: it turns English text into Bangla " +
                        "with the phonetic converter of OmicronLab.";
        }
        let d = new Gtk.MessageDialog({
            transient_for: window, modal: true, message_type: Gtk.MessageType.INFO,
            buttons: Gtk.ButtonsType.OK, title: "About...", text: text, secondary_text: secondary
        });
        d.run();
        d.destroy();
    });

    // Follow the active layout, like the Layout Viewer of Avro Keyboard
    let handler = 0;
    if (settings) {
        handler = settings.connect('changed::keyboard-layout', () => {
            explicit = null;
            rebuild();
        });
    }

    window.add(mainBox);
    window.connect("destroy", () => {
        if (settings && handler) settings.disconnect(handler);
        if (!parentWindow) {
            Gtk.main_quit();
        }
    });

    rebuild();
    window.show_all();
    if (!parentWindow) {
        Gtk.main();
    }
    return window;
}

// Standalone execution entrypoint
let isMain = false;
try {
    let prog = GLib.path_get_basename(imports.system.programInvocationName || '');
    isMain = prog === 'layoutviewer.js';
} catch (e) {}

if (isMain) {
    Gtk.init(null);
    runLayoutViewerDialog(null, (ARGV || []).filter(a => a.indexOf('-') !== 0)[0] || null);
}
