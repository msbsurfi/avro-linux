#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== Running Desktop & Integration Metadata Validation ==="

# 1. Desktop files validation
echo "[1/3] Validating desktop entries..."
desktop-file-validate "${ROOT_DIR}/data/applications/avro-preferences.desktop"
desktop-file-validate "${ROOT_DIR}/data/applications/ibus-setup-avro.desktop"
echo "  ✓ Desktop entries valid."

# 2. AppStream metadata validation
echo "[2/3] Validating AppStream metadata..."
appstreamcli validate "${ROOT_DIR}/data/metainfo/com.github.sarim.ibus.avro.metainfo.xml"
echo "  ✓ AppStream metadata valid."

# 3. GSettings schema validation
echo "[3/3] Validating GSettings schema..."
glib-compile-schemas --strict --dry-run "${ROOT_DIR}/data/gsettings/"
echo "  ✓ GSettings schema valid."

echo "All metadata validation tests passed successfully!"
