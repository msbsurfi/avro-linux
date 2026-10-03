#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Doctor (Remastered Diagnostic & Health Check Tool)
    SPDX-License-Identifier: MPL-2.0
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (BUET, 2021-22)
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

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

    // Check GSettings schema safely without triggering fatal GLib-GIO abort
    try {
        let schemaSource = Gio.SettingsSchemaSource.get_default();
        let schemaObj = schemaSource ? schemaSource.lookup("com.omicronlab.avro", true) : null;
        if (!schemaObj) {
            // Check local build / source directories (useful during CI and test runs)
            let candidateDirs = [
                "./data/gsettings",
                GLib.get_current_dir() + "/data/gsettings",
                "/usr/share/avro-linux/gsettings"
            ];
            for (let d of candidateDirs) {
                if (GLib.file_test(d + "/gschemas.compiled", GLib.FileTest.EXISTS)) {
                    try {
                        let localSource = Gio.SettingsSchemaSource.new_from_directory(d, schemaSource, false);
                        schemaObj = localSource ? localSource.lookup("com.omicronlab.avro", true) : null;
                        if (schemaObj) break;
                    } catch (e) {}
                }
            }
        }
        if (schemaObj && schemaObj.list_keys().indexOf("mode-bangla") !== -1) {
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

    // Check IBus version
    report.ibusVersion = "Unknown";
    try {
        let [ok, out] = GLib.spawn_command_line_sync("ibus version");
        if (ok && out) {
            let str = String.fromCharCode.apply(null, out).trim();
            report.ibusVersion = str || "Unknown";
        }
    } catch (e) {}

    // Check ibus-avro component file
    report.componentFile = false;
    let componentPaths = [
        "/usr/share/ibus/component/avro.xml",
        "/usr/share/ibus/component/ibus-avro.xml",
        "/usr/local/share/ibus/component/avro.xml"
    ];
    for (let cp of componentPaths) {
        if (GLib.file_test(cp, GLib.FileTest.EXISTS)) {
            report.componentFile = cp;
            break;
        }
    }
    if (!report.componentFile) {
        report.issues.push("IBus component file for ibus-avro not found in /usr/share/ibus/component/.");
        report.recommendations.push("Reinstall avro-linux: sudo dpkg -i avro-linux_*.deb");
    }

    // Check embed-preedit-text (required for live inline typing in VS Code / Konsole)
    report.embedPreedit = "unknown";
    try {
        let [ok, out] = GLib.spawn_command_line_sync("gsettings get org.freedesktop.ibus.general embed-preedit-text");
        if (ok && out) {
            report.embedPreedit = String.fromCharCode.apply(null, out).trim();
            if (report.embedPreedit !== "true") {
                report.issues.push("IBus embed-preedit-text is not enabled (value: " + report.embedPreedit + ").");
                report.recommendations.push("Run: gsettings set org.freedesktop.ibus.general embed-preedit-text true");
            }
        }
    } catch (e) {}

    // Check GNOME input sources (only if on GNOME)
    report.gnomeInputSources = "N/A";
    try {
        let desktop = (GLib.getenv("XDG_CURRENT_DESKTOP") || "").toUpperCase();
        if (desktop.indexOf("GNOME") !== -1) {
            let [ok, out] = GLib.spawn_command_line_sync("gsettings get org.gnome.desktop.input-sources sources");
            if (ok && out) {
                report.gnomeInputSources = String.fromCharCode.apply(null, out).trim();
                if (report.gnomeInputSources.indexOf("ibus") === -1) {
                    report.issues.push("GNOME input sources do not include IBus: " + report.gnomeInputSources);
                    report.recommendations.push("Add IBus as input source in GNOME Settings → Keyboard.");
                }
            }
        }
    } catch (e) {}

    // Check system locale
    report.locale = "Unknown";
    try {
        let [ok, out] = GLib.spawn_command_line_sync("locale");
        if (ok && out) {
            let str = String.fromCharCode.apply(null, out).trim();
            report.locale = str.split("\n")[0] || "Unknown";
        }
    } catch (e) {}

    // Check profile.d env file exists
    report.profileEnvFile = GLib.file_test("/etc/profile.d/avro-linux.sh", GLib.FileTest.EXISTS);
    if (!report.profileEnvFile) {
        report.issues.push("/etc/profile.d/avro-linux.sh is missing (IM env vars won't auto-set on login).");
        report.recommendations.push("Reinstall avro-linux: sudo dpkg -i avro-linux_*.deb");
    }

    return report;
}

function formatReportText(report) {
    let lines = [];
    lines.push("==================================================");
    lines.push("          AVRO LINUX SYSTEM DIAGNOSTIC REPORT     ");
    lines.push("  Remastered by MD Shifat Bin Siddique Urfi (DMC, K-79) & MD Mehedi Hasan (BUET, 2021-22)  ");
    lines.push("==================================================");
    lines.push("Timestamp:           " + report.timestamp);
    lines.push("Operating System:    " + report.os);
    lines.push("Desktop Environment: " + report.desktop);
    lines.push("Session Type:        " + report.session + " (Wayland: " + report.waylandDisplay + ", X11: " + report.x11Display + ")");
    lines.push("");
    lines.push("--- IBus Subsystem ---");
    lines.push("IBus Version:        " + (report.ibusVersion || "Unknown"));
    lines.push("IBus Daemon Running: " + (report.ibusRunning ? "YES [OK]" : "NO [FAIL]"));
    lines.push("ibus-avro Registered:" + (report.ibusRegistered ? "YES [OK]" : "NO [FAIL]"));
    lines.push("Active Engine:       " + report.ibusActiveEngine + (report.ibusActiveEngine === "ibus-avro" ? " [OK]" : " [SWITCH NEEDED]"));
    lines.push("Component File:      " + (report.componentFile ? report.componentFile + " [OK]" : "NOT FOUND [FAIL]"));
    lines.push("Embed Preedit Text:  " + (report.embedPreedit === "true" ? "Enabled [OK]" : report.embedPreedit + " [FAIL — live typing won't work]"));
    lines.push("");
    lines.push("--- Environment Variables ---");
    lines.push("GTK_IM_MODULE:       " + report.envGtk + (report.envGtk === "ibus" ? " [OK]" : " [WRONG — should be 'ibus']"));
    lines.push("QT_IM_MODULE:        " + report.envQt + (report.envQt === "ibus" ? " [OK]" : " [WRONG — should be 'ibus']"));
    lines.push("XMODIFIERS:          " + report.envXmod + (report.envXmod.indexOf("@im=ibus") !== -1 ? " [OK]" : " [WRONG]"));
    lines.push("Profile Env Script:  " + (report.profileEnvFile ? "/etc/profile.d/avro-linux.sh [OK]" : "MISSING [FAIL]"));
    lines.push("");
    lines.push("--- Configuration & Fonts ---");
    lines.push("GSettings Schema:    " + (report.schemaValid ? "VALID [OK]" : "MISSING [FAIL]"));
    lines.push("Bengali Fonts Found: " + (report.bengaliFonts.length > 0 ? report.bengaliFonts.join(", ") : "None detected"));
    lines.push("");
    lines.push("--- System ---");
    lines.push("System Locale:       " + (report.locale || "Unknown"));
    if (report.gnomeInputSources && report.gnomeInputSources !== "N/A") {
        lines.push("GNOME Input Sources: " + report.gnomeInputSources);
    }
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
        let [ok, out] = GLib.spawn_command_line_sync("gsettings get org.freedesktop.ibus.panel show");
        if (ok && out) {
            let str = String.fromCharCode.apply(null, out).trim();
            if (str !== "0") {
                GLib.spawn_command_line_sync("gsettings set org.freedesktop.ibus.panel show 0");
                fixed.push("Disabled IBus floating property panel (show=0).");
            }
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
        let schemaSource = Gio.SettingsSchemaSource.get_default();
        let schemaObj = schemaSource ? schemaSource.lookup("com.omicronlab.avro", true) : null;
        if (schemaObj) {
            let schema = new Gio.Settings({ settings_schema: schemaObj });
            if (schema) {
                schema.set_boolean("mode-bangla", true);
                fixed.push("Set GSettings mode-bangla to true.");
            }
        }
    } catch (e) {}

    return fixed;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GUI Diagnostic Window & Live Interactive Self-Test
   ═══════════════════════════════════════════════════════════════════════════ */
function runDoctorGUI() {
    try {
        GLib.set_prgname("avro-doctor");
        GLib.set_application_name("Avro Doctor");
    } catch (e) {}

    Gtk.init(null);
    try { Gtk.Window.set_default_icon_name("avro-doctor"); } catch (e) {}
    let pal = Theme.apply();

    let window = new Gtk.Window({
        title: "Avro Doctor — Diagnostics & Interactive Test",
        default_width: 780,
        default_height: 720,
        window_position: Gtk.WindowPosition.CENTER
    });
    window.set_icon_name("avro-doctor");
    try { window.set_wmclass("avro-doctor", "AvroDoctor"); } catch (e) {}
    Theme.styleWindow(window);
    window.set_size_request(640, 520);

    let header = Theme.headerBar({
        icon: "avro-doctor",
        title: "Avro Doctor",
        subtitle: "System health & diagnostics"
    });
    window.set_titlebar(header);

    let outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14, margin: 20 });
    let page = new Gtk.ScrolledWindow({ hscrollbar_policy: Gtk.PolicyType.NEVER });
    page.add(vbox);
    outer.pack_start(page, true, true, 0);

    /* ── Summary banner ── */
    let summaryCard = Theme.card();
    let summaryBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 16, margin: 18 });
    let summaryIcon = new Gtk.Image({ icon_name: "avro-doctor", pixel_size: 56 });
    let summaryText = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 3, valign: Gtk.Align.CENTER });
    let summaryTitle = Theme.label("Checking your setup…", "avro-row-title");
    summaryTitle.get_style_context().add_class("avro-page-title");
    let summarySub = Theme.label("Avro Doctor looks at IBus, the Avro engine, fonts and settings.", "avro-sub");
    summaryText.pack_start(summaryTitle, false, false, 0);
    summaryText.pack_start(summarySub, false, false, 0);
    let summaryBadge = Theme.badge("Checking", "info");
    summaryBox.pack_start(summaryIcon, false, false, 0);
    summaryBox.pack_start(summaryText, true, true, 0);
    summaryBox.pack_end(summaryBadge, false, false, 0);
    summaryCard.pack_start(summaryBox, false, false, 0);
    vbox.pack_start(summaryCard, false, false, 0);

    /* ── Health checks ── */
    vbox.pack_start(Theme.sectionTitle("Health checks"), false, false, 0);
    let checksCard = Theme.card();
    let checkRows = {};
    function addCheck(key, title, sub) {
        let value = Theme.badge("…", "info");
        let row = Theme.settingRow(title, sub, value);
        checkRows[key] = value;
        return row;
    }
    Theme.fillCard(checksCard, [
        addCheck("daemon", "IBus daemon", "The input method service that runs Avro"),
        addCheck("registered", "Avro engine registered", "ibus-avro is known to IBus"),
        addCheck("active", "Active input engine", "Engine IBus is using right now"),
        addCheck("component", "Component file", "ibus-avro .xml file in /usr/share/ibus/component/"),
        addCheck("preedit", "Embed preedit text", "Live inline typing (needed for VS Code, Konsole, etc.)"),
        addCheck("schema", "Avro settings", "GSettings schema com.omicronlab.avro"),
        addCheck("envvars", "IM environment vars", "GTK_IM_MODULE, QT_IM_MODULE, XMODIFIERS"),
        addCheck("profile", "Profile env script", "/etc/profile.d/avro-linux.sh"),
        addCheck("fonts", "Bengali fonts", "Fonts that can display Bengali text")
    ]);
    vbox.pack_start(checksCard, false, false, 0);

    function setCheck(key, text, kind) {
        let b = checkRows[key];
        if (!b) return;
        let ctx = b.get_style_context();
        ["ok", "warn", "err", "info"].forEach(k => ctx.remove_class("avro-badge-" + k));
        ctx.add_class("avro-badge-" + kind);
        b.set_text(text);
    }

    /* ── Interactive Typing Test Area ── */
    vbox.pack_start(Theme.sectionTitle("Interactive typing self-test"), false, false, 0);
    let testCard = Theme.card();
    let testBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin: 18 });
    let testHint = Theme.label("Type here to test Avro Phonetic (e.g. type 'ami banglay gan gai.'):", "avro-sub");
    let testEntry = new Gtk.Entry();
    testEntry.set_placeholder_text("Type phonetic text here...");
    let fontDesc = imports.gi.Pango.FontDescription.from_string("Noto Sans Bengali, Kalpurush, sans-serif 16");
    testEntry.override_font(fontDesc);

    let testStatusLabel = new Gtk.Label({
        label: "<i>Ready for input. Ensure Avro is enabled (F12).</i>",
        use_markup: true,
        xalign: 0
    });
    testStatusLabel.get_style_context().add_class("avro-sub");

    testEntry.connect("changed", () => {
        let t = testEntry.get_text();
        if (/[\u0980-\u09FF]/.test(t)) {
            testStatusLabel.set_markup("<span color='" + pal.ok + "' weight='bold'>✓ Bengali Unicode text successfully captured!</span>");
        } else if (t.length > 0) {
            testStatusLabel.set_markup("<span color='" + pal.warn + "'>Latin text typed. If you intended Bengali, press F12 or toggle 'বাংলা' on TopBar.</span>");
        } else {
            testStatusLabel.set_markup("<i>Ready for input. Ensure Avro is enabled (F12).</i>");
        }
    });

    testBox.pack_start(testHint, false, false, 0);
    testBox.pack_start(testEntry, false, false, 0);
    testBox.pack_start(testStatusLabel, false, false, 0);
    testCard.pack_start(testBox, false, false, 0);
    vbox.pack_start(testCard, false, false, 0);

    /* ── Diagnostic Log View ── */
    vbox.pack_start(Theme.sectionTitle("System telemetry & status report"), false, false, 0);
    let scrolled = new Gtk.ScrolledWindow();
    scrolled.get_style_context().add_class("avro-framed");
    let textView = new Gtk.TextView({ editable: false, monospace: true, left_margin: 12, right_margin: 12, top_margin: 10, bottom_margin: 10 });
    let textBuffer = textView.get_buffer();
    scrolled.add(textView);
    scrolled.set_min_content_height(220);
    vbox.pack_start(scrolled, true, true, 0);

    /* ── Actions (in the header bar) ── */
    let btnRefresh = Theme.iconButton("avro-refresh-symbolic", "Re-run all checks", "Refresh");
    let btnFix = new Gtk.Button({ valign: Gtk.Align.CENTER });
    let fixBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
    fixBox.pack_start(Gtk.Image.new_from_icon_name("avro-check-symbolic", Gtk.IconSize.BUTTON), false, false, 0);
    fixBox.pack_start(new Gtk.Label({ label: "Auto-Fix Common Issues" }), false, false, 0);
    btnFix.add(fixBox);
    btnFix.get_style_context().add_class("suggested-action");
    btnFix.set_tooltip_text("Repair the typical IBus / Avro configuration problems");
    let btnCopy = Theme.iconButton("avro-copy-symbolic", "Copy the report to the clipboard", "Copy Report");
    let btnClose = new Gtk.Button({ label: "Close" });

    function refreshReport() {
        let r = runDiagnosticCheck();
        let formatted = formatReportText(r);
        textBuffer.set_text(formatted, -1);

        setCheck("daemon", r.ibusRunning ? "Running" : "Not running", r.ibusRunning ? "ok" : "err");
        setCheck("registered", r.ibusRegistered ? "Registered" : "Missing", r.ibusRegistered ? "ok" : "err");
        let active = r.ibusActiveEngine && r.ibusActiveEngine !== "None" ? r.ibusActiveEngine : "None";
        setCheck("active", active, /avro/i.test(active) ? "ok" : "warn");
        setCheck("component", r.componentFile ? "Found" : "Missing", r.componentFile ? "ok" : "err");
        setCheck("preedit", r.embedPreedit === "true" ? "Enabled" : (r.embedPreedit || "Unknown"), r.embedPreedit === "true" ? "ok" : "err");
        setCheck("schema", r.schemaValid ? "Valid" : "Not found", r.schemaValid ? "ok" : "err");

        // Env vars: ok only if all 3 are correct
        let envOk = r.envGtk === "ibus" && r.envQt === "ibus" && r.envXmod.indexOf("@im=ibus") !== -1;
        setCheck("envvars", envOk ? "All set" : "Issues found", envOk ? "ok" : "warn");
        setCheck("profile", r.profileEnvFile ? "Present" : "Missing", r.profileEnvFile ? "ok" : "err");

        let nf = (r.bengaliFonts || []).length;
        setCheck("fonts", nf > 0 ? nf + " found" : "None", nf > 0 ? "ok" : "warn");

        let n = (r.issues || []).length;
        let bctx = summaryBadge.get_style_context();
        ["ok", "warn", "err", "info"].forEach(k => bctx.remove_class("avro-badge-" + k));
        if (n === 0) {
            summaryTitle.set_text("Everything looks good");
            summarySub.set_text("Avro is installed and ready. Use the test below to try typing Bengali.");
            summaryBadge.set_text("Healthy");
            bctx.add_class("avro-badge-ok");
        } else {
            summaryTitle.set_text(n + (n === 1 ? " issue found" : " issues found"));
            summarySub.set_text(r.issues[0] + (n > 1 ? "  (+" + (n - 1) + " more in the report)" : ""));
            summaryBadge.set_text("Needs attention");
            bctx.add_class("avro-badge-warn");
        }
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

    header.pack_end(btnFix);
    header.pack_end(btnCopy);
    header.pack_end(btnRefresh);
    // Close lives in the window controls; keep the button for keyboard users only.
    window.connect("key-press-event", (w, ev) => {
        let [, keyval] = ev.get_keyval();
        if (keyval === Gdk.KEY_Escape) { window.destroy(); return true; }
        return false;
    });

    window.add(outer);
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
