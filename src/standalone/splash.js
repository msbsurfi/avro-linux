#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Windows-Style Authentic Splash Screen
    SPDX-License-Identifier: MPL-2.0
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (BUET, 2021-22)
    Original Avro Keyboard by Dr. Mehdi Hasan Khan (OmicronLab) & Sarim Khan
    Artwork directly from upstream OmicronLab Avro Keyboard (mugli/Avro-Keyboard)

    Faithfully recreates the authentic classic Windows Avro Keyboard startup
    experience with "ভাষা হোক উন্মুক্ত..." iconic artwork.
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

GLib.set_prgname("avro-splash");
GLib.set_application_name("Avro Keyboard");

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

function findSplashImage() {
    let candidates = [
        baseDir + "/images/splash.jpg",
        "/usr/share/avro-linux/images/splash.jpg",
        GLib.get_current_dir() + "/data/images/splash.jpg",
        GLib.get_current_dir() + "/../data/images/splash.jpg"
    ];
    for (let p of candidates) {
        if (p && GLib.file_test(p, GLib.FileTest.EXISTS)) {
            return p;
        }
    }
    return null;
}

function findLogo() {
    let candidates = [
        "/usr/share/icons/hicolor/256x256/apps/avro-bangla.png",
        "/usr/share/icons/hicolor/128x128/apps/avro-bangla.png",
        baseDir + "/icons/avro-bangla.png",
        GLib.get_current_dir() + "/data/icons/256x256/avro-bangla.png",
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
    background-color: #000000;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
}
.avro-splash-fallback {
    background: linear-gradient(145deg, #1e232d 0%, #0f1218 100%);
    border: 1px solid #333d52;
    border-radius: 10px;
}
.avro-splash-title {
    font-family: 'Noto Sans', 'Segoe UI', sans-serif;
    font-size: 20pt;
    font-weight: bold;
    color: #ffffff;
}
.avro-splash-subtitle {
    font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Noto Sans', sans-serif;
    font-size: 11pt;
    color: #4a9eff;
}
.avro-splash-version {
    font-family: 'Noto Sans', sans-serif;
    font-size: 8.5pt;
    color: #94a3b8;
}
.avro-splash-tag {
    font-family: 'Noto Sans', sans-serif;
    font-size: 8pt;
    color: rgba(255, 255, 255, 0.7);
    background-color: rgba(0, 0, 0, 0.45);
    padding: 2px 8px;
    border-radius: 4px;
}
progressbar trough {
    min-height: 3px;
    background-color: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 0;
}
progressbar progress {
    min-height: 3px;
    background: linear-gradient(to right, #ff6b35, #f7c59f, #2b9eb3);
    border: none;
    border-radius: 0;
}
`;

var SplashScreen = class SplashScreen {
    constructor(opts) {
        opts = opts || {};
        this.duration = opts.duration || 2000; // 2.0s matching Windows Avro Keyboard
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
            title: "Starting Avro Keyboard...",
            decorated: false,
            resizable: false,
            skip_taskbar_hint: true,
            window_position: Gtk.WindowPosition.CENTER
        });

        // Set visual transparency / rounded corners if compositor is active
        let screen = this.window.get_screen();
        let visual = screen.get_rgba_visual();
        if (visual && screen.is_composited()) {
            this.window.set_visual(visual);
            this.window.set_app_paintable(true);
        }

        this.window.set_icon_name("avro-bangla");
        let logoFile = findLogo();
        if (logoFile) {
            try { this.window.set_icon_from_file(logoFile); } catch (e) {}
        }

        let splashImgPath = findSplashImage();

        if (splashImgPath) {
            this._buildAuthenticSplash(splashImgPath);
        } else {
            this._buildFallbackSplash();
        }

        // Close on mouse click
        let eventBox = new Gtk.EventBox({ visible_window: false, above_child: true });
        eventBox.add(this.rootWidget);
        eventBox.connect('button-press-event', () => {
            this.close();
            return true;
        });

        // Close on key press (Escape, Space, Enter, or any key)
        this.window.connect('key-press-event', () => {
            this.close();
            return true;
        });

        this.window.add(eventBox);
    }

    _buildAuthenticSplash(imgPath) {
        this.window.get_style_context().add_class('avro-splash-window');
        this.window.set_default_size(474, 320);

        let overlay = new Gtk.Overlay();

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file(imgPath);
        let img = new Gtk.Image({ pixbuf: pixbuf });
        overlay.add(img);

        // Overlay container for progress bar and subtle version indicator
        let overlayBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END
        });

        let bottomRow = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_start: 10,
            margin_end: 10,
            margin_bottom: 6
        });

        let verTag = new Gtk.Label({
            label: "Avro Keyboard v" + appVersion(),
            xalign: 0
        });
        verTag.get_style_context().add_class('avro-splash-tag');
        bottomRow.pack_start(verTag, false, false, 0);

        overlayBox.pack_start(bottomRow, false, false, 0);

        // Progress bar at the very bottom
        this.progressBar = new Gtk.ProgressBar({
            halign: Gtk.Align.FILL,
            valign: Gtk.Align.END
        });
        overlayBox.pack_end(this.progressBar, false, false, 0);

        overlay.add_overlay(overlayBox);
        this.rootWidget = overlay;
    }

    _buildFallbackSplash() {
        this.window.get_style_context().add_class('avro-splash-fallback');
        this.window.set_border_width(1);
        this.window.set_default_size(460, 260);

        let mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin: 24,
            halign: Gtk.Align.FILL,
            valign: Gtk.Align.CENTER
        });

        let headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 18,
            halign: Gtk.Align.CENTER
        });

        let logoPath = findLogo();
        if (logoPath) {
            try {
                let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, 64, 64);
                headerBox.pack_start(new Gtk.Image({ pixbuf: pixbuf }), false, false, 0);
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
            label: "ভাষা হোক উন্মুক্ত... • Bangla typing made easy",
            xalign: 0
        });
        subtitleLabel.get_style_context().add_class('avro-splash-subtitle');
        titleBox.pack_start(subtitleLabel, false, false, 0);

        let verLabel = new Gtk.Label({
            label: "Version " + appVersion() + " • Linux Edition",
            xalign: 0
        });
        verLabel.get_style_context().add_class('avro-splash-version');
        titleBox.pack_start(verLabel, false, false, 0);

        headerBox.pack_start(titleBox, false, false, 0);
        mainBox.pack_start(headerBox, false, false, 4);

        let sep = new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4 });
        mainBox.pack_start(sep, false, false, 0);

        let creditsLabel = new Gtk.Label({
            label: "<span foreground='#7c8594'>Original design: </span><span foreground='#93c5fd' weight='bold'>Dr. Mehdi Hasan Khan</span><span foreground='#7c8594'> (OmicronLab)\n" +
                   "Engine: </span><span foreground='#93c5fd' weight='bold'>Sarim Khan</span>",
            use_markup: true,
            justify: Gtk.Justification.CENTER
        });
        mainBox.pack_start(creditsLabel, false, false, 0);

        this.progressBar = new Gtk.ProgressBar({ halign: Gtk.Align.FILL, margin_top: 8 });
        mainBox.pack_start(this.progressBar, false, false, 0);

        this.rootWidget = mainBox;
    }

    show() {
        if (!this.window) return;
        this.window.show_all();

        // Animate progress bar pulse
        let startTime = GLib.get_monotonic_time();
        this._pulseTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
            if (this.progressBar && this.window && this.window.get_visible()) {
                let elapsed = (GLib.get_monotonic_time() - startTime) / 1000;
                let fraction = Math.min(elapsed / this.duration, 1.0);
                this.progressBar.set_fraction(fraction);
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
        duration: durationMs || 2000,
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
    showSplashScreen(2000, () => Gtk.main_quit());
    Gtk.main();
}
