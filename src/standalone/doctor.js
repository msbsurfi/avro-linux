#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Doctor (Remastered Diagnostic & Health Check Tool)
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
   Diagnostic Inspection Functions
   ═══════════════════════════════════════════════════════════════════════════ */
function runDiagnosticCheck() {
    let report = {
        timestamp: new Date().toISOString(),
        os: "Unknown",
        desktop: GLib.getenv("XDG_CURRENT_DESKTOP") || "Unknown",
        session: GLib.getenv("XDG_SESSION_TYPE") || (GLib.getenv("WAYLAND_DISPLAY") ? "wayland" : "x11"),
        waylandDisplay: GLib.getenv("WAYLAND_DISPLAY") || "None",
        x11Display: GLib.getenv("DISPLAY") || "None",
        ibusRunning: false,
        ibusRegistered: false,
        ibusActiveEngine: "None",
        envGtk: GLib.getenv("GTK_IM_MODULE") || "unset",
        envQt: GLib.getenv("QT_IM_MODULE") || "unset",
        envXmod: GLib.getenv("XMODIFIERS") || "unset",
        schemaValid: false,
        bengaliFonts: [],
        issues: [],
        recommendations: []
    };

    // Read OS release
    try {
        let [ok, out] = GLib.file_get_contents("/etc/os-release");
        if (ok) {
            let str = String.fromCharCode.apply(null, out);
            let match = str.match(/PRETTY_NAME="([^"]+)"/);
            if (match) report.os = match[1];
        }
    } catch (e) {}

    // Check IBus daemon
    try {
        let [ok, out] = GLib.spawn_command_line_sync("pgrep -x ibus-daemon");
        if (ok && out && out.length > 0) {
            report.ibusRunning = true;
        } else {
            report.issues.push("IBus daemon is not running.");
            report.recommendations.push("Run 'ibus-daemon -drx' to start the IBus input bus.");
        }
    } catch (e) {}

    // Check IBus engine list
    try {
        let [ok, out] = GLib.spawn_command_line_sync("ibus list-engine");
        if (ok && out) {
            let str = String.fromCharCode.apply(null, out);
            if (str.indexOf("ibus-avro") !== -1 || str.indexOf("avro") !== -1) {
                report.ibusRegistered = true;
            } else {
                report.issues.push("ibus-avro engine component is not registered in IBus.");
                report.recommendations.push("Verify /usr/share/ibus/component/avro.xml exists and restart ibus.");
            }
        }
    } catch (e) {}

    // Check active engine
    try {
        let [ok, out] = GLib.spawn_command_line_sync("ibus engine");
        if (ok && out) {
            let str = String.fromCharCode.apply(null, out).trim();
            report.ibusActiveEngine = str;
            if (str !== "ibus-avro") {
                report.issues.push("Active IBus engine is '" + str + "' instead of 'ibus-avro'.");
                report.recommendations.push("Run 'ibus engine ibus-avro' or click 'বাংলা' on the Avro TopBar.");
            }
        }
    } catch (e) {}

    // Check GSettings schema
    try {
        let schema = Gio.Settings.new("com.omicronlab.avro");
        if (schema && schema.list_keys().indexOf("mode-bangla") !== -1) {
            report.schemaValid = true;
        } else {
            report.issues.push("GSettings schema 'com.omicronlab.avro' is missing or incomplete.");
            report.recommendations.push("Run 'sudo glib-compile-schemas /usr/share/glib-2.0/schemas'.");
        }
    } catch (e) {
        report.issues.push("GSettings schema 'com.omicronlab.avro' is not installed.");
        report.recommendations.push("Run 'sudo glib-compile-schemas /usr/share/glib-2.0/schemas'.");
    }

    // Check environment variables
    if (report.envGtk !== "ibus") {
        report.issues.push("GTK_IM_MODULE is '" + report.envGtk + "' (expected 'ibus').");
        report.recommendations.push("Ensure /etc/profile.d/avro-linux.sh or ~/.profile sets GTK_IM_MODULE=ibus.");
    }
    if (report.envQt !== "ibus") {
        report.issues.push("QT_IM_MODULE is '" + report.envQt + "' (expected 'ibus').");
        report.recommendations.push("Ensure /etc/profile.d/avro-linux.sh or ~/.profile sets QT_IM_MODULE=ibus.");
    }
    if (report.envXmod.indexOf("@im=ibus") === -1) {
        report.issues.push("XMODIFIERS is '" + report.envXmod + "' (expected '@im=ibus').");
        report.recommendations.push("Ensure /etc/profile.d/avro-linux.sh or ~/.profile sets XMODIFIERS=@im=ibus.");
    }

    // Check Bengali fonts
    try {
        let [ok, out] = GLib.spawn_command_line_sync("fc-list :lang=bn family");
        if (ok && out) {
            let str = String.fromCharCode.apply(null, out);
            let lines = str.split("\n").map(s => s.trim()).filter(s => s.length > 0);
            report.bengaliFonts = [...new Set(lines)].slice(0, 10);
            if (report.bengaliFonts.length === 0) {
                report.issues.push("No Bengali fonts detected in fontconfig.");
                report.recommendations.push("Install 'fonts-lohit-beng-bengali' or 'fonts-beng'.");
            }
        }
    } catch (e) {}

    return report;
}

