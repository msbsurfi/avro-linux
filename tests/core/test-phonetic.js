#!/usr/bin/env gjs
/*
    Phonetic Regression Test Suite for Avro Linux
    SPDX-License-Identifier: MPL-2.0
*/

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();

imports.searchPath.unshift(rootDir + "/src/avro-core/phonetic");
const utfconv = imports.utf8;
const Avroparser = imports.avrolib.OmicronLab.Avro.Phonetic;

let passed = 0;
let failed = 0;

function assertEqual(input, expected, description) {
    let actual = utfconv.utf8Decode(Avroparser.parse(input));
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        print("FAIL: " + (description || input));
        print("  Input:    " + input);
        print("  Expected: " + expected);
        print("  Actual:   " + actual);
    }
}

print("=== Running Avro Phonetic Core Tests ===");

// 1. Independent Vowels
assertEqual("o", "অ", "Independent vowel o");
assertEqual("a", "আ", "Independent vowel a");
assertEqual("i", "ই", "Independent vowel i");
assertEqual("I", "ঈ", "Independent vowel I");
assertEqual("u", "উ", "Independent vowel u");
assertEqual("U", "ঊ", "Independent vowel U");
assertEqual("e", "এ", "Independent vowel e");
assertEqual("OI", "ঐ", "Independent vowel OI");
assertEqual("O", "ও", "Independent vowel O");
assertEqual("OU", "ঔ", "Independent vowel OU");

// 2. Consonants
assertEqual("k", "ক", "Consonant k");
assertEqual("kh", "খ", "Consonant kh");
assertEqual("g", "গ", "Consonant g");
assertEqual("gh", "ঘ", "Consonant gh");
assertEqual("Ng", "ঙ", "Consonant Ng");
assertEqual("c", "চ", "Consonant c");
assertEqual("ch", "ছ", "Consonant ch");
assertEqual("j", "জ", "Consonant j");
assertEqual("jh", "ঝ", "Consonant jh");
assertEqual("NG", "ঞ", "Consonant NG");
assertEqual("T", "ট", "Consonant T");
assertEqual("Th", "ঠ", "Consonant Th");
assertEqual("D", "ড", "Consonant D");
assertEqual("Dh", "ঢ", "Consonant Dh");
assertEqual("N", "ণ", "Consonant N");
assertEqual("t", "ত", "Consonant t");
assertEqual("th", "থ", "Consonant th");
assertEqual("d", "দ", "Consonant d");
assertEqual("dh", "ধ", "Consonant dh");
assertEqual("n", "ন", "Consonant n");
assertEqual("p", "প", "Consonant p");
assertEqual("f", "ফ", "Consonant f");
assertEqual("ph", "ফ", "Consonant ph");
assertEqual("b", "ব", "Consonant b");
assertEqual("bh", "ভ", "Consonant bh");
assertEqual("v", "ভ", "Consonant v");
assertEqual("m", "ম", "Consonant m");
assertEqual("z", "য", "Consonant z");
assertEqual("r", "র", "Consonant r");
assertEqual("l", "ল", "Consonant l");
assertEqual("sh", "শ", "Consonant sh");
assertEqual("Sh", "ষ", "Consonant Sh");
assertEqual("s", "স", "Consonant s");
assertEqual("h", "হ", "Consonant h");
assertEqual("R", "ড়", "Consonant R");
assertEqual("Rh", "ঢ়", "Consonant Rh");
assertEqual("Y", "য়", "Consonant Y");

// 3. Vowel Signs (Kar)
assertEqual("ka", "কা", "Vowel sign aa (a)");
assertEqual("ki", "কি", "Vowel sign i");
assertEqual("kI", "কী", "Vowel sign I");
assertEqual("ku", "কু", "Vowel sign u");
assertEqual("kU", "কূ", "Vowel sign U");
assertEqual("ke", "কে", "Vowel sign e");
assertEqual("kOI", "কৈ", "Vowel sign OI");
assertEqual("kO", "কো", "Vowel sign O");
assertEqual("kOU", "কৌ", "Vowel sign OU");
assertEqual("krri", "কৃ", "Vowel sign rri");

// 4. Conjuncts (যুক্তবর্ণ)
assertEqual("kk", "ক্ক", "Conjunct kk");
assertEqual("kkh", "ক্ষ", "Conjunct kkh (ক্ষ)");
assertEqual("kt", "ক্ত", "Conjunct kt");
assertEqual("ks", "ক্স", "Conjunct ks");
assertEqual("kSh", "ক্ষ", "Conjunct kSh");
assertEqual("cch", "চ্ছ", "Conjunct cch");
assertEqual("jj", "জ্জ", "Conjunct jj");
assertEqual("tt", "ত্ত", "Conjunct tt");
assertEqual("tth", "ত্থ", "Conjunct tth");
assertEqual("nt", "ন্ত", "Conjunct nt");
assertEqual("nd", "ন্দ", "Conjunct nd");
assertEqual("ndh", "ন্ধ", "Conjunct ndh");
assertEqual("mp", "ম্প", "Conjunct mp");
assertEqual("mb", "ম্ব", "Conjunct mb");
assertEqual("mbh", "ম্ভ", "Conjunct mbh");
assertEqual("st", "স্ত", "Conjunct st");
assertEqual("sk", "স্ক", "Conjunct sk");
assertEqual("sp", "স্প", "Conjunct sp");
assertEqual("Ngk", "ঙ্ক", "Conjunct Ngk");
assertEqual("Ngg", "ঙ্গ", "Conjunct Ngg");

// 5. Bengali Digits
assertEqual("0123456789", "০১২৩৪৫৬৭৮৯", "Bengali numbers 0-9");

// 6. Common Bengali Sentences and Words
assertEqual("ami banglay gan gai", "আমি বাংলায় গান গাই", "Sentence: ami banglay gan gai");
assertEqual("Dhaka", "ঢাকা", "Word: Dhaka");
assertEqual("bangladesh", "বাংলাদেশ", "Word: bangladesh");
assertEqual("bhaSha", "ভাষা", "Word: bhaSha");
assertEqual("matrribhaSha", "মাতৃভাষা", "Word: matrribhaSha");

// 7. Punctuation
assertEqual(".", "।", "Dari punctuation");
assertEqual("..", "।।", "Double Dari punctuation");
assertEqual("kemon acho?", "কেমন আছ?", "Sentence with question mark (phonetic default)");
assertEqual("kemon achO?", "কেমন আছো?", "Sentence with question mark (explicit O)");

print("Results: " + passed + " passed, " + failed + " failed.");
if (failed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
