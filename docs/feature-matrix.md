# Avro Linux — Feature Matrix

This matrix compares the features across Windows Avro Keyboard (`mugli/Avro-Keyboard`), upstream Linux reference (`sarim/ibus-avro`), and **Avro Linux**.

| Feature | Windows Avro (`mugli`) | Linux Upstream (`sarim/ibus-avro`) | Required in Avro Linux | Implementation Source | Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phonetic Transliteration** | Yes (`clsAvroPhonetic.pas`) | Yes (`avrolib.js`) | **Yes** | Upstream `avrolib.js` | Verified in GJS / Suite planned |
| **Bengali Vowels & Consonants** | Yes | Yes | **Yes** | `avrolib.js` | Verified |
| **Bengali Conjuncts (যুক্তবর্ণ)** | Yes | Yes | **Yes** | `avrolib.js` | Verified |
| **Hasanta / Virama Handling** | Yes | Yes | **Yes** | `avrolib.js` | Verified |
| **Bengali Digits & Punctuation** | Yes | Yes | **Yes** | `avrolib.js` | Verified |
| **Dictionary Suggestions** | Yes (MS Access / SQLite) | Yes (`avrodict.js`, `dbsearch.js`) | **Yes** | Upstream `avrodict.js` & `dbsearch.js` | Verified |
| **Suffix-Assisted Expansion** | Yes | Yes (`suffixdict.js`) | **Yes** | Upstream `suffixdict.js` | Verified |
| **Autocorrect & Abbreviations** | Yes | Yes (`autocorrect.js`) | **Yes** | Upstream `autocorrect.js` | Verified |
| **Levenshtein Candidate Sorting** | Yes | Yes (`levenshtein.js`) | **Yes** | Upstream `levenshtein.js` | Verified |
| **User Selection Memory** | Yes | Partial (`~/.candidate-selections.json`) | **Yes (XDG standard)** | Refactored `suggestionbuilder.js` (`~/.config/avro/`) | Planned in test suite |
| **IBus Engine Integration** | No (Windows only) | Yes (`main-gjs.js`) | **Yes** | Refactored `src/engine/` | Planned in test suite |
| **Preedit & Auxiliary Text** | Custom overlay window | Yes (IBus native) | **Yes** | IBus preedit & auxiliary APIs | Planned in test suite |
| **Candidate Lookup Popup** | Custom Delphi window | Yes (IBus LookupTable) | **Yes** | IBus `LookupTable` | Planned in test suite |
| **Backspace & Buffer Editing** | Yes | Yes | **Yes** | IBus process key event | Planned in test suite |
| **Enter / Space / Tab Commit** | Yes | Yes | **Yes** | IBus process key event | Planned in test suite |
| **Candidate Selection via Arrows** | Yes | Yes | **Yes** | IBus process key event | Planned in test suite |
| **Focus Out Commit** | Yes | Yes | **Yes** | IBus focus-out event | Planned in test suite |
| **English / Bangla Mode Switch** | Yes (F12 hotkey) | Yes (IBus input source toggle) | **Yes** | IBus engine & desktop shortcut | Planned in test suite |
| **GSettings Configuration** | No (Windows Registry) | Yes (`com.omicronlab.avro`) | **Yes** | GSettings schema + dconf | Planned in test suite |
| **GTK Preferences App** | Delphi dialog | Basic 4-switch dialog | **Yes (Full Multi-Tab)** | Modern GTK Preferences (`src/preferences/`) | Planned in test suite |
| **Preferences: General Tab** | Partial | Partial | **Yes** | New GTK Preferences | Planned in test suite |
| **Preferences: Typing Tab** | Partial | Partial | **Yes** | New GTK Preferences | Planned in test suite |
| **Preferences: Dict & Autocorrect**| Partial | Partial | **Yes** | New GTK Preferences | Planned in test suite |
| **Preferences: Shortcuts Tab** | Yes | No | **Yes** | New GTK Preferences | Planned in test suite |
| **Preferences: Diagnostics Tab** | No | No | **Yes (Privacy-safe)** | New GTK Preferences | Planned in test suite |
| **Preferences: About Tab** | Yes | No | **Yes** | New GTK Preferences | Planned in test suite |
| **Reset Settings to Default** | Partial | No | **Yes** | GSettings reset | Planned in test suite |
| **Desktop Application Launcher** | Yes (Start menu) | Hidden (`NoDisplay=true`) | **Yes (Visible in menu)** | `data/applications/` | Packaging test |
| **IBus Setup Integration** | N/A | Yes | **Yes** | `ibus-setup-*.desktop` | Packaging test |
| **AppStream Metadata** | N/A | Basic | **Yes (Valid AppStream)** | `data/metainfo/` | Packaging test (`appstreamcli`) |
| **Application Icons** | ICO files | Single 50x50 PNG | **Yes (Hi-res & standard paths)**| `data/icons/` | Packaging test |
| **Debian Packaging (.deb)** | N/A | Minimal / Debian git | **Yes (Production .deb)**| `debian/` & Makefile | Planned in test suite |
| **Automated Regression Suite** | No | None | **Yes** | `tests/` test runner | Planned in test suite |
| **GitHub Actions CI** | Limited | None | **Yes** | `.github/workflows/ci.yml`| Planned in test suite |
| **Global Keyboard Hooks (X11/Win)**| Yes (`WH_KEYBOARD_LL`)| No | **No (Anti-pattern)** | N/A (IBus standard only) | N/A |
| **Floating Top Bar / Skins** | Yes | No | **No (Non-standard)** | N/A | N/A |
| **Avro Mouse (Click-to-Type)** | Yes | No | **No (Non-standard)** | N/A | N/A |
| **Cloud Typing / Telemetry** | No | No | **Forbidden (Rule 4)** | N/A | N/A |
