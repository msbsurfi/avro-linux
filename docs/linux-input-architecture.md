# Linux Input Architecture for Avro Linux

## 1. Architectural Philosophy

Input method architecture on modern Linux systems requires strict adherence to security boundaries and windowing protocols. Linux is transitioning from legacy X11 display servers to Wayland compositors (such as KWin on KDE Plasma, Mutter on GNOME Shell, and wlroots-based compositors).

### 1.1 Why Global Keyboard Hooking Fails on Modern Linux
Under X11, legacy tools could use `XRecord`, `XInput2`, or `XTest` to passively monitor and synthesize keystrokes globally. Under Wayland:
1. **Security Isolation**: Wayland clients are strictly isolated from one another. No normal client is permitted to eavesdrop on keystrokes typed into another window, preventing password sniffers and keyloggers.
2. **Synthetic Injection Blocked**: Clients cannot freely inject arbitrary hardware keystrokes into other windows without elevated root privileges or dedicated compositor-specific protocols.
3. **Compositor Instability**: Global grab hacks cause severe cursor freezing, compositor crashes, and input deadlocks.

Therefore, **IBus (Intelligent Input Bus)** serves as the official, secure, standardized input-method boundary on Linux.

---

## 2. Decoupled Engine & Presentation Layer

To achieve the seamless Windows Avro experience without triggering Linux desktop bugs, Avro Linux employs a **Decoupled Architecture**:

```
+-------------------------------------------------------------+
|                     Target Application                      |
|       (Kate, Firefox, Chrome, VS Code, LibreOffice, Gedit)  |
+-------------------------------------------------------------+
                              ▲
                              │ Input Context Protocol (D-Bus / Wayland)
                              ▼
+-------------------------------------------------------------+
|                      IBus Daemon                            |
|             (/usr/bin/ibus-daemon -drx)                     |
+-------------------------------------------------------------+
                              ▲
                              │ Engine IPC (D-Bus)
                              ▼
+-------------------------------------------------------------+
|               Avro Input Engine (main-gjs.js)               |
|  - Phonetic conversion (avrolib.js)                         |
|  - Dictionary search (dbsearch.js)                          |
|  - Suffix expansion (suffixdict.js)                         |
|  - Autocorrect (autocorrect.js)                             |
|  - User Dictionary (userdictionary.js)                      |
|  - State management & atomic commit                         |
+-------------------------------------------------------------+
                              │
                              │ Unix Domain Socket IPC
                              │ ($XDG_RUNTIME_DIR/avro-ui.sock)
                              ▼
+-------------------------------------------------------------+
|               Avro Presentation UI Subsystem                |
|  1. Floating TopBar (src/standalone/topbar.js)              |
|     - Always-on-top, sticky, non-focus-stealing             |
|     - F12 mode toggle & layout switcher                     |
|  2. Dedicated Floating Preview (src/ui/floating-preview.js)  |
|     - Real-time phonetic preview & candidate badges          |
|     - Zero focus theft (accept_focus = false)               |
+-------------------------------------------------------------+
```

### 2.1 The Focus-Theft Problem & Its Solution
In earlier implementations, relying on generic desktop candidate popups (`ibus-ui-gtk3` or KDE kimpanel) caused severe flickering:
1. When typing a word, `engine.update_auxiliary_text()` triggered the desktop to create an auxiliary X11/Wayland popup.
2. The compositor recognized the popup as a newly mapped window and dispatched a `focus-out` event to the active text editor.
3. The editor’s `focus-out` caused the input engine to reset its buffer, immediately hiding the popup.
4. The popup disappearing refocused the text editor, creating an infinite flicker loop where text was lost.

**The Avro Linux Solution**:
* **Direct Inline Preedit**: The transliterated Bengali text is rendered directly inline in the active editor using `engine.update_preedit_text()`.
* **Atomic Suffix Commits**: When committing on word boundary keys (Space, Return, Tab, Period), the engine emits `engine.commit_text()` with the punctuation suffix and returns `true` (consuming the event), preventing client-side double keystrokes.
* **Non-Focus-Stealing Preview UI**: The dedicated Avro preview window sets:
  ```javascript
  window.set_type_hint(Gdk.WindowTypeHint.TOOLTIP);
  window.set_accept_focus(false);
  window.set_focus_on_map(false);
  window.set_keep_above(true);
  window.stick();
  ```
  This window receives composition updates from the engine via a local Unix socket without ever competing with the compositor for keyboard focus.

---

## 3. Communication Protocol (Socket IPC)

The engine exposes a lightweight, local Unix domain socket at:
`${XDG_RUNTIME_DIR:-/tmp}/avro-ui.sock`

### Message Schema:
1. **Composition Update**:
   ```json
   {
     "type": "composition",
     "raw": "ami",
     "preview": "আমি",
     "candidates": ["আমি", "আমী"],
     "selected": 0,
     "visible": true
   }
   ```
2. **Hide / Reset**:
   ```json
   {
     "type": "hide"
   }
   ```
3. **Mode Toggle**:
   ```json
   {
     "type": "mode",
     "bangla": true
   }
   ```

If no UI client is connected to the socket, the engine continues processing keystrokes with inline preedit without any performance penalty or blocking.

---

## 4. Multi-Distro Support & System Integration

Avro Linux targets all major Debian-based distributions:
* **Debian 12 (Bookworm) & Debian 13 (Trixie)**
* **Ubuntu 22.04 LTS, 24.04 LTS, 26.04 LTS**
* **Linux Mint 21 & 22**
* **Pop!_OS 22.04 & 24.04**

System integration files installed automatically:
1. `/etc/profile.d/avro-linux.sh`: Configures session environment (`GTK_IM_MODULE=ibus`, `QT_IM_MODULE=ibus`, `XMODIFIERS=@im=ibus`).
2. `/etc/environment.d/99-avro-linux.conf`: Configures systemd user sessions.
3. `/etc/xdg/plasma-workspace/env/avro-linux.sh`: Configures KDE Plasma sessions.
4. `/etc/xdg/autostart/avro-ibus-autostart.desktop`: Ensures the IBus daemon launches cleanly on login.
5. `/usr/share/glib-2.0/schemas/99_avro_gnome_default.gschema.override`: Automatically registers `ibus-avro` in GNOME's input source list.
