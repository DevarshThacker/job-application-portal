#!/bin/bash
# ApplicationStop - runs from the PREVIOUS revision. Must succeed even on first deploy.
mkdir -p /var/log/jobportal
echo "[$(date -u +%FT%TZ)] stopping jobportal-api" >> /var/log/jobportal/deploy.log
systemctl stop jobportal-api 2>/dev/null || true
exit 0
