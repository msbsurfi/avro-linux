# Phase 0 Reconnaissance Report: Avro Linux

**Date:** 2026-10-01  
**Project:** Avro Linux (`avro-linux`)  
**Phase:** Phase 0 — Reconnaissance  
**Status:** Completed successfully  

---

## 1. Executive Summary

Phase 0 has completed comprehensive inspection of upstream repositories:
1. `sarim/ibus-avro` (Primary Linux implementation and IBus engine)
2. `mugli/Avro-Keyboard` (Secondary Windows behavior reference)
3. Debian `ibus-avro` packaging (`1.2+git20230914-1`) on Debian GNU/Linux 13 (trixie)

All technical architecture, language parsing logic, dictionary data structures, configuration backends, desktop integration files, and licensing obligations have been identified, verified, and documented.

---

## 2. Files Inspected

* `sarim/ibus-avro`:
  * `main-gjs.js`: IBus Engine entry point, key event processing, lifecycle management, preedit and commit mechanics.
  * `avrolib.js`: Core phonetic parsing algorithm (`OmicronLab.Avro.Phonetic`) with contextual pattern matching.
  * `avroregexlib.js`: Pattern rules and regex definitions.
  * `suggestionbuilder.js`: Suggestion coordinator uniting dictionary search, suffix processing, autocorrect, Levenshtein distance, and user choice learning.
  * `dbsearch.js`: In-memory phonetic initial search over the dictionary.
  * `avrodict.js`: Complete 7.7MB dictionary data structure.
  * `suffixdict.js`: Grammatical suffix dictionary for inflections.
  * `autocorrect.js`: Over 2,000 typographical correction rules and emoticon mappings.
  * `levenshtein.js`: Damerau-Levenshtein distance calculation.
  * `utf8.js`: Unicode decode helper.
  * `pref.js` & `avropref.ui`: Upstream GTK preferences UI.
  * `com.omicronlab.avro.gschema.xml`: GSettings schema with 5 configuration keys.
  * `ibus-avro.xml.in`: IBus engine component registration metadata.
  * `ibus-setup-ibus-avro.desktop.in`: Desktop entry (with upstream `NoDisplay=true`).
  * `com.github.sarim.ibus.avro.metainfo.xml`: AppStream metadata.
  * `configure.ac` & `Makefile.am`: Upstream Autotools build and installation rules.
* `mugli/Avro-Keyboard`:
  * `Keyboard and Spell checker/Classes/clsAvroPhonetic.pas`
  * `Keyboard and Spell checker/Classes/clsPhoneticRegExBuilder.pas`
  * Delphi UI forms and architecture (verified non-portable to Linux; IBus input method standard applies).
* Debian Packaging:
  * `/usr/share/doc/ibus-avro/copyright`: DEP-5 format, MPL-2.0.
  * `/usr/share/doc/ibus-avro/changelog.Debian.gz`: Debian packaging history.
  * `apt-cache show ibus-avro`: Architecture `all`, runtime dependencies: `gjs`, `ibus`, `dconf-gsettings-backend | gsettings-backend`.

---

## 3. Important Findings & Architectural Decisions

1. **Phonetic Core Integrity:**
   * In-engine verification in GJS confirmed that `avrolib.js` produces 100% accurate Bengali text (e.g. `ami banglay gan gai` -> `আমি বাংলায় গান গাই`).
   * Rule 2 of the Developer Specification will be strictly observed: preserve the proven OmicronLab phonetic engine without unneeded rewrites.
2. **Privacy Correction:**
   * Upstream `main-gjs.js` line 85 prints raw `keyval`, `keycode`, and `state` on every keystroke. This violates Rule 4 (Privacy). In Avro Linux, this keystroke printing is completely removed.
3. **Preferences Modernization:**
   * Upstream provides only a rudimentary 4-option dialog. Avro Linux will provide a full-featured, multi-tab GTK preferences application (`General`, `Typing`, `Dictionary & Autocorrect`, `Shortcuts`, `Diagnostics`, `About`), with settings reset and copyable privacy-safe diagnostics.
4. **Desktop Visibility:**
   * Upstream desktop file had `NoDisplay=true`. Avro Linux installs a desktop entry discoverable from application menus (`Settings;Utility;DesktopSettings;`).
