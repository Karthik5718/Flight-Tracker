#!/usr/bin/env bash
set -e

# === Paths ===
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV_PYTHON="/home/tushar_gupta/.virtualenvs/Project/bin/python"

echo "=================================================="
echo " Flight Tracker - Dev Startup (WSL)"
echo " Backend : Django  (http://127.0.0.1:8000)"
echo " Frontend: Vite + React (http://localhost:5173)"
echo "=================================================="
echo ""

# === 1. Check venv python ===
if [ ! -x "$VENV_PYTHON" ]; then
  echo "[ERROR] Venv python not found: $VENV_PYTHON"
  echo "Check the path or update VENV_PYTHON at the top of run.sh"
  exit 1
fi
echo "[Backend] Using venv python: $VENV_PYTHON"
"$VENV_PYTHON" --version

# === 2. Check node ===
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found. Install Node LTS in WSL and retry."
  exit 1
fi
node --version
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm not found."
  exit 1
fi

# === 3. Backend .env ===
if [ ! -f "$BACKEND/.env" ]; then
  if [ -f "$BACKEND/.env1" ]; then
    echo "[Backend] Creating .env from .env1..."
    cp "$BACKEND/.env1" "$BACKEND/.env"
  else
    echo "[WARN] No backend/.env or backend/.env1 found. Django will use defaults."
  fi
fi

# === 4. Install Python deps + migrate ===
echo "[Backend] Installing requirements..."
"$VENV_PYTHON" -m pip install --upgrade pip
"$VENV_PYTHON" -m pip install -r "$ROOT/requirements.txt"

echo "[Backend] Running migrations..."
cd "$BACKEND"
"$VENV_PYTHON" manage.py migrate
cd "$ROOT"

# === 5. Frontend .env ===
if [ ! -f "$FRONTEND/.env" ]; then
  if [ -f "$FRONTEND/.env2" ]; then
    echo "[Frontend] Creating .env from .env2..."
    cp "$FRONTEND/.env2" "$FRONTEND/.env"
  fi
fi

# === 6. Install Node deps (first run only) ===
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "[Frontend] Installing npm packages (first run, may take a minute)..."
  cd "$FRONTEND"
  npm install
  cd "$ROOT"
else
  echo "[Frontend] node_modules found, skipping npm install."
fi

# === 7. Launch both servers ===
echo ""
echo "Starting backend and frontend..."
echo "  Backend  -> http://127.0.0.1:8000/api/health/"
echo "  Frontend -> http://localhost:5173"
echo "Press Ctrl+C to stop both."
echo ""

# Cleanup background jobs on exit
cleanup() {
  echo ""
  echo "Stopping servers..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

cd "$BACKEND"
"$VENV_PYTHON" manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!
cd "$ROOT"

cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!
cd "$ROOT"

wait
