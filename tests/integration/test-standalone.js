#!/usr/bin/env gjs
/*
    =============================================================================
    Test Suite: Avro Linux Standalone Suite & Windows-Style Interface Tests
    Part of Avro Linux Test Suite
    =============================================================================
*/

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

imports.searchPath.unshift('./src/standalone');
imports.searchPath.unshift('./src/avro-core/phonetic');
imports.searchPath.unshift('./src/avro-core/dictionary');
imports.searchPath.unshift('./src/avro-core/autocorrect');
imports.searchPath.unshift('./src/avro-core/suggestions');
imports.searchPath.unshift('./src/avro-core/fixed');
imports.searchPath.unshift('./src/preferences');

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
    if (!condition) {
        printerr("  FAIL: " + message);
        failedCount++;
    } else {
        print("  PASS: " + message);
        passedCount++;
    }
}

print("Running Avro Standalone Suite Tests...");

// 1. Test module imports
try {
    const bc = imports.bijoyconverter;
    assert(bc && typeof bc.unicodeToBijoy === 'function', "bijoyconverter exports unicodeToBijoy");
    assert(bc && typeof bc.bijoyToUnicode === 'function', "bijoyconverter exports bijoyToUnicode");
} catch (e) {
    assert(false, "Failed to load bijoyconverter module: " + e.message);
}

try {
    const lv = imports.layoutviewer;
    assert(lv && typeof lv.runLayoutViewerDialog === 'function', "layoutviewer exports runLayoutViewerDialog");
    // The Layout Viewer draws every fixed layout, in the Normal and the AltGr view
    const Cairo = imports.cairo;
    const FL = imports.fixedlayout;
    for (let id of FL.layoutIds()) {
        let surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, 900, 320);
        let cr = new Cairo.Context(surface);
        lv.drawKeyboard(cr, 900, 320, FL.getLayout(id), false);
        lv.drawKeyboard(cr, 900, 320, FL.getLayout(id), true);
        cr.$dispose();
        surface.flush();
        assert(true, "Layout Viewer draws " + FL.getLayout(id).name);
    }
    assert(lv.hasAltGr(FL.getLayout("national")), "National (Jatiya) has an AltGr view");
} catch (e) {
    assert(false, "Failed to load or draw with the layoutviewer module: " + e.message);
}

try {
    const ap = imports.avropad;
    assert(ap && typeof ap.runAvroPad === 'function', "avropad exports runAvroPad");
} catch (e) {
    assert(false, "Failed to load avropad module: " + e.message);
}

try {
    const am = imports.avromouse;
    assert(am && typeof am.runAvroMouse === 'function', "avromouse exports runAvroMouse");
} catch (e) {
    assert(false, "Failed to load avromouse module: " + e.message);
}

try {
    const tb = imports.topbar;
    assert(tb && typeof tb.runAvroTopBar === 'function', "topbar exports runAvroTopBar");
} catch (e) {
    assert(false, "Failed to load topbar module: " + e.message);
}

try {
    imports.searchPath.unshift('./src/ui');
    const fp = imports["floating-preview"];
    assert(fp && typeof fp.runFloatingPreview === 'function', "floating-preview exports runFloatingPreview");
    assert(fp && typeof fp.FloatingPreviewUI === 'function', "floating-preview exports FloatingPreviewUI");
} catch (e) {
    assert(false, "Failed to load floating-preview module: " + e.message);
}

try {
    const sp = imports.splash;
    assert(sp && typeof sp.showSplashScreen === 'function', "splash exports showSplashScreen");
} catch (e) {
    assert(false, "Failed to load splash module: " + e.message);
}

// 2. Test Unicode <-> Bijoy conversions
const bc = imports.bijoyconverter;
if (bc && bc.unicodeToBijoy && bc.bijoyToUnicode) {
    // Basic sentence
    let u1 = "আমার সোনার বাংলা";
    let b1 = bc.unicodeToBijoy(u1);
    let r1 = bc.bijoyToUnicode(b1);
    assert(b1 === "Avgvi †mvbvi evsjv", "Unicode to Bijoy: 'আমার সোনার বাংলা' -> 'Avgvi †mvbvi evsjv'");
    assert(r1 === u1, "Bijoy to Unicode roundtrip: '" + r1 + "' === '" + u1 + "'");

    // Digits
    let uDigits = "০১২৩৪৫৬৭৮৯";
    let bDigits = bc.unicodeToBijoy(uDigits);
    let rDigits = bc.bijoyToUnicode(bDigits);
    assert(bDigits === "0123456789", "Digits conversion: '০১২৩৪৫৬৭৮৯' -> '0123456789'");
    assert(rDigits === uDigits, "Digits roundtrip: '" + rDigits + "' === '" + uDigits + "'");

    // Word with conjunct
    let uConj = "বাংলাদেশ";
    let bConj = bc.unicodeToBijoy(uConj);
    let rConj = bc.bijoyToUnicode(bConj);
    assert(rConj === uConj, "Conjunct roundtrip: '" + rConj + "' === '" + uConj + "'");
}

