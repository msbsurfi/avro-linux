#!/usr/bin/env gjs
/* Per-user dictionary integration test. SPDX-License-Identifier: MPL-2.0 */

const GLib = imports.gi.GLib;
const rootDir = GLib.get_current_dir();
imports.searchPath.unshift(rootDir + '/src/avro-core/dictionary');
imports.searchPath.unshift(rootDir + '/src/avro-core/phonetic');
imports.searchPath.unshift(rootDir + '/src/avro-core/autocorrect');
imports.searchPath.unshift(rootDir + '/src/avro-core/suggestions');

const userdictionary = imports.userdictionary;
const suggestion = imports.suggestionbuilder;

let passed = 0;
let failed = 0;
function assertTrue(value, description) {
    if (value) passed++; else { failed++; print('FAIL: ' + description); }
}

let dictionary = new userdictionary.UserDictionary();
assertTrue(dictionary.add('amarnaam', 'আমার নাম'), 'A valid personal word is saved');
assertTrue(dictionary.get('AMARNAAM').indexOf('আমার নাম') !== -1, 'Lookup is case-insensitive');

let builder = new suggestion.SuggestionBuilder();
let result = builder.suggest('amarnaam');
assertTrue(result.words.indexOf('আমার নাম') !== -1, 'Personal word is offered by suggestions');
assertTrue(dictionary.remove('amarnaam', 'আমার নাম'), 'A personal word can be removed');
assertTrue(dictionary.get('amarnaam').length === 0, 'Removed word is no longer returned');
assertTrue(!dictionary.add('', 'বাংলা'), 'Invalid personal entries are rejected');

print('Results: ' + passed + ' passed, ' + failed + ' failed.');
imports.system.exit(failed ? 1 : 0);
