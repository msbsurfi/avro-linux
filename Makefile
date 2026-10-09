# Avro Linux Makefile
# SPDX-License-Identifier: MPL-2.0

SHELL := /bin/bash
# The one place the version number lives; everything else reads it from here.
VERSION := 1.3.1
prefix ?= /usr
pkgdatadir ?= $(prefix)/share/avro-linux
libexecdir ?= $(prefix)/libexec/avro-linux
datadir ?= $(prefix)/share
sysconfdir ?= /etc

.PHONY: all build test package install clean print-version

all: build

build: src/common/evars.js data/ibus/ibus-avro.xml data/gsettings/gschemas.compiled

print-version:
	@echo $(VERSION)

src/common/evars.js: src/common/evars.js.in Makefile
	@mkdir -p src/common
	sed -e 's|@pkgdatadir@|$(pkgdatadir)|g' \
	    -e 's|@libexecdir@|$(libexecdir)|g' \
	    -e 's|@version@|$(VERSION)|g' \
	    $< > $@

data/ibus/ibus-avro.xml: data/ibus/ibus-avro.xml.in Makefile
	@mkdir -p data/ibus
	sed -e 's|@pkgdatadir@|$(pkgdatadir)|g' \
	    -e 's|@libexecdir@|$(libexecdir)|g' \
	    -e 's|@version@|$(VERSION)|g' \
	    $< > $@

data/gsettings/gschemas.compiled: data/gsettings/com.omicronlab.avro.gschema.xml
	@mkdir -p data/gsettings
	glib-compile-schemas data/gsettings/

test: build
	@chmod +x tests/run-tests.sh
	@./tests/run-tests.sh

