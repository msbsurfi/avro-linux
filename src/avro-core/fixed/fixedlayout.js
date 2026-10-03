/*
    =============================================================================
    Avro Linux - Keys of the fixed keyboard layouts
    SPDX-License-Identifier: MPL-2.0

    Which character a key types in a fixed keyboard layout of Avro Keyboard:
    GetCharForKey of Avro Keyboard 5 for Windows (KeyboardLayoutLoader.pas,
    MPL-2.0), with the layouts in layoutdata.js.
    =============================================================================
*/

const LayoutData = imports.layoutdata;

/* Avro key names (Windows virtual keys) of a standard keyboard, row by row. */
var KEY_ROWS = [
    ['OEM3', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'MINUS', 'PLUS'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'OEM4', 'OEM6', 'OEM5'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'OEM1', 'OEM7'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'COMMA', 'PERIOD', 'OEM2']
];

/* What each key types on a US keyboard: [normal, shift]. */
var US_KEYS = {
    'OEM3': ['`', '~'], '1': ['1', '!'], '2': ['2', '@'], '3': ['3', '#'], '4': ['4', '$'],
    '5': ['5', '%'], '6': ['6', '^'], '7': ['7', '&'], '8': ['8', '*'], '9': ['9', '('],
    '0': ['0', ')'], 'MINUS': ['-', '_'], 'PLUS': ['=', '+'],
    'OEM4': ['[', '{'], 'OEM6': [']', '}'], 'OEM5': ['\\', '|'],
    'OEM1': [';', ':'], 'OEM7': ["'", '"'],
    'COMMA': [',', '<'], 'PERIOD': ['.', '>'], 'OEM2': ['/', '?']
};
for (let c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    US_KEYS[c] = [c.toLowerCase(), c];
}

/* evdev key codes of the main key block; IBus passes these as `keycode`. */
var KEYCODES = {
    41: 'OEM3', 2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9',
    11: '0', 12: 'MINUS', 13: 'PLUS',
    16: 'Q', 17: 'W', 18: 'E', 19: 'R', 20: 'T', 21: 'Y', 22: 'U', 23: 'I', 24: 'O',
    25: 'P', 26: 'OEM4', 27: 'OEM6', 43: 'OEM5',
    30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G', 35: 'H', 36: 'J', 37: 'K', 38: 'L',
    39: 'OEM1', 40: 'OEM7',
    44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B', 49: 'N', 50: 'M', 51: 'COMMA',
    52: 'PERIOD', 53: 'OEM2'
};

/* Numeric keypad keysyms (KP_0 ... KP_9 only arrive with Num Lock on). */
var NUMPAD_KEYSYMS = {
    0xffb0: 'Num0', 0xffb1: 'Num1', 0xffb2: 'Num2', 0xffb3: 'Num3', 0xffb4: 'Num4',
    0xffb5: 'Num5', 0xffb6: 'Num6', 0xffb7: 'Num7', 0xffb8: 'Num8', 0xffb9: 'Num9',
    0xffab: 'NumAdd', 0xffad: 'NumSubtract', 0xffaa: 'NumMultiply', 0xffaf: 'NumDivide',
    0xffae: 'NumDecimal', 0xffac: 'NumDecimal'
};

let _keysyms = null;

/* US keysym -> { key, shifted }. Printable ASCII keysyms equal their code. */
function _keysymTable() {
    if (!_keysyms) {
        _keysyms = {};
        for (let key in US_KEYS) {
            _keysyms[US_KEYS[key][0].charCodeAt(0)] = { key: key, shifted: false };
            _keysyms[US_KEYS[key][1].charCodeAt(0)] = { key: key, shifted: true };
        }
    }
    return _keysyms;
}

/** Layout ids in menu order (alphabetical by name, as Avro Keyboard lists them). */
function layoutIds() {
    return LayoutData.LAYOUT_ORDER.slice();
}

/** The layout with this id, or null: { name, version, developer, comment, keys, numpad }. */
function getLayout(id) {
    return Object.prototype.hasOwnProperty.call(LayoutData.LAYOUTS, id) ? LayoutData.LAYOUTS[id] : null;
}

function isLetterKey(key) {
    return key.length === 1 && key >= 'A' && key <= 'Z';
}

/**
 * The Avro key of a key event: keypad keys by keysym, the main key block by
 * physical key (so a layout follows the key positions whatever the X
 * keyboard layout is), and anything else by its US keysym.
 * @returns {Object|null} { key, numpad } | { key, physical } | { key, shifted }
 */
function keyForEvent(keyval, keycode) {
    if (Object.prototype.hasOwnProperty.call(NUMPAD_KEYSYMS, keyval)) {
        return { key: NUMPAD_KEYSYMS[keyval], numpad: true };
    }
    if (Object.prototype.hasOwnProperty.call(KEYCODES, keycode)) {
        return { key: KEYCODES[keycode], physical: true };
    }
    let k = _keysymTable()[keyval];
    return k ? { key: k.key, shifted: k.shifted } : null;
}

/**
 * The text a key types in `layout` ('' when the layout has nothing there).
 * @param {Object} mods { shift, capsLock, altGr }
 * @param {boolean} numpadBangla "Enable Bangla in Number Pad"
 */
function charForKey(layout, ev, mods, numpadBangla) {
    if (!layout || !ev) return '';
    mods = mods || {};
    if (ev.numpad) {
        // No modifier is allowed on the number pad
        if (!numpadBangla || mods.shift || mods.altGr) return '';
        return layout.numpad[ev.key.slice(3)] || '';
    }
    let shift;
    if (ev.physical) {
        // Caps Lock shifts the letter keys only
        shift = isLetterKey(ev.key) ? (!!mods.shift !== !!mods.capsLock) : !!mods.shift;
    } else {
        shift = !!ev.shifted;
    }
    let values = layout.keys[ev.key];
    if (!values) return '';
    return values[(shift ? 1 : 0) + (mods.altGr ? 2 : 0)] || '';
}
