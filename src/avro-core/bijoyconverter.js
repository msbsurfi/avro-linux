/*
    =============================================================================
    Avro Linux — Unicode ↔ Bijoy (SutonnyMJ / ANSI) converter
    SPDX-License-Identifier: MPL-2.0
    Part of Avro Linux Core

    unicodeToBijoy() is a port of TUnicodeToBijoy2000 from Avro Keyboard for
    Windows ("Unicode to ascii converter/clsUnicodeToBijoy2000.pas",
    https://github.com/mugli/Avro-Keyboard, MPL 2.0), so "Output as ANSI"
    gives the same text as Avro Keyboard does on Windows. The few literal
    characters that later copies of that file lost are taken from its 2010
    version (5.1.0).

    bijoyToUnicode() reads the same glyph set back: it puts the vowel signs
    that Bijoy writes before a consonant (ি ে ৈ, and the halves of ো ৌ) and
    the reph after their consonant cluster, and joins half forms.
    =============================================================================
*/

/* ── Unicode Bengali (names as in Avro Keyboard's BanglaChars.pas) ───────── */
const b_Hasanta = '্', b_Nukta = '়', b_LengthMark = 'ৗ';
const ZWJ = '‍', ZWNJ = '‌';
const b_A = 'অ', b_AA = 'আ', b_I = 'ই', b_II = 'ঈ', b_U = 'উ',
      b_UU = 'ঊ', b_RRI = 'ঋ', b_E = 'এ', b_OI = 'ঐ', b_O = 'ও', b_OU = 'ঔ';
const b_AAkar = 'া', b_Ikar = 'ি', b_IIkar = 'ী', b_Ukar = 'ু', b_UUkar = 'ূ',
      b_RRIkar = 'ৃ', b_Ekar = 'ে', b_OIkar = 'ৈ', b_Okar = 'ো', b_OUkar = 'ৌ';
const b_K = 'ক', b_kh = 'খ', b_g = 'গ', b_gh = 'ঘ', b_NGA = 'ঙ',
      b_C = 'চ', b_ch = 'ছ', b_j = 'জ', b_jh = 'ঝ', b_nya = 'ঞ',
      b_tt = 'ট', b_tth = 'ঠ', b_dd = 'ড', b_ddh = 'ঢ', b_Nn = 'ণ',
      b_t = 'ত', b_Th = 'থ', b_d = 'দ', b_dh = 'ধ', b_n = 'ন',
      b_p = 'প', b_ph = 'ফ', b_b = 'ব', b_Bh = 'ভ', b_m = 'ম',
      b_z = 'য', b_r = 'র', b_L = 'ল', b_sh = 'শ', b_ss = 'ষ',
      b_s = 'স', b_h = 'হ', b_rr = 'ড়', b_rrh = 'ঢ়', b_y = 'য়';
const b_Khandatta = 'ৎ', b_Anushar = 'ং', b_Bisharga = 'ঃ', b_Chandra = 'ঁ';
const b_Dari = '।', b_DoubleDari = '॥', b_Taka = '৳';

const PURE_CONSONANTS = new Set([b_b, b_Bh, b_C, b_ch, b_d, b_dd, b_ddh, b_dh, b_g, b_gh, b_h,
    b_j, b_jh, b_K, b_kh, b_L, b_m, b_n, b_NGA, b_Nn, b_nya, b_p, b_ph, b_r, b_rr, b_rrh, b_s,
    b_sh, b_ss, b_t, b_Th, b_tt, b_tth, b_z, b_y, b_Khandatta, 'ৰ', 'ৱ']);
const isPureConsonant = (c) => PURE_CONSONANTS.has(c);
const isJoiner = (c) => c === b_Hasanta || c === ZWJ || c === ZWNJ;

/* ── Bijoy 2000 glyphs (Avro Keyboard's A_* constants) ───────────────────── */
const A_A = 'A', A_AA = 'Av', A_AAKar = 'v', A_I = 'B', A_IKar = 'w', A_II = 'C', A_IIKar = 'x',
      A_U = 'D', A_UKar2 = 'y', A_UKar1 = 'z', A_UKar3 = '–', A_UKar4 = '“',
      A_UU = 'E', A_UUKar2 = '~', A_UUKar1 = '‚', A_UUKar3 = 'ƒ',
      A_RRI = 'F', A_RRIKar1 = '„', A_RRIKar2 = '…',
      A_E = 'G', A_EKar1 = '†', A_EKar2 = '‡',
      A_OI = 'H', A_OIKar1 = 'ˆ', A_OIKar2 = '‰',
      A_O = 'I', A_OU = 'J', A_OUKar = 'Š';
