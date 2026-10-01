# Avro Linux

[![CI](https://github.com/avro-linux/avro-linux/actions/workflows/ci.yml/badge.svg)](https://github.com/avro-linux/avro-linux/actions/workflows/ci.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

**Avro Linux** is a modern, reliable, native Linux implementation of the popular **Avro Phonetic Bengali** typing method. It integrates seamlessly through the standard Linux **IBus** (Intelligent Input Bus) framework, enabling fast, phonetic Latin-to-Bengali transliteration across GTK, Qt, Electron, and terminal applications.

---

## Features

* **Authentic Avro Phonetic Transliteration:** Full support for vowels, consonants, vowel signs (*kar*), conjuncts (*যুক্তবর্ণ*), and *hasanta* rules based on OmicronLab's standard algorithm.
* **Smart Dictionary & Suffix Suggestions:** In-memory dictionary suggestions with grammatical inflection expansion.
* **Autocorrect & Learning:** Built-in autocorrect database and automatic candidate selection memory.
* **Linux-Native IBus Integration:** Clean IBus engine lifecycle without global hooks, background daemons, or X11 hacks.
* **Native GTK Preferences:** Discoverable preferences application featuring General, Typing, Dictionary & Autocorrect, Shortcuts, Privacy-safe Diagnostics, and About tabs.
* **Strict Privacy:** Zero telemetry, zero analytics, zero network transmission, and zero keystroke logging.
* **Debian Packaging:** Reproducible Debian packaging producing a clean `.deb` package.

---

## Architecture Overview

```text
avro-linux/
├── src/
│   ├── engine/              # IBus-facing engine lifecycle & key event processing
│   ├── avro-core/
│   │   ├── phonetic/        # Core transliteration & regex rules
│   │   ├── dictionary/      # In-memory dictionary search & suffix rules
│   │   ├── autocorrect/     # Typo correction & smiley mappings
│   │   └── suggestions/     # Suggestion ranking & candidate coordinator
│   ├── preferences/         # Native GTK preferences application
│   └── common/              # Shared path & environment configuration
├── data/
│   ├── applications/        # Desktop launchers (.desktop)
│   ├── gsettings/           # GSettings schema definition
│   ├── ibus/                # IBus component XML metadata
│   ├── icons/               # Application & panel icons
│   └── metainfo/            # AppStream metadata
├── tests/
│   ├── core/                # Phonetic, dictionary, and autocorrect tests
│   ├── engine/              # Engine lifecycle and buffer tests
│   ├── integration/         # Desktop and AppStream metadata tests
│   └── packaging/           # Package structure and permission tests
├── debian/                  # Debian package metadata (DEP-5 copyright, control, etc.)
├── Makefile                 # Standard build and packaging targets
└── README.md
```

---

## Requirements

### Runtime Dependencies
* `ibus` (>= 1.5.0)
* `gjs` (>= 1.70.0)
* `dconf-gsettings-backend` or `gsettings-backend`
* `gir1.2-gtk-3.0` (for preferences UI)

### Build Dependencies
* `make`
* `fakeroot`
* `dpkg-dev`
* `desktop-file-utils` (for validation)
* `appstream` (for validation)

---

## Building and Testing

### 1. Build project
```bash
make
```

### 2. Run automated tests
```bash
make test
```

### 3. Build Debian package
```bash
make package
```
This produces `avro-linux_1.0.0-1_all.deb` in the project root.

### 4. Clean build artifacts
```bash
make clean
```

---

## Installation & Setup

### Install the Debian package
```bash
sudo dpkg -i avro-linux_1.0.0-1_all.deb
sudo apt-get install -f   # Installs any missing dependencies
```

### Restart IBus
```bash
ibus restart
```

### Enable Avro in Desktop Settings (GNOME)
1. Open **Settings** → **Keyboard**.
2. Under **Input Sources**, click **+** (Add).
3. Search for **Bengali** or **Bangla**.
4. Select **Bengali (Avro Phonetic)** and click **Add**.
5. Switch to Avro anytime using <kbd>Super</kbd> + <kbd>Space</kbd> or the system top bar input indicator.

### Launch Preferences
Launch **Avro Bengali Input Preferences** from your application menu, or run:
```bash
/usr/share/avro-linux/preferences/pref.js --standalone
```

---

## Privacy Policy

Avro Linux adheres to strict privacy principles:
* **No Telemetry:** No user statistics or analytics are collected.
* **No Network Calls:** The engine operates completely offline.
* **No Keystroke Logging:** Key events are processed strictly in-memory by IBus.
* **Diagnostics:** System diagnostics display version and configuration state only, never typed text.

---

## Licenses and Attribution

Avro Linux is licensed under the **Mozilla Public License, Version 2.0 (MPL-2.0)**.
Metadata is licensed under **CC0-1.0**.

* **jsAvroPhonetic & Avro Dictionaries:** Copyright (C) OmicronLab, Dr. Mehdi Hasan Khan, Rifat Nabi (MPL-2.0).
* **ibus-avro:** Copyright (C) Sarim Khan, Dr. Mehdi Hasan Khan (MPL-2.0).
* **Debian Packaging:** Copyright (C) Gunnar Hjalmarsson, Boyuan Yang, Avro Linux Contributors (MPL-2.0).

See `LICENSE`, `NOTICE`, and `AUTHORS` for complete licensing information.