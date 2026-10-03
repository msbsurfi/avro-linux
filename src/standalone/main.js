#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Standalone Suite Application Dispatcher
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux
    =============================================================================
*/

const GLib = imports.gi.GLib;
const _args = typeof ARGV !== 'undefined' ? ARGV : [];
const _isTopBar = !_args.some(a => ['--pad', '--converter', '--layout', '--mouse', '-m', '--preferences'].indexOf(a) !== -1);
if (_isTopBar && GLib.getenv('DISPLAY')) {
    GLib.setenv('GDK_BACKEND', 'x11', true);
}

imports.gi.versions.Gtk = '3.0';
imports.gi.versions.Gdk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;

// Base paths (gjs does not put the script itself in ARGV)
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = imports.system.programPath || imports.system.programInvocationName || '.';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

imports.searchPath.unshift(baseDir + '/standalone');
imports.searchPath.unshift(baseDir + '/src/standalone');
imports.searchPath.unshift(baseDir + '/preferences');
imports.searchPath.unshift(baseDir + '/src/preferences');
// No paths relative to the current directory: started from a folder that
// happens to contain a source checkout, the installed launcher must still
// load its own modules.
imports.searchPath.unshift(baseDir + '/common');

function appVersion() {
    try {
        return imports.evars.get_version();
    } catch (e) {
        return "";
    }
}

const TOOL_FLAGS = ['--pad', '--converter', '--layout', '--mouse', '-m', '--preferences'];

let TopBar = null;
let AvroPad = null;
let BijoyConverter = null;
let LayoutViewer = null;
let AvroMouse = null;
let PrefApp = null;

try { TopBar = imports.topbar; } catch (e) {}
try { AvroPad = imports.avropad; } catch (e) {}
try { BijoyConverter = imports.bijoyconverter; } catch (e) {}
try { LayoutViewer = imports.layoutviewer; } catch (e) {}
try { AvroMouse = imports.avromouse; } catch (e) {}
try { PrefApp = imports.pref; } catch (e) {}

function printHelp() {
    print("Avro Linux (Remastered Edition) — Standalone Bengali Input Suite");
    print("Lead Developer & Maintainer: MD Shifat Bin Siddique Urfi");
    print("Version: " + appVersion());
    print("");
    print("Usage: avro [OPTION...]");
    print("       avro-topbar [toggle | bn | sys | minimize | restore]");
    print("");
    print("Options:");
    print("  --topbar        Launch floating Windows-style Avro TopBar (default)");
    print("  --pad           Launch Avro Pad (standalone Bengali text editor)");
    print("  --converter     Launch Unicode to Bijoy (SutonnyMJ) Converter");
    print("  --layout        Launch Visual Keyboard Layout Viewer & Rules Guide");
    print("  --mouse         Launch Avro Mouse (on-screen click-and-type keyboard)");
    print("  --preferences   Launch Avro Preferences configuration dialog");
    print("  --version, -v   Display version and maintainer information");
    print("  --help, -h      Display this help message");
    print("");
}

function main() {
    let args = typeof ARGV !== 'undefined' ? ARGV : [];

    if (args.indexOf('--version') !== -1 || args.indexOf('-v') !== -1) {
        print("Avro Linux (Remastered Edition) v" + appVersion());
        print("Lead Developer & Remaster Maintainer: MD Shifat Bin Siddique Urfi");
        print("License: MPL-2.0");
        return;
    }

    if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
        printHelp();
        return;
    }

    // The TopBar must be able to place itself and stay on top: only X11
    // (or XWayland) allows that, so it never uses a native Wayland connection.
    // Set prgname before Gtk.init so Wayland app_id and taskbar icons match correctly
    let prgName = "avro-topbar";
    if (args.indexOf('--pad') !== -1) prgName = "avro-pad";
    else if (args.indexOf('--converter') !== -1) prgName = "avro-converter";
    else if (args.indexOf('--layout') !== -1) prgName = "avro-layout";
    else if (args.indexOf('--mouse') !== -1 || args.indexOf('-m') !== -1) prgName = "avro-mouse";
    else if (args.indexOf('--preferences') !== -1) prgName = "avro-preferences";

    try {
        GLib.set_prgname(prgName);
        GLib.set_application_name("Avro Keyboard");
    } catch (e) {}

    Gtk.init(null);
    // Each tool has its own icon; the TopBar and everything else keep the Avro logo.
    let toolIcon = "avro-bangla";
    if (prgName === "avro-pad") toolIcon = "avro-pad";
    else if (prgName === "avro-converter") toolIcon = "avro-converter";
    else if (prgName === "avro-layout") toolIcon = "avro-layout";
    else if (prgName === "avro-mouse") toolIcon = "avro-mouse";
    else if (prgName === "avro-preferences") toolIcon = "avro-preferences";
    try { Gtk.Window.set_default_icon_name(toolIcon); } catch (e) {}

    if (args.indexOf('--pad') !== -1) {
        if (AvroPad && AvroPad.runAvroPad) {
            AvroPad.runAvroPad(null);
            return;
        }
    } else if (args.indexOf('--converter') !== -1) {
        if (BijoyConverter && BijoyConverter.runConverterDialog) {
            BijoyConverter.runConverterDialog(null);
            return;
        }
    } else if (args.indexOf('--layout') !== -1) {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog) {
            LayoutViewer.runLayoutViewerDialog(null);
            return;
        }
    } else if (args.indexOf('--mouse') !== -1 || args.indexOf('-m') !== -1) {
        if (AvroMouse && AvroMouse.runAvroMouse) {
            AvroMouse.runAvroMouse(null);
            return;
        }
    } else if (args.indexOf('--preferences') !== -1) {
        if (PrefApp && PrefApp.runpref) {
            PrefApp.runpref();
            return;
        }
    }

    // Default: Run TopBar (remaining arguments are TopBar commands)
    if (TopBar && TopBar.runAvroTopBar) {
        TopBar.runAvroTopBar(args.filter(a => a !== '--topbar'));
    } else if (AvroPad && AvroPad.runAvroPad) {
        AvroPad.runAvroPad(null);
    }
}

main();
