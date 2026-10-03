#!/usr/bin/env gjs
/*
    Fixed Keyboard Layouts Test Suite for Avro Linux
    SPDX-License-Identifier: MPL-2.0

    The layouts and typing rules of Avro Keyboard 5 for Windows: key data,
    key mapping, Modern Style Typing (Old Style Reph, Automatic Vowel
    Forming, Chandrabindu fix) and Old Style Typing.
*/

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();
imports.searchPath.unshift(rootDir + "/src/avro-core/fixed");

const FL = imports.fixedlayout;
const FT = imports.fixedtyper;

let passed = 0;
let failed = 0;

function hex(s) {
    return Array.from(s).map(c => "U+" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");
}

function assertEqual(actual, expected, description) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + description);
        print("  Expected: " + expected + "  (" + hex(String(expected)) + ")");
        print("  Actual:   " + actual + "  (" + hex(String(actual)) + ")");
    }
}

function assertTrue(condition, description) {
    if (condition) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + description);
    }
}

/* Type `input` as on a US keyboard with layout `id`, like the engine does:
   Space commits the word, {BS} is Backspace, {AG:x} is AltGr+x and {ESC}
   a key outside the layout. Returns committed text + "|" + preedit. */
function typeText(id, options, input, typer) {
    let layout = FL.getLayout(id);
    typer = typer || new FT.FixedTyper(options);
    let out = "";
    let tokens = input.match(/\{[^}]+\}|./g) || [];
    for (let t of tokens) {
        if (t === " ") {
            out += typer.text + " ";
            typer.boundary();
        } else if (t === "{BS}") {
            if (!typer.backspace()) out = out.slice(0, -1);
        } else if (t === "{ESC}") {
            out += typer.text;
            typer.interrupt();
        } else {
            let altGr = false;
            if (t.indexOf("{AG:") === 0) {
                altGr = true;
                t = t.slice(4, -1);
            }
            let ev = FL.keyForEvent(t.charCodeAt(0), 0);
            let ch = FL.charForKey(layout, ev, { altGr: altGr }, true);
            if (ch) {
                typer.type(ch);
            } else {
                out += typer.text;
                typer.interrupt();
            }
        }
    }
    return out + "|" + typer.text;
}

print("=== Running Fixed Keyboard Layout Tests ===");

// 1. Layout data from the Avro Keyboard layout files
assertEqual(FL.layoutIds().join(","), "avro-easy,bornona,munir-optima,national,probhat",
            "The five layouts of Avro Keyboard, in its (alphabetical) order");
assertEqual(FL.getLayout("national").name, "National (Jatiya)", "National (Jatiya) name");
assertEqual(FL.getLayout("national").developer, "Bangladesh Computer Council (BCC)", "National (Jatiya) credits");
assertEqual(FL.getLayout("munir-optima").name, "Munir Optima (uni)", "Munir Optima name");
assertEqual(FL.getLayout("nonexistent"), null, "Unknown layouts are null");
assertEqual(FL.getLayout("national").keys["A"].join(""), "ৃৗঋৠ", "National A: ৃ / ৗ / ঋ / ৠ");
assertEqual(FL.getLayout("national").keys["J"][0], "ক", "National J is ক");
assertEqual(FL.getLayout("probhat").keys["K"][0], "ক", "Probhat K is ক");
assertEqual(FL.getLayout("avro-easy").keys["Z"][1], "র্", "Avro Easy Shift+Z is reph");
assertEqual(FL.getLayout("bornona").keys["F"][1], "র্", "Bornona Shift+F is reph");
for (let id of FL.layoutIds()) {
    let keys = FL.getLayout(id).keys;
    let count = 0;
    for (let k in keys) count += keys[k].filter(v => v).length;
    assertTrue(count >= 90, id + " has its key data (" + count + " characters)");
    assertEqual(FL.getLayout(id).numpad["1"], "১", id + " number pad types Bangla digits");
}

