#!/bin/bash
# Smoke tests through nginx on port 80 (the same path the ALB uses). Non-zero exit fails the deployment.
set -uo pipefail
source "$(dirname "$0")/common.sh"
BASE=http://127.0.0.1
fail=0
check() { # name expected_status url [grep]
  local code body
  body=$(curl -s -o /tmp/smoke.out -w '%{http_code}' "$3"); code=$body
  if [ "$code" != "$2" ]; then log "SMOKE FAIL: $1 expected $2 got $code"; fail=1; return; fi
  if [ -n "${4:-}" ] && ! grep -q "$4" /tmp/smoke.out; then log "SMOKE FAIL: $1 body missing '$4'"; fail=1; return; fi
  log "SMOKE OK: $1"
}
check "frontend index"        200 "$BASE/"                  'id="root"'
check "SPA route fallback"    200 "$BASE/jobs"              'id="root"'
check "API health via nginx"  200 "$BASE/api/health"        '"status":"ok"'
check "API readiness (DB)"    200 "$BASE/api/ready"         '"database":"up"'
check "jobs list (public)"    200 "$BASE/api/jobs?limit=1"  '"data"'
check "auth enforced"         401 "$BASE/api/auth/me"
check "unknown API route"     404 "$BASE/api/does-not-exist"
check "diag hidden w/o token" 403 "$BASE/api/diag"
exit $fail