install: build
	# Application directories
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/common
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/engine
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/avro-core
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/avro-core/phonetic
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/avro-core/dictionary
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/avro-core/autocorrect
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/avro-core/suggestions
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/avro-core/fixed
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/preferences
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/standalone
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/ui
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/icons

	# System integration directories
	install -d -m 0755 $(DESTDIR)$(prefix)/bin
	install -d -m 0755 $(DESTDIR)$(datadir)/ibus/component
	install -d -m 0755 $(DESTDIR)$(datadir)/glib-2.0/schemas
	install -d -m 0755 $(DESTDIR)$(datadir)/applications
	install -d -m 0755 $(DESTDIR)$(datadir)/metainfo
	install -d -m 0755 $(DESTDIR)$(datadir)/pixmaps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/scalable/actions
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/16x16/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/22x22/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/24x24/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/32x32/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/64x64/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/128x128/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/256x256/apps
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/images
	install -d -m 0755 $(DESTDIR)$(datadir)/doc/avro-linux
	install -d -m 0755 $(DESTDIR)$(datadir)/fontconfig/conf.avail
	install -d -m 0755 $(DESTDIR)$(sysconfdir)/fonts/conf.d
	install -d -m 0755 $(DESTDIR)$(sysconfdir)/profile.d
	install -d -m 0755 $(DESTDIR)$(sysconfdir)/xdg/autostart
	install -d -m 0755 $(DESTDIR)$(sysconfdir)/xdg/plasma-workspace/env

	# Command-line binary launchers
	install -m 0755 bin/avro $(DESTDIR)$(prefix)/bin/avro
	install -m 0755 bin/avro-topbar $(DESTDIR)$(prefix)/bin/avro-topbar
	install -m 0755 bin/avro-pad $(DESTDIR)$(prefix)/bin/avro-pad
	install -m 0755 bin/avro-converter $(DESTDIR)$(prefix)/bin/avro-converter
	install -m 0755 bin/avro-layout $(DESTDIR)$(prefix)/bin/avro-layout
	install -m 0755 bin/avro-preferences $(DESTDIR)$(prefix)/bin/avro-preferences
	install -m 0755 bin/avro-doctor $(DESTDIR)$(prefix)/bin/avro-doctor
	install -m 0755 bin/avro-linux-doctor $(DESTDIR)$(prefix)/bin/avro-linux-doctor
	install -m 0755 bin/avro-preview $(DESTDIR)$(prefix)/bin/avro-preview
	install -m 0755 bin/avro-mouse $(DESTDIR)$(prefix)/bin/avro-mouse
	install -m 0755 bin/avro-splash $(DESTDIR)$(prefix)/bin/avro-splash
	install -m 0755 bin/avro-engine $(DESTDIR)$(prefix)/bin/avro-engine
	install -m 0755 bin/avro-setup $(DESTDIR)$(prefix)/bin/avro-setup

	# Common & Engine scripts
	install -m 0644 src/common/evars.js $(DESTDIR)$(pkgdatadir)/common/evars.js
	install -m 0644 src/common/autostart.js $(DESTDIR)$(pkgdatadir)/common/autostart.js
	install -m 0644 src/common/avrotheme.js $(DESTDIR)$(pkgdatadir)/common/avrotheme.js
	install -m 0755 src/engine/avro-engine $(DESTDIR)$(pkgdatadir)/engine/avro-engine
	install -m 0755 src/engine/main-gjs.js $(DESTDIR)$(pkgdatadir)/engine/main-gjs.js

	# Standalone application suite
	install -m 0755 src/standalone/main.js $(DESTDIR)$(pkgdatadir)/standalone/main.js
	install -m 0755 src/standalone/topbar.js $(DESTDIR)$(pkgdatadir)/standalone/topbar.js
	install -m 0755 src/standalone/splash.js $(DESTDIR)$(pkgdatadir)/standalone/splash.js
	install -m 0755 src/standalone/avropad.js $(DESTDIR)$(pkgdatadir)/standalone/avropad.js
	install -m 0755 src/standalone/bijoyconverter.js $(DESTDIR)$(pkgdatadir)/standalone/bijoyconverter.js
	install -m 0755 src/standalone/layoutviewer.js $(DESTDIR)$(pkgdatadir)/standalone/layoutviewer.js
	install -m 0755 src/standalone/avromouse.js $(DESTDIR)$(pkgdatadir)/standalone/avromouse.js
	install -m 0755 src/standalone/doctor.js $(DESTDIR)$(pkgdatadir)/standalone/doctor.js
	install -m 0755 src/standalone/setup-wizard.js $(DESTDIR)$(pkgdatadir)/standalone/setup-wizard.js
	install -m 0755 src/ui/floating-preview.js $(DESTDIR)$(pkgdatadir)/ui/floating-preview.js

	# Avro Core components
	install -m 0644 src/avro-core/phonetic/avrolib.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/avrolib.js
	install -m 0644 src/avro-core/phonetic/avroregexlib.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/avroregexlib.js
	install -m 0644 src/avro-core/phonetic/utf8.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/utf8.js
	install -m 0644 src/avro-core/bijoyconverter.js $(DESTDIR)$(pkgdatadir)/avro-core/bijoyconverter.js
	install -m 0644 src/avro-core/dictionary/avrodict.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/avrodict.js
	install -m 0644 src/avro-core/dictionary/suffixdict.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/suffixdict.js
	install -m 0644 src/avro-core/dictionary/dbsearch.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/dbsearch.js
	install -m 0644 src/avro-core/dictionary/userdictionary.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/userdictionary.js
	install -m 0644 src/avro-core/autocorrect/autocorrect.js $(DESTDIR)$(pkgdatadir)/avro-core/autocorrect/autocorrect.js
	install -m 0644 src/avro-core/suggestions/levenshtein.js $(DESTDIR)$(pkgdatadir)/avro-core/suggestions/levenshtein.js
	install -m 0644 src/avro-core/suggestions/suggestionbuilder.js $(DESTDIR)$(pkgdatadir)/avro-core/suggestions/suggestionbuilder.js
	# Fixed keyboard layouts of Avro Keyboard (National, Probhat, Bornona, Avro Easy, Munir Optima)
	install -m 0644 src/avro-core/fixed/layoutdata.js $(DESTDIR)$(pkgdatadir)/avro-core/fixed/layoutdata.js
	install -m 0644 src/avro-core/fixed/fixedlayout.js $(DESTDIR)$(pkgdatadir)/avro-core/fixed/fixedlayout.js
	install -m 0644 src/avro-core/fixed/fixedtyper.js $(DESTDIR)$(pkgdatadir)/avro-core/fixed/fixedtyper.js

	# Preferences application
	install -m 0755 src/preferences/pref.js $(DESTDIR)$(pkgdatadir)/preferences/pref.js
	install -m 0644 src/preferences/avropref.ui $(DESTDIR)$(pkgdatadir)/preferences/avropref.ui

	# Bangla font preference: Noto Bengali instead of Lohit/Mukti, whose
	# headline (matra) breaks over letters such as আ and ম
	install -m 0644 data/fontconfig/64-avro-bengali.conf $(DESTDIR)$(datadir)/fontconfig/conf.avail/64-avro-bengali.conf
	ln -sf $(datadir)/fontconfig/conf.avail/64-avro-bengali.conf $(DESTDIR)$(sysconfdir)/fonts/conf.d/64-avro-bengali.conf

	# Session input method environment variables
	install -m 0644 data/profile.d/avro-linux.sh $(DESTDIR)$(sysconfdir)/profile.d/avro-linux.sh
	install -m 0644 data/plasma-workspace/env/avro-linux.sh $(DESTDIR)$(sysconfdir)/xdg/plasma-workspace/env/avro-linux.sh

	# Autostart on desktop login
	install -m 0644 data/autostart/avro-topbar.desktop $(DESTDIR)$(sysconfdir)/xdg/autostart/avro-topbar.desktop

	# Integration files
	install -m 0644 data/ibus/ibus-avro.xml $(DESTDIR)$(datadir)/ibus/component/ibus-avro.xml
	install -m 0644 data/gsettings/com.omicronlab.avro.gschema.xml $(DESTDIR)$(datadir)/glib-2.0/schemas/com.omicronlab.avro.gschema.xml
	install -m 0644 data/applications/com.github.avrolinux.Avro.desktop $(DESTDIR)$(datadir)/applications/com.github.avrolinux.Avro.desktop
	install -m 0644 data/applications/avro-topbar.desktop $(DESTDIR)$(datadir)/applications/avro-topbar.desktop
	install -m 0644 data/applications/avro-pad.desktop $(DESTDIR)$(datadir)/applications/avro-pad.desktop
	install -m 0644 data/applications/avro-converter.desktop $(DESTDIR)$(datadir)/applications/avro-converter.desktop
	install -m 0644 data/applications/avro-layout.desktop $(DESTDIR)$(datadir)/applications/avro-layout.desktop
	install -m 0644 data/applications/avro-mouse.desktop $(DESTDIR)$(datadir)/applications/avro-mouse.desktop
	install -m 0644 data/applications/avro-doctor.desktop $(DESTDIR)$(datadir)/applications/avro-doctor.desktop
	install -m 0644 data/applications/avro-preview.desktop $(DESTDIR)$(datadir)/applications/avro-preview.desktop
	install -m 0644 data/applications/avro-setup.desktop $(DESTDIR)$(datadir)/applications/avro-setup.desktop
	install -m 0644 data/applications/ibus-setup-avro.desktop $(DESTDIR)$(datadir)/applications/ibus-setup-avro.desktop
	install -m 0644 data/metainfo/com.github.sarim.ibus.avro.metainfo.xml $(DESTDIR)$(datadir)/metainfo/com.github.sarim.ibus.avro.metainfo.xml

	# Icons
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(pkgdatadir)/icons/avro-bangla.png
	install -m 0644 data/icons/avro-bn.png $(DESTDIR)$(pkgdatadir)/icons/avro-bn.png
	install -m 0644 data/icons/avro-en.png $(DESTDIR)$(pkgdatadir)/icons/avro-en.png
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(datadir)/pixmaps/avro-bangla.png
	install -m 0644 data/icons/avro-bn.png $(DESTDIR)$(datadir)/pixmaps/avro-bn.png
	install -m 0644 data/icons/avro-en.png $(DESTDIR)$(datadir)/pixmaps/avro-en.png
	install -m 0644 data/icons/avro-bangla.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-bangla.svg
	install -m 0644 data/icons/avro-bn.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-bn.svg
	install -m 0644 data/icons/avro-en.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-en.svg
	install -m 0644 data/icons/avro-pad.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-pad.svg
	install -m 0644 data/icons/avro-preferences.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-preferences.svg
	install -m 0644 data/icons/avro-converter.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-converter.svg
	install -m 0644 data/icons/avro-layout.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-layout.svg
	install -m 0644 data/icons/avro-mouse.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-mouse.svg
	install -m 0644 data/icons/avro-doctor.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-doctor.svg
	install -m 0644 data/icons/symbolic/*-symbolic.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/actions/
	install -m 0644 data/icons/16x16/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/16x16/apps/avro-bangla.png
	install -m 0644 data/icons/16x16/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/16x16/apps/avro-bn.png
	install -m 0644 data/icons/16x16/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/16x16/apps/avro-en.png
	install -m 0644 data/icons/22x22/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/22x22/apps/avro-bangla.png
	install -m 0644 data/icons/22x22/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/22x22/apps/avro-bn.png
	install -m 0644 data/icons/22x22/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/22x22/apps/avro-en.png
	install -m 0644 data/icons/24x24/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/24x24/apps/avro-bangla.png
	install -m 0644 data/icons/24x24/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/24x24/apps/avro-bn.png
	install -m 0644 data/icons/24x24/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/24x24/apps/avro-en.png
	install -m 0644 data/icons/32x32/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/32x32/apps/avro-bangla.png
	install -m 0644 data/icons/32x32/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/32x32/apps/avro-bn.png
	install -m 0644 data/icons/32x32/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/32x32/apps/avro-en.png
	install -m 0644 data/icons/48x48/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps/avro-bangla.png
	install -m 0644 data/icons/48x48/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps/avro-bn.png
	install -m 0644 data/icons/48x48/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps/avro-en.png
	install -m 0644 data/icons/64x64/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/64x64/apps/avro-bangla.png
	install -m 0644 data/icons/64x64/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/64x64/apps/avro-bn.png
	install -m 0644 data/icons/64x64/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/64x64/apps/avro-en.png
	install -m 0644 data/icons/128x128/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/128x128/apps/avro-bangla.png
	install -m 0644 data/icons/128x128/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/128x128/apps/avro-bn.png
	install -m 0644 data/icons/128x128/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/128x128/apps/avro-en.png
	install -m 0644 data/icons/256x256/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/256x256/apps/avro-bangla.png
	install -m 0644 data/icons/256x256/avro-bn.png $(DESTDIR)$(datadir)/icons/hicolor/256x256/apps/avro-bn.png
	install -m 0644 data/icons/256x256/avro-en.png $(DESTDIR)$(datadir)/icons/hicolor/256x256/apps/avro-en.png

	# Images & Splash
	install -m 0644 data/images/splash.jpg $(DESTDIR)$(pkgdatadir)/images/splash.jpg

	# Documentation
	install -m 0644 README.md $(DESTDIR)$(datadir)/doc/avro-linux/README.md
	install -m 0644 LICENSE $(DESTDIR)$(datadir)/doc/avro-linux/copyright
	install -m 0644 NOTICE $(DESTDIR)$(datadir)/doc/avro-linux/NOTICE
	install -m 0644 debian/changelog $(DESTDIR)$(datadir)/doc/avro-linux/changelog.Debian
	install -m 0644 docs/compatibility.md $(DESTDIR)$(datadir)/doc/avro-linux/compatibility.md
	install -m 0644 docs/compatibility-matrix.md $(DESTDIR)$(datadir)/doc/avro-linux/compatibility-matrix.md
	install -m 0644 docs/windows-avro-behavior.md $(DESTDIR)$(datadir)/doc/avro-linux/windows-avro-behavior.md
	install -m 0644 docs/linux-input-architecture.md $(DESTDIR)$(datadir)/doc/avro-linux/linux-input-architecture.md
	install -m 0644 docs/desktop-integration.md $(DESTDIR)$(datadir)/doc/avro-linux/desktop-integration.md
	install -m 0644 docs/licensing-notes.md $(DESTDIR)$(datadir)/doc/avro-linux/licensing-notes.md
	install -m 0644 docs/FINAL_RELEASE_REPORT.md $(DESTDIR)$(datadir)/doc/avro-linux/FINAL_RELEASE_REPORT.md

package: build
	@./scripts/build-deb.sh

clean:
	rm -rf build/
	rm -f *.deb
	rm -f data/ibus/ibus-avro.xml
	rm -f data/gsettings/gschemas.compiled
	rm -f src/common/evars.js
