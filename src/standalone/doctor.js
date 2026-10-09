#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Doctor (Remastered Diagnostic & Health Check Tool)
    SPDX-License-Identifier: MPL-2.0
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET)
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

/* The Avro settings, or null when the schema is not installed. Looked up
   first: Gio.Settings.new() aborts the whole program for a missing schema,
   which is exactly one of the problems the Doctor has to report. */
function avroSettings() {
    try {
        let source = Gio.SettingsSchemaSource.get_default();
        let schema = source ? source.lookup("com.omicronlab.avro", true) : null;
        return schema ? new Gio.Settings({ settings_schema: schema }) : null;
    } catch (e) {
        return null;
    }
}

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

/* Command output as text. UTF-8: font names, for one, can be Bengali. */
function decode(bytes) {
    try {
        return bytes ? new TextDecoder('utf-8').decode(bytes) : '';
    } catch (e) {
        return '';
    }
}

/* Runs a command line: [succeeded (exit status 0), standard output]. */
function run(cmd) {
    try {
        let [ok, out, , status] = GLib.spawn_command_line_sync(cmd);
        return [ok && status === 0, ok ? decode(out) : ''];
    } catch (e) {
        return [false, ''];
    }
}

/* Settings of another program, or null when its schema is not installed. */
function settingsFor(schemaId) {
    try {
        let source = Gio.SettingsSchemaSource.get_default();
        let schema = source ? source.lookup(schemaId, true) : null;
        return schema ? new Gio.Settings({ settings_schema: schema }) : null;
    } catch (e) {
        return null;
    }
}

function isGnome() {
    return (GLib.getenv("XDG_CURRENT_DESKTOP") || "").toUpperCase().indexOf("GNOME") !== -1;
}

/* Is Avro in the keyboard list the desktop offers? GNOME keeps its own list
   (input sources); other desktops show IBus' preload engines. */
