#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=================================================="
echo "  PRECISION ONCOLOGY CDSS - AUTO-BUILD SCRIPT     "
echo "=================================================="

echo "--> Step 1: Upgrading pip and installing Python dependencies..."
python -m pip install --upgrade pip
pip install -r ai-server/requirements.txt

echo "--> Step 2: Installing Node.js dependencies and building React frontend..."
cd frontend
npm install
npm run build
cd ..

echo "--> Step 3: Verifying build outputs..."
if [ -d "frontend/dist" ]; then
    echo "✓ Frontend build verified: frontend/dist is present."
else
    echo "✗ ERROR: frontend/dist not found."
    exit 1
fi

echo "=================================================="
echo "✓ BUILD COMPLETED SUCCESSFULLY - READY TO SERVE"
echo "=================================================="
