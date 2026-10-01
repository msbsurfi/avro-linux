# Upstream Analysis: Avro Linux

This document provides a thorough architectural inspection and technical analysis of the upstream repositories:
1. **Primary Linux upstream:** `sarim/ibus-avro` (`https://github.com/sarim/ibus-avro`)
2. **Secondary Windows behavior reference:** `mugli/Avro-Keyboard` (`https://github.com/mugli/Avro-Keyboard`)
3. **Debian packaging reference:** Debian `ibus-avro` package (`1.2+git20230914-1`)

---

## 1. Linux Engine Subsystem (`sarim/ibus-avro`)

### 1.1 Engine Entry Point & Process Model
* **Entry point file:** `main-gjs.js` executed via GJS (`#!/usr/bin/env gjs`).
* **Invocation:**
  * When invoked by the IBus daemon, IBus passes `--ibus` (`exec_by_ibus = (ARGV[0] == '--ibus')`).
  * If connected to the IBus daemon via D-Bus (`bus = new IBus.Bus()`, `bus.is_connected()`), it either requests the well-known bus name `org.freedesktop.IBus.Avro` (when started via `--ibus`) or calls `bus.register_component(component)`.
  * Runs the IBus GJS event loop using `IBus.main()`.

### 1.2 Engine Lifecycle & Factory
* **Engine Factory:** `IBus.Factory.new(bus.get_connection())` registers a callback `_create_engine_cb` for the `'create-engine'` signal.
* **Engine Instance:** Created via `new IBus.Engine({...})` with a unique object path `/org/freedesktop/IBus/Engine/<id>`.
* **Event Handlers Connected:**
  * `process-key-event`: handles physical key presses and releases.
  * `candidate-clicked`: handles mouse selection of suggestion candidates.
  * `focus-out`: commits active preedit candidate if buffer text is non-empty.
  * `focus-in`: registers engine properties with the IBus panel.
  * `property-activate`: launches the preferences window (`runPreferences()`).
* **State Initialization:**
  * Creates an `IBus.LookupTable` (default 16 entries, pageable).
  * Calls `resetAll(engine)` to clear buffer state.
  * Calls `initSetting(engine)` to connect to GSettings schema `com.omicronlab.avro`.

### 1.3 Key Event Processing & Sanitization
* **Key processing function:** `engine_process_key_event(engine, keyval, keycode, state)`
* **Sanitization:**
  * Modifiers masked with `state & IBus.ModifierType.MODIFIER_MASK`.
  * Key release events are skipped (`!(state == 0 || state == 1 || state == 16 || state == 17)`).
  * Shift keys captured.
* **Character Input:**
  * Printable ASCII (`33 <= keyval <= 126`) and Keypad characters (`KP_0` to `KP_9`, `KP_Add`, etc.) are converted to Unicode via `IBus.keyval_to_unicode(keyval)`.
  * Appended to `engine.buffertext`.
  * Triggers `updateCurrentSuggestions(engine)` and returns `true` (consuming the event).
* **Editing Keys:**
  * `IBus.BackSpace`: Truncates last character from `engine.buffertext`. If empty, calls `resetAll(engine)`. Returns `true`.
  * `IBus.Return`, `IBus.space`, `IBus.Tab`: Commits current candidate via `commitCandidate(engine)`. Depending on settings (`switch-newline`), may consume Return or let it pass through.
  * `IBus.Left`, `IBus.Right`, `IBus.Up`, `IBus.Down`: Used for navigating through the lookup table suggestion list (`incSelection`, `decSelection`) if candidates are visible; otherwise commits candidate.
  * Navigation / control keys (`Control_L`, `Alt_L`, `Delete`, `Escape`, `Home`, `End`): Calls `commitCandidate(engine)` to commit existing text before performing navigation.

