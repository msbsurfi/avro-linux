# Avro Linux Makefile
# SPDX-License-Identifier: MPL-2.0

SHELL := /bin/bash
prefix ?= /usr
pkgdatadir ?= $(prefix)/share/avro-linux
libexecdir ?= $(prefix)/libexec/avro-linux
datadir ?= $(prefix)/share

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
	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/icons

	# System integration directories
	install -d -m 0755 $(DESTDIR)$(prefix)/bin
	install -d -m 0755 $(DESTDIR)$(datadir)/ibus/component
	install -d -m 0755 $(DESTDIR)$(datadir)/glib-2.0/schemas
	install -d -m 0755 $(DESTDIR)$(datadir)/applications
	install -d -m 0755 $(DESTDIR)$(datadir)/metainfo
	install -d -m 0755 $(DESTDIR)$(datadir)/pixmaps
	install -d -m 0755 $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps
	install -d -m 0755 $(DESTDIR)$(datadir)/doc/avro-linux

	install -d -m 0755 $(DESTDIR)$(pkgdatadir)/daemon
	install -d -m 0755 $(DESTDIR)$(datadir)/avro-linux/autostart
	install -d -m 0755 /etc/xdg/autostart 2>/dev/null || true

	# Command-line binary launchers
	install -m 0755 bin/avro $(DESTDIR)$(prefix)/bin/avro
	install -m 0755 bin/avro-topbar $(DESTDIR)$(prefix)/bin/avro-topbar
	install -m 0755 bin/avro-pad $(DESTDIR)$(prefix)/bin/avro-pad
	install -m 0755 bin/avro-converter $(DESTDIR)$(prefix)/bin/avro-converter
	install -m 0755 bin/avro-layout $(DESTDIR)$(prefix)/bin/avro-layout
	install -m 0755 bin/avro-preferences $(DESTDIR)$(prefix)/bin/avro-preferences
	install -m 0755 bin/avro-daemon $(DESTDIR)$(prefix)/bin/avro-daemon

	# Daemon (system-wide input, no IBus needed)
	install -m 0755 src/daemon/avro-daemon.py $(DESTDIR)$(pkgdatadir)/daemon/avro-daemon.py

	# Common & Engine scripts
	install -m 0644 src/common/evars.js $(DESTDIR)$(pkgdatadir)/common/evars.js
	install -m 0755 src/engine/main-gjs.js $(DESTDIR)$(pkgdatadir)/engine/main-gjs.js

	# Standalone application suite
	install -m 0755 src/standalone/main.js $(DESTDIR)$(pkgdatadir)/standalone/main.js
	install -m 0755 src/standalone/topbar.js $(DESTDIR)$(pkgdatadir)/standalone/topbar.js
	install -m 0755 src/standalone/avropad.js $(DESTDIR)$(pkgdatadir)/standalone/avropad.js
	install -m 0755 src/standalone/bijoyconverter.js $(DESTDIR)$(pkgdatadir)/standalone/bijoyconverter.js
	install -m 0755 src/standalone/layoutviewer.js $(DESTDIR)$(pkgdatadir)/standalone/layoutviewer.js

	# Avro Core components
	install -m 0644 src/avro-core/phonetic/avrolib.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/avrolib.js
	install -m 0644 src/avro-core/phonetic/avroregexlib.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/avroregexlib.js
	install -m 0644 src/avro-core/phonetic/utf8.js $(DESTDIR)$(pkgdatadir)/avro-core/phonetic/utf8.js
	install -m 0644 src/avro-core/dictionary/avrodict.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/avrodict.js
	install -m 0644 src/avro-core/dictionary/suffixdict.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/suffixdict.js
	install -m 0644 src/avro-core/dictionary/dbsearch.js $(DESTDIR)$(pkgdatadir)/avro-core/dictionary/dbsearch.js
	install -m 0644 src/avro-core/autocorrect/autocorrect.js $(DESTDIR)$(pkgdatadir)/avro-core/autocorrect/autocorrect.js
	install -m 0644 src/avro-core/suggestions/levenshtein.js $(DESTDIR)$(pkgdatadir)/avro-core/suggestions/levenshtein.js
	install -m 0644 src/avro-core/suggestions/suggestionbuilder.js $(DESTDIR)$(pkgdatadir)/avro-core/suggestions/suggestionbuilder.js

	# Preferences application
	install -m 0755 src/preferences/pref.js $(DESTDIR)$(pkgdatadir)/preferences/pref.js
	install -m 0644 src/preferences/avropref.ui $(DESTDIR)$(pkgdatadir)/preferences/avropref.ui

	# Integration files
	install -m 0644 data/ibus/ibus-avro.xml $(DESTDIR)$(datadir)/ibus/component/ibus-avro.xml
	install -m 0644 data/gsettings/com.omicronlab.avro.gschema.xml $(DESTDIR)$(datadir)/glib-2.0/schemas/com.omicronlab.avro.gschema.xml
	install -m 0644 data/applications/avro-preferences.desktop $(DESTDIR)$(datadir)/applications/avro-preferences.desktop
	install -m 0644 data/applications/avro-topbar.desktop $(DESTDIR)$(datadir)/applications/avro-topbar.desktop
	install -m 0644 data/applications/avro-pad.desktop $(DESTDIR)$(datadir)/applications/avro-pad.desktop
	install -m 0644 data/applications/avro-converter.desktop $(DESTDIR)$(datadir)/applications/avro-converter.desktop
	install -m 0644 data/applications/avro-layout.desktop $(DESTDIR)$(datadir)/applications/avro-layout.desktop
	install -m 0644 data/applications/ibus-setup-avro.desktop $(DESTDIR)$(datadir)/applications/ibus-setup-avro.desktop
	install -m 0644 data/metainfo/com.github.sarim.ibus.avro.metainfo.xml $(DESTDIR)$(datadir)/metainfo/com.github.sarim.ibus.avro.metainfo.xml
	install -m 0644 data/autostart/avro-daemon.desktop /etc/xdg/autostart/avro-daemon.desktop || \
	    install -m 0644 data/autostart/avro-daemon.desktop $(DESTDIR)$(datadir)/avro-linux/autostart/avro-daemon.desktop

	# Icons
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(pkgdatadir)/icons/avro-bangla.png
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(datadir)/pixmaps/avro-bangla.png
	install -m 0644 data/icons/avro-bangla.png $(DESTDIR)$(datadir)/icons/hicolor/48x48/apps/avro-bangla.png

	# Documentation
	install -m 0644 README.md $(DESTDIR)$(datadir)/doc/avro-linux/README.md
	install -m 0644 LICENSE $(DESTDIR)$(datadir)/doc/avro-linux/copyright
	install -m 0644 NOTICE $(DESTDIR)$(datadir)/doc/avro-linux/NOTICE
	install -m 0644 debian/changelog $(DESTDIR)$(datadir)/doc/avro-linux/changelog.Debian

package: build
	@./scripts/build-deb.sh

clean:
	rm -rf build/
	rm -f *.deb
	rm -f data/ibus/ibus-avro.xml
	rm -f data/gsettings/gschemas.compiled
	rm -f src/common/evars.js
