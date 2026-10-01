# Avro Linux (Remastered Edition)

[![CI](https://github.com/avro-linux/avro-linux/actions/workflows/ci.yml/badge.svg)](https://github.com/avro-linux/avro-linux/actions/workflows/ci.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

**Avro Linux (Remastered Edition)** is a modern, reliable, native Linux implementation of the iconic **Avro Phonetic Bengali** keyboard.

**Remastered for modern Linux by MD Shifat Bin Siddique Urfi.**

It brings the authentic Windows Avro experience to Debian and Ubuntu desktops (Ubuntu 24.04/26.04, Debian 12/13), featuring a **sticky, floating always-on-top TopBar**, standalone **Avro Pad** text editor, **Unicode ↔ Bijoy Converter**, **Keyboard Layout Viewer**, and resilient **IBus** engine with <kbd>F12</kbd> mode switching.

---

## Features

* **Windows-Style Floating & Sticky Avro TopBar:** Sleek floating toolbar dock that stays **sticky across all workspaces**, **always-on-top**, and **never steals keyboard focus**. Includes prominent English/Bangla mode toggle with <kbd>F12</kbd> indicator, layout selector, and full Windows Avro menu.
* **Global <kbd>F12</kbd> Mode Switching:** Press <kbd>F12</kbd> anytime to seamlessly toggle between Bangla and English mode.
* **Avro Pad (Standalone Bengali Editor):** Full-featured word processor with **live inline phonetic composition** (`ami banglay gan gai` -> `আমি বাংলায় গান গাই`), candidate suggestions, font size controls, and one-click copy.
* **Unicode ↔ Bijoy (ANSI) Converter:** Instant 100% roundtrip conversion between modern Unicode Bengali and legacy Bijoy/SutonnyMJ font format.
* **Visual Keyboard Layout Viewer:** Interactive on-screen keyboard showing phonetic key mapping for normal keys, Shift combinations, vowels, consonants, and complex conjuncts (যুক্তবর্ণ).
* **Modernized IBus Engine:** Completely overhauled key event processor supporting modern Wayland and X11 desktops across Ubuntu 24.04/26.04 and Debian 12/13.
* **Authentic Avro Phonetic Transliteration:** Full support for vowels, consonants, vowel signs (*kar*), conjuncts (*যুক্তবর্ণ*), and *hasanta* rules based on OmicronLab's standard algorithm.
* **Smart Dictionary & Suffix Suggestions:** In-memory dictionary suggestions with grammatical inflection expansion.
* **Autocorrect & Learning:** Built-in autocorrect database and automatic candidate selection memory.
* **Native GTK Preferences:** Discoverable preferences application featuring General, Typing, Dictionary & Autocorrect, Shortcuts, Privacy-safe Diagnostics, and About tabs.
* **Strict Privacy:** Zero telemetry, zero analytics, zero network transmission, and zero keystroke logging.
* **Debian Packaging:** Reproducible Debian packaging producing a clean `.deb` package compatible with Debian 12, Debian 13, Ubuntu 24.04 LTS, Ubuntu 26.04, and derivatives.

---

## Architecture Overview

```text
avro-linux/
├── bin/                     # Command-line binary launchers (avro, avro-topbar, avro-pad, etc.)
├── src/
│   ├── engine/              # IBus-facing engine lifecycle & key event processing
│   ├── standalone/          # Windows-style TopBar, Avro Pad, Layout Viewer, & Bijoy Converter
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
avro-preferences
```
(or `/usr/share/avro-linux/preferences/pref.js --standalone`)

### Standalone Windows-Style Applications

Avro Linux includes a complete standalone input suite with a full Windows-like interface that works out-of-the-box on any Debian/Ubuntu release (Debian 12, Debian 13, Ubuntu 22.04, Ubuntu 24.04, Ubuntu 26.04) regardless of desktop environment or whether IBus is active:

* **Floating Avro TopBar (Windows Style):**
  ```bash
  avro-topbar
  # or: avro --topbar
  ```
  Floats smoothly on top of your desktop with the iconic Avro logo menu, large Bangla/English mode toggle (green/blue indicator), layout selector, and tool shortcuts.

* **Avro Pad (Standalone Bengali Editor):**
  ```bash
  avro-pad
  # or: avro --pad
  ```
  Type phonetically in Latin script (`ami banglay gan gai`), see live Bengali transliteration (`আমি বাংলায় গান গাই`), and copy to clipboard with a single click.

* **Unicode to Bijoy (SutonnyMJ) Converter:**
  ```bash
  avro-converter
  # or: avro --converter
  ```
  Convert Bengali text bi-directionally between Unicode and legacy ANSI / Bijoy format.

* **Keyboard Layout Viewer:**
  ```bash
  avro-layout
  # or: avro --layout
  ```
  Interactive visual reference for phonetic keys, vowels, consonants, and complex conjuncts (যুক্তবর্ণ).

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