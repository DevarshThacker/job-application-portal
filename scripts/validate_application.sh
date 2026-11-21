#!/bin/bash
# ValidateService: wait for the API to become healthy and for the DB connection to work.
set -uo pipefail
source "$(dirname "$0")/common.sh"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:5000/api/ready >/dev/null 2>&1; then log "API ready after ${i} checks"; exit 0; fi
  sleep 2
done
journalctl -u jobportal-api -n 30 --no-pager >> "$LOG_DIR/deploy.log" 2>&1
die "API did not become ready within 60s"
