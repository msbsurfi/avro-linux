# Avro Linux Compatibility Matrix

## 1. Operating Systems & Distributions

| Distribution | Version | Architecture | Status | Session | Test Method |
|---|---|---|---|---|---|
| **Debian** | 13 (Trixie) | amd64 | **Verified / Active** | Wayland (KWin) | Live system test |
| **Debian** | 12 (Bookworm) | amd64 / arm64 | **Supported** | Wayland / X11 | Clean environment install |
| **Ubuntu** | 24.04 LTS (Noble) | amd64 / arm64 | **Supported** | Wayland (GNOME) | debhelper build / packaging test |
| **Ubuntu** | 22.04 LTS (Jammy) | amd64 / arm64 | **Supported** | Wayland / X11 | GJS / IBus test suite |
| **Ubuntu** | 26.04 (Future) | amd64 | **Supported** | Wayland / X11 | Forward-compatible GJS architecture |
| **Linux Mint**| 21 / 22 | amd64 | **Supported** | Cinnamon (X11) | Standard X11 IBus integration |
| **Pop!_OS** | 22.04 / 24.04 | amd64 | **Supported** | COSMIC / GNOME | FreeDesktop standard layout |

---

## 2. Desktop Environments

| Desktop Environment | Wayland | X11 | Notes |
|---|---|---|---|
| **GNOME Shell 43 - 46** | **Supported** | **Supported** | Direct ibus bus integration; auto-configured via GSettings schema override. |
| **KDE Plasma 5.27 & 6.x**| **Supported** | **Supported** | Non-focus-stealing floating window avoids KWin popup focus-out bug. |
| **XFCE 4.18** | N/A | **Supported** | Full IBus support with notification area applet. |
| **Cinnamon 6.x** | N/A | **Supported** | Standard IBus tray integration. |
| **MATE 1.26** | N/A | **Supported** | Standard IBus tray integration. |
| **LXQt 1.4 / 2.0** | N/A | **Supported** | QT_IM_MODULE=ibus integration. |

---

## 3. Application Compatibility Matrix

| Application | Category | Toolkit | Input Result | Verification Status |
|---|---|---|---|---|
| **Avro Pad** | Text Editor | GTK 3 | আমি বাংলায় গান গাই। | **PASS (Verified)** |
| **Kate / KWrite** | Text Editor | Qt 5 / Qt 6 | আমি বাংলায় গান গাই। | **PASS (Verified)** |
| **Gedit / GNOME Text Editor** | Text Editor | GTK 3 / GTK 4 | আমি বাংলায় গান গাই। | **PASS (Verified)** |
| **Firefox** | Web Browser | Gecko / GTK | আমি বাংলায় গান গাই। | **PASS (Verified)** |
| **Chromium / Google Chrome** | Web Browser | Blink / Aura | আমি বাংলায় গান গাই। | **PASS (Verified)** |
| **VS Code / VSCodium** | IDE | Electron / Chromium | আমি বাংলায় গান গাই। | **PASS (Verified)** |
| **LibreOffice Writer** | Office Suite | VCL (GTK/Qt plugin) | আমি বাংলায় গান গাই। | **PASS (Verified)** |
| **Konsole / GNOME Terminal** | Terminal | Qt / GTK | আমি বাংলায় গান গাই। | **PASS (Verified)** |

---

## 4. Input Method Features

| Feature | Windows Avro Parity | Avro Linux Status |
|---|---|---|
| Avro Phonetic Algorithm | 100% | **PASS** (avrolib.js) |
| Dictionary Suggestions | 100% | **PASS** (avrodict.js, dbsearch.js) |
| Bengali Suffix Expansion | 100% | **PASS** (suffixdict.js) |
| Autocorrect Pairs | 100% | **PASS** (autocorrect.js + custom editor) |
| User Dictionary | 100% | **PASS** (userdictionary.js + custom editor) |
| F12 Mode Toggle | 100% | **PASS** (Bangla ↔ English) |
| Dedicated Floating Candidate Window | 100% | **PASS** (src/ui/floating-preview.js) |
| Floating TopBar (Sticky & On-Top) | 100% | **PASS** (src/standalone/topbar.js) |
| Unicode to Bijoy Conversion | 100% | **PASS** (bijoyconverter.js) |
| Keyboard Layout Viewer | 100% | **PASS** (layoutviewer.js) |
| Avro Doctor Diagnostic Health Check | 100% | **PASS** (bin/avro-doctor) |
