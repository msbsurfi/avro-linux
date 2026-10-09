<p align="center">
  <img src="data/icons/avro-bangla.svg" width="100" height="100" alt="Avro Logo">
</p>

<h1 align="center">Avro Linux (Remastered)</h1>

<p align="center">
  <b>ভাষা হোক উন্মুক্ত... • Modern, Authentic Bangla Typing for Linux</b>
</p>

<p align="center">
  <a href="https://github.com/msbsurfi/avro-linux/releases"><img src="https://img.shields.io/badge/Package-Debian%20%2F%20Ubuntu-orange.svg" alt="Debian Package"></a>
  <a href="https://opensource.org/licenses/MPL-2.0"><img src="https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg" alt="License: MPL 2.0"></a>
  <a href="https://github.com/msbsurfi/avro-linux"><img src="https://img.shields.io/badge/Platform-Debian%20%7C%20Ubuntu%20%7C%20Mint%20%7C%20Pop!_OS-blue.svg" alt="Platform"></a>
  <a href="https://github.com/msbsurfi/avro-linux"><img src="https://img.shields.io/badge/Display-Wayland%20%7C%20X11-purple.svg" alt="Display"></a>
</p>

<p align="center">
  <img src="data/images/splash.jpg" width="560" alt="Avro Keyboard Splash Screen" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
</p>

---

## 📖 About Avro Linux

**Avro Linux (Remastered)** brings the beloved OmicronLab **Avro Keyboard** experience natively to Linux desktops. Whether you are using Ubuntu, Debian, Linux Mint, Pop!_OS, or any Debian-based distribution, this remastered release delivers the comfort and familiarity of Windows Avro Keyboard across both **Wayland** and **X11** sessions.

* **Remastered by**: **MD Shifat Bin Siddique Urfi (DMC, K-79)** and **MD Mehedi Hasan (CSE 21, BUET)**
* **Original Avro Keyboard**: Created by **Dr. Mehdi Hasan Khan (OmicronLab)**
* **Original ibus-avro**: Developed by **Sarim Khan**
* **License**: Mozilla Public License 2.0 ([MPL-2.0](LICENSE))

---

## ✨ Key Features

* 🚀 **Iconic Avro TopBar (`avro-topbar`)**:
  * Floating toolbar that stays on top across workspaces without stealing typing focus.
  * Prominent **BN / EN** mode indicator badge with instant one-click switching.
  * Drag-and-drop placement with magnetic screen-edge snapping and auto-fade.
  * Quick layout selector for all built-in layouts.
* ⌨️ **Phonetic & Fixed Layouts**:
  * **Avro Phonetic**: Easy phonetic typing (`ami banglay gan gai` → `আমি বাংলায় গান গাই`).
  * **Five Fixed Keyboard Layouts**: **National (Jatiya)**, **Probhat**, **Bornona**, **Avro Easy**, and **Munir Optima**, with both Modern and Old-Style typing modes.
* 💡 **Generous Suggestions Preview**:
  * Real-time floating candidate window placed conveniently beside your cursor so your typed text is never obscured.
  * Intelligently clamped to screen boundaries so it never gets lost in taskbars or blind regions.
* ⚡ **One-Key Switching (`F12`)**:
  * Toggle between Bangla and English mode anywhere with the press of `F12`.
* 🛠️ **Full Standalone Application Suite**:
  * **Avro Pad (`avro-pad`)**: Dedicated Bengali text editor with Unicode and Bijoy copy support.
  * **Avro Mouse (`avro-mouse`)**: On-screen click-and-type virtual keyboard.
  * **Bijoy ↔ Unicode Converter (`avro-converter`)**: Fast two-way bulk text converter.
  * **Layout Viewer (`avro-layout`)**: Interactive keyboard layout viewer for all layout variants.
  * **Avro Preferences (`avro-preferences`)**: Customize suggestions, autocorrect, and appearance.
  * **Avro Doctor (`avro-doctor`)**: Built-in system diagnostic and one-click self-healing repair tool.
* 🔒 **100% Privacy & Offline**:
  * Completely offline with zero telemetry, zero analytics, and zero network calls.

---

## 🚀 Quick Start & Installation

### Option 1: Install from Debian Package (`.deb`)

Download `avro-linux_1.3.1-1_all.deb` from the [Releases](https://github.com/msbsurfi/avro-linux/releases) page.

* **Double-click** works only where a graphical package installer opens `.deb` files
  (GDebi, or the software center of some Ubuntu / Kubuntu releases). Click **Install** there.
* Everywhere else (Xubuntu / XFCE, for example, where a double-click only opens the
  file in an archive viewer), install it from a terminal in the folder of the file:

```bash
cd ~/Downloads
sudo apt install ./avro-linux_1.3.1-1_all.deb
```

`apt` also installs what Avro needs (IBus, GJS, …); keep the `./`. `sudo dpkg -i` works
only when all of that is installed already.

### Option 2: Turn Avro on

Log out and log in again once (there is no need to restart the computer). The Avro TopBar
starts and asks once whether to add Avro to your keyboard list; the installer itself never
changes anyone's keyboard settings. To add it yourself:

1. Open your desktop's **Settings** → **Keyboard** → **Input Sources** (on XFCE and others: **IBus Preferences** → **Input Method**).
2. Click **+** (Add) and select **Bengali** → **Bengali (Avro Phonetic)**.
3. Switch input source using your standard desktop shortcut (usually `Super + Space` or `Ctrl + Space`).
4. Press **`F12`** anytime to switch between Bangla (**BN**) and English (**EN**)!

`avro-setup avro-linux_1.3.1-1_all.deb` installs or updates Avro from a package file with
a wizard and does these steps for you.

### Uninstall

```bash
sudo apt remove avro-linux
```

Your personal dictionary and settings (`~/.config/avro`) stay. Remove Avro from your keyboard
list first if you added it.

---

## 🩺 System Check & Diagnostics: Avro Doctor

If your system is missing recommended fonts or input method environment variables, run **Avro Doctor**:

```bash
# Launch GUI diagnostic tool with Live Typing Test
avro-doctor

# Or run the quick command-line health check
avro-doctor --cli
```

Avro Doctor checks your IBus subsystem, environment variables, installed Bangla fonts (Kalpurush, SolaimanLipi, Noto Sans Bengali), and offers one-click automatic fixes.

---

## 🔨 Building from Source

To compile and package Avro Linux from source on Ubuntu or Debian:

```bash
# 1. Install prerequisites
sudo apt update
sudo apt install -y make gjs ibus gir1.2-ibus-1.0 gir1.2-gtk-3.0

# 2. Build and run tests
make all
make test

# 3. Create the .deb package
make package
```

The resulting package is written to `avro-linux_1.3.1-1_all.deb` in the top folder of the source tree.

---

## 📄 License & Attribution

* **License**: This project is licensed under the **Mozilla Public License Version 2.0 (MPL-2.0)**. See the [LICENSE](LICENSE) file for complete details.
* **Upstream Attribution**:
  * Avro Keyboard, Avro Phonetic engine, layout files, and artwork © **OmicronLab** and **Dr. Mehdi Hasan Khan**.
  * Original ibus-avro implementation © **Sarim Khan**.
  * Remastered edition maintained by **MD Shifat Bin Siddique Urfi** and **MD Mehedi Hasan**.
