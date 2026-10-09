#!/usr/bin/env gjs

/*
    =============================================================================
    *****************************************************************************
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.

    Software distributed under the License is distributed on an "AS IS"
    basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
    License for the specific language governing rights and limitations
    under the License.

    The Original Code is ibus-avro

    The Initial Developer of the Original Code is
    Sarim Khan <sarim2005@gmail.com>

    Copyright (C) Sarim Khan (http://www.sarimkhan.com). All Rights Reserved.

    Contributor(s): Mehdi Hasan Khan <mhasan@omicronlab.com>
                    Avro Linux Contributors

    *****************************************************************************
    =============================================================================
*/

const GLib = imports.gi.GLib;
if (GLib.getenv("DISPLAY")) {
    GLib.setenv("GDK_BACKEND", "x11", true);
}

const IBus = imports.gi.IBus;
const Gio = imports.gi.Gio;
// Determine base directory and configure module search paths
let baseDir = '/usr/share/avro-linux';
try {
    // gjs does not put the script itself in ARGV; programPath is its real location.
    let scriptPath = imports.system.programPath || imports.system.programInvocationName || '.';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

// The engine's own tree first (the last unshift is searched first)
imports.searchPath.unshift('/usr/share/avro-linux/common');
imports.searchPath.unshift(baseDir + '/src/common');
imports.searchPath.unshift(baseDir + '/common');

const eevars = imports.evars;
eevars.init_search_paths(baseDir);

const suggestion = imports.suggestionbuilder;

// The fixed keyboard layouts of Avro Keyboard (National (Jatiya), Probhat, ...)
var fixedLayout = null;
var fixedTyper = null;
try {
    fixedLayout = imports.fixedlayout;
    fixedTyper = imports.fixedtyper;
} catch (e) {
    fixedLayout = null;
    fixedTyper = null;
}

// Windows-style Preview Window. Optional: it needs GTK and an X11/XWayland
// display; without it the desktop's IBus candidate panel is used instead.
var previewModule = null;
try {
    previewModule = imports['floating-preview'];
} catch (e) {
    previewModule = null;
}

// Bijoy / ANSI legacy converter
var bijoyConverter = null;
try {
    bijoyConverter = imports.bijoyconverter;
} catch (e) {
    bijoyConverter = null;
}

/* Diagnostics for support. Only when the file ~/.cache/avro/engine-debug
   exists as the engine starts: what applications report to the engine (focus,
   capabilities, caret position, field type) goes to
   ~/.cache/avro/engine-debug.log. Never the keys or the text typed: only
   whether a key was used and how long the shown word is. */
var debugLog = null;
var debugSeq = 0;
try {
    let dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'avro']);
    if (GLib.file_test(GLib.build_filenamev([dir, 'engine-debug']), GLib.FileTest.EXISTS)) {
        debugLog = Gio.File.new_for_path(GLib.build_filenamev([dir, 'engine-debug.log']))
            .append_to(Gio.FileCreateFlags.NONE, null);
    }
} catch (e) {
    debugLog = null;
}

function dbg(engine, message) {
    if (!debugLog) return;
    try {
        if (engine && !engine._debugId) engine._debugId = ++debugSeq;
        let line = new Date().toISOString().slice(11, 23) + ' [' + (engine ? engine._debugId : '-') + '] ' + message + '\n';
        debugLog.write_all(new TextEncoder().encode(line), null);
        debugLog.flush(null);
    } catch (e) {}
}

function formatOutput(engine, text) {
    if (!text) return "";
    if (engine && engine.output_encoding === 'ansi' && bijoyConverter && typeof bijoyConverter.unicodeToBijoy === 'function') {
        try {
            return bijoyConverter.unicodeToBijoy(text);
        } catch (e) {
            return text;
        }
    }
    return text;
}

// X11 keysym values. These never change, unlike the IBus.KEY_* constants,
// which are not exported by every IBus introspection version.
const KEY = {
    space: 0x020, comma: 0x02c, period: 0x02e, digit1: 0x031, digit9: 0x039,
    ISO_Left_Tab: 0xfe20,
    BackSpace: 0xff08, Tab: 0xff09, Return: 0xff0d, Escape: 0xff1b,
    Left: 0xff51, Up: 0xff52, Right: 0xff53, Down: 0xff54,
    KP_Enter: 0xff8d, KP_Left: 0xff96, KP_Up: 0xff97, KP_Right: 0xff98, KP_Down: 0xff99,
    KP_Multiply: 0xffaa, KP_Add: 0xffab, KP_Subtract: 0xffad, KP_Decimal: 0xffae, KP_Divide: 0xffaf,
    KP_0: 0xffb0, KP_1: 0xffb1, KP_9: 0xffb9,
    F12: 0xffc9,
    Alt_R: 0xffea, ISO_Level3_Shift: 0xfe03
};

// Shift, Control, Caps/Shift Lock, Meta, Alt, Super, Hyper, AltGr, Num Lock
function isModifierKey(keyval) {
    return (keyval >= 0xffe1 && keyval <= 0xffee) ||
           keyval === 0xfe03 || keyval === 0xfe11 || keyval === 0xff7e || keyval === 0xff7f;
}

const PURPOSE_PASSWORD = (IBus.InputPurpose && IBus.InputPurpose.PASSWORD !== undefined) ? IBus.InputPurpose.PASSWORD : 8;
const PURPOSE_PIN = (IBus.InputPurpose && IBus.InputPurpose.PIN !== undefined) ? IBus.InputPurpose.PIN : 9;
const ORIENTATION_HORIZONTAL = 0;
const PREEDIT_COMMIT = (IBus.PreeditFocusMode && IBus.PreeditFocusMode.COMMIT !== undefined) ? IBus.PreeditFocusMode.COMMIT : 1;

