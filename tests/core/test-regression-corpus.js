#!/usr/bin/env gjs
/*
    Deterministic Regression Corpus Test Runner for Avro Linux
    SPDX-License-Identifier: MPL-2.0
*/

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const rootDir = GLib.get_current_dir();

imports.searchPath.unshift(rootDir + "/src/avro-core/phonetic");
const utfconv = imports.utf8;
const Avroparser = imports.avrolib.OmicronLab.Avro.Phonetic;

print("=== Running Deterministic Regression Corpus ===");

let corpusFile = Gio.File.new_for_path(rootDir + "/tests/core/regression-corpus.json");
if (!corpusFile.query_exists(null)) {
    print("ERROR: regression-corpus.json not found!");
    imports.system.exit(1);
}

let [ok, contents] = corpusFile.load_contents(null);
if (!ok) {
    print("ERROR: Failed to load regression-corpus.json");
    imports.system.exit(1);
}

let decoder = new TextDecoder('utf-8');
let corpus = JSON.parse(decoder.decode(contents));

let passed = 0;
let failed = 0;
let categories = {};

for (let i = 0; i < corpus.test_cases.length; i++) {
    let tc = corpus.test_cases[i];
    let actual = utfconv.utf8Decode(Avroparser.parse(tc.input));
    let cat = tc.category || "general";
    if (!categories[cat]) {
        categories[cat] = { passed: 0, failed: 0 };
    }

    if (actual === tc.expected) {
        passed++;
        categories[cat].passed++;
    } else {
        failed++;
        categories[cat].failed++;
        print("FAIL [" + cat + "]: " + tc.input);
        print("  Expected: " + tc.expected);
        print("  Actual:   " + actual);
    }
}

print("");
print("Category Breakdown:");
for (let cat in categories) {
    print("  * " + cat + ": " + categories[cat].passed + " passed, " + categories[cat].failed + " failed");
}

print("");
print("Regression Corpus Summary: " + passed + " passed, " + failed + " failed (Total: " + corpus.test_cases.length + ")");

if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
