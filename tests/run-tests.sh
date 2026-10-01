#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=================================================="
echo "          Avro Linux Test Suite Runner            "
echo "=================================================="

FAILED=0

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

# 4. Engine buffer & key event logic test
run_test "Engine Buffer & Lifecycle Logic" "gjs ${ROOT_DIR}/tests/engine/test-engine-buffer.js"

# 5. Live IBus Engine Integration test
run_test "IBus Engine Live Integration" "gjs ${ROOT_DIR}/tests/engine/test-ibus-engine-integration.js"

# 4. Desktop and metadata validation
run_test "Metadata & Schema Validation" "${ROOT_DIR}/tests/integration/test-metadata.sh"

# 5. Package verification (if deb exists)
if ls "${ROOT_DIR}"/avro-linux_*.deb 1>/dev/null 2>&1; then
    run_test "Package Verification (.deb)" "${ROOT_DIR}/tests/packaging/test-package.sh"
fi

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
