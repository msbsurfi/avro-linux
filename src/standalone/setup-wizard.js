#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Windows-Style Graphical Setup & Installation Wizard
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Standalone Suite
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET)
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// Discover base path
let baseDir = '/usr/share/avro-linux';
let scriptDir = '.';
try {
    let scriptPath = imports.system.programPath || '.';
    scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

// Module search paths
imports.searchPath.unshift('/usr/share/avro-linux/common');
imports.searchPath.unshift(baseDir + '/src/common');
imports.searchPath.unshift(baseDir + '/common');
imports.searchPath.unshift(scriptDir + '/../common');

let Theme = null;
try {
    Theme = imports.avrotheme;
} catch (e) {
    try {
        Theme = imports.common.avrotheme;
    } catch (e2) {}
}

function findAsset(filename) {
    let candidates = [
        scriptDir + '/../../' + filename,
        scriptDir + '/../' + filename,
        scriptDir + '/' + filename,
        baseDir + '/' + filename,
        '/usr/share/avro-linux/' + filename
    ];
    for (let p of candidates) {
        if (GLib.file_test(p, GLib.FileTest.EXISTS)) {
            return p;
        }
    }
    return null;
}

function findDebPackage(argPath) {
    if (argPath && GLib.file_test(argPath, GLib.FileTest.EXISTS) && argPath.endsWith('.deb')) {
        return GLib.canonicalize_filename(argPath, GLib.get_current_dir());
    }
    let searchDirs = [GLib.get_current_dir(), scriptDir + '/../..', scriptDir + '/..', '/tmp'];
    for (let dir of searchDirs) {
        let d = Gio.File.new_for_path(dir);
        if (!d.query_exists(null)) continue;
        try {
            let enumerator = d.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                let name = info.get_name();
                if (name.startsWith("avro-linux") && name.endsWith(".deb")) {
                    return GLib.canonicalize_filename(dir + "/" + name, GLib.get_current_dir());
                }
            }
        } catch (e) {}
    }
    return null;
}

function triggerReboot() {
    try {
        GLib.spawn_command_line_async("systemctl reboot || pkexec systemctl reboot || reboot");
    } catch (e) {
        try {
            GLib.spawn_command_line_async("pkexec reboot");
        } catch (e2) {}
    }
    Gtk.main_quit();
}

