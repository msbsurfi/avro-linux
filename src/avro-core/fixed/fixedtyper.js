/*
    =============================================================================
    Avro Linux - Typing with fixed keyboard layouts
    SPDX-License-Identifier: MPL-2.0

    A port of the fixed keyboard layout typing of Avro Keyboard 5 for Windows
    (clsGenericLayoutModern.pas and clsGenericLayoutOld.pas, MPL-2.0):

      * Modern Style Typing: kars are typed after their consonant, with the
        options "Old Style Reph" (reph typed after the consonant),
        "Automatic Vowel Forming" (a kar where no consonant can take it
        becomes the full vowel) and "Automatically fix Chandrabindu position".
      * Old Style Typing (typewriter / Bijoy style): the e, i and oi kars are
        typed before their consonant, the reph after it.

    Windows Avro types each character at once and fixes earlier characters by
    sending backspaces. Here the word being typed is held as the IBus preedit:
    the same changes happen inside it, and the engine commits the word when
    it ends (Space, Enter, Tab, a key outside the layout, focus changes).

    Differences from Windows, all of them fixes:
      * the o-kar (ো) counts as a kar, like the other kars;
      * "&" and "॥" count as punctuation for Automatic Vowel Forming;
      * in Old Style Typing, a with chandrabindu after an e-kar forms the
        o-kar (কেঁ + া = কোঁ), which Windows meant to do but never reaches;
      * Backspace first takes back a kar that waits for its consonant.
    =============================================================================
*/

var B = {
    A: '\u0985', AA: '\u0986', I: '\u0987', II: '\u0988', U: '\u0989', UU: '\u098A',
    RRI: '\u098B', E: '\u098F', OI: '\u0990', O: '\u0993', OU: '\u0994',
    AAkar: '\u09BE', Ikar: '\u09BF', IIkar: '\u09C0', Ukar: '\u09C1', UUkar: '\u09C2',
    RRIkar: '\u09C3', Ekar: '\u09C7', OIkar: '\u09C8', Okar: '\u09CB', OUkar: '\u09CC',
    LengthMark: '\u09D7', Chandra: '\u0981', Hasanta: '\u09CD', R: '\u09B0', Z: '\u09AF',
    ZWJ: '\u200D', ZWNJ: '\u200C'
};

var REPH = B.R + B.Hasanta;
var YA_PHALA = B.Hasanta + B.Z;

// Kar typed where no consonant can take it -> full vowel
const KAR_VOWEL = {};
KAR_VOWEL[B.AAkar] = B.AA;
KAR_VOWEL[B.Ikar] = B.I;
KAR_VOWEL[B.IIkar] = B.II;
KAR_VOWEL[B.Ukar] = B.U;
KAR_VOWEL[B.UUkar] = B.UU;
KAR_VOWEL[B.RRIkar] = B.RRI;
KAR_VOWEL[B.Ekar] = B.E;
KAR_VOWEL[B.OIkar] = B.OI;
KAR_VOWEL[B.Okar] = B.O;
KAR_VOWEL[B.OUkar] = B.OU;

// Old Style Typing also forms ঔ from the au length mark after a hasanta
const KAR_VOWEL_OLD = Object.assign({}, KAR_VOWEL);
KAR_VOWEL_OLD[B.LengthMark] = B.OU;

// IsPureConsonent of Avro Keyboard: ক to হ, ড়, ঢ়, য়, ৎ and the Assamese ৰ and ৱ
const CONSONANTS = new Set();
for (let code = 0x0995; code <= 0x09B9; code++) {
    if ([0x09A9, 0x09B1, 0x09B3, 0x09B4, 0x09B5].indexOf(code) === -1) {
        CONSONANTS.add(String.fromCharCode(code));
    }
}
['\u09CE', '\u09DC', '\u09DD', '\u09DF', '\u09F0', '\u09F1'].forEach(ch => CONSONANTS.add(ch));

// IsKar of Avro Keyboard, plus the o-kar
const KARS = new Set([
    B.AAkar, B.Ikar, B.IIkar, B.Ukar, B.UUkar, B.RRIkar, B.Ekar, B.OIkar, B.Okar, B.OUkar,
    '\u09C4', '\u09E2', '\u09E3'
]);