### 1.4 Preedit, Commit, and Lookup Table
* **Auxiliary Text:** When preview is enabled (`switch-preview`), `engine.update_auxiliary_text(IBus.Text.new_from_string(engine.buffertext), true)` displays the Latin phonetic input above or beside the cursor.
* **Preedit Text:** `engine.update_preedit_text(preeditText, cursor_pos, true)` updates the inline text showing the active Bengali transliterated candidate.
* **Lookup Table:** When dictionary suggestions are enabled (`switch-dict`), `engine.lookuptable` is populated with matching Bengali words. `engine.update_lookup_table_fast(engine.lookuptable, true)` renders the popup list.
* **Commit:** `engine.commit_text(commitText)` emits the final Bengali text to the target application, calls `suggestionBuilder.stringCommitted(...)` to record learning/usage, and calls `resetAll(engine)`.

### 1.5 Surrounding Text & Focus
* When focus leaves the input field (`focus-out`), any uncommitted preedit is committed so text is not lost.
* On `focus-in`, IBus property menu ("Preferences - Avro") is registered with the desktop panel.

---

## 2. Avro Core Subsystem

### 2.1 Phonetic Parsing Engine (`avrolib.js`)
* **Algorithm Author:** Rifat Nabi / Dr. Mehdi Hasan Khan (OmicronLab), `jsAvroPhonetic`.
* **Mechanism:**
  * String normalization via `fixString(input)`: standardizes casing and phonetic representations.
  * Pattern-matching engine traversing input token by token against an ordered rules array (`this.data.patterns`).
  * Context-sensitive rules:
    * Lookahead (`suffix`) and lookbehind (`prefix`) conditions.
    * Character class scopes: `vowel`, `consonant`, `punctuation`, exact string matches, and negative scope matches (`!vowel`, `!consonant`).
  * Phonetic rule coverage:
    * Independent vowels: `a` (অ), `aa`/`A` (আ), `i` (ই), `ee`/`I` (ঈ), `u` (উ), `oo`/`U` (ঊ), `e` (এ), `oi` (ঐ), `o` (ও), `ou` (ঔ).
    * Dependent vowel signs (kar): া, ি, ী, ু, ূ, ৃ, ে, ৈ, ো, ৌ.
    * Consonants: `k`, `kh`, `g`, `gh`, `Ng`, `c`, `ch`, `j`, `jh`, `NG`, `T`, `Th`, `D`, `Dh`, `N`, `t`, `th`, `d`, `dh`, `n`, `p`, `ph`/`f`, `b`, `bh`/`v`, `m`, `z`, `r`, `l`, `sh`, `Sh`/`S`, `s`, `h`, `R`, `Rh`, `y`.
    * Conjuncts (যুক্তবর্ণ): e.g. `kk`, `kkh`, `kt`, `ks`, `kSh`, `gd`, `gn`, `gb`, `gm`, `gy`, `gr`, `gl`, `cch`, `jj`, `jjh`, `tt`, `tth`, `dd`, `ddh`, `nt`, `nth`, `nd`, `ndh`, `mp`, `mph`, `mb`, `mbh`, `mm`, `st`, `sth`, `sk`, `skh`, `sp`, `sph`, etc.
    * Hasanta / Virama (্) handling: implicit vowel suppression after consonants, explicit hasanta (`,,`), ZWNJ / ZWJ.
    * Bengali punctuation & digits: Bengali digits `0`-`9` (`০`-`৯`), Dari (`।` via `.`), double Dari (`॥`).

### 2.2 Dictionary Database (`avrodict.js` & `dbsearch.js`)
* **Data file:** `avrodict.js` (approx. 7.7 MB).
* **Structure:** A JavaScript object mapping phonetic initial buckets (`w_a`, `w_b`, `w_k`, etc.) to arrays of verified Bengali words.
* **Lookup Strategy (`dbsearch.js`):**
  * Determines table candidates from the initial English character.
  * Filters and matches dictionary entries against the phonetic prefix.
  * Highly efficient in-memory lookups without requiring external database engines like SQLite at runtime.