function formatReportText(report) {
    let lines = [];
    lines.push("==================================================");
    lines.push("          AVRO LINUX SYSTEM DIAGNOSTIC REPORT     ");
    lines.push("       Remastered by MD Shifat Bin Siddique Urfi   ");
    lines.push("==================================================");
    lines.push("Timestamp:           " + report.timestamp);
    lines.push("Operating System:    " + report.os);
    lines.push("Desktop Environment: " + report.desktop);
    lines.push("Session Type:        " + report.session + " (Wayland: " + report.waylandDisplay + ", X11: " + report.x11Display + ")");
    lines.push("");
    lines.push("--- IBus Subsystem ---");
    lines.push("IBus Daemon Running: " + (report.ibusRunning ? "YES [OK]" : "NO [FAIL]"));
    lines.push("ibus-avro Registered:" + (report.ibusRegistered ? "YES [OK]" : "NO [FAIL]"));
    lines.push("Active Engine:       " + report.ibusActiveEngine + (report.ibusActiveEngine === "ibus-avro" ? " [OK]" : " [SWITCH NEEDED]"));
    lines.push("");
    lines.push("--- Environment Variables ---");
    lines.push("GTK_IM_MODULE:       " + report.envGtk);
    lines.push("QT_IM_MODULE:        " + report.envQt);
    lines.push("XMODIFIERS:          " + report.envXmod);
    lines.push("");
    lines.push("--- Configuration & Fonts ---");
    lines.push("GSettings Schema:    " + (report.schemaValid ? "VALID [OK]" : "MISSING [FAIL]"));
    lines.push("Bengali Fonts Found: " + (report.bengaliFonts.length > 0 ? report.bengaliFonts.join(", ") : "None detected"));
    lines.push("");
    if (report.issues.length === 0) {
        lines.push("STATUS: ALL CHECKS PASSED — Avro Linux is fully configured and operational!");
    } else {
        lines.push("ISSUES DETECTED (" + report.issues.length + "):");
        for (let i = 0; i < report.issues.length; i++) {
            lines.push("  [" + (i + 1) + "] " + report.issues[i]);
        }
        lines.push("");
        lines.push("RECOMMENDED ACTIONS:");
        for (let i = 0; i < report.recommendations.length; i++) {
            lines.push("  ➔ " + report.recommendations[i]);
        }
    }
    lines.push("==================================================");
    return lines.join("\n");
}

function autoFixIssues() {
    let fixed = [];
    try {
        let [ok, out] = GLib.spawn_command_line_sync("pgrep -x ibus-daemon");
        if (!ok || !out || out.length === 0) {
            GLib.spawn_command_line_async("ibus-daemon -drx --panel disable");
            fixed.push("Started ibus-daemon in background (-drx --panel disable).");
        }
    } catch (e) {}

    try {
        let [ok, out] = GLib.spawn_command_line_sync("gsettings get org.freedesktop.ibus.general embed-preedit-text");
        if (ok && out) {
            let str = String.fromCharCode.apply(null, out).trim();
            if (str !== "true") {
                GLib.spawn_command_line_sync("gsettings set org.freedesktop.ibus.general embed-preedit-text true");
                fixed.push("Enabled live inline preedit (embed-preedit-text=true).");
            }
        }
    } catch (e) {}

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
        try {
            GLib.spawn_command_line_async("ibus engine ibus-avro");
            fixed.push("Switched active IBus engine to ibus-avro.");
        } catch (e) {}
        return false;
    });

    try {
        let schema = Gio.Settings.new("com.omicronlab.avro");
        if (schema) {
            schema.set_boolean("mode-bangla", true);
            fixed.push("Set GSettings mode-bangla to true.");
        }
    } catch (e) {}

    return fixed;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GUI Diagnostic Window & Live Interactive Self-Test
   ═══════════════════════════════════════════════════════════════════════════ */
