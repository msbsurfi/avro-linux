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
  The package changes no user's input sources. The Avro TopBar asks each user once
  whether to add `('ibus', 'ibus-avro')` to `org.gnome.desktop.input-sources`
  (at the end, so the user's first keyboard stays the default); Avro Doctor's
  Auto-Fix and `avro-setup` can add it too.
  Users can switch between English and Bengali using `Super+Space` or `F12` inside Avro.

### 2.2 KDE Plasma 5.27 & Plasma 6 (Kubuntu, Debian KDE, KDE Neon)
* **Session Types**: Wayland (KWin) and X11.
* **Input Architecture**:
  - Under X11: Uses `QT_IM_MODULE=ibus` and `XMODIFIERS=@im=ibus`.
  - Under Wayland: KWin supports input methods via the Wayland `zwp_text_input_v2` / `v3` protocols.
* **Session Variables**:
  `/etc/xdg/plasma-workspace/env/avro-linux.sh` sets `GTK_IM_MODULE=ibus`,
  `QT_IM_MODULE=ibus` and `XMODIFIERS=@im=ibus` on X11 only, and only when no
  input method framework is chosen yet (im-config, the user or fcitx keep theirs).
  On Wayland it sets nothing: Plasma reaches IBus through its virtual keyboard setting.
* **KWin Virtual Keyboard Setting**:
  On Wayland, KWin forwards keystrokes to IBus only when **IBus Wayland** is chosen in
  `System Settings` -> `Keyboard` -> `Virtual Keyboard` (Plasma 5: `Input Devices` ->
  `Virtual Keyboard`), stored as `[Wayland] InputMethod` in `~/.config/kwinrc`.
  When no input method is chosen there, the TopBar's one-time question, Avro Setup's
  "Add Avro to my keyboard list" and Avro Doctor's Auto-Fix choose IBus Wayland
  (`kwriteconfig6 --file kwinrc --group Wayland --key InputMethod --notify …`); it
  takes effect for sure after logging out and in. Another input method (fcitx, Maliit)
  is never replaced: Avro Doctor reports it (`src/common/kdewayland.js`).

### 2.3 XFCE, Cinnamon, MATE, and LXQt
* **Session Types**: X11.
* **Input Architecture**: Standard X11 input method protocol with `im-config`.
* **Session variables**: `/etc/profile.d/avro-linux.sh` sets the IBus variables only
  when nothing else chose an input method framework.
* **Autostart**: `/etc/xdg/autostart/avro-topbar.desktop` starts the Avro TopBar on login;
  Preferences turns that off per user with a `Hidden=true` entry in `~/.config/autostart`.
  When IBus is not running, the TopBar starts it in the background with `ibus-daemon -drx`
  (on GNOME it waits for the IBus that GNOME Shell starts).

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
