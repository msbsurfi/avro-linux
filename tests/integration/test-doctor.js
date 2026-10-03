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

print("Running Avro Doctor Integration Tests...");

// 1. Test CLI execution
try {
    let [res, stdout, stderr, exitCode] = GLib.spawn_command_line_sync("gjs src/standalone/doctor.js --cli");
    assert(res === true, "doctor.js --cli runs successfully");
    let outStr = String.fromCharCode.apply(null, stdout);
    assert(outStr.indexOf("AVRO LINUX SYSTEM DIAGNOSTIC REPORT") !== -1, "Report contains header");
    assert(outStr.indexOf("MD Shifat Bin Siddique Urfi") !== -1, "Report credits MD Shifat Bin Siddique Urfi");
    assert(outStr.indexOf("MD Mehedi Hasan") !== -1, "Report credits MD Mehedi Hasan");
    assert(outStr.indexOf("IBus Subsystem") !== -1, "Report checks IBus Subsystem");
    assert(outStr.indexOf("Environment Variables") !== -1, "Report checks Environment Variables");
    assert(outStr.indexOf("Configuration & Fonts") !== -1, "Report checks Configuration & Fonts");
} catch (e) {
    assert(false, "Doctor CLI test failed: " + e.message);
}

// 2. Test binary launchers
try {
    let [res, stdout] = GLib.spawn_command_line_sync("bin/avro-doctor --cli");
    assert(res === true, "bin/avro-doctor --cli runs successfully");
} catch (e) {
    assert(false, "bin/avro-doctor test failed: " + e.message);
}

try {
    let [res, stdout] = GLib.spawn_command_line_sync("bin/avro-linux-doctor --cli");
    assert(res === true, "bin/avro-linux-doctor --cli runs successfully");
} catch (e) {
    assert(false, "bin/avro-linux-doctor test failed: " + e.message);
}

print("\nDoctor Integration Test Summary:");
print("  Total Passed: " + passedCount);
print("  Total Failed: " + failedCount);

if (failedCount > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