const A_Hasanta = '&', A_StartDoubleQuote = 'Ò', A_EndDoubleQuote = 'Ó';
const A_K = 'K', A_N = 'b', A_M = 'g';
const A_Reph = '©';
// First half forms
const A_M_1H = '¤', A_Ss_1H = '®', A_S_1H_1 = '¯', A_N_1H_1 = 'š',
      A_D_1H_1 = '˜', A_C_1H = '”', A_NGA_1H = '•', A_N_1H_2 = '›', A_D_1H_2 = '™';
// Second half forms
const A_B_2H_1 = '^', A_B_2H_2 = '¡', A_BH_2H = '¢', A_BH_R_2H = '£',
      A_M_2H_1 = '¥', A_B_2H_3 = '¦', A_M_2H_2 = '§', A_ZFola = '¨',
      A_RFola_1 = 'ª', A_RFola_2 = '«', A_L_2H_1 = '¬', A_T_R_2H = '¿',
      A_RFola_3 = 'Ö', A_Nn_2H_1 = 'è', A_K_R_2H = 'Œ', A_Nn_2H_2 = 'œ',
      A_B_2H_4 = 'Ÿ', A_T_2H = '—', A_T_UKar_2H = '‘', A_Th_2H = '’',
      A_K_2H = '‹', A_L_2H_3 = '−';
const A_K_R = 'µ', A_T_R = 'Î', A_Bh_R = 'å';
const A_G_Ukar = '¸', A_Sh_UKar = 'ï', A_H_UKar = 'û', A_H_RRIKar = 'ü';

const FIRST_HALF_FORMS = new Set([A_M_1H, A_Ss_1H, A_S_1H_1, A_N_1H_1, A_D_1H_1, A_C_1H, A_NGA_1H,
    A_N_1H_2, A_D_1H_2]);

// Conjuncts that Bijoy writes as one glyph (ReplaceFullForms, in its order)
const FULL_FORMS = [
    [b_K + b_Hasanta + b_K, '°'], [b_K + b_Hasanta + b_tt, '±'],
    [b_K + b_Hasanta + b_ss + b_Hasanta + b_m, '²'], [b_K + b_Hasanta + b_t, '³'],
    [b_K + b_Hasanta + b_m, '´'], [b_K + b_Hasanta + b_ss, '¶'], [b_K + b_Hasanta + b_s, '·'],
    [b_g + b_Hasanta + b_g, '¹'], [b_g + b_Hasanta + b_d, 'º'], [b_g + b_Hasanta + b_dh, '»'],
    [b_NGA + b_Hasanta + b_K, '¼'], [b_NGA + b_Hasanta + b_g, '½'],
    [b_j + b_Hasanta + b_j, '¾'], [b_j + b_Hasanta + b_jh, 'À'], [b_j + b_Hasanta + b_nya, 'Á'],
    [b_nya + b_Hasanta + b_C, 'Â'], [b_nya + b_Hasanta + b_ch, 'Ã'],
    [b_nya + b_Hasanta + b_j, 'Ä'], [b_nya + b_Hasanta + b_jh, 'Å'],
    [b_tt + b_Hasanta + b_tt, 'Æ'], [b_dd + b_Hasanta + b_dd, 'Ç'],
    [b_Nn + b_Hasanta + b_tt, 'È'], [b_Nn + b_Hasanta + b_tth, 'É'], [b_Nn + b_Hasanta + b_dd, 'Ê'],
    [b_t + b_Hasanta + b_t, 'Ë'], [b_t + b_Hasanta + b_Th, 'Ì'], [b_t + b_Hasanta + b_m, 'Í'],
    [b_d + b_Hasanta + b_d, 'Ï'], [b_d + b_Hasanta + b_dh, '×'], [b_d + b_Hasanta + b_b, 'Ø'],
    [b_d + b_Hasanta + b_m, 'Ù'],
    [b_n + b_Hasanta + b_tth, 'Ú'], [b_n + b_Hasanta + b_dd, 'Û'], [b_n + b_Hasanta + b_dh, 'Ü'],
    [b_n + b_Hasanta + b_s, 'Ý'],
    [b_p + b_Hasanta + b_tt, 'Þ'], [b_p + b_Hasanta + b_t, 'ß'], [b_p + b_Hasanta + b_p, 'à'],
    [b_p + b_Hasanta + b_s, 'á'],
    [b_b + b_Hasanta + b_j, 'â'], [b_b + b_Hasanta + b_d, 'ã'], [b_b + b_Hasanta + b_dh, 'ä'],
    [b_m + b_Hasanta + b_n, 'æ'], [b_m + b_Hasanta + b_ph, 'ç'],
    [b_L + b_Hasanta + b_K, 'é'], [b_L + b_Hasanta + b_g, 'ê'], [b_L + b_Hasanta + b_tt, 'ë'],
    [b_L + b_Hasanta + b_dd, 'ì'], [b_L + b_Hasanta + b_p, 'í'], [b_L + b_Hasanta + b_ph, 'î'],
    [b_sh + b_Hasanta + b_C, 'ð'], [b_sh + b_Hasanta + b_ch, 'ñ'],
    [b_ss + b_Hasanta + b_Nn, 'ò'], [b_ss + b_Hasanta + b_tt, 'ó'], [b_ss + b_Hasanta + b_tth, 'ô'],
    [b_ss + b_Hasanta + b_ph, 'õ'],
    [b_s + b_Hasanta + b_kh, 'ö'], [b_s + b_Hasanta + b_tt, '÷'], [b_s + b_Hasanta + b_n, 'ø'],
    [b_s + b_Hasanta + b_ph, 'ù'],
    [b_h + b_Hasanta + b_n, 'ý'], [b_h + b_Hasanta + b_m, 'þ'],
    [b_rr + b_Hasanta + b_g, 'ÿ']
];

