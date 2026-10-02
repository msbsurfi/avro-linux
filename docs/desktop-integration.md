# Desktop Environment Integration Guide for Avro Linux

## 1. Overview

Avro Linux is engineered to integrate natively across all standard Linux desktop environments on Debian-based distributions:
* **GNOME** (Wayland & X11)
* **KDE Plasma 5 & 6** (Wayland & X11)
* **XFCE 4**
* **Cinnamon**
* **MATE**
* **LXQt**

---

## 2. Desktop Environment Details

### 2.1 GNOME Shell (Ubuntu, Debian GNOME)
* **Session Types**: Wayland (default) and X11.
* **Input Architecture**: GNOME has native IBus bus integration embedded in `gnome-shell`.
* **Configuration**:
  Avro Linux installs a system-wide schema override at:
  `/usr/share/glib-2.0/schemas/99_avro_gnome_default.gschema.override`
  This configures:
  ```ini
  [org.gnome.desktop.input-sources]
  sources=[('xkb', 'us'), ('ibus', 'ibus-avro')]
  ```
  Users can switch between English and Bengali using `Super+Space` or `F12` inside Avro.

### 2.2 KDE Plasma 5.27 & Plasma 6 (Kubuntu, Debian KDE, KDE Neon)
* **Session Types**: Wayland (KWin) and X11.
* **Input Architecture**:
  - Under X11: Uses `QT_IM_MODULE=ibus` and `XMODIFIERS=@im=ibus`.
  - Under Wayland: KWin supports input methods via the Wayland `zwp_text_input_v2` / `v3` protocols.
* **Session Variables**:
  Configured automatically via `/etc/xdg/plasma-workspace/env/avro-linux.sh`:
  ```bash
  export GTK_IM_MODULE=ibus
  export QT_IM_MODULE=ibus
  export XMODIFIERS=@im=ibus
  ```
* **KWin Virtual Keyboard Setting**:
  To ensure KWin forwards Wayland keystrokes through IBus on Wayland sessions:
  `System Settings` -> `Input Devices` -> `Virtual Keyboard` -> Select **IBus Wayland**.

### 2.3 XFCE, Cinnamon, MATE, and LXQt
* **Session Types**: X11.
* **Input Architecture**: Standard X11 input method protocol with `im-config`.
* **Autostart**:
  The system desktop entry `/etc/xdg/autostart/avro-ibus-autostart.desktop` launches `ibus-daemon -drx` automatically upon desktop login.

---

## 3. Desktop Application Entries

Avro Linux installs standardized FreeDesktop `.desktop` entries in `/usr/share/applications/`:
1. `avro-topbar.desktop`: Floating Avro TopBar with quick tools and mode switch.
2. `avro-pad.desktop`: Avro Pad Bengali text editor.
3. `avro-converter.desktop`: Unicode to Bijoy text converter.
4. `avro-layout.desktop`: Keyboard layout viewer.
5. `avro-preferences.desktop`: Avro settings and configuration.
6. `avro-doctor.desktop`: Diagnostic health check and interactive test tool.

---

## 4. Icon Theme Integration

Icons are installed in standard FreeDesktop directories under `/usr/share/icons/hicolor/`:
* `scalable/apps/ibus-avro.svg`
* `16x16/apps/ibus-avro.png`
* `24x24/apps/ibus-avro.png`
* `32x32/apps/ibus-avro.png`
* `48x48/apps/ibus-avro.png`
* `64x64/apps/ibus-avro.png`
* `128x128/apps/ibus-avro.png`
* `256x256/apps/ibus-avro.png`

Icons are refreshed in `postinst` via `gtk-update-icon-cache`.

---

## 5. AppStream Metadata

Metadata conforming to AppStream 1.0 specifications is installed at:
`/usr/share/metainfo/com.omicronlab.Avro.metainfo.xml`
Validates with `appstreamcli validate --pedantic`.
