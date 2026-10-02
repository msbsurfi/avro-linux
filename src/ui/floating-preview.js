#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Dedicated Floating Candidate & Preview Window
    SPDX-License-Identifier: MPL-2.0
    Developer & Maintainer: MD Shifat Bin Siddique Urfi
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

/* ═══════════════════════════════════════════════════════════════════════════
   CSS — Royal Minimal Floating Candidate Box
   ═══════════════════════════════════════════════════════════════════════════ */
const PREVIEW_CSS = `
* { outline: none; }

.avro-preview-window {
    background: rgba(20, 24, 34, 0.96);
    border: 1px solid rgba(88, 166, 255, 0.35);
    border-radius: 12px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.8), 0 0 16px rgba(88, 166, 255, 0.15);
    padding: 8px 12px;
}

.avro-preview-latin {
    color: #8b9bb4;
    font-size: 12px;
    font-family: monospace;
}

.avro-preview-main {
    color: #00e5a0;
    font-size: 18px;
    font-weight: bold;
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
}

.cand-item-active {
    background: linear-gradient(135deg, #1b4970, #246396);
    color: #ffffff;
    font-weight: bold;
    font-size: 15px;
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    border-radius: 8px;
    padding: 3px 8px;
    border: 1px solid #58a6ff;
}

.cand-item-normal {
    color: #c9d1d9;
    font-size: 14px;
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    padding: 3px 6px;
    border-radius: 6px;
}

.cand-badge {
    color: #58a6ff;
    font-size: 11px;
    font-weight: bold;
    margin-right: 4px;
}

.cand-hint-bar {
    color: #6e7681;
    font-size: 11px;
    font-style: italic;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 4px;
    margin-top: 4px;
}
`;

function getSocketPath() {
    let runtimeDir = GLib.getenv("XDG_RUNTIME_DIR");
    if (!runtimeDir || runtimeDir.length === 0) {
        runtimeDir = "/tmp";
    }
    return runtimeDir + "/avro-ui.sock";
}