const CONSONANTS = [
    [b_K, 'K'], [b_kh, 'L'], [b_g, 'M'], [b_gh, 'N'], [b_NGA, 'O'], [b_C, 'P'], [b_ch, 'Q'], [b_j, 'R'],
    [b_jh, 'S'], [b_nya, 'T'], [b_tt, 'U'], [b_tth, 'V'], [b_dd, 'W'], [b_ddh, 'X'], [b_Nn, 'Y'], [b_t, 'Z'],
    [b_Th, '_'], [b_d, '`'], [b_dh, 'a'], [b_n, 'b'], [b_p, 'c'], [b_ph, 'd'], [b_b, 'e'], [b_Bh, 'f'],
    [b_m, 'g'], [b_z, 'h'], [b_r, 'i'], [b_L, 'j'], [b_sh, 'k'], [b_ss, 'l'], [b_s, 'm'], [b_h, 'n'],
    [b_y, 'q'], [b_rr, 'o'], [b_rrh, 'p']
];

/* ── String helpers with the 1-based semantics of the Delphi original ────── */
function replaceAll(s, from, to) { return s.split(from).join(to); }
// MidStr/Copy: the part of [start, start + len) that lies inside the string
function mid(s, start, len) {
    if (start < 1) { len += start - 1; start = 1; }
    if (len <= 0 || start > s.length) return '';
    return s.substr(start - 1, len);
}
function pos(sub, s) { return s.indexOf(sub) + 1; }
function stuff(s, start, len, sub) { return s.slice(0, start - 1) + sub + s.slice(start - 1 + len); }
function setChar(s, i, c) { return s.slice(0, i - 1) + c + s.slice(i); }

function baseLineRight(c) {
    return c === b_kh || c === b_g || c === b_gh || c === b_Nn || c === b_Th || c === b_d || c === b_dh ||
        c === b_n || c === b_p || c === b_b || c === b_m || c === b_z || c === b_r || c === b_L ||
        c === b_sh || c === b_ss || c === b_s || c === b_h || c === b_y;
}

/* ── Unicode → Bijoy (TUnicodeToBijoy2000.Convert) ───────────────────────── */
function deNormalize(s) {
    s = replaceAll(s, b_z + b_Nukta, b_y);
    s = replaceAll(s, b_dd + b_Nukta, b_rr);
    return replaceAll(s, b_ddh + b_Nukta, b_rrh);
}

