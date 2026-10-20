#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
export PATH="/home/chandhru/.nvm/versions/node/v24.14.0/bin:$PATH"

echo "=========================================================="
echo " Starting Campus Wi-Fi Intelligence System"
echo " REC Principles of Data Science Project"
echo "=========================================================="

# 1. Start Flask Backend
echo "[1/2] Starting Flask Backend on http://127.0.0.1:5000..."
cd "$DIR/backend"
./venv/bin/python app.py &
BACKEND_PID=$!

# Trap signals to shut down both processes cleanly
cleanup() {
    echo ""
    echo "Shutting down servers (PID $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Give backend a moment to boot
sleep 2

# 2. Start Vite Frontend
echo "[2/2] Starting Frontend on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev -- --host 0.0.0.0

