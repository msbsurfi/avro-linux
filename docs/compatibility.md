# Avro Linux — Compatibility Matrix & Desktop Integration Guide

This document provides a comprehensive compatibility reference for **Avro Linux**, detailing supported desktop environments, application toolkits, display servers (Wayland & X11), sandboxed environments (Flatpak/Snap), and configuration requirements.

---

## 1. System Requirements & Architecture Overview

Avro Linux implements the Avro Phonetic Bengali input method as a native [IBus](https://github.com/ibus/ibus) engine. Because it integrates directly into standard freedesktop input method protocols, it does not rely on global X11 grabs, low-level kernel keyboard hooks, or background daemons.

* **Target Operating System:** Debian GNU/Linux 13 (trixie), Debian 12 (bookworm), Ubuntu 24.04 LTS+, and derivatives.
* **Core Runtime:** `gjs` (>= 1.70.0), `ibus` (>= 1.5.0), `libglib2.0-0` (>= 2.66.0).
* **UI & Configuration:** GTK 3 (`gir1.2-gtk-3.0`), GSettings schema `com.omicronlab.avro` with dconf backend.
* **Architecture:** `all` (Architecture-independent pure script & data package).

---

## 2. Desktop Environment Compatibility

| Desktop Environment | Display Server | Input Method Integration Status | Notes / Recommended Configuration |
| :--- | :--- | :--- | :--- |
| **GNOME 43–47+** | Wayland | **Native / First-Class** | Seamless integration via GNOME Shell input source switcher (`Super+Space`). Supports inline preedit and candidate popup. |
| **GNOME 43–47+** | X11 | **Native / First-Class** | Full support via standard X11 IBus bridge. |
| **KDE Plasma 5 & 6**| Wayland | **Fully Supported** | Uses Wayland `text-input-v3` / `virtual-keyboard-v1`. Configure IBus in System Settings → Input Devices → Virtual Keyboard. |
| **KDE Plasma 5 & 6**| X11 | **Fully Supported** | Set `QT_IM_MODULE=ibus` and `XMODIFIERS=@im=ibus`. |
| **XFCE 4.16–4.18** | X11 / Wayland | **Fully Supported** | Start `ibus-daemon -drxR` on session start; integrate via Notification Area / Status Tray. |
| **MATE / Cinnamon** | X11 | **Fully Supported** | Add Avro Phonetic under Input Method settings. |
| **LXQt / Sway / Hyprland** | Wayland / X11 | **Supported** | Launch `ibus-daemon -d -r -x` via compositor autostart (`sway`, `hyprland.conf`). Ensure `GTK_IM_MODULE=ibus` and `QT_IM_MODULE=ibus`. |

---

## 3. Application Toolkit & Application Compatibility

### 3.1 GTK Applications (GTK 3 & GTK 4)
* **Tested Applications:** `gedit`, `gnome-text-editor`, `nautilus`, `evolution`, `epiphany`.
* **Status:** **Fully Supported**.
* **Preedit Behavior:** Real-time inline preedit with Bengali transliteration and candidate suggestion table.
* **Configuration:**
  * GTK applications use the built-in IBus input module by default on modern GNOME. On other desktops, ensure `/etc/environment` or `~/.profile` includes:
    ```sh
    export GTK_IM_MODULE=ibus
    ```

### 3.2 Qt Applications (Qt 5 & Qt 6)
* **Tested Applications:** `kate`, `kwrite`, `kcalc`, `vlc`, `qutebrowser`.
* **Status:** **Fully Supported**.
* **Configuration:**
  * Requires `ibus-qt` or the standard Qt IBus platform input context:
    ```sh
    export QT_IM_MODULE=ibus
    ```

### 3.3 Web Browsers
* **Tested Applications:** Mozilla Firefox, Google Chrome, Chromium, Brave, Microsoft Edge for Linux.
* **Status:** **Fully Supported**.
* **Behavior:** Seamless support for input fields, textareas, contenteditable elements, and address bars.
* **Wayland Flags (Chromium/Chrome):** Running Chrome with `--enable-features=UseOzonePlatform --ozone-platform=wayland` supports native Wayland input-method protocols.

### 3.4 Office Suites
* **Tested Applications:** LibreOffice (Writer, Calc, Impress), OnlyOffice.
* **Status:** **Fully Supported**.
* **Behavior:** Complex conjuncts (যুক্তবর্ণ), hasanta (হসন্ত), and vowel markers (কার) render accurately with OpenType complex text layout (HarfBuzz).
* **Recommended Bengali Fonts:** *Kalpurush*, *Siyam Rupali*, *SolaimanLipi*, *Noto Sans Bengali*, *Lohit Bengali*.

### 3.5 Electron & Development Applications
* **Tested Applications:** Visual Studio Code, Slack, Discord, Obsidian.
* **Status:** **Fully Supported**.
* **Behavior:** Standard inline composition in code editor panes, search bars, and chat inputs.

### 3.6 Terminal Emulators
* **Tested Applications:** GNOME Terminal, Ptyxis, Alacritty, Kitty, Foot, Konsole.
* **Status:** **Supported with Terminal Notes**.
* **Behavior:**
  * GNOME Terminal / Ptyxis: Preedit appears directly at cursor. Pressing `Space` or `Enter` commits the word.
  * Simple/Raw Terminals: Some minimal terminals (without XIM/IBus preedit hooks) buffer typed keystrokes until a word delimiter (e.g. Space, Enter, or punctuation) commits the transliterated UTF-8 Bengali word.

---

## 4. Sandboxed Environments (Flatpak & Snap)

Flatpak and Snap applications run inside application containers with restricted filesystem and IPC access. To enable IBus input method support inside Flatpak:

1. Ensure `xdg-desktop-portal` and `xdg-desktop-portal-gtk` (or desktop portal for your environment) are installed.
2. Ensure `IBUS_USE_PORTAL=1` is exported in the user's environment:
   ```sh
   export IBUS_USE_PORTAL=1
   ```
3. Most modern Flatpak runtimes (GNOME SDK, org.freedesktop.Platform) automatically forward the IBus socket located at `$XDG_RUNTIME_DIR/ibus/bus`.

---

## 5. Input Method Switching & Operational Modes

Avro Linux supports two distinct switching mechanics:

### 5.1 Desktop System-Level Switching (Super+Space)
* Users can switch between their primary keyboard layout (e.g., English US) and **Avro Phonetic** using standard desktop shortcuts:
  * GNOME: `Super + Space`
  * KDE / XFCE: User-configured shortcut in IBus Preferences (`ibus-setup`).

### 5.2 Internal Engine Mode Toggle
* Within the Avro Phonetic engine, an internal toggle allows temporary English input without switching engines:
  * Configurable via engine property toggle.
  * Active state displayed in IBus candidate panel / language bar.

### 5.3 Key Navigation & Editing Semantics
* **Preedit Cancellation:** Pressing `Escape` immediately discards the uncommitted Latin preedit buffer without emitting stray characters.
* **Backspace:** Removes the last typed Latin character from the buffer and recalculates Bengali transliteration dynamically.
* **Candidate Selection:** Navigation through numeric keys `1`–`9` or arrow keys (`Up`/`Down`).
* **Delimiters:** Spaces, tabs, and newlines commit the current candidate and forward the delimiter cleanly.

---

## 6. Environment Variables Checklist

For non-GNOME desktop environments (XFCE, MATE, LXQt, i3, Sway), ensure the following environment variables are present in `/etc/environment` or `~/.xprofile`:

```sh
export GTK_IM_MODULE=ibus
export QT_IM_MODULE=ibus
export XMODIFIERS=@im=ibus
export IBUS_USE_PORTAL=1
```

To automatically launch the IBus daemon on desktop session login:
```sh
ibus-daemon -drxR
```
