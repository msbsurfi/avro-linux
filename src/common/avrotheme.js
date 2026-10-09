/*
    =============================================================================
    Avro Linux — Shared Modern Theme (Fluent / Windows 11 inspired)
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET)

    One look for every Avro window: rounded cards, an accent colour, a clean
    header bar, sidebar navigation and automatic light / dark palettes.
    Everything is scoped to the ".avro-win" style class, so nothing outside of
    Avro windows is ever restyled.
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Pango = imports.gi.Pango;

const PALETTES = {
    light: {
        name: 'light',
        bg: '#f3f3f3', bgAlt: '#ebebeb', surface: '#ffffff', surfaceHover: '#f7f7f7',
        border: '#e0e0e0', borderStrong: '#c8c8c8',
        text: '#1b1b1b', subtext: '#605e5c', faint: '#8a8886',
        accent: '#0067c0', accentHover: '#1a78c9', accentActive: '#0f5aa5', accentFg: '#ffffff',
        accentSoft: 'rgba(0,103,192,0.10)',
        ok: '#107c10', warn: '#9d5d00', err: '#c42b1c',
        okSoft: 'rgba(16,124,16,0.12)', warnSoft: 'rgba(157,93,0,0.14)', errSoft: 'rgba(196,43,28,0.12)',
        hover: 'rgba(0,0,0,0.06)', press: 'rgba(0,0,0,0.10)',
        editorBg: '#ffffff', keyTop: '#ffffff', keyBottom: '#dcdcdc', keyText: '#1b1b1b',
        shadow: 'rgba(0,0,0,0.12)', preedit: '#0067c0', hint: '#8a8886'
    },
    dark: {
        name: 'dark',
        bg: '#202020', bgAlt: '#181818', surface: '#2b2b2b', surfaceHover: '#323232',
        border: '#3b3b3b', borderStrong: '#505050',
        text: '#f5f5f5', subtext: '#b4b2b0', faint: '#8a8886',
        accent: '#4cc2ff', accentHover: '#6bcdff', accentActive: '#3aa6e0', accentFg: '#00263a',
        accentSoft: 'rgba(76,194,255,0.14)',
        ok: '#6ccb5f', warn: '#fce100', err: '#ff99a4',
        okSoft: 'rgba(108,203,95,0.16)', warnSoft: 'rgba(252,225,0,0.14)', errSoft: 'rgba(255,153,164,0.16)',
        hover: 'rgba(255,255,255,0.07)', press: 'rgba(255,255,255,0.11)',
        editorBg: '#1c1c1c', keyTop: '#424242', keyBottom: '#2f2f2f', keyText: '#f5f5f5',
        shadow: 'rgba(0,0,0,0.45)', preedit: '#4cc2ff', hint: '#8a8886'
    }
};

var _provider = null;
var _palette = null;

/* Decide between the light and dark palette. AVRO_THEME=dark|light forces one. */
function detectDark() {
    let forced = (GLib.getenv('AVRO_THEME') || '').toLowerCase();
    if (forced === 'dark') return true;
    if (forced === 'light') return false;

    // 1. Freedesktop colour-scheme preference
    try {
        let src = Gio.SettingsSchemaSource.get_default();
        if (src && src.lookup('org.gnome.desktop.interface', true)) {
            let s = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
            let scheme = s.get_string('color-scheme');
            if (scheme === 'prefer-dark') return true;
            if (scheme === 'prefer-light') return false;
        }
    } catch (e) {}

    // 2. Luminance of the active GTK theme background
    try {
        let ctx = new Gtk.Window().get_style_context();
        let [ok, c] = ctx.lookup_color('theme_bg_color');
        if (ok) return (0.299 * c.red + 0.587 * c.green + 0.114 * c.blue) < 0.5;
    } catch (e) {}

    // 3. Theme name / explicit GTK preference
    try {
        let st = Gtk.Settings.get_default();
        if (st.gtk_application_prefer_dark_theme) return true;
        let n = (st.gtk_theme_name || '').toLowerCase();
        if (n.indexOf('dark') !== -1) return true;
    } catch (e) {}
    return false;
}

