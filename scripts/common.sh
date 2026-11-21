#!/bin/bash
# Shared helpers for CodeDeploy lifecycle hooks. Never prints secret values.
APP_DIR=/opt/jobportal/app
ENV_FILE=/etc/jobportal/app.env
SERVICE=jobportal-api
LOG_DIR=/var/log/jobportal
REGION=${AWS_REGION:-us-east-1}
log() { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$LOG_DIR/deploy.log"; }
die() { log "ERROR: $*"; exit 1; }
