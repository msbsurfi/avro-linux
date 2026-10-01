#!/bin/bash
set -euo pipefail

PACKAGE_NAME="avro-linux"
VERSION="1.0.0"
REVISION="1"
ARCH="all"
DEB_FILENAME="${PACKAGE_NAME}_${VERSION}-${REVISION}_${ARCH}.deb"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BUILD_DIR="${ROOT_DIR}/build"
STAGING_DIR="${BUILD_DIR}/staging"

echo "=== Building Debian Package: ${DEB_FILENAME} ==="

# Clean staging directory
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}"

# Build assets
make -C "${ROOT_DIR}" all

# Install into staging directory
make -C "${ROOT_DIR}" install DESTDIR="${STAGING_DIR}"

# Calculate installed size in KB
INSTALLED_SIZE=$(du -sk "${STAGING_DIR}" | cut -f1)

# Setup DEBIAN control directory
mkdir -p "${STAGING_DIR}/DEBIAN"

cat > "${STAGING_DIR}/DEBIAN/control" <<EOF
Package: ${PACKAGE_NAME}
Version: ${VERSION}-${REVISION}
Section: utils
Priority: optional
Architecture: ${ARCH}
Installed-Size: ${INSTALLED_SIZE}
Maintainer: MD Shifat Bin Siddique Urfi <msbsu@github.com>
Depends: gjs (>= 1.70.0), ibus (>= 1.5.0), dconf-gsettings-backend | gsettings-backend
Recommends: gir1.2-gtk-3.0
Conflicts: ibus-avro
Replaces: ibus-avro
Homepage: https://github.com/avro-linux/avro-linux
Description: Modern Avro Phonetic Bengali input method for Linux (Remastered)
 Avro Linux Remastered is a modern, reliable implementation of the popular
 Avro Phonetic Bengali typing method for Linux desktops (Ubuntu 24.04/26.04,
 Debian 12/13). Remastered by MD Shifat Bin Siddique Urfi.
 .
 Features include:
  * Windows-style floating sticky Avro TopBar (always-on-top, non-focus-stealing)
  * Standalone Avro Pad text editor with live inline phonetic typing
  * 100% roundtrip Unicode to Bijoy (SutonnyMJ) and ANSI converter
  * Interactive visual keyboard layout viewer and phonetic guide
  * Modernized IBus engine with F12 mode toggle and robust modifier handling
  * Full phonetic rules, vowels, consonants, and conjuncts (যুক্তবর্ণ)
  * Comprehensive dictionary suggestions and grammatical suffix inflections
  * Autocorrect and custom candidate learning
  * Full-featured GTK preferences application with privacy-preserving diagnostics
EOF

# Copy maintainer scripts
if [ -f "${ROOT_DIR}/debian/postinst" ]; then
    cp "${ROOT_DIR}/debian/postinst" "${STAGING_DIR}/DEBIAN/postinst"
    chmod 0755 "${STAGING_DIR}/DEBIAN/postinst"
fi

if [ -f "${ROOT_DIR}/debian/postrm" ]; then
    cp "${ROOT_DIR}/debian/postrm" "${STAGING_DIR}/DEBIAN/postrm"
    chmod 0755 "${STAGING_DIR}/DEBIAN/postrm"
fi

# Generate md5sums
(
    cd "${STAGING_DIR}"
    find . -type f ! -path "./DEBIAN/*" -print0 | xargs -0 md5sum | sed 's|\./||' > "${STAGING_DIR}/DEBIAN/md5sums"
    chmod 0644 "${STAGING_DIR}/DEBIAN/md5sums"
)

# Build .deb archive
fakeroot dpkg-deb --build --root-owner-group "${STAGING_DIR}" "${ROOT_DIR}/${DEB_FILENAME}"

echo "=== Package successfully built: ${ROOT_DIR}/${DEB_FILENAME} ==="
dpkg-deb -I "${ROOT_DIR}/${DEB_FILENAME}"