function palette() {
    if (!_palette) _palette = detectDark() ? PALETTES.dark : PALETTES.light;
    return _palette;
}

function _css(p) {
    return `
.avro-win { background-color: ${p.bg}; background-image: none; color: ${p.text}; }
.avro-win label { color: ${p.text}; }
.avro-win .avro-sub, .avro-win label.avro-sub { color: ${p.subtext}; font-size: 9.5pt; }
.avro-win .avro-faint, .avro-win label.avro-faint { color: ${p.faint}; }
.avro-win separator { background-color: ${p.border}; background-image: none; min-height: 1px; min-width: 1px; }

/* Header bar */
headerbar.avro-header {
    background-color: ${p.bg}; background-image: none;
    border: none; border-bottom: 1px solid ${p.border}; box-shadow: none;
    min-height: 52px; padding: 0 8px;
}
headerbar.avro-header label.avro-title { color: ${p.text}; font-weight: 600; font-size: 11.5pt; }
headerbar.avro-header label.avro-subtitle { color: ${p.subtext}; font-size: 8.5pt; font-weight: 400; }
headerbar.avro-header button.avro-winctl {
    color: ${p.text}; background: transparent; border: none; box-shadow: none;
    border-radius: 6px; min-height: 30px; min-width: 38px; padding: 0; margin: 0;
}
headerbar.avro-header button.avro-winctl:hover { background-color: ${p.hover}; }
headerbar.avro-header button.avro-winctl:active { background-color: ${p.press}; }
headerbar.avro-header button.avro-winctl-close:hover { background-color: #c42b1c; }
headerbar.avro-header button.avro-winctl-close:hover image { color: #ffffff; }
headerbar.avro-header button { background-image: none; box-shadow: none; text-shadow: none; }

/* Cards */
.avro-win .avro-card {
    background-color: ${p.surface}; background-image: none;
    border: 1px solid ${p.border}; border-radius: 8px;
    box-shadow: 0 1px 2px ${p.shadow};
}
.avro-win .avro-row { padding: 14px 18px; background: transparent; }
.avro-win .avro-row-title { color: ${p.text}; font-size: 10.5pt; font-weight: 500; }
.avro-win .avro-row-sub { color: ${p.subtext}; font-size: 9pt; }
.avro-win .avro-section { color: ${p.text}; font-size: 12.5pt; font-weight: 600; margin: 4px 2px 0 2px; }
.avro-win .avro-page-title { color: ${p.text}; font-size: 20pt; font-weight: 700; }
.avro-win .avro-hero-title { color: ${p.text}; font-size: 22pt; font-weight: 700; }
.avro-win .avro-accent-text { color: ${p.accent}; }

/* Sidebar navigation */
.avro-win .avro-sidebar { background-color: ${p.bgAlt}; background-image: none; border-right: 1px solid ${p.border}; }
.avro-win .avro-nav, .avro-win .avro-nav row { background: transparent; background-image: none; }
.avro-win .avro-nav row {
    border-radius: 6px; margin: 2px 8px; padding: 9px 12px; color: ${p.text};
    border: none; outline: none;
}
.avro-win .avro-nav row label { color: ${p.text}; font-size: 10.5pt; }
.avro-win .avro-nav row:hover { background-color: ${p.hover}; }
.avro-win .avro-nav row:selected, .avro-win .avro-nav row:selected:hover {
    background-color: ${p.accentSoft}; background-image: none;
    box-shadow: inset 3px 0 0 0 ${p.accent};
}
.avro-win .avro-nav row:selected label { font-weight: 600; color: ${p.text}; }

/* Buttons */
.avro-win button {
    background-color: ${p.surface}; background-image: none; color: ${p.text};
    border: 1px solid ${p.border}; border-bottom-color: ${p.borderStrong};
    border-radius: 6px; padding: 6px 16px; min-height: 22px; box-shadow: none; text-shadow: none;
    transition: background-color 120ms ease, border-color 120ms ease;
}
.avro-win button label { color: inherit; }
.avro-win button:hover { background-color: ${p.surfaceHover}; border-color: ${p.borderStrong}; }
.avro-win button:active, .avro-win button:checked { background-color: ${p.press}; }
.avro-win button:disabled { opacity: 0.5; }
.avro-win button:focus { outline: none; box-shadow: 0 0 0 2px ${p.accentSoft}; }
.avro-win button.suggested-action, .avro-win button.avro-primary {
    background-color: ${p.accent}; background-image: none; color: ${p.accentFg};
    border: 1px solid ${p.accent}; font-weight: 600;
}
.avro-win button.suggested-action label, .avro-win button.avro-primary label { color: ${p.accentFg}; }
.avro-win button.suggested-action:hover, .avro-win button.avro-primary:hover { background-color: ${p.accentHover}; border-color: ${p.accentHover}; }
.avro-win button.suggested-action:active, .avro-win button.avro-primary:active { background-color: ${p.accentActive}; }
.avro-win button.destructive-action { color: ${p.err}; }
.avro-win button.destructive-action label { color: ${p.err}; }
.avro-win button.destructive-action:hover { background-color: ${p.errSoft}; border-color: ${p.err}; }
.avro-win button.flat, .avro-win button.avro-ghost {
    background-color: transparent; border-color: transparent; box-shadow: none;
}
.avro-win button.flat:hover, .avro-win button.avro-ghost:hover { background-color: ${p.hover}; border-color: transparent; }
.avro-win button.flat:active, .avro-win button.avro-ghost:active { background-color: ${p.press}; }
.avro-win button.avro-icon-btn { padding: 6px 8px; min-width: 22px; }
.avro-win button.avro-pill { border-radius: 999px; padding: 3px 18px; min-height: 22px; font-weight: 600; }
.avro-win button.avro-pill.avro-on { background-color: ${p.accent}; border-color: ${p.accent}; color: ${p.accentFg}; }
.avro-win button.avro-pill.avro-on label { color: ${p.accentFg}; }
.avro-win button.avro-pill.avro-off { background-color: ${p.surface}; color: ${p.text}; }

/* Entries, combo boxes, spin buttons */
.avro-win entry, .avro-win spinbutton {
    background-color: ${p.surface}; background-image: none; color: ${p.text};
    border: 1px solid ${p.border}; border-bottom-color: ${p.borderStrong};
    border-radius: 6px; padding: 6px 10px; min-height: 22px; box-shadow: none;
    caret-color: ${p.accent};
}
.avro-win entry:focus, .avro-win spinbutton:focus {
    border-color: ${p.border}; border-bottom: 2px solid ${p.accent}; box-shadow: none;
}
.avro-win entry selection, .avro-win textview text selection {
    background-color: ${p.accent}; color: ${p.accentFg};
}
.avro-win spinbutton button { border: none; background: transparent; padding: 0 6px; min-height: 0; border-radius: 4px; }
.avro-win combobox button.combo { padding: 5px 12px; min-width: 120px; }
.avro-win textview, .avro-win textview text { background-color: ${p.editorBg}; color: ${p.text}; caret-color: ${p.accent}; }
.avro-win scrolledwindow { border: none; background: transparent; }
.avro-win scrolledwindow.avro-framed { border: 1px solid ${p.border}; border-radius: 8px; background-color: ${p.editorBg}; }
.avro-win button.link, .avro-win button.link label { color: ${p.accent}; background: transparent; border-color: transparent; }

/* Switch */
.avro-win switch {
    min-width: 44px; min-height: 22px; border-radius: 11px; padding: 0;
    background-color: transparent; background-image: none;
    border: 1px solid ${p.borderStrong}; box-shadow: none; color: transparent;
}
.avro-win switch slider {
    min-width: 14px; min-height: 14px; margin: 3px; border-radius: 50%;
    background-color: ${p.subtext}; background-image: none; border: none; box-shadow: none;
}
.avro-win switch:checked { background-color: ${p.accent}; border-color: ${p.accent}; }
.avro-win switch:checked slider { background-color: ${p.accentFg}; }
.avro-win switch:disabled { opacity: 0.5; }
.avro-win switch label { color: transparent; font-size: 0; }

/* Scale */
.avro-win scale trough { background-color: ${p.borderStrong}; background-image: none; border: none; border-radius: 3px; min-height: 4px; }
.avro-win scale highlight { background-color: ${p.accent}; background-image: none; border: none; border-radius: 3px; }
.avro-win scale slider {
    background-color: ${p.surface}; background-image: none; border: 2px solid ${p.accent};
    border-radius: 50%; min-width: 16px; min-height: 16px; box-shadow: none;
}
.avro-win scale slider:hover { background-color: ${p.accentSoft}; }

/* Scrollbars */
.avro-win scrollbar { background: transparent; border: none; }
.avro-win scrollbar slider { background-color: ${p.borderStrong}; border-radius: 4px; min-width: 6px; min-height: 28px; border: 2px solid transparent; }
.avro-win scrollbar slider:hover { background-color: ${p.faint}; }

/* Lists */
.avro-win list, .avro-win treeview { background-color: transparent; color: ${p.text}; }
.avro-win treeview.view { background-color: ${p.surface}; color: ${p.text}; }
.avro-win treeview.view:selected, .avro-win list row:selected { background-color: ${p.accentSoft}; color: ${p.text}; }
.avro-win treeview header button { background-color: ${p.bgAlt}; border-radius: 0; border-width: 0 0 1px 0; font-weight: 600; }

/* Badges */
.avro-win .avro-badge { border-radius: 999px; padding: 3px 12px; font-size: 9pt; font-weight: 600; }
.avro-win .avro-badge-ok   { background-color: ${p.okSoft};   color: ${p.ok}; }
.avro-win .avro-badge-warn { background-color: ${p.warnSoft}; color: ${p.warn}; }
.avro-win .avro-badge-err  { background-color: ${p.errSoft};  color: ${p.err}; }
.avro-win .avro-badge-info { background-color: ${p.accentSoft}; color: ${p.accent}; }
.avro-win .avro-stat-ok   { border-left: 4px solid ${p.ok}; }
.avro-win .avro-stat-warn { border-left: 4px solid ${p.warn}; }
.avro-win .avro-stat-err  { border-left: 4px solid ${p.err}; }

/* Keycaps (Avro Mouse / Layout Viewer) */
.avro-win button.avro-key {
    background-image: linear-gradient(to bottom, ${p.keyTop}, ${p.keyBottom});
    background-color: ${p.keyBottom}; color: ${p.keyText};
    border: 1px solid ${p.borderStrong}; border-bottom-width: 3px; border-radius: 7px;
    padding: 4px 6px; min-width: 38px; min-height: 34px; font-size: 12pt;
}
.avro-win button.avro-key label { color: ${p.keyText}; }
.avro-win button.avro-key:hover { border-color: ${p.accent}; }
.avro-win button.avro-key:active, .avro-win button.avro-key:checked {
    background-image: none; background-color: ${p.accent}; color: ${p.accentFg};
}
.avro-win button.avro-key:active label, .avro-win button.avro-key:checked label { color: ${p.accentFg}; }
.avro-win button.avro-key-vowel { border-bottom-color: ${p.accent}; }
.avro-win button.avro-key-kar { border-bottom-color: ${p.ok}; }
.avro-win button.avro-key-special { border-bottom-color: ${p.warn}; }

/* Reference tables */
.avro-win .avro-cell { padding: 10px 18px; color: ${p.text}; }
.avro-win .avro-cell-head { color: ${p.subtext}; font-size: 9pt; font-weight: 700; border-bottom: 1px solid ${p.border}; }
.avro-win .avro-cell-alt { background-color: ${p.hover}; }
.avro-win .avro-cell-bn { font-size: 14pt; font-weight: 600; color: ${p.accent}; }

/* Stack switcher (segmented control) */
.avro-win .avro-switcher button {
    border-radius: 0; margin: 0; padding: 5px 16px; border-color: ${p.borderStrong};
}
.avro-win .avro-switcher button:first-child { border-radius: 6px 0 0 6px; }
.avro-win .avro-switcher button:last-child { border-radius: 0 6px 6px 0; }
.avro-win .avro-switcher button:checked { background-color: ${p.accent}; border-color: ${p.accent}; color: ${p.accentFg}; }
.avro-win .avro-switcher button:checked label { color: ${p.accentFg}; }

/* Keyboard shortcut caps */
.avro-win .avro-keycap {
    background-color: ${p.bgAlt}; color: ${p.text};
    border: 1px solid ${p.borderStrong}; border-bottom-width: 2px; border-radius: 5px;
    padding: 3px 10px; font-family: monospace; font-size: 9.5pt; font-weight: 600;
}

/* Status and candidate bars */
.avro-win .avro-statusbar { background-color: ${p.bgAlt}; border-top: 1px solid ${p.border}; padding: 5px 14px; }
.avro-win .avro-statusbar label { color: ${p.subtext}; font-size: 9pt; }
.avro-win .avro-candbar { background-color: ${p.surface}; border: 1px solid ${p.border}; border-radius: 8px; padding: 8px 14px; }
.avro-win .avro-cand-header { color: ${p.accent}; font-size: 8.5pt; font-weight: 700; }
.avro-win .avro-cand-hint { color: ${p.hint}; font-size: 8.5pt; }

/* Dialogs and tooltips */
.avro-win messagedialog, .avro-win dialog { background-color: ${p.bg}; }
`;
}

