#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"
if [ "${CONFIRM_RESTORE:-}" != "1" ]; then
  echo "Restore changes the target database. Set CONFIRM_RESTORE=1 after verifying DATABASE_URL and BACKUP_FILE."
  exit 2
fi
test -f "$BACKUP_FILE"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$BACKUP_FILE"
echo "Restore completed from: $BACKUP_FILE"
