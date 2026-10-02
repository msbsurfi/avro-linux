# Avro Linux Makefile
# SPDX-License-Identifier: MPL-2.0

SHELL := /bin/bash
prefix ?= /usr
pkgdatadir ?= $(prefix)/share/avro-linux
libexecdir ?= $(prefix)/libexec/avro-linux
datadir ?= $(prefix)/share
sysconfdir ?= /etc

.PHONY: all build test package install clean

all: build

build: src/common/evars.js data/ibus/ibus-avro.xml data/gsettings/gschemas.compiled

src/common/evars.js: src/common/evars.js.in
	@mkdir -p src/common
	sed -e 's|@pkgdatadir@|$(pkgdatadir)|g' \
	    -e 's|@libexecdir@|$(libexecdir)|g' \
	    $< > $@

data/ibus/ibus-avro.xml: data/ibus/ibus-avro.xml.in
	@mkdir -p data/ibus
	sed -e 's|@pkgdatadir@|$(pkgdatadir)|g' \
	    -e 's|@libexecdir@|$(libexecdir)|g' \
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
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/16x16/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/32x32/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/64x64/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/128x128/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/256x256/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/doc/avro-linux
	install -d -m 0755 $(DESTDIR)$(datadir)/fontconfig/conf.avail
	install -d -m 0755 $(DESTDIR)$(sysconfdir)/fonts/conf.d

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

	# Common & Engine scripts
	install -m 0644 src/common/evars.js $(DESTDIR)$(pkgdatadir)/common/evars.js
	install -m 0755 src/engine/main-gjs.js $(DESTDIR)$(pkgdatadir)/engine/main-gjs.js

	# Standalone application suite
	install -m 0755 src/standalone/main.js $(DESTDIR)$(pkgdatadir)/standalone/main.js
	install -m 0755 src/standalone/topbar.js $(DESTDIR)$(pkgdatadir)/standalone/topbar.js
	install -m 0755 src/standalone/avropad.js $(DESTDIR)$(pkgdatadir)/standalone/avropad.js
	install -m 0755 src/standalone/bijoyconverter.js $(DESTDIR)$(pkgdatadir)/standalone/bijoyconverter.js
	install -m 0755 src/standalone/layoutviewer.js $(DESTDIR)$(pkgdatadir)/standalone/layoutviewer.js
	install -m 0755 src/standalone/avromouse.js $(DESTDIR)$(pkgdatadir)/standalone/avromouse.js
	install -m 0755 src/standalone/doctor.js $(DESTDIR)$(pkgdatadir)/standalone/doctor.js
	install -m 0755 src/ui/floating-preview.js $(DESTDIR)$(pkgdatadir)/ui/floating-preview.js

	# Avro Core components
	install -m 0644 src/avro-core/phonetic/avrolib.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/avrolib.js
	install -m 0644 src/avro-core/phonetic/avroregexlib.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/avroregexlib.js
	install -m 0644 src/avro-core/phonetic/utf8.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/utf8.js
	install -m 0644 src/avro-core/dictionary/avrodict.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/avrodict.js
	install -m 0644 src/avro-core/dictionary/suffixdict.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/suffixdict.js
	install -m 0644 src/avro-core/dictionary/dbsearch.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/dbsearch.js
	install -m 0644 src/avro-core/dictionary/userdictionary.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/userdictionary.js
	install -m 0644 src/avro-core/autocorrect/autocorrect.js $(DESTDIR)$(pkgdatadir)/avro-core/autocorrect/autocorrect.js
	install -m 0644 src/avro-core/suggestions/levenshtein.js $(DESTDIR)$(pkgdatadir)/avro-core/suggestions/levenshtein.js
	install -m 0644 src/avro-core/suggestions/suggestionbuilder.js $(DESTDIR)$(pkgdatadir)/avro-core/suggestions/suggestionbuilder.js

	# Preferences application
	install -m 0755 src/preferences/pref.js $(DESTDIR)$(pkgdatadir)/preferences/pref.js
	install -m 0644 src/preferences/avropref.ui $(DESTDIR)$(pkgdatadir)/preferences/avropref.ui

	# Bangla font preference: Noto Bengali instead of Lohit/Mukti, whose
	# headline (matra) breaks over letters such as আ and ম
	install -m 0644 data/fontconfig/64-avro-bengali.conf $(DESTDIR)$(datadir)/fontconfig/conf.avail/64-avro-bengali.conf
	ln -sf $(datadir)/fontconfig/conf.avail/64-avro-bengali.conf $(DESTDIR)$(sysconfdir)/fonts/conf.d/64-avro-bengali.conf

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
	install -m 0644 data/applications/ibus-setup-avro.desktop $(DESTDIR)$(datadir)/applications/ibus-setup-avro.desktop
	install -m 0644 data/metainfo/com.github.sarim.ibus.avro.metainfo.xml $(DESTDIR)$(datadir)/metainfo/com.github.sarim.ibus.avro.metainfo.xml

	# Icons
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(pkgdatadir)/icons/avro-bangla.png
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(datadir)/pixmaps/avro-bangla.png
	install -m 0644 data/icons/avro-bangla.svg $(DESTDIR)$(datadir)/icons/hicolor/scalable/apps/avro-bangla.svg
	install -m 0644 data/icons/16x16/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/16x16/apps/avro-bangla.png
	install -m 0644 data/icons/32x32/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/32x32/apps/avro-bangla.png
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps/avro-bangla.png
	install -m 0644 data/icons/64x64/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/64x64/apps/avro-bangla.png
	install -m 0644 data/icons/128x128/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/128x128/apps/avro-bangla.png
	install -m 0644 data/icons/256x256/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/256x256/apps/avro-bangla.png

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