/* Install the stylesheet once for the default screen. */
function apply() {
    let p = palette();
    if (_provider) return p;
    try {
        _provider = new Gtk.CssProvider();
        _provider.load_from_data(_css(p));
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), _provider, Gtk.STYLE_PROVIDER_PRIORITY_USER - 1
        );
    } catch (e) {
        printerr('Avro theme: ' + e);
    }
    return p;
}

/* Mark a window as an Avro window and make sure the theme is active. */
function styleWindow(win) {
    apply();
    win.get_style_context().add_class('avro-win');
    _maybeSnapshot(win);
    return win;
}

/*
    Developer aid: with AVRO_SNAPSHOT=/path/file.png the window renders itself
    into that PNG shortly after it appears and then closes. Used for visually
    checking the UI without a screen grabber. Does nothing otherwise.
*/
function _maybeSnapshot(win) {
    let target = GLib.getenv('AVRO_SNAPSHOT');
    if (!target || win._avroSnap) return;
    win._avroSnap = true;
    win.connect('map', () => {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1800, () => {
            try {
                const Cairo = imports.cairo;
                let w = win.get_allocated_width(), h = win.get_allocated_height();
                let surf = new Cairo.ImageSurface(Cairo.Format.ARGB32, w, h);
                let cr = new Cairo.Context(surf);
                win.draw(cr);
                surf.writeToPNG(target);
                cr.$dispose();
                surf.finish();
            } catch (e) { printerr('snapshot: ' + e); }
            win.destroy();
            return GLib.SOURCE_REMOVE;
        });
    });
}