function runDoctorGUI() {
    Gtk.init(null);

    let window = new Gtk.Window({
        title: "Avro Doctor — Diagnostics & Interactive Test",
        default_width: 700,
        default_height: 600,
        window_position: Gtk.WindowPosition.CENTER
    });

    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, margin: 16 });

    // Header
    let headerBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2 });
    let titleLabel = new Gtk.Label({
        markup: "<span size='x-large' weight='bold' color='#58a6ff'>Avro Doctor — System Health & Diagnostics</span>",
        xalign: 0
    });
    let subLabel = new Gtk.Label({
        markup: "<span size='small' color='#8b9bb4'>Remastered Edition by MD Shifat Bin Siddique Urfi</span>",
        xalign: 0
    });
    headerBox.pack_start(titleLabel, false, false, 0);
    headerBox.pack_start(subLabel, false, false, 0);
    vbox.pack_start(headerBox, false, false, 0);

    // Interactive Typing Test Area
    let testFrame = new Gtk.Frame({ label: " Interactive Typing Self-Test " });
    let testBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin: 10 });
    let testHint = new Gtk.Label({
        label: "Type here to test Avro Phonetic (e.g. type 'ami banglay gan gai.'):",
        xalign: 0
    });
    let testEntry = new Gtk.Entry();
    testEntry.set_placeholder_text("Type phonetic text here...");
    let fontDesc = imports.gi.Pango.FontDescription.from_string("Noto Sans Bengali, Kalpurush, sans-serif 16");
    testEntry.override_font(fontDesc);

    let testStatusLabel = new Gtk.Label({
        markup: "<i>Ready for input. Ensure Avro is enabled (F12).</i>",
        xalign: 0
    });

    testEntry.connect("changed", () => {
        let t = testEntry.get_text();
        if (/[\u0980-\u09FF]/.test(t)) {
            testStatusLabel.set_markup("<span color='#00e5a0' weight='bold'>✓ Bengali Unicode text successfully captured!</span>");
        } else if (t.length > 0) {
            testStatusLabel.set_markup("<span color='#e3b341'>Latin text typed. If you intended Bengali, press F12 or toggle 'বাংলা' on TopBar.</span>");
        } else {
            testStatusLabel.set_markup("<i>Ready for input. Ensure Avro is enabled (F12).</i>");
        }
    });

    testBox.pack_start(testHint, false, false, 0);
    testBox.pack_start(testEntry, false, false, 0);
    testBox.pack_start(testStatusLabel, false, false, 0);
    testFrame.add(testBox);
    vbox.pack_start(testFrame, false, false, 0);

    // Diagnostic Log View
    let diagFrame = new Gtk.Frame({ label: " System Telemetry & Status Report " });
    let scrolled = new Gtk.ScrolledWindow();
    let textView = new Gtk.TextView({ editable: false, monospace: true });
    let textBuffer = textView.get_buffer();
    scrolled.add(textView);
    scrolled.set_min_content_height(240);
    diagFrame.add(scrolled);
    vbox.pack_start(diagFrame, true, true, 0);

    // Actions Row
    let btnBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });

    let btnRefresh = new Gtk.Button({ label: "Refresh Telemetry" });
    let btnFix = new Gtk.Button({ label: "Auto-Fix Common Issues" });
    let btnCopy = new Gtk.Button({ label: "Copy Report to Clipboard" });
    let btnClose = new Gtk.Button({ label: "Close" });

    function refreshReport() {
        let r = runDiagnosticCheck();
        let formatted = formatReportText(r);
        textBuffer.set_text(formatted, -1);
    }

    btnRefresh.connect("clicked", () => refreshReport());

    btnFix.connect("clicked", () => {
        let fixes = autoFixIssues();
        let dialog = new Gtk.MessageDialog({
            transient_for: window,
            modal: true,
            message_type: Gtk.MessageType.INFO,
            buttons: Gtk.ButtonsType.OK,
            text: "Auto-Fix Executed",
            secondary_text: fixes.length > 0 ? fixes.join("\n") : "No automatic fixes were required."
        });
        dialog.run();
        dialog.destroy();
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1200, () => {
            refreshReport();
            return false;
        });
    });

    btnCopy.connect("clicked", () => {
        let clipboard = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD);
        let start = textBuffer.get_start_iter();
        let end = textBuffer.get_end_iter();
        let text = textBuffer.get_text(start, end, false);
        clipboard.set_text(text, -1);

        let dialog = new Gtk.MessageDialog({
            transient_for: window,
            modal: true,
            message_type: Gtk.MessageType.INFO,
            buttons: Gtk.ButtonsType.OK,
            text: "Copied to Clipboard",
            secondary_text: "The diagnostic report has been copied to your clipboard."
        });
        dialog.run();
        dialog.destroy();
    });

    btnClose.connect("clicked", () => window.destroy());

    btnBox.pack_start(btnRefresh, false, false, 0);
    btnBox.pack_start(btnFix, false, false, 0);
    btnBox.pack_start(btnCopy, false, false, 0);
    btnBox.pack_end(btnClose, false, false, 0);
    vbox.pack_start(btnBox, false, false, 0);

    window.add(vbox);
    window.connect("destroy", () => Gtk.main_quit());

    window.show_all();
    refreshReport();
    Gtk.main();
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLI Mode Entrypoint
   ═══════════════════════════════════════════════════════════════════════════ */
let isCli = false;
let isFix = false;

if (typeof ARGV !== 'undefined') {
    for (let arg of ARGV) {
        if (arg === '--cli' || arg === '-c') isCli = true;
        if (arg === '--fix' || arg === '-f') isFix = true;
    }
}

if (isFix) {
    print("Executing Avro Doctor Auto-Fix...");
    let fixes = autoFixIssues();
    for (let f of fixes) print("  ✓ " + f);
    imports.system.exit(0);
} else if (isCli) {
    let rep = runDiagnosticCheck();
    print(formatReportText(rep));
    imports.system.exit(rep.issues.length === 0 ? 0 : 1);
} else {
    runDoctorGUI();
}
