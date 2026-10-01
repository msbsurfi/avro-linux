#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== Running Desktop & Integration Metadata Validation ==="

# 1. Desktop files validation
echo "[1/4] Validating desktop entries..."
desktop-file-validate "${ROOT_DIR}"/data/applications/*.desktop
echo "  ✓ Desktop entries valid."

# 2. AppStream metadata validation
echo "[2/4] Validating AppStream metadata..."
appstreamcli validate "${ROOT_DIR}/data/metainfo/com.github.sarim.ibus.avro.metainfo.xml"
echo "  ✓ AppStream metadata valid."

# 3. GSettings schema validation
echo "[3/4] Validating GSettings schema..."
glib-compile-schemas --strict --dry-run "${ROOT_DIR}/data/gsettings/"
echo "  ✓ GSettings schema valid."

# 4. Desktop/AppStream identity and icon family
echo "[4/4] Checking application identity and icon family..."
grep -q '^StartupWMClass=AvroPreferences$' "${ROOT_DIR}/data/applications/com.github.avrolinux.Avro.desktop"
grep -q '<id>com.github.avrolinux.Avro</id>' "${ROOT_DIR}/data/metainfo/com.github.sarim.ibus.avro.metainfo.xml"
test -f "${ROOT_DIR}/data/icons/avro-bangla.svg"
for size in 16 32 48 64 128 256; do
    test -f "${ROOT_DIR}/data/icons/${size}x${size}/avro-bangla.png"
done
echo "  ✓ Identity and icon family are present."

echo "All metadata validation tests passed successfully!"