function addClass(widget, ...classes) {
    let ctx = widget.get_style_context();
    classes.forEach(c => ctx.add_class(c));
    return widget;
}

/* Modern client-side header bar: app icon + title + subtitle.
   opts.windowTitle (default: opts.title) is the title the taskbar and window
   switcher show. GtkWindow takes its title from a header bar used as its
   title bar, so the header bar carries it, behind an empty custom title
   widget that keeps GTK from drawing it a second time. */
function headerBar(opts) {
    apply();
    opts = opts || {};
    let hb = new Gtk.HeaderBar({ show_close_button: false });
    hb.get_style_context().add_class('avro-header');
    hb.set_custom_title(new Gtk.Box());
    hb.set_title(opts.windowTitle || opts.title || '');

    let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
    if (opts.icon) {
        box.pack_start(new Gtk.Image({ icon_name: opts.icon, pixel_size: 28 }), false, false, 0);
    }
    let col = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0, valign: Gtk.Align.CENTER });
    let title = new Gtk.Label({ label: opts.title || '', xalign: 0 });
    title.get_style_context().add_class('avro-title');
    col.pack_start(title, false, false, 0);
    if (opts.subtitle) {
        let sub = new Gtk.Label({ label: opts.subtitle, xalign: 0 });
        sub.get_style_context().add_class('avro-subtitle');
        col.pack_start(sub, false, false, 0);
    }
    box.pack_start(col, false, false, 0);
    hb.pack_start(box);
    _addWindowControls(hb, opts.controls || ['minimize', 'maximize', 'close']);
    return hb;
}