// 3. Test binary launchers in bin/
const BIN_FILES = [
    "bin/avro",
    "bin/avro-topbar",
    "bin/avro-pad",
    "bin/avro-converter",
    "bin/avro-layout",
    "bin/avro-mouse",
    "bin/avro-preferences",
    "bin/avro-doctor",
    "bin/avro-linux-doctor",
    "bin/avro-preview",
    "bin/avro-splash"
];

for (let i = 0; i < BIN_FILES.length; i++) {
    let path = BIN_FILES[i];
    let file = Gio.File.new_for_path(path);
    assert(file.query_exists(null), "Launcher exists: " + path);
    if (file.query_exists(null)) {
        let info = file.query_info("unix::mode", Gio.FileQueryInfoFlags.NONE, null);
        let mode = info.get_attribute_uint32("unix::mode");
        let isExecutable = (mode & 0o111) !== 0;
        assert(isExecutable, "Launcher is executable: " + path);
    }
}

// 4. Test desktop entry files in data/applications/
const DESKTOP_FILES = [
    "data/applications/avro-topbar.desktop",
    "data/applications/avro-pad.desktop",
    "data/applications/avro-converter.desktop",
    "data/applications/avro-layout.desktop",
    "data/applications/avro-mouse.desktop",
    "data/applications/avro-preferences.desktop",
    "data/applications/avro-doctor.desktop",
    "data/applications/avro-preview.desktop"
];

for (let i = 0; i < DESKTOP_FILES.length; i++) {
    let path = DESKTOP_FILES[i];
    let file = Gio.File.new_for_path(path);
    assert(file.query_exists(null), "Desktop file exists: " + path);
}

// 5. Test CLI --version and maintainer credit
try {
    let [res, stdout] = GLib.spawn_command_line_sync("gjs src/standalone/main.js --version");
    assert(res === true, "main.js --version executed successfully");
    let outStr = String.fromCharCode.apply(null, stdout);
    assert(outStr.indexOf("MD Shifat Bin Siddique Urfi") !== -1, "Version output credits MD Shifat Bin Siddique Urfi");
    assert(outStr.indexOf("MD Mehedi Hasan") !== -1, "Version output credits MD Mehedi Hasan");
} catch (e) {
    assert(false, "CLI version check failed: " + e.message);
}

// 6. Test the shared modern theme and the per-app icon set
try {
    let themeSrc = GLib.file_get_contents("src/common/avrotheme.js")[1];
    let themeText = String.fromCharCode.apply(null, themeSrc);
    assert(themeText.indexOf("function headerBar") !== -1, "avrotheme.js exposes headerBar()");
    assert(themeText.indexOf("function settingRow") !== -1, "avrotheme.js exposes settingRow()");
    assert(themeText.indexOf("dark:") !== -1 && themeText.indexOf("light:") !== -1, "avrotheme.js ships light and dark palettes");
} catch (e) {
    assert(false, "Theme module check failed: " + e.message);
}
for (let icon of ["avro-pad", "avro-preferences", "avro-converter", "avro-layout", "avro-mouse", "avro-doctor"]) {
    assert(GLib.file_test("data/icons/" + icon + ".svg", GLib.FileTest.EXISTS), "App icon exists: " + icon + ".svg");
}
for (let icon of ["avro-copy", "avro-typing", "avro-general", "avro-close", "avro-refresh"]) {
    assert(GLib.file_test("data/icons/symbolic/" + icon + "-symbolic.svg", GLib.FileTest.EXISTS), "UI icon exists: " + icon + "-symbolic.svg");
}

print("\nStandalone Suite Test Summary:");
print("  Total Passed: " + passedCount);
print("  Total Failed: " + failedCount);

if (failedCount > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