// ি ে ৈ go before the consonant or conjunct they follow in Unicode
function reArrangeKars(s) {
    s = replaceAll(s, b_Okar, b_Ekar + b_AAkar);
    s = replaceAll(s, b_OUkar, b_Ekar + b_LengthMark);
    const movable = (c) => c === b_Ekar || c === b_Ikar || c === b_OIkar;
    let out = '';
    let kar = null;
    for (let i = s.length; i >= 1; i--) {
        let c = s[i - 1];
        if (movable(c)) {
            kar = c;
        } else if (kar === null) {
            out = c + out;
        } else if (i - 1 < 1) {
            out = kar + c + out;
            kar = null;
        } else if (!isPureConsonant(c) && !isJoiner(c)) {
            out = c + kar + out;
            kar = null;
        } else {
            if (isJoiner(c)) out = c + out;
            if (isPureConsonant(c)) {
                if (isJoiner(s[i - 2])) {
                    out = c + out;
                } else {
                    out = kar + c + out;
                    kar = null;
                }
            }
        }
    }
    if (kar !== null) out = kar + out;
    out = replaceAll(out, '“', A_StartDoubleQuote);
    return replaceAll(out, '”', A_EndDoubleQuote);
}

// The reph (র্ before a consonant) goes after the consonant or conjunct
function reArrangeReph(s) {
    if (s.length < 3) return s;
    let out = '';
    let pending = false;
    for (let i = 1; i <= s.length; i++) {
        let c = s[i - 1];
        let reph = i + 2 <= s.length && c === b_r && s[i] === b_Hasanta && s[i + 1] !== ZWJ && s[i + 1] !== ZWNJ;
        if (reph) {
            pending = true;
            i++;
            continue;
        }
        if (!pending) {
            out += c;
        } else if (!isPureConsonant(c) && !isJoiner(c)) {
            out += A_Reph + c;
            pending = false;
        } else if (i + 1 > s.length) {
            out += c + A_Reph;
            pending = false;
        } else {
            if (isJoiner(c)) out += c;
            if (isPureConsonant(c)) {
                if (isJoiner(s[i])) {
                    out += c;
                } else {
                    out += c + A_Reph;
                    pending = false;
                }
            }
        }
    }
    if (pending) out += A_Reph;
    return out;
}

const R_FOR_UKAR4 = [b_sh, b_d, b_g, b_t, b_j, b_Th, b_dh, b_p, b_b, b_Bh, b_m, b_s].map(c => c + b_Hasanta + b_r);
const R_FOR_UKAR4_5 = [b_n + b_Hasanta + b_d, b_m + b_Hasanta + b_p, b_ss + b_Hasanta + b_p, b_s + b_Hasanta + b_p].map(c => c + b_Hasanta + b_r);
const L_FOR_UKAR4 = [b_g, b_p, b_b, b_sh, b_s].map(c => c + b_Hasanta + b_L);
const L_FOR_UKAR4_5 = [b_s + b_Hasanta + b_p + b_Hasanta + b_L];

function replaceKarsVowels(s) {
    const wordStart = (i) => {
        let p = mid(s, i - 1, 1);
        return i === 1 || p === ' ' || p === '\r' || p === '\n' || p === '\t';
    };
    let i;
    while ((i = pos(b_Ekar, s)) > 0) s = setChar(s, i, wordStart(i) ? A_EKar1 : A_EKar2);
    while ((i = pos(b_OIkar, s)) > 0) s = setChar(s, i, wordStart(i) ? A_OIKar1 : A_OIKar2);

    // উ-কার: the shape depends on the letter (and the conjunct) it hangs from
    s = replaceAll(s, b_g + b_Ukar, A_G_Ukar);
    s = replaceAll(s, b_sh + b_Ukar, A_Sh_UKar);
    s = replaceAll(s, b_h + b_Ukar, A_H_UKar);
    s = replaceAll(s, b_Hasanta + b_t + b_Ukar, b_Hasanta + A_T_UKar_2H);
    const longKar = (i, kar4) => {
        let prev = s[i - 2];
        if (prev === b_r) {
            if (R_FOR_UKAR4.indexOf(mid(s, i - 3, 3)) !== -1 || R_FOR_UKAR4_5.indexOf(mid(s, i - 5, 5)) !== -1) return kar4;
            return mid(s, i - 2, 1) !== b_Hasanta ? kar4 : null;
        }
        if (prev === b_L) {
            if (L_FOR_UKAR4.indexOf(mid(s, i - 3, 3)) !== -1 || L_FOR_UKAR4_5.indexOf(mid(s, i - 5, 5)) !== -1) return kar4;
        }
        return null;
    };
    while ((i = pos(b_Ukar, s)) > 0) {
        let k;
        if (i - 1 >= 1) {
            if (baseLineRight(s[i - 2])) {
                k = longKar(i, A_UKar4) || A_UKar2;
                if (mid(s, i - 3, 3) === b_ss + b_Hasanta + b_Nn) k = A_UKar1;
            } else {
                k = (s[i - 2] === b_rr || s[i - 2] === b_rrh) ? A_UKar3 : A_UKar1;
            }
        } else {
            k = A_UKar1;
        }
        s = setChar(s, i, k);
    }
    while ((i = pos(b_UUkar, s)) > 0) {
        let k;
        if (i - 1 >= 1 && baseLineRight(s[i - 2])) k = longKar(i, A_UUKar3) || A_UUKar2;
        else k = A_UUKar1;
        s = setChar(s, i, k);
    }
    s = replaceAll(s, b_h + b_RRIkar, A_H_RRIKar);
    while ((i = pos(b_RRIkar, s)) > 0) {
        s = setChar(s, i, (i - 1 >= 1 && baseLineRight(s[i - 2])) ? A_RRIKar1 : A_RRIKar2);
    }
    s = replaceAll(s, b_AAkar, A_AAKar);
    s = replaceAll(s, b_Ikar, A_IKar);
    s = replaceAll(s, b_IIkar, A_IIKar);
    s = replaceAll(s, b_LengthMark, A_OUKar);
    for (let [u, a] of [[b_A, A_A], [b_AA, A_AA], [b_I, A_I], [b_II, A_II], [b_U, A_U], [b_UU, A_UU],
                        [b_RRI, A_RRI], [b_E, A_E], [b_OI, A_OI], [b_O, A_O], [b_OU, A_OU]]) {
        s = replaceAll(s, u, a);
    }
    return s;
}