/*
    Own window buttons (minimize / maximize / close): they look the same on
    every desktop and icon theme instead of depending on the GTK theme's
    title buttons.
*/
function _addWindowControls(hb, kinds) {
    let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2 });
    kinds.forEach(kind => {
        let icon = kind === 'maximize' ? 'avro-maximize-symbolic' : 'avro-' + kind + '-symbolic';
        let b = new Gtk.Button({ relief: Gtk.ReliefStyle.NONE, can_focus: false, valign: Gtk.Align.CENTER });
        let img = Gtk.Image.new_from_icon_name(icon, Gtk.IconSize.BUTTON);
        b.add(img);
        let ctx = b.get_style_context();
        ctx.add_class('avro-winctl');
        if (kind === 'close') ctx.add_class('avro-winctl-close');
        b.set_tooltip_text(kind === 'minimize' ? 'Minimize' : kind === 'maximize' ? 'Maximize / Restore' : 'Close');
        b.connect('clicked', () => {
            try {
                let w = hb.get_toplevel();
                if (!w || !w.is_toplevel || !w.is_toplevel()) return;
                if (kind === 'close') {
                    w.close();
                } else if (kind === 'minimize') {
                    w.iconify();
                } else {
                    // Maximize / restore toggle (GTK 3 Gdk.WindowState check)
                    let gdkWin = w.get_window ? w.get_window() : null;
                    let isMax = gdkWin ? ((gdkWin.get_state() & Gdk.WindowState.MAXIMIZED) !== 0) : Boolean(w._isMaximized);
                    if (isMax) {
                        w.unmaximize();
                        w._isMaximized = false;
                        try { img.set_from_icon_name('avro-maximize-symbolic', Gtk.IconSize.BUTTON); } catch (e) {}
                        b.set_tooltip_text('Maximize');
                    } else {
                        w.maximize();
                        w._isMaximized = true;
                        try { img.set_from_icon_name('avro-restore-symbolic', Gtk.IconSize.BUTTON); } catch (e) {}
                        b.set_tooltip_text('Restore');
                    }
                }
            } catch (e) { printerr('winctl: ' + e); }
        });
        // Update maximize icon whenever the window state changes
        if (kind === 'maximize') {
            hb.connect('realize', () => {
                try {
                    let w = hb.get_toplevel();
                    if (!w || !w.connect) return;
                    w.connect('window-state-event', () => {
                        try {
                            let gdkWin = w.get_window ? w.get_window() : null;
                            let isMax = gdkWin ? ((gdkWin.get_state() & Gdk.WindowState.MAXIMIZED) !== 0) : Boolean(w._isMaximized);
                            if (isMax) {
                                img.set_from_icon_name('avro-restore-symbolic', Gtk.IconSize.BUTTON);
                                b.set_tooltip_text('Restore');
                            } else {
                                img.set_from_icon_name('avro-maximize-symbolic', Gtk.IconSize.BUTTON);
                                b.set_tooltip_text('Maximize');
                            }
                        } catch (e) {}
                        return false;
                    });
                } catch (e) {}
            });
        }
        box.pack_start(b, false, false, 0);
    });
    hb.pack_end(box);
    return box;
}

