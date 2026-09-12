#!/usr/bin/env bash
# Render start script — seeds DB if empty then starts uvicorn
set -e

echo "==> Seeding database..."
python -m app.seed

echo "==> Starting API server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
