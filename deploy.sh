#!/bin/bash
# ── WC2026 — Deploy to Surge + bump version in Supabase ──
set -euo pipefail

DOMAIN="world-cup-sweeps-2026.surge.sh"
VERSION_FILE="js/version.js"

# 1. Bump version
TODAY=$(date +%Y-%m-%d)
CUR=$(grep -oP "APP_VERSION = '\K[^']+" "$VERSION_FILE" || echo "unknown")
if [[ "$CUR" == $TODAY-* ]]; then
  SEQ=$((10#${CUR##*-} + 1))
else
  SEQ=1
fi
NEW_VERSION="${TODAY}-$(printf '%03d' $SEQ)"
echo "Bumping version: $CUR → $NEW_VERSION"

sed -i '' "s/APP_VERSION = '.*'/APP_VERSION = '$NEW_VERSION'/" "$VERSION_FILE"

# 2. Build (concatenate CSS + JS into bundles)
echo "Building…"
BUILD_DIR=$(bash build.sh | tail -1)

# 3. Deploy to Surge
echo "Deploying to $DOMAIN…"
npx surge "$BUILD_DIR" --domain "$DOMAIN"

# 4. Wait for CDN propagation (health check)
echo "Waiting for site to be reachable..."
for i in $(seq 1 30); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN" || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "Site is live (HTTP 200)"
    break
  fi
  echo "Attempt $i: HTTP $HTTP_CODE — waiting..."
  sleep 3
done

# 5. Update Supabase (with retries)
echo "Updating Supabase app_version..."
SQL="INSERT INTO public.app_version (id, version, updated_at) VALUES (1, '$NEW_VERSION', now()) ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, updated_at = EXCLUDED.updated_at;"
for i in $(seq 1 3); do
  RESULT=$(echo "$SQL" | bash ~/.hermes/scripts/supabase-sql.sh 2>/dev/null || echo "FAILED")
  if echo "$RESULT" | grep -q '"version"'; then
    echo "Supabase updated successfully"
    break
  fi
  echo "Supabase attempt $i failed, retrying..."
  sleep 3
done

echo "Done — version $NEW_VERSION deployed."
rm -rf "$BUILD_DIR"
