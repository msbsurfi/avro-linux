#!/usr/bin/env gjs
/*
    Preview Window Test Suite for Avro Linux
    SPDX-License-Identifier: MPL-2.0
*/

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();

imports.searchPath.unshift(rootDir + "/src/ui");

const fp = imports["floating-preview"];

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

print("=== Running Preview Window Tests ===");

const monitor = { x: 0, y: 0, width: 1920, height: 1080 };
const size = { width: 160, height: 120 };

// 1. Placement just below the caret
let p = fp.computePopupPosition({ x: 300, y: 200, w: 2, h: 20 }, size, monitor);
assertEqual(p.x, 300, "Window starts at the caret column");
assertEqual(p.y, 200 + 20 + fp.CURSOR_GAP, "Window sits just below the caret");

// 2. No room below: flip above the caret
p = fp.computePopupPosition({ x: 300, y: 1000, w: 2, h: 20 }, size, monitor);
assertEqual(p.y, 1000 - fp.CURSOR_GAP - 120, "Window flips above the caret near the bottom edge");

// 3. Right edge
p = fp.computePopupPosition({ x: 1900, y: 200, w: 2, h: 20 }, size, monitor);
assertEqual(p.x, 1920 - 160, "Window is kept inside the right edge");

// 4. Caret on a second monitor
const monitor2 = { x: 1920, y: 0, width: 1280, height: 1024 };
p = fp.computePopupPosition({ x: 1930, y: 990, w: 2, h: 20 }, size, monitor2);
assertTrue(p.x >= 1920 && p.y >= 0 && p.y + 120 <= 1024, "Window stays on the monitor holding the caret");

// 5. Window taller than the space above and below: clamp to the screen
p = fp.computePopupPosition({ x: 10, y: 50, w: 2, h: 20 }, { width: 160, height: 1070 }, monitor);
assertTrue(p.y >= 0 && p.y + 1070 <= 1080, "Oversized window is clamped to the screen");

// 6. Caret rectangles
assertTrue(!fp.isUsableCursor({ x: 0, y: 0, w: 0, h: 0 }), "Empty caret rectangle is ignored");
assertTrue(fp.isUsableCursor({ x: 0, y: 40, w: 0, h: 18 }), "Caret at the left screen edge is usable");
assertTrue(!fp.isUsableCursor(null), "Missing caret is ignored");

// 7. Pinned position is kept on screen
let c = fp.clampToMonitor({ x: -50, y: 5000 }, size, monitor);
assertEqual(c.x, 0, "Pinned position is clamped to the left edge");
assertEqual(c.y, 1080 - 120, "Pinned position is clamped to the bottom edge");

// 8. Exports used by the engine and older tools
assertTrue(typeof fp.createPreviewWindow === 'function', "createPreviewWindow is exported");
assertTrue(fp.FloatingPreviewUI === fp.PreviewWindow, "FloatingPreviewUI is kept as an alias");

// 9. Live window (needs an X11 display, e.g. Xvfb)
if (GLib.getenv("DISPLAY")) {
    let activated = -1;
    let ui = fp.createPreviewWindow({ onCandidateActivated: function(i) { activated = i; } });
    if (ui) {
        ui.update("ami", ["আমি", "অমি", "আমী"], 0, { x: 100, y: 100, w: 1, h: 18 });
        assertTrue(ui.isVisible(), "Preview window is shown while composing");
        let tall = ui._size().height;

        ui.update("am", ["আম"], 0, { x: 100, y: 100, w: 1, h: 18 });
        let short = ui._size().height;
        assertTrue(short < tall, "Window shrinks when there are fewer suggestions");

        ui._onCandidateActivated(0);
        assertEqual(activated, 0, "Clicking a suggestion reports its index");

        ui.setPinned(true, 40, 50);
        assertTrue(ui.isPinned(), "Window can be pinned");
        let [px, py] = ui._window.get_position();
        assertTrue(px === 40 && py === 50, "Pinned window moves to the saved position");

        ui.setTheme("dark");
        ui.setTheme("no-such-theme");
        assertTrue(true, "Theme switching (including unknown names) does not throw");

        ui.update("", [], 0, null);
        assertTrue(!ui.isVisible(), "Window hides when the composition is empty");
        ui.destroy();
    } else {
        print("SKIPPED: live window (GTK could not open the X11 display)");
    }
} else {
    print("SKIPPED: live window (no DISPLAY)");
}

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
