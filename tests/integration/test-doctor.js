#!/usr/bin/env gjs
/*
    =============================================================================
    Test Suite: Avro Doctor Unit & Integration Tests
    Part of Avro Linux Test Suite
    =============================================================================
*/

const GLib = imports.gi.GLib;
imports.searchPath.unshift('./src/standalone');

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

function bytes(b) {
    return b ? new TextDecoder().decode(b) : "";
}

/* Run argv with environment changes ({ NAME: value | null }). */
function run(argv, changes) {
    let env = GLib.get_environ();
    for (let name in changes || {}) {
        env = changes[name] === null ? GLib.environ_unsetenv(env, name) : GLib.environ_setenv(env, name, changes[name], true);
    }
    let [, out, err, status] = GLib.spawn_sync(null, argv, env, GLib.SpawnFlags.SEARCH_PATH, null);
    // A wait status with a signal number means the program crashed
    return { out: bytes(out), err: bytes(err), crashed: (status & 0x7f) !== 0 };
}

function checkReport(r, what) {
    assert(!r.crashed, what + " exits normally (no crash)");
    let ok = r.out.indexOf("AVRO LINUX SYSTEM DIAGNOSTIC REPORT") !== -1;
    assert(ok, what + ": report contains header");
    if (!ok && r.err) printerr("    stderr: " + r.err.trim().split("\n").slice(-3).join(" | "));
    assert(r.out.indexOf("MD Shifat Bin Siddique Urfi") !== -1, what + ": report credits MD Shifat Bin Siddique Urfi");
    assert(r.out.indexOf("MD Mehedi Hasan") !== -1, what + ": report credits MD Mehedi Hasan");
    assert(r.out.indexOf("IBus Subsystem") !== -1, what + ": report checks IBus Subsystem");
    assert(r.out.indexOf("Environment Variables") !== -1, what + ": report checks Environment Variables");
    assert(r.out.indexOf("Configuration & Fonts") !== -1, what + ": report checks Configuration & Fonts");
}

print("Running Avro Doctor Integration Tests...");

// 1. The report, with the schema of the source tree
let withSchema = run(["gjs", "src/standalone/doctor.js", "--cli"], { GSETTINGS_SCHEMA_DIR: "data/gsettings" });
checkReport(withSchema, "doctor.js --cli");
assert(withSchema.out.indexOf("GSettings Schema:    VALID [OK]") !== -1, "An installed schema is reported as valid");
assert(withSchema.out.indexOf("\u00e0\u00a6") === -1, "Bengali font names are read as UTF-8 (no mojibake)");
assert(withSchema.out.indexOf("In Keyboard List:") !== -1, "The report says whether Avro is in the keyboard list");
assert(withSchema.out.indexOf("SWITCH NEEDED") === -1 && withSchema.out.indexOf("instead of 'ibus-avro'") === -1,
       "Typing English is not reported as a problem");

// 2. A missing schema is reported, not a crash (Gio.Settings.new() aborts)
let noSchema = run(["gjs", "src/standalone/doctor.js", "--cli"],
                   { GSETTINGS_SCHEMA_DIR: null, XDG_DATA_DIRS: "/nonexistent" });
checkReport(noSchema, "doctor.js --cli without the schema");
assert(noSchema.out.indexOf("GSettings Schema:    MISSING [FAIL]") !== -1, "A missing schema is reported as missing");
assert(noSchema.out.indexOf("is not installed") !== -1, "The report says the schema is not installed");

// 3. Launchers (they run the Doctor of the source tree they belong to)
checkReport(run(["bin/avro-doctor", "--cli"], { GSETTINGS_SCHEMA_DIR: "data/gsettings" }), "bin/avro-doctor --cli");
checkReport(run(["bin/avro-linux-doctor", "--cli"], { GSETTINGS_SCHEMA_DIR: "data/gsettings" }), "bin/avro-linux-doctor --cli");

print("\nDoctor Integration Test Summary:");
print("  Total Passed: " + passedCount);
print("  Total Failed: " + failedCount);

if (failedCount > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