function convertRFolaZFolaHasanta(s) {
    s = replaceAll(s, b_Hasanta + b_z, A_ZFola);
    s = replaceAll(s, b_Hasanta + ZWNJ, A_Hasanta);
    let i;
    while ((i = pos(b_Hasanta + b_r, s)) > 0) {
        let prev = mid(s, i - 1, 1);
        if (prev === b_p || prev === b_g) {
            s = stuff(s, i, 2, A_RFola_3);
        } else if (prev === b_Bh) {
            s = stuff(s, i - 1, 3, mid(s, i - 2, 1) === b_Hasanta ? A_BH_R_2H : A_Bh_R);
        } else if (prev === b_K) {
            s = stuff(s, i - 1, 3, mid(s, i - 2, 1) === b_Hasanta ? A_K_R_2H : A_K_R);
        } else if (prev === b_t) {
            if (mid(s, i - 2, 1) === b_Hasanta) {
                let before = mid(s, i - 3, 1);
                if (before === b_K || before === b_t) s = stuff(s, i, 2, A_RFola_2);
                else s = stuff(s, i - 1, 3, A_T_R_2H);
            } else {
                s = stuff(s, i - 1, 3, A_T_R);
            }
        } else {
            s = stuff(s, i, 2, prev === b_ph ? A_RFola_2 : A_RFola_1);
        }
    }
    return s;
}

function replaceFullForms(s) {
    for (let d = 0; d <= 9; d++) s = replaceAll(s, String.fromCharCode(0x09E6 + d), String(d));
    s = replaceAll(s, b_Taka, '$');
    s = replaceAll(s, b_Dari, '|');
    s = replaceAll(s, b_DoubleDari, '\\');
    s = replaceAll(s, b_Khandatta, 'r');
    s = replaceAll(s, b_Anushar, 's');
    s = replaceAll(s, b_Bisharga, 't');
    s = replaceAll(s, b_Chandra, 'u');
    for (let [u, a] of FULL_FORMS) s = replaceAll(s, u, a);
    return s;
}

function firstHalfForms(s) {
    s = replaceAll(s, b_m + b_Hasanta, A_M_1H + b_Hasanta);
    s = replaceAll(s, b_ss + b_Hasanta, A_Ss_1H + b_Hasanta);
    s = replaceAll(s, b_C + b_Hasanta, A_C_1H + b_Hasanta);
    s = replaceAll(s, b_NGA + b_Hasanta, A_NGA_1H + b_Hasanta);
    s = replaceAll(s, b_s + b_Hasanta, A_S_1H_1 + b_Hasanta);
    let i;
    while ((i = pos(b_d + b_Hasanta, s)) > 0) {
        s = setChar(s, i, mid(s, i + 2, 1) === b_g ? A_D_1H_1 : A_D_1H_2);
    }
    while ((i = pos(b_n + b_Hasanta, s)) > 0) {
        let next = mid(s, i + 2, 1);
        if (next === b_t || next === b_Th || next === b_L || next === b_b || next === A_T_R_2H || next === A_T_UKar_2H) {
            s = setChar(s, i, A_N_1H_1);
        } else if (next === b_m || next === b_n) {
            s = setChar(s, i, A_N);
        } else {
            s = setChar(s, i, A_N_1H_2);
        }
    }
    return s;
}