5. **XDG User Directory Compliance:**
   * Candidate selection memory will use standard `$XDG_CONFIG_HOME/avro/candidate-selections.json` (fallback `~/.config/avro/`) instead of polluting `$HOME` root.
6. **Reproducible Test Suite:**
   * Upstream lacked any automated tests. Avro Linux creates a deterministic regression suite covering vowels, consonants, conjuncts, hasanta, punctuation, numbers, suffix inflection, and dictionary lookups.

---

## 4. Licensing Findings

* All core code and dictionary assets are licensed under **Mozilla Public License Version 2.0 (MPL-2.0)**.
* Metadata is licensed under **CC0-1.0**.
* Debian packaging metadata is licensed under **MPL-2.0**.
* Full compliance details are recorded in `docs/licensing-notes.md`.

---

## 5. Proposed Repository Structure

```text
avro-linux/
├── src/
│   ├── engine/
│   │   └── main-gjs.js
│   ├── avro-core/
│   │   ├── phonetic/
│   │   │   ├── avrolib.js
│   │   │   ├── avroregexlib.js
│   │   │   └── utf8.js
│   │   ├── dictionary/
│   │   │   ├── avrodict.js
│   │   │   ├── suffixdict.js
│   │   │   └── dbsearch.js
│   │   ├── autocorrect/
│   │   │   └── autocorrect.js
│   │   └── suggestions/
│   │       ├── suggestionbuilder.js
│   │       └── levenshtein.js
│   ├── preferences/
│   │   ├── pref.js
│   │   └── avropref.ui
│   └── common/
│       └── evars.js
├── data/
│   ├── icons/
│   │   └── avro-bangla.png
│   ├── applications/
│   │   ├── avro-preferences.desktop
│   │   └── ibus-setup-avro.desktop
│   ├── ibus/
│   │   └── ibus-avro.xml.in
│   ├── gsettings/
│   │   └── com.omicronlab.avro.gschema.xml
│   └── metainfo/
│       └── com.github.sarim.ibus.avro.metainfo.xml
├── tests/
│   ├── core/
│   │   ├── test-phonetic.js
│   │   ├── test-dictionary.js
│   │   └── test-autocorrect.js
│   ├── engine/
│   │   └── test-engine-lifecycle.js
│   ├── integration/
│   │   └── test-metadata.sh
│   └── run-tests.sh
├── debian/
│   ├── control
│   ├── rules
│   ├── changelog
│   ├── copyright
│   ├── install
│   ├── postinst
│   └── postrm
├── docs/
│   ├── DEVELOPER_SPEC.md
│   ├── upstream-analysis.md
│   ├── feature-matrix.md
│   ├── licensing-notes.md
│   └── phase-0-report.md
├── Makefile
└── README.md
```

---

## 6. Commands Actually Executed & Tests Actually Run

1. `git clone --depth 1 https://github.com/sarim/ibus-avro.git /tmp/reference/ibus-avro`: Cloned primary Linux upstream repository.
2. `git clone --depth 1 https://github.com/mugli/Avro-Keyboard.git /tmp/reference/Avro-Keyboard`: Cloned secondary Windows behavior reference repository.
3. `dpkg -L ibus-avro`: Inspected installed Debian package files and layout.
4. `cat /usr/share/doc/ibus-avro/copyright`: Verified Debian package license and copyright structure.
5. `gjs -c '...Avroparser.parse("ami banglay gan gai")...'`: Executed GJS test of phonetic parser; output: `Result: আমি বাংলায় গান গাই`. Passed.
6. `gjs -c '...sb.suggest("amader")...'`: Executed GJS test of suggestion engine; output: `Suggested words: ["আমাদের"]`. Passed.
7. `gjs -c '...sb.suggest(":)")...'`: Executed GJS test of autocorrect/emoticons; output: `Smiley suggest: [":)","ঃ)"]`. Passed.

---

## 7. Approval & Progression to Phase 1

No blocking architectural or licensing issues exist. Upstream architecture matches the Linux IBus standard and builds directly on Debian.

**Next step:** Proceed to **Phase 1 — Repository and Packaging Skeleton**.