// Characters after which a kar becomes the full vowel (DeadKeyChars):
// ASCII symbols, letters and digits, Bangla digits, vowels and kars, and signs
const DEAD_KEY_CHARS = new Set((
    '`~!@#$%^&+*-_=\\|"/;:,.?><()[]{}\'' +
    '1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM' +
    '\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF' +
    '\u0985\u0986\u09BE\u0987\u0988\u09C0\u09BF\u0989\u09C1\u098A\u09C2\u098B\u09C3' +
    '\u098F\u09C7\u0993\u0990\u09C8\u09CB\u0994\u09CC' +
    '\u098C\u09E1\u09E0\u09C4\u09E2\u09E3' +
    '\u0982\u0983\u09CE\u0964\u09F3\u0965' +
    '\u09D7\u09F2\u09F4\u09F5\u09F6\u09F7\u09F8\u09F9'
).split(''));

function isConsonant(ch) {
    return CONSONANTS.has(ch);
}

/* Avro Keyboard looks at the first character of a key's text. */
function isKar(text) {
    return !!text && KARS.has(text[0]);
}

/* Avro Keyboard looks at the last character of a key's text. */
function isDeadKeyChar(text) {
    return !!text && DEAD_KEY_CHARS.has(text[text.length - 1]);
}

var FixedTyper = class FixedTyper {
    /**
     * @param {Object} [options] { style: 'modern' | 'old', oldReph, vowelForming,
     *                             fixChandra } (Avro Keyboard defaults: modern, all on)
     */
    constructor(options) {
        this.text = '';
        this.pendingKar = '';
        this.deadKey = false;
        this.setOptions(options);
    }

    setOptions(options) {
        let o = options || {};
        this.oldStyle = o.style === 'old';
        this.oldReph = o.oldReph !== false;
        this.vowelForming = o.vowelForming !== false;
        this.fixChandra = o.fixChandra !== false;
    }

    /** Nothing typed and no kar waiting for its consonant. */
    isEmpty() {
        return this.text.length === 0 && this.pendingKar === '';
    }

    /** Space, Enter or Tab ended the word: a kar typed next becomes a vowel. */
    boundary() {
        this.text = '';
        this.pendingKar = '';
        this.deadKey = true;
    }

    /** A key outside the layout, a focus or mode change: what comes before
        the text cursor is unknown now. */
    interrupt() {
        this.text = '';
        this.pendingKar = '';
        this.deadKey = false;
    }

    /** Backspace. False when nothing is held here: the application then
        deletes the character before the cursor itself. */
    backspace() {
        if (this.pendingKar) {
            this.pendingKar = '';
            return true;
        }
        this.deadKey = false;
        if (this.text.length === 0) {
            return false;
        }
        this._drop(1);
        return true;
    }

    /** Type the text of one key of the layout (never empty). */
    type(ch) {
        if (!ch) return;
        if (this.oldStyle) {
            this._typeOld(ch);
        } else {
            this._typeModern(ch);
        }
    }

    /* LastChars[n] of Avro Keyboard: the n-th character from the end. */
    _last(n) {
        let i = this.text.length - (n || 1);
        return i >= 0 ? this.text[i] : ' ';
    }

    _drop(n) {
        this.text = this.text.slice(0, Math.max(0, this.text.length - n));
    }

    _out(s) {
        this.text += s;
    }

    /* Reph typed after its consonant moves before the consonant cluster,
       together with a kar and chandrabindu that follow the cluster. */
    _insertReph(moveable) {
        if (!moveable) return REPH;
        let last = this._last(1);
        let ok = false;
        if (isConsonant(last)) {
            ok = true;
        } else if (isKar(last)) {
            ok = isConsonant(this._last(2));
        } else if (last === B.Chandra) {
            ok = isConsonant(this._last(2)) || (isKar(this._last(2)) && isConsonant(this._last(3)));
        }
        if (!ok) return REPH;

        let i = 1;
        if (isKar(last) && isConsonant(this._last(2))) {
            i = 2;
        } else if (last === B.Chandra) {
            if (isConsonant(this._last(2))) i = 2;
            else if (isKar(this._last(2)) && isConsonant(this._last(3))) i = 3;
        }
        while (this._last(i + 1) === B.Hasanta && isConsonant(this._last(i + 2))) {
            i += 2;
        }
        let moved = this.text.slice(this.text.length - i);
        this._drop(i);
        return REPH + moved;
    }

    /* ── Modern Style Typing ─────────────────────────────────────────── */

    _insertKarModern(kar) {
        if (this.fixChandra && this._last() === B.Chandra) {
            this._drop(1);
            return kar + B.Chandra;
        }
        return kar;
    }

    _typeModern(c) {
        if (!this.vowelForming) {
            this.deadKey = false;
        }
        if (this.deadKey) {
            if (KAR_VOWEL[c]) {
                this._out(KAR_VOWEL[c]);
                return;
            }
            this.deadKey = false;
        }
        if (this._last() === B.Hasanta) {
            // Hasanta + kar types the full vowel; hasanta twice keeps a visible hasanta
            if (KAR_VOWEL[c]) {
                this._drop(1);
                this._out(KAR_VOWEL[c]);
                this.deadKey = true;
                return;
            }
            if (c === B.Hasanta) {
                this._out(B.ZWNJ);
                this.deadKey = true;
                return;
            }
        }
        if (c === REPH) {
            this._out(this._insertReph(this.oldReph));
            return;
        }
        if (c === YA_PHALA) {
            // র + য-ফলা, not reph + য
            let joiner = (this._last() === B.R && this._last(2) !== B.Hasanta) ? B.ZWJ : '';
            this._out(joiner + YA_PHALA);
            return;
        }
        if (isDeadKeyChar(c)) {
            this.deadKey = true;
            this._out(isKar(c) ? this._insertKarModern(c) : c);
            return;
        }
        this._out(c);
    }

    /* ── Old Style Typing ────────────────────────────────────────────── */

    _insertKarOld(kar) {
        if (this._last() === B.Chandra && this._last(2) === B.Ekar) {
            if (kar === B.AAkar) {
                this._drop(2);
                return B.Okar + B.Chandra;
            }
            if (kar === B.LengthMark) {
                this._drop(2);
                return B.OUkar + B.Chandra;
            }
        }
        return kar;
    }

    _typeOld(c) {
        if (this._last() === B.Hasanta) {
            if (KAR_VOWEL_OLD[c]) {
                let pending = this.pendingKar;
                this._drop(1);
                this.pendingKar = '';
                this._out(this._insertKarOld(pending) + KAR_VOWEL_OLD[c]);
                return;
            }
            if (c === B.Hasanta) {
                this.pendingKar = '';
                this._out(B.ZWNJ);
                return;
            }
        }

        // e, i and oi kars wait for their consonant; typed twice, the kar itself
        if (c === B.Ekar || c === B.Ikar || c === B.OIkar) {
            if (this.pendingKar === c) {
                this.pendingKar = '';
                this._out(c);
            } else {
                this.pendingKar = c;
            }
            return;
        }

        if ((c === B.AAkar || c === B.LengthMark) && this._last() === B.Ekar) {
            this.pendingKar = '';
            this._drop(1);
            this._out(this._insertKarOld(c === B.AAkar ? B.Okar : B.OUkar));
            return;
        }

        if (c === B.Hasanta) {
            // A conjunct grows: the kar waits again for the cluster's last consonant
            let last = this._last();
            if (last === B.Ekar || last === B.Ikar || last === B.OIkar) {
                this._drop(1);
                this.pendingKar = last;
            }
            this._out(B.Hasanta);
            return;
        }

        if (this.pendingKar) {
            let kar = this.pendingKar;
            this.pendingKar = '';
            if (c === REPH) {
                let reph = this._insertReph(true);
                this._out(reph + this._insertKarOld(kar));
            } else if (kar === B.Ekar && c === B.AAkar) {
                this._out(this._insertKarOld(B.Okar));
            } else if (kar === B.Ekar && c === B.LengthMark) {
                this._out(this._insertKarOld(B.OUkar));
            } else {
                this._out(c + this._insertKarOld(kar));
            }
            return;
        }

        if (c === REPH) {
            this._out(this._insertReph(true));
            return;
        }
        if (c === B.AAkar) {
            if (this._last() === B.A) {
                this._drop(1);
                this._out(B.AA);
            } else {
                this._out(this._insertKarOld(B.AAkar));
            }
            return;
        }
        if (c === YA_PHALA) {
            let last = this._last();
            if (last === B.R && this._last(2) !== B.Hasanta) {
                this._out(B.ZWJ + YA_PHALA);
            } else if (isKar(last)) {
                // য-ফলা typed after the kar goes before it
                let joiner = (this._last(2) === B.R && this._last(3) !== B.Hasanta) ? B.ZWJ : '';
                this._drop(1);
                this._out(joiner + YA_PHALA + last);
            } else {
                this._out(YA_PHALA);
            }
            return;
        }
        if (c.length > 1 && c[0] === B.Hasanta && isKar(this._last())) {
            // র-ফলা and other phala keys typed after the kar go before it
            let kar = this._last();
            this._drop(1);
            this._out(c + kar);
            return;
        }
        this._out(isKar(c) ? this._insertKarOld(c) : c);
    }
};
