#!/usr/bin/env gjs
/*
    Dictionary & Suggestions Test Suite for Avro Linux
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

print("=== Running Avro Dictionary & Suggestion Tests ===");

let sb = new suggestion.SuggestionBuilder();

// 1. Basic word suggestions from dictionary
let res1 = sb.suggest("amader");
assertTrue(res1.words && res1.words.length > 0, "Suggestions returned for 'amader'");
assertTrue(res1.words.indexOf("আমাদের") !== -1, "Dictionary contains 'আমাদের' for 'amader'");

// 2. Candidate suggestion with suffix
let res2 = sb.suggest("bangladeshke");
assertTrue(res2.words && res2.words.length > 0, "Suggestions returned for 'bangladeshke'");
assertTrue(res2.words.indexOf("বাংলাদেশকে") !== -1, "Suffix expansion contains 'বাংলাদেশকে'");

let res3 = sb.suggest("desher");
assertTrue(res3.words && res3.words.length > 0, "Suggestions returned for 'desher'");
assertTrue(res3.words.indexOf("দেশের") !== -1, "Suffix expansion contains 'দেশের'");

// 3. Shonar Bangla suggestion
let res4 = sb.suggest("shonar");
assertTrue(res4.words && res4.words.length > 0, "Suggestions returned for 'shonar'");
assertTrue(res4.words.indexOf("সোনার") !== -1, "Dictionary contains 'সোনার' for 'shonar'");

// 4. Candidate selection ranking
let res5 = sb.suggest("kichu");
assertTrue(res5.words.indexOf("কিছু") !== -1, "Dictionary contains 'কিছু' for 'kichu'");

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
