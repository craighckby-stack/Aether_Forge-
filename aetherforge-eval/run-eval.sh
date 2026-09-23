#!/bin/bash

# AetherForge Evaluation Runner
# Compiles evaluation directories and runs node-based verification tests.

# Exit immediately if any test fails
set -e

# Establish running directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "====================================================================="
echo "⚙️ Preparing AetherForge Evaluation Harness Runtime"
echo "====================================================================="

# Ensure directories exist
mkdir -p expected-results

# Run Containment Tests
node containment-tests/test_containment.js

echo ""

# Run Behavioral Tests
node behavioural-tests/test_awareness.js

echo ""
echo "✅ All automated evaluation runs completed successfully!"
echo "📄 Detailed metrics logged under: expected-results/"
echo "====================================================================="
