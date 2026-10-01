# Licensing and Attribution Notes: Avro Linux

## 1. Executive Summary

Avro Linux is built upon proven, mature open-source software licensed primarily under the **Mozilla Public License Version 2.0 (MPL-2.0)**, with metadata under **CC0-1.0**. All original copyright headers, attribution, and license terms are strictly honored and preserved in accordance with Rule 5 of the Developer Specification.

---

## 2. Component Licensing Breakdown

### 2.1 Core Phonetic & Language Processing Libraries
* **Files:**
  * `src/avro-core/phonetic/avrolib.js` (Original: `avrolib.js`)
  * `src/avro-core/phonetic/avroregexlib.js` (Original: `avroregexlib.js`)
  * `src/avro-core/suggestions/suggestionbuilder.js` (Original: `suggestionbuilder.js`)
  * `src/avro-core/dictionary/dbsearch.js` (Original: `dbsearch.js`)
* **Copyright:**
  * Copyright (C) OmicronLab (`http://www.omicronlab.com`). All Rights Reserved.
  * Initial Developers: Rifat Nabi (`to.rifat@gmail.com`), Dr. Mehdi Hasan Khan (`mhasan@omicronlab.com`)
* **License:** Mozilla Public License Version 2.0 (MPL-2.0)

### 2.2 Dictionaries and Language Data
* **Files:**
  * `src/avro-core/dictionary/avrodict.js` (Phonetic dictionary data)
  * `src/avro-core/dictionary/suffixdict.js` (Suffix inflection data)
  * `src/avro-core/autocorrect/autocorrect.js` (Typo & abbreviation mappings)
* **Copyright:**
  * Copyright (C) OmicronLab (`http://www.omicronlab.com`)
* **License:** Mozilla Public License Version 2.0 (MPL-2.0)

### 2.3 IBus Engine Runtime
* **Files:**
  * `src/engine/main-gjs.js` (IBus engine and key processing)
  * `src/common/evars.js` (Path helpers)
* **Copyright:**
  * Copyright (C) Sarim Khan (`http://www.sarimkhan.com`, `sarim2005@gmail.com`)
  * Contributor(s): Dr. Mehdi Hasan Khan (`mhasan@omicronlab.com`)
* **License:** Mozilla Public License Version 2.0 (MPL-2.0)

### 2.4 Preferences & UI Subsystem
* **Files:**
  * `src/preferences/` (GTK preferences application)
  * `data/gsettings/com.omicronlab.avro.gschema.xml` (GSettings schema)
* **Copyright:**
  * Original: Copyright (C) Sarim Khan / OmicronLab
  * Extensions & Modernizations: Avro Linux Contributors
* **License:** Mozilla Public License Version 2.0 (MPL-2.0)

### 2.5 Algorithms & Utilities
* **File:** `levenshtein.js`
  * Source: Algorithmic implementation of Damerau-Levenshtein distance based on Wikibooks and Wikipedia algorithms.
  * Status: Permissive / Public Domain.

### 2.6 AppStream Metadata
* **File:** `data/metainfo/com.github.sarim.ibus.avro.metainfo.xml`
* **Copyright:** Copyright (C) 2019 Sarim Khan, 2024-2026 Avro Linux Contributors
* **License:** Creative Commons Zero v1.0 Universal (CC0-1.0)

### 2.7 Packaging & Debian Metadata
* **Files:** `debian/*`
* **Copyright:**
  * Copyright (C) 2019-2023 Gunnar Hjalmarsson (`gunnarhj@debian.org`)
  * Copyright (C) 2024 Boyuan Yang (`byang@debian.org`)
  * Copyright (C) 2026 Avro Linux Contributors
* **License:** Mozilla Public License Version 2.0 (MPL-2.0)

---

## 3. Compliance Obligations Checklist

1. **Preserve Notices:** All source files originating from OmicronLab and Sarim Khan retain their original copyright notices and MPL-2.0 block headers.
2. **Availability of Source:** Under MPL-2.0 section 3.1, any modifications made to Covered Software are documented and made available under the terms of MPL-2.0.
3. **Attribution:** The `About` section of the Preferences UI and `README.md` explicitly credit OmicronLab, Dr. Mehdi Hasan Khan, Rifat Nabi, Sarim Khan, and Debian maintainers.
4. **Machine-Readable Debian Copyright:** `debian/copyright` strictly adheres to the `DEP-5` (Copyright format 1.0) specification.
