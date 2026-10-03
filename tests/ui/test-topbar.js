#!/usr/bin/env gjs
/*
    Avro TopBar Test Suite for Avro Linux
    SPDX-License-Identifier: MPL-2.0
*/

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();

// Use the schema from the source tree and keep every setting in memory.
GLib.setenv("GSETTINGS_SCHEMA_DIR", rootDir + "/data/gsettings", true);
GLib.setenv("GSETTINGS_BACKEND", "memory", true);
imports.searchPath.unshift(rootDir + "/src/common");
imports.searchPath.unshift(rootDir + "/src/standalone");

const tb = imports.topbar;

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

print("=== Running Avro TopBar Tests ===");

// 1. Geometry of the Avro Keyboard 5 default skin
assertEqual(tb.BAR_WIDTH, 285, "Bar is 285 px wide");
assertEqual(tb.BAR_HEIGHT, 30, "Bar is 30 px high");
assertEqual(tb.ELEMENTS.map(e => e.id).join(","),
            "logo,mode,layout,viewer,mouse,tools,web,help,power",
            "Elements are in the Windows order");
let inside = tb.ELEMENTS.every(e => e.x >= 0 && e.y >= 0 && e.x + e.w <= tb.BAR_WIDTH && e.y + e.h <= tb.BAR_HEIGHT);
assertTrue(inside, "Every element lies inside the bar");
let mode = tb.ELEMENTS[1], strip = tb.ELEMENTS[2];
assertTrue(strip.x === mode.x && strip.y === mode.y + mode.h && strip.w === mode.w,
           "The layout strip sits directly under the mode button");

// 2. Hit testing
const centers = { logo: 18, viewer: 107, mouse: 139, tools: 171, web: 203, help: 235, power: 267 };
for (let id in centers) {
    assertEqual(tb.hitTest(centers[id], 15), id, "Click at the " + id + " icon hits " + id);
}
assertEqual(tb.hitTest(62, 10), "mode", "Upper part of the mode area is the mode button");
assertEqual(tb.hitTest(62, 26), "layout", "Lower strip of the mode area is the layout button");
assertEqual(tb.hitTest(1, 15), null, "The bar background has no action");
assertEqual(tb.hitTest(284, 15), null, "Right margin has no action");

// 3. Default position, snapping, clamping
let screen = { x: 0, y: 0, width: 1920, height: 1050 };
let p = tb.defaultPosition(screen, 285, 1);
assertTrue(p.x === 1920 - 285 - 250 && p.y === 0, "Default position: top, 250 px left of the right edge");
p = tb.defaultPosition({ x: 0, y: 28, width: 1280, height: 700 }, 428, 1.5);
assertTrue(p.x === 1280 - 428 - 375 && p.y === 28, "Default position follows DPI scale and stays below a top panel");
p = tb.defaultPosition({ x: 0, y: 0, width: 400, height: 300 }, 285, 1);
assertEqual(p.x, 0, "Default position never goes off a narrow screen");

let size = { width: 285, height: 30 };
p = tb.snapToEdges({ x: 20, y: 30 }, size, screen, tb.SNAP_BUFFER);
assertTrue(p.x === 0 && p.y === 0, "Bar near the top-left corner snaps to it");
p = tb.snapToEdges({ x: 500, y: 300 }, size, screen, tb.SNAP_BUFFER);
assertTrue(p.x === 500 && p.y === 300, "Bar far from the edges does not snap");
p = tb.snapToEdges({ x: 1920 - 285 - 10, y: 1050 - 30 - 5 }, size, screen, tb.SNAP_BUFFER);
assertTrue(p.x === 1635 && p.y === 1020, "Bar near the bottom-right snaps to the edges");
p = tb.clampToArea({ x: -50, y: -10 }, size, screen);
assertTrue(p.x === 0 && p.y === 0, "Position is clamped to the top-left of the screen");
p = tb.clampToArea({ x: 5000, y: 5000 }, size, screen);
assertTrue(p.x === 1635 && p.y === 1020, "Position is clamped to the bottom-right of the screen");

// 4. Fading in steps of 50 alpha
assertEqual(tb.stepAlpha(255, 80, 50), 205, "Fade-out step");
assertEqual(tb.stepAlpha(100, 80, 50), 80, "Fade-out stops at the level");
assertEqual(tb.stepAlpha(80, 255, 50), 130, "Fade-in step");
assertEqual(tb.stepAlpha(80, 80, 50), 80, "No change at the target");
let a = 255, steps = 0;
while (a !== 80 && steps < 20) { a = tb.stepAlpha(a, 80, 50); steps++; }
assertEqual(steps, 4, "Full fade-out takes 4 steps (about 200 ms)");

