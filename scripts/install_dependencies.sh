#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
cd "$APP_DIR/backend"
log "installing production dependencies (npm ci --omit=dev)"
npm ci --omit=dev --no-audit --no-fund >> "$LOG_DIR/deploy.log" 2>&1 || die "npm ci failed"
log "generating prisma client"
npx prisma generate >> "$LOG_DIR/deploy.log" 2>&1 || die "prisma generate failed"
chown -R jobportal:jobportal "$APP_DIR"
chmod -R a+rX "$APP_DIR/frontend/dist"
log "install_dependencies ok"
