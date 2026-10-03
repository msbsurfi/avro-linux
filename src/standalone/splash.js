#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Windows-Style Splash Screen
    SPDX-License-Identifier: MPL-2.0
    Developer & Maintainer: MD Shifat Bin Siddique Urfi
    Original Avro Keyboard by Dr. Mehdi Hasan Khan (OmicronLab) & Sarim Khan

    A polished, elegant splash screen faithfully recreating the classic
    Windows Avro Keyboard startup experience on Linux desktops.
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = imports.system.programPath || imports.system.programInvocationName || '.';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

imports.searchPath.unshift(baseDir + '/common');
imports.searchPath.unshift(baseDir + '/src/common');
let eevars = null;
try { eevars = imports.evars; } catch (e) {}

function appVersion() {
    try {
        return eevars ? eevars.get_version() : "1.2.0";
    } catch (e) {
        return "1.2.0";
    }
}

function findLogo() {
    let candidates = [
        "/usr/share/icons/hicolor/128x128/apps/avro-bangla.png",
        "/usr/share/icons/hicolor/64x64/apps/avro-bangla.png",
        "/usr/share/avro-linux/icons/avro-bangla.png",
        GLib.get_current_dir() + "/data/icons/128x128/avro-bangla.png",
        GLib.get_current_dir() + "/data/icons/avro-bangla.png"
    ];
    for (let p of candidates) {
        if (p && GLib.file_test(p, GLib.FileTest.EXISTS)) {
            return p;
        }
    }
    return null;
}

const SPLASH_CSS = `
.avro-splash-window {
    background: linear-gradient(145deg, #161a23 0%, #0d1017 100%);
    border: 1px solid #333d52;
    border-radius: 12px;
}
.avro-splash-title {
    font-family: 'Noto Sans', 'Segoe UI', sans-serif;
    font-size: 20pt;
    font-weight: bold;
    color: #ffffff;
}
.avro-splash-subtitle {
    font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Noto Sans', sans-serif;
    font-size: 10.5pt;
    color: #4a9eff;
}
.avro-splash-version {
    font-family: 'Noto Sans', sans-serif;
    font-size: 8.5pt;
    color: #8b949e;
}
.avro-splash-credits {
    font-family: 'Noto Sans', sans-serif;
    font-size: 8pt;
    color: #6b7280;
}
progressbar trough {
    min-height: 4px;
    background-color: #212631;
    border-radius: 2px;
    border: none;
}
progressbar progress {
    min-height: 4px;
    background: linear-gradient(to right, #0078d7, #00e5a0);
    border-radius: 2px;
    border: none;
}
`;