/* Card container. */
function card(spacing) {
    let b = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: spacing || 0 });
    b.get_style_context().add_class('avro-card');
    return b;
}

function sectionTitle(text) {
    let l = new Gtk.Label({ label: text, xalign: 0 });
    l.get_style_context().add_class('avro-section');
    return l;
}

function label(text, ...classes) {
    let l = new Gtk.Label({ label: text, xalign: 0, wrap: true });
    classes.forEach(c => l.get_style_context().add_class(c));
    return l;
}

/*
    Settings row: a title (+ optional subtitle) on the left, a control on the
    right. Pass `control = null` for a text-only row.
*/
function settingRow(title, subtitle, control) {
    let row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 16 });
    row.get_style_context().add_class('avro-row');
    let col = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2, valign: Gtk.Align.CENTER });
    let t = new Gtk.Label({ label: title, xalign: 0, wrap: true });
    t.get_style_context().add_class('avro-row-title');
    col.pack_start(t, false, false, 0);
    if (subtitle) {
        let s = new Gtk.Label({ label: subtitle, xalign: 0, wrap: true });
        s.get_style_context().add_class('avro-row-sub');
        col.pack_start(s, false, false, 0);
    }
    row.pack_start(col, true, true, 0);
    if (control) {
        control.set_valign(Gtk.Align.CENTER);
        row.pack_end(control, false, false, 0);
    }
    return row;
}

