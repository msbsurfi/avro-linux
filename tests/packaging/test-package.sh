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
grep -q "Depends:.*gjs" "${TMP_DIR}/info.txt"
grep -q "Depends:.*ibus" "${TMP_DIR}/info.txt"
echo "  ✓ Package control fields verified."

# 2. Check essential file locations
echo "[2/4] Checking critical file locations inside .deb..."
grep -q "\./usr/bin/avro-preferences" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/engine/main-gjs.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/avro-linux/preferences/pref.js" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/ibus/component/ibus-avro.xml" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/glib-2.0/schemas/com.omicronlab.avro.gschema.xml" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/applications/avro-preferences.desktop" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/metainfo/com.github.sarim.ibus.avro.metainfo.xml" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/icons/hicolor/48x48/apps/avro-bangla.png" "${TMP_DIR}/contents.txt"
grep -q "\./usr/share/pixmaps/avro-bangla.png" "${TMP_DIR}/contents.txt"
echo "  ✓ Critical file locations present."

# 3. Check file permissions
echo "[3/4] Checking executable permissions..."
grep "\./usr/bin/avro-preferences" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/share/avro-linux/engine/main-gjs.js" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
grep "\./usr/share/avro-linux/preferences/pref.js" "${TMP_DIR}/contents.txt" | grep -q "^-rwxr-xr-x"
echo "  ✓ Executables properly flagged with 0755."

# 4. Check maintainer scripts
echo "[4/4] Checking maintainer scripts in control archive..."
dpkg-deb -e "${DEB_FILE}" "${TMP_DIR}/control"
test -f "${TMP_DIR}/control/postinst"
test -f "${TMP_DIR}/control/postrm"
test -f "${TMP_DIR}/control/md5sums"
echo "  ✓ Maintainer scripts postinst, postrm, and md5sums present."

echo "Package verification completed successfully!"