// 2. Keys of key events
let ev = FL.keyForEvent(0x6a, 36);
assertTrue(ev && ev.key === "J" && ev.physical, "evdev key code 36 is the J key");
ev = FL.keyForEvent(0x4a, 0);
assertTrue(ev && ev.key === "J" && ev.shifted, "Keysym J (without key code) is Shift+J");
ev = FL.keyForEvent(0x21, 0);
assertTrue(ev && ev.key === "1" && ev.shifted, "Keysym ! is Shift+1");
ev = FL.keyForEvent(0xffb1, 79);
assertTrue(ev && ev.key === "Num1" && ev.numpad, "KP_1 is the number pad 1");
assertEqual(FL.keyForEvent(0xff50, 102), null, "Home is not a layout key");

let nat = FL.getLayout("national");
let phys = (key) => ({ key: key, physical: true });
assertEqual(FL.charForKey(nat, phys("J"), {}, true), "ক", "J types ক");
assertEqual(FL.charForKey(nat, phys("J"), { shift: true }, true), "খ", "Shift+J types খ");
assertEqual(FL.charForKey(nat, phys("J"), { capsLock: true }, true), "খ", "Caps Lock shifts letter keys");
assertEqual(FL.charForKey(nat, phys("J"), { capsLock: true, shift: true }, true), "ক", "Caps Lock + Shift is unshifted");
assertEqual(FL.charForKey(nat, phys("1"), { capsLock: true }, true), "১", "Caps Lock does not shift the number keys");
assertEqual(FL.charForKey(nat, phys("H"), { altGr: true }, true), "আ", "AltGr+H types আ");
assertEqual(FL.charForKey(nat, phys("A"), { altGr: true, shift: true }, true), "ৠ", "Shift+AltGr+A types ৠ");
assertEqual(FL.charForKey(nat, phys("J"), { altGr: true }, true), "", "Keys without an AltGr character type nothing");
assertEqual(FL.charForKey(nat, { key: "Num5", numpad: true }, {}, true), "৫", "Number pad 5 types ৫");
assertEqual(FL.charForKey(nat, { key: "Num5", numpad: true }, {}, false), "", "Bangla number pad can be turned off");
assertEqual(FL.charForKey(nat, { key: "Num5", numpad: true }, { shift: true }, true), "", "No modifiers on the number pad");

// 3. Modern Style Typing (Avro Keyboard defaults) — National (Jatiya)
const M = {};
assertEqual(typeText("national", M, "jh"), "|কা", "ক + া");
assertEqual(typeText("national", M, "jh "), "কা |", "Space commits the word");
assertEqual(typeText("national", M, "jgN"), "|ক্ষ", "ক + ্ + ষ = ক্ষ");
assertEqual(typeText("national", M, "jgh"), "|কআ", "Hasanta + kar types the full vowel");
assertEqual(typeText("national", M, "jgg"), "|ক্‌", "Hasanta twice keeps a visible hasanta (ZWNJ)");
assertEqual(typeText("national", M, "h"), "|া", "A kar at an unknown position stays a kar");
assertEqual(typeText("national", M, " h"), " |আ", "Automatic Vowel Forming: a kar after Space is the vowel");
assertEqual(typeText("national", M, " hd"), " |আই", "Vowel after vowel");
assertEqual(typeText("national", M, "ah"), "|ৃআ", "A kar after a kar is a vowel");
assertEqual(typeText("national", { vowelForming: false }, " h"), " |া", "Automatic Vowel Forming off");
assertEqual(typeText("national", M, "jzh"), "|কাঁ", "Chandrabindu fix: ক + ঁ + া = কাঁ");
assertEqual(typeText("national", { fixChandra: false }, "jzh"), "|কঁা", "Chandrabindu fix off");
assertEqual(typeText("national", M, "jh{BS}"), "|ক", "Backspace removes the last character");
assertEqual(typeText("national", M, "j{BS}{BS}"), "|", "Backspace in an empty word goes to the application");
assertEqual(typeText("national", M, "jh{ESC}d"), "কা|ি", "A key outside the layout ends the word");
assertEqual(typeText("national", M, "{AG:h}"), "|আ", "AltGr characters");
assertEqual(typeText("national", M, "jzx"), "|কোঁ", "The o-kar counts as a kar for the chandrabindu fix");

