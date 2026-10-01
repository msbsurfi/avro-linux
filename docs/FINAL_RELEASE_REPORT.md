# Release verification report

## Version

* Project/package: `1.0.0-1`
* Git revision: recorded at build time by `git rev-parse HEAD`
* Package artifact: `avro-linux_1.0.0-1_all.deb`

## Verified in this repository environment

* `make test`: phonetic corpus, dictionary, autocorrect, XDG personal
  dictionary, engine-buffer, live IBus connection, preferences, standalone,
  desktop metadata, AppStream, and GSettings checks.
* `make package` followed by `tests/packaging/test-package.sh`: package
  metadata, installed paths, executable modes, and non-invasive maintainer
  script assertions.

## Not claimed as tested

No graphical GNOME/KDE/Xfce/Cinnamon/MATE/LXQt session, Wayland/X11 session, or
real GTK/Qt/browser/Electron/LibreOffice/terminal application was available in
this repository environment. See `docs/compatibility.md` for the accurate
matrix and manual setup steps.

## Privacy and installation behavior

Typing is local and has no network dependency or typed-text logging. The
package does not start IBus, change global IM environment variables, or replace
GNOME input-source settings. User settings and the personal dictionary remain
per-user across upgrade/removal.

## Build, install, upgrade, removal

```sh
make
make test
make package
sudo apt install ./avro-linux_1.0.0-1_all.deb
# Upgrade: install a newer package with the same command.
sudo apt remove avro-linux
```

After installation, add **Bengali → Avro Phonetic** using the desktop's normal
IBus/input-source settings. Package removal does not delete user dictionary or
GSettings data.