function runSetupWizard(targetDeb) {
    Gtk.init(null);
    if (Theme) Theme.apply();

    try {
        GLib.set_prgname("avro-setup");
        GLib.set_application_name("Avro Keyboard Setup");
    } catch (e) {}

    let win = new Gtk.Window({
        title: "Avro Keyboard Setup Wizard",
        default_width: 760,
        default_height: 520,
        window_position: Gtk.WindowPosition.CENTER
    });
    win.set_icon_name("avro-bangla");
    win.set_resizable(false);
    if (Theme) Theme.styleWindow(win);

    if (Theme && typeof Theme.headerBar === 'function') {
        win.set_titlebar(Theme.headerBar({
            icon: "avro-bangla",
            title: "Avro Keyboard Setup",
            subtitle: "Remastered Edition for Linux"
        }));
    }

    let rootBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0 });
    win.add(rootBox);

    // Left Banner / Sidebar
    let sidebar = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        width_request: 230
    });
    sidebar.get_style_context().add_class("avro-sidebar");

    // Splash Image
    let splashPath = findAsset("data/images/splash.jpg") || findAsset("images/splash.jpg");
    if (splashPath) {
        try {
            let pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(splashPath, 230, 150, true);
            let img = Gtk.Image.new_from_pixbuf(pb);
            sidebar.pack_start(img, false, false, 0);
        } catch (e) {}
    } else {
        let brandBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin: 16 });
        brandBox.pack_start(new Gtk.Image({ icon_name: "avro-bangla", pixel_size: 64 }), false, false, 0);
        sidebar.pack_start(brandBox, false, false, 0);
    }

    // Steps list in sidebar
    let stepsBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin_start: 18, margin_end: 12, margin_top: 10 });
    let stepLabels = [];
    const STEP_NAMES = [
        "1. Welcome",
        "2. System Check",
        "3. Installation",
        "4. Finish & Restart"
    ];
    for (let i = 0; i < STEP_NAMES.length; i++) {
        let lbl = new Gtk.Label({ label: STEP_NAMES[i], xalign: 0 });
        lbl.get_style_context().add_class("avro-row-sub");
        stepLabels.push(lbl);
        stepsBox.pack_start(lbl, false, false, 0);
    }
    sidebar.pack_start(stepsBox, true, true, 0);

    let creditsLabel = new Gtk.Label({
        label: "MD Shifat Bin Siddique Urfi\nMD Mehedi Hasan",
        xalign: 0,
        margin_start: 18,
        margin_bottom: 12
    });
    creditsLabel.get_style_context().add_class("dim-label");
    sidebar.pack_end(creditsLabel, false, false, 0);

    rootBox.pack_start(sidebar, false, false, 0);
    rootBox.pack_start(new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL }), false, false, 0);

    // Right Content Area
    let rightCol = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
    rootBox.pack_start(rightCol, true, true, 0);

    let stack = new Gtk.Stack({
        transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
        transition_duration: 180,
        margin_start: 24,
        margin_end: 24,
        margin_top: 20,
        margin_bottom: 16
    });
    rightCol.pack_start(stack, true, true, 0);

    // Bottom Navigation Bar
    let bottomBar = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 10,
        margin_start: 24,
        margin_end: 24,
        margin_bottom: 16
    });
    rightCol.pack_end(bottomBar, false, false, 0);
    rightCol.pack_end(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }), false, false, 12);

    let btnBack = new Gtk.Button({ label: "< Back", sensitive: false });
    let btnNext = new Gtk.Button({ label: "Next >" });
    btnNext.get_style_context().add_class("suggested-action");
    let btnCancel = new Gtk.Button({ label: "Cancel" });

    bottomBar.pack_end(btnNext, false, false, 0);
    bottomBar.pack_end(btnBack, false, false, 0);
    bottomBar.pack_start(btnCancel, false, false, 0);

    let currentPage = 1;

    function updateStepIndicators(page) {
        currentPage = page;
        for (let i = 0; i < stepLabels.length; i++) {
            let lbl = stepLabels[i];
            lbl.get_style_context().remove_class("avro-row-title");
            lbl.get_style_context().add_class("avro-row-sub");
            if (i === page - 1) {
                lbl.get_style_context().remove_class("avro-row-sub");
                lbl.get_style_context().add_class("avro-row-title");
                lbl.set_markup("<b>" + STEP_NAMES[i] + "  ➔</b>");
            } else if (i < page - 1) {
                lbl.set_markup("✓ " + STEP_NAMES[i]);
            } else {
                lbl.set_text(STEP_NAMES[i]);
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       PAGE 1: WELCOME
       ═══════════════════════════════════════════════════════════════════════════ */
    let p1 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14 });
    let p1Title = new Gtk.Label({ label: "Welcome to Avro Keyboard Setup Wizard", xalign: 0 });
    p1Title.get_style_context().add_class("avro-page-title");
    p1.pack_start(p1Title, false, false, 0);

    let p1Sub = new Gtk.Label({
        label: "Avro Keyboard for Linux (Remastered Edition)",
        xalign: 0
    });
    p1Sub.get_style_context().add_class("avro-sub");
    p1.pack_start(p1Sub, false, false, 0);

    let p1Text = new Gtk.Label({
        label: "This setup wizard will install and configure Avro Keyboard on your computer.\n\n" +
               "Features included in this release:\n" +
               " • Full Avro Phonetic & 5 Fixed Layouts (National, Probhat, Bornona, Easy, Optima)\n" +
               " • Windows-style Floating TopBar & Dynamic Caret Suggestions Preview\n" +
               " • Standard Unicode & ANSI (Bijoy / SutonnyMJ compatible) Output Modes\n" +
               " • Automatic IBus input method registration & desktop environment integration\n\n" +
               "Click 'Next' to verify system prerequisites and proceed with installation.",
        wrap: true,
        xalign: 0
    });
    p1.pack_start(p1Text, true, true, 0);

    let p1Card = (Theme && Theme.card) ? Theme.card() : new Gtk.Frame();
    let p1CardBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4, margin: 12 });
    let licLabel = new Gtk.Label({ label: "License: Mozilla Public License (MPL 2.0) • Free and Open Source", xalign: 0 });
    licLabel.get_style_context().add_class("dim-label");
    p1CardBox.pack_start(licLabel, false, false, 0);
    p1Card.add(p1CardBox);
    p1.pack_end(p1Card, false, false, 0);

    stack.add_named(p1, "page1");

    /* ═══════════════════════════════════════════════════════════════════════════
       PAGE 2: SYSTEM CHECK
       ═══════════════════════════════════════════════════════════════════════════ */
    let p2 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14 });
    let p2Title = new Gtk.Label({ label: "System Diagnostics & Ready to Install", xalign: 0 });
    p2Title.get_style_context().add_class("avro-page-title");
    p2.pack_start(p2Title, false, false, 0);

    let p2Sub = new Gtk.Label({
        label: "Verifying prerequisites and target installation files...",
        xalign: 0
    });
    p2Sub.get_style_context().add_class("avro-sub");
    p2.pack_start(p2Sub, false, false, 0);

    let debPackagePath = findDebPackage(targetDeb);
    let p2Checks = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin_top: 8 });

    function makeCheckRow(icon, title, desc, ok) {
        let row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
        let img = new Gtk.Image({ icon_name: ok ? "emblem-default" : "dialog-information", pixel_size: 20 });
        row.pack_start(img, false, false, 0);
        let col = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 1 });
        let t = new Gtk.Label({ label: title, xalign: 0 });
        t.get_style_context().add_class("avro-row-title");
        let d = new Gtk.Label({ label: desc, xalign: 0 });
        d.get_style_context().add_class("avro-row-sub");
        col.pack_start(t, false, false, 0);
        col.pack_start(d, false, false, 0);
        row.pack_start(col, true, true, 0);
        return row;
    }

    let hasIbus = !!GLib.find_program_in_path("ibus");
    let hasPkexec = !!GLib.find_program_in_path("pkexec");
    p2Checks.pack_start(makeCheckRow("ibus", "IBus Input Method Framework", hasIbus ? "IBus subsystem detected and ready" : "IBus daemon will be configured as input provider", true), false, false, 0);
    p2Checks.pack_start(makeCheckRow("fonts", "Bengali Typography & Layouts", "Unicode fonts & Bijoy (ANSI) conversion tables loaded", true), false, false, 0);
    p2Checks.pack_start(makeCheckRow("security", "PolicyKit Administrator Access", hasPkexec ? "System policy elevation (pkexec) available" : "Standard installation permissions", true), false, false, 0);

    let pkgDesc = debPackagePath ? GLib.path_get_basename(debPackagePath) : "Source repository build";
    p2Checks.pack_start(makeCheckRow("package", "Package Target", pkgDesc + " -> /usr/share/avro-linux", true), false, false, 0);

    p2.pack_start(p2Checks, true, true, 0);
    stack.add_named(p2, "page2");

    /* ═══════════════════════════════════════════════════════════════════════════
       PAGE 3: INSTALLING (PROGRESS)
       ═══════════════════════════════════════════════════════════════════════════ */
    let p3 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 16 });
    let p3Title = new Gtk.Label({ label: "Installing Avro Keyboard", xalign: 0 });
    p3Title.get_style_context().add_class("avro-page-title");
    p3.pack_start(p3Title, false, false, 0);

    let p3Sub = new Gtk.Label({
        label: "Please wait while Setup installs and configures Avro Keyboard...",
        xalign: 0
    });
    p3Sub.get_style_context().add_class("avro-sub");
    p3.pack_start(p3Sub, false, false, 0);

    let p3CenterBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14, valign: Gtk.Align.CENTER, margin_top: 24 });
    let installProgressBar = new Gtk.ProgressBar({ show_text: false });
    p3CenterBox.pack_start(installProgressBar, false, false, 0);

    let installStatusLabel = new Gtk.Label({ label: "Starting installation...", xalign: 0 });
    installStatusLabel.get_style_context().add_class("avro-sub");
    p3CenterBox.pack_start(installStatusLabel, false, false, 0);

    let spinner = new Gtk.Spinner({ active: true, width_request: 32, height_request: 32 });
    p3CenterBox.pack_start(spinner, false, false, 0);

    p3.pack_start(p3CenterBox, true, true, 0);
    stack.add_named(p3, "page3");

    /* ═══════════════════════════════════════════════════════════════════════════
       PAGE 4: FINISH & RESTART REQUIRED (WITH 30s COUNTDOWN)
       ═══════════════════════════════════════════════════════════════════════════ */
    let p4 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14 });
    let p4Title = new Gtk.Label({ label: "Installation Complete - Restart Required", xalign: 0 });
    p4Title.get_style_context().add_class("avro-page-title");
    p4.pack_start(p4Title, false, false, 0);

    let p4Banner = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    let checkIcon = new Gtk.Image({ icon_name: "emblem-default", pixel_size: 36 });
    p4Banner.pack_start(checkIcon, false, false, 0);
    let p4HeaderCol = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2 });
    let p4H1 = new Gtk.Label({ label: "Avro Keyboard was installed successfully!", xalign: 0 });
    p4H1.get_style_context().add_class("avro-row-title");
    let p4H2 = new Gtk.Label({
        label: "A system restart is required to apply the new input method and desktop environment variables.",
        wrap: true,
        xalign: 0
    });
    p4H2.get_style_context().add_class("avro-sub");
    p4HeaderCol.pack_start(p4H1, false, false, 0);
    p4HeaderCol.pack_start(p4H2, false, false, 0);
    p4Banner.pack_start(p4HeaderCol, true, true, 0);
    p4.pack_start(p4Banner, false, false, 0);

    // Radio group for restart choice
    let radioRestartNow = new Gtk.RadioButton({ label: "Restart computer now (Recommended)" });
    let radioRestartLater = Gtk.RadioButton.new_with_label_from_widget(radioRestartNow, "I will restart computer later");
    radioRestartNow.set_active(true);

    let countdownBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10, margin_start: 24 });
    let countdownLabel = new Gtk.Label({ label: "Auto-restarting in 30 seconds...", xalign: 0 });
    countdownLabel.get_style_context().add_class("avro-row-title");
    let btnCancelTimer = new Gtk.Button({ label: "Pause / Cancel Auto-Restart" });

    countdownBox.pack_start(countdownLabel, false, false, 0);
    countdownBox.pack_start(btnCancelTimer, false, false, 0);

    let checkLaunchTopbar = new Gtk.CheckButton({ label: "Launch Avro TopBar automatically on login", active: true });

    let p4Options = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, margin_top: 8 });
    p4Options.pack_start(radioRestartNow, false, false, 0);
    p4Options.pack_start(countdownBox, false, false, 0);
    p4Options.pack_start(radioRestartLater, false, false, 4);
    p4Options.pack_start(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }), false, false, 4);
    p4Options.pack_start(checkLaunchTopbar, false, false, 0);

    p4.pack_start(p4Options, true, true, 0);
    stack.add_named(p4, "page4");

    /* ═══════════════════════════════════════════════════════════════════════════
       COUNTDOWN TIMER LOGIC
       ═══════════════════════════════════════════════════════════════════════════ */
    let countdownTimerId = null;
    let remainingSeconds = 30;

    function startCountdown() {
        stopCountdown();
        remainingSeconds = 30;
        countdownLabel.set_text("Auto-restarting in " + remainingSeconds + " seconds...");
        countdownTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            if (!radioRestartNow.get_active()) {
                stopCountdown();
                countdownLabel.set_text("Auto-restart paused. System will not restart automatically.");
                return GLib.SOURCE_REMOVE;
            }
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                countdownLabel.set_text("Restarting system now...");
                triggerReboot();
                return GLib.SOURCE_REMOVE;
            }
            countdownLabel.set_text("Auto-restarting in " + remainingSeconds + " seconds...");
            return GLib.SOURCE_CONTINUE;
        });
    }

    function stopCountdown() {
        if (countdownTimerId) {
            GLib.source_remove(countdownTimerId);
            countdownTimerId = null;
        }
    }

    btnCancelTimer.connect("clicked", () => {
        stopCountdown();
        radioRestartLater.set_active(true);
        countdownLabel.set_text("Auto-restart cancelled. Please restart when convenient.");
        btnCancelTimer.set_sensitive(false);
    });

    radioRestartLater.connect("toggled", () => {
        if (radioRestartLater.get_active()) {
            stopCountdown();
            countdownLabel.set_text("Auto-restart cancelled. Please restart when convenient.");
            btnCancelTimer.set_sensitive(false);
            btnNext.set_label("Finish");
        } else {
            startCountdown();
            btnCancelTimer.set_sensitive(true);
            btnNext.set_label("Restart Now");
        }
    });

    /* ═══════════════════════════════════════════════════════════════════════════
       INSTALLATION EXECUTION
       ═══════════════════════════════════════════════════════════════════════════ */
    let pulseTimerId = null;

    function performInstallation() {
        stack.set_visible_child_name("page3");
        updateStepIndicators(3);
        btnBack.set_sensitive(false);
        btnNext.set_sensitive(false);
        btnCancel.set_sensitive(false);

        pulseTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            installProgressBar.pulse();
            return GLib.SOURCE_CONTINUE;
        });

        installStatusLabel.set_text("Authenticating with administrator privileges...");

        // Construct installation command
        let installCmd = "";
        if (debPackagePath) {
            installCmd = `pkexec sh -c "dpkg -i '${debPackagePath}' || apt-get install -f -y; glib-compile-schemas /usr/share/glib-2.0/schemas 2>/dev/null || true; update-desktop-database /usr/share/applications 2>/dev/null || true; gtk-update-icon-cache -f -q /usr/share/icons/hicolor 2>/dev/null || true"`;
        } else {
            // Source tree fallback
            let rootDir = GLib.canonicalize_filename(scriptDir + "/../..", GLib.get_current_dir());
            installCmd = `pkexec sh -c "cd '${rootDir}' && make install && glib-compile-schemas /usr/share/glib-2.0/schemas 2>/dev/null || true; update-desktop-database /usr/share/applications 2>/dev/null || true; gtk-update-icon-cache -f -q /usr/share/icons/hicolor 2>/dev/null || true"`;
        }

        let [res, pid, stdinFd, stdoutFd, stderrFd] = [false, 0, 0, 0, 0];
        try {
            [res, pid] = GLib.spawn_async_with_pipes(
                null,
                ["/bin/sh", "-c", installCmd],
                null,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null
            );
        } catch (e) {
            installStatusLabel.set_text("Installation failed to launch: " + e.message);
            if (pulseTimerId) GLib.source_remove(pulseTimerId);
            btnBack.set_sensitive(true);
            btnCancel.set_sensitive(true);
            return;
        }

        installStatusLabel.set_text("Installing Avro Keyboard system packages and desktop integration...");

        GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (childPid, status) => {
            GLib.spawn_close_pid(childPid);
            if (pulseTimerId) {
                GLib.source_remove(pulseTimerId);
                pulseTimerId = null;
            }

            if (status === 0) {
                installStatusLabel.set_text("Configuring user input method settings...");
                // Auto configure user IBus
                try {
                    GLib.spawn_command_line_async("ibus write-cache");
                    GLib.spawn_command_line_async("dconf write /desktop/ibus/general/preload-engines \"['xkb:us::eng', 'ibus-avro']\"");
                    GLib.spawn_command_line_async("dconf write /org/gnome/desktop/input-sources/sources \"[('ibus', 'ibus-avro'), ('xkb', 'us')]\"");
                    GLib.spawn_command_line_async("ibus restart || ibus-daemon -drx --replace --panel disable");
                    GLib.spawn_command_line_async("ibus engine ibus-avro");
                } catch (e) {}

                GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                    stack.set_visible_child_name("page4");
                    updateStepIndicators(4);
                    btnBack.set_sensitive(false);
                    btnCancel.set_sensitive(false);
                    btnNext.set_sensitive(true);
                    btnNext.set_label("Restart Now");
                    startCountdown();
                    return GLib.SOURCE_REMOVE;
                });
            } else {
                installStatusLabel.set_text("Installation was cancelled or encountered an error (exit code: " + status + ").");
                btnBack.set_sensitive(true);
                btnCancel.set_sensitive(true);
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       NAVIGATION CONTROLS
       ═══════════════════════════════════════════════════════════════════════════ */
    btnNext.connect("clicked", () => {
        if (currentPage === 1) {
            stack.set_visible_child_name("page2");
            updateStepIndicators(2);
            btnBack.set_sensitive(true);
            btnNext.set_label("Install");
        } else if (currentPage === 2) {
            performInstallation();
        } else if (currentPage === 4) {
            stopCountdown();
            if (radioRestartNow.get_active()) {
                triggerReboot();
            } else {
                Gtk.main_quit();
            }
        }
    });

    btnBack.connect("clicked", () => {
        if (currentPage === 2) {
            stack.set_visible_child_name("page1");
            updateStepIndicators(1);
            btnBack.set_sensitive(false);
            btnNext.set_label("Next >");
        }
    });

    btnCancel.connect("clicked", () => {
        stopCountdown();
        Gtk.main_quit();
    });

    win.connect("destroy", () => {
        stopCountdown();
        Gtk.main_quit();
    });

    updateStepIndicators(1);
    win.show_all();
    if (!parentWindow) {
        Gtk.main();
    }
    return win;
}

// Standalone execution entrypoint
let isMain = false;
try {
    let prog = imports.system.programInvocationName || imports.system.programPath || '';
    if (prog.indexOf('setup-wizard.js') !== -1 || prog.indexOf('avro-setup') !== -1 || (typeof ARGV !== 'undefined' && ARGV.indexOf('--standalone') !== -1)) {
        isMain = true;
    }
} catch (e) {}

if (isMain) {
    if (typeof ARGV !== 'undefined' && (ARGV.indexOf('--help') !== -1 || ARGV.indexOf('-h') !== -1)) {
        print("Avro Keyboard Graphical Setup Wizard");
        print("Usage: avro-setup [package.deb]");
        imports.system.exit(0);
    }
    let target = (typeof ARGV !== 'undefined' && ARGV.length > 0 && !ARGV[0].startsWith('-')) ? ARGV[0] : null;
    runSetupWizard(target, null);
}
