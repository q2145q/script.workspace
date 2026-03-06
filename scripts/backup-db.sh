#!/bin/bash
# Database backup script
# Usage: ./scripts/backup-db.sh
# Cron:  0 3 * * * /root/projects/site/script.workspace/scripts/backup-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load DATABASE_URL from .env
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -E "^DATABASE_URL=" "$PROJECT_DIR/.env" | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set" >&2
  exit 1
fi

BACKUP_DIR="/root/backups/script-workspace"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
echo "[$(date)] Backup saved: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Remove backups older than retention period
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleaned up backups older than $RETENTION_DAYS days"