function avroInKeyboardList() {
    if (isGnome()) {
        let g = settingsFor('org.gnome.desktop.input-sources');
        if (g) return g.get_value('sources').deep_unpack().some(s => s[1] === 'ibus-avro');
    }
    let i = settingsFor('org.freedesktop.ibus.general');
    return i ? i.get_strv('preload-engines').indexOf('ibus-avro') !== -1 : false;
}

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
        inKeyboardList: false,
        envGtk: GLib.getenv("GTK_IM_MODULE") || "unset",
        envQt: GLib.getenv("QT_IM_MODULE") || "unset",
        envXmod: GLib.getenv("XMODIFIERS") || "unset",
        envIssues: [],
        schemaValid: false,
        bengaliFonts: [],
        issues: [],
        recommendations: []
    };

    // Read OS release
    try {
        let [ok, out] = GLib.file_get_contents("/etc/os-release");
        if (ok) {
            let match = decode(out).match(/PRETTY_NAME="([^"]+)"/);
            if (match) report.os = match[1];
        }
    } catch (e) {}

    // IBus of this session: 'ibus list-engine' needs it (pgrep would also
    // find the IBus of other users and sessions)
    let [listOk, list] = run("ibus list-engine");
    report.ibusRunning = listOk;
    if (listOk) {
        let [engineOk, engineOut] = run("ibus engine");
        report.ibusActiveEngine = engineOk ? (engineOut.trim() || "None") : "None";
        if (list.indexOf("ibus-avro") !== -1) {
            report.ibusRegistered = true;
        } else {
            report.issues.push("IBus does not know the Avro engine yet (it was started before Avro was installed).");
            report.recommendations.push("Click Auto-Fix, or run 'ibus write-cache; ibus restart'.");
        }
    } else {
        report.issues.push("IBus is not running in this session.");
        report.recommendations.push("Click Auto-Fix, or run 'ibus-daemon -drx' (log out and in again on GNOME).");
    }

    // Avro in the user's keyboard list. Not having it is no error for the
    // TopBar, which switches IBus itself, but the desktop's switcher needs it.
    report.inKeyboardList = avroInKeyboardList();
    if (!report.inKeyboardList) {
        report.issues.push("Avro is not in your keyboard list" + (isGnome() ? " (GNOME input sources)" : " (IBus input methods)") +
                           ", so the desktop's keyboard switcher does not offer it.");
        report.recommendations.push("Click Auto-Fix, or add \"Bangla (Avro Phonetic)\" in your keyboard / IBus settings.");
    }

    // Check GSettings schema
    let settings = avroSettings();
    if (settings && settings.settings_schema.has_key("mode-bangla")) {
        report.schemaValid = true;
    } else {
        report.issues.push("GSettings schema 'com.omicronlab.avro' is " + (settings ? "incomplete." : "not installed."));
        report.recommendations.push("Run 'sudo glib-compile-schemas /usr/share/glib-2.0/schemas'.");
    }

    // Input method environment. On Wayland, GTK and Qt reach IBus without
    // these variables; set to another framework (fcitx, ...) they are a problem.
    let wayland = report.session === "wayland";
    let checkVar = (name, value, expected) => {
        if (value === "unset") {
            if (!wayland) report.envIssues.push(name + " is not set (expected '" + expected + "').");
        } else if (value.indexOf("ibus") === -1) {
            report.envIssues.push(name + " is '" + value + "': another input method framework is selected.");
        }
    };
    checkVar("GTK_IM_MODULE", report.envGtk, "ibus");
    checkVar("QT_IM_MODULE", report.envQt, "ibus");
    checkVar("XMODIFIERS", report.envXmod, "@im=ibus");
    if (report.envIssues.length > 0) {
        report.issues = report.issues.concat(report.envIssues);
        report.recommendations.push("Choose IBus as the input method framework (Debian/Ubuntu: 'im-config -n ibus'), then log out and in again.");
    }

    // Check Bengali fonts
    let [fontsOk, fontsOut] = run("fc-list :lang=bn family");
    if (fontsOk) {
        let lines = fontsOut.split("\n").map(s => s.trim()).filter(s => s.length > 0);
        report.bengaliFonts = [...new Set(lines)].slice(0, 10);
    }
    if (report.bengaliFonts.length === 0) {
        report.issues.push("No Bengali fonts detected in fontconfig.");
        report.recommendations.push("Install a Bengali font: sudo apt install fonts-noto-core (or fonts-beng).");
    }

    // Check IBus version
    let [, version] = run("ibus version");
    report.ibusVersion = version.trim() || "Unknown";

    // Check ibus-avro component file
    report.componentFile = false;
    let componentPaths = [
        "/usr/share/ibus/component/ibus-avro.xml",
        "/usr/share/ibus/component/avro.xml",
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
        report.recommendations.push("Reinstall Avro: sudo apt install --reinstall avro-linux");
    }

    // Check embed-preedit-text (required for live inline typing in VS Code / Konsole)
    report.embedPreedit = "unknown";
    let ibusGeneral = settingsFor('org.freedesktop.ibus.general');
    if (ibusGeneral) {
        report.embedPreedit = ibusGeneral.get_boolean('embed-preedit-text') ? "true" : "false";
        if (report.embedPreedit !== "true") {
            report.issues.push("IBus embed-preedit-text is off, so the word being typed is not shown in the text.");
            report.recommendations.push("Click Auto-Fix, or run: gsettings set org.freedesktop.ibus.general embed-preedit-text true");
        }
    }

    // GNOME input sources, for the report
    report.gnomeInputSources = "N/A";
    if (isGnome()) {
        let g = settingsFor('org.gnome.desktop.input-sources');
        if (g) report.gnomeInputSources = g.get_value('sources').print(true);
    }

    // Check system locale
    let [, locale] = run("locale");
    report.locale = locale.trim().split("\n")[0] || "Unknown";

    // The package's login script sets the IBus variables when nothing else
    // does; im-config or the desktop may set them instead, so this is no error.
    report.profileEnvFile = GLib.file_test("/etc/profile.d/avro-linux.sh", GLib.FileTest.EXISTS);

    return report;
}

