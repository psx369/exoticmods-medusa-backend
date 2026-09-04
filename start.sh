#!/bin/sh
set -e

cd /app/.medusa/server

echo "[start] Running database migrations..."
# --execute-safe-links is required for unattended boots. Without it, db:migrate
# prompts ("Select tables to act upon") whenever the link planner produces an
# UPDATE or DELETE action, and with no TTY in the container the deploy hangs
# forever instead of failing. Safe mode still creates new link tables; it skips
# updates and deletes, which are destructive and should be applied deliberately:
#   medusa db:sync-links --execute-all-links
# Run that yourself, from a snapshot, when the planner reports pending actions.
npx medusa db:migrate --execute-safe-links < /dev/null || {
  echo "[start] db:migrate failed" >&2
  exit 1
}

if [ -n "${MEDUSA_ADMIN_EMAIL}" ] && [ -n "${MEDUSA_ADMIN_PASSWORD}" ]; then
  echo "[start] Ensuring admin user ${MEDUSA_ADMIN_EMAIL} exists..."
  npx medusa user --email "${MEDUSA_ADMIN_EMAIL}" --password "${MEDUSA_ADMIN_PASSWORD}" || \
    echo "[start] Admin user already exists or could not be created (continuing)"
fi

echo "[start] Launching Medusa (mode=${MEDUSA_WORKER_MODE:-shared}, port=${PORT:-9000})..."
exec npx medusa start
