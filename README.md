# Avro Linux

Avro Linux is an offline Avro Phonetic Bengali input method for IBus. It uses
native IBus preedit/commit APIs rather than a global keyboard hook, so Bengali
typing is available to applications through the normal Linux input-method path.

It includes the MPL-2.0 Avro phonetic core, dictionary suggestions,
autocorrect, per-user learned candidate choices, a per-user personal
dictionary, GSettings-backed preferences, desktop metadata, AppStream data,
and Debian packaging.

## Build and test

```sh
make
make test
make package
./tests/packaging/test-package.sh
```

Build dependencies include `make`, `gjs`, `ibus`, `gir1.2-ibus-1.0`,
`gir1.2-gtk-3.0`, `glib-compile-schemas`, `fakeroot`, `dpkg-dev`,
`desktop-file-utils`, and `appstream`.

## Install and enable

```sh
sudo apt install ./avro-linux_1.0.0-1_all.deb
```

Then choose IBus in your desktop input-method settings if necessary, add
**Bengali → Avro Phonetic**, and select it with the normal desktop input-source
shortcut. Installation intentionally does not start IBus, modify global IM
environment variables, or overwrite your input sources.

Run `avro-preferences` to configure candidate behavior and the personal
dictionary. Personal entries are stored only for the current user at
`$XDG_CONFIG_HOME/avro/user-dictionary.json` and are preserved on removal.

`F12` toggles Bangla/English while Avro is the active IBus engine. It is not a
system-wide hotkey; use the desktop's input-source shortcut to switch engines.

## Privacy

There is no telemetry, cloud processing, network dependency, raw keystroke
logging, or typed-text collection. Diagnostics report environment status only.

## Compatibility

See [docs/compatibility.md](docs/compatibility.md) for setup, known
limitations, and the evidence-based compatibility matrix. Do not treat an
untested desktop or application as certified solely because it uses IBus.

## License and attribution

The project is MPL-2.0. It preserves attribution for OmicronLab's Avro core and
Sarim Khan's `ibus-avro` Linux implementation. See `LICENSE`, `NOTICE`,
`AUTHORS`, and [docs/licensing-notes.md](docs/licensing-notes.md).
