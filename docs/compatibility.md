# Compatibility and setup

Avro Linux is an IBus engine. It deliberately does not start a daemon, alter
desktop environment variables, or add an input source for a user. Those are
session-specific choices owned by the desktop input-method configuration.

## Setup

1. Install the package.
2. Ensure IBus is selected by your desktop's input-method settings (or
   `im-config` where applicable), then sign out and in if the desktop requests
   it.
3. Add **Bengali → Avro Phonetic** through GNOME Input Sources, IBus
   Preferences, or the equivalent KDE/Xfce/MATE/Cinnamon control panel.
4. Use the desktop's normal input-source shortcut to select Avro.

`F12` changes Bangla/English mode only while Avro is already the active IBus
engine. It is not, and cannot be, a system-wide hotkey on Wayland. Configure a
desktop shortcut for switching input sources if you need global switching.

For non-GNOME desktops, configure the standard IBus environment in the user or
session configuration when the distribution has not already done so:

```sh
export GTK_IM_MODULE=ibus
export QT_IM_MODULE=ibus
export XMODIFIERS=@im=ibus
```

## Evidence-based matrix

| Target | Status | Evidence / notes |
| --- | --- | --- |
| Core transliteration, dictionary, autocorrect, personal dictionary | Tested | Deterministic GJS suite |
| IBus D-Bus connection and component creation | Tested | Live IBus integration test in the build environment |
| Desktop/AppStream/GSettings metadata | Tested | Validation suite |
| Debian package contents and maintainer scripts | Tested | Package validation in CI/local package test |
| GNOME Wayland/X11 | Not tested in this repository environment | Uses normal IBus integration; manual session test required |
| KDE Plasma Wayland/X11 | Not tested | Configure IBus in Plasma first |
| Xfce, Cinnamon, MATE, LXQt | Not tested | Configure the session's standard IBus variables if needed |
| GTK, Qt, browser, Electron, LibreOffice, terminal applications | Not tested end-to-end | Manual application matrix is required before a compatibility claim |

The engine uses standard IBus preedit, commit, lookup-table, focus, and reset
APIs. This is intended to maximize interoperability; it is not proof that every
toolkit/application combination has been tested.

## Known limitations

* Desktop shells and sandboxes can impose their own IBus restrictions.
* Candidate popup rendering is controlled by the IBus panel and client toolkit.
* No global keyboard hook is installed. This is intentional for Wayland and
  desktop-session safety.
* Personal dictionary entries are stored per user at
  `$XDG_CONFIG_HOME/avro/user-dictionary.json` (normally
  `~/.config/avro/user-dictionary.json`) and are retained by package removal.
