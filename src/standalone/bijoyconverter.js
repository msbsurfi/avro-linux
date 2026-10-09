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

// The conversion lives in avro-core/bijoyconverter.js, shared with the
// engine's "Output as ANSI"; this module is the converter window.
let Converter = null;
(function loadConverter() {
    let dirs = ['/usr/share/avro-linux'];
    try {
        let m = new Error().stack.match(/(?:^|@|\()(?:file:\/\/)?([^\s:()@]+\.js):\d+/m);
        if (m) {
            let d = GLib.path_get_dirname(GLib.canonicalize_filename(m[1], GLib.get_current_dir()));
            dirs.unshift(GLib.path_get_dirname(d));
        }
    } catch (e) {}
    for (let d of dirs) {
        if (GLib.file_test(d + '/avro-core/bijoyconverter.js', GLib.FileTest.EXISTS)) {
            // Same module name as this file: reach it through its directory
            imports.searchPath.unshift(d);
            try { Converter = imports['avro-core'].bijoyconverter; } catch (e) { printerr('Avro converter: ' + e); }
            imports.searchPath.splice(imports.searchPath.indexOf(d), 1);
            break;
        }
    }
})();

function unicodeToBijoy(text) {
    return Converter ? Converter.unicodeToBijoy(text) : text;
}

function bijoyToUnicode(text) {
    return Converter ? Converter.bijoyToUnicode(text) : text;
}

function runConverterDialog(parentWindow) {
    // Only the first part of a program names it (the TopBar opens this too)
    if (!globalThis.__avroAppIdentity) {
        globalThis.__avroAppIdentity = true;
        try {
            GLib.set_prgname("avro-converter");
            GLib.set_application_name("Avro Converter");
        } catch (e) {}
    }

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
        windowTitle: "Avro Converter — Unicode ↔ Bijoy",
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
        let converted = bijoyToUnicode(text);
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
