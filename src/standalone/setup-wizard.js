#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Graphical Setup Wizard
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Standalone Suite
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET)

    avro-setup [FILE.deb]   installs or updates Avro from that package file
                            (or one chosen in the wizard) and sets Avro up for
                            the user who runs it. It installs only the file the
                            user picked, and only an avro-linux package.
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// Where this file lives: an installed tree or a source checkout
let scriptDir = '/usr/share/avro-linux/standalone';
try {
    let m = new Error().stack.match(/(?:^|@|\()(?:file:\/\/)?([^\s:()@]+\.js):\d+/m);
    if (m) scriptDir = GLib.path_get_dirname(GLib.canonicalize_filename(m[1], GLib.get_current_dir()));
} catch (e) {}

for (let d of ['/usr/share/avro-linux/common', scriptDir + '/../common']) {
    if (GLib.file_test(d, GLib.FileTest.IS_DIR)) imports.searchPath.unshift(d);
}

let Theme = null;
try { Theme = imports.avrotheme; } catch (e) {}
let Autostart = null;
try { Autostart = imports.autostart; } catch (e) {}

function findAsset(relPath) {
    for (let p of [scriptDir + '/../../data/' + relPath, scriptDir + '/../' + relPath, '/usr/share/avro-linux/' + relPath]) {
        if (GLib.file_test(p, GLib.FileTest.EXISTS)) return p;
    }
    return null;
}

/* The source checkout this wizard belongs to, or null when installed. */
function sourceTree() {
    let root = GLib.canonicalize_filename(scriptDir + '/../..', '/');
    return GLib.file_test(root + '/Makefile', GLib.FileTest.EXISTS) &&
           GLib.file_test(root + '/src/standalone/setup-wizard.js', GLib.FileTest.EXISTS) ? root : null;
}

/* The package file given on the command line (a path or a file:// URI). */
function packageArgument(args) {
    for (let a of args || []) {
        if (!a || a.startsWith('-')) continue;
        try {
            let path = Gio.File.new_for_commandline_arg(a).get_path();
            if (path) return path;
        } catch (e) {}
    }
    return null;
}

/* Runs argv without a shell: [succeeded, output]. */
function runSync(argv) {
    try {
        let [ok, out, err, status] = GLib.spawn_sync(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
        let text = (b) => b ? new TextDecoder('utf-8').decode(b) : '';
        return [ok && status === 0, text(out) + text(err)];
    } catch (e) {
        return [false, String(e)];
    }
}

/* What the package file is: { ok, name, version, error }. Only avro-linux
   packages are accepted: this wizard is not a general package installer. */
function inspectPackage(path) {
    if (!path) return { ok: false, error: "No package chosen." };
    if (!GLib.file_test(path, GLib.FileTest.IS_REGULAR)) return { ok: false, error: "The file does not exist: " + path };
    let [ok, out] = runSync(['dpkg-deb', '--field', path, 'Package', 'Version']);
    if (!ok) return { ok: false, error: GLib.path_get_basename(path) + " is not a Debian package (.deb) file." };
    let field = (n) => { let m = out.match(new RegExp('^' + n + ':\\s*(.+)$', 'm')); return m ? m[1].trim() : ''; };
    let name = field('Package'), version = field('Version');
    if (name !== 'avro-linux') {
        return { ok: false, error: GLib.path_get_basename(path) + " is the package \"" + (name || "?") +
                 "\", not Avro Keyboard (avro-linux). Install other packages with your software center or apt." };
    }
    return { ok: true, name: name, version: version };
}

/* Exit status of a finished command, and what it means for the user. */
function describeFailure(exitCode, output) {
    if (exitCode === 126 || exitCode === 127) return "Installation cancelled: the administrator password was not given.";
    let tail = (output || '').trim().split('\n').slice(-6).join('\n');
    return "Installation failed (exit code " + exitCode + ")." + (tail ? "\n\n" + tail : "");
}

/* Adds Avro at the end of this user's keyboard lists (the user's own first
   keyboard stays the default) and lets IBus load it. */
function setUpAvroForUser() {
    let lookup = (id) => {
        let source = Gio.SettingsSchemaSource.get_default();
        let schema = source ? source.lookup(id, true) : null;
        return schema ? new Gio.Settings({ settings_schema: schema }) : null;
    };
    let ibus = lookup('org.freedesktop.ibus.general');
    if (ibus) {
        let pe = ibus.get_strv('preload-engines');
        if (pe.indexOf('ibus-avro') === -1) {
            if (pe.length === 0) pe.push('xkb:us::eng');
            pe.push('ibus-avro');
            ibus.set_strv('preload-engines', pe);
        }
    }
    let gnome = lookup('org.gnome.desktop.input-sources');
    if (gnome) {
        let sources = gnome.get_value('sources').deep_unpack();
        if (!sources.some(s => s[1] === 'ibus-avro')) {
            if (sources.length === 0) sources.push(['xkb', 'us']);
            sources.push(['ibus', 'ibus-avro']);
            gnome.set_value('sources', new GLib.Variant('a(ss)', sources));
        }
    }
    Gio.Settings.sync();
    // IBus of this session must know the newly installed engine
    let [running] = runSync(['ibus', 'list-engine']);
    if (running) {
        runSync(['ibus', 'write-cache']);
        runSync(['ibus', 'restart']);
    } else {
        // In the background ("ibus start" would stay in the foreground as the
        // daemon); on GNOME, GNOME Shell is IBus' panel
        let gnome = (GLib.getenv('XDG_CURRENT_DESKTOP') || '').toUpperCase().indexOf('GNOME') !== -1;
        let argv = gnome ? ['ibus-daemon', '-drx', '--panel', 'disable'] : ['ibus-daemon', '-drx'];
        try { GLib.spawn_async(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null); } catch (e) {}
    }
}

/* Ends the desktop session the way this desktop does; false if unknown. */
function logOut() {
    let desktop = (GLib.getenv('XDG_CURRENT_DESKTOP') || '').toUpperCase();
    let candidates = [];
    if (desktop.indexOf('XFCE') !== -1) candidates.push(['xfce4-session-logout', '--logout']);
    if (desktop.indexOf('KDE') !== -1) {
        candidates.push(['qdbus6', 'org.kde.Shutdown', '/Shutdown', 'org.kde.Shutdown.logout']);
        candidates.push(['qdbus', 'org.kde.ksmserver', '/KSMServer', 'logout', '0', '0', '0']);
    }
    if (desktop.indexOf('MATE') !== -1) candidates.push(['mate-session-save', '--logout']);
    if (desktop.indexOf('X-CINNAMON') !== -1 || desktop.indexOf('CINNAMON') !== -1) candidates.push(['cinnamon-session-quit', '--logout']);
    if (desktop.indexOf('LXQT') !== -1) candidates.push(['lxqt-leave', '--logout']);
    candidates.push(['gnome-session-quit', '--logout']);
    for (let argv of candidates) {
        if (!GLib.find_program_in_path(argv[0])) continue;
        try {
            GLib.spawn_async(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
            return true;
        } catch (e) {}
    }
    return false;
}

function runSetupWizard(targetDeb, parentWindow) {
    if (!parentWindow) Gtk.init(null);
    if (!globalThis.__avroAppIdentity) {
        globalThis.__avroAppIdentity = true;
        try {
            GLib.set_prgname("avro-setup");
            GLib.set_application_name("Avro Keyboard Setup");
        } catch (e) {}
    }
    if (Theme) Theme.apply();

    let win = new Gtk.Window({
        title: "Avro Keyboard Setup",
        default_width: 760,
        default_height: 520,
        window_position: Gtk.WindowPosition.CENTER
    });
    win.set_icon_name("avro-bangla");
    win.set_resizable(false);
    if (parentWindow) win.set_transient_for(parentWindow);
    if (Theme) Theme.styleWindow(win);
    if (Theme && typeof Theme.headerBar === 'function') {
        win.set_titlebar(Theme.headerBar({
            icon: "avro-bangla",
            title: "Avro Keyboard Setup",
            subtitle: "Remastered Edition for Linux",
            controls: ['minimize', 'close']
        }));
    }

    let rootBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0 });
    win.add(rootBox);

    // Left side: artwork, steps, credits
    let sidebar = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, width_request: 230 });
    sidebar.get_style_context().add_class("avro-sidebar");
    let splashPath = findAsset("images/splash.jpg");
    if (splashPath) {
        try {
            sidebar.pack_start(Gtk.Image.new_from_pixbuf(GdkPixbuf.Pixbuf.new_from_file_at_scale(splashPath, 230, 150, true)), false, false, 0);
        } catch (e) {}
    } else {
        sidebar.pack_start(new Gtk.Image({ icon_name: "avro-bangla", pixel_size: 64, margin: 16 }), false, false, 0);
    }
    const STEP_NAMES = ["1. Welcome", "2. Ready to Install", "3. Installation", "4. Finish"];
    let stepLabels = STEP_NAMES.map(name => {
        let lbl = new Gtk.Label({ label: name, xalign: 0 });
        lbl.get_style_context().add_class("avro-row-sub");
        return lbl;
    });
    let stepsBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin_start: 18, margin_end: 12, margin_top: 10 });
    stepLabels.forEach(l => stepsBox.pack_start(l, false, false, 0));
    sidebar.pack_start(stepsBox, true, true, 0);
    let creditsLabel = new Gtk.Label({ label: "MD Shifat Bin Siddique Urfi\nMD Mehedi Hasan", xalign: 0, margin_start: 18, margin_bottom: 12 });
    creditsLabel.get_style_context().add_class("dim-label");
    sidebar.pack_end(creditsLabel, false, false, 0);
    rootBox.pack_start(sidebar, false, false, 0);
    rootBox.pack_start(new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL }), false, false, 0);

    // Right side: pages and the navigation bar
    let rightCol = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
    rootBox.pack_start(rightCol, true, true, 0);
    let stack = new Gtk.Stack({
        transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
        transition_duration: 180,
        margin_start: 24, margin_end: 24, margin_top: 20, margin_bottom: 16
    });
    rightCol.pack_start(stack, true, true, 0);
    let bottomBar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10, margin_start: 24, margin_end: 24, margin_bottom: 16 });
    rightCol.pack_end(bottomBar, false, false, 0);
    rightCol.pack_end(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }), false, false, 12);

    let btnBack = new Gtk.Button({ label: "< Back", sensitive: false });
    let btnNext = new Gtk.Button({ label: "Next >" });
    btnNext.get_style_context().add_class("suggested-action");
    let btnCancel = new Gtk.Button({ label: "Cancel" });
    let btnLogout = new Gtk.Button({ label: "Log Out Now", no_show_all: true });
    bottomBar.pack_end(btnNext, false, false, 0);
    bottomBar.pack_end(btnLogout, false, false, 0);
    bottomBar.pack_end(btnBack, false, false, 0);
    bottomBar.pack_start(btnCancel, false, false, 0);

    let currentPage = 1;
    function showPage(page) {
        currentPage = page;
        stack.set_visible_child_name("page" + page);
        for (let i = 0; i < stepLabels.length; i++) {
            let ctx = stepLabels[i].get_style_context();
            ctx.remove_class("avro-row-title");
            ctx.add_class("avro-row-sub");
            if (i === page - 1) {
                ctx.remove_class("avro-row-sub");
                ctx.add_class("avro-row-title");
                stepLabels[i].set_markup("<b>" + GLib.markup_escape_text(STEP_NAMES[i], -1) + "  ➔</b>");
            } else if (i < page - 1) {
                stepLabels[i].set_text("✓ " + STEP_NAMES[i]);
            } else {
                stepLabels[i].set_text(STEP_NAMES[i]);
            }
        }
    }

    function pageTitle(box, title, sub) {
        let t = new Gtk.Label({ label: title, xalign: 0 });
        t.get_style_context().add_class("avro-page-title");
        box.pack_start(t, false, false, 0);
        if (sub) {
            let s = new Gtk.Label({ label: sub, xalign: 0, wrap: true });
            s.get_style_context().add_class("avro-sub");
            box.pack_start(s, false, false, 0);
        }
    }

    /* ── Page 1: welcome ── */
    let p1 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14 });
    pageTitle(p1, "Welcome to Avro Keyboard Setup", "Avro Keyboard for Linux (Remastered Edition)");
    p1.pack_start(new Gtk.Label({
        label: "This wizard installs or updates Avro Keyboard from an avro-linux package file and sets it up for you.\n\n" +
               "Avro Keyboard includes:\n" +
               " • Avro Phonetic and the fixed layouts National, Probhat, Bornona, Avro Easy and Munir Optima\n" +
               " • The Windows-style TopBar and the Preview Window beside the cursor\n" +
               " • Unicode output, and ANSI output for Bijoy / SutonnyMJ documents\n" +
               " • Avro Pad, Avro Mouse, the Unicode ↔ Bijoy converter and Avro Doctor\n\n" +
               "Only your own settings are changed, and only with the choices on the last page.",
        wrap: true, xalign: 0
    }), true, true, 0);
    let licCard = (Theme && Theme.card) ? Theme.card() : new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    let licLabel = new Gtk.Label({ label: "License: Mozilla Public License 2.0 • Free and Open Source", xalign: 0, margin: 12 });
    licLabel.get_style_context().add_class("dim-label");
    licCard.add(licLabel);
    p1.pack_end(licCard, false, false, 0);
    stack.add_named(p1, "page1");

    /* ── Page 2: what will be installed ── */
    let p2 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14 });
    pageTitle(p2, "Ready to Install", "Setup checked your system and the package to install.");
    let p2Checks = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, margin_top: 4 });
    function checkRow(title) {
        let row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
        let img = new Gtk.Image({ icon_name: "dialog-information", pixel_size: 20 });
        let col = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 1 });
        let t = new Gtk.Label({ label: title, xalign: 0 });
        t.get_style_context().add_class("avro-row-title");
        let d = new Gtk.Label({ label: "", xalign: 0, wrap: true, max_width_chars: 60 });
        d.get_style_context().add_class("avro-row-sub");
        col.pack_start(t, false, false, 0);
        col.pack_start(d, false, false, 0);
        row.pack_start(img, false, false, 0);
        row.pack_start(col, true, true, 0);
        p2Checks.pack_start(row, false, false, 0);
        return {
            row: row,
            set: (ok, text) => {
                img.set_from_icon_name(ok === true ? "emblem-default" : ok === false ? "dialog-error" : "dialog-warning", Gtk.IconSize.LARGE_TOOLBAR);
                img.set_pixel_size(20);
                d.set_text(text);
            }
        };
    }
    let chkIbus = checkRow("IBus input method framework");
    let chkFonts = checkRow("Bengali fonts");
    let chkAdmin = checkRow("Administrator access");
    let chkPackage = checkRow("Package to install");
    let btnChoose = new Gtk.Button({ label: "Choose Package…", halign: Gtk.Align.START, margin_start: 30 });
    p2Checks.pack_start(btnChoose, false, false, 0);
    p2.pack_start(p2Checks, true, true, 0);
    stack.add_named(p2, "page2");

    let hasIbus = !!GLib.find_program_in_path("ibus-daemon");
    chkIbus.set(hasIbus ? true : null, hasIbus ? "Installed." : "Not installed yet; the package installs it.");
    let fonts = runSync(['fc-list', ':lang=bn', 'family'])[1].trim();
    chkFonts.set(fonts ? true : null, fonts ? "Found: " + fonts.split('\n').slice(0, 3).join(', ') : "None found; installing fonts-noto-core is recommended.");
    let hasPkexec = !!GLib.find_program_in_path("pkexec");
    chkAdmin.set(hasPkexec ? true : false, hasPkexec ? "Your administrator password will be asked for." : "pkexec (PolicyKit) is missing: install the package with 'sudo apt install ./FILE.deb' instead.");

    let srcTree = sourceTree();
    let packagePath = targetDeb || null;
    let packageInfo = null;
    function updatePackage() {
        if (packagePath) {
            packageInfo = inspectPackage(packagePath);
            if (packageInfo.ok) {
                chkPackage.set(true, GLib.path_get_basename(packagePath) + " — Avro Keyboard " + packageInfo.version);
            } else {
                chkPackage.set(false, packageInfo.error);
            }
        } else if (srcTree) {
            packageInfo = { ok: true, source: srcTree };
            chkPackage.set(true, "Build and install from this source folder: " + srcTree);
        } else {
            packageInfo = { ok: false };
            chkPackage.set(null, "Choose the avro-linux .deb file you downloaded.");
        }
        if (currentPage === 2) btnNext.set_sensitive(packageInfo.ok && hasPkexec);
    }
    updatePackage();

    btnChoose.connect("clicked", () => {
        let chooser = new Gtk.FileChooserNative({
            title: "Choose the Avro Keyboard package",
            action: Gtk.FileChooserAction.OPEN,
            transient_for: win,
            modal: true
        });
        let filter = new Gtk.FileFilter();
        filter.set_name("Debian packages (*.deb)");
        filter.add_pattern("*.deb");
        chooser.add_filter(filter);
        if (chooser.run() === Gtk.ResponseType.ACCEPT) {
            packagePath = chooser.get_filename();
            updatePackage();
        }
        chooser.destroy();
    });

    /* ── Page 3: installing ── */
    let p3 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 16 });
    pageTitle(p3, "Installing Avro Keyboard", "Please wait while Setup installs Avro Keyboard…");
    let p3Center = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14, valign: Gtk.Align.CENTER, margin_top: 24 });
    let installProgressBar = new Gtk.ProgressBar({ show_text: false });
    let installStatusLabel = new Gtk.Label({ label: "Starting…", xalign: 0, wrap: true, selectable: true });
    installStatusLabel.get_style_context().add_class("avro-sub");
    p3Center.pack_start(installProgressBar, false, false, 0);
    p3Center.pack_start(installStatusLabel, false, false, 0);
    p3.pack_start(p3Center, true, true, 0);
    stack.add_named(p3, "page3");

    /* ── Page 4: finish ── */
    let p4 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14 });
    pageTitle(p4, "Avro Keyboard Is Installed", null);
    let p4Banner = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    p4Banner.pack_start(new Gtk.Image({ icon_name: "emblem-default", pixel_size: 36 }), false, false, 0);
    let p4Text = new Gtk.Label({
        label: "Choose how to set it up for you. To type Bangla in every program, log out and log in again " +
               "once; there is no need to restart the computer.",
        wrap: true, xalign: 0
    });
    p4Text.get_style_context().add_class("avro-sub");
    p4Banner.pack_start(p4Text, true, true, 0);
    p4.pack_start(p4Banner, false, false, 0);
    let p4Options = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, margin_top: 8 });
    let checkKeyboardList = new Gtk.CheckButton({ label: "Add Avro to my keyboard list", active: true });
    let checkTopbar = new Gtk.CheckButton({
        label: "Start Avro TopBar when I log in",
        active: Autostart ? Autostart.isEnabled() || !Autostart.hasEntry() : true
    });
    p4Options.pack_start(checkKeyboardList, false, false, 0);
    p4Options.pack_start(checkTopbar, false, false, 0);
    p4.pack_start(p4Options, true, true, 0);
    stack.add_named(p4, "page4");

    /* ── Installation ── */
    let pulseId = 0;
    function stopPulse() {
        if (pulseId) {
            GLib.source_remove(pulseId);
            pulseId = 0;
        }
    }
    function installFailed(message) {
        stopPulse();
        installStatusLabel.set_text(message);
        btnBack.set_sensitive(true);
        btnCancel.set_sensitive(true);
    }

    function performInstallation() {
        showPage(3);
        btnBack.set_sensitive(false);
        btnNext.set_sensitive(false);
        btnCancel.set_sensitive(false);
        pulseId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            installProgressBar.pulse();
            return GLib.SOURCE_CONTINUE;
        });
        installStatusLabel.set_text("Waiting for the administrator password…");

        // No shell: the file name is passed as one argument, whatever it contains
        let argv;
        if (packageInfo.source) {
            argv = ['pkexec', 'sh', '-c',
                    'make -C "$1" install && glib-compile-schemas /usr/share/glib-2.0/schemas && ' +
                    '(update-desktop-database -q /usr/share/applications; gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor; ibus write-cache --system; true)',
                    'avro-setup', packageInfo.source];
        } else if (GLib.find_program_in_path('apt-get')) {
            // apt installs what the package needs, too
            argv = ['pkexec', 'apt-get', 'install', '-y', GLib.canonicalize_filename(packagePath, GLib.get_current_dir())];
        } else {
            argv = ['pkexec', 'dpkg', '-i', packagePath];
        }
        let proc;
        try {
            proc = new Gio.Subprocess({ argv: argv, flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE });
            proc.init(null);
        } catch (e) {
            installFailed("Setup could not start the installation: " + e.message);
            return;
        }
        installStatusLabel.set_text("Installing Avro Keyboard…");
        proc.communicate_utf8_async(null, null, (p, res) => {
            let output = '';
            try { [, output] = p.communicate_utf8_finish(res); } catch (e) {}
            let code = p.get_if_exited() ? p.get_exit_status() : -1;
            if (code !== 0) {
                installFailed(describeFailure(code, output));
                return;
            }
            stopPulse();
            installProgressBar.set_fraction(1.0);
            showPage(4);
            btnNext.set_label("Finish");
            btnNext.set_sensitive(true);
            btnLogout.show();
        });
    }

    function applyChoices() {
        if (checkKeyboardList.get_active()) {
            try { setUpAvroForUser(); } catch (e) { printerr("avro-setup: " + e); }
        }
        if (Autostart) Autostart.setEnabled(checkTopbar.get_active());
    }

    function quit() {
        stopPulse();
        if (parentWindow) win.destroy();
        else Gtk.main_quit();
    }

    /* ── Navigation ── */
    btnNext.connect("clicked", () => {
        if (currentPage === 1) {
            showPage(2);
            btnBack.set_sensitive(true);
            btnNext.set_label("Install");
            btnNext.set_sensitive(packageInfo.ok && hasPkexec);
        } else if (currentPage === 2) {
            performInstallation();
        } else if (currentPage === 4) {
            applyChoices();
            quit();
        }
    });
    btnLogout.connect("clicked", () => {
        applyChoices();
        if (!logOut()) {
            let dlg = new Gtk.MessageDialog({
                transient_for: win, modal: true,
                message_type: Gtk.MessageType.INFO, buttons: Gtk.ButtonsType.OK,
                text: "Please log out from your desktop's menu",
                secondary_text: "Setup does not know how to log out of this desktop."
            });
            dlg.run();
            dlg.destroy();
            return;
        }
        quit();
    });
    btnBack.connect("clicked", () => {
        if (currentPage === 2 || currentPage === 3) {
            showPage(currentPage === 3 ? 2 : 1);
            btnBack.set_sensitive(currentPage !== 1);
            btnNext.set_label(currentPage === 1 ? "Next >" : "Install");
            btnNext.set_sensitive(currentPage === 1 || (packageInfo.ok && hasPkexec));
        }
    });
    btnCancel.connect("clicked", quit);
    win.connect("destroy", () => {
        stopPulse();
        if (!parentWindow) Gtk.main_quit();
    });

    showPage(1);
    win.show_all();
    if (!parentWindow) Gtk.main();
    return win;
}

// Standalone execution entrypoint: avro-setup [FILE.deb]
let isMain = false;
try {
    let prog = GLib.path_get_basename(imports.system.programInvocationName || '');
    isMain = (prog === 'setup-wizard.js' || prog === 'avro-setup');
} catch (e) {}

if (isMain) {
    let args = typeof ARGV !== 'undefined' ? ARGV : [];
    if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
        print("Avro Keyboard Setup Wizard");
        print("Usage: avro-setup [avro-linux_VERSION_all.deb]");
        imports.system.exit(0);
    }
    runSetupWizard(packageArgument(args), null);
}
