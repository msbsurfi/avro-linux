#!/usr/bin/env gjs
/*
    Engine Logic & Buffer Regression Test Suite for Avro Linux
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

function assertEqual(actual, expected, description) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + description);
        print("  Expected: " + expected);
        print("  Actual:   " + actual);
    }
}

print("=== Running Avro Engine Buffer & Logic Tests ===");

// Simulate Engine Buffer and Preedit State
class MockEngineState {
    constructor() {
        this.sb = new suggestion.SuggestionBuilder();
        this.reset();
        this.mode_bangla = true;
    }

    reset() {
        this.buffertext = "";
        this.currentSuggestions = [];
        this.currentSelection = 0;
        this.committed = "";
        this.preeditText = "";
    }

    processChar(ch) {
        if (!this.mode_bangla) {
            return false; // In English mode, don't capture
        }
        this.buffertext += ch;
        this.updateSuggestions();
        return true;
    }

    processBackspace() {
        if (!this.mode_bangla || this.buffertext.length === 0) {
            return false;
        }
        this.buffertext = this.buffertext.substr(0, this.buffertext.length - 1);
        if (this.buffertext.length === 0) {
            this.reset();
        } else {
            this.updateSuggestions();
        }
        return true;
    }

    processEscape() {
        if (this.buffertext.length > 0) {
            this.reset();
            return true;
        }
        return false;
    }

    processCommit() {
        if (this.buffertext.length > 0 && this.currentSuggestions.length > 0) {
            this.committed = this.currentSuggestions[this.currentSelection];
            this.sb.stringCommitted(this.buffertext, this.committed);
            let result = this.committed;
            this.reset();
            return result;
        }
        return "";
    }

    updateSuggestions() {
        let res = this.sb.suggest(this.buffertext);
        this.currentSuggestions = res.words || [];
        this.currentSelection = res.prevSelection || 0;
        this.preeditText = this.currentSuggestions[this.currentSelection] || "";
    }
}

let engine = new MockEngineState();

// 1. Initial State
assertEqual(engine.buffertext, "", "Initial buffer is empty");
assertEqual(engine.currentSuggestions.length, 0, "Initial suggestions empty");

// 2. Typing 'ami'
assertTrue(engine.processChar("a"), "Processed 'a'");
assertEqual(engine.buffertext, "a", "Buffer has 'a'");
assertTrue(engine.preeditText.length > 0, "Preedit text generated for 'a'");

assertTrue(engine.processChar("m"), "Processed 'm'");
assertEqual(engine.buffertext, "am", "Buffer has 'am'");

assertTrue(engine.processChar("i"), "Processed 'i'");
assertEqual(engine.buffertext, "ami", "Buffer has 'ami'");
assertEqual(engine.preeditText, "আমি", "Preedit for 'ami' is 'আমি'");

// 3. Backspace editing
assertTrue(engine.processBackspace(), "Backspace processed");
assertEqual(engine.buffertext, "am", "Buffer after backspace is 'am'");

assertTrue(engine.processChar("a"), "Typed 'a'");
assertTrue(engine.processChar("d"), "Typed 'd'");
assertTrue(engine.processChar("e"), "Typed 'e'");
assertTrue(engine.processChar("r"), "Typed 'r'");
assertEqual(engine.buffertext, "amader", "Buffer is 'amader'");
assertEqual(engine.preeditText, "আমাদের", "Preedit for 'amader' is 'আমাদের'");

// 4. Commit candidate
let committedText = engine.processCommit();
assertEqual(committedText, "আমাদের", "Committed candidate is 'আমাদের'");
assertEqual(engine.buffertext, "", "Buffer cleared after commit");
assertEqual(engine.preeditText, "", "Preedit cleared after commit");

// 5. Escape cancels preedit
engine.processChar("k");
engine.processChar("h");
assertEqual(engine.buffertext, "kh", "Buffer has 'kh'");
assertTrue(engine.processEscape(), "Escape handled");
assertEqual(engine.buffertext, "", "Buffer cleared after Escape");

// 6. English Mode Toggle
engine.mode_bangla = false;
let captured = engine.processChar("a");
assertTrue(!captured, "Keystroke not captured in English mode");
assertEqual(engine.buffertext, "", "Buffer remains empty in English mode");

engine.mode_bangla = true;
captured = engine.processChar("a");
assertTrue(captured, "Keystroke captured when toggled back to Bangla mode");
assertEqual(engine.buffertext, "a", "Buffer updated in Bangla mode");

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
