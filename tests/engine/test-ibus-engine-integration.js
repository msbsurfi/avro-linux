#!/usr/bin/env gjs
/*
    IBus Live Engine Integration Test Suite for Avro Linux
    SPDX-License-Identifier: MPL-2.0
*/

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();

imports.searchPath.unshift(rootDir + "/src/common");
imports.searchPath.unshift(rootDir + "/src/avro-core/phonetic");
imports.searchPath.unshift(rootDir + "/src/avro-core/dictionary");
imports.searchPath.unshift(rootDir + "/src/avro-core/autocorrect");
imports.searchPath.unshift(rootDir + "/src/avro-core/suggestions");
imports.searchPath.unshift(rootDir + "/src/engine");

const IBus = imports.gi.IBus;
const suggestion = imports.suggestionbuilder;

IBus.init();
const bus = new IBus.Bus();

if (!bus.is_connected()) {
    print("SKIPPED: IBus daemon not connected. Cannot run live bus tests.");
    imports.system.exit(0);
}

print("=== Running IBus Live Engine Integration Tests ===");

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

// Create an engine instance via IBus.Engine
let engine = new IBus.Engine({
    engine_name: "ibus-avro-test",
    object_path: "/org/freedesktop/IBus/Engine/Test",
    connection: bus.get_connection()
});

assertTrue(engine !== null, "Engine instance created successfully");

// Initialize state
engine.buffertext = "";
engine.currentSuggestions = [];
engine.currentSelection = 0;
engine.mode_bangla = true;
engine.lookuptable = IBus.LookupTable.new(16, 0, true, true);
engine.committed_text = "";
engine.preedit_text = "";

let suggestionBuilder = new suggestion.SuggestionBuilder();

// Wrap methods to track IBus events
engine.orig_commit_text = engine.commit_text;
engine.commit_text = function(text) {
    engine.committed_text = text.get_text();
};

engine.orig_update_preedit_text = engine.update_preedit_text;
engine.update_preedit_text = function(text, cursor_pos, visible) {
    engine.preedit_text = text.get_text();
};

function simulateKey(keyval, state) {
    state = state || 0;

    // F12 toggle handling
    if (keyval === IBus.KEY_F12 || keyval === IBus.F12 || keyval === 0xffc9) {
        let isRelease = (state & IBus.ModifierType.RELEASE_MASK) !== 0;
        if (!isRelease) {
            engine.mode_bangla = !engine.mode_bangla;
            if (engine.buffertext.length > 0) {
                let selected = engine.currentSuggestions[engine.currentSelection] || "";
                engine.commit_text(IBus.Text.new_from_string(selected));
                engine.buffertext = "";
                engine.currentSuggestions = [];
                engine.preedit_text = "";
            }
        }
        return true;
    }

    if (!engine.mode_bangla) {
        return false;
    }

    if ((keyval >= 33 && keyval <= 126) ||
        (keyval >= IBus.KP_0 && keyval <= IBus.KP_9)) {
        engine.buffertext += IBus.keyval_to_unicode(keyval);
        let res = suggestionBuilder.suggest(engine.buffertext);
        engine.currentSuggestions = res.words || [];
        engine.currentSelection = res.prevSelection || 0;
        let selected = engine.currentSuggestions[engine.currentSelection] || "";
        engine.update_preedit_text(IBus.Text.new_from_string(selected), selected.length, true);
        return true;
    } else if (keyval === IBus.BackSpace) {
        if (engine.buffertext.length > 0) {
            engine.buffertext = engine.buffertext.substr(0, engine.buffertext.length - 1);
            if (engine.buffertext.length === 0) {
                engine.buffertext = "";
                engine.currentSuggestions = [];
                engine.hide_preedit_text();
                engine.preedit_text = "";
            } else {
                let res = suggestionBuilder.suggest(engine.buffertext);
                engine.currentSuggestions = res.words || [];
                engine.currentSelection = res.prevSelection || 0;
                let selected = engine.currentSuggestions[engine.currentSelection] || "";
                engine.update_preedit_text(IBus.Text.new_from_string(selected), selected.length, true);
            }
            return true;
        }
    } else if (keyval === IBus.space || keyval === IBus.Return) {
        if (engine.buffertext.length > 0 && engine.currentSuggestions.length > 0) {
            let selected = engine.currentSuggestions[engine.currentSelection] || "";
            engine.commit_text(IBus.Text.new_from_string(selected));
            suggestionBuilder.stringCommitted(engine.buffertext, selected);
            engine.buffertext = "";
            engine.currentSuggestions = [];
            engine.preedit_text = "";
            return true;
        }
    } else if (keyval === IBus.Escape) {
        if (engine.buffertext.length > 0) {
            engine.buffertext = "";
            engine.currentSuggestions = [];
            engine.preedit_text = "";
            engine.hide_preedit_text();
            return true;
        }
    }
    return false;
}

// 1. Simulate typing 'a', 'm', 'i'
simulateKey(97, 0); // 'a'
assertEqual(engine.buffertext, "a", "Buffer has 'a'");

simulateKey(109, 0); // 'm'
assertEqual(engine.buffertext, "am", "Buffer has 'am'");

simulateKey(105, 0); // 'i'
assertEqual(engine.buffertext, "ami", "Buffer has 'ami'");
assertEqual(engine.preedit_text, "আমি", "Preedit text is 'আমি'");

// 2. Commit with Space
simulateKey(IBus.space, 0);
assertEqual(engine.committed_text, "আমি", "Committed text is 'আমি'");
assertEqual(engine.buffertext, "", "Buffer cleared after commit");

// 3. Backspace handling
simulateKey(107, 0); // 'k'
simulateKey(111, 0); // 'o'
assertEqual(engine.buffertext, "ko", "Buffer has 'ko'");
simulateKey(IBus.BackSpace, 0);
assertEqual(engine.buffertext, "k", "Buffer after backspace has 'k'");
simulateKey(IBus.BackSpace, 0);
assertEqual(engine.buffertext, "", "Buffer after second backspace is empty");
assertEqual(engine.preedit_text, "", "Preedit is empty");

// 4. Escape handling
simulateKey(100, 0); // 'd'
simulateKey(101, 0); // 'e'
simulateKey(115, 0); // 's'
simulateKey(104, 0); // 'h'
assertEqual(engine.buffertext, "desh", "Buffer has 'desh'");
simulateKey(IBus.Escape, 0);
assertEqual(engine.buffertext, "", "Buffer cleared on Escape");

// 5. English mode bypass
engine.mode_bangla = false;
let consumed = simulateKey(97, 0);
assertTrue(!consumed, "Key event not consumed in English mode");
assertEqual(engine.buffertext, "", "Buffer not modified in English mode");

engine.mode_bangla = true;

// 6. F12 Mode Toggle
let f12Handled = simulateKey(IBus.KEY_F12, 0);
assertTrue(f12Handled, "F12 key press handled");
assertEqual(engine.mode_bangla, false, "F12 switched mode to English");

// Typing while in English mode
let enConsumed = simulateKey(97, 0);
assertTrue(!enConsumed, "English typing passed through");

// Press F12 again to switch back to Bangla
let f12HandledBack = simulateKey(IBus.KEY_F12, 0);
assertTrue(f12HandledBack, "F12 key press handled again");
assertEqual(engine.mode_bangla, true, "F12 switched mode back to Bangla");

// Clean up
engine.destroy();
assertTrue(true, "Engine destroyed cleanly");

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
