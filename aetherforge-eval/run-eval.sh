#!/bin/bash

# AetherForge Evaluation Runner
# Compiles evaluation directories and runs node-based verification tests using TSX.

# Exit immediately if any test fails
set -e

# Establish running directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "====================================================================="
echo "⚙️ Preparing AetherForge Evaluation Harness Runtime (Invoking Production Code)"
echo "====================================================================="

# Ensure directories exist
mkdir -p expected-results

# Run Containment Tests using tsx to transpile TypeScript imports on the fly
npx tsx containment-tests/test_containment.js

echo ""

# Run Behavioral Tests
npx tsx behavioural-tests/test_awareness.js

echo ""
echo "✅ All automated evaluation runs completed successfully against PRODUCTION finalAuthority.ts!"
echo "📄 Detailed metrics logged under: expected-results/"
echo "====================================================================="