// Check if running from ibus
var exec_by_ibus = (ARGV[0] == '--ibus' || ARGV[1] == '--ibus');

// Initialize IBus
IBus.init();

// Connect to IBus bus
var bus = new IBus.Bus();

if (bus.is_connected()) {

    /* =========================================================================== */
    /*                           IBus Engine                                       */
    /* =========================================================================== */

    var id = 0;

    function _create_engine_cb(factory, engine_name) {
        id += 1;
        var engine = new IBus.Engine({
            engine_name: engine_name,
            object_path: '/org/freedesktop/IBus/Engine/' + id,
            connection: bus.get_connection()
        });

        engine.mode_bangla = true;
        engine.password_field = false;
        engine.presentation = 'none';
        engine.cursorRect = null;
        // Fixed keyboard layout (null: Avro Phonetic) and the word typed with it
        engine.layoutId = 'phonetic';
        engine.layout = null;
        engine.typer = fixedTyper ? new fixedTyper.FixedTyper() : null;
        engine.typerOptions = '';
        engine.altGrDown = false;
        engine.setting_numpad_bangla = true;

        engine.connect('process-key-event', function(eng, keyval, keycode, state) {
            let used = engine_process_key_event(eng, keyval, keycode, state);
            if (debugLog && !(state & IBus.ModifierType.RELEASE_MASK)) dbg(eng, 'key ' + (used ? 'used' : 'passed on'));
            return used;
        });
        engine.connect('candidate-clicked', engine_candidate_clicked);
        engine.connect('focus-out', engine_focus_out);
        engine.connect('focus-in', engine_focus_in);
        engine.connect('enable', engine_enable);
        engine.connect('reset', engine_reset);
        engine.connect('disable', engine_disable);
        engine.connect('property-activate', engine_property_activate);
        engine.connect('set-content-type', engine_set_content_type);
        if (debugLog) {
            dbg(engine, 'engine created');
            engine.connect('set-capabilities', (eng, caps) => dbg(eng, 'capabilities ' + caps +
                ' (preedit ' + !!(caps & 1) + ', aux ' + !!(caps & 2) + ', lookup table ' + !!(caps & 4) +
                ', focus ' + !!(caps & 8) + ', property ' + !!(caps & 16) + ', surrounding text ' + !!(caps & 32) + ')'));
            engine.connect('focus-in', (eng) => dbg(eng, 'focus in'));
            engine.connect('focus-out', (eng) => dbg(eng, 'focus out'));
            engine.connect('enable', (eng) => dbg(eng, 'enable'));
            engine.connect('disable', (eng) => dbg(eng, 'disable'));
            engine.connect('reset', (eng) => dbg(eng, 'reset'));
            engine.connect('set-content-type', (eng, purpose, hints) => dbg(eng, 'content type: purpose ' + purpose + ', hints ' + hints));
            engine.connect('set-cursor-location', (eng, x, y, w, h) => dbg(eng, 'cursor location ' + x + ',' + y + ' ' + w + 'x' + h));
        }
        engine.connect('set-cursor-location', function(eng, x, y, w, h) {
            eng.cursorRect = { x: x, y: y, w: w, h: h };
            if (previewUI) {
                previewUI.setCursorLocation(eng.cursorRect);
            }
        });
        engine.connect('destroy', function(eng) {
            if (previewOwner === eng) {
                hidePreviewWindow(eng);
            }
            // A destroyed engine must not react to settings changes any more
            if (eng.setting && eng.settingHandler) {
                eng.setting.disconnect(eng.settingHandler);
                eng.settingHandler = 0;
            }
        });

        engine.lookuptable = IBus.LookupTable.new(16, 0, true, true);
        // Labels are per page position; set them once ("1." ... "16.").
        for (let i = 1; i <= 16; i++) {
            engine.lookuptable.append_label(IBus.Text.new_from_string(i + "."));
        }
        resetAll(engine);
        initSetting(engine);
        return engine;
    }

    function updateEngineProperty(engine) {
        let isAnsi = engine && engine.output_encoding === 'ansi';
        if (!engine.mode_bangla) {
            prop_mode.set_label(IBus.Text.new_from_string("English"));
            prop_mode.set_symbol(IBus.Text.new_from_string("EN"));
            try { prop_mode.set_icon("avro-en"); } catch (e) {}
        } else {
            let name = engine.layout ? engine.layout.name : "Avro";
            let suffix = isAnsi ? " [ANSI]" : "";
            prop_mode.set_label(IBus.Text.new_from_string("বাংলা (" + name + ")" + suffix));
            prop_mode.set_symbol(IBus.Text.new_from_string(isAnsi ? "BN [ANSI]" : "BN"));
            try { prop_mode.set_icon("avro-bn"); } catch (e) {}
        }
        engine.update_property(prop_mode);
    }

    /* Commit what is being typed, with Avro Phonetic or a fixed layout. */
    function finishWord(engine) {
        if (engine.buffertext && engine.buffertext.length > 0) {
            commitCandidate(engine);
        }
        if (engine.typer && !engine.typer.isEmpty()) {
            commitFixed(engine, "");
        }
    }

    function setMode(engine, bangla) {
        // Keep what was already typed instead of throwing the word away.
        finishWord(engine);
        if (engine.typer) {
            engine.typer.interrupt();
        }
        engine.mode_bangla = bangla;
        updateEngineProperty(engine);
        try {
            if (engine.setting) {
                engine.setting.set_boolean('mode-bangla', engine.mode_bangla);
            }
        } catch (e) {}
    }

    function engine_process_key_event(engine, keyval, keycode, state) {
        // Privacy rule: Never log raw keyval, keycode, or user input text

        let isRelease = (state & IBus.ModifierType.RELEASE_MASK) !== 0;

        // Right Alt is AltGr for the fixed layouts, also on a US keyboard
        // layout where it is a plain Alt key.
        if (keyval === KEY.Alt_R || keyval === KEY.ISO_Level3_Shift) {
            engine.altGrDown = !isRelease;
        }

        // F12 toggles Bangla / English mode
        if (keyval === KEY.F12) {
            if (!isRelease) {
                setMode(engine, !engine.mode_bangla);
            }
            return true;
        }

        // Ignore release events and lone modifier keys (Shift, Ctrl, Alt, Caps Lock, ...)
        if (isRelease || isModifierKey(keyval)) {
            return false;
        }

        if (engine.layout) {
            return processFixedKey(engine, keyval, keycode, state);
        }

        let hasBuffer = engine.buffertext.length > 0;

        // Pass through keyboard shortcuts with Ctrl, Alt, Super (Mod4)
        let isControl = (state & IBus.ModifierType.CONTROL_MASK) !== 0;
        let isAlt = (state & IBus.ModifierType.MOD1_MASK) !== 0;
        let isSuper = (state & (IBus.ModifierType.SUPER_MASK | IBus.ModifierType.MOD4_MASK)) !== 0;

        if (isControl || isAlt || isSuper) {
            if (hasBuffer) {
                commitCandidate(engine);
            }
            return false;
        }

        // English mode and password fields: keys go straight to the application
        if (!engine.mode_bangla || engine.password_field) {
            if (hasBuffer) {
                commitCandidate(engine);
            }
            return false;
        }

        let count = engine.currentSuggestions.length;
        let listVisible = hasBuffer && (engine.presentation === 'classic' || engine.presentation === 'system');
        let horizontal = engine.presentation === 'system' && engine.setting_cboxorient === ORIENTATION_HORIZONTAL;
        let isShift = (state & IBus.ModifierType.SHIFT_MASK) !== 0;

        switch (keyval) {
        case KEY.space:
            if (hasBuffer) {
                commitCandidateWithSuffix(engine, " ");
                return true;
            }
            return false;

        case KEY.Return:
        case KEY.KP_Enter:
            if (hasBuffer) {
                commitCandidate(engine);
                // With "Enter inserts a new line" the application gets the key too.
                return !engine.setting_switch_newline;
            }
            return false;

        case KEY.Tab:
        case KEY.ISO_Left_Tab:
            if (hasBuffer) {
                if (count > 1) {
                    if (keyval === KEY.ISO_Left_Tab || isShift) {
                        decSelection(engine);
                    } else {
                        incSelection(engine);
                    }
                    return true;
                }
                commitCandidate(engine);
            }
            return false;

        case KEY.Up:
        case KEY.KP_Up:
        case KEY.Down:
        case KEY.KP_Down:
            if (hasBuffer) {
                if (count > 1 && listVisible) {
                    if (keyval === KEY.Up || keyval === KEY.KP_Up) {
                        decSelection(engine);
                    } else {
                        incSelection(engine);
                    }
                    return true;
                }
                commitCandidate(engine);
            }
            return false;

        case KEY.Left:
        case KEY.KP_Left:
        case KEY.Right:
        case KEY.KP_Right:
            // Left/Right pick candidates only in a horizontal list; otherwise
            // they finish the word and move the text cursor, as on Windows.
            if (hasBuffer) {
                if (count > 1 && listVisible && horizontal) {
                    if (keyval === KEY.Left || keyval === KEY.KP_Left) {
                        decSelection(engine);
                    } else {
                        incSelection(engine);
                    }
                    return true;
                }
                commitCandidate(engine);
            }
            return false;

        case KEY.Escape:
            if (hasBuffer) {
                resetAll(engine);
                return true;
            }
            return false;

        case KEY.BackSpace:
            if (hasBuffer) {
                engine.buffertext = engine.buffertext.substr(0, engine.buffertext.length - 1);
                if (engine.buffertext.length <= 0) {
                    resetAll(engine);
                } else {
                    updateCurrentSuggestions(engine);
                }
                return true;
            }
            return false;

        case KEY.period:
            // Bengali Dari '।'
            if (hasBuffer) {
                commitCandidateWithSuffix(engine, "।");
            } else {
                engine.commit_text(IBus.Text.new_from_string(formatOutput(engine, "।")));
            }
            return true;

        case KEY.comma:
            if (hasBuffer) {
                commitCandidateWithSuffix(engine, ",");
                return true;
            }
            return false;
        }

        // Number keys 1-9 pick a suggestion while the list is on screen
        if (listVisible && count > 1) {
            let numIdx = -1;
            if (keyval >= KEY.digit1 && keyval <= KEY.digit9) {
                numIdx = keyval - KEY.digit1;
            } else if (keyval >= KEY.KP_1 && keyval <= KEY.KP_9) {
                numIdx = keyval - KEY.KP_1;
            }
            if (numIdx >= 0 && numIdx < count) {
                selectAndCommit(engine, numIdx);
                return true;
            }
        }

        // Process alphanumeric and keypad characters
        if ((keyval >= 33 && keyval <= 126) ||
            (keyval >= KEY.KP_0 && keyval <= KEY.KP_9) ||
             keyval === KEY.KP_Add ||
             keyval === KEY.KP_Decimal ||
             keyval === KEY.KP_Divide ||
             keyval === KEY.KP_Multiply ||
             keyval === KEY.KP_Subtract) {

            engine.buffertext += IBus.keyval_to_unicode(keyval);
            updateCurrentSuggestions(engine);
            return true;
        }

        // Any other key (Home, End, Delete, Page Up/Down, F-keys, ...) finishes the word
        if (hasBuffer) {
            commitCandidate(engine);
        }
        return false;
    }

    /* =========================================================================== */
    /*                  Fixed keyboard layouts                                     */
    /* =========================================================================== */

    // The word typed with a fixed layout is the preedit until it ends; the
    // typing rules of Avro Keyboard (fixedtyper.js) rearrange it while typing.
    function processFixedKey(engine, keyval, keycode, state) {
        let typer = engine.typer;
        let M = IBus.ModifierType;
        let ctrl = (state & M.CONTROL_MASK) !== 0;
        let alt = (state & M.MOD1_MASK) !== 0;
        let superKey = (state & (M.SUPER_MASK | M.MOD4_MASK)) !== 0;
        let level3 = (state & M.MOD5_MASK) !== 0;
        if (!alt && !level3) {
            engine.altGrDown = false;   // its release went to another window
        }
        // AltGr: Right Alt, the ISO level 3 shift, or Ctrl+Alt as on Windows
        let altGr = level3 || (engine.altGrDown && alt) || (ctrl && alt);

        // English mode and password fields: keys go straight to the application
        if (!engine.mode_bangla || engine.password_field) {
            finishWord(engine);
            return false;
        }
        // Shortcuts with Ctrl, Alt or Super
        if (superKey || ((ctrl || alt) && !altGr)) {
            finishWord(engine);
            return false;
        }

        switch (keyval) {
        case KEY.space: {
            let text = typer.text;
            typer.boundary();
            if (text) {
                commitText(engine, text + " ");
                return true;
            }
            return false;
        }
        case KEY.Return:
        case KEY.KP_Enter:
        case KEY.Tab:
        case KEY.ISO_Left_Tab: {
            let text = typer.text;
            typer.boundary();
            if (text) {
                commitText(engine, text);
            }
            return false;
        }
        case KEY.BackSpace:
            if (typer.backspace()) {
                showPreedit(engine, typer.text);
                return true;
            }
            return false;
        }

        let key = fixedLayout.keyForEvent(keyval, keycode);
        let mods = {
            shift: (state & M.SHIFT_MASK) !== 0,
            capsLock: (state & M.LOCK_MASK) !== 0,
            altGr: altGr
        };
        let text = fixedLayout.charForKey(engine.layout, key, mods, engine.setting_numpad_bangla);
        if (!text) {
            // Not a key of the layout (arrows, Home, Escape, F-keys, ...): the
            // word ends and the application gets the key.
            finishWord(engine);
            typer.interrupt();
            return false;
        }
        typer.type(text);
        // Only the last few characters can still change: keep the preedit short
        if (typer.text.length > 64) {
            let done = typer.text.slice(0, typer.text.length - 16);
            typer.text = typer.text.slice(done.length);
            engine.commit_text(IBus.Text.new_from_string(formatOutput(engine, done)));
        }
        showPreedit(engine, typer.text);
        return true;
    }

    function commitText(engine, text) {
        dbg(engine, 'commit (' + Array.from(text || '').length + ' characters)');
        engine.commit_text(IBus.Text.new_from_string(formatOutput(engine, text)));
        engine.hide_preedit_text();
    }

    function commitFixed(engine, suffix) {
        let text = engine.typer.text + (suffix || "");
        engine.typer.interrupt();
        if (text) {
            commitText(engine, text);
        } else {
            engine.hide_preedit_text();
        }
    }

    /* Switch between Avro Phonetic ('phonetic') and a fixed layout. */
    function applyLayout(engine, id) {
        let layout = (fixedLayout && engine.typer && id && id !== 'phonetic') ? fixedLayout.getLayout(id) : null;
        let newId = layout ? id : 'phonetic';
        if (newId === engine.layoutId) return;
        finishWord(engine);
        if (engine.typer) {
            engine.typer.interrupt();
        }
        engine.layoutId = newId;
        engine.layout = layout;
        updateEngineProperty(engine);
    }

    function applyTyperOptions(engine, options) {
        if (!engine.typer) return;
        let signature = JSON.stringify(options);
        if (signature === engine.typerOptions) return;
        // A style change in the middle of a word keeps what is on screen
        if (!engine.typer.isEmpty()) {
            commitFixed(engine, "");
        }
        engine.typer.setOptions(options);
        engine.typerOptions = signature;
    }

    // A word picked by click or number key is remembered for next time,
    // like a word chosen with Tab or the arrow keys.
    function selectAndCommit(engine, index) {
        if (engine.buffertext.length > 0 && index >= 0 && index < engine.currentSuggestions.length) {
            engine.currentSelection = index;
            suggestionBuilder.updateCandidateSelection(engine.buffertext, engine.currentSuggestions[index]);
            commitCandidate(engine);
        }
    }

    function engine_candidate_clicked(engine, index, button, state) {
        selectAndCommit(engine, index);
    }

    // The preedit is sent in IBus.PreeditFocusMode.COMMIT, so when the user
    // clicks elsewhere or focus moves to another field, the client (or
    // ibus-daemon) keeps the visible word in the field it was typed in, at
    // that very moment. The engine must not commit it again: with IBus'
    // global engine the same engine object is attached to the next input
    // context right after focus-out, so a late commit_text() would put the
    // word into the newly focused field.
    function finishCompositionByClient(engine, keepContext) {
        if (engine.buffertext && engine.buffertext.length > 0 && engine.currentSuggestions.length > 0) {
            let word = engine.currentSuggestions[engine.currentSelection] || engine.buffertext;
            suggestionBuilder.stringCommitted(engine.buffertext, word);
        }
        // Fixed layouts: the client keeps the word too. A reset with no word
        // in progress (some applications reset after every commit) keeps
        // knowing that a new word starts, for Automatic Vowel Forming.
        if (engine.typer && !(keepContext && engine.typer.isEmpty())) {
            engine.typer.interrupt();
        }
        resetAll(engine);
    }

    var focusOutTimeoutId = 0;

    function engine_focus_out(engine) {
        if (focusOutTimeoutId !== 0) {
            GLib.source_remove(focusOutTimeoutId);
            focusOutTimeoutId = 0;
        }
        engine.altGrDown = false;
        engine.cursorRect = null;
        if (previewUI && typeof previewUI.resetCursor === 'function') {
            previewUI.resetCursor();
        }
        if ((engine.buffertext && engine.buffertext.length > 0) || (engine.typer && !engine.typer.isEmpty())) {
            // Debounce by 80ms: in Wayland/KWin environments where a window maps or
            // focus momentarily bounces, focus_in cancels this timer before composition is aborted.
            focusOutTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 80, () => {
                focusOutTimeoutId = 0;
                hidePreviewWindow(engine);
                finishCompositionByClient(engine, false);
                return GLib.SOURCE_REMOVE;
            });
        } else {
            hidePreviewWindow(engine);
            finishCompositionByClient(engine, false);
        }
    }

    function engine_reset(engine) {
        if (focusOutTimeoutId !== 0) {
            GLib.source_remove(focusOutTimeoutId);
            focusOutTimeoutId = 0;
        }
        finishCompositionByClient(engine, true);
    }

    function engine_disable(engine) {
        if (focusOutTimeoutId !== 0) {
            GLib.source_remove(focusOutTimeoutId);
            focusOutTimeoutId = 0;
        }
        finishCompositionByClient(engine, false);
    }

    function engine_set_content_type(engine, purpose, hints) {
        // Never compose (or show typed text in the preview) inside password fields
        let secret = (purpose === PURPOSE_PASSWORD || purpose === PURPOSE_PIN);
        if (secret && ((engine.buffertext && engine.buffertext.length > 0) ||
                       (engine.typer && !engine.typer.isEmpty()))) {
            if (engine.typer) engine.typer.interrupt();
            resetAll(engine);
        }
        engine.password_field = secret;
    }

    var proplist = new IBus.PropList();
    var prop_mode = IBus.Property.new(
        'mode',
        IBus.PropType.NORMAL,
        IBus.Text.new_from_string("বাংলা (Avro)"),
        null,
        IBus.Text.new_from_string("Switch Input Mode (Bangla / English)"),
        true,
        true,
        IBus.PropState.UNCHECKED,
        null
    );
    var propp = IBus.Property.new(
        'setup',
        IBus.PropType.NORMAL,
        IBus.Text.new_from_string("Preferences - Avro"),
        'gtk-preferences',
        IBus.Text.new_from_string("Configure Avro"),
        true,
        true,
        IBus.PropState.UNCHECKED,
        null
    );

    proplist.append(prop_mode);
    proplist.append(propp);

    function engine_focus_in(engine) {
        if (focusOutTimeoutId !== 0) {
            GLib.source_remove(focusOutTimeoutId);
            focusOutTimeoutId = 0;
        }
        if (previewUI && typeof previewUI.resetCursor === 'function') {
            previewUI.resetCursor();
        }
        engine.register_properties(proplist);
        updateEngineProperty(engine);
        if (engine.buffertext && engine.buffertext.length > 0) {
            showComposition(engine);
        }
    }

    function engine_property_activate(engine, prop_name, prop_state) {
        if (prop_name === 'setup') {
            runPreferences();
        } else if (prop_name === 'mode') {
            setMode(engine, !engine.mode_bangla);
        }
    }

    // enable() fires when IBus activates the engine for a new input context,
    // which in Electron/VS Code (and some Qt apps) happens BEFORE the first
    // focus-in. Registering properties here ensures the engine is fully
    // initialised before the first keypress — fixing "first attempt fails"
    // or "one Bengali letter then English" bugs in those apps.
    function engine_enable(engine) {
        try {
            engine.register_properties(proplist);
            updateEngineProperty(engine);
        } catch (e) {}
    }

    /* =========================================================================== */
    /*                  Preview Window & Candidate Panel                           */
    /* =========================================================================== */

    // One preview window serves every input context. It belongs to whichever
    // engine (text field) is currently composing.
    var previewUI = null;
    var previewUITried = false;
    var previewOwner = null;
    var uiSetting = null;

    function hasKey(settings, key) {
        try {
            return settings.settings_schema.has_key(key);
        } catch (e) {
            try {
                return settings.list_keys().indexOf(key) !== -1;
            } catch (e2) {
                return false;
            }
        }
    }

    // Gio.Settings.new() aborts the process when the schema is not installed;
    // look the schema up first.
    function newAvroSettings() {
        try {
            let schemaDir = GLib.getenv("GSETTINGS_SCHEMA_DIR");
            let source = Gio.SettingsSchemaSource.get_default();
            let schema = source ? source.lookup("com.omicronlab.avro", true) : null;
            if (!schema) {
                let candidates = [
                    schemaDir,
                    baseDir + "/data/gsettings",
                    baseDir + "/../data/gsettings",
                    GLib.get_current_dir() + "/data/gsettings",
                    "/usr/share/glib-2.0/schemas"
                ];
                for (let dir of candidates) {
                    if (dir && GLib.file_test(dir + "/gschemas.compiled", GLib.FileTest.EXISTS)) {
                        try {
                            let customSource = Gio.SettingsSchemaSource.new_from_directory(dir, Gio.SettingsSchemaSource.get_default(), false);
                            schema = customSource ? customSource.lookup("com.omicronlab.avro", true) : null;
                            if (schema) break;
                        } catch (err) {}
                    }
                }
            }
            return schema ? new Gio.Settings({ settings_schema: schema }) : null;
        } catch (e) {
            return null;
        }
    }

    function getUISetting() {
        if (!uiSetting) {
            uiSetting = newAvroSettings();
        }
        return uiSetting;
    }

    function readPin(s) {
        let pinned = s && hasKey(s, 'preview-pinned') ? s.get_boolean('preview-pinned') : false;
        let x = s && hasKey(s, 'preview-pin-x') ? s.get_int('preview-pin-x') : -1;
        let y = s && hasKey(s, 'preview-pin-y') ? s.get_int('preview-pin-y') : -1;
        return { pinned: pinned, x: x, y: y };
    }

    function getPreviewUI() {
        if (previewUI || previewUITried) {
            return previewUI;
        }
        previewUITried = true;
        if (!previewModule || typeof previewModule.createPreviewWindow !== 'function') {
            return null;
        }
        let s = getUISetting();
        let pin = readPin(s);
        previewUI = previewModule.createPreviewWindow({
            iconPath: eevars.get_pkgdatadir() + "/icons/avro-bangla.png",
            theme: s && hasKey(s, 'preview-theme') ? s.get_string('preview-theme') : 'classic',
            pinned: pin.pinned,
            pinX: pin.x,
            pinY: pin.y,
            onCandidateActivated: function(index) {
                if (previewOwner) {
                    selectAndCommit(previewOwner, index);
                }
            },
            onPinChanged: function(pinned, x, y) {
                let st = getUISetting();
                if (!st) return;
                try {
                    if (x >= 0 && y >= 0 && hasKey(st, 'preview-pin-x')) {
                        st.set_int('preview-pin-x', x);
                        st.set_int('preview-pin-y', y);
                    }
                    if (hasKey(st, 'preview-pinned')) {
                        st.set_boolean('preview-pinned', pinned);
                    }
                } catch (e) {}
            }
        });
        if (previewUI && s) {
            s.connect('changed', function(settings, key) {
                if (!previewUI) return;
                try {
                    if (key === 'preview-theme') {
                        previewUI.setTheme(settings.get_string('preview-theme'));
                    } else if (key === 'preview-pinned' || key === 'preview-pin-x' || key === 'preview-pin-y') {
                        let p = readPin(settings);
                        previewUI.setPinned(p.pinned, p.x, p.y);
                    }
                } catch (e) {}
            });
        }
        return previewUI;
    }

    function sessionInfo() {
        let sessionType = (GLib.getenv("XDG_SESSION_TYPE") || "").toLowerCase();
        let currentDesktop = (GLib.getenv("XDG_CURRENT_DESKTOP") || "").toUpperCase();
        return {
            wayland: sessionType === "wayland",
            gnome: currentDesktop.indexOf("GNOME") !== -1
        };
    }

    // How suggestions are shown while typing:
    //   'classic' - Avro's own Windows-style Preview Window (X11 / XWayland)
    //   'system'  - the desktop's IBus candidate panel (GNOME Shell, ibus-ui-gtk3, ...)
    //   'none'    - inline preedit only
    function presentationFor(engine) {
        if (!engine.setting_switch_preview) {
            return 'none';
        }
        let session = sessionInfo();
        // On KDE Plasma (and other non-GNOME) Wayland sessions, mapping the
        // ibus-ui-gtk3 candidate window triggers focus-out on the active editor.
        let systemPanelSafe = !(session.wayland && !session.gnome);
        let style = engine.setting_preview_style || 'auto';

        if (style === 'system') {
            return systemPanelSafe ? 'system' : 'none';
        }
        // Prefer Avro's Windows-style floating preview window beside the caret
        if (getPreviewUI()) {
            return 'classic';
        }
        return systemPanelSafe ? 'system' : 'none';
    }

    function showPreviewWindow(engine) {
        let ui = getPreviewUI();
        if (!ui) return;
        previewOwner = engine;
        try {
            ui.update(engine.buffertext, engine.currentSuggestions, engine.currentSelection, engine.cursorRect);
        } catch (e) {}
    }

    function hidePreviewWindow(engine) {
        if (previewUI && (!engine || previewOwner === engine)) {
            try { previewUI.hide(); } catch (e) {}
            previewOwner = null;
        }
    }

    function showSystemPanel(engine) {
        try {
            engine.lookuptable.clear();
            engine.currentSuggestions.forEach(function(word) {
                engine.lookuptable.append_candidate(IBus.Text.new_from_string(word));
            });
            engine.lookuptable.set_cursor_pos(engine.currentSelection);
            // The English text typed so far, shown above the list like on Windows
            engine.update_auxiliary_text(IBus.Text.new_from_string(engine.buffertext), true);
            if (typeof engine.update_lookup_table_fast === 'function') {
                engine.update_lookup_table_fast(engine.lookuptable, true);
            } else {
                engine.update_lookup_table(engine.lookuptable, true);
            }
        } catch (e) {
            hideSystemPanel(engine);
        }
    }

    function hideSystemPanel(engine) {
        try {
            if (engine.lookuptable) engine.lookuptable.clear();
            engine.hide_lookup_table();
        } catch (e) {}
        try { engine.hide_auxiliary_text(); } catch (e) {}
    }

    function showComposition(engine) {
        // Preedit is the primary composition channel. Update it first so a
        // preview failure can never make typed text vanish.
        preeditCandidate(engine);

        let mode = presentationFor(engine);
        engine.presentation = mode;
        if (mode !== 'classic') {
            hidePreviewWindow(engine);
        }
        if (mode !== 'system') {
            hideSystemPanel(engine);
        }
        if (mode === 'classic') {
            hideSystemPanel(engine);
            showPreviewWindow(engine);
        } else if (mode === 'system') {
            showSystemPanel(engine);
        }
    }

    /* =========================================================================== */
    /*                  Engine Utility Functions                                   */
    /* =========================================================================== */

    var suggestionBuilder = new suggestion.SuggestionBuilder();

    function initSetting(engine) {
        try {
            engine.setting = newAvroSettings();
            if (!engine.setting) {
                throw new Error("schema com.omicronlab.avro is not installed");
            }
            engine.settingHandler = engine.setting.connect('changed', function() {
                readSetting(engine);
            });
            readSetting(engine);
        } catch (e) {
            // Default settings fallback if GSettings schema is not yet compiled
            engine.setting = null;
            engine.output_encoding = 'unicode';
            engine.setting_switch_preview = true;
            engine.setting_switch_dict = true;
            engine.setting_switch_newline = false;
            engine.setting_lutable_size = 15;
            engine.setting_cboxorient = 1;
            engine.setting_preview_style = 'auto';
            engine.lookuptable.set_orientation(1);
            engine.lookuptable.set_page_size(15);
        }
    }

    function readSetting(engine) {
        if (!engine.setting) return;
        try {
            let prevEncoding = engine.output_encoding;
            engine.output_encoding = hasKey(engine.setting, 'output-encoding')
                ? engine.setting.get_string('output-encoding') : 'unicode';
            if (prevEncoding !== undefined && prevEncoding !== engine.output_encoding) {
                updateEngineProperty(engine);
            }
            engine.setting_switch_preview = engine.setting.get_boolean('switch-preview');
            engine.setting_switch_dict = engine.setting.get_boolean('switch-dict');
            engine.setting_switch_newline = engine.setting.get_boolean('switch-newline');
            engine.setting_cboxorient = engine.setting.get_int('cboxorient');
            engine.lookuptable.set_orientation(engine.setting_cboxorient);
            engine.setting_lutable_size = engine.setting.get_int('lutable-size');
            engine.lookuptable.set_page_size(engine.setting_lutable_size);
            engine.setting_preview_style = hasKey(engine.setting, 'preview-style')
                ? engine.setting.get_string('preview-style') : 'auto';

            // Fixed keyboard layouts and their typing options
            let s = engine.setting;
            let flag = (key) => hasKey(s, key) ? s.get_boolean(key) : true;
            engine.setting_numpad_bangla = flag('fixed-numpad-bangla');
            applyTyperOptions(engine, {
                style: hasKey(s, 'fixed-typing-style') ? s.get_string('fixed-typing-style') : 'modern',
                oldReph: flag('fixed-old-reph'),
                vowelForming: flag('fixed-vowel-forming'),
                fixChandra: flag('fixed-fix-chandra')
            });
            applyLayout(engine, hasKey(s, 'keyboard-layout') ? s.get_string('keyboard-layout') : 'phonetic');

            var dictPref = suggestionBuilder.getPref();
            dictPref.dictEnable = engine.setting_switch_dict;
            suggestionBuilder.setPref(dictPref);

            try {
                let m = engine.setting.get_boolean('mode-bangla');
                if (engine.mode_bangla !== m) {
                    if (engine.buffertext && engine.buffertext.length > 0) {
                        commitCandidate(engine);
                    }
                    engine.mode_bangla = m;
                    updateEngineProperty(engine);
                }
            } catch (e) {}

            // Apply preview changes immediately if a word is being typed
            if (engine.buffertext && engine.buffertext.length > 0) {
                showComposition(engine);
            }
        } catch (e) {}
    }

    function resetAll(engine) {
        engine.currentSuggestions = [];
        engine.currentSelection = 0;

        engine.buffertext = "";
        engine.lookuptable.clear();
        engine.hide_preedit_text();
        engine.hide_auxiliary_text();
        engine.hide_lookup_table();
        hidePreviewWindow(engine);
    }

    function updateCurrentSuggestions(engine) {
        var res = null;
        try {
            res = suggestionBuilder.suggest(engine.buffertext);
        } catch (e) {
            // Never consume a key and leave the client with no visible preedit.
            // The literal buffer is a privacy-safe, lossless fallback.
            res = { words: [engine.buffertext], prevSelection: 0 };
        }
        let words = res && Array.isArray(res['words']) ? res['words'] : [];
        engine.currentSuggestions = words.slice(0, engine.setting_lutable_size || 15);
        if (engine.currentSuggestions.length === 0 && engine.buffertext.length > 0) {
            engine.currentSuggestions = [engine.buffertext];
        }
        engine.currentSelection = Math.min(res && res['prevSelection'] || 0, engine.currentSuggestions.length - 1);
        if (engine.currentSelection < 0) engine.currentSelection = 0;

        showComposition(engine);
    }

    function preeditCandidate(engine) {
        if (engine.currentSuggestions.length <= 0) {
            engine.hide_preedit_text();
            return;
        }
        showPreedit(engine, engine.currentSuggestions[engine.currentSelection] || "");
    }

    function showPreedit(engine, word) {
        if (!word) {
            engine.hide_preedit_text();
            return;
        }
        // Output as ANSI: the word in progress is shown as it will be
        // committed, so when focus moves away and the client keeps the
        // preedit (PreeditFocusMode.COMMIT), the text is Bijoy as well.
        word = formatOutput(engine, word);
        dbg(engine, 'preedit shown (' + Array.from(word).length + ' characters)');
        var preeditText = IBus.Text.new_from_string(word);
        var attrs = new IBus.AttrList();
        let cursorPos = Array.from(word).length;
        attrs.append(IBus.Attribute.new(
            IBus.AttrType.UNDERLINE,
            IBus.AttrUnderline.SINGLE,
            0,
            cursorPos
        ));
        preeditText.set_attributes(attrs);
        if (typeof engine.update_preedit_text_with_mode === 'function') {
            // COMMIT: on focus change or reset the visible word stays in the field
            engine.update_preedit_text_with_mode(preeditText, cursorPos, true, PREEDIT_COMMIT);
        } else {
            engine.update_preedit_text(preeditText, cursorPos, true);
        }
    }

    function commitCandidate(engine) {
        commitCandidateWithSuffix(engine, "");
    }

    function commitCandidateWithSuffix(engine, suffix) {
        if (engine.buffertext.length > 0 && engine.currentSuggestions.length > 0) {
            var selectedWord = engine.currentSuggestions[engine.currentSelection] || engine.buffertext;
            var textToCommit = selectedWord + (suffix !== undefined ? suffix : "");
            dbg(engine, 'commit (' + Array.from(textToCommit).length + ' characters)');
            var formatted = formatOutput(engine, textToCommit);
            var commitText = IBus.Text.new_from_string(formatted);
            engine.commit_text(commitText);
            suggestionBuilder.stringCommitted(engine.buffertext, selectedWord);
        } else if (engine.buffertext.length > 0) {
            // Preserve input even if an optional suggestion provider failed.
            var formatted = formatOutput(engine, engine.buffertext + (suffix || ""));
            engine.commit_text(IBus.Text.new_from_string(formatted));
        } else if (suffix) {
            var formatted = formatOutput(engine, suffix);
            engine.commit_text(IBus.Text.new_from_string(formatted));
        }

        resetAll(engine);
    }

    function incSelection(engine) {
        if (engine.currentSuggestions.length <= 0) return;
        var lastIndex = engine.currentSuggestions.length - 1;

        if ((engine.currentSelection + 1) > lastIndex) {
            engine.currentSelection = -1;
        }
        ++engine.currentSelection;
        suggestionBuilder.updateCandidateSelection(engine.buffertext, engine.currentSuggestions[engine.currentSelection]);
        showComposition(engine);
    }

    function decSelection(engine) {
        if (engine.currentSuggestions.length <= 0) return;
        if ((engine.currentSelection - 1) < 0) {
            engine.currentSelection = engine.currentSuggestions.length;
        }
        --engine.currentSelection;
        suggestionBuilder.updateCandidateSelection(engine.buffertext, engine.currentSuggestions[engine.currentSelection]);
        showComposition(engine);
    }

    function runPreferences() {
        // Always a separate process: a GTK main loop must never block the engine.
        try {
            let launcher = GLib.find_program_in_path("avro-preferences");
            if (launcher) {
                GLib.spawn_command_line_async(launcher);
                return;
            }
        } catch (e) {}
        try {
            let prefApp = eevars.get_pkgdatadir() + "/preferences/pref.js";
            GLib.spawn_command_line_async("gjs " + prefApp + " --standalone");
        } catch (err) {}
    }

    /* =========================================================================== */
    /*                           IBus Factory                                      */
    /* =========================================================================== */

    var factory = IBus.Factory.new(bus.get_connection());
    factory.connect('create-engine', _create_engine_cb);

    var component = null;
    try {
        component = new IBus.Component({
            name: "org.freedesktop.IBus.Avro",
            description: "Avro Phonetic Bengali Input Method",
            version: eevars.get_version(),
            license: "MPL-2.0",
            author: "Sarim Khan <sarim2005@gmail.com>",
            homepage: "https://github.com/msbsurfi/avro-linux",
            command_line: eevars.get_pkgdatadir() + "/engine/main-gjs.js --ibus",
            textdomain: "avro-linux"
        });
    } catch (error) {
        component = new IBus.Component({
            name: "org.freedesktop.IBus.Avro",
            description: "Avro Phonetic Bengali Input Method",
            version: eevars.get_version(),
            license: "MPL-2.0",
            author: "Sarim Khan <sarim2005@gmail.com>",
            homepage: "https://github.com/msbsurfi/avro-linux",
            exec: eevars.get_pkgdatadir() + "/engine/avro-engine --ibus",
            textdomain: "avro-linux"
        });
    }

    var avroenginedesc1 = new IBus.EngineDesc({
        name: "ibus-avro",
        longname: "Avro Phonetic",
        description: "Avro Phonetic Bengali Input Method",
        language: "bn",
        license: "MPL-2.0",
        author: "Sarim Khan <sarim2005@gmail.com>",
        icon: "avro-bangla",
        layout: "us",
        setup: "/usr/bin/env gjs " + eevars.get_pkgdatadir() + "/preferences/pref.js --standalone",
        rank: 99
    });

    var avroenginedesc2 = new IBus.EngineDesc({
        name: "avro-phonetic",
        longname: "Avro Phonetic",
        description: "Avro Phonetic Bengali Input Method",
        language: "bn",
        license: "MPL-2.0",
        author: "Sarim Khan <sarim2005@gmail.com>",
        icon: "avro-bangla",
        layout: "us",
        setup: "/usr/bin/env gjs " + eevars.get_pkgdatadir() + "/preferences/pref.js --standalone",
        rank: 99
    });

    component.add_engine(avroenginedesc1);
    component.add_engine(avroenginedesc2);

    if (exec_by_ibus) {
        bus.request_name("org.freedesktop.IBus.Avro", 0);
    } else {
        bus.register_component(component);
        bus.request_name("org.freedesktop.IBus.Avro", 0);
    }

    // Ensure IBus floating property panel is disabled (prevents unwanted 8.8x32.8 window)
    try {
        GLib.spawn_command_line_async("gsettings set org.freedesktop.ibus.panel show 0");
    } catch (e) {}

    IBus.main();
} else {
    print("Exiting because IBus Bus not found, maybe the daemon is not running?");
}
