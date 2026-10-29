#!/usr/bin/env bash
# Render start script. Never wipe customer-uploaded data during normal restarts.
set -e

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "==> SEED_DEMO_DATA=true: loading disposable demo records"
  python -m app.seed
else
  echo "==> Creating database tables without demo seed data"
  python -c "from app.database import create_db_and_tables; create_db_and_tables()"
fi

echo "==> Starting API server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