function formatReportText(report) {
    let lines = [];
    let active = report.ibusActiveEngine;
    let activeNote = /avro/.test(active) ? " [OK]" :
        !report.ibusRunning ? " [FAIL]" :
        active === "None" ? " [none selected yet]" : " [OK — English; switch to Avro to type Bangla]";
    lines.push("==================================================");
    lines.push("          AVRO LINUX SYSTEM DIAGNOSTIC REPORT     ");
    lines.push("  Remastered by MD Shifat Bin Siddique Urfi (DMC, K-79) & MD Mehedi Hasan (CSE 21, BUET)  ");
    lines.push("==================================================");
    lines.push("Timestamp:           " + report.timestamp);
    lines.push("Operating System:    " + report.os);
    lines.push("Desktop Environment: " + report.desktop);
    lines.push("Session Type:        " + report.session + " (Wayland: " + report.waylandDisplay + ", X11: " + report.x11Display + ")");
    lines.push("");
    lines.push("--- IBus Subsystem ---");
    lines.push("IBus Version:        " + (report.ibusVersion || "Unknown"));
    lines.push("IBus Running:        " + (report.ibusRunning ? "YES [OK]" : "NO [FAIL]"));
    lines.push("ibus-avro Registered:" + (report.ibusRegistered ? "YES [OK]" : "NO [FAIL]"));
    lines.push("Active Engine:       " + active + activeNote);
    lines.push("In Keyboard List:    " + (report.inKeyboardList ? "YES [OK]" : "NO [ADD IT]"));
    lines.push("Component File:      " + (report.componentFile ? report.componentFile + " [OK]" : "NOT FOUND [FAIL]"));
    lines.push("Embed Preedit Text:  " + (report.embedPreedit === "true" ? "Enabled [OK]" : report.embedPreedit + " [FAIL — live typing won't work]"));
    lines.push("");
    lines.push("--- Environment Variables ---");
    let varLine = (value, ok) => value + (ok ? " [OK]" : " [CHECK]");
    let wayland = report.session === "wayland";
    lines.push("GTK_IM_MODULE:       " + varLine(report.envGtk, report.envGtk === "ibus" || (wayland && report.envGtk === "unset")));
    lines.push("QT_IM_MODULE:        " + varLine(report.envQt, report.envQt === "ibus" || (wayland && report.envQt === "unset")));
    lines.push("XMODIFIERS:          " + varLine(report.envXmod, report.envXmod.indexOf("@im=ibus") !== -1 || (wayland && report.envXmod === "unset")));
    lines.push("Login Env Script:    " + (report.profileEnvFile ? "/etc/profile.d/avro-linux.sh" : "not installed"));
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

/* Repairs what the report finds, for this user only. It never changes the
   keyboard in use, the Bangla/English mode or how IBus' own panel looks. */
function autoFixIssues() {
    let fixed = [];
    let [running, engines] = run("ibus list-engine");
    if (!running) {
        // In the background ("ibus start" would stay in the foreground as the
        // daemon); on GNOME, GNOME Shell is IBus' panel
        try { GLib.spawn_command_line_async(isGnome() ? "ibus-daemon -drx --panel disable" : "ibus-daemon -drx"); } catch (e) {}
        GLib.usleep(1500000);
        fixed.push("Started the IBus input method service.");
    } else if (engines.indexOf("ibus-avro") === -1) {
        run("ibus write-cache");
        run("ibus restart");
        GLib.usleep(1500000);
        fixed.push("Reloaded IBus so that it knows the Avro engine.");
    }

    let ibusGeneral = settingsFor('org.freedesktop.ibus.general');
    if (ibusGeneral) {
        if (!ibusGeneral.get_boolean('embed-preedit-text')) {
            ibusGeneral.set_boolean('embed-preedit-text', true);
            fixed.push("Turned on live inline typing (embed-preedit-text).");
        }
        let pe = ibusGeneral.get_strv('preload-engines');
        if (pe.indexOf('ibus-avro') === -1) {
            if (pe.length === 0) pe.push('xkb:us::eng');
            pe.push('ibus-avro');
            ibusGeneral.set_strv('preload-engines', pe);
            fixed.push("Added Avro to the IBus input methods.");
        }
    }
    let gnome = settingsFor('org.gnome.desktop.input-sources');
    if (gnome && isGnome()) {
        let sources = gnome.get_value('sources').deep_unpack();
        if (!sources.some(s => s[1] === 'ibus-avro')) {
            if (sources.length === 0) sources.push(['xkb', 'us']);
            // At the end: the user's own first keyboard stays the default
            sources.push(['ibus', 'ibus-avro']);
            gnome.set_value('sources', new GLib.Variant('a(ss)', sources));
            fixed.push("Added Avro to the GNOME input sources.");
        }
    }
    Gio.Settings.sync();
    return fixed;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GUI Diagnostic Window & Live Interactive Self-Test
   ═══════════════════════════════════════════════════════════════════════════ */
function runDoctorGUI() {
    if (!globalThis.__avroAppIdentity) {
        globalThis.__avroAppIdentity = true;
        try {
            GLib.set_prgname("avro-doctor");
            GLib.set_application_name("Avro Doctor");
        } catch (e) {}
    }

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
        addCheck("list", "In your keyboard list", "Avro is offered by the desktop's keyboard switcher"),
        addCheck("component", "Component file", "ibus-avro .xml file in /usr/share/ibus/component/"),
        addCheck("preedit", "Embed preedit text", "Live inline typing (needed for VS Code, Konsole, etc.)"),
        addCheck("schema", "Avro settings", "GSettings schema com.omicronlab.avro"),
        addCheck("envvars", "IM environment vars", "GTK_IM_MODULE, QT_IM_MODULE, XMODIFIERS"),
        addCheck("profile", "Login env script", "/etc/profile.d/avro-linux.sh (used when nothing else selects IBus)"),
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
        setCheck("list", r.inKeyboardList ? "Yes" : "Not added", r.inKeyboardList ? "ok" : "warn");
        setCheck("registered", r.ibusRegistered ? "Registered" : "Missing", r.ibusRegistered ? "ok" : "err");
        let active = r.ibusActiveEngine && r.ibusActiveEngine !== "None" ? r.ibusActiveEngine : "None";
        // English is a normal choice, not a problem
        setCheck("active", /avro/i.test(active) ? "Avro" : (r.ibusRunning ? active + " (English)" : "None"),
                 /avro/i.test(active) ? "ok" : (r.ibusRunning ? "info" : "err"));
        setCheck("component", r.componentFile ? "Found" : "Missing", r.componentFile ? "ok" : "err");
        setCheck("preedit", r.embedPreedit === "true" ? "Enabled" : (r.embedPreedit || "Unknown"), r.embedPreedit === "true" ? "ok" : "err");
        setCheck("schema", r.schemaValid ? "Valid" : "Not found", r.schemaValid ? "ok" : "err");

        let envOk = r.envIssues.length === 0;
        setCheck("envvars", envOk ? "All set" : "Issues found", envOk ? "ok" : "warn");
        setCheck("profile", r.profileEnvFile ? "Present" : "Not installed", "info");

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
        let clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());
        let start = textBuffer.get_start_iter();
        let end = textBuffer.get_end_iter();
        let text = textBuffer.get_text(start, end, false);
        clipboard.set_text(text, -1);
        // Hand it to the clipboard manager: it stays after the Doctor closes
        clipboard.store();

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
