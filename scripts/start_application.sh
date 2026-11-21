#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
systemctl restart jobportal-api || die "failed to start jobportal-api"
systemctl reload nginx 2>/dev/null || systemctl restart nginx || die "nginx failed"
log "services started"
