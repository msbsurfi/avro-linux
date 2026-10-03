/*
    =============================================================================
    Avro Linux — Unicode to Bijoy (ANSI) and Bijoy to Unicode Converter Engine
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Core
    =============================================================================
*/

// Mapping tables for Unicode <-> Bijoy (SutonnyMJ / ANSI)
const DIGIT_MAP = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

const REV_DIGIT_MAP = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const CONJUNCTS = [
    ['ক্ষ্ম', '¶¥'],
    ['ক্ষ্ণ', '¶&Y'],
    ['ক্ষ', '¶'],
    ['জ্ঞ', 'Á'],
    ['ঞ্চ', 'Â'],
    ['ঞ্ছ', 'Ã'],
    ['ঞ্জ', 'Ä'],
    ['ট্ট', 'Æ'],
    ['ড্ড', 'Ç'],
    ['ণ্ট', 'È'],
    ['ণ্ঠ', 'É'],
    ['ণ্ড', 'Ê'],
    ['ত্ত', 'Ë'],
    ['ত্থ', 'Ì'],
    ['ত্ম', 'Í'],
    ['ত্র', 'Î'],
    ['দ্দ', 'Ï'],
    ['দ্ধ', '×'],
    ['দ্ব', 'Ø'],
    ['দ্ম', 'Ù'],
    ['ন্থ', 'Ú'],
    ['ন্দ', 'Û'],
    ['ন্ধ', 'Ü'],
    ['ন্স', 'Ý'],
    ['প্ট', 'Þ'],
    ['প্ত', 'ß'],
    ['প্প', 'à'],
    ['প্স', 'á'],
    ['ব্জ', 'â'],
    ['బ్ద', 'ã'],
    ['ব্ধ', 'ä'],
    ['ভ্র', 'å'],
    ['ম্ন', 'æ'],
    ['ম্ফ', 'ç'],
    ['ল্ক', 'é'],
    ['ল্গ', 'ê'],
    ['ল্ট', 'ë'],
    ['ল্ড', 'ì'],
    ['ল্প', 'í'],
    ['ল্ফ', 'î'],
    ['শ্চ', 'ð'],
    ['শ্ছ', 'ñ'],
    ['ষ্ণ', 'ò'],
    ['ষ্ট', 'ó'],
    ['ষ্ঠ', 'ô'],
    ['ষ্ফ', 'õ'],
    ['স্খ', 'ö'],
    ['স্ট', '÷'],
    ['স্ন', 'ø'],
    ['স্ফ', 'ù'],
    ['হ্ন', 'ý'],
    ['হ্ম', 'þ'],
    ['ক্ক', '°'],
    ['ক্ট', '±'],
    ['ক্ত', '³'],
    ['ক্ম', '´'],
    ['ক্র', 'µ'],
    ['ক্স', '·'],
    ['গ্গ', '¹'],
    ['গ্দ', 'º'],
    ['গ্ধ', '»'],
    ['ঙ্ক', '¼'],
    ['ঙ্গ', '½'],
    ['জ্জ', '¾'],
    ['হু', 'û'],
    ['হৃ', 'ü'],
    ['গু', '¸'],
    ['শু', 'ï']
];

const CHAR_MAP = [
    // Vowels
    ['অ', 'A'],
    ['আ', 'Av'],
    ['ই', 'B'],
    ['ঈ', 'C'],
    ['উ', 'D'],
    ['ঊ', 'E'],
    ['ঋ', 'F'],
    ['এ', 'G'],
    ['ঐ', 'H'],
    ['ও', 'I'],
    ['ঔ', 'J'],

    // Consonants
    ['ক', 'K'], ['খ', 'L'], ['গ', 'M'], ['ঘ', 'N'], ['ঙ', 'O'],
    ['চ', 'P'], ['ছ', 'Q'], ['জ', 'R'], ['ঝ', 'S'], ['ঞ', 'T'],
    ['ট', 'U'], ['ঠ', 'V'], ['ড', 'W'], ['ঢ', 'X'], ['ণ', 'Y'],
    ['ত', 'Z'], ['থ', '_'], ['দ', '`'], ['ধ', 'a'], ['ন', 'b'],
    ['প', 'c'], ['ফ', 'd'], ['ব', 'e'], ['ভ', 'f'], ['ম', 'g'],
    ['য', 'h'], ['র', 'i'], ['ল', 'j'], ['শ', 'k'], ['ষ', 'l'],
    ['স', 'm'], ['হ', 'n'], ['ড়', 'o'], ['ঢ়', 'p'], ['য়', 'q'],
    ['ৎ', 'r'], ['ং', 's'], ['ঃ', 't'], ['ঁ', 'u'],

    // Modifiers & Punctuation
    ['্', '&'],
    ['।', '|'],
    ['৳', '$']
];

