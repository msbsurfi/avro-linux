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

const IBus = imports.gi.IBus;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// Determine base directory and configure module search paths
let baseDir = '/usr/share/avro-linux';
try {
    let scriptPath = ARGV[0] || '.';
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    } else if (GLib.file_test(scriptDir + '/../src/common/evars.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir) + '/src';
    }
} catch (e) {}

imports.searchPath.unshift(baseDir + '/common');
imports.searchPath.unshift(baseDir + '/src/common');
imports.searchPath.unshift('/usr/share/avro-linux/common');

const eevars = imports.evars;
eevars.init_search_paths(baseDir);

const suggestion = imports.suggestionbuilder;

var prefwindow = null;
try {
    prefwindow = imports.pref;
} catch (e) {
    // Loaded on-demand in runPreferences()
}

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

        engine.connect('process-key-event', engine_process_key_event);
        engine.connect('candidate-clicked', engine_candidate_clicked);
        engine.connect('focus-out', engine_focus_out);
        engine.connect('focus-in', engine_focus_in);
        engine.connect('property-activate', engine_property_activate);

        engine.lookuptable = IBus.LookupTable.new(16, 0, true, true);        
        resetAll(engine);
        initSetting(engine);
        return engine;
    }
    
    function updateEngineProperty(engine) {
        if (!engine.mode_bangla) {
            prop_mode.set_label(IBus.Text.new_from_string("English"));
            prop_mode.set_symbol(IBus.Text.new_from_string("En"));
        } else {
            prop_mode.set_label(IBus.Text.new_from_string("বাংলা (Avro)"));
            prop_mode.set_symbol(IBus.Text.new_from_string("বা"));
        }
        engine.update_property(prop_mode);
    }

    function engine_process_key_event(engine, keyval, keycode, state) {
        // Privacy rule: Never log raw keyval, keycode, or user input text

        // Check for F12 (Toggle Bangla / English mode)
        if (keyval === IBus.KEY_F12 || keyval === IBus.F12) {
            let isRelease = (state & IBus.ModifierType.RELEASE_MASK) !== 0;
            if (!isRelease) {
                engine.mode_bangla = !engine.mode_bangla;
                if (engine.buffertext && engine.buffertext.length > 0) {
                    resetAll(engine);
                }
                updateEngineProperty(engine);
                try {
                    if (engine.setting) {
                        engine.setting.set_boolean('mode-bangla', engine.mode_bangla);
                    }
                } catch (e) {}
            }
            return true;
        }

        // Ignore release events
        let isRelease = (state & IBus.ModifierType.RELEASE_MASK) !== 0;
        if (isRelease) {
            return false;
        }

        // Pass through keyboard shortcuts with Ctrl, Alt, Super (Mod4)
        let isControl = (state & IBus.ModifierType.CONTROL_MASK) !== 0;
        let isAlt = (state & IBus.ModifierType.MOD1_MASK) !== 0;
        let isSuper = (state & (IBus.ModifierType.SUPER_MASK | IBus.ModifierType.MOD4_MASK)) !== 0;

        if (isControl || isAlt || isSuper) {
            if (engine.buffertext && engine.buffertext.length > 0) {
                commitCandidate(engine);
            }
            return false;
        }

        // If in English mode, pass key events through to application directly
        if (!engine.mode_bangla) {
            return false;
        }

        // Pass modifier keys alone through (Shift, Control, Alt, CapsLock)
        if (keycode == 42 || keyval == IBus.Shift_L || keyval == IBus.Shift_R ||
            keyval == IBus.Control_L || keyval == IBus.Control_R ||
            keyval == IBus.Alt_L || keyval == IBus.Alt_R ||
            keyval == IBus.Caps_Lock) {
            return false;
        }

        // Candidate selection by number 1-9 while composing
        if (engine.buffertext.length > 0 && keyval >= 49 && keyval <= 57) {
            let idx = keyval - 49;
            if (idx < engine.currentSuggestions.length) {
                engine.currentSelection = idx;
                commitCandidateWithSuffix(engine, " ");
                return true;
            }
        }

        // Word boundaries and separators
        if (keyval === IBus.space || keyval === IBus.KEY_space) {
            if (engine.buffertext.length > 0) {
                commitCandidateWithSuffix(engine, " ");
                return true;
            }
        } else if (keyval === IBus.Return || keyval === IBus.KEY_Return || keyval === IBus.KP_Enter) {
            if (engine.buffertext.length > 0) {
                let suffix = (engine.setting_switch_newline) ? "\n" : "";
                commitCandidateWithSuffix(engine, suffix);
                return true;
            }
        } else if (keyval === IBus.Tab || keyval === IBus.KEY_Tab) {
            if (engine.buffertext.length > 0) {
                commitCandidateWithSuffix(engine, "\t");
                return true;
            }
        } else if (keyval === IBus.period || keyval === 46) {
            // Bengali Dari '।'
            if (engine.buffertext.length > 0) {
                commitCandidateWithSuffix(engine, "।");
                return true;
            } else {
                engine.commit_text(IBus.Text.new_from_string("।"));
                return true;
            }
        } else if (keyval === IBus.comma || keyval === 44) {
            if (engine.buffertext.length > 0) {
                commitCandidateWithSuffix(engine, ",");
                return true;
            }
        } else if (keyval === IBus.Escape || keyval === IBus.KEY_Escape) {
            if (engine.buffertext.length > 0) {
                resetAll(engine);
                return true;
            }
        } else if (keyval === IBus.BackSpace || keyval === IBus.KEY_BackSpace) {
            if (engine.buffertext.length > 0) {
                engine.buffertext = engine.buffertext.substr(0, engine.buffertext.length - 1);
                if (engine.buffertext.length <= 0) {
                    resetAll(engine);
                } else {
                    updateCurrentSuggestions(engine);
                }
                return true;
            }
        } else if (keyval === IBus.Left || keyval === IBus.KP_Left || keyval === IBus.Right || keyval === IBus.KP_Right) {
            if (engine.currentSuggestions.length > 1) {
                if (keyval === IBus.Left || keyval === IBus.KP_Left) {
                    decSelection(engine);
                } else {
                    incSelection(engine);
                }
                return true;
            } else if (engine.buffertext.length > 0) {
                commitCandidate(engine);
                return false;
            }
        } else if (keyval === IBus.Up || keyval === IBus.KP_Up || keyval === IBus.Down || keyval === IBus.KP_Down) {
            if (engine.currentSuggestions.length > 1) {
                if (keyval === IBus.Up || keyval === IBus.KP_Up) {
                    decSelection(engine);
                } else {
                    incSelection(engine);
                }
                return true;
            } else if (engine.buffertext.length > 0) {
                commitCandidate(engine);
                return false;
            }
        }

        // Process alphanumeric and keypad characters
        if ((keyval >= 33 && keyval <= 126) ||
            (keyval >= IBus.KP_0 && keyval <= IBus.KP_9) ||
             keyval == IBus.KP_Add ||
             keyval == IBus.KP_Decimal ||
             keyval == IBus.KP_Divide ||
             keyval == IBus.KP_Multiply ||
             keyval == IBus.KP_Subtract) {
            
            engine.buffertext += IBus.keyval_to_unicode(keyval);
            updateCurrentSuggestions(engine);
            return true;
        } else if (keyval == IBus.Control_L || 
                   keyval == IBus.Control_R || 
                   keyval == IBus.Insert || 
                   keyval == IBus.KP_Insert || 
                   keyval == IBus.Delete || 
                   keyval == IBus.KP_Delete || 
                   keyval == IBus.Home || 
                   keyval == IBus.KP_Home || 
                   keyval == IBus.Page_Up || 
                   keyval == IBus.KP_Page_Up || 
                   keyval == IBus.Page_Down || 
                   keyval == IBus.KP_Page_Down || 
                   keyval == IBus.End || 
                   keyval == IBus.KP_End || 
                   keyval == IBus.Alt_L || 
                   keyval == IBus.Alt_R || 
                   keyval == IBus.Super_L || 
                   keyval == IBus.Super_R || 
                   keyval == IBus.KP_Enter) {
                
                commitCandidate(engine);
        }
        return false;
    }

    function engine_candidate_clicked(engine, index, button, state) {
        if (engine.buffertext.length > 0 && index >= 0 && index < engine.currentSuggestions.length) {
            engine.currentSelection = index;
            preeditCandidate(engine);
            suggestionBuilder.updateCandidateSelection(engine.buffertext, engine.currentSuggestions[engine.currentSelection]);
        }
    }

    function engine_focus_out(engine) {
        if (engine.buffertext.length > 0) {
            commitCandidate(engine);
        }
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
        engine.register_properties(proplist);
    }

    function engine_property_activate(engine, prop_name, prop_state) {    
        if (prop_name === 'setup') {
            runPreferences();
        } else if (prop_name === 'mode') {
            engine.mode_bangla = !engine.mode_bangla;
            if (engine.buffertext && engine.buffertext.length > 0) {
                resetAll(engine);
            }
            updateEngineProperty(engine);
        }
    }

    /* =========================================================================== */
    /*                  Engine Utility Functions                                   */
    /* =========================================================================== */
    
    var suggestionBuilder = new suggestion.SuggestionBuilder();
    
    function initSetting(engine) {
        try {
            engine.setting = Gio.Settings.new("com.omicronlab.avro");
            engine.setting.connect('changed', function() {
                readSetting(engine);
            });
            readSetting(engine);
        } catch (e) {
            // Default settings fallback if GSettings schema is not yet compiled
            engine.setting_switch_preview = true;
            engine.setting_switch_dict = true;
            engine.setting_switch_newline = false;
            engine.setting_lutable_size = 15;
            engine.lookuptable.set_orientation(0);
            engine.lookuptable.set_page_size(15);
        }
    }
    
    function readSetting(engine) {
        if (!engine.setting) return;
        try {
            engine.setting_switch_preview = engine.setting.get_boolean('switch-preview');
            engine.setting_switch_dict = engine.setting.get_boolean('switch-dict');
            engine.setting_switch_newline = engine.setting.get_boolean('switch-newline');
            engine.lookuptable.set_orientation(engine.setting.get_int('cboxorient'));
            engine.setting_lutable_size = engine.setting.get_int('lutable-size');
            engine.lookuptable.set_page_size(engine.setting_lutable_size);
            
            if (!engine.setting_switch_preview) {
                engine.setting_switch_dict = false;
                engine.setting_switch_newline = false;
            }
            
            var dictPref = suggestionBuilder.getPref();
            dictPref.dictEnable = engine.setting_switch_dict;
            suggestionBuilder.setPref(dictPref);

            try {
                let m = engine.setting.get_boolean('mode-bangla');
                if (engine.mode_bangla !== m) {
                    engine.mode_bangla = m;
                    updateEngineProperty(engine);
                }
            } catch (e) {}
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
    }
    
    function updateCurrentSuggestions(engine) {
        var res = suggestionBuilder.suggest(engine.buffertext);
        engine.currentSuggestions = res['words'].slice(0, engine.setting_lutable_size || 15);
        engine.currentSelection = res['prevSelection'] || 0;
        
        fillLookupTable(engine);
    }
    
    function fillLookupTable(engine) {
        // Do NOT call engine.update_auxiliary_text - that was the second overlay window flashing wildly!
        if (engine.setting_switch_preview && engine.setting_switch_dict && engine.currentSuggestions.length > 1) {
            engine.lookuptable.clear();
            engine.currentSuggestions.forEach(function(word, idx) {
                let wtext = IBus.Text.new_from_string(word);
                let wlabel = IBus.Text.new_from_string((idx + 1) + ". ");
                engine.lookuptable.append_candidate(wtext);
                engine.lookuptable.append_label(wlabel);
            });
            engine.lookuptable.set_cursor_pos(engine.currentSelection);
            engine.update_lookup_table_fast(engine.lookuptable, true);
        } else {
            engine.hide_lookup_table();
        }
        
        preeditCandidate(engine);
    }
    
    function preeditCandidate(engine) {
        if (engine.currentSuggestions.length <= 0) {
            engine.hide_preedit_text();
            return;
        }

        var selectedWord = engine.currentSuggestions[engine.currentSelection] || "";
        var preeditText = IBus.Text.new_from_string(selectedWord);
        var attrs = new IBus.AttrList();
        attrs.append(IBus.Attribute.new(
            IBus.AttrType.UNDERLINE,
            IBus.AttrUnderline.SINGLE,
            0,
            selectedWord.length
        ));
        preeditText.set_attributes(attrs);
        engine.update_preedit_text(preeditText, selectedWord.length, true);
    }
    
    function commitCandidate(engine) {
        commitCandidateWithSuffix(engine, "");
    }

    function commitCandidateWithSuffix(engine, suffix) {
        if (engine.buffertext.length > 0 && engine.currentSuggestions.length > 0) {
            var selectedWord = engine.currentSuggestions[engine.currentSelection] || "";
            var textToCommit = selectedWord + (suffix !== undefined ? suffix : "");
            var commitText = IBus.Text.new_from_string(textToCommit);
            engine.commit_text(commitText);
            suggestionBuilder.stringCommitted(engine.buffertext, selectedWord);
        } else if (suffix) {
            engine.commit_text(IBus.Text.new_from_string(suffix));
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
        preeditCandidate(engine);
        
        suggestionBuilder.updateCandidateSelection(engine.buffertext, engine.currentSuggestions[engine.currentSelection]);
    }
    
    function decSelection(engine) {
        if (engine.currentSuggestions.length <= 0) return;
        if ((engine.currentSelection - 1) < 0) {
            engine.currentSelection = engine.currentSuggestions.length;
        }
        --engine.currentSelection;
        preeditCandidate(engine);
        
        suggestionBuilder.updateCandidateSelection(engine.buffertext, engine.currentSuggestions[engine.currentSelection]);
    }
    
    function runPreferences() {
        try {
            if (!prefwindow) {
                prefwindow = imports.pref;
            }
            if (prefwindow && typeof prefwindow.runpref === 'function') {
                prefwindow.runpref();
                return;
            }
        } catch (e) {}

        // Fallback: spawn standalone preferences process
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
            version: "1.0.0",
            license: "MPL-2.0",
            author: "Sarim Khan <sarim2005@gmail.com>",
            homepage: "https://github.com/sarim/ibus-avro",
            command_line: eevars.get_pkgdatadir() + "/engine/main-gjs.js --ibus",
            textdomain: "avro-linux"
        });
    } catch (error) {
        component = new IBus.Component({
            name: "org.freedesktop.IBus.Avro",
            description: "Avro Phonetic Bengali Input Method",
            version: "1.0.0",
            license: "MPL-2.0",
            author: "Sarim Khan <sarim2005@gmail.com>",
            homepage: "https://github.com/sarim/ibus-avro",
            exec: eevars.get_pkgdatadir() + "/engine/main-gjs.js --ibus",
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
        icon: eevars.get_pkgdatadir() + "/icons/avro-bangla.png",
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
        icon: eevars.get_pkgdatadir() + "/icons/avro-bangla.png",
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
    }
    IBus.main();
} else {
    print("Exiting because IBus Bus not found, maybe the daemon is not running?");
}