/* Append rows to a card with hairline separators in between. */
function fillCard(cardBox, rows) {
    rows.forEach((r, i) => {
        if (i > 0) cardBox.pack_start(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }), false, false, 0);
        cardBox.pack_start(r, false, false, 0);
    });
    return cardBox;
}

/* Icon-only (or icon + label) flat button for header bars and toolbars. */
function iconButton(iconName, tooltip, text) {
    let b = new Gtk.Button();
    let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
    box.pack_start(Gtk.Image.new_from_icon_name(iconName, Gtk.IconSize.BUTTON), false, false, 0);
    if (text) box.pack_start(new Gtk.Label({ label: text }), false, false, 0);
    b.add(box);
    b.set_relief(Gtk.ReliefStyle.NONE);
    let ctx = b.get_style_context();
    ctx.add_class('flat');
    ctx.add_class('avro-ghost');
    if (!text) ctx.add_class('avro-icon-btn');
    if (tooltip) b.set_tooltip_text(tooltip);
    return b;
}

/* Rounded status chip: kind is ok | warn | err | info. */
function badge(text, kind) {
    let l = new Gtk.Label({ label: text, valign: Gtk.Align.CENTER });
    let ctx = l.get_style_context();
    ctx.add_class('avro-badge');
    ctx.add_class('avro-badge-' + (kind || 'info'));
    return l;
}

function esc(s) {
    return GLib.markup_escape_text(String(s), -1);
}

function scrolled(child, framed) {
    let sw = new Gtk.ScrolledWindow({ hscrollbar_policy: Gtk.PolicyType.NEVER });
    if (framed) sw.get_style_context().add_class('avro-framed');
    sw.add(child);
    return sw;
}