var FloatingPreviewUI = class FloatingPreviewUI {
    constructor() {
        this.window = null;
        this.labelLatin = null;
        this.labelBengali = null;
        this.candidatesBox = null;
        this.labelHint = null;
        this.socketService = null;
        this.activeCandidates = [];
        this.selectedIndex = 0;
        this.currentRaw = "";

        this._initUI();
        this._initSocket();
    }

    _initUI() {
        let cssProvider = new Gtk.CssProvider();
        try {
            cssProvider.load_from_data(PREVIEW_CSS);
            Gtk.StyleContext.add_provider_for_screen(
                Gdk.Screen.get_default(),
                cssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );
        } catch (e) {}

        this.window = new Gtk.Window({
            type: Gtk.WindowType.TOPLEVEL,
            decorated: false,
            skip_taskbar_hint: true,
            skip_pager_hint: true,
            accept_focus: false,
            focus_on_map: false,
            role: "avro-floating-preview"
        });
        this.window.get_style_context().add_class("avro-preview-window");
        this.window.set_type_hint(Gdk.WindowTypeHint.TOOLTIP);
        this.window.set_keep_above(true);
        this.window.stick();

        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4
        });

        // Top line: Latin input + Primary Bengali output
        let topBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8
        });
        this.labelLatin = new Gtk.Label({ label: "", xalign: 0 });
        this.labelLatin.get_style_context().add_class("avro-preview-latin");
        this.labelBengali = new Gtk.Label({ label: "", xalign: 0 });
        this.labelBengali.get_style_context().add_class("avro-preview-main");

        topBox.pack_start(this.labelLatin, false, false, 0);
        topBox.pack_start(this.labelBengali, true, true, 0);
        vbox.pack_start(topBox, false, false, 0);

        // Candidates row
        this.candidatesBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6
        });
        vbox.pack_start(this.candidatesBox, false, false, 2);

        // Bottom hint bar
        this.labelHint = new Gtk.Label({
            label: "[Tab] Next  [Space] Commit  [1-9] Pick",
            xalign: 0.5
        });
        this.labelHint.get_style_context().add_class("cand-hint-bar");
        vbox.pack_start(this.labelHint, false, false, 0);

        this.window.add(vbox);
    }

    _initSocket() {
        let sockPath = getSocketPath();
        try {
            let f = Gio.File.new_for_path(sockPath);
            if (f.query_exists(null)) {
                f.delete(null);
            }
        } catch (e) {}

        try {
            this.socketService = new Gio.SocketService();
            let addr = Gio.UnixSocketAddress.new(sockPath);
            this.socketService.add_address(addr, Gio.SocketType.STREAM, Gio.SocketProtocol.DEFAULT, null);
            this.socketService.connect("incoming", (service, connection) => {
                this._handleConnection(connection);
                return true;
            });
            this.socketService.start();
        } catch (e) {
            // Socket listening failed (another instance might be active)
        }
    }

    _handleConnection(connection) {
        let inputStream = connection.get_input_stream();
        let dataInputStream = new Gio.DataInputStream({ base_stream: inputStream });

        let readLine = () => {
            dataInputStream.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, res) => {
                try {
                    let [line] = stream.read_line_finish_utf8(res);
                    if (line !== null) {
                        this._processCommand(line);
                        readLine();
                    }
                } catch (e) {}
            });
        };
        readLine();
    }

    _processCommand(line) {
        if (!line || line.length === 0) return;
        try {
            let msg = JSON.parse(line);
            if (msg.type === "composition") {
                this.updateComposition(msg.raw, msg.candidates, msg.selected);
            } else if (msg.type === "hide") {
                this.hide();
            } else if (msg.type === "cursor") {
                this.positionNearCursor(msg.x, msg.y, msg.w, msg.h);
            }
        } catch (e) {}
    }

    updateComposition(raw, candidates, selected) {
        this.currentRaw = raw || "";
        this.activeCandidates = candidates || [];
        this.selectedIndex = selected || 0;

        if (this.currentRaw.length === 0 && this.activeCandidates.length === 0) {
            this.hide();
            return;
        }

        this.labelLatin.set_text(this.currentRaw + " ➔");
        let primaryWord = (this.activeCandidates.length > 0 && this.activeCandidates[this.selectedIndex])
            ? this.activeCandidates[this.selectedIndex]
            : "";
        this.labelBengali.set_text(primaryWord);

        // Clear previous candidate widgets
        let children = this.candidatesBox.get_children();
        for (let ch of children) {
            this.candidatesBox.remove(ch);
            ch.destroy();
        }

        // Render up to 9 candidates
        let count = Math.min(this.activeCandidates.length, 9);
        for (let i = 0; i < count; i++) {
            let candText = this.activeCandidates[i];
            let num = (i + 1).toString();

            let itemBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2 });
            let badge = new Gtk.Label({ label: num + "." });
            badge.get_style_context().add_class("cand-badge");

            let wordLabel = new Gtk.Label({ label: candText });

            itemBox.pack_start(badge, false, false, 0);
            itemBox.pack_start(wordLabel, false, false, 0);

            if (i === this.selectedIndex) {
                itemBox.get_style_context().add_class("cand-item-active");
            } else {
                itemBox.get_style_context().add_class("cand-item-normal");
            }

            this.candidatesBox.pack_start(itemBox, false, false, 0);
        }

        this.window.show_all();
        this._ensurePosition();
        this.window.set_keep_above(true);
    }

    hide() {
        if (this.window) {
            this.window.hide();
        }
    }

    _ensurePosition() {
        try {
            let screen = Gdk.Screen.get_default();
            let monitor = (typeof screen.get_primary_monitor === 'function')
                ? screen.get_primary_monitor() : 0;
            let geom = screen.get_monitor_geometry(monitor);
            let [w, h] = this.window.get_size();
            let x = geom.x + Math.floor((geom.width - (w || 320)) / 2);
            let y = geom.y + geom.height - (h || 80) - 60; // floating above bottom dock or center
            this.window.move(x, y);
        } catch (e) {}
    }

    positionNearCursor(x, y, w, h) {
        if (x > 0 && y > 0) {
            this.window.move(x + 10, y + (h || 20) + 6);
        } else {
            this._ensurePosition();
        }
    }
}

var runFloatingPreview = function runFloatingPreview() {
    Gtk.init(null);
    let ui = new FloatingPreviewUI();
    Gtk.main();
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
    runFloatingPreview();
}


