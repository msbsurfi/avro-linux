#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro TopBar
    SPDX-License-Identifier: MPL-2.0
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET)

    A Linux re-creation of the Avro Keyboard (Windows) TopBar: the small
    floating, always-on-top bar with the Avro menu, the বাংলা / English mode
    button with the keyboard-layout strip under it, Layout Viewer, Avro Mouse,
    Tools, Web, Help and the power button.

    Element geometry, menus, tooltips and behaviour follow Avro Keyboard 5
    (default skin: 285×30 px). All artwork here is original, drawn with Cairo.

    Linux specifics:
      * The bar never takes keyboard focus, so clicking it never interrupts
        typing in the application you are working in.
      * Bangla / English mode is shared with the IBus engine (GSettings
        "mode-bangla", F12). Avro types with Avro Phonetic or one of the
        fixed keyboard layouts of Avro Keyboard ("keyboard-layout"); the
        Bangla XKB layouts of the system are offered as well.
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;
const Cairo = imports.cairo;

let IBus = null;
try { IBus = imports.gi.IBus; } catch (e) {}

/* ─── Search paths ──────────────────────────────────────────────────────── */
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = imports.system.programPath || '';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

// The modules of this tree; the installed ones are the last resort (a
// program that imports the TopBar may have its own in its search path)
if (baseDir !== '/usr/share/avro-linux') {
    imports.searchPath.unshift(baseDir + '/common');
    imports.searchPath.unshift(baseDir + '/avro-core/fixed');
}
imports.searchPath.push('/usr/share/avro-linux/common');
imports.searchPath.push('/usr/share/avro-linux/avro-core/fixed');

// Names and credits of the fixed keyboard layouts
let FixedLayout = null;
try { FixedLayout = imports.fixedlayout; } catch (e) {}

function appVersion() {
    try {
        return imports.evars.get_version();
    } catch (e) {
        return '';
    }
}

const SCHEMA_ID = "com.omicronlab.avro";
const APP_ID = "com.github.avrolinux.AvroTopBar";

/* ═══════════════════════════════════════════════════════════════════════════
   Geometry of the Avro Keyboard 5 default skin (unscaled pixels)
   ═══════════════════════════════════════════════════════════════════════════ */
var BAR_WIDTH = 285;
var BAR_HEIGHT = 30;
var SNAP_BUFFER = 32;

var ELEMENTS = [
    { id: 'logo',   x: 3,   y: 0,  w: 30, h: 30 },
    { id: 'mode',   x: 35,  y: 0,  w: 55, h: 22 },
    { id: 'layout', x: 35,  y: 22, w: 55, h: 8  },
    { id: 'viewer', x: 92,  y: 0,  w: 30, h: 30 },
    { id: 'mouse',  x: 124, y: 0,  w: 30, h: 30 },
    { id: 'tools',  x: 156, y: 0,  w: 30, h: 30 },
    { id: 'web',    x: 188, y: 0,  w: 30, h: 30 },
    { id: 'help',   x: 220, y: 0,  w: 30, h: 30 },
    { id: 'power',  x: 252, y: 0,  w: 30, h: 30 }
];

const TOOLTIPS = {
    logo: "Drag to move TopBar.\nClick for menu.",
    viewer: "View current keyboard layout with Layout Viewer.",
    mouse: "Click and type Bangla with Avro Mouse (onscreen Bangla keyboard).",
    tools: "Tools and settings.",
    web: "Visit Avro Keyboard and OmicronLab on the web",
    help: "Help menu",
    power: "Minimize or exit Avro TopBar"
};

function elementById(id) {
    for (let el of ELEMENTS) {
        if (el.id === id) return el;
    }
    return null;
}

/* Which element is at (x, y), in unscaled bar coordinates. The bar
   background itself has no actions, as on Windows. */