// Avro Easy has a reph key (Shift+Z), য-ফলা (Shift+X) and র-ফলা (X)
assertEqual(typeText("avro-easy", M, "kZ"), "|র্ক", "Old Style Reph: reph after the consonant moves before it");
assertEqual(typeText("avro-easy", M, "kgZ"), "|র্কা", "Reph moves over a kar too");
assertEqual(typeText("avro-easy", M, "khkZ"), "|র্ক্ক", "Reph moves before the whole conjunct");
assertEqual(typeText("avro-easy", M, "k@gZ"), "|র্কাঁ", "Reph moves over chandrabindu");
assertEqual(typeText("avro-easy", M, " Z"), " |র্", "Reph with nothing to move over");
assertEqual(typeText("avro-easy", { oldReph: false }, "kZ"), "|কর্", "Old Style Reph off");
assertEqual(typeText("avro-easy", M, "rX"), "|র‍্য", "র + য-ফলা is joined with ZWJ");
assertEqual(typeText("avro-easy", M, "kX"), "|ক্য", "য-ফলা");

// 4. Old Style Typing (type writer / Bijoy style)
const O = { style: "old" };
assertEqual(typeText("avro-easy", O, "sk"), "|কে", "e-kar typed before the consonant");
assertEqual(typeText("avro-easy", O, "fk"), "|কি", "i-kar typed before the consonant");
assertEqual(typeText("avro-easy", O, "Sk"), "|কৈ", "oi-kar typed before the consonant");
assertEqual(typeText("avro-easy", O, "s"), "|", "A kar waits for its consonant");
assertEqual(typeText("avro-easy", O, "ss"), "|ে", "The kar typed twice is the kar itself");
assertEqual(typeText("avro-easy", O, "skg"), "|কো", "e-kar + a-kar = o-kar");
assertEqual(typeText("avro-easy", O, "sg"), "|ো", "e-kar then a-kar without a consonant");
assertEqual(typeText("avro-easy", O, "fkhm"), "|ক্মি", "The kar goes after the whole conjunct");
assertEqual(typeText("avro-easy", O, "kZ"), "|র্ক", "Reph is typed after the consonant");
assertEqual(typeText("avro-easy", O, "fkZ"), "|র্কি", "Reph after consonant and kar");
assertEqual(typeText("avro-easy", O, "kfZ"), "|র্কি", "Reph while a kar waits");
assertEqual(typeText("avro-easy", O, "Gg"), "|আ", "অ + া = আ");
assertEqual(typeText("avro-easy", O, "fkX"), "|ক্যি", "য-ফলা typed after the kar goes before it");
assertEqual(typeText("avro-easy", O, "fkx"), "|ক্রি", "র-ফলা typed after the kar goes before it");
assertEqual(typeText("avro-easy", O, "kh"), "|ক্", "Hasanta");
assertEqual(typeText("avro-easy", O, "khg"), "|কআ", "Hasanta + a-kar types the full vowel");
assertEqual(typeText("avro-easy", O, "s{BS}k"), "|ক", "Backspace takes back a waiting kar");
assertEqual(typeText("avro-easy", O, "s k"), " |ক", "Space drops a waiting kar");
assertEqual(typeText("national", O, "cj"), "|কে", "National in Old Style Typing");

// 5. Typer state
let typer = new FT.FixedTyper({});
typer.type("ক");
assertTrue(!typer.isEmpty(), "A word is being typed");
typer.interrupt();
assertTrue(typer.isEmpty() && !typer.deadKey, "interrupt() forgets the word and the word start");
typer.boundary();
assertTrue(typer.isEmpty() && typer.deadKey, "boundary() starts a new word");
typer.setOptions({ style: "old" });
assertTrue(typer.oldStyle, "Options can change");

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
