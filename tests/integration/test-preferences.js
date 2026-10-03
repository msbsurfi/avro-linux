#!/usr/bin/env gjs
/*
    =============================================================================
    Test Suite: Preferences Application and GSettings Integration
    Part of Avro Linux Test Suite
    =============================================================================
*/

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

imports.searchPath.unshift('./src/preferences');
imports.searchPath.unshift('./src/avro-core/fixed');
imports.searchPath.unshift('./src/common');

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

print("Running Avro Preferences Integration Tests...");

// 1. Test module import
let prefModule = null;
try {
    prefModule = imports.pref;
    assert(prefModule !== null && typeof prefModule.runpref === 'function', "Preferences module exports runpref()");
} catch (e) {
    assert(false, "Failed to load preferences module: " + e.message);
}

// 2. Test diagnostic report generation
if (prefModule && typeof prefModule.createDiagnosticReport === 'function') {
    let report = prefModule.createDiagnosticReport();
    assert(typeof report === 'string' && report.length > 0, "Diagnostic report is non-empty string");
    assert(report.indexOf("Application: Avro Linux") !== -1, "Diagnostic report identifies Avro Linux");
    assert(report.indexOf("GSettings Schema: com.omicronlab.avro") !== -1, "Diagnostic report references schema");
    assert(report.indexOf("GTK Version:") !== -1, "Diagnostic report includes GTK version");
} else {
    assert(false, "createDiagnosticReport is not exported or executable");
}

// 3. Test GSettings Schema and Keys
try {
    // The schema of the source tree (compiled by `make`), else the installed one
    let schemaSource = Gio.SettingsSchemaSource.get_default();
    let schemaObj = null;
    let schemaDir = Gio.File.new_for_path("./data/gsettings/gschemas.compiled");
    if (schemaDir.query_exists(null)) {
        let localSource = Gio.SettingsSchemaSource.new_from_directory("./data/gsettings", schemaSource, false);
        schemaObj = localSource.lookup("com.omicronlab.avro", false);
    }
    if (!schemaObj && schemaSource) {
        schemaObj = schemaSource.lookup("com.omicronlab.avro", true);
    }

    assert(schemaObj !== null, "GSettings schema 'com.omicronlab.avro' found and valid");

    if (schemaObj) {
        assert(schemaObj.has_key("switch-preview"), "Schema contains switch-preview");
        assert(schemaObj.has_key("switch-dict"), "Schema contains switch-dict");
        assert(schemaObj.has_key("switch-newline"), "Schema contains switch-newline");
        assert(schemaObj.has_key("lutable-size"), "Schema contains lutable-size");
        assert(schemaObj.has_key("cboxorient"), "Schema contains cboxorient");
        ["keyboard-layout", "fixed-typing-style", "fixed-old-reph", "fixed-vowel-forming",
         "fixed-fix-chandra", "fixed-numpad-bangla", "topbar-autostart-done", "output-encoding"].forEach(key => {
            assert(schemaObj.has_key(key), "Schema contains " + key);
        });
        assert(schemaObj.get_key("keyboard-layout").get_default_value().unpack() === "phonetic",
               "Avro Phonetic is the default keyboard layout");
        assert(schemaObj.get_key("fixed-typing-style").get_default_value().unpack() === "modern",
               "Modern Style Typing is the default, as in Avro Keyboard");
        assert(schemaObj.get_key("output-encoding").get_default_value().unpack() === "unicode",
               "Unicode is the default output encoding");

        let settings = new Gio.Settings({ settings_schema: schemaObj });
        assert(typeof settings.get_boolean("switch-preview") === 'boolean', "switch-preview returns boolean");
        assert(typeof settings.get_boolean("switch-dict") === 'boolean', "switch-dict returns boolean");
        assert(typeof settings.get_boolean("switch-newline") === 'boolean', "switch-newline returns boolean");
        assert(typeof settings.get_int("lutable-size") === 'number', "lutable-size returns integer");
        assert(typeof settings.get_int("cboxorient") === 'number', "cboxorient returns integer");
    }
} catch (e) {
    assert(false, "GSettings test error: " + e.message);
}

// 4. Keyboard layouts offered in Preferences
if (prefModule && typeof prefModule.keyboardLayoutChoices === 'function') {
    let choices = prefModule.keyboardLayoutChoices();
    assert(choices.length === 6 && choices[0][0] === "phonetic", "Preferences offer Avro Phonetic and five fixed layouts");
    assert(choices.map(c => c[1]).indexOf("National (Jatiya)") !== -1, "National (Jatiya) is offered");
} else {
    assert(false, "keyboardLayoutChoices is not exported");
}

// 5. Test candidate selections file resolution
if (prefModule && typeof prefModule.getCandidateSelectionsFile === 'function') {
    let file = prefModule.getCandidateSelectionsFile();
    assert(file !== null, "Candidate selections file is returned");
    assert(file.get_path().indexOf("candidate-selections.json") !== -1, "Path references candidate-selections.json");
}

print("\nPreferences Test Summary:");
print("  Total Passed: " + passedCount);
print("  Total Failed: " + failedCount);

if (failedCount > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
