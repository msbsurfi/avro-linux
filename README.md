# Avro Linux (Remastered)

[![CI](https://github.com/sarim/ibus-avro/actions/workflows/ci.yml/badge.svg)](https://github.com/sarim/ibus-avro/actions/workflows/ci.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Debian Package](https://img.shields.io/badge/Package-Debian%20%2F%20Ubuntu-orange.svg)](https://github.com/sarim/ibus-avro/releases)
[![Platform](https://img.shields.io/badge/Platform-Debian%20%7C%20Ubuntu%20%7C%20Mint%20%7C%20Pop!_OS-blue.svg)](https://github.com/sarim/ibus-avro)

**Avro Linux (Remastered)** is a Linux-native implementation of OmicronLab's legendary Avro Keyboard for Debian-based distributions (Debian 12/13, Ubuntu 22.04/24.04/26.04, Linux Mint, Pop!_OS) across both **Wayland** and **X11** sessions.

Remastered by **MD Shifat Bin Siddique Urfi**, this release delivers full Windows Avro feature parity, including the iconic floating sticky TopBar, standalone Avro Pad, Bijoy ↔ Unicode Converter, Keyboard Layout Viewer, Candidate Suggestions Preview, and the Avro Doctor diagnostic suite.

---

## 🌟 Features at a Glance

* **Classic Floating Sticky TopBar**:
  * Stays pinned on top across all virtual desktops and workspaces (`keep_above`, `dock`, `sticky`).
  * Non-focus-stealing controls: toggling Bangla/English or changing layout never interrupts your active document.
  * Windows-identical interface: Logo, Mode toggle (Bangla / English), Layout selector, Tools menu, Doctor, Candidate preview toggle, and Exit.
* **Non-Flickering Candidate Preview**:
  * Decoupled IPC architecture communicates via a high-performance Unix domain socket (`avro-ui.sock`).
  * Instant suggestions with zero focus stealing, zero popup flicker, and 100% reliable Bengali typing in web browsers, IDEs, office suites, and text editors.
* **Full Keyboard Navigation**:
  * `F12`: Instant toggle between Bangla and English mode.
  * `Tab` / `Shift+Tab`: Cycle forward and backward through suggestions.
  * `1`–`9`: Direct numeric selection of candidates.
  * `Space` / `Enter` / `।`: Automatic suffix commits on word boundaries.
* **Comprehensive Standalone Application Suite**:
  * **Avro Pad (`avro-pad`)**: Dedicated Bengali text editor with Unicode and Bijoy copy support, word counts, and Bangla font styling.
  * **Avro Mouse (`avro-mouse`)**: On-screen click-and-type virtual Bengali keyboard for typing vowels, consonants, numbers, and conjuncts with the mouse.
  * **Bijoy ↔ Unicode Converter (`avro-converter`)**: Two-way bulk text conversion between legacy Bijoy (ANSI) and Unicode.
  * **Keyboard Layout Viewer (`avro-layout`)**: Interactive keyboard layout visualizer for Avro Phonetic, National (Jatiya), Bornona, and more.
  * **TopBar Themes & Skins**: Switch between Royal Dark, Classic Windows Avro, Obsidian Black, and Paper Light themes.
  * **Auto-Start on Login**: One-click autostart configuration from the TopBar menu.
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
sudo apt install ./avro-linux_1.0.0-1_all.deb
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

# Run the complete test suite (11 test suites, 324 assertions)
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
+-------------------------------+--------------------------------+
                                | Unix Domain Socket (avro-ui.sock)
        +-----------------------+-----------------------+
        |                                               |
+-------v-----------------------+       +---------------v---------------+
|    Floating Preview Window    |       |      Sticky Avro TopBar       |
| (type_hint=TOOLTIP, no-focus) |       |  (type_hint=DOCK, keep_above) |
+-------------------------------+       +-------------------------------+
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
