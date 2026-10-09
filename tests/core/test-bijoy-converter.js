#!/usr/bin/env gjs
/*
    Unicode ↔ Bijoy (SutonnyMJ / ANSI) converter tests for Avro Linux
    SPDX-License-Identifier: MPL-2.0

    The expected Bijoy text is what Avro Keyboard for Windows gives
    (TUnicodeToBijoy2000), so "Output as ANSI" matches it.
*/

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();
imports.searchPath.unshift(rootDir + "/src/avro-core");
const conv = imports.bijoyconverter;

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, description) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        let cp = (s) => Array.from(String(s)).map(c => c.charCodeAt(0).toString(16).toUpperCase()).join(' ');
        print("FAIL: " + description);
        print("  Expected: " + expected + "  [" + cp(expected) + "]");
        print("  Actual:   " + actual + "  [" + cp(actual) + "]");
    }
}

// 1. Words as Avro Keyboard for Windows writes them in Bijoy
const WORDS = [
    ["আমার সোনার বাংলা", "Avgvi †mvbvi evsjv"],
    ["কর্ম", "Kg©"],
    ["ক্ষমা", "¶gv"],
    ["বিজ্ঞান", "weÁvb"],
    ["বৌদ্ধ", "†eŠ×"],
    ["বাংলাদেশ", "evsjv‡`k"],                // e-kar inside a word is ‡, at its start †
    ["প্রোগ্রাম", "†cÖvMÖvg"],               // o-kar around a conjunct with ra-phala
    ["শ্রোতা", "†kªvZv"],
    ["ক্ষোভ", "†¶vf"],
    ["স্কোর", "†¯‹vi"],
    ["স্কুল", "¯‹zj"],
    ["শব্দ", "kã"],
    ["স্বাধীনতা", "¯^vaxbZv"],
    ["আন্তর্জাতিক", "Avš—R©vwZK"],
    ["কিন্তু", "wKš‘"],
    ["চট্টগ্রাম", "PÆMÖvg"],
    ["বিশ্ববিদ্যালয়", "wek¦we`¨vjq"],
    ["ধার্মিক", "avwg©K"],
    ["আনন্দ", "Avb›`"],
    ["মুক্তিযুদ্ধ", "gyw³hy×"],
    ["কৃষক", "K…lK"],
    ["রবীন্দ্রনাথ", "iex›`ªbv_"],
    ["কোথায়", "†Kv_vq"],
    ["পড়া", "cov"],
    ["আষাঢ়", "Avlvp"],
    ["২০২৬।", "2026|"]
];
for (let [uni, bijoy] of WORDS) {
    assertEqual(conv.unicodeToBijoy(uni), bijoy, "Unicode -> Bijoy: " + uni);
}

// 2. No visible hasanta (&) in words whose conjuncts Bijoy has glyphs for
for (let [uni] of WORDS) {
    let b = conv.unicodeToBijoy(uni);
    if (b.indexOf('&') !== -1) assertEqual(b, "(no &)", "No visible hasanta in " + uni);
    else passed++;
}

// 3. য় ড় ঢ় typed as two characters (letter + nukta), as web text often has them
assertEqual(conv.unicodeToBijoy("য় ড় ঢ়"), "q o p", "Decomposed য় ড় ঢ়");
assertEqual(conv.unicodeToBijoy("বাংলায়"), "evsjvq", "Decomposed য় in a word");

// 4. A hasanta no Bijoy glyph takes stays visible instead of vanishing
assertEqual(conv.unicodeToBijoy("ক্"), "K&", "Word-final hasanta");
assertEqual(conv.unicodeToBijoy("ক্চ"), "K&P", "Conjunct without a Bijoy glyph");
assertEqual(conv.unicodeToBijoy("ক্‌"), "K&", "Hasanta + ZWNJ");
assertEqual(conv.unicodeToBijoy(""), "", "Empty text");

// 5. Bijoy -> Unicode gives the words back
// (NFC: য় ড় ঢ় as one character or two are the same text)
const nfc = (t) => t.normalize("NFC");
for (let [uni, bijoy] of WORDS) {
    assertEqual(nfc(conv.bijoyToUnicode(bijoy)), nfc(uni), "Bijoy -> Unicode: " + bijoy);
}
for (let w of ["সংস্কৃতি", "উল্লেখ", "সম্পাদক", "ছাত্র", "রাষ্ট্র", "বন্ধু", "সন্তান", "কম্পিউটার", "স্মৃতি", "গ্রন্থ"]) {
    assertEqual(nfc(conv.bijoyToUnicode(conv.unicodeToBijoy(w))), nfc(w), "Round trip: " + w);
}

// 6. Bijoy text as Bijoy keyboards write it
assertEqual(conv.bijoyToUnicode("wPšÍv"), "চিন্তা", "šÍ is ন্ত");
assertEqual(conv.bijoyToUnicode("¯úó"), "স্পষ্ট", "¯ú is স্প");
assertEqual(conv.bijoyToUnicode("Kgx©"), "কর্মী", "Reph after the vowel sign");
assertEqual(nfc(conv.bijoyToUnicode("Avwg evsjvq Mvb MvB|")), nfc("আমি বাংলায় গান গাই।"), "A sentence");
assertEqual(conv.bijoyToUnicode("Ò Avwg Ó"), "“ আমি ”", "Bijoy quotes");

print("Results: " + passed + " passed, " + failed + " failed.");
imports.system.exit(failed > 0 ? 1 : 0);