function hitTest(x, y) {
    for (let el of ELEMENTS) {
        if (x >= el.x && x < el.x + el.w && y >= el.y && y < el.y + el.h) {
            return el.id;
        }
    }
    return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pure helpers (unit-tested)
   ═══════════════════════════════════════════════════════════════════════════ */

/* Windows default: top of the screen, 250 px left of the right edge. */
function defaultPosition(area, width, scale) {
    let x = area.x + area.width - width - Math.round(250 * (scale || 1));
    return { x: Math.max(area.x, x), y: area.y };
}

/* Magnetic snap: edges within `buffer` px of the area edges stick to them. */
function snapToEdges(pos, size, area, buffer) {
    let x = pos.x, y = pos.y;
    if (Math.abs(x - area.x) <= buffer) x = area.x;
    if (Math.abs(area.x + area.width - (x + size.width)) <= buffer) x = area.x + area.width - size.width;
    if (Math.abs(y - area.y) <= buffer) y = area.y;
    if (Math.abs(area.y + area.height - (y + size.height)) <= buffer) y = area.y + area.height - size.height;
    return { x: Math.round(x), y: Math.round(y) };
}

function clampToArea(pos, size, area) {
    let x = Math.min(Math.max(pos.x, area.x), area.x + area.width - size.width);
    let y = Math.min(Math.max(pos.y, area.y), area.y + area.height - size.height);
    return { x: Math.round(x), y: Math.round(y) };
}

/* One fade step of at most `step` alpha (0–255) towards `target`. */
function stepAlpha(current, target, step) {
    if (current < target) return Math.min(target, current + step);
    if (current > target) return Math.max(target, current - step);
    return current;
}

function isAvroEngine(name) {
    return name === 'ibus-avro' || name === 'avro-phonetic';
}

/* Is Bangla being typed? With Avro Phonetic it is Avro's own mode; with a
   fixed Bangla layout it is Bangla by definition; anything else is English.
   Without an IBus connection the Avro mode setting is all we know. */
function isBanglaMode(engine, avroBangla, fixedNames) {
    if (!engine || isAvroEngine(engine)) {
        return !!avroBangla;
    }
    return (fixedNames || []).indexOf(engine) !== -1;
}

/* The keyboard to use for English when a fixed Bangla layout is active:
   the user's first non-Bangla IBus keyboard, else US English. */
function pickEnglishEngine(preloadEngines, banglaNames) {
    for (let name of preloadEngines || []) {
        if (!isAvroEngine(name) && (banglaNames || []).indexOf(name) === -1) {
            return name;
        }
    }
    return 'xkb:us::eng';
}

/* The X keyboard layout an IBus engine types with: "xkb:LAYOUT:VARIANT:LANG"
   engines carry it in their name; Avro Phonetic types on the US layout.
   Other engines (unknown here) are left alone. */
function xkbLayoutFor(engine) {
    if (isAvroEngine(engine)) {
        return { layout: 'us', variant: '' };
    }
    if (engine && engine.indexOf('xkb:') === 0) {
        let parts = engine.split(':');
        if (parts.length >= 3 && parts[1]) {
            return { layout: parts[1], variant: parts[2] || '' };
        }
    }
    return null;
}

var AVRO_LAYOUT_LABEL = 'Avro Phonetic (English to Bangla)';

/* The keyboard layouts the TopBar offers. Avro's own come first, as in
   Avro Keyboard: Avro Phonetic, then its fixed layouts (Avro Easy, Bornona,
   Munir Optima, National (Jatiya), Probhat), all typed by the Avro engine.
   The Bangla XKB layouts of the system follow (another IBus keyboard each).
   Entry: { id, name (IBus engine), avroLayout ("keyboard-layout" value or
   null), label, avro, primary, ... }.
   `descs`: [{ name, language, longname, layout, variant, description }]. */
function buildLayoutCatalog(descs) {
    let catalog = [{ id: 'ibus-avro', name: 'ibus-avro', avroLayout: 'phonetic',
                     label: AVRO_LAYOUT_LABEL, avro: true, primary: true }];
    if (FixedLayout) {
        for (let id of FixedLayout.layoutIds()) {
            let info = FixedLayout.getLayout(id);
            catalog.push({ id: 'avro:' + id, name: 'ibus-avro', avroLayout: id,
                           label: info.name, avro: true, primary: true, info: info });
        }
    }
    let system = [];
    for (let d of descs || []) {
        if (!d || !d.name || isAvroEngine(d.name)) continue;
        if (d.name.indexOf('xkb:') !== 0 || d.language !== 'bn') continue;
        system.push({
            id: d.name,
            name: d.name,
            avroLayout: null,
            label: d.longname || d.name,
            avro: false,
            primary: false,
            layout: d.layout || '',
            variant: d.variant || '',
            description: d.description || d.longname || ''
        });
    }
    system.sort((a, b) => a.label.localeCompare(b.label));
    return catalog.concat(system);
}

/* Avro Keyboard starts with Windows unless the user turns that off. The
   TopBar does the same: the first time it runs it adds itself to the
   programs that start on login; after that only the user's choice counts. */
function setUpStartOnLogin(settings) {
    if (!settings.has('topbar-autostart-done') || settings.get('topbar-autostart-done', true)) {
        return false;
    }
    let autostart = null;
    try { autostart = imports.autostart; } catch (e) { return false; }
    let ok = autostart.hasEntry() || autostart.setEnabled(true);
    if (ok) settings.set('topbar-autostart-done', true);
    return ok;
}

/* Runs a command line: [succeeded (exit status 0), standard output]. */
function runCommand(cmd) {
    try {
        let [ok, out, , status] = GLib.spawn_command_line_sync(cmd);
        return [ok && status === 0, ok && out ? new TextDecoder('utf-8').decode(out) : ''];
    } catch (e) {
        return [false, ''];
    }
}

/* The TopBar types through IBus, so IBus must run in this session and know
   the Avro engine. This starts IBus when it is not running and reloads it
   when it was started before Avro was installed. It changes no settings: the
   user's keyboard list and IBus' own options are the user's (adding Avro to
   the list is offered once, see offerKeyboardList). */
function ensureIBusRunning() {
    // 'ibus list-engine' needs this session's IBus, unlike pgrep, which
    // also finds the IBus of other users and sessions
    let [running, engines] = runCommand("ibus list-engine");
    if (!running) {
        // GNOME Shell starts and manages IBus itself; the TopBar connects as
        // soon as it is there. Elsewhere IBus is started in the background:
        // "ibus start" would never return, it stays in the foreground as the
        // daemon.
        let gnome = (GLib.getenv("XDG_CURRENT_DESKTOP") || "").toUpperCase().indexOf("GNOME") !== -1;
        if (!gnome) {
            try { GLib.spawn_command_line_async("ibus-daemon -drx"); } catch (e) {}
        }
    } else if (engines.indexOf("ibus-avro") === -1) {
        runCommand("ibus write-cache");
        runCommand("ibus restart");
    }
}

/* Is Avro in the keyboard list the desktop offers? GNOME keeps its own list
   (input sources); other desktops show IBus' preload engines. */
function avroInKeyboardList() {
    let gnome = (GLib.getenv("XDG_CURRENT_DESKTOP") || "").toUpperCase().indexOf("GNOME") !== -1;
    if (gnome) {
        let sources = new SafeSettings('org.gnome.desktop.input-sources');
        if (sources.has('sources')) return sources.get('sources', []).some(s => s[1] === 'ibus-avro');
    }
    return new SafeSettings('org.freedesktop.ibus.general').get('preload-engines', []).indexOf('ibus-avro') !== -1;
}

/* Adds Avro at the end of the user's keyboard lists: their own first
   keyboard stays the default. */
function addAvroToKeyboardList() {
    let ibusGeneral = new SafeSettings('org.freedesktop.ibus.general');
    let pe = ibusGeneral.get('preload-engines', []);
    if (ibusGeneral.has('preload-engines') && pe.indexOf('ibus-avro') === -1) {
        if (pe.length === 0) pe.push('xkb:us::eng');
        pe.push('ibus-avro');
        ibusGeneral.set('preload-engines', pe);
    }
    let gnome = new SafeSettings('org.gnome.desktop.input-sources');
    if (gnome.has('sources')) {
        let sources = gnome.get('sources', []);
        if (!sources.some(s => s[1] === 'ibus-avro')) {
            if (sources.length === 0) sources.push(['xkb', 'us']);
            sources.push(['ibus', 'ibus-avro']);
            try {
                gnome.settings.set_value('sources', new GLib.Variant('a(ss)', sources));
            } catch (e) {}
        }
    }
    Gio.Settings.sync();
}

/* Asked once per user (the installer no longer changes anyone's keyboards):
   add Avro to the desktop's keyboard list as well. */
function offerKeyboardList(bar) {
    let s = bar.settings;
    if (!s.has('keyboard-list-offered') || s.get('keyboard-list-offered', true)) return;
    s.set('keyboard-list-offered', true);
    if (avroInKeyboardList()) return;
    let dlg = new Gtk.MessageDialog({
        modal: false,
        message_type: Gtk.MessageType.QUESTION,
        buttons: Gtk.ButtonsType.NONE,
        text: "Add Avro to your keyboard list?",
        secondary_text: "The Avro TopBar switches between বাংলা and English by itself. " +
                        "If Avro Phonetic is also in your keyboard list, your desktop's own " +
                        "keyboard switcher can use it too.\n\n" +
                        "You can change this any time in your keyboard settings."
    });
    dlg.set_title("Avro Keyboard");
    dlg.add_button("Not Now", Gtk.ResponseType.CANCEL);
    dlg.add_button("Add Avro", Gtk.ResponseType.OK);
    dlg.set_default_response(Gtk.ResponseType.OK);
    dlg.set_keep_above(true);
    dlg.connect('response', (d, response) => {
        if (response === Gtk.ResponseType.OK) addAvroToKeyboardList();
        d.destroy();
    });
    dlg.show_all();
}

/* Avro Keyboard command-line switches: toggle, bn, sys, minimize, restore —
   bare or prefixed with /, - or --. */
function parseTopBarCommand(args) {
    const known = ['toggle', 'bn', 'sys', 'minimize', 'restore'];
    for (let a of args || []) {
        let s = String(a).toLowerCase().replace(/^(--|-|\/)/, '');
        if (known.indexOf(s) !== -1) return s;
    }
    return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Settings that never abort the process when a schema or key is missing
   ═══════════════════════════════════════════════════════════════════════════ */
var SafeSettings = class SafeSettings {
    constructor(schemaId) {
        this.settings = null;
        this.schema = null;
        try {
            let source = Gio.SettingsSchemaSource.get_default();
            let schema = source ? source.lookup(schemaId, true) : null;
            if (schema) {
                this.schema = schema;
                this.settings = new Gio.Settings({ settings_schema: schema });
            }
        } catch (e) {}
    }

    has(key) {
        return !!this.schema && this.schema.has_key(key);
    }

    get(key, fallback) {
        if (!this.has(key)) return fallback;
        try {
            return this.settings.get_value(key).deep_unpack();
        } catch (e) {
            return fallback;
        }
    }

    set(key, value) {
        if (!this.has(key)) return;
        try {
            let type = this.settings.get_value(key).get_type_string();
            if (type === 'b') this.settings.set_boolean(key, !!value);
            else if (type === 'i') this.settings.set_int(key, Math.round(value));
            else if (type === 's') this.settings.set_string(key, String(value));
            else if (type === 'as') this.settings.set_strv(key, value);
        } catch (e) {}
    }

    connect(key, callback) {
        if (this.has(key)) {
            this.settings.connect('changed::' + key, callback);
        }
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
   Skins (original artwork; colours as [r, g, b, a])
   ═══════════════════════════════════════════════════════════════════════════ */
const RED_HOVER = { top: [1.0, 0.56, 0.52, 0.62], mid: [0.86, 0.20, 0.16, 0.52], bottom: [0.60, 0.05, 0.05, 0.58], border: [1.0, 0.68, 0.64, 0.92] };
const RED_DOWN = { top: [0.45, 0.04, 0.04, 0.90], mid: [0.55, 0.07, 0.06, 0.86], bottom: [0.70, 0.12, 0.10, 0.82], border: [0.95, 0.45, 0.42, 0.95] };

var SKINS = {
    classic: {
        title: 'Avro Classic',
        comment: 'Dark glossy bar laid out like the Avro Keyboard 5 TopBar. Original artwork for Linux.',
        bg: [[0, [0.24, 0.26, 0.29, 1]], [0.47, [0.10, 0.11, 0.13, 1]], [0.5, [0.04, 0.045, 0.055, 1]], [1, [0.01, 0.012, 0.02, 1]]],
        gloss: [0.16, 0.03], glow: [0.15, 0.45, 1.0, 0.30], border: [0, 0, 0, 0.95],
        text: [1, 1, 1, 1], icons: 'light',
        hover: { top: [0.50, 0.75, 1.0, 0.62], mid: [0.20, 0.50, 0.95, 0.50], bottom: [0.05, 0.30, 0.75, 0.56], border: [0.62, 0.83, 1.0, 0.92] },
        down: { top: [0.05, 0.16, 0.38, 0.90], mid: [0.08, 0.22, 0.48, 0.86], bottom: [0.12, 0.32, 0.62, 0.82], border: [0.35, 0.60, 0.95, 0.95] },
        exitHover: RED_HOVER, exitDown: RED_DOWN
    },
    royal: {
        title: 'Avro Royal Blue',
        comment: 'Deep blue glossy bar with gold highlights.',
        bg: [[0, [0.18, 0.34, 0.64, 1]], [0.48, [0.07, 0.17, 0.40, 1]], [0.5, [0.04, 0.11, 0.30, 1]], [1, [0.02, 0.06, 0.18, 1]]],
        gloss: [0.20, 0.04], glow: [0.95, 0.75, 0.25, 0.20], border: [0.01, 0.03, 0.10, 1],
        text: [1, 1, 1, 1], icons: 'light',
        hover: { top: [1.0, 0.92, 0.58, 0.58], mid: [0.92, 0.70, 0.20, 0.46], bottom: [0.70, 0.45, 0.05, 0.50], border: [1.0, 0.88, 0.55, 0.92] },
        down: { top: [0.40, 0.28, 0.02, 0.86], mid: [0.52, 0.36, 0.04, 0.82], bottom: [0.66, 0.46, 0.08, 0.78], border: [1.0, 0.80, 0.40, 0.95] },
        exitHover: RED_HOVER, exitDown: RED_DOWN
    },
    mint: {
        title: 'Avro Flat Mint',
        comment: 'Flat mint-green bar.',
        bg: [[0, [0.22, 0.76, 0.63, 1]], [1, [0.13, 0.62, 0.50, 1]]],
        gloss: null, glow: null, border: [0.08, 0.45, 0.36, 1],
        text: [1, 1, 1, 1], icons: 'light',
        hover: { top: [1, 1, 1, 0.34], mid: [1, 1, 1, 0.28], bottom: [1, 1, 1, 0.22], border: [1, 1, 1, 0.65] },
        down: { top: [0, 0, 0, 0.22], mid: [0, 0, 0, 0.20], bottom: [0, 0, 0, 0.18], border: [1, 1, 1, 0.55] },
        exitHover: RED_HOVER, exitDown: RED_DOWN
    },
    light: {
        title: 'Avro Paper Light',
        comment: 'Light grey bar with dark icons.',
        bg: [[0, [0.99, 0.99, 0.99, 1]], [0.5, [0.93, 0.93, 0.94, 1]], [0.51, [0.89, 0.89, 0.90, 1]], [1, [0.84, 0.85, 0.86, 1]]],
        gloss: [0.50, 0.0], glow: null, border: [0.55, 0.57, 0.60, 1],
        text: [0.13, 0.15, 0.18, 1], icons: 'dark',
        hover: { top: [0.86, 0.94, 1.0, 0.96], mid: [0.76, 0.88, 1.0, 0.94], bottom: [0.68, 0.84, 1.0, 0.92], border: [0.40, 0.62, 0.90, 1] },
        down: { top: [0.62, 0.78, 0.95, 1], mid: [0.58, 0.75, 0.94, 1], bottom: [0.54, 0.72, 0.92, 1], border: [0.30, 0.50, 0.80, 1] },
        exitHover: { top: [1.0, 0.88, 0.88, 0.96], mid: [1.0, 0.78, 0.78, 0.94], bottom: [1.0, 0.70, 0.70, 0.92], border: [0.85, 0.35, 0.35, 1] },
        exitDown: { top: [0.95, 0.62, 0.62, 1], mid: [0.92, 0.55, 0.55, 1], bottom: [0.90, 0.50, 0.50, 1], border: [0.70, 0.25, 0.25, 1] }
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
   Drawing helpers
   ═══════════════════════════════════════════════════════════════════════════ */
function setColor(cr, c) {
    cr.setSourceRGBA(c[0], c[1], c[2], c[3] === undefined ? 1 : c[3]);
}

function addStop(pattern, offset, c) {
    pattern.addColorStopRGBA(offset, c[0], c[1], c[2], c[3] === undefined ? 1 : c[3]);
}

function roundedRect(cr, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    cr.newSubPath();
    if (r === 0) {
        cr.rectangle(x, y, w, h);
        return;
    }
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
    cr.closePath();
}

function textLayout(cr, text, family, sizePx) {
    let layout = PangoCairo.create_layout(cr);
    let desc = Pango.FontDescription.from_string(family);
    desc.set_absolute_size(sizePx * Pango.SCALE);
    layout.set_font_description(desc);
    layout.set_text(text, -1);
    return layout;
}

/* Centre the ink of a layout in a box and return the origin to draw at. */
function centeredOrigin(layout, x, y, w, h) {
    let [ink] = layout.get_pixel_extents();
    return [x + (w - ink.width) / 2 - ink.x, y + (h - ink.height) / 2 - ink.y];
}

function drawBarBackground(cr, w, h, skin, radius) {
    let g = new Cairo.LinearGradient(0, 0, 0, h);
    for (let [offset, c] of skin.bg) addStop(g, offset, c);
    roundedRect(cr, 0.5, 0.5, w - 1, h - 1, radius);
    cr.setSource(g);
    cr.fillPreserve();
    setColor(cr, skin.border);
    cr.setLineWidth(1);
    cr.stroke();

    if (skin.glow) {
        let gw = new Cairo.LinearGradient(0, h * 0.55, 0, h);
        gw.addColorStopRGBA(0, skin.glow[0], skin.glow[1], skin.glow[2], 0);
        gw.addColorStopRGBA(1, skin.glow[0], skin.glow[1], skin.glow[2], skin.glow[3]);
        roundedRect(cr, 1.5, h * 0.55, w - 3, h * 0.45 - 1.5, Math.max(0, radius - 1));
        cr.setSource(gw);
        cr.fill();
    }
    if (skin.gloss) {
        let gl = new Cairo.LinearGradient(0, 1, 0, h / 2);
        gl.addColorStopRGBA(0, 1, 1, 1, skin.gloss[0]);
        gl.addColorStopRGBA(1, 1, 1, 1, skin.gloss[1]);
        roundedRect(cr, 1.5, 1.5, w - 3, h / 2 - 1, Math.max(0, radius - 1));
        cr.setSource(gl);
        cr.fill();
    }
}

function drawFrame(cr, el, style, alpha) {
    if (alpha <= 0) return;
    let x = el.x + 1, y = el.y + 1, w = el.w - 2, h = el.h - 2, r = Math.min(3.5, h / 2);
    cr.save();
    cr.pushGroup();
    let g = new Cairo.LinearGradient(0, y, 0, y + h);
    addStop(g, 0, style.top);
    addStop(g, 0.5, style.mid);
    addStop(g, 1, style.bottom);
    roundedRect(cr, x + 0.5, y + 0.5, w - 1, h - 1, r);
    cr.setSource(g);
    cr.fillPreserve();
    setColor(cr, style.border);
    cr.setLineWidth(1);
    cr.stroke();
    if (h > 10) {
        let hl = new Cairo.LinearGradient(0, y + 1, 0, y + h / 2);
        hl.addColorStopRGBA(0, 1, 1, 1, 0.34);
        hl.addColorStopRGBA(1, 1, 1, 1, 0.04);
        roundedRect(cr, x + 1.5, y + 1.5, w - 3, h / 2 - 1.5, Math.max(0, r - 1));
        cr.setSource(hl);
        cr.fill();
    }
    cr.popGroupToSource();
    cr.paintWithAlpha(alpha);
    cr.restore();
}

/* ─── Icons, drawn on a 24×24 grid ─────────────────────────────────────── */

function iconKeyboard(cr, v) {
    let body = new Cairo.LinearGradient(0, 7, 0, 18);
    if (v === 'light') {
        body.addColorStopRGBA(0, 1, 1, 1, 1);
        body.addColorStopRGBA(1, 0.70, 0.73, 0.78, 1);
    } else {
        body.addColorStopRGBA(0, 0.46, 0.50, 0.56, 1);
        body.addColorStopRGBA(1, 0.24, 0.27, 0.32, 1);
    }
    roundedRect(cr, 1.5, 7, 21, 11, 2.2);
    cr.setSource(body);
    cr.fillPreserve();
    cr.setSourceRGBA(0, 0, 0, v === 'light' ? 0.55 : 0.75);
    cr.setLineWidth(0.8);
    cr.stroke();
    if (v === 'light') cr.setSourceRGBA(0.24, 0.27, 0.32, 0.9);
    else cr.setSourceRGBA(0.93, 0.95, 0.97, 0.95);
    for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 7; i++) {
            cr.rectangle(3.5 + i * 2.45 + (row ? 1.1 : 0), 9 + row * 2.5, 1.55, 1.45);
        }
    }
    cr.rectangle(7, 14.4, 10, 1.5);
    cr.fill();
}

function iconMouse(cr, v) {
    let g = new Cairo.LinearGradient(7, 0, 17, 0);
    if (v === 'light') {
        g.addColorStopRGBA(0, 0.78, 0.81, 0.86, 1);
        g.addColorStopRGBA(0.45, 1, 1, 1, 1);
        g.addColorStopRGBA(1, 0.66, 0.70, 0.76, 1);
    } else {
        g.addColorStopRGBA(0, 0.30, 0.33, 0.38, 1);
        g.addColorStopRGBA(0.45, 0.52, 0.56, 0.62, 1);
        g.addColorStopRGBA(1, 0.24, 0.27, 0.32, 1);
    }
    roundedRect(cr, 7, 2.5, 10, 19, 5);
    cr.setSource(g);
    cr.fillPreserve();
    cr.setSourceRGBA(0, 0, 0, v === 'light' ? 0.55 : 0.75);
    cr.setLineWidth(0.8);
    cr.stroke();
    cr.setSourceRGBA(v === 'light' ? 0 : 1, v === 'light' ? 0 : 1, v === 'light' ? 0 : 1, 0.45);
    cr.setLineWidth(0.7);
    cr.moveTo(12, 3);
    cr.lineTo(12, 10);
    cr.moveTo(7.3, 10);
    cr.lineTo(16.7, 10);
    cr.stroke();
    roundedRect(cr, 11.1, 4.8, 1.8, 3.4, 0.9);
    if (v === 'light') cr.setSourceRGBA(0.25, 0.28, 0.33, 0.95);
    else cr.setSourceRGBA(0.90, 0.92, 0.95, 0.95);
    cr.fill();
}

function iconGear(cr, v) {
    let cx = 12, cy = 12, R = 10, r = 7.4, teeth = 8;
    let half = Math.PI / teeth;
    cr.newPath();
    for (let i = 0; i < teeth; i++) {
        let a = (i / teeth) * 2 * Math.PI;
        let pts = [[a - half, r], [a - half * 0.52, r], [a - half * 0.34, R], [a + half * 0.34, R], [a + half * 0.52, r]];
        pts.forEach(([ang, rad], k) => {
            let x = cx + rad * Math.cos(ang), y = cy + rad * Math.sin(ang);
            if (i === 0 && k === 0) cr.moveTo(x, y);
            else cr.lineTo(x, y);
        });
    }
    cr.closePath();
    cr.newSubPath();
    cr.arc(cx, cy, 3.2, 0, 2 * Math.PI);
    cr.setFillRule(Cairo.FillRule.EVEN_ODD);
    let g = new Cairo.LinearGradient(0, 2, 0, 22);
    if (v === 'light') {
        g.addColorStopRGBA(0, 0.82, 0.88, 0.96, 1);
        g.addColorStopRGBA(1, 0.40, 0.50, 0.64, 1);
    } else {
        g.addColorStopRGBA(0, 0.50, 0.57, 0.68, 1);
        g.addColorStopRGBA(1, 0.26, 0.31, 0.41, 1);
    }
    cr.setSource(g);
    cr.fillPreserve();
    cr.setSourceRGBA(0, 0, 0, 0.5);
    cr.setLineWidth(0.7);
    cr.stroke();
    cr.setFillRule(Cairo.FillRule.WINDING);
}

function blueBall(cr, cx, cy, R) {
    let g = new Cairo.RadialGradient(cx - 3, cy - 4, 1, cx, cy, R + 1.5);
    g.addColorStopRGBA(0, 0.64, 0.87, 1, 1);
    g.addColorStopRGBA(0.6, 0.13, 0.48, 0.90, 1);
    g.addColorStopRGBA(1, 0.04, 0.25, 0.56, 1);
    cr.arc(cx, cy, R, 0, 2 * Math.PI);
    cr.setSource(g);
    cr.fillPreserve();
    cr.setSourceRGBA(0, 0.10, 0.30, 0.75);
    cr.setLineWidth(0.8);
    cr.stroke();
}

function gloss(cr, cx, cy, rx, ry, a) {
    let gl = new Cairo.LinearGradient(0, cy - ry, 0, cy + ry);
    gl.addColorStopRGBA(0, 1, 1, 1, a);
    gl.addColorStopRGBA(1, 1, 1, 1, 0);
    cr.save();
    cr.translate(cx, cy);
    cr.scale(rx, ry);
    cr.arc(0, 0, 1, 0, 2 * Math.PI);
    cr.restore();
    cr.setSource(gl);
    cr.fill();
}

function iconGlobe(cr) {
    let cx = 12, cy = 12, R = 9.5;
    blueBall(cr, cx, cy, R);
    cr.save();
    cr.arc(cx, cy, R - 0.4, 0, 2 * Math.PI);
    cr.clip();
    cr.setSourceRGBA(1, 1, 1, 0.85);
    cr.setLineWidth(1.0);
    cr.save();
    cr.translate(cx, cy);
    cr.scale(0.45, 1);
    cr.arc(0, 0, R, 0, 2 * Math.PI);
    cr.restore();
    cr.stroke();
    cr.moveTo(cx, cy - R);
    cr.lineTo(cx, cy + R);
    cr.moveTo(cx - R, cy);
    cr.lineTo(cx + R, cy);
    cr.stroke();
    cr.setLineWidth(0.8);
    cr.moveTo(cx - R, cy - 4.8);
    cr.lineTo(cx + R, cy - 4.8);
    cr.moveTo(cx - R, cy + 4.8);
    cr.lineTo(cx + R, cy + 4.8);
    cr.stroke();
    cr.restore();
    gloss(cr, cx, 7.4, 6.5, 3.6, 0.42);
}

function iconHelp(cr) {
    blueBall(cr, 12, 12, 9.5);
    let layout = textLayout(cr, '?', 'Sans Bold', 15);
    let [ox, oy] = centeredOrigin(layout, 0, 0, 24, 24);
    cr.setSourceRGBA(1, 1, 1, 1);
    cr.moveTo(ox, oy);
    PangoCairo.show_layout(cr, layout);
    gloss(cr, 12, 7.4, 6.5, 3.6, 0.38);
}

function iconPower(cr, v) {
    if (v === 'light') cr.setSourceRGBA(1, 1, 1, 0.96);
    else cr.setSourceRGBA(0.26, 0.29, 0.33, 1);
    cr.setLineCap(Cairo.LineCap.ROUND);
    cr.setLineWidth(2.3);
    cr.arc(12, 12.8, 7.3, -Math.PI / 2 + 0.62, 1.5 * Math.PI - 0.62);
    cr.stroke();
    cr.moveTo(12, 3.6);
    cr.lineTo(12, 11.4);
    cr.stroke();
    cr.setLineCap(Cairo.LineCap.BUTT);
}

function coloredBall(cr, c0, c1) {
    let g = new Cairo.LinearGradient(0, 2.5, 0, 21.5);
    addStop(g, 0, c0);
    addStop(g, 1, c1);
    cr.arc(12, 12, 9.5, 0, 2 * Math.PI);
    cr.setSource(g);
    cr.fillPreserve();
    cr.setSourceRGBA(0, 0, 0, 0.35);
    cr.setLineWidth(0.8);
    cr.stroke();
}

function iconExit(cr) {
    coloredBall(cr, [0.98, 0.42, 0.38, 1], [0.74, 0.08, 0.06, 1]);
    cr.setSourceRGBA(1, 1, 1, 1);
    cr.setLineCap(Cairo.LineCap.ROUND);
    cr.setLineWidth(2.3);
    cr.moveTo(8.5, 8.5);
    cr.lineTo(15.5, 15.5);
    cr.moveTo(15.5, 8.5);
    cr.lineTo(8.5, 15.5);
    cr.stroke();
    cr.setLineCap(Cairo.LineCap.BUTT);
}

function arrowLine(cr, x0, y, x1) {
    let d = x1 > x0 ? 1 : -1;
    cr.moveTo(x0, y);
    cr.lineTo(x1, y);
    cr.moveTo(x1 - d * 3, y - 2.6);
    cr.lineTo(x1, y);
    cr.lineTo(x1 - d * 3, y + 2.6);
}

function iconToggle(cr) {
    coloredBall(cr, [0.52, 0.86, 0.40, 1], [0.18, 0.58, 0.14, 1]);
    cr.setSourceRGBA(1, 1, 1, 1);
    cr.setLineCap(Cairo.LineCap.ROUND);
    cr.setLineJoin(Cairo.LineJoin.ROUND);
    cr.setLineWidth(1.9);
    arrowLine(cr, 6.8, 9.5, 17);
    arrowLine(cr, 17.2, 14.5, 7);
    cr.stroke();
    cr.setLineCap(Cairo.LineCap.BUTT);
}

function iconDocument(cr, v, pdf) {
    cr.moveTo(5, 2.5);
    cr.lineTo(14.5, 2.5);
    cr.lineTo(19, 7);
    cr.lineTo(19, 21.5);
    cr.lineTo(5, 21.5);
    cr.closePath();
    cr.setSourceRGBA(0.99, 0.99, 1, 1);
    cr.fillPreserve();
    cr.setSourceRGBA(0.30, 0.33, 0.38, 1);
    cr.setLineWidth(0.9);
    cr.stroke();
    cr.moveTo(14.5, 2.5);
    cr.lineTo(14.5, 7);
    cr.lineTo(19, 7);
    cr.stroke();
    cr.setSourceRGBA(0.45, 0.50, 0.58, 1);
    cr.setLineWidth(1);
    for (let y = 10; y <= 18; y += 2.6) {
        cr.moveTo(7.5, y);
        cr.lineTo(16.5, y);
    }
    cr.stroke();
    if (pdf) {
        cr.rectangle(3.2, 14, 12, 5.6);
        cr.setSourceRGBA(0.82, 0.10, 0.08, 1);
        cr.fill();
    }
}

function iconDoctor(cr) {
    coloredBall(cr, [0.40, 0.85, 0.65, 1], [0.08, 0.55, 0.38, 1]);
    cr.setSourceRGBA(1, 1, 1, 1);
    cr.rectangle(10.3, 6.5, 3.4, 11);
    cr.rectangle(6.5, 10.3, 11, 3.4);
    cr.fill();
}

function iconTile(cr, text, family, c0, c1) {
    let g = new Cairo.LinearGradient(0, 2, 0, 22);
    addStop(g, 0, c0);
    addStop(g, 1, c1);
    roundedRect(cr, 2, 2, 20, 20, 4);
    cr.setSource(g);
    cr.fillPreserve();
    cr.setSourceRGBA(0, 0, 0, 0.35);
    cr.setLineWidth(0.8);
    cr.stroke();
    let layout = textLayout(cr, text, family, 15);
    let [ox, oy] = centeredOrigin(layout, 2, 2, 20, 20);
    cr.setSourceRGBA(1, 1, 1, 1);
    cr.moveTo(ox, oy);
    PangoCairo.show_layout(cr, layout);
}

function iconBadge(cr, mainText, isBangla) {
    let g = new Cairo.LinearGradient(2, 2, 2, 22);
    if (isBangla) {
        g.addColorStopRGBA(0, 0.05, 0.45, 0.85, 1);
        g.addColorStopRGBA(1, 0.02, 0.28, 0.62, 1);
    } else {
        g.addColorStopRGBA(0, 0.35, 0.39, 0.46, 1);
        g.addColorStopRGBA(1, 0.18, 0.21, 0.26, 1);
    }
    roundedRect(cr, 1.5, 1.5, 21, 21, 4.5);
    cr.setSource(g);
    cr.fillPreserve();
    cr.setSourceRGBA(isBangla ? 0.35 : 0.60, isBangla ? 0.70 : 0.65, isBangla ? 1.0 : 0.75, 0.85);
    cr.setLineWidth(1.0);
    cr.stroke();

    let lMain = textLayout(cr, mainText, 'Noto Sans Bold', 11);
    let [ox, oy] = centeredOrigin(lMain, 2, 2, 20, 20);
    cr.setSourceRGBA(0, 0, 0, 0.55);
    cr.moveTo(ox + 0.8, oy + 0.8);
    PangoCairo.show_layout(cr, lMain);
    cr.setSourceRGBA(1, 1, 1, 1);
    cr.moveTo(ox, oy);
    PangoCairo.show_layout(cr, lMain);
}

var ICONS = {
    keyboard: iconKeyboard,
    mouse: iconMouse,
    gear: iconGear,
    globe: (cr) => iconGlobe(cr),
    help: (cr) => iconHelp(cr),
    power: iconPower,
    exit: (cr) => iconExit(cr),
    toggle: (cr) => iconToggle(cr),
    document: (cr, v) => iconDocument(cr, v, false),
    pdf: (cr, v) => iconDocument(cr, v, true),
    doctor: (cr) => iconDoctor(cr),
    bangla: (cr) => iconBadge(cr, 'BN', true),
    english: (cr) => iconBadge(cr, 'EN', false)
};

function drawIcon(cr, name, x, y, size, variant) {
    let fn = ICONS[name];
    if (!fn) return;
    cr.save();
    cr.translate(x, y);
    cr.scale(size / 24, size / 24);
    fn(cr, variant || 'light');
    cr.restore();
}

function iconPixbuf(name, size, variant) {
    size = Math.max(8, Math.round(size));
    let surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, size, size);
    let cr = new Cairo.Context(surface);
    drawIcon(cr, name, 0, 0, size, variant || 'dark');
    let pixbuf = Gdk.pixbuf_get_from_surface(surface, 0, 0, size, size);
    surface.finish();
    return pixbuf;
}

function drawLogo(cr, el) {
    let layout = textLayout(cr, 'অ', 'Noto Sans Bengali Bold', 21);
    let [ox, oy] = centeredOrigin(layout, el.x, el.y, el.w, el.h);
    cr.save();
    cr.moveTo(ox, oy);
    PangoCairo.layout_path(cr, layout);
    let g = new Cairo.LinearGradient(0, el.y + 5, 0, el.y + el.h - 5);
    g.addColorStopRGBA(0, 1, 0.96, 0.66, 1);
    g.addColorStopRGBA(0.5, 1, 0.80, 0.18, 1);
    g.addColorStopRGBA(1, 0.95, 0.50, 0.0, 1);
    cr.setSource(g);
    cr.fillPreserve();
    cr.setSourceRGBA(0.30, 0.14, 0, 0.9);
    cr.setLineWidth(0.9);
    cr.stroke();
    cr.restore();
}

function drawModeLabel(cr, el, bangla, skin, isAnsi) {
    cr.save();

    let bx = el.x + 2;
    let by = el.y + 2;
    let bw = el.w - 4;
    let bh = el.h - 4;
    let radius = 4;

    // Pill badge outline
    cr.newSubPath();
    cr.arc(bx + bw - radius, by + radius, radius, -Math.PI / 2, 0);
    cr.arc(bx + bw - radius, by + bh - radius, radius, 0, Math.PI / 2);
    cr.arc(bx + radius, by + bh - radius, radius, Math.PI / 2, Math.PI);
    cr.arc(bx + radius, by + radius, radius, Math.PI, 3 * Math.PI / 2);
    cr.closePath();

    if (bangla) {
        let g = new Cairo.LinearGradient(bx, by, bx, by + bh);
        if (isAnsi) {
            // ANSI mode: distinctive ruby / amber glow
            g.addColorStopRGBA(0, 0.78, 0.22, 0.12, 0.95);
            g.addColorStopRGBA(1, 0.48, 0.10, 0.05, 0.95);
        } else {
            // Avro Bangla active mode: rich Avro Blue gradient
            g.addColorStopRGBA(0, 0.05, 0.45, 0.85, 0.95);
            g.addColorStopRGBA(1, 0.02, 0.28, 0.62, 0.95);
        }
        cr.setSource(g);
        cr.fillPreserve();

        if (isAnsi) {
            cr.setSourceRGBA(1.0, 0.75, 0.25, 0.90);
        } else {
            cr.setSourceRGBA(0.35, 0.70, 1.0, 0.75);
        }
        cr.setLineWidth(1.0);
        cr.stroke();

        let lMain = textLayout(cr, 'BN', 'Noto Sans Bold', 9.0);
        let lSub = isAnsi
            ? textLayout(cr, 'ANSI', 'Noto Sans Bold', 7.0)
            : textLayout(cr, 'বাং', 'Noto Sans Bengali Bold', 8.5);

        let [, mw, mh] = [0, lMain.get_pixel_size()[0], lMain.get_pixel_size()[1]];
        let [, sw, sh] = [0, lSub.get_pixel_size()[0], lSub.get_pixel_size()[1]];
        let totalW = mw + 3 + sw;
        let startX = bx + (bw - totalW) / 2;
        let startY = by + (bh - mh) / 2;

        // Shadow
        cr.setSourceRGBA(0, 0, 0, 0.45);
        cr.moveTo(startX + 0.8, startY + 0.8);
        PangoCairo.show_layout(cr, lMain);
        cr.moveTo(startX + mw + 3 + 0.8, startY + (mh - sh) / 2 + 0.8);
        PangoCairo.show_layout(cr, lSub);

        // BN in white
        cr.setSourceRGBA(1.0, 1.0, 1.0, 1.0);
        cr.moveTo(startX, startY);
        PangoCairo.show_layout(cr, lMain);

        // Sublabel: 'ANSI' in vibrant gold, or 'বাং' in warm Avro amber
        if (isAnsi) {
            cr.setSourceRGBA(1.0, 0.90, 0.35, 1.0);
        } else {
            cr.setSourceRGBA(1.0, 0.86, 0.38, 1.0);
        }
        cr.moveTo(startX + mw + 3, startY + (mh - sh) / 2);
        PangoCairo.show_layout(cr, lSub);
    } else {
        // English mode: subtle frosted/neutral badge
        let g = new Cairo.LinearGradient(bx, by, bx, by + bh);
        if (skin.icons === 'light') {
            g.addColorStopRGBA(0, 0.24, 0.27, 0.33, 0.85);
            g.addColorStopRGBA(1, 0.16, 0.18, 0.23, 0.85);
            cr.setSource(g);
            cr.fillPreserve();

            cr.setSourceRGBA(0.50, 0.55, 0.65, 0.5);
            cr.setLineWidth(0.9);
            cr.stroke();
        } else {
            g.addColorStopRGBA(0, 0.94, 0.95, 0.97, 0.95);
            g.addColorStopRGBA(1, 0.84, 0.86, 0.90, 0.95);
            cr.setSource(g);
            cr.fillPreserve();

            cr.setSourceRGBA(0.60, 0.65, 0.72, 0.7);
            cr.setLineWidth(0.9);
            cr.stroke();
        }

        let lMain = textLayout(cr, 'EN', 'Noto Sans Bold', 9.5);
        let lSub = textLayout(cr, 'Eng', 'Noto Sans', 8.0);

        let [, mw, mh] = [0, lMain.get_pixel_size()[0], lMain.get_pixel_size()[1]];
        let [, sw, sh] = [0, lSub.get_pixel_size()[0], lSub.get_pixel_size()[1]];
        let totalW = mw + 3 + sw;
        let startX = bx + (bw - totalW) / 2;
        let startY = by + (bh - mh) / 2;

        if (skin.icons === 'light') {
            cr.setSourceRGBA(0.95, 0.96, 0.98, 1.0);
            cr.moveTo(startX, startY);
            PangoCairo.show_layout(cr, lMain);

            cr.setSourceRGBA(0.70, 0.75, 0.85, 0.9);
            cr.moveTo(startX + mw + 3, startY + (mh - sh) / 2);
            PangoCairo.show_layout(cr, lSub);
        } else {
            cr.setSourceRGBA(0.12, 0.15, 0.20, 1.0);
            cr.moveTo(startX, startY);
            PangoCairo.show_layout(cr, lMain);

            cr.setSourceRGBA(0.35, 0.40, 0.48, 0.9);
            cr.moveTo(startX + mw + 3, startY + (mh - sh) / 2);
            PangoCairo.show_layout(cr, lSub);
        }
    }

    cr.restore();
}

function drawLayoutArrow(cr, el, skin) {
    let cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    cr.moveTo(cx - 3.6, cy - 1.7);
    cr.lineTo(cx + 3.6, cy - 1.7);
    cr.lineTo(cx, cy + 2.1);
    cr.closePath();
    setColor(cr, skin.text);
    cr.fill();
}

/* ═══════════════════════════════════════════════════════════════════════════
   The TopBar
   ═══════════════════════════════════════════════════════════════════════════ */
var AvroTopBar = class AvroTopBar {
    /**
     * @param {Gtk.Application|null} app
     * @param {Object} [opts] { ibus: false } skips the IBus connection (tests)
     */
    constructor(app, opts) {
        opts = opts || {};
        this.app = app;
        if (opts.ibus !== false) {
            try { ensureIBusRunning(); } catch (e) {}
        }
        this.settings = new SafeSettings(SCHEMA_ID);
        this.ibusSettings = new SafeSettings('org.freedesktop.ibus.general');
        this.scale = 1;
        this.hover = null;
        this.inside = false;
        this.pressed = null;
        this.alpha = {};
        this.drag = null;
        this.menuFor = null;
        this.engine = null;
        this.bus = null;
        this.bangla = false;
        this.opacity = 255;
        this.lastActive = GLib.get_monotonic_time();
        this.procs = {};
        this._catalog = null;
        this._catalogTime = 0;
        this._animId = 0;

        this._buildWindow();
        this._buildTray();
        if (opts.ibus !== false) {
            this._connectIBus();
        }
        this._connectSettings();
        this.bangla = this.isBangla();
        this._timers = [
            GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 1, () => this._keepOnTop()),
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => this._tickOpacity())
        ];
    }

    /* ── window ──────────────────────────────────────────────────────── */

    _buildWindow() {
        let win = new Gtk.Window({
            type: Gtk.WindowType.TOPLEVEL,
            title: "Avro TopBar",
            decorated: false,
            resizable: false,
            skip_taskbar_hint: true,
            skip_pager_hint: true,
            accept_focus: false,
            focus_on_map: false
        });
        if (this.app) {
            win.set_application(this.app);
        }
        win.set_icon_name("avro-bangla");
        try { win.set_wmclass("avro-topbar", "AvroTopBar"); } catch (e) {}
        try { Gtk.Window.set_default_icon_name("avro-bangla"); } catch (e) {}
        try {
            let iconCandidates = [
                "/usr/share/icons/hicolor/256x256/apps/avro-bangla.png",
                baseDir + "/icons/avro-bangla.png",
                GLib.get_current_dir() + "/data/icons/256x256/avro-bangla.png"
            ];
            for (let ic of iconCandidates) {
                if (GLib.file_test(ic, GLib.FileTest.EXISTS)) {
                    win.set_icon_from_file(ic);
                    break;
                }
            }
        } catch (e) {}
        win.set_type_hint(Gdk.WindowTypeHint.DOCK);
        win.set_keep_above(true);
        win.stick();
        // Like Windows (Alt+F4 is swallowed): the bar closes only from its menus.
        win.connect('delete-event', () => true);

        let screen = win.get_screen();
        let visual = screen.get_rgba_visual();
        this.rgba = !!(visual && screen.is_composited());
        if (this.rgba) {
            win.set_visual(visual);
        }
        win.set_app_paintable(true);

        let area = new Gtk.DrawingArea();
        area.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON_RELEASE_MASK |
                        Gdk.EventMask.POINTER_MOTION_MASK | Gdk.EventMask.ENTER_NOTIFY_MASK |
                        Gdk.EventMask.LEAVE_NOTIFY_MASK);
        area.set_has_tooltip(true);
        area.connect('draw', (w, cr) => this._draw(cr));
        area.connect('button-press-event', (w, ev) => this._onPress(ev));
        area.connect('button-release-event', (w, ev) => this._onRelease(ev));
        area.connect('motion-notify-event', (w, ev) => this._onMotion(ev));
        area.connect('enter-notify-event', () => { this.inside = true; this._markActive(); return false; });
        area.connect('leave-notify-event', () => {
            this.inside = false;
            if (!this.drag) this._setHover(null);
            return false;
        });
        area.connect('query-tooltip', (w, x, y, kb, tooltip) => this._onTooltip(x, y, tooltip));
        win.add(area);
        area.show();

        this.window = win;
        this.area = area;
        this._applyScale();
        screen.connect('notify::resolution', () => this._applyScale());
        screen.connect('monitors-changed', () => this._ensureOnScreen());
    }

    _applyScale() {
        let dpi = Gdk.Screen.get_default().get_resolution();
        this.scale = Math.max(1, dpi > 0 ? dpi / 96 : 1);
        this.width = Math.round(BAR_WIDTH * this.scale);
        this.height = Math.round(BAR_HEIGHT * this.scale);
        this.area.set_size_request(this.width, this.height);
        this.window.resize(this.width, this.height);
        this.area.queue_draw();
    }

    _skin() {
        return SKINS[this.settings.get('topbar-skin', 'classic')] || SKINS.classic;
    }

    _draw(cr) {
        let skin = this._skin();
        let s = this.scale;
        if (this.rgba) {
            cr.setOperator(Cairo.Operator.CLEAR);
            cr.paint();
            cr.setOperator(Cairo.Operator.OVER);
        }
        drawBarBackground(cr, this.width, this.height, skin, this.rgba ? 3 * s : 0);
        cr.save();
        cr.scale(s, s);
        for (let el of ELEMENTS) {
            let isExit = el.id === 'power';
            let down = (this.pressed === el.id && this.hover === el.id) || this.menuFor === el.id;
            if (down) {
                drawFrame(cr, el, isExit ? skin.exitDown : skin.down, 1);
            } else {
                drawFrame(cr, el, isExit ? skin.exitHover : skin.hover, this.alpha[el.id] || 0);
            }
            try {
                this._drawElement(cr, el, skin);
            } catch (e) {}
        }
        cr.restore();
        return true;
    }

    _drawElement(cr, el, skin) {
        switch (el.id) {
        case 'logo': drawLogo(cr, el); break;
        case 'mode': drawModeLabel(cr, el, this.bangla, skin, this.isAnsi()); break;
        case 'layout': drawLayoutArrow(cr, el, skin); break;
        case 'viewer': drawIcon(cr, 'keyboard', el.x + 3, el.y + 3, 24, skin.icons); break;
        case 'mouse': drawIcon(cr, 'mouse', el.x + 4, el.y + 4, 22, skin.icons); break;
        case 'tools': drawIcon(cr, 'gear', el.x + 4, el.y + 4, 22, skin.icons); break;
        case 'web': drawIcon(cr, 'globe', el.x + 4, el.y + 4, 22, skin.icons); break;
        case 'help': drawIcon(cr, 'help', el.x + 4, el.y + 4, 22, skin.icons); break;
        case 'power': drawIcon(cr, 'power', el.x + 4, el.y + 4, 22, skin.icons); break;
        }
    }

    /* ── pointer ─────────────────────────────────────────────────────── */

    _hitAt(ev) {
        let [, x, y] = ev.get_coords();
        return hitTest(x / this.scale, y / this.scale);
    }

    _setHover(id) {
        if (this.hover === id) return;
        this.hover = id;
        try {
            let gdkWin = this.area.get_window();
            if (gdkWin) {
                gdkWin.set_cursor(id === 'logo' ? Gdk.Cursor.new_from_name(gdkWin.get_display(), 'move') : null);
            }
        } catch (e) {}
        this._animate();
    }

    /* Cross-fade the hover frames: 5 steps of 30 ms, as on Windows. */
    _animate() {
        this.area.queue_draw();
        if (this._animId) return;
        this._animId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
            let busy = false;
            for (let el of ELEMENTS) {
                let target = (this.hover === el.id) ? 1 : 0;
                let a = this.alpha[el.id] || 0;
                if (a !== target) {
                    a = target > a ? Math.min(1, a + 0.2) : Math.max(0, a - 0.2);
                    if (Math.abs(a - target) < 0.01) a = target;
                    this.alpha[el.id] = a;
                    busy = true;
                }
            }
            this.area.queue_draw();
            if (!busy) {
                this._animId = 0;
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    _onPress(ev) {
        if (ev.get_event_type() !== Gdk.EventType.BUTTON_PRESS) {
            return true;   // double/triple clicks are plain repeated clicks
        }
        let id = this._hitAt(ev);
        let [, button] = ev.get_button();
        this.pressed = id;
        if (id === 'logo' && button === 1) {
            let [, rx, ry] = ev.get_root_coords();
            let [wx, wy] = this.window.get_position();
            this.drag = { rx: rx, ry: ry, wx: wx, wy: wy, moved: false };
        }
        this._markActive();
        this.area.queue_draw();
        return true;
    }

    _onMotion(ev) {
        this.inside = true;
        if (this.drag) {
            let [, rx, ry] = ev.get_root_coords();
            let dx = rx - this.drag.rx, dy = ry - this.drag.ry;
            if (!this.drag.moved && Math.abs(dx) + Math.abs(dy) < 4) {
                return true;
            }
            this.drag.moved = true;
            let pos = { x: this.drag.wx + dx, y: this.drag.wy + dy };
            let size = { width: this.width, height: this.height };
            let area = this._workareaAt(pos.x + this.width / 2, pos.y + this.height / 2);
            pos = snapToEdges(pos, size, area, SNAP_BUFFER);
            this.window.move(pos.x, pos.y);
            return true;
        }
        this._setHover(this._hitAt(ev));
        return false;
    }

    _onRelease(ev) {
        let id = this._hitAt(ev);
        let [, button] = ev.get_button();
        let pressed = this.pressed;
        this.pressed = null;
        if (this.drag) {
            let moved = this.drag.moved;
            this.drag = null;
            if (moved) {
                this._finishDrag();
                this._setHover(id);
                this.area.queue_draw();
                return true;
            }
        }
        if (pressed && pressed === id) {
            this._activate(id, button);
        }
        this.area.queue_draw();
        return true;
    }

    _activate(id, button) {
        switch (id) {
        case 'logo': this._popup(this._mainMenu(), 'logo'); break;
        case 'mode': this.toggleMode(); break;
        case 'layout': this._popup(this._layoutMenu(), 'layout'); break;
        case 'viewer':
            if (button === 1) this.showLayoutViewer();
            else this._popup(this._layoutMenu(), 'viewer');
            break;
        case 'mouse': this.launchTool('avro-mouse', '--mouse'); break;
        case 'tools': this._popup(this._toolsMenu(), 'tools'); break;
        case 'web': this._popup(this._webMenu(), 'web'); break;
        case 'help': this._popup(this._helpMenu(), 'help'); break;
        case 'power': this._onPower(button); break;
        }
    }

    /* The power button follows the "topbar-x-button" setting; a right click
       always shows the menu (as the Avro Keyboard manual describes). */
    _onPower(button) {
        let action = this.settings.get('topbar-x-button', 'menu');
        if (button !== 1 || action === 'menu') {
            this._popup(this._exitMenu(), 'power');
        } else if (action === 'minimize') {
            this.hideToTray();
        } else {
            this.exit();
        }
    }

    _onTooltip(x, y, tooltip) {
        let id = hitTest(x / this.scale, y / this.scale);
        if (!id) return false;
        let text = TOOLTIPS[id];
        if (id === 'mode') {
            text = (this.bangla ? "Click to switch to English (EN)" : "Click to start typing Bangla (BN)") +
                   (this._f12Works() ? "\nor Press F12." : ".");
        } else if (id === 'layout') {
            text = "Select your Bangla keyboard layout.\nCurrent: " + this._banglaLayout().label;
        }
        let el = elementById(id);
        let s = this.scale;
        tooltip.set_text(text);
        tooltip.set_tip_area(new Gdk.Rectangle({
            x: Math.round(el.x * s), y: Math.round(el.y * s),
            width: Math.round(el.w * s), height: Math.round(el.h * s)
        }));
        return true;
    }

    /* ── position ────────────────────────────────────────────────────── */

    _monitors() {
        let display = Gdk.Display.get_default();
        let list = [];
        for (let i = 0; i < display.get_n_monitors(); i++) {
            let m = display.get_monitor(i);
            if (m) list.push(m);
        }
        return list;
    }

    _rect(r) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    }

    _primaryWorkarea() {
        let display = Gdk.Display.get_default();
        let m = display.get_primary_monitor() || display.get_monitor(0);
        return this._rect(m.get_workarea());
    }

    _workareaAt(x, y) {
        let display = Gdk.Display.get_default();
        let m = display.get_monitor_at_point(Math.round(x), Math.round(y));
        return m ? this._rect(m.get_workarea()) : this._primaryWorkarea();
    }

    /* A saved X is used only if the whole bar fits on a monitor there. */
    _workareaForX(x) {
        for (let m of this._monitors()) {
            let wa = this._rect(m.get_workarea());
            if (x >= wa.x && x + this.width <= wa.x + wa.width) return wa;
        }
        return null;
    }

    /* Windows Avro remembers only the X position; each start docks to the top. */
    _placeInitial() {
        let saved = this.settings.get('topbar-x', -1);
        let area = saved >= 0 ? this._workareaForX(saved) : null;
        let pos;
        if (area) {
            pos = { x: saved, y: area.y };
        } else {
            pos = defaultPosition(this._primaryWorkarea(), this.width, this.scale);
        }
        this.window.move(pos.x, pos.y);
    }

    _finishDrag() {
        let [x, y] = this.window.get_position();
        let area = this._workareaAt(x + this.width / 2, y + this.height / 2);
        let pos = clampToArea({ x: x, y: y }, { width: this.width, height: this.height }, area);
        if (pos.x !== x || pos.y !== y) this.window.move(pos.x, pos.y);
        this.settings.set('topbar-x', pos.x);
    }

    dockToTop() {
        let [x] = this.window.get_position();
        let area = this._workareaForX(x);
        if (!area) {
            area = this._primaryWorkarea();
            x = defaultPosition(area, this.width, this.scale).x;
        }
        this.window.move(x, area.y);
        this.settings.set('topbar-x', x);
    }

    _ensureOnScreen() {
        if (!this.window.get_visible()) return;
        let [x, y] = this.window.get_position();
        if (!this._workareaForX(x)) {
            this._placeInitial();
        } else {
            let area = this._workareaAt(x + this.width / 2, y + this.height / 2);
            let pos = clampToArea({ x: x, y: y }, { width: this.width, height: this.height }, area);
            this.window.move(pos.x, pos.y);
        }
    }

    _keepOnTop() {
        if (this.window.get_visible()) {
            this.window.set_keep_above(true);
            this._keepInWorkarea();
        }
        return GLib.SOURCE_CONTINUE;
    }

    /* A panel that reserves its space only after the bar was placed (GNOME's
       top bar at login, for one) would cover it: the bar moves down into the
       work area, as a drag would put it. */
    _keepInWorkarea() {
        if (this.drag) return;
        let [x, y] = this.window.get_position();
        let area = this._workareaAt(x + this.width / 2, y + this.height / 2);
        if (y < area.y) this.window.move(x, area.y);
    }

    /* ── transparency (Windows: fade after 5 s without activity) ─────── */

    _markActive() {
        this.lastActive = GLib.get_monotonic_time();
    }

    _tickOpacity() {
        let transparent = this.settings.get('topbar-transparent', true);
        let level = Math.min(255, Math.max(0, this.settings.get('topbar-transparency-level', 80)));
        if (!transparent || this.inside || this.drag || this.menuFor || this.pressed) {
            this._markActive();
        }
        let idle = GLib.get_monotonic_time() - this.lastActive > 5 * 1000000;
        let target = idle ? level : 255;
        if (this.opacity !== target) {
            this.opacity = stepAlpha(this.opacity, target, 50);
            this.window.set_opacity(this.opacity / 255);
        }
        return GLib.SOURCE_CONTINUE;
    }

    /* ── IBus & mode ─────────────────────────────────────────────────── */

    _connectIBus() {
        if (!IBus) return;
        try {
            IBus.init();
            this.bus = new IBus.Bus();
            let onConnected = () => {
                try { this.bus.set_watch_ibus_signal(true); } catch (e) {}
                this._catalogTime = 0;
                this._refreshCatalog();
                this._refreshEngine();
            };
            this.bus.connect('connected', onConnected);
            this.bus.connect('disconnected', () => this._engineChanged(null));
            this.bus.connect('global-engine-changed', (bus, name) => this._engineChanged(name));
            if (this.bus.is_connected()) {
                onConnected();
            }
        } catch (e) {
            this.bus = null;
        }
    }

    _connected() {
        return !!this.bus && this.bus.is_connected();
    }

    /* Only the asynchronous IBus calls are used. The synchronous
       get_global_engine() and list_engines() hand back engine descriptions
       whose ownership GJS gets wrong: they are freed while still in use and
       the process crashes. GNOME Shell uses the asynchronous ones as well. */
    _refreshEngine() {
        if (!this._connected()) return;
        try {
            this.bus.get_global_engine_async(-1, null, (bus, res) => {
                let name = null;
                try {
                    let desc = bus.get_global_engine_async_finish(res);
                    name = desc ? desc.get_name() : null;
                } catch (e) {}
                this._engineChanged(name);
            });
        } catch (e) {}
    }

    _refreshCatalog() {
        if (!this._connected() || this._catalogPending) return;
        this._catalogPending = true;
        try {
            this.bus.list_engines_async(-1, null, (bus, res) => {
                this._catalogPending = false;
                let descs = [];
                try {
                    descs = bus.list_engines_async_finish(res).map(d => ({
                        name: d.get_name(), language: d.get_language(), longname: d.get_longname(),
                        layout: d.get_layout(), variant: d.get_layout_variant(), description: d.get_description()
                    }));
                } catch (e) {}
                this._catalog = buildLayoutCatalog(descs);
                this._catalogTime = GLib.get_monotonic_time();
                // The engine may be a fixed layout we did not know about yet.
                this._engineChanged(this.engine);
            });
        } catch (e) {
            this._catalogPending = false;
        }
    }

    _engineChanged(name) {
        this.engine = name;
        // Switching keyboards elsewhere (e.g. Ctrl+Space) makes that Bangla
        // keyboard the one the mode button returns to.
        if (name && (isAvroEngine(name) || this._fixedNames().indexOf(name) !== -1)) {
            let current = this.settings.get('bangla-layout', 'ibus-avro');
            let normalized = isAvroEngine(name) ? 'ibus-avro' : name;
            if (current !== normalized) this.settings.set('bangla-layout', normalized);
        }
        this._refreshMode();
    }

    _setEngine(name) {
        if (!this._connected()) return false;
        try {
            this.bus.set_global_engine_async(name, -1, null, (bus, res) => {
                let ok = false;
                try { ok = bus.set_global_engine_async_finish(res); } catch (e) {}
                if (ok) this._applyXkbLayout(name);
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    /* ibus-daemon does not change the X keyboard layout when another program
       switches the engine: its panel and the `ibus engine` command do that
       themselves, so the TopBar does too, unless the user keeps the system
       layout. On Wayland the desktop manages layouts itself. */
    _applyXkbLayout(engine) {
        if (this.ibusSettings.get('use-system-keyboard-layout', false)) return;
        if ((GLib.getenv('XDG_SESSION_TYPE') || '').toLowerCase() === 'wayland') return;
        let xkb = xkbLayoutFor(engine);
        if (!xkb || !GLib.find_program_in_path('setxkbmap')) return;
        try {
            GLib.spawn_async(null, ['setxkbmap', '-layout', xkb.layout, '-variant', xkb.variant],
                             null, GLib.SpawnFlags.SEARCH_PATH, null);
        } catch (e) {}
    }

    /* The cached layout list (Avro Phonetic only until IBus has answered);
       refreshed in the background once a minute. */
    layoutCatalog() {
        if (!this._catalog) {
            this._catalog = buildLayoutCatalog([]);
        }
        if (GLib.get_monotonic_time() - this._catalogTime > 60 * 1000000) {
            this._refreshCatalog();
        }
        return this._catalog;
    }

    _fixedNames() {
        return this.layoutCatalog().filter(l => !l.avro).map(l => l.name);
    }

    /* The Bangla keyboard the mode button switches to (default Avro Phonetic):
       Avro with its layout, or a system layout. */
    _banglaLayout() {
        let name = this.settings.get('bangla-layout', 'ibus-avro');
        let catalog = this.layoutCatalog();
        if (isAvroEngine(name)) {
            let layout = this.settings.get('keyboard-layout', 'phonetic');
            for (let l of catalog) {
                if (l.avro && l.avroLayout === layout) return l;
            }
            return catalog[0];
        }
        for (let l of catalog) {
            if (l.id === name) return l;
        }
        return catalog[0];
    }

    /* F12 is handled by the Avro engine, in all of its layouts. */
    _f12Works() {
        return (!this.engine || isAvroEngine(this.engine)) && this._banglaLayout().avro;
    }

    isBangla() {
        return isBanglaMode(this.engine, this.settings.get('mode-bangla', true), this._fixedNames());
    }

    _refreshMode() {
        let b = this.isBangla();
        if (b !== this.bangla) {
            this.bangla = b;
            this._markActive();   // a mode change shows the bar fully for 5 s
        }
        this.area.queue_draw();
        this._updateTray();
    }

    toggleMode() {
        if (this.isBangla()) this.setEnglish();
        else this.setBangla();
    }

    setBangla() {
        let target = this._banglaLayout();
        if (target.avro) {
            if (this.engine && !isAvroEngine(this.engine)) this._setEngine('ibus-avro');
            this.settings.set('mode-bangla', true);
        } else {
            this._setEngine(target.name);
        }
        this._markActive();
        this._refreshMode();
    }

    setEnglish() {
        if (!this.engine || isAvroEngine(this.engine)) {
            this.settings.set('mode-bangla', false);
        } else {
            this._setEngine(pickEnglishEngine(this.ibusSettings.get('preload-engines', []), this._fixedNames()));
        }
        this._markActive();
        this._refreshMode();
    }

    isAnsi() {
        return this.settings.get('output-encoding', 'unicode') === 'ansi';
    }

    setOutputEncoding(encoding) {
        this.settings.set('output-encoding', encoding);
        this.area.queue_draw();
        this._updateTray();
    }

    promptSwitchToAnsi() {
        if (this.isAnsi()) return;
        let dlg = new Gtk.MessageDialog({
            transient_for: this.window,
            modal: true,
            message_type: Gtk.MessageType.WARNING,
            buttons: Gtk.ButtonsType.OK_CANCEL,
            text: "Switch to ANSI (Bijoy Compatible) Output Mode?",
            secondary_text: "In ANSI mode, Avro outputs legacy 8-bit characters (Bijoy format).\n\nIMPORTANT: You MUST select an ANSI font (such as SutonnyMJ) in your target application to view the text properly.\n\nDo you want to switch to ANSI output mode?"
        });
        dlg.set_title("Avro Keyboard - Output as ANSI");
        dlg.set_default_response(Gtk.ResponseType.OK);
        let res = dlg.run();
        dlg.destroy();
        if (res === Gtk.ResponseType.OK) {
            this.setOutputEncoding('ansi');
            this._notify("Avro Keyboard", "Switched to ANSI output mode.\nRemember to select an ANSI font (e.g. SutonnyMJ) in your application.");
        }
    }

    _appendEncodingItems(menu) {
        let isAnsi = this.isAnsi();
        let encMenu = new Gtk.Menu();
        this._radios(encMenu, [
            {
                label: "Output as Unicode (Standard / Recommended)",
                active: !isAnsi,
                callback: () => {
                    this.setOutputEncoding('unicode');
                    this._notify("Avro Keyboard", "Switched back to Unicode output mode.");
                }
            },
            {
                label: "Output as ANSI (Bijoy Compatible)...",
                active: isAnsi,
                callback: () => this.promptSwitchToAnsi()
            }
        ]);
        menu.append(this._submenu("Output Text Encoding", 'toggle', encMenu));
    }

    /* Pick a layout by its catalog id ('ibus-avro', 'avro:national', 'xkb:...'). */
    selectLayout(id) {
        let entry = null;
        for (let l of this.layoutCatalog()) {
            if (l.id === id) entry = l;
        }
        if (!entry) return;
        if (entry.avro) {
            this.settings.set('keyboard-layout', entry.avroLayout);
            this.settings.set('bangla-layout', 'ibus-avro');
        } else {
            this.settings.set('bangla-layout', entry.name);
        }
        this.setBangla();
    }

    /* ── tools ───────────────────────────────────────────────────────── */

    /* Start a tool once; clicking again while it runs does not open a second copy. */
    launchTool(command, mainArg, extraArgs) {
        let key = command + (extraArgs ? ' ' + extraArgs.join(' ') : '');
        let running = this.procs[key];
        if (running && !running.done) return;
        let argv;
        if (GLib.find_program_in_path(command)) {
            argv = [command].concat(extraArgs || []);
        } else if (mainArg) {
            argv = ['gjs', baseDir + '/standalone/main.js', mainArg];
        } else {
            return;
        }
        try {
            let proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
            let entry = { done: false };
            this.procs[key] = entry;
            proc.wait_async(null, () => { entry.done = true; });
        } catch (e) {}
    }

    showLayoutViewer() {
        let layout = this._banglaLayout();
        if (!layout.avro && GLib.find_program_in_path('gkbd-keyboard-display')) {
            let spec = layout.variant ? layout.layout + '\t' + layout.variant : layout.layout;
            this.launchTool('gkbd-keyboard-display', null, ['-l', spec]);
        } else {
            this.launchTool('avro-layout', '--layout');
        }
    }

    openUri(uri) {
        try {
            Gio.AppInfo.launch_default_for_uri(uri, null);
        } catch (e) {
            try { GLib.spawn_async(null, ['xdg-open', uri], null, GLib.SpawnFlags.SEARCH_PATH, null); } catch (e2) {}
        }
    }

    _readmeUri() {
        for (let p of ['/usr/share/doc/avro-linux/README.md', baseDir + '/../README.md']) {
            if (GLib.file_test(p, GLib.FileTest.EXISTS)) return Gio.File.new_for_path(p).get_uri();
        }
        return null;
    }

    /* ── menus (Avro Keyboard 5 captions; Windows-only items left out) ─ */

    _item(label, icon, callback, sensitive) {
        let item = new Gtk.MenuItem();
        let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
        let size = Math.round(16 * this.scale);
        if (icon) {
            box.pack_start(Gtk.Image.new_from_pixbuf(iconPixbuf(icon, size, 'dark')), false, false, 0);
        } else {
            let spacer = new Gtk.Box();
            spacer.set_size_request(size, size);
            box.pack_start(spacer, false, false, 0);
        }
        box.pack_start(new Gtk.Label({ label: label, xalign: 0 }), true, true, 0);
        item.add(box);
        if (callback) {
            item.connect('activate', () => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                callback();
                return GLib.SOURCE_REMOVE;
            }));
        }
        if (sensitive === false) item.set_sensitive(false);
        return item;
    }

    _submenu(label, icon, menu) {
        let item = this._item(label, icon, null);
        item.set_submenu(menu);
        return item;
    }

    _check(label, active, callback, sensitive) {
        let item = new Gtk.CheckMenuItem({ label: label, active: !!active });
        item.connect('toggled', () => callback(item.get_active()));
        if (sensitive === false) item.set_sensitive(false);
        return item;
    }

    /* entries: [{ label, active, callback, sensitive, menu }] — one radio group,
       optionally spread over several menus. */
    _radios(menu, entries) {
        let group = null;
        for (let e of entries) {
            let item = new Gtk.RadioMenuItem({ label: e.label });
            if (group) item.join_group(group);
            else group = item;
            (e.menu || menu).append(item);
            e.item = item;
        }
        for (let e of entries) {
            if (e.active) e.item.set_active(true);
            if (e.sensitive === false) e.item.set_sensitive(false);
        }
        for (let e of entries) {
            let entry = e;
            entry.item.connect('toggled', () => {
                if (entry.item.get_active() && !entry.active) {
                    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => { entry.callback(); return GLib.SOURCE_REMOVE; });
                }
            });
        }
    }

    _sep(menu) {
        menu.append(new Gtk.SeparatorMenuItem());
    }

    _fillLayouts(menu) {
        let catalog = this.layoutCatalog();
        let current = this._banglaLayout().id;
        let entries = [];
        let more = catalog.filter(l => !l.primary);
        let moreMenu = more.length ? new Gtk.Menu() : null;
        for (let l of catalog) {
            entries.push({
                label: l.label, active: l.id === current, menu: l.primary ? menu : moreMenu,
                callback: () => this.selectLayout(l.id)
            });
        }
        // One radio group across the menu and the system layouts submenu, so
        // exactly one layout is ever checked. Avro's layouts come first.
        this._radios(menu, entries);
        if (moreMenu) {
            menu.append(this._submenu("System Bangla keyboard layouts", null, moreMenu));
        }
        this._sep(menu);
        menu.append(this._item("Show active keyboard layout...", 'keyboard', () => this.showLayoutViewer()));
    }

    _layoutSubmenu() {
        let sub = new Gtk.Menu();
        this._fillLayouts(sub);
        return sub;
    }

    _phoneticOptions() {
        let sub = new Gtk.Menu();
        let phonetic = this._banglaLayout().avroLayout === 'phonetic';
        sub.append(this._check("Show Preview Window", this.settings.get('switch-preview', true),
                               (on) => this.settings.set('switch-preview', on), phonetic));
        let dict = this.settings.get('switch-dict', true);
        this._radios(sub, [
            { label: "Dictionary mode is default in suggestion", active: dict, sensitive: phonetic,
              callback: () => this.settings.set('switch-dict', true) },
            { label: "Classic phonetic (no suggestion)", active: !dict, sensitive: phonetic,
              callback: () => this.settings.set('switch-dict', false) }
        ]);
        return sub;
    }

    /* "Fixed Keyboard Layout Options" of the Avro Keyboard Tools menu */
    _fixedOptions() {
        let sub = new Gtk.Menu();
        let modern = this.settings.get('fixed-typing-style', 'modern') !== 'old';
        this._radios(sub, [
            { label: 'Use "Modern Style Typing" in fixed keyboard layouts', active: modern,
              callback: () => this.settings.set('fixed-typing-style', 'modern') },
            { label: 'Use "Old Style Typing" in fixed keyboard layouts', active: !modern,
              callback: () => this.settings.set('fixed-typing-style', 'old') }
        ]);
        this._sep(sub);
        let check = (label, key) => {
            sub.append(this._check(label, this.settings.get(key, true), (on) => this.settings.set(key, on)));
        };
        check('Enable "Old Style Reph" (In Modern Typing Style)', 'fixed-old-reph');
        check('Enable "Automatic Vowel Forming" (In Modern Typing Style)', 'fixed-vowel-forming');
        check('Automatically fix "Chandrabindu" position (In Modern Typing Style)', 'fixed-fix-chandra');
        check('Enable Bangla in NumberPad (In Fixed keyboard Layouts)', 'fixed-numpad-bangla');
        return sub;
    }

    _webItems(menu) {
        let downloads = new Gtk.Menu();
        downloads.append(this._item("Free Bangla Fonts...", 'document', () => this.openUri("https://www.omicronlab.com/go.php?id=4")));
        downloads.append(this._item("Useful tools for Bangla...", null, () => this.openUri("https://www.omicronlab.com/go.php?id=15")));
        menu.append(this._submenu("More Free Downloads", null, downloads));
        menu.append(this._item("Avro Keyboard on the web", 'globe', () => this.openUri("https://www.omicronlab.com/avro-keyboard.html")));
        menu.append(this._item("www.OmicronLab.com", 'globe', () => this.openUri("https://www.omicronlab.com")));
        menu.append(this._item("Avro Linux on GitHub", 'globe', () => this.openUri("https://github.com/msbsurfi/avro-linux")));
        menu.append(this._item("Report an issue", null, () => this.openUri("https://github.com/msbsurfi/avro-linux/issues")));
        this._sep(menu);
        menu.append(this._item("Avro Keyboard on Facebook", null, () => this.openUri("https://www.omicronlab.com/go.php?id=39")));
        menu.append(this._item("OmicronLab on Twitter", null, () => this.openUri("https://www.omicronlab.com/go.php?id=40")));
    }

    _helpItems(menu, withAboutCurrent) {
        menu.append(this._item("Bangla Typing with Avro Phonetic", 'pdf', () => this.openUri("https://www.omicronlab.com/go.php?id=26")));
        menu.append(this._item("Bangla Typing with Fixed Keyboard Layouts", 'pdf', () => this.openUri("https://www.omicronlab.com/go.php?id=27")));
        menu.append(this._item("Bangla Typing with Avro Mouse", 'pdf', () => this.openUri("https://www.omicronlab.com/go.php?id=28")));
        menu.append(this._item("Overview", 'pdf', () => this.openUri("https://www.omicronlab.com/go.php?id=24")));
        this._sep(menu);
        let readme = this._readmeUri();
        menu.append(this._item("Avro Linux user guide (README)", 'document', () => this.openUri(readme), !!readme));
        menu.append(this._item("Avro Doctor : Check your system", 'doctor', () => this.launchTool('avro-doctor', null)));
        menu.append(this._item("More documents on the web...", 'document', () => this.openUri("https://www.omicronlab.com/go.php?id=12")));
        if (withAboutCurrent) {
            this._sep(menu);
            menu.append(this._item("About current keyboard layout...", null, () => this.aboutLayout()));
            menu.append(this._item("About current skin...", null, () => this.aboutSkin()));
        }
    }

    _toolsItems(menu) {
        menu.append(this._item("Unicode to Bijoy text converter", 'toggle', () => this.launchTool('avro-converter', '--converter')));
        menu.append(this._item("Layout Viewer : Show active keyboard layout...", 'keyboard', () => this.showLayoutViewer()));
        menu.append(this._item("Avro Mouse : Click 'n Type!", 'mouse', () => this.launchTool('avro-mouse', '--mouse')));
        menu.append(this._item("Avro Pad : Bangla text editor", 'document', () => this.launchTool('avro-pad', '--pad')));
        menu.append(this._item("Avro Doctor : Check your system", 'doctor', () => this.launchTool('avro-doctor', null)));
        this._sep(menu);
        this._appendEncodingItems(menu);
        this._sep(menu);
        menu.append(this._submenu("Avro Phonetic Options", null, this._phoneticOptions()));
        menu.append(this._submenu("Fixed Keyboard Layout Options", null, this._fixedOptions()));
        this._sep(menu);
        menu.append(this._item("Options...", 'gear', () => this.launchTool('avro-preferences', '--preferences')));
    }

    _mainMenu() {
        let menu = new Gtk.Menu();
        menu.append(this._item("Toggle keyboard mode", 'toggle', () => this.toggleMode()));
        if (this.isAnsi()) {
            menu.append(this._item("Output: ANSI (Revert to Unicode)", 'toggle', () => {
                this.setOutputEncoding('unicode');
                this._notify("Avro Keyboard", "Switched back to Unicode output mode.");
            }));
        } else {
            menu.append(this._item("Output as ANSI (Bijoy Compatible)...", 'toggle', () => this.promptSwitchToAnsi()));
        }
        menu.append(this._item("Dock to top", null, () => this.dockToTop()));
        menu.append(this._item("Jump to system tray", null, () => this.hideToTray()));
        this._sep(menu);
        menu.append(this._submenu("Select keyboard layout", 'keyboard', this._layoutSubmenu()));
        menu.append(this._item("Avro Mouse - Click 'n Type!", 'mouse', () => this.launchTool('avro-mouse', '--mouse')));
        this._sep(menu);
        let web = new Gtk.Menu();
        this._webItems(web);
        menu.append(this._submenu("On the web", 'globe', web));
        this._sep(menu);
        menu.append(this._item("Options...", 'gear', () => this.launchTool('avro-preferences', '--preferences')));
        this._sep(menu);
        let help = new Gtk.Menu();
        this._helpItems(help, false);
        menu.append(this._submenu("Help files", 'help', help));
        menu.append(this._item("About Avro Keyboard...", 'bangla', () => this.aboutAvro()));
        this._sep(menu);
        menu.append(this._item("Exit", 'exit', () => this.exit()));
        return menu;
    }

    _layoutMenu() {
        let menu = new Gtk.Menu();
        this._fillLayouts(menu);
        this._sep(menu);
        menu.append(this._item("Avro Mouse - Click 'n Type!", 'mouse', () => this.launchTool('avro-mouse', '--mouse')));
        return menu;
    }

    _toolsMenu() {
        let menu = new Gtk.Menu();
        this._toolsItems(menu);
        return menu;
    }

    _webMenu() {
        let menu = new Gtk.Menu();
        this._webItems(menu);
        return menu;
    }

    _helpMenu() {
        let menu = new Gtk.Menu();
        this._helpItems(menu, true);
        this._sep(menu);
        menu.append(this._item("About Avro Keyboard...", 'bangla', () => this.aboutAvro()));
        return menu;
    }

    _exitMenu() {
        let menu = new Gtk.Menu();
        menu.append(this._item("Jump to system tray", null, () => this.hideToTray()));
        menu.append(this._item("Exit", 'exit', () => this.exit()));
        return menu;
    }

    _trayMenu() {
        let menu = new Gtk.Menu();
        menu.append(this._item("Toggle keyboard mode", 'toggle', () => this.toggleMode()));
        if (this.isAnsi()) {
            menu.append(this._item("Output: ANSI (Revert to Unicode)", 'toggle', () => {
                this.setOutputEncoding('unicode');
                this._notify("Avro Keyboard", "Switched back to Unicode output mode.");
            }));
        } else {
            menu.append(this._item("Output as ANSI (Bijoy Compatible)...", 'toggle', () => this.promptSwitchToAnsi()));
        }
        menu.append(this._item("Restore Avro Top Bar", null, () => this.restoreBar()));
        this._sep(menu);
        menu.append(this._submenu("Select keyboard layout", 'keyboard', this._layoutSubmenu()));
        menu.append(this._item("Avro Mouse - Click 'n Type!", 'mouse', () => this.launchTool('avro-mouse', '--mouse')));
        this._sep(menu);
        let tools = new Gtk.Menu();
        this._toolsItems(tools);
        menu.append(this._submenu("Tools", 'gear', tools));
        this._sep(menu);
        let web = new Gtk.Menu();
        this._webItems(web);
        menu.append(this._submenu("On the web", 'globe', web));
        this._sep(menu);
        let help = new Gtk.Menu();
        this._helpItems(help, true);
        menu.append(this._submenu("Help files", 'help', help));
        menu.append(this._item("About Avro Keyboard...", 'bangla', () => this.aboutAvro()));
        this._sep(menu);
        menu.append(this._item("Exit", 'exit', () => this.exit()));
        return menu;
    }

    /* Menus open at the clicked button's bottom-left corner. */
    _popup(menu, elementId) {
        let el = elementById(elementId);
        let s = this.scale;
        menu.attach_to_widget(this.area, null);
        menu.show_all();
        this.menuFor = elementId;
        this.area.queue_draw();
        menu.connect('deactivate', () => {
            this.menuFor = null;
            this.area.queue_draw();
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => { menu.destroy(); return GLib.SOURCE_REMOVE; });
        });
        let rect = new Gdk.Rectangle({
            x: Math.round(el.x * s), y: Math.round(el.y * s),
            width: Math.round(el.w * s), height: Math.round(el.h * s)
        });
        menu.popup_at_rect(this.area.get_window(), rect, Gdk.Gravity.SOUTH_WEST,
                           Gdk.Gravity.NORTH_WEST, Gtk.get_current_event());
    }

    /* ── system tray (modern StatusNotifierItem + fallback Gtk.StatusIcon) ───────────── */

    _buildTray() {
        this.tray = null;
        this.sniRegistered = false;
        this._sniBus = null;
        this._sniObjId = 0;

        // 1. Modern DBus StatusNotifierItem for KDE Plasma 6, GNOME, etc.
        try {
            this._buildStatusNotifierItem();
        } catch (e) {}

        // 2. Fallback Gtk.StatusIcon for legacy X11 desktops
        try {
            this.tray = new Gtk.StatusIcon();
            this.tray.set_title("Avro Keyboard");
            this.tray.set_visible(false);
            this.tray.connect('button-press-event', (icon, ev) => this._onTrayPress(ev));
            this.tray.connect('popup-menu', () => {
                let menu = this._trayMenu();
                menu.show_all();
                menu.connect('deactivate', () => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    menu.destroy();
                    return GLib.SOURCE_REMOVE;
                }));
                menu.popup_at_pointer(Gtk.get_current_event());
            });
            this.tray.connect('size-changed', (icon, size) => {
                this._updateTray(size);
                return true;
            });
        } catch (e) {
            this.tray = null;
        }
    }

    _buildStatusNotifierItem() {
        const SNI_XML = `<node>
  <interface name="org.kde.StatusNotifierItem">
    <property name="Category" type="s" access="read"/>
    <property name="Id" type="s" access="read"/>
    <property name="Title" type="s" access="read"/>
    <property name="Status" type="s" access="read"/>
    <property name="IconName" type="s" access="read"/>
    <property name="IconThemePath" type="s" access="read"/>
    <property name="ItemIsMenu" type="b" access="read"/>
    <property name="IconPixmap" type="a(iiay)" access="read"/>
    <property name="ToolTip" type="(sa(iiay)ss)" access="read"/>
    <method name="ContextMenu">
      <arg type="i" name="x" direction="in"/>
      <arg type="i" name="y" direction="in"/>
    </method>
    <method name="Activate">
      <arg type="i" name="x" direction="in"/>
      <arg type="i" name="y" direction="in"/>
    </method>
    <method name="SecondaryActivate">
      <arg type="i" name="x" direction="in"/>
      <arg type="i" name="y" direction="in"/>
    </method>
    <method name="Scroll">
      <arg type="i" name="delta" direction="in"/>
      <arg type="s" name="orientation" direction="in"/>
    </method>
    <signal name="NewTitle"/>
    <signal name="NewIcon"/>
    <signal name="NewToolTip"/>
    <signal name="NewStatus">
      <arg type="s" name="status"/>
    </signal>
  </interface>
</node>`;

        let bus = Gio.bus_get_sync(Gio.BusType.SESSION, null);
        if (!bus) return;

        let nodeInfo = Gio.DBusNodeInfo.new_for_xml(SNI_XML);
        this._sniBus = bus;
        this._sniObjId = bus.register_object(
            "/StatusNotifierItem",
            nodeInfo.interfaces[0],
            (conn, sender, path, iface, method, params, invocation) => {
                if (method === "Activate") {
                    if (!this.window.get_visible()) {
                        this.restoreBar();
                    } else {
                        this.toggleMode();
                    }
                    invocation.return_value(null);
                } else if (method === "ContextMenu") {
                    let menu = this._trayMenu();
                    menu.show_all();
                    menu.connect('deactivate', () => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        menu.destroy();
                        return GLib.SOURCE_REMOVE;
                    }));
                    menu.popup_at_pointer(null);
                    invocation.return_value(null);
                } else if (method === "SecondaryActivate") {
                    if (this.window.get_visible()) {
                        this.hideToTray();
                    } else {
                        this.restoreBar();
                    }
                    invocation.return_value(null);
                } else {
                    invocation.return_value(null);
                }
            },
            (conn, sender, path, iface, prop) => {
                if (prop === "Category") return new GLib.Variant("s", "ApplicationStatus");
                if (prop === "Id") return new GLib.Variant("s", "avro-topbar");
                if (prop === "Title") return new GLib.Variant("s", "Avro Keyboard");
                if (prop === "Status") return new GLib.Variant("s", "Active");
                if (prop === "IconName") return new GLib.Variant("s", this.bangla ? "avro-bn" : "avro-en");
                if (prop === "IconThemePath") return new GLib.Variant("s", "/usr/share/icons/hicolor");
                if (prop === "ItemIsMenu") return new GLib.Variant("b", false);
                if (prop === "ToolTip") {
                    let isAnsi = this.isAnsi();
                    let title = "Avro Keyboard (" + (this.bangla ? (isAnsi ? "BN [ANSI]" : "BN") : "EN") + ")";
                    let desc = this.bangla
                        ? (isAnsi ? "Bangla Keyboard Mode [ANSI / SutonnyMJ] (Click to switch to English)" : "Bangla Keyboard Mode (Click to switch to English)")
                        : "English Keyboard Mode (Click to switch to Bangla)";
                    return new GLib.Variant("(sa(iiay)ss)", [this.bangla ? "avro-bn" : "avro-en", [], title, desc]);
                }
                if (prop === "IconPixmap") return this._getSniPixmap();
                return null;
            },
            null
        );

        try {
            bus.call_sync(
                "org.kde.StatusNotifierWatcher",
                "/StatusNotifierWatcher",
                "org.kde.StatusNotifierWatcher",
                "RegisterStatusNotifierItem",
                new GLib.Variant("(s)", ["/StatusNotifierItem"]),
                null,
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
            this.sniRegistered = true;
        } catch (e) {
            this.sniRegistered = false;
        }
    }

    _getSniPixmap() {
        try {
            let px = 24;
            let pixbuf = iconPixbuf(this.bangla ? 'bangla' : 'english', px, 'dark');
            if (pixbuf) {
                let pixels = pixbuf.get_pixels();
                let w = pixbuf.get_width();
                let h = pixbuf.get_height();
                let nChannels = pixbuf.get_n_channels();
                let rowstride = pixbuf.get_rowstride();
                let argbBytes = [];
                for (let y = 0; y < h; y++) {
                    let rowOffset = y * rowstride;
                    for (let x = 0; x < w; x++) {
                        let offset = rowOffset + x * nChannels;
                        let r = pixels[offset];
                        let g = pixels[offset + 1];
                        let b = pixels[offset + 2];
                        let a = nChannels >= 4 ? pixels[offset + 3] : 255;
                        argbBytes.push(a, r, g, b);
                    }
                }
                return new GLib.Variant('a(iiay)', [[w, h, argbBytes]]);
            }
        } catch (e) {}
        return new GLib.Variant('a(iiay)', []);
    }

    /* Click: toggle the mode. Double-click: restore the bar; its first click
       already toggled once, so toggle back and the mode ends up unchanged.
       The double-click is timed here because tray icons do not reliably
       receive GTK's synthesized double-click event. */
    _onTrayPress(ev) {
        let [, button] = ev.get_button();
        if (button !== 1) return false;
        if (ev.get_event_type() !== Gdk.EventType.BUTTON_PRESS) return true;
        let now = GLib.get_monotonic_time();
        let interval = 400;
        try { interval = Gtk.Settings.get_default().gtk_double_click_time || 400; } catch (e) {}
        if (this._lastTrayPress && now - this._lastTrayPress < interval * 1000) {
            this._lastTrayPress = 0;
            this.toggleMode();
            this.restoreBar();
        } else {
            this._lastTrayPress = now;
            this.toggleMode();
        }
        return true;
    }

    _updateTray(size) {
        if (this.tray) {
            if (size) this._traySize = size;
            let px = this._traySize || 22;
            this.tray.set_from_pixbuf(iconPixbuf(this.bangla ? 'bangla' : 'english', px, 'dark'));
            let f12 = this._f12Works();
            let isAnsi = this.isAnsi();
            let modeTitle = isAnsi ? "BN [ANSI]" : "BN";
            let modeDesc = isAnsi ? "Running Bangla Keyboard Mode [ANSI / SutonnyMJ]" : "Running Bangla Keyboard Mode";
            let text = this.bangla
                ? "Avro Keyboard (" + modeTitle + ").\n" + modeDesc + ".\n" + (f12 ? "Press F12 to switch to English." : "Click to switch to English.")
                : "Avro Keyboard (EN).\nRunning English Keyboard Mode.\n" + (f12 ? "Press F12 to switch to Bangla." : "Click to switch to Bangla.");
            this.tray.set_tooltip_text(text);
        }
        if (this._sniBus && this.sniRegistered) {
            try {
                this._sniBus.emit_signal(null, "/StatusNotifierItem", "org.kde.StatusNotifierItem", "NewIcon", null);
                this._sniBus.emit_signal(null, "/StatusNotifierItem", "org.kde.StatusNotifierItem", "NewToolTip", null);
            } catch (e) {}
        }
    }

    hideToTray() {
        let [x] = this.window.get_position();
        if (this.window.get_visible()) this.settings.set('topbar-x', x);
        this.window.hide();
        this._updateTray();
        if (this.tray) this.tray.set_visible(true);
        this.settings.set('topbar-last-ui', 'tray');
        let shown = this.settings.get('tray-hint-count', 0);
        if (shown < 2) {
            this.settings.set('tray-hint-count', shown + 1);
            this._notify("Avro Keyboard", "Avro Keyboard is running in the system tray.");
        }
        // Only if NEITHER SNI nor Gtk.StatusIcon is available do we warn and restore:
        if (!this.sniRegistered && this.tray) {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                if (this.tray && this.tray.get_visible() && !this.tray.is_embedded() && !this.sniRegistered) {
                    this.restoreBar();
                    this._notify("Avro TopBar", "This desktop has no system tray, so the TopBar stays on screen.");
                }
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    restoreBar() {
        if (this.tray) this.tray.set_visible(false);
        if (!this.window.get_visible()) {
            this._placeInitialIfNeeded();
            this.window.show();
        }
        this.window.set_keep_above(true);
        this.settings.set('topbar-last-ui', 'topbar');
        this.opacity = 255;
        this.window.set_opacity(1);
        this._markActive();
    }

    _placeInitialIfNeeded() {
        if (!this._placed) {
            this._placeInitial();
            this._placed = true;
        }
    }

    _notify(title, body) {
        if (!this.app) return;
        try {
            let n = new Gio.Notification();
            n.set_title(title);
            n.set_body(body);
            this.app.send_notification(null, n);
        } catch (e) {}
    }

    /* ── dialogs ─────────────────────────────────────────────────────── */

    _info(title, primary, secondary) {
        let d = new Gtk.MessageDialog({
            title: title, message_type: Gtk.MessageType.INFO, buttons: Gtk.ButtonsType.OK,
            text: primary, secondary_text: secondary, modal: false
        });
        d.set_position(Gtk.WindowPosition.CENTER);
        d.connect('response', () => d.destroy());
        d.show();
    }

    aboutLayout() {
        let l = this._banglaLayout();
        let version = appVersion();
        if (l.avro && l.info) {
            // The credits stored in the Avro Keyboard layout file
            this._info("About...", "Internal Name : " + l.info.name,
                       "Version : " + l.info.version + "\n" +
                       "Developer : " + l.info.developer + "\n\n" +
                       "Developer's comment :\n" + l.info.comment);
        } else if (l.avro) {
            this._info("About...", "Internal Name : " + AVRO_LAYOUT_LABEL,
                       "Version : " + (version || "—") + "\n" +
                       "Developer : OmicronLab (Avro Phonetic), Avro Linux contributors\n\n" +
                       "Developer's comment :\nType Bangla phonetically with English letters, e.g. \"ami\" → আমি, " +
                       "with dictionary suggestions in the Preview Window.");
        } else {
            this._info("About...", "Internal Name : " + l.label,
                       "Version : XKB keyboard layout (" + l.layout + (l.variant ? "(" + l.variant + ")" : "") + ")\n" +
                       "Developer : xkeyboard-config\n\n" +
                       "Developer's comment :\n" + (l.description || l.label));
        }
    }

    aboutSkin() {
        let key = this.settings.get('topbar-skin', 'classic');
        let skin = SKINS[key] || SKINS.classic;
        this._info("About...", "Internal Name : " + skin.title,
                   "Version : 1.0\nDeveloper : Avro Linux\n\nDeveloper's comment :\n" + skin.comment);
    }

    aboutAvro() {
        let d = new Gtk.AboutDialog({
            program_name: "Avro Linux (Remastered Edition)",
            version: appVersion(),
            logo_icon_name: "avro-bangla",
            comments: "The Avro Phonetic Bengali input method for Linux, with a\n" +
                      "Windows-style TopBar and Preview Window.\n\n" +
                      "Avro Keyboard and Avro Phonetic by Dr. Mehdi Hasan Khan (OmicronLab).\n" +
                      "ibus-avro by Sarim Khan. Remastered by MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET).",
            website: "https://github.com/msbsurfi/avro-linux",
            authors: [
                "Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79)",
                "and MD Mehedi Hasan (CSE 21, BUET)",
                "Sarim Khan — ibus-avro",
                "Dr. Mehdi Hasan Khan — Avro Keyboard / OmicronLab",
                "Rifat Nabi — jsAvroPhonetic"
            ],
            license_type: Gtk.License.MPL_2_0,
            modal: false
        });
        d.connect('response', () => d.destroy());
        d.show();
    }

    /* ── lifecycle ───────────────────────────────────────────────────── */

    _connectSettings() {
        this.settings.connect('mode-bangla', () => this._refreshMode());
        this.settings.connect('bangla-layout', () => this._refreshMode());
        this.settings.connect('keyboard-layout', () => this._refreshMode());
        this.settings.connect('topbar-skin', () => this.area.queue_draw());
        this.settings.connect('topbar-transparent', () => this._markActive());
        this.settings.connect('topbar-transparency-level', () => this._markActive());
        this.settings.connect('output-encoding', () => {
            this.area.queue_draw();
            this._updateTray();
        });
    }

    /* Show according to the start-up setting (TopBar / tray / last used). */
    start(command) {
        let mode = this.settings.get('topbar-startup-ui', 'last');
        if (mode === 'last') mode = this.settings.get('topbar-last-ui', 'topbar');
        if (command === 'minimize') mode = 'tray';
        if (command === 'restore') mode = 'topbar';

        this._placeInitialIfNeeded();
        if (mode === 'tray' && (this.tray || this.sniRegistered)) {
            this.hideToTray();
        } else {
            this.restoreBar();
            let showSplash = this.settings.get('switch-splash', true);
            if (showSplash && !command) {
                try {
                    let splashModule = imports.splash;
                    if (splashModule && splashModule.showSplashScreen) {
                        splashModule.showSplashScreen(2000);
                    }
                } catch (e) {}
            }
        }
        if (command && command !== 'minimize' && command !== 'restore') {
            this.handleCommand(command);
        }
    }

    handleCommand(command) {
        switch (command) {
        case 'toggle': this.toggleMode(); break;
        case 'bn': this.setBangla(); break;
        case 'sys': this.setEnglish(); break;
        case 'minimize': this.hideToTray(); break;
        case 'restore':
        default: this.restoreBar(); break;
        }
    }

    exit() {
        if (this.window.get_visible()) {
            let [x] = this.window.get_position();
            this.settings.set('topbar-x', x);
        }
        if (this.tray) this.tray.set_visible(false);
        if (this._sniBus && this._sniObjId) {
            try { this._sniBus.unregister_object(this._sniObjId); } catch (e) {}
            this._sniObjId = 0;
        }
        for (let id of this._timers) GLib.source_remove(id);
        this._timers = [];
        this.closed = true;
        try {
            GLib.spawn_command_line_async("sh -c 'systemctl --user stop app-avro\\\\x2dtopbar@autostart.service 2>/dev/null || true'");
        } catch (e) {}
        if (this.app) this.app.quit();
        else this.window.destroy();
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
   Entry point: one TopBar per session. Running avro-topbar again restores
   the bar, or performs a command: toggle, bn, sys, minimize, restore.
   ═══════════════════════════════════════════════════════════════════════════ */
function runAvroTopBar(args) {
    args = args || [];
    if (!globalThis.__avroAppIdentity) {
        globalThis.__avroAppIdentity = true;
        try {
            GLib.set_prgname("avro-topbar");
            GLib.set_application_name("Avro Keyboard");
        } catch (e) {}
    }
    let app = new Gtk.Application({
        application_id: APP_ID,
        flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE
    });
    let bar = null;
    app.connect('command-line', (application, cmdline) => {
        let command = parseTopBarCommand(cmdline.get_arguments().slice(1));
        if (!bar) {
            bar = new AvroTopBar(application);
            bar.start(command);
            setUpStartOnLogin(bar.settings);
            // After the splash screen
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2600, () => {
                try { offerKeyboardList(bar); } catch (e) {}
                return GLib.SOURCE_REMOVE;
            });
        } else {
            bar.handleCommand(command || 'restore');
        }
        return 0;
    });
    return app.run(['avro-topbar'].concat(args));
}

/* Kept for the TopBar's own callers. */
function togglePreviewWindow() {
    let s = new SafeSettings(SCHEMA_ID);
    s.set('switch-preview', !s.get('switch-preview', true));
}

/* ═══════════════════════════════════════════════════════════════════════════
   Standalone entrypoint
   ═══════════════════════════════════════════════════════════════════════════ */
let _isMain = false;
try {
    // Exact file name: a script that merely imports this module (for
    // example tests/ui/test-topbar.js) must not start a TopBar.
    let prog = GLib.path_get_basename(imports.system.programInvocationName || "");
    if (prog === 'topbar.js') _isMain = true;
    if (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1 && prog === 'topbar.js') _isMain = true;
} catch (e) {}

if (_isMain) {
    if (GLib.getenv('DISPLAY')) {
        try { Gdk.set_allowed_backends('x11'); } catch (e) {}
    }
    imports.system.exit(runAvroTopBar(ARGV.filter(a => a !== '--standalone')));
}
