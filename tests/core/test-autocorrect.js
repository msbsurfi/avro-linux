#!/usr/bin/env gjs
/*
    Autocorrect Test Suite for Avro Linux
    SPDX-License-Identifier: MPL-2.0
*/

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();

imports.searchPath.unshift(rootDir + "/src/common");
imports.searchPath.unshift(rootDir + "/src/avro-core/phonetic");
imports.searchPath.unshift(rootDir + "/src/avro-core/dictionary");
imports.searchPath.unshift(rootDir + "/src/avro-core/autocorrect");
imports.searchPath.unshift(rootDir + "/src/avro-core/suggestions");

const suggestion = imports.suggestionbuilder;

let passed = 0;
let failed = 0;

function assertTrue(condition, description) {
    if (condition) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + description);
    }
}

print("=== Running Avro Autocorrect Tests ===");

let sb = new suggestion.SuggestionBuilder();

// 1. Smiley rule
let res1 = sb.suggest(":)");
assertTrue(res1.words && res1.words.length > 0, "Suggestions returned for ':)': " + JSON.stringify(res1.words));
assertTrue(res1.words[0] === ":)" || res1.words.indexOf(":)") !== -1, "Autocorrect preserves smiley face");

let res2 = sb.suggest(";)");
assertTrue(res2.words && res2.words.length > 0, "Suggestions returned for ';)': " + JSON.stringify(res2.words));

// 2. Common abbreviations / symbols
let res3 = sb.suggest("&");
assertTrue(res3.words && res3.words.length > 0, "Suggestions returned for '&': " + JSON.stringify(res3.words));

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