var SplashScreen = class SplashScreen {
    constructor(opts) {
        opts = opts || {};
        this.duration = opts.duration || 1800; // 1.8 seconds default
        this.onClosed = opts.onClosed || null;
        this.window = null;
        this._pulseTimer = 0;
        this._closeTimer = 0;
        this._build();
    }

    _build() {
        let cssProvider = new Gtk.CssProvider();
        try {
            cssProvider.load_from_data(SPLASH_CSS);
        } catch (e) {
            cssProvider.load_from_data(new TextEncoder().encode(SPLASH_CSS));
        }
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            cssProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION + 20
        );

        this.window = new Gtk.Window({
            type: Gtk.WindowType.TOPLEVEL,
            title: "Avro Keyboard",
            decorated: false,
            resizable: false,
            skip_taskbar_hint: true,
            window_position: Gtk.WindowPosition.CENTER
        });

        // Set visual transparency if available
        let screen = this.window.get_screen();
        let visual = screen.get_rgba_visual();
        if (visual && screen.is_composited()) {
            this.window.set_visual(visual);
            this.window.set_app_paintable(true);
        }

        this.window.get_style_context().add_class('avro-splash-window');
        this.window.set_border_width(1);
        this.window.set_default_size(460, 260);

        let mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin: 24,
            halign: Gtk.Align.FILL,
            valign: Gtk.Align.CENTER
        });

        // Top Row: Logo + App Name & Tagline
        let headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 18,
            halign: Gtk.Align.CENTER
        });

        let logoPath = findLogo();
        if (logoPath) {
            try {
                let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, 64, 64);
                let img = new Gtk.Image({ pixbuf: pixbuf });
                headerBox.pack_start(img, false, false, 0);
            } catch (e) {}
        }

        let titleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 3,
            valign: Gtk.Align.CENTER
        });

        let titleLabel = new Gtk.Label({ label: "Avro Keyboard", xalign: 0 });
        titleLabel.get_style_context().add_class('avro-splash-title');
        titleBox.pack_start(titleLabel, false, false, 0);

        let subtitleLabel = new Gtk.Label({
            label: "বাংলা টাইপিং এর সহজ মাধ্যম • Bangla typing made easy",
            xalign: 0
        });
        subtitleLabel.get_style_context().add_class('avro-splash-subtitle');
        titleBox.pack_start(subtitleLabel, false, false, 0);

        let verLabel = new Gtk.Label({
            label: "Version " + appVersion() + " • Remastered Linux Edition",
            xalign: 0
        });
        verLabel.get_style_context().add_class('avro-splash-version');
        titleBox.pack_start(verLabel, false, false, 0);

        headerBox.pack_start(titleBox, false, false, 0);
        mainBox.pack_start(headerBox, false, false, 4);

        // Subtle separator
        let sep = new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4 });
        mainBox.pack_start(sep, false, false, 0);

        // Credits text
        let creditsLabel = new Gtk.Label({
            label: "<span foreground='#7c8594'>Original concept &amp; phonetic design: </span><span foreground='#93c5fd' weight='bold'>Dr. Mehdi Hasan Khan</span><span foreground='#7c8594'> (OmicronLab)\n" +
                   "ibus-avro engine: </span><span foreground='#93c5fd' weight='bold'>Sarim Khan</span><span foreground='#7c8594'> • Remastered by: </span><span foreground='#60a5fa' weight='bold'>MD Shifat Bin Siddique Urfi</span>",
            use_markup: true,
            justify: Gtk.Justification.CENTER
        });
        creditsLabel.get_style_context().add_class('avro-splash-credits');
        mainBox.pack_start(creditsLabel, false, false, 0);

        // Progress bar
        this.progressBar = new Gtk.ProgressBar({ halign: Gtk.Align.FILL, margin_top: 8 });
        mainBox.pack_start(this.progressBar, false, false, 0);

        // Close on click or Escape
        let eventBox = new Gtk.EventBox({ visible_window: false, above_child: true });
        eventBox.add(mainBox);
        eventBox.connect('button-press-event', () => {
            this.close();
            return true;
        });

        this.window.connect('key-press-event', (w, ev) => {
            let [, keyval] = ev.get_keyval();
            if (keyval === Gdk.KEY_Escape || keyval === Gdk.KEY_Return || keyval === Gdk.KEY_space) {
                this.close();
                return true;
            }
            return false;
        });

        this.window.add(eventBox);
    }

    show() {
        if (!this.window) return;
        this.window.show_all();

        // Animate progress bar pulse
        this._pulseTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 40, () => {
            if (this.progressBar && this.window && this.window.get_visible()) {
                this.progressBar.pulse();
                return GLib.SOURCE_CONTINUE;
            }
            return GLib.SOURCE_REMOVE;
        });

        // Auto-close timer
        this._closeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.duration, () => {
            this._closeTimer = 0;
            this.close();
            return GLib.SOURCE_REMOVE;
        });
    }

    close() {
        if (this._pulseTimer !== 0) {
            GLib.source_remove(this._pulseTimer);
            this._pulseTimer = 0;
        }
        if (this._closeTimer !== 0) {
            GLib.source_remove(this._closeTimer);
            this._closeTimer = 0;
        }
        if (this.window) {
            this.window.destroy();
            this.window = null;
        }
        if (this.onClosed) {
            let cb = this.onClosed;
            this.onClosed = null;
            cb();
        }
    }
};

function showSplashScreen(durationMs, onClosed) {
    let splash = new SplashScreen({
        duration: durationMs || 1800,
        onClosed: onClosed || null
    });
    splash.show();
    return splash;
}

let _isMain = false;
try {
    let prog = imports.system.programInvocationName || "";
    if (prog.indexOf("splash.js") !== -1 || prog.indexOf("avro-splash") !== -1) {
        _isMain = true;
    }
    if (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1) {
        _isMain = true;
    }
} catch (e) {}

if (_isMain) {
    Gtk.init(null);
    showSplashScreen(1800, () => Gtk.main_quit());
    Gtk.main();
}
