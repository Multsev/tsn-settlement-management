#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
backup_dir="${BACKUP_DIR:-backups}"
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_dir/tsn-management-$timestamp.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$target" "$DATABASE_URL"
echo "Backup created: $target"
