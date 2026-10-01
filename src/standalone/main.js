#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Standalone Suite Application Dispatcher
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;

// Base paths
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = ARGV[0] || '.';
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
imports.searchPath.unshift('./src/standalone');
imports.searchPath.unshift('./src/preferences');

let TopBar = null;
let AvroPad = null;
let BijoyConverter = null;
let LayoutViewer = null;
let PrefApp = null;

try { TopBar = imports.topbar; } catch (e) {}
try { AvroPad = imports.avropad; } catch (e) {}
try { BijoyConverter = imports.bijoyconverter; } catch (e) {}
try { LayoutViewer = imports.layoutviewer; } catch (e) {}
try { PrefApp = imports.pref; } catch (e) {}

function printHelp() {
    print("Avro Linux (Remastered Edition) — Standalone Bengali Input Suite");
    print("Lead Developer & Maintainer: MD Shifat Bin Siddique Urfi");
    print("Version: 1.0.0");
    print("");
    print("Usage: avro [OPTION...]");
    print("");
    print("Options:");
    print("  --topbar        Launch floating Windows-style Avro TopBar (default)");
    print("  --pad           Launch Avro Pad (standalone Bengali text editor)");
    print("  --converter     Launch Unicode to Bijoy (SutonnyMJ) Converter");
    print("  --layout        Launch Visual Keyboard Layout Viewer & Rules Guide");
    print("  --preferences   Launch Avro Preferences configuration dialog");
    print("  --version, -v   Display version and maintainer information");
    print("  --help, -h      Display this help message");
    print("");
}

function main() {
    let args = typeof ARGV !== 'undefined' ? ARGV : [];

    if (args.indexOf('--version') !== -1 || args.indexOf('-v') !== -1) {
        print("Avro Linux (Remastered Edition) v1.0.0");
        print("Lead Developer & Remaster Maintainer: MD Shifat Bin Siddique Urfi");
        print("License: MPL-2.0");
        return;
    }

    if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
        printHelp();
        return;
    }

    Gtk.init(null);

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
    } else if (args.indexOf('--preferences') !== -1) {
        if (PrefApp && PrefApp.runpref) {
            PrefApp.runpref();
            return;
        }
    }

    // Default: Run TopBar
    if (TopBar && TopBar.runAvroTopBar) {
        TopBar.runAvroTopBar();
    } else if (AvroPad && AvroPad.runAvroPad) {
        AvroPad.runAvroPad(null);
    }
}

main();
