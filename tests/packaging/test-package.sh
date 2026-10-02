#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DEB_FILE=$(ls "${ROOT_DIR}"/avro-linux_*.deb 2>/dev/null | head -n 1 || true)

if [ -z "${DEB_FILE}" ] || [ ! -f "${DEB_FILE}" ]; then
    echo "ERROR: No .deb file found in ${ROOT_DIR}. Run 'make package' first."
    exit 1
fi

echo "=== Verifying Debian Package: $(basename "${DEB_FILE}") ==="

TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

dpkg-deb -I "${DEB_FILE}" > "${TMP_DIR}/info.txt"
dpkg-deb -c "${DEB_FILE}" > "${TMP_DIR}/contents.txt"

# 1. Inspect package info
echo "[1/4] Checking package control fields..."
grep -q "Package: avro-linux" "${TMP_DIR}/info.txt"
grep -q "Architecture: all" "${TMP_DIR}/info.txt"
grep -q "Maintainer: MD Shifat Bin Siddique Urfi" "${TMP_DIR}/info.txt"
grep -q "Depends:.*gjs" "${TMP_DIR}/info.txt"
grep -q "Depends:.*ibus" "${TMP_DIR}/info.txt"
echo "  ✓ Package control fields verified."

# 2. Check essential file locations
echo "[2/4] Checking critical file locations inside .deb..."
grep -q "\./usr/bin/avro" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-topbar" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-pad" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-converter" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-layout" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-preferences" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-doctor" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-linux-doctor" "${TMP_DIR}/contents.txt"
grep -q "\./usr/bin/avro-preview" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/engine/main-gjs.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/preferences/pref.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/standalone/main.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/standalone/topbar.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/standalone/avropad.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/standalone/bijoyconverter.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/standalone/layoutviewer.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/standalone/doctor.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/ui/floating-preview.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/ibus/component/ibus-avro.xml" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/glib-2.0/schemas/com.omicronlab.avro.gschema.xml" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/com.github.avrolinux.Avro.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/avro-topbar.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/avro-pad.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/avro-converter.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/avro-layout.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/avro-doctor.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/avro-preview.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/metainfo/com.github.sarim.ibus.avro.metainfo.xml" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/icons/hicolor/48x48/apps/avro-bangla.png" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/icons/hicolor/scalable/apps/avro-bangla.svg" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/pixmaps/avro-bangla.png" "${TMP_DIR}/contents.txt"
echo "  ✓ Critical file locations present."

# The package must not claim ownership of desktop-wide IM configuration.
echo "[3/5] Checking non-invasive maintainer scripts..."
dpkg-deb -e "${DEB_FILE}" "${TMP_DIR}/control"
! grep -Eq 'org\.gnome\.desktop\.input-sources|GTK_IM_MODULE=|QT_IM_MODULE=|ibus-daemon -drx' "${TMP_DIR}/control/postinst"
echo "  ✓ Per-user input-method configuration is preserved."

# 3. Check file permissions
echo "[4/5] Checking executable permissions..."
grep "\./usr/bin/avro" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/bin/avro-topbar" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/bin/avro-pad" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/bin/avro-preferences" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/share/avro-linux/engine/main-gjs.js" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/share/avro-linux/preferences/pref.js" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/share/avro-linux/standalone/main.js" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
echo "  ✓ Executables properly flagged with 0755."

# 4. Check maintainer scripts
echo "[5/5] Checking maintainer scripts in control archive..."
test -f "${TMP_DIR}/control/postinst"
test -f "${TMP_DIR}/control/postrm"
test -f "${TMP_DIR}/control/md5sums"
echo "  ✓ Maintainer scripts postinst, postrm, and md5sums present."

echo "Package verification completed successfully!"
