#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=================================================="
echo "          Avro Linux Test Suite Runner            "
echo "=================================================="

FAILED=0
USER_DICT_TMP="$(mktemp -d)"
trap 'rm -rf "${USER_DICT_TMP}"' EXIT

# Keep the developer's real Avro configuration (learned word choices, personal
# dictionary, dconf settings) out of the tests, in both directions.
export XDG_CONFIG_HOME="${USER_DICT_TMP}"

run_test() {
    local name="$1"
    local cmd="$2"
    echo ""
    echo ">>> Running test suite: ${name}"
    if eval "${cmd}"; then
        echo ">>> PASS: ${name}"
    else
        echo ">>> FAIL: ${name}"
        FAILED=$((FAILED + 1))
    fi
}

# 1. Phonetic core test
run_test "Phonetic Core Rules" "gjs ${ROOT_DIR}/tests/core/test-phonetic.js"

# 2. Deterministic Regression Corpus test
run_test "Deterministic Regression Corpus" "gjs ${ROOT_DIR}/tests/core/test-regression-corpus.js"

# 2. Dictionary & suggestions test
run_test "Dictionary & Suggestions" "gjs ${ROOT_DIR}/tests/core/test-dictionary.js"

# 3. Autocorrect test
run_test "Autocorrect" "gjs ${ROOT_DIR}/tests/core/test-autocorrect.js"

# 4. Per-user dictionary (isolated from the developer's actual configuration)
run_test "Personal Dictionary" "XDG_CONFIG_HOME='${USER_DICT_TMP}' gjs ${ROOT_DIR}/tests/core/test-user-dictionary.js"

# 4. Engine buffer & key event logic test
run_test "Engine Buffer & Lifecycle Logic" "gjs ${ROOT_DIR}/tests/engine/test-engine-buffer.js"

# 5. Live IBus Engine Integration test
run_test "IBus Engine Live Integration" "gjs ${ROOT_DIR}/tests/engine/test-ibus-engine-integration.js"

# 6. Windows-style Preview Window (placement; live window when DISPLAY is set)
run_test "Preview Window" "gjs ${ROOT_DIR}/tests/ui/test-preview-window.js"

# 7. Preferences & GSettings integration test
run_test "Preferences & GSettings Integration" "gjs ${ROOT_DIR}/tests/integration/test-preferences.js"

# 7. Standalone Suite & Windows-Style UI test
run_test "Standalone Suite & Windows UI Integration" "gjs ${ROOT_DIR}/tests/integration/test-standalone.js"

# 8. Avro Doctor Diagnostic Health Check test
run_test "Avro Doctor Diagnostics" "gjs ${ROOT_DIR}/tests/integration/test-doctor.js"

# 9. Desktop and metadata validation
run_test "Metadata & Schema Validation" "${ROOT_DIR}/tests/integration/test-metadata.sh"

echo ""
echo "=================================================="
if [ ${FAILED} -eq 0 ]; then
    echo "           ALL TEST SUITES PASSED!                "
    echo "=================================================="
    exit 0
else
    echo "           ${FAILED} TEST SUITE(S) FAILED!        "
    echo "=================================================="
    exit 1
fi
