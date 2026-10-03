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
|  - Windows-style Preview Window (src/ui/floating-preview.js)|
|    drawn in-process: X11 override-redirect popup, no focus  |
+-------------------------------------------------------------+
                              │
                              │ GSettings (com.omicronlab.avro)
                              ▼
+-------------------------------------------------------------+
|               Avro Desktop Tools                            |
|  - Floating TopBar (src/standalone/topbar.js)               |
|    always-on-top, sticky, non-focus-stealing, F12 / mode    |
|  - Preferences (src/preferences/pref.js)                    |
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
* **Non-Focus-Stealing Preview Window**: The engine imports `src/ui/floating-preview.js` and draws the Windows-style Preview Window itself, as a `Gtk.WindowType.POPUP` window. On X11 (and XWayland) that is an override-redirect window: the window manager never manages or focuses it, so mapping it can never send `focus-out` to the editor. GTK is forced onto the X11 backend for this window, because only X11 lets a popup be placed at absolute screen coordinates (the caret rectangle from `set-cursor-location`).

---

## 3. Preview Presentation

The engine updates the preedit first, then the preview, on every key, in the same process (no IPC):

| Situation | What shows the suggestions |
| :--- | :--- |
| X11 session (XFCE, MATE, Cinnamon, GNOME/KDE on Xorg, xrdp) | Avro Preview Window |
| GNOME Wayland (`preview-style` = `auto`) | GNOME Shell's IBus candidate panel: typed text as auxiliary text above a vertical list |
| KDE Plasma / other Wayland with XWayland | Avro Preview Window through XWayland |
| `preview-style` = `system` | The desktop IBus candidate panel (not on non-GNOME Wayland, where it steals focus) |
| `switch-preview` = false | Inline preedit only |

Preview settings (`com.omicronlab.avro`): `switch-preview`, `preview-style` (`auto`/`classic`/`system`), `preview-theme` (`classic`/`dark`), `preview-pinned`, `preview-pin-x`, `preview-pin-y`. The TopBar's Tools → Avro Phonetic Options → Show Preview Window and `avro-preview` toggle `switch-preview`; `avro-preview --demo` shows the window with sample suggestions.

### 3.1 Focus changes keep the word in the right field
The preedit is sent with `IBus.PreeditFocusMode.COMMIT`. When focus moves or the application resets the input context (for example a click elsewhere in the text), the client (GTK, Qt, Chromium) or ibus-daemon keeps the visible word in the field it was typed in, at that moment. The engine then only clears its own state. It must not call `commit_text()` itself: with IBus' global engine the same engine object is attached to the next input context immediately after `focus-out`, so a late commit would land in the newly focused field.

### 3.2 Fixed keyboard layouts
The fixed layouts of Avro Keyboard (National (Jatiya), Probhat, Bornona, Avro Easy, Munir Optima) are typed by the same engine, chosen with `keyboard-layout` (`phonetic` or a layout id); the TopBar keeps `bangla-layout` = `ibus-avro` for them. A key is looked up by its physical key code (`src/avro-core/fixed/fixedlayout.js`), and the typing rules of Avro Keyboard (`fixedtyper.js`) build the word, which is the preedit until Space, Enter, Tab, a key outside the layout or a focus change commits it. No X keyboard layout is switched, so nothing depends on the display server: the layouts work on Wayland as on X11. Options: `fixed-typing-style` (`modern`/`old`), `fixed-old-reph`, `fixed-vowel-forming`, `fixed-fix-chandra`, `fixed-numpad-bangla`.

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