// 5. Bangla / English mode
const fixed = ["xkb:bd::ben", "xkb:bd:probhat:ben"];
assertEqual(tb.isBanglaMode("ibus-avro", true, fixed), true, "Avro in Bangla mode is Bangla");
assertEqual(tb.isBanglaMode("ibus-avro", false, fixed), false, "Avro in English mode is English");
assertEqual(tb.isBanglaMode("avro-phonetic", true, fixed), true, "Second Avro engine name is Avro too");
assertEqual(tb.isBanglaMode("xkb:bd:probhat:ben", false, fixed), true, "A fixed Bangla layout is Bangla");
assertEqual(tb.isBanglaMode("xkb:us::eng", true, fixed), false, "An English keyboard is English");
assertEqual(tb.isBanglaMode(null, true, fixed), true, "Without IBus the Avro mode setting decides");
assertEqual(tb.pickEnglishEngine(["ibus-avro", "xkb:us::eng"], fixed), "xkb:us::eng",
            "English keyboard is the first non-Bangla IBus keyboard");
assertEqual(tb.pickEnglishEngine(["xkb:bd:probhat:ben", "xkb:gb:extd:eng", "ibus-avro"], fixed), "xkb:gb:extd:eng",
            "Bangla layouts and Avro are skipped when picking the English keyboard");
assertEqual(tb.pickEnglishEngine([], fixed), "xkb:us::eng", "US English is the fallback");

// X keyboard layout used for an IBus engine
let xkb = tb.xkbLayoutFor("xkb:bd:probhat:ben");
assertTrue(xkb && xkb.layout === "bd" && xkb.variant === "probhat", "Probhat engine uses layout bd(probhat)");
xkb = tb.xkbLayoutFor("xkb:bd::ben");
assertTrue(xkb && xkb.layout === "bd" && xkb.variant === "", "National (Jatiya) engine uses layout bd");
xkb = tb.xkbLayoutFor("ibus-avro");
assertTrue(xkb && xkb.layout === "us" && xkb.variant === "", "Avro Phonetic types on the US layout");
assertEqual(tb.xkbLayoutFor("anthy"), null, "Engines without an XKB layout are left alone");

// 6. Keyboard layout catalog
let catalog = tb.buildLayoutCatalog([
    { name: "xkb:in:ben_gitanjali:ben", language: "bn", longname: "Bangla (India, Gitanjali)" },
    { name: "xkb:bd:probhat:ben", language: "bn", longname: "Bangla (Probhat)" },
    { name: "xkb:bd::sat", language: "sat", longname: "Bangla" },
    { name: "xkb:bd::ben", language: "bn", longname: "Bangla" },
    { name: "xkb:us::eng", language: "en", longname: "English (US)" },
    { name: "ibus-avro", language: "bn", longname: "Avro Phonetic" },
    { name: "xkb:in:ben_bornona:ben", language: "bn", longname: "Bangla (India, Bornona)" }
]);
assertEqual(catalog.map(l => l.name).join(","),
            "ibus-avro,xkb:bd::ben,xkb:bd:probhat:ben,xkb:in:ben_bornona:ben,xkb:in:ben_gitanjali:ben",
            "Avro Phonetic first, then National, Probhat, Bornona, then the rest");
assertEqual(catalog[0].label, tb.AVRO_LAYOUT_LABEL, "Avro Phonetic uses the Windows caption");
assertEqual(catalog[1].label, "National (Jatiya)", "xkb:bd::ben is National (Jatiya)");
assertEqual(catalog[2].label, "Probhat", "xkb:bd:probhat:ben is Probhat");
assertEqual(catalog[3].label, "Bornona", "xkb:in:ben_bornona:ben is Bornona");
assertTrue(catalog[1].primary && catalog[2].primary && catalog[3].primary && !catalog[4].primary,
           "The three Windows Avro layouts are primary entries");
assertEqual(tb.buildLayoutCatalog([]).length, 1, "Without IBus only Avro Phonetic is offered");