function secondHalfForms(s) {
    s = replaceAll(s, b_Hasanta + b_Bh, A_BH_2H);
    s = replaceAll(s, b_Hasanta + b_t, A_T_2H);
    s = replaceAll(s, b_Hasanta + b_Th, A_Th_2H);
    s = replaceAll(s, b_Hasanta + b_K, A_K_2H);
    let i;
    while ((i = pos(b_Hasanta + b_b, s)) > 0) {
        let w = mid(s, i - 1, 1);
        let form;
        if (w === b_s || w === b_ss || w === b_m || w === b_n || w === b_d || w === A_M_1H || w === A_Ss_1H ||
            w === A_S_1H_1 || w === A_N_1H_1 || w === A_D_1H_2) form = A_B_2H_1;
        else if (w === b_dh || w === b_b || w === b_h) form = A_B_2H_4;
        else if (w === b_sh || w === b_g || w === b_p) form = A_B_2H_3;
        else form = A_B_2H_2;
        s = stuff(s, i, 2, form);
    }
    while ((i = pos(b_Hasanta + b_m, s)) > 0) {
        let w = mid(s, i - 1, 1);
        let form;
        if (w === A_M_1H || w === A_Ss_1H || w === A_C_1H || w === A_S_1H_1 || w === A_D_1H_2 ||
            w === A_N_1H_1 || w === A_N_1H_2) form = A_M_2H_2;
        else if (w === A_NGA_1H) form = A_M;
        else form = A_M_2H_1;
        s = stuff(s, i, 2, form);
    }
    while ((i = pos(b_Hasanta + b_L, s)) > 0) {
        s = stuff(s, i, 2, baseLineRight(mid(s, i - 1, 1)) ? A_L_2H_3 : A_L_2H_1);
    }
    s = replaceAll(s, b_Hasanta + b_Nn, A_Nn_2H_1);
    return replaceAll(s, b_Hasanta + b_n, A_Nn_2H_2);
}

function consonants(s) {
    for (let [u, a] of CONSONANTS) s = replaceAll(s, u, a);
    return s;
}

function finalTouch(s) {
    // A hasanta that no Bijoy glyph took: after a half form the glyph already
    // shows it; after a full letter Bijoy writes the visible hasanta "&"
    // (Avro Keyboard drops it, which turns the conjunct into two letters).
    let out = '';
    for (let i = 0; i < s.length; i++) {
        let c = s[i];
        if (c === b_Hasanta) {
            if (!FIRST_HALF_FORMS.has(s[i - 1])) out += A_Hasanta;
        } else if (c !== ZWJ && c !== ZWNJ) {
            out += c;
        }
    }
    out = replaceAll(out, 'n' + A_Nn_2H_1, 'n' + A_Nn_2H_2);
    out = replaceAll(out, 'K' + A_Nn_2H_2, 'K' + A_Nn_2H_1);
    out = replaceAll(out, '¶y', '¶z');
    out = replaceAll(out, 'Rz', 'Ry');
    out = replaceAll(out, 'R' + A_UUKar1, 'R~');
    return replaceAll(out, 'R' + A_RRIKar2, 'R' + A_RRIKar1);
}

function unicodeToBijoy(text) {
    if (!text) return '';
    let s = deNormalize(String(text));
    s = reArrangeKars(s);
    s = reArrangeReph(s);
    s = replaceKarsVowels(s);
    s = convertRFolaZFolaHasanta(s);
    s = replaceFullForms(s);
    s = firstHalfForms(s);
    s = secondHalfForms(s);
    s = consonants(s);
    return finalTouch(s);
}

