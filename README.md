# Avro Linux (Remastered)

[![CI](https://github.com/sarim/ibus-avro/actions/workflows/ci.yml/badge.svg)](https://github.com/sarim/ibus-avro/actions/workflows/ci.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Debian Package](https://img.shields.io/badge/Package-Debian%20%2F%20Ubuntu-orange.svg)](https://github.com/sarim/ibus-avro/releases)
[![Platform](https://img.shields.io/badge/Platform-Debian%20%7C%20Ubuntu%20%7C%20Mint%20%7C%20Pop!_OS-blue.svg)](https://github.com/sarim/ibus-avro)

**Avro Linux (Remastered)** is a Linux-native implementation of OmicronLab's legendary Avro Keyboard for Debian-based distributions (Debian 12/13, Ubuntu 22.04/24.04/26.04, Linux Mint, Pop!_OS) across both **Wayland** and **X11** sessions.

Remastered by **MD Shifat Bin Siddique Urfi (DMC, K-79)** and **MD Mehedi Hasan (BUET, 2021-22)**, this release delivers full Windows Avro feature parity, including the iconic floating sticky TopBar, standalone Avro Pad, Bijoy ↔ Unicode Converter, Keyboard Layout Viewer, Candidate Suggestions Preview, and the Avro Doctor diagnostic suite.

---

## 🌟 Features at a Glance

* **Avro TopBar** (`avro-topbar`), re-created from Avro Keyboard 5 for Windows:
  * The same 285×30 bar and elements: অ menu, বাংলা / English mode button with the keyboard-layout strip under it, Layout Viewer, Avro Mouse, Tools, Web, Help and power button, with the Windows menus and tooltips. Original artwork, scaled to your screen DPI.
  * All the keyboard layouts of Avro Keyboard: Avro Phonetic and the fixed layouts (see below); the Bangla layouts of your system are in a submenu.
  * Always on top on every workspace, and never takes focus: click it and keep typing.
  * Drag by the logo with magnetic edge snap, fades when idle, hides to the system tray (click to switch mode, double-click to restore), one bar per session, and the commands `avro-topbar toggle | bn | sys | minimize | restore`.
  * Starts on login, like Avro Keyboard starts with Windows (it adds itself the first time it runs; turn it off under Preferences → TopBar).
  * Four skins and the Windows TopBar options under Preferences → TopBar.
* **Fixed Keyboard Layouts of Avro Keyboard**: **National (Jatiya)**, **Probhat**, **Bornona**, **Avro Easy** and **Munir Optima**, taken from the Avro Keyboard layout files and typed by the Avro engine itself:
  * The typing rules of Avro Keyboard: *Modern Style Typing* (kars after the consonant) with *Old Style Reph*, *Automatic Vowel Forming* and the *Chandrabindu* fix, or *Old Style Typing* (e, i and oi kars before the consonant, as on a typewriter or Bijoy).
  * F12 switches Bangla / English with every layout; Right Alt types the AltGr characters; Bangla digits on the number pad.
  * Work wherever Avro Phonetic works, Wayland included. Choose a layout in the TopBar (▼ under the mode button) or in Preferences → Keyboard Layouts.
* **Windows-Style Preview Window**:
  * The classic Avro Keyboard preview: a small window at the text cursor with the English text you type (yellow row) and the Bangla suggestions below it, the selected word in blue.
  * Drawn by the engine itself on every key press, as a focus-less popup that never takes focus from the app you are typing in.
  * Click a word to insert it; drag the title bar or click the pin to keep the window in one place; classic (light) and dark themes.
  * On GNOME Wayland the desktop's own candidate panel is used, with the typed text shown above a vertical list.
* **Correct Bangla Rendering**:
  * Ships a fontconfig rule that renders Bangla with Noto Sans/Serif Bengali instead of Lohit Bengali and Mukti, whose headline (মাত্রা) breaks over letters such as আ and ম.
* **Full Keyboard Navigation**:
  * `F12`: Instant toggle between Bangla and English mode.
  * `Tab` / `Shift+Tab`, `↓` / `↑`: Move forward and backward through suggestions.
  * `1`–`9`: Direct numeric selection of candidates.
  * `Esc`: Cancel the word being typed.
  * `Space` / `Enter` / `।`: Automatic suffix commits on word boundaries.
* **Comprehensive Standalone Application Suite**:
  * **Avro Pad (`avro-pad`)**: Dedicated Bengali text editor with Unicode and Bijoy copy support, word counts, and Bangla font styling.
  * **Avro Mouse (`avro-mouse`)**: On-screen click-and-type virtual Bengali keyboard for typing vowels, consonants, numbers, and conjuncts with the mouse.
  * **Bijoy ↔ Unicode Converter (`avro-converter`)**: Two-way bulk text conversion between legacy Bijoy (ANSI) and Unicode.
  * **Layout Viewer (`avro-layout`)**: Shows the active keyboard layout: the Avro Phonetic guide, or the keyboard of a fixed layout with a Normal and an AltGr view.
  * **TopBar Skins**: Avro Classic, Royal Blue, Flat Mint and Paper Light.
  * **Start on Login**: the TopBar starts with your desktop session; switch it off or on under Preferences → TopBar.
  * **Avro Preferences (`avro-preferences`)**: Full GSettings configuration UI for candidate counts, auto-correction, and personal dictionary management.
  * **Avro Doctor (`avro-doctor` / `avro-linux-doctor`)**: Comprehensive diagnostic self-test utility for system readiness, fonts, IBus health, and instant one-click auto-fix.
* **100% Privacy & Offline Guarantee**:
  * Operates completely offline with zero telemetry, zero analytics, and zero cloud dependency.
  * Typed content is never logged or transmitted.

---

## 📦 Installation

### From Debian Package (`.deb`)

Download the latest `.deb` package from the repository or build artifacts:

```bash
# Install the package and dependencies
sudo apt update
sudo apt install ./avro-linux_1.3.0-1_all.deb
```

### Enable Avro Phonetic in Your Desktop

1. Open your desktop's **Settings** → **Keyboard** → **Input Sources** (or **Region & Language**).
2. Add **Bengali** → **Bengali (Avro Phonetic)**.
3. Switch to Avro using your desktop's input-source shortcut (e.g. `Super + Space` or `Ctrl + Space`).
4. Press `F12` anytime to toggle between Bangla and English mode!

---

## 🛠️ Diagnostics & Self-Healing: Avro Doctor

If you ever experience issues with input methods, environment variables, or missing fonts on your Linux system, run **Avro Doctor**:

```bash
# Run CLI health-check
avro-doctor --cli

# Or launch the interactive GUI diagnostic tool with Live Typing Test
avro-doctor
```

Avro Doctor checks:
* IBus daemon status and registration
* Desktop environment variables (`GTK_IM_MODULE`, `QT_IM_MODULE`, `XMODIFIERS`)
* GSettings schema compilation
* Installed Bengali fonts (Kalpurush, SolaimanLipi, Noto Sans/Serif Bengali)
* Live preedit and commit engine responsiveness

---

## 💻 Building from Source

### Dependencies

Install build and runtime dependencies on Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y \
  make \
  gjs \
  ibus \
  gir1.2-ibus-1.0 \
  gir1.2-gtk-3.0 \
  libglib2.0-bin \
  fakeroot \
  dpkg-dev \
  desktop-file-utils \
  appstream
```

### Build and Test

```bash
# Build schemas, desktop files, and permissions
make all

# Run the complete test suite (15 test suites; run under Xvfb to include the live Preview Window and TopBar checks)
make test

# Build the Debian (.deb) package
make package

# Verify package integrity
./tests/packaging/test-package.sh
```

---

## 🏗️ Architecture & Design

Avro Linux uses a modular, decoupled architecture engineered specifically to overcome Wayland and modern X11 window manager constraints:

```
+----------------------------------------------------------------+
|                        Application                             |
|               (Kate, Chrome, LibreOffice, Gedit)               |
+-------------------------------+--------------------------------+
                                | IBus IM Protocol (Inline Preedit)
+-------------------------------v--------------------------------+
|                     IBus Avro Engine                           |
|      (Phonetic Transliteration, Dictionary, Suffix Tree)       |
|  +----------------------------------------------------------+  |
|  |  Preview Window (in-process, X11 override-redirect popup)|  |
|  |  or the desktop IBus candidate panel (GNOME Wayland)     |  |
|  +----------------------------------------------------------+  |
+-------------------------------+--------------------------------+
                                | GSettings (com.omicronlab.avro)
                +---------------v---------------+
                |      Sticky Avro TopBar       |
                |  (type_hint=DOCK, keep_above) |
                +-------------------------------+
```

For in-depth technical documentation, refer to:
* [Windows Avro Behavior Specification](docs/windows-avro-behavior.md)
* [Linux Input Architecture & IPC](docs/linux-input-architecture.md)
* [Desktop Integration Guide](docs/desktop-integration.md)
* [Compatibility Matrix](docs/compatibility-matrix.md)
* [Final Release Report](docs/FINAL_RELEASE_REPORT.md)

---

## 📜 Credits & License

* **Original Avro Keyboard Concept & Phonetic Engine**: Mehdi Hasan Khan & OmicronLab.
* **Original ibus-avro Implementation**: Sarim Khan.
* **Remastered Windows-Parity Edition**: **MD Shifat Bin Siddique Urfi**.
* **License**: Mozilla Public License 2.0 ([MPL-2.0](LICENSE)).