// 7. Avro Keyboard command-line switches
assertEqual(tb.parseTopBarCommand(["toggle"]), "toggle", "toggle");
assertEqual(tb.parseTopBarCommand(["/bn"]), "bn", "/bn");
assertEqual(tb.parseTopBarCommand(["-sys"]), "sys", "-sys");
assertEqual(tb.parseTopBarCommand(["--minimize"]), "minimize", "--minimize");
assertEqual(tb.parseTopBarCommand(["RESTORE"]), "restore", "Commands ignore case");
assertEqual(tb.parseTopBarCommand(["--standalone"]), null, "Other arguments are not commands");
assertEqual(tb.parseTopBarCommand([]), null, "No arguments, no command");

// 8. Icons
for (let name in tb.ICONS) {
    let pixbuf = tb.iconPixbuf(name, 16);
    assertTrue(pixbuf && pixbuf.get_width() === 16, "Icon '" + name + "' renders");
}

// 9. Live bar (needs an X11 display, e.g. Xvfb)
function itemLabel(item, Gtk) {
    if (item instanceof Gtk.SeparatorMenuItem) return "—";
    let text = item.get_label ? item.get_label() : null;
    if (text) return text;
    let child = item.get_child();
    if (child && child.get_children) {
        for (let c of child.get_children()) {
            if (c instanceof Gtk.Label) return c.get_label();
        }
    }
    return "";
}

if (GLib.getenv("DISPLAY")) {
    imports.gi.versions.Gtk = "3.0";
    const Gtk = imports.gi.Gtk;
    Gtk.init(null);
    let bar = new tb.AvroTopBar(null, { ibus: false });
    assertEqual(bar.width, Math.round(285 * bar.scale), "Window width follows the DPI scale");
    assertEqual(bar.height, Math.round(30 * bar.scale), "Window height follows the DPI scale");

    let labels = (menu) => menu.get_children().map(i => itemLabel(i, Gtk));
    let main = labels(bar._mainMenu());
    ["Toggle keyboard mode", "Dock to top", "Jump to system tray", "Select keyboard layout",
     "Avro Mouse - Click 'n Type!", "On the web", "Options...", "Help files",
     "About Avro Keyboard...", "Exit"].forEach(l => assertTrue(main.indexOf(l) !== -1, "Main menu has '" + l + "'"));
    assertEqual(labels(bar._exitMenu()).join("|"), "Jump to system tray|Exit", "Power menu: tray or exit");
    let tools = labels(bar._toolsMenu());
    ["Unicode to Bijoy text converter", "Layout Viewer : Show active keyboard layout...",
     "Avro Phonetic Options", "Options..."].forEach(l => assertTrue(tools.indexOf(l) !== -1, "Tools menu has '" + l + "'"));
    let layoutMenu = bar._layoutMenu().get_children();
    assertEqual(itemLabel(layoutMenu[0], Gtk), tb.AVRO_LAYOUT_LABEL, "Layout menu starts with Avro Phonetic");
    assertTrue(layoutMenu[0].get_active(), "Avro Phonetic is the checked layout by default");
    let help = labels(bar._helpMenu());
    assertTrue(help.indexOf("About current keyboard layout...") !== -1 && help.indexOf("About current skin...") !== -1,
               "Help menu has the About current layout / skin entries");
    let tray = labels(bar._trayMenu());
    assertTrue(tray.indexOf("Restore Avro Top Bar") !== -1 && tray.indexOf("Tools") !== -1, "Tray menu has Restore and Tools");

    bar.settings.set("mode-bangla", true);
    bar._refreshMode();
    assertTrue(bar.bangla, "Bar shows বাংলা in Bangla mode");
    bar.toggleMode();
    assertEqual(bar.settings.get("mode-bangla", true), false, "Mode button switches Avro to English");
    assertTrue(!bar.bangla, "Bar shows English after the switch");
    bar.handleCommand("bn");
    assertTrue(bar.bangla && bar.settings.get("mode-bangla", false), "'bn' command switches to Bangla");
    bar.handleCommand("sys");
    assertTrue(!bar.bangla, "'sys' command switches to English");

    bar.start(null);
    assertTrue(bar.window.get_visible(), "Bar is shown at start-up");
    bar.dockToTop();
    assertEqual(bar.settings.get("topbar-x", -1) >= 0, true, "Dock to top remembers the X position");
    bar.exit();
    assertTrue(bar.closed && bar._timers.length === 0, "Exit closes the bar and stops its timers");
} else {
    print("SKIPPED: live TopBar (no DISPLAY)");
}

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
