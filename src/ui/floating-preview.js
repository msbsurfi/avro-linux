#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Windows-style Preview Window
    SPDX-License-Identifier: MPL-2.0
    Developer & Maintainer: MD Shifat Bin Siddique Urfi

    The classic Avro Keyboard "Preview Window": a small floating window next to
    the text cursor that shows what you typed in English (yellow row) and the
    Bangla suggestions below it, with the selected word highlighted in blue.

    The IBus engine imports this module and drives the window in-process, so it
    updates on every keystroke without IPC.  The window is an X11
    override-redirect popup: the window manager never gives it keyboard focus,
    so it can never take focus away from the application you are typing in.

    Run directly (`avro-preview`) it is a small command-line helper that turns
    the preview on/off or shows a demo window.
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const SCHEMA_ID = "com.omicronlab.avro";
const BENGALI_FONTS = '"Noto Sans Bengali", "Kalpurush", "SolaimanLipi", "Siyam Rupali", "Hind Siliguri", sans-serif';
const LATIN_FONTS = '"Noto Sans", "DejaVu Sans", "Segoe UI", sans-serif';

/* ═══════════════════════════════════════════════════════════════════════════
   Themes. "classic" mirrors the Windows Avro Keyboard preview window.
   Sizes are in points so they follow the desktop font DPI setting.
   ═══════════════════════════════════════════════════════════════════════════ */
const THEMES = {
    classic: {
        frame: '#7a7a7a', titleTop: '#fdfdfd', titleBottom: '#e8e8e8', titleBorder: '#cdcdcd',
        titleText: '#1e1e1e', romanBg: '#ffffe1', romanText: '#000000', romanBorder: '#e2e2c4',
        listBg: '#ffffff', itemText: '#000000', hoverBg: '#e5f1fb', selBg: '#0078d7', selText: '#ffffff',
        pinIdle: '#5a5a5a', pinActive: '#0078d7', pinHover: '#dcdcdc'
    },
    dark: {
        frame: '#3c3f45', titleTop: '#2f3237', titleBottom: '#26282c', titleBorder: '#3c3f45',
        titleText: '#d7dae0', romanBg: '#3a3524', romanText: '#ffe9a6', romanBorder: '#4a4430',
        listBg: '#1f2125', itemText: '#e8eaed', hoverBg: '#2d3138', selBg: '#2f6fbd', selText: '#ffffff',
        pinIdle: '#9aa0a6', pinActive: '#5ea4ff', pinHover: '#3a3d43'
    }
};

