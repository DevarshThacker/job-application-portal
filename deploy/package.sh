#!/bin/bash
# Builds ONE release artifact (tgz) for CodeDeploy. Usage: deploy/package.sh [release-id]
# Assumes dependencies are installed and the frontend is built (CI does: npm ci; npm run build).
set -euo pipefail
cd "$(dirname "$0")/.."
RELEASE_ID=${1:-$(date -u +%Y%m%d%H%M%S)}
OUT=${OUT_DIR:-dist-release}
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
[ -f frontend/dist/index.html ] || { echo "frontend/dist missing - run: npm run build"; exit 1; }

mkdir -p "$STAGE/backend" "$STAGE/frontend" "$OUT"
cp appspec.yml "$STAGE/"
cp -r scripts deploy "$STAGE/"
rm -f "$STAGE/deploy/package.sh"
cp backend/package.json backend/package-lock.json "$STAGE/backend/"
cp -r backend/src "$STAGE/backend/src"; rm -rf "$STAGE/backend/src/tests"
cp -r backend/prisma "$STAGE/backend/prisma"
cp -r frontend/dist "$STAGE/frontend/dist"
echo "$RELEASE_ID" > "$STAGE/RELEASE"
ARCHIVE="$OUT/jobportal-$RELEASE_ID.tgz"
tar -C "$STAGE" -czf "$ARCHIVE" .
echo "$ARCHIVE"