/* ── Bijoy → Unicode ─────────────────────────────────────────────────────── */
// Glyph classes: C a consonant or conjunct, H1 a first half form (joins the
// next consonant), H2 a second half form or fola (joins the previous one),
// PRE a vowel sign written before its consonant, POST one written after it,
// V an independent vowel.
const GLYPHS = {};
function glyph(chars, type, uni, punct) {
    for (let ch of chars) GLYPHS[ch] = { type: type, uni: uni, punct: punct === undefined ? null : punct };
}
for (let [u, a] of CONSONANTS) glyph(a, 'C', u);
glyph('r', 'C', b_Khandatta);
for (let [u, a] of FULL_FORMS) glyph(a, 'C', u);
glyph(A_K_R, 'C', b_K + b_Hasanta + b_r);
glyph(A_T_R, 'C', b_t + b_Hasanta + b_r);
glyph(A_Bh_R, 'C', b_Bh + b_Hasanta + b_r);
glyph(A_G_Ukar, 'C', b_g + b_Ukar);
glyph(A_Sh_UKar, 'C', b_sh + b_Ukar);
glyph(A_H_UKar, 'C', b_h + b_Ukar);
glyph(A_H_RRIKar, 'C', b_h + b_RRIkar);
glyph(A_M_1H, 'H1', b_m + b_Hasanta);
glyph(A_Ss_1H, 'H1', b_ss + b_Hasanta);
glyph(A_S_1H_1 + 'ˉ', 'H1', b_s + b_Hasanta);
glyph(A_N_1H_1, 'H1', b_n + b_Hasanta);
glyph(A_N_1H_2, 'H1', b_n + b_Hasanta, '›');
glyph(A_D_1H_1, 'H1', b_d + b_Hasanta, '˜');
glyph(A_D_1H_2, 'H1', b_d + b_Hasanta, '™');
glyph(A_C_1H, 'H1', b_C + b_Hasanta, '”');
glyph(A_NGA_1H, 'H1', b_NGA + b_Hasanta, '•');
glyph(A_B_2H_1, 'H2', b_Hasanta + b_b, '^');
glyph(A_B_2H_2 + A_B_2H_3 + A_B_2H_4, 'H2', b_Hasanta + b_b);
glyph(A_BH_2H, 'H2', b_Hasanta + b_Bh);
glyph(A_BH_R_2H, 'H2', b_Hasanta + b_Bh + b_Hasanta + b_r);
glyph(A_M_2H_1 + A_M_2H_2, 'H2', b_Hasanta + b_m);
glyph(A_ZFola, 'H2', b_Hasanta + b_z);
glyph(A_RFola_1 + A_RFola_3, 'H2', b_Hasanta + b_r);
glyph(A_RFola_2, 'H2', b_Hasanta + b_r, '«');
glyph(A_L_2H_1 + '­' + A_L_2H_3, 'H2', b_Hasanta + b_L);
glyph(A_T_R_2H, 'H2', b_Hasanta + b_t + b_Hasanta + b_r);
glyph(A_Nn_2H_1, 'H2', b_Hasanta + b_Nn);
glyph(A_K_R_2H, 'H2', b_Hasanta + b_K + b_Hasanta + b_r);
glyph(A_Nn_2H_2, 'H2', b_Hasanta + b_n);
glyph(A_T_2H, 'H2', b_Hasanta + b_t, '—');
glyph(A_T_UKar_2H, 'H2', b_Hasanta + b_t + b_Ukar, '‘');
glyph(A_Th_2H, 'H2', b_Hasanta + b_Th, '’');
glyph(A_K_2H, 'H2', b_Hasanta + b_K, '‹');
glyph('ú', 'H2', b_Hasanta + b_p);   // প after a half form (¯ú, ¤ú), as Bijoy keyboards write it
glyph(A_IKar, 'PRE', b_Ikar);
glyph(A_EKar1 + A_EKar2, 'PRE', b_Ekar);
glyph(A_OIKar1 + A_OIKar2, 'PRE', b_OIkar);
glyph(A_AAKar, 'POST', b_AAkar);
glyph(A_IIKar, 'POST', b_IIkar);
glyph(A_UKar1 + A_UKar2, 'POST', b_Ukar);
glyph(A_UKar3, 'POST', b_Ukar, '–');
glyph(A_UKar4, 'POST', b_Ukar, '“');
glyph(A_UUKar2, 'POST', b_UUkar, '~');
glyph(A_UUKar1, 'POST', b_UUkar, '‚');
glyph(A_UUKar3, 'POST', b_UUkar, 'ƒ');
glyph(A_RRIKar1, 'POST', b_RRIkar, '„');
glyph(A_RRIKar2, 'POST', b_RRIkar, '…');
glyph(A_OUKar, 'POST', b_LengthMark);
glyph('s', 'SIGN', b_Anushar);
glyph('t', 'SIGN', b_Bisharga);
glyph('u', 'SIGN', b_Chandra);
glyph(A_Reph, 'REPH', b_r + b_Hasanta, '©');
glyph(A_Hasanta, 'HAS', b_Hasanta);
for (let [u, a] of [[b_A, A_A], [b_I, A_I], [b_II, A_II], [b_U, A_U], [b_UU, A_UU], [b_RRI, A_RRI],
                    [b_E, A_E], [b_OI, A_OI], [b_O, A_O], [b_OU, A_OU]]) glyph(a, 'V', u);