function buildCss(themeName) {
    let t = THEMES[themeName] || THEMES.classic;
    return `
.avro-pw-window { background-color: ${t.frame}; }
.avro-pw-title { background-color: ${t.titleBottom}; background-image: linear-gradient(to bottom, ${t.titleTop}, ${t.titleBottom});
                 border-bottom: 1px solid ${t.titleBorder}; }
.avro-pw-title-label { color: ${t.titleText}; font-family: ${LATIN_FONTS}; font-size: 8.5pt; padding: 2px 6px 2px 3px; }
.avro-pw-roman { background-color: ${t.romanBg}; color: ${t.romanText}; font-family: ${LATIN_FONTS};
                 font-weight: bold; font-size: 10.5pt; padding: 2px 10px 3px 7px; border-bottom: 1px solid ${t.romanBorder}; }
.avro-pw-item { background-color: ${t.listBg}; color: ${t.itemText}; font-family: ${BENGALI_FONTS};
                font-size: 13pt; padding: 0 14px 1px 7px; }
.avro-pw-item.avro-hover { background-color: ${t.hoverBg}; }
.avro-pw-item.avro-sel { background-color: ${t.selBg}; color: ${t.selText}; }
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Geometry (pure, unit-tested): place the window just below the caret,
   flip it above when there is no room below, and keep it on the monitor.
   ═══════════════════════════════════════════════════════════════════════════ */
var CURSOR_GAP = 4;

function computePopupPosition(cursor, size, monitor) {
    let x = cursor.x;
    let y = cursor.y + Math.max(cursor.h, 0) + CURSOR_GAP;

    if (x + size.width > monitor.x + monitor.width) {
        x = monitor.x + monitor.width - size.width;
    }
    if (x < monitor.x) {
        x = monitor.x;
    }
    if (y + size.height > monitor.y + monitor.height) {
        let above = cursor.y - CURSOR_GAP - size.height;
        y = (above >= monitor.y) ? above : monitor.y + monitor.height - size.height;
    }
    if (y < monitor.y) {
        y = monitor.y;
    }
    return { x: Math.round(x), y: Math.round(y) };
}

function clampToMonitor(pos, size, monitor) {
    let x = Math.min(Math.max(pos.x, monitor.x), monitor.x + monitor.width - size.width);
    let y = Math.min(Math.max(pos.y, monitor.y), monitor.y + monitor.height - size.height);
    return { x: Math.round(x), y: Math.round(y) };
}

/* An application that cannot report its caret sends an empty rectangle. */
function isUsableCursor(cursor) {
    return !!cursor && !(cursor.x <= 0 && cursor.y <= 0 && cursor.w <= 0 && cursor.h <= 0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   GTK setup. Only X11 (or XWayland) lets a popup be placed at an absolute
   screen position, so the window is never created on a native Wayland
   connection; callers fall back to the desktop's own IBus candidate panel.
   ═══════════════════════════════════════════════════════════════════════════ */
let _gtkState = null;

function initGtk() {
    if (_gtkState !== null) {
        return _gtkState;
    }
    _gtkState = false;
    try {
        if (!GLib.getenv("DISPLAY")) {
            return _gtkState;
        }
        // Never route this process' own (focus-less) widgets through IBus.
        GLib.setenv("GTK_IM_MODULE", "gtk-im-context-simple", true);
        Gdk.set_allowed_backends("x11");
        let res = Gtk.init_check(null);
        _gtkState = Array.isArray(res) ? !!res[0] : !!res;
    } catch (e) {
        _gtkState = false;
    }
    return _gtkState;
}

function findIcon(iconPath) {
    let candidates = [
        iconPath,
        "/usr/share/avro-linux/icons/avro-bangla.png",
        "/usr/share/icons/hicolor/16x16/apps/avro-bangla.png",
        GLib.get_current_dir() + "/data/icons/16x16/avro-bangla.png"
    ];
    for (let p of candidates) {
        if (p && GLib.file_test(p, GLib.FileTest.EXISTS)) {
            return p;
        }
    }
    return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   The Preview Window
   ═══════════════════════════════════════════════════════════════════════════ */
var PreviewWindow = class PreviewWindow {
    /**
     * @param {Object} opts
     *   iconPath              — Avro logo for the title bar
     *   theme                 — "classic" (default) or "dark"
     *   pinned, pinX, pinY    — restore a pinned position
     *   onCandidateActivated  — function(index): a candidate was clicked
     *   onPinChanged          — function(pinned, x, y): the user pinned/moved it
     */
    constructor(opts) {
        opts = opts || {};
        this._onCandidateActivated = opts.onCandidateActivated || null;
        this._onPinChanged = opts.onPinChanged || null;
        this._pinned = !!opts.pinned;
        this._pinPos = (opts.pinX >= 0 && opts.pinY >= 0) ? { x: opts.pinX, y: opts.pinY } : null;
        this._cursor = null;
        this._rows = [];
        this._count = 0;
        this._drag = null;
        this._visible = false;

        this._css = new Gtk.CssProvider();
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), this._css,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION + 10);
        this.setTheme(opts.theme || "classic");

        this._buildWindow(findIcon(opts.iconPath));
    }

    _buildWindow(iconFile) {
        this._window = new Gtk.Window({ type: Gtk.WindowType.POPUP, resizable: false });
        this._window.set_type_hint(Gdk.WindowTypeHint.TOOLTIP);
        this._window.get_style_context().add_class("avro-pw-window");
        // The 1px of window background around the content is the frame line.
        this._window.set_border_width(1);

        let box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });

        // Title bar: [logo] Preview Window ............ [pin]
        this._title = new Gtk.EventBox({ visible_window: true });
        this._title.get_style_context().add_class("avro-pw-title");
        this._title.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON_RELEASE_MASK |
                               Gdk.EventMask.POINTER_MOTION_MASK);
        let titleBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0 });
        if (iconFile) {
            try {
                let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(iconFile, 14, 14);
                titleBox.pack_start(new Gtk.Image({ pixbuf: pixbuf, margin_start: 4 }), false, false, 0);
            } catch (e) {}
        }
        let titleLabel = new Gtk.Label({ label: "Preview Window", xalign: 0 });
        titleLabel.get_style_context().add_class("avro-pw-title-label");
        titleBox.pack_start(titleLabel, true, true, 0);

        this._pinHover = false;
        this._pinBox = new Gtk.EventBox({ visible_window: false, above_child: true,
                                          valign: Gtk.Align.CENTER, margin_end: 3 });
        this._pinBox.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON_RELEASE_MASK |
                                Gdk.EventMask.ENTER_NOTIFY_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK);
        this._pinArea = new Gtk.DrawingArea();
        this._pinArea.set_size_request(18, 16);
        this._pinArea.connect("draw", (w, cr) => this._drawPin(w, cr));
        this._pinBox.add(this._pinArea);
        this._pinBox.set_tooltip_text("Pin: keep the window in place instead of following the cursor");
        titleBox.pack_end(this._pinBox, false, false, 0);
        this._title.add(titleBox);
        box.pack_start(this._title, false, false, 0);

        this._title.connect("button-press-event", (w, ev) => this._onTitlePress(ev));
        this._title.connect("motion-notify-event", (w, ev) => this._onTitleMotion(ev));
        this._title.connect("button-release-event", (w, ev) => this._onTitleRelease(ev));
        this._pinBox.connect("button-press-event", () => true);
        this._pinBox.connect("button-release-event", () => { this._togglePin(); return true; });
        this._pinBox.connect("enter-notify-event", () => { this._pinHover = true; this._pinArea.queue_draw(); return false; });
        this._pinBox.connect("leave-notify-event", () => { this._pinHover = false; this._pinArea.queue_draw(); return false; });

        // Yellow row with the English (roman) text being typed
        this._roman = new Gtk.Label({ label: "", xalign: 0 });
        this._roman.get_style_context().add_class("avro-pw-roman");
        box.pack_start(this._roman, false, false, 0);

        // Candidate list
        this._list = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
        this._list.get_style_context().add_class("avro-pw-list");
        // A minimum width (scaled with the font DPI) stops the window from
        // jittering as the words change.
        let dpi = Gdk.Screen.get_default().get_resolution();
        this._list.set_size_request(Math.round(140 * (dpi > 0 ? dpi / 96 : 1)), -1);
        box.pack_start(this._list, false, false, 0);

        this._window.add(box);
        box.show_all();
    }

    _row(index) {
        while (this._rows.length <= index) {
            let i = this._rows.length;
            let ebox = new Gtk.EventBox({ visible_window: false, above_child: true });
            ebox.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON_RELEASE_MASK |
                            Gdk.EventMask.ENTER_NOTIFY_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK);
            let label = new Gtk.Label({ label: "", xalign: 0 });
            label.get_style_context().add_class("avro-pw-item");
            ebox.add(label);
            ebox.connect("enter-notify-event", () => { label.get_style_context().add_class("avro-hover"); return false; });
            ebox.connect("leave-notify-event", () => { label.get_style_context().remove_class("avro-hover"); return false; });
            ebox.connect("button-press-event", () => true);
            ebox.connect("button-release-event", (w, ev) => {
                let [, button] = ev.get_button();
                if (button === 1 && this._onCandidateActivated) {
                    this._onCandidateActivated(i);
                }
                return true;
            });
            this._list.pack_start(ebox, false, false, 0);
            ebox.show_all();
            this._rows.push({ ebox: ebox, label: label });
        }
        return this._rows[index];
    }

    setTheme(themeName) {
        this._themeName = THEMES[themeName] ? themeName : "classic";
        let css = buildCss(this._themeName);
        try {
            this._css.load_from_data(css);
        } catch (e) {
            this._css.load_from_data(new TextEncoder().encode(css));
        }
        if (this._pinArea) {
            this._pinArea.queue_draw();
        }
    }

    isVisible() {
        return this._visible;
    }

    isPinned() {
        return this._pinned;
    }

    setPinned(pinned, x, y) {
        this._pinned = !!pinned;
        if (x >= 0 && y >= 0) {
            this._pinPos = { x: x, y: y };
        }
        this._pinArea.queue_draw();
        if (this._visible) {
            this._place();
        }
    }

    /**
     * Show (or refresh) the window.
     * @param {string} roman       English text typed so far
     * @param {string[]} candidates Bangla suggestions
     * @param {number} selected    index of the highlighted suggestion
     * @param {Object} cursor      caret rectangle {x, y, w, h} in screen pixels
     */
    update(roman, candidates, selected, cursor) {
        candidates = candidates || [];
        if ((!roman || roman.length === 0) && candidates.length === 0) {
            this.hide();
            return;
        }
        if (cursor) {
            this._cursor = cursor;
        }
        this._roman.set_text(roman || "");

        for (let i = 0; i < candidates.length; i++) {
            let row = this._row(i);
            row.label.set_text(candidates[i]);
            let ctx = row.label.get_style_context();
            if (i === selected) {
                ctx.add_class("avro-sel");
            } else {
                ctx.remove_class("avro-sel");
            }
            if (i >= this._count) {
                row.ebox.show();
            }
        }
        for (let i = candidates.length; i < this._count; i++) {
            this._rows[i].ebox.hide();
            this._rows[i].label.get_style_context().remove_class("avro-hover");
        }
        this._count = candidates.length;

        // Shrink back to the natural size of the new content
        this._window.resize(1, 1);
        this._place();
        if (!this._visible) {
            this._window.show();
            this._visible = true;
        }
    }

    setCursorLocation(cursor) {
        this._cursor = cursor;
        if (this._visible && !this._pinned && !this._drag) {
            this._place();
        }
    }

    hide() {
        this._drag = null;
        if (this._visible) {
            this._window.hide();
            this._visible = false;
        }
    }

    destroy() {
        this.hide();
        this._window.destroy();
    }

    /* ── placement ─────────────────────────────────────────────────────── */

    _size() {
        let [, natural] = this._window.get_preferred_size();
        return { width: natural.width, height: natural.height };
    }

    _monitorAt(x, y) {
        let display = Gdk.Display.get_default();
        let monitor = null;
        try {
            monitor = display.get_monitor_at_point(x, y);
        } catch (e) {}
        if (!monitor) {
            try { monitor = display.get_primary_monitor() || display.get_monitor(0); } catch (e) {}
        }
        if (monitor) {
            let g = monitor.get_geometry();
            return { x: g.x, y: g.y, width: g.width, height: g.height, scale: monitor.get_scale_factor() || 1 };
        }
        let screen = Gdk.Screen.get_default();
        return { x: 0, y: 0, width: screen.get_width(), height: screen.get_height(), scale: 1 };
    }

    _pointer() {
        try {
            let pointer = Gdk.Display.get_default().get_default_seat().get_pointer();
            let [, px, py] = pointer.get_position();
            return { x: px, y: py + 12, w: 0, h: 8 };
        } catch (e) {
            return { x: 100, y: 100, w: 0, h: 0 };
        }
    }

    _place() {
        let size = this._size();
        let pos;
        if (this._pinned && this._pinPos) {
            pos = clampToMonitor(this._pinPos, size, this._monitorAt(this._pinPos.x, this._pinPos.y));
        } else {
            let cursor = isUsableCursor(this._cursor) ? this._cursor : this._pointer();
            // IBus reports device pixels; GTK positions windows in logical pixels.
            let scale = this._monitorAt(cursor.x, cursor.y).scale;
            if (scale > 1) {
                cursor = { x: cursor.x / scale, y: cursor.y / scale, w: cursor.w / scale, h: cursor.h / scale };
            }
            pos = computePopupPosition(cursor, size, this._monitorAt(cursor.x, cursor.y));
        }
        this._window.move(pos.x, pos.y);
    }

    /* ── pin & drag ────────────────────────────────────────────────────── */

    _togglePin() {
        this._pinned = !this._pinned;
        if (this._pinned) {
            let [x, y] = this._window.get_position();
            this._pinPos = { x: x, y: y };
        }
        this._pinArea.queue_draw();
        this._notifyPin();
        if (this._visible) {
            this._place();
        }
    }

    _notifyPin() {
        if (this._onPinChanged) {
            let p = this._pinPos || { x: -1, y: -1 };
            this._onPinChanged(this._pinned, p.x, p.y);
        }
    }

    _onTitlePress(ev) {
        let [, button] = ev.get_button();
        if (button !== 1) {
            return false;
        }
        let [, rx, ry] = ev.get_root_coords();
        let [wx, wy] = this._window.get_position();
        this._drag = { startX: rx, startY: ry, winX: wx, winY: wy, moved: false };
        return true;
    }

    _onTitleMotion(ev) {
        if (!this._drag) {
            return false;
        }
        let [, rx, ry] = ev.get_root_coords();
        let dx = rx - this._drag.startX;
        let dy = ry - this._drag.startY;
        if (!this._drag.moved && Math.abs(dx) + Math.abs(dy) < 4) {
            return true;
        }
        this._drag.moved = true;
        this._window.move(Math.round(this._drag.winX + dx), Math.round(this._drag.winY + dy));
        return true;
    }

    _onTitleRelease(ev) {
        if (!this._drag) {
            return false;
        }
        let moved = this._drag.moved;
        this._drag = null;
        if (moved) {
            // Dragging the window somewhere means "keep it there", like Windows Avro.
            let [x, y] = this._window.get_position();
            this._pinPos = { x: x, y: y };
            this._pinned = true;
            this._pinArea.queue_draw();
            this._notifyPin();
        }
        return true;
    }

    _drawPin(widget, cr) {
        let t = THEMES[this._themeName] || THEMES.classic;
        let rgba = new Gdk.RGBA();
        let w = widget.get_allocated_width();
        let h = widget.get_allocated_height();

        if (this._pinHover) {
            rgba.parse(t.pinHover);
            cr.setSourceRGBA(rgba.red, rgba.green, rgba.blue, 1);
            cr.rectangle(0, 0, w, h);
            cr.fill();
        }
        rgba.parse(this._pinned ? t.pinActive : t.pinIdle);
        cr.translate(w / 2, h / 2);
        // A pin lying on its side means "not pinned"; upright means "pinned".
        cr.rotate(this._pinned ? 0 : -Math.PI / 4);
        cr.setSourceRGBA(rgba.red, rgba.green, rgba.blue, 1);
        cr.rectangle(-2.5, -6.5, 5, 5);      // head
        cr.fill();
        cr.rectangle(-4.5, -1.5, 9, 2);      // collar
        cr.fill();
        cr.setLineWidth(1.4);
        cr.moveTo(0, 0.5);                   // needle
        cr.lineTo(0, 7);
        cr.stroke();
        cr.$dispose();
        return false;
    }
};

/**
 * Create the preview window, or return null when no X11/XWayland display is
 * available (the engine then uses the desktop's IBus candidate panel).
 */
function createPreviewWindow(opts) {
    if (!initGtk()) {
        return null;
    }
    try {
        return new PreviewWindow(opts);
    } catch (e) {
        return null;
    }
}

// Backwards-compatible name used by older Avro Linux tools and tests.
var FloatingPreviewUI = PreviewWindow;

/* ═══════════════════════════════════════════════════════════════════════════
   Command-line helper: avro-preview [--on | --off | --status | --demo]
   ═══════════════════════════════════════════════════════════════════════════ */
function _settings() {
    try {
        let source = Gio.SettingsSchemaSource.get_default();
        if (source && source.lookup(SCHEMA_ID, true)) {
            return new Gio.Settings({ schema_id: SCHEMA_ID });
        }
    } catch (e) {}
    return null;
}

function _runDemo(args) {
    if (!initGtk()) {
        printerr("avro-preview: no X11 display available for the demo window.");
        return 1;
    }
    let roman = "ami";
    let themeName = "classic";
    let timeout = 20;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--theme" && args[i + 1]) themeName = args[++i];
        else if (args[i] === "--timeout" && args[i + 1]) timeout = parseInt(args[++i], 10) || timeout;
        else if (args[i].indexOf("--") !== 0) roman = args[i];
    }

    let words = [roman];
    try {
        let base = "/usr/share/avro-linux";
        let local = GLib.get_current_dir() + "/src";
        let root = GLib.file_test(local + "/avro-core", GLib.FileTest.IS_DIR) ? local : base;
        ["/common", "/avro-core/phonetic", "/avro-core/dictionary",
         "/avro-core/autocorrect", "/avro-core/suggestions"].forEach(p => imports.searchPath.unshift(root + p));
        let builder = new imports.suggestionbuilder.SuggestionBuilder();
        words = builder.suggest(roman).words || words;
    } catch (e) {}

    let ui = new PreviewWindow({ theme: themeName });
    let selected = 0;
    let screen = Gdk.Screen.get_default();
    let cursor = { x: Math.floor(screen.get_width() / 2) - 60, y: Math.floor(screen.get_height() / 3), w: 1, h: 18 };
    ui._onCandidateActivated = (i) => { selected = i; ui.update(roman, words, selected, cursor); };
    ui.update(roman, words, selected, cursor);
    GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timeout, () => { Gtk.main_quit(); return GLib.SOURCE_REMOVE; });
    print("Showing the Avro Preview Window demo for " + timeout + " seconds…");
    Gtk.main();
    return 0;
}

var runFloatingPreview = function runFloatingPreview(args) {
    args = args || [];
    if (args.indexOf("--demo") !== -1) {
        return _runDemo(args.filter(a => a !== "--demo" && a !== "--run" && a !== "--standalone"));
    }
    if (args.indexOf("--help") !== -1 || args.indexOf("-h") !== -1) {
        print("Usage: avro-preview [--on | --off | --status | --demo [text] [--theme classic|dark]]\n" +
              "  Without options, turns the Avro Preview Window on or off.");
        return 0;
    }

    let settings = _settings();
    if (!settings) {
        printerr("avro-preview: the Avro settings schema (" + SCHEMA_ID + ") is not installed.");
        return 1;
    }
    let state = settings.get_boolean("switch-preview");
    if (args.indexOf("--status") === -1) {
        if (args.indexOf("--on") !== -1) state = true;
        else if (args.indexOf("--off") !== -1) state = false;
        else state = !state;
        settings.set_boolean("switch-preview", state);
        Gio.Settings.sync();
    }
    print("Avro Preview Window: " + (state ? "ON" : "OFF"));
    return 0;
};

let _isMain = false;
try {
    let prog = imports.system.programInvocationName || "";
    if (prog.indexOf("floating-preview") !== -1 || prog.indexOf("avro-preview") !== -1) {
        _isMain = true;
    }
    if (typeof ARGV !== 'undefined' && (ARGV.indexOf('--standalone') !== -1 || ARGV.indexOf('--run') !== -1)) {
        _isMain = true;
    }
    if (typeof ARGV !== 'undefined' && ARGV.indexOf('--no-exec') !== -1) {
        _isMain = false;
    }
} catch (e) {}

if (_isMain) {
    imports.system.exit(runFloatingPreview(typeof ARGV !== 'undefined' ? ARGV : []) || 0);
}
