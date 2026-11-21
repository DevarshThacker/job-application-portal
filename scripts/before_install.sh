#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/common.sh" 2>/dev/null || { LOG_DIR=/var/log/jobportal; mkdir -p $LOG_DIR; log(){ echo "$*"; }; die(){ echo "$*"; exit 1; }; }
mkdir -p "$LOG_DIR" /etc/jobportal
id jobportal >/dev/null 2>&1 || die "service user 'jobportal' missing (bootstrap incomplete)"
[ -f /etc/jobportal/environment ] || die "/etc/jobportal/environment missing"
chown jobportal:jobportal "$LOG_DIR"
# Only code is replaced. Secrets (/etc/jobportal) and logs are preserved; no database is touched here.
rm -rf "$APP_DIR/backend/node_modules" "$APP_DIR/frontend/dist" 2>/dev/null || true
log "before_install ok (env=$(cat /etc/jobportal/environment))"