### 2.3 Suffix Engine (`suffixdict.js`)
* **Data file:** `suffixdict.js` (approx. 36 KB).
* **Function:** Maps common Bengali suffixes and inflectional markers (e.g. `-ra`, `-gulo`, `-te`, `-ke`, `-er`, `-der`, `-shob`, `-khana`, `-guli`) so root words in the dictionary can be suggested with valid grammatical inflections.

### 2.4 Autocorrect & Abbreviations (`autocorrect.js`)
* **Data file:** `autocorrect.js` (approx. 53 KB).
* **Mappings:** Contains over 2,000 common typographical corrections, emoticons (e.g., `:)` -> `:)`, `ঃ)`), contractions, and abbreviations.

### 2.5 Suggestions Engine (`suggestionbuilder.js`)
* **Coordinator:** Integrates classic phonetic transliteration (`avrolib`), dictionary search (`dbsearch`), suffix expansion (`suffixdict`), autocorrect (`autocorrect`), and candidate selection history.
* **Ranking:** Uses Damerau-Levenshtein distance (`levenshtein.js`) to sort dictionary candidates by relevance to the phonetic transcription.
* **User Selection Memory:** Remembers preferred word choices for ambiguous phonetic inputs and saves them to user storage.

---

## 3. Configuration Subsystem

* **Configuration Backend:** GSettings with dconf backend.
* **Schema ID:** `com.omicronlab.avro` (path `/com/omicronlab/avro/`).
* **Keys:**
  * `switch-preview` (boolean, default: `true`): Toggles candidate auxiliary/preview window.
  * `switch-dict` (boolean, default: `true`): Toggles dictionary-assisted suggestions.
  * `switch-newline` (boolean, default: `false`): Determines whether Enter key commits newline after candidate.
  * `lutable-size` (integer, default: `15`, range: 5–15): Number of candidates in lookup table.
  * `cboxorient` (integer, default: `0`): Orientation of lookup table (0 = horizontal, 1 = vertical).
* **Dynamic Updates:** Connected to Gio.Settings `'changed'` signal for live runtime updates without restarting the engine.

---

## 4. Packaging & Integration

* **Debian package:** `ibus-avro` (Architecture: `all`).
* **Dependencies:** `gjs`, `ibus`, `dconf-gsettings-backend | gsettings-backend`.
* **Component Registration:** `/usr/share/ibus/component/ibus-avro.xml`.
* **AppStream Metadata:** `/usr/share/metainfo/com.github.sarim.ibus.avro.metainfo.xml`.
* **Desktop Entry:** `/usr/share/applications/ibus-setup-ibus-avro.desktop`.

---

## 5. Identified Shortcomings & Opportunities in Upstream

1. **Privacy Flaw (Critical):**
   * Upstream `main-gjs.js` line 85 contains `print(keyval + " " + keycode + " " + state);`. This prints key information to standard output on every keystroke, which violates Rule 4 (Privacy). We must remove all raw keystroke logging.
2. **Desktop Launcher Hidden:**
   * `ibus-setup-ibus-avro.desktop.in` has `NoDisplay=true`. A regular user cannot discover or launch Avro Preferences from their desktop application menu.
3. **Preferences UI Incompleteness:**
   * Upstream preferences dialog (`pref.js` + `avropref.ui`) is a bare 4-switch dialog lacking tabs, diagnostics, shortcuts documentation, reset buttons, user dictionary view, and about/attribution.
4. **Non-Standard User Data Directory:**
   * `suggestionbuilder.js` hardcodes `$HOME/.candidate-selections.json` instead of respecting `$XDG_CONFIG_HOME` or `$XDG_DATA_HOME` (`~/.config/avro/`).
5. **Exception in Async Save Callback:**
   * In `suggestionbuilder.js`, line 432 has `this._logger(e, ...)` inside an unbound callback function, causing an uncaught ReferenceError if an error occurs.
6. **Lack of Automated Test Suite:**
   * Upstream had zero automated unit, regression, or integration tests.
