#!/bin/bash
# Writes /etc/jobportal/app.env from AWS Secrets Manager + environment, installs nginx/systemd config,
# then applies database migrations (prisma migrate deploy: forward-only, non-destructive).
set -euo pipefail
source "$(dirname "$0")/common.sh"
ENVIRONMENT=$(cat /etc/jobportal/environment)
case "$ENVIRONMENT" in staging|production) ;; *) die "unknown environment '$ENVIRONMENT'";; esac
TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 120')
REGION=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
export AWS_DEFAULT_REGION=$REGION

SECRET=$(aws secretsmanager get-secret-value --secret-id "jobportal/$ENVIRONMENT/app" --query SecretString --output text) || die "cannot read app secret"
CONF=$(aws ssm get-parameter --name "/jobportal/$ENVIRONMENT/config" --query Parameter.Value --output text) || die "cannot read /jobportal/$ENVIRONMENT/config"
get() { echo "$SECRET" | jq -r ".$1"; }
cget() { echo "$CONF" | jq -r ".$1"; }

DB_HOST=$(cget db_host)
DB_URL="postgresql://$(get db_user):$(get db_password)@${DB_HOST}:5432/$(get db_name)?schema=public&sslmode=require"

umask 077
cat > "$ENV_FILE.new" <<ENVEOF
NODE_ENV=production
PORT=5000
DATABASE_URL=${DB_URL}
JWT_SECRET=$(get jwt_secret)
JWT_EXPIRES_IN=8h
COOKIE_SECURE=$(cget cookie_secure)
COOKIE_SAMESITE=lax
CORS_ORIGIN=http://localhost
TRUST_PROXY_HOPS=$(cget trust_proxy_hops)
STORAGE_DRIVER=s3
S3_BUCKET=$(cget s3_bucket)
S3_KEY_PREFIX=${ENVIRONMENT}/
AWS_REGION=${REGION}
AUTH_RATE_LIMIT_MAX=30
LOG_LEVEL=info
DIAG_TOKEN=$(get diag_token)
ENVEOF
mv "$ENV_FILE.new" "$ENV_FILE"
chown root:jobportal "$ENV_FILE"; chmod 640 "$ENV_FILE"
log "wrote $ENV_FILE (values not logged)"

install -m 644 "$APP_DIR/deploy/jobportal-api.service" /etc/systemd/system/jobportal-api.service
install -m 644 "$APP_DIR/deploy/nginx.conf" /etc/nginx/nginx.conf
nginx -t >> "$LOG_DIR/deploy.log" 2>&1 || die "nginx config invalid"
systemctl daemon-reload
systemctl enable jobportal-api >/dev/null 2>&1

log "applying database migrations (prisma migrate deploy)"
cd "$APP_DIR/backend"
runuser -u jobportal -- env DATABASE_URL="$DB_URL" npx prisma migrate deploy >> "$LOG_DIR/deploy.log" 2>&1 || die "prisma migrate deploy failed"
log "configure_application ok"