const PLAIN = { '|': b_Dari, '\\': b_DoubleDari, '$': b_Taka, [A_StartDoubleQuote]: '“', [A_EndDoubleQuote]: '”' };
for (let d = 0; d <= 9; d++) PLAIN[String(d)] = String.fromCharCode(0x09E6 + d);

function bijoyToUnicode(text) {
    if (!text) return '';
    let src = String(text);
    let out = '';
    let cluster = '';          // the consonant cluster being built
    let pre = '';              // a vowel sign Bijoy writes before its cluster
    let preWaiting = false;    // pre is waiting for the cluster that follows it
    let clusterHasKar = false;

    const flush = () => {
        out += cluster + pre;
        cluster = '';
        pre = '';
        preWaiting = false;
        clusterHasKar = false;
    };
    const joinable = () => cluster !== '' && cluster.endsWith(b_Hasanta);

    for (let i = 0; i < src.length; i++) {
        let ch = src[i];
        if (ch === 'A' && src[i + 1] === 'v') {
            flush();
            out += b_AA;
            i++;
            continue;
        }
        let g = GLYPHS[ch];
        if (!g) {
            flush();
            out += PLAIN[ch] !== undefined ? PLAIN[ch] : ch;
            continue;
        }
        switch (g.type) {
        case 'C':
        case 'H1':
            if (joinable() && !clusterHasKar) {
                // Í after a half form is the second half of ত (šÍ, ¯Í), not ত্ম
                cluster += (ch === 'Í') ? b_t : g.uni;
            } else if (g.type === 'H1' && g.punct !== null && !isConsonantGlyph(src, i + 1)) {
                flush();
                out += g.punct;
            } else if (preWaiting) {
                cluster = g.uni;
                preWaiting = false;
            } else {
                flush();
                cluster = g.uni;
            }
            break;
        case 'H2':
            if (cluster && !clusterHasKar) {
                cluster += cluster.endsWith(b_Hasanta) ? g.uni.slice(1) : g.uni;
            } else {
                flush();
                out += g.punct !== null ? g.punct : g.uni;
            }
            break;
        case 'HAS':
            if (cluster && !clusterHasKar) cluster += b_Hasanta;
            else { flush(); out += b_Hasanta; }
            break;
        case 'REPH':
            if (cluster) {
                cluster = b_r + b_Hasanta + cluster;
            } else {
                flush();
                out += g.punct;
            }
            break;
        case 'PRE':
            flush();
            pre = g.uni;
            preWaiting = true;
            break;
        case 'POST':
            if (cluster && !clusterHasKar) {
                if (pre === b_Ekar && g.uni === b_AAkar) {
                    cluster += b_Okar;
                } else if (pre === b_Ekar && g.uni === b_LengthMark) {
                    cluster += b_OUkar;
                } else {
                    cluster += pre + g.uni;
                }
                pre = '';
                clusterHasKar = true;
            } else {
                flush();
                out += g.punct !== null ? g.punct : g.uni;
            }
            break;
        case 'SIGN':
            if (cluster) {
                cluster += pre + g.uni;
                pre = '';
                clusterHasKar = true;
            } else {
                // after a vowel or another sign (অং, আঁ), or plain text
                let prev = out[out.length - 1];
                if (prev && prev >= 'ঀ' && prev <= '৿') out += g.uni;
                else out += ch;
            }
            break;
        case 'V':
            flush();
            out += g.uni;
            break;
        }
    }
    flush();
    return out;
}

function isConsonantGlyph(src, i) {
    let g = GLYPHS[src[i]];
    return !!g && (g.type === 'C' || g.type === 'H1' || g.type === 'H2');
}