function unicodeToBijoy(text) {
    if (!text) return "";
    let str = text;

    // Digits
    for (let d in DIGIT_MAP) {
        str = str.split(d).join(DIGIT_MAP[d]);
    }

    // Two-part vowel signs (O-kar and OU-kar)
    // ো = ে + া
    str = str.replace(/([ক-হড়-য়])ো/g, '†$1v');
    // ৌ = ে + ৗ
    str = str.replace(/([ক-হড়-য়])ৌ/g, '†$1Š');

    // Pre-base vowel signs (I-kar, E-kar, OI-kar)
    // In Unicode, vowel signs follow consonant; in Bijoy, they precede consonant
    str = str.replace(/([ক-হড়-য়](?:্[ক-হড়-য়])*)ি/g, 'w$1');
    str = str.replace(/([ক-হড়-য়](?:্[ক-হড়-য়])*)ে/g, '†$1');
    str = str.replace(/([ক-হড়-য়](?:্[ক-হড়-য়])*)ৈ/g, '‰$1');

    // Reph (র্) comes at start in Unicode, but after character in Bijoy
    str = str.replace(/র্([ক-হড়-য়])/g, '$1©');

    // Conjuncts
    for (let i = 0; i < CONJUNCTS.length; i++) {
        let [uni, bij] = CONJUNCTS[i];
        str = str.split(uni).join(bij);
    }

    // Post-base vowel signs
    str = str.replace(/া/g, 'v');
    str = str.replace(/ী/g, 'x');
    str = str.replace(/ু/g, 'y');
    str = str.replace(/ূ/g, '~');
    str = str.replace(/ৃ/g, '„');
    str = str.replace(/্য/g, '¨');
    str = str.replace(/্র/g, '«');

    // Single characters
    for (let i = 0; i < CHAR_MAP.length; i++) {
        let [uni, bij] = CHAR_MAP[i];
        str = str.split(uni).join(bij);
    }

    return str;
}

function bijoyToUnicode(text) {
    if (!text) return "";
    let str = text;

    // Digits
    for (let d in REV_DIGIT_MAP) {
        str = str.split(d).join(REV_DIGIT_MAP[d]);
    }

    // Reph (©) follows base character in Bijoy; move to front as র্
    str = str.replace(/([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])©/g, 'র্$1');

    // Pre-base vowel signs (w = ি, † = ে, ‰ = ৈ)
    // O-kar: † + base + v -> base + ো
    str = str.replace(/†([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])v/g, '$1ো');
    // OU-kar: † + base + Š -> base + ৌ
    str = str.replace(/†([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])Š/g, '$1ৌ');
    // E-kar: † + base -> base + ে
    str = str.replace(/†([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])/g, '$1ে');
    // I-kar: w + base -> base + ি
    str = str.replace(/w([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])/g, '$1ি');
    // OI-kar: ‰ + base -> base + ৈ
    str = str.replace(/‰([A-Za-z¶Á-þµ°±³´·¹º»¼½¾_`])/g, '$1ৈ');

    // Conjuncts
    for (let i = 0; i < CONJUNCTS.length; i++) {
        let [uni, bij] = CONJUNCTS[i];
        str = str.split(bij).join(uni);
    }

    // Multi-char vowel forms (must precede v -> া)
    str = str.replace(/Av/g, 'আ');

    // Post-base vowel signs
    str = str.replace(/v/g, 'া');
    str = str.replace(/x/g, 'ী');
    str = str.replace(/y/g, 'ু');
    str = str.replace(/~/g, 'ূ');
    str = str.replace(/„/g, 'ৃ');
    str = str.replace(/¨/g, '্য');
    str = str.replace(/«/g, '্র');

    // Single characters
    for (let i = 0; i < CHAR_MAP.length; i++) {
        let [uni, bij] = CHAR_MAP[i];
        str = str.split(bij).join(uni);
    }

    return str;
}
