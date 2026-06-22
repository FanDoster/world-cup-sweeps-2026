#!/bin/bash
# ── WC2026 — Deploy to Surge + bump version in Supabase ──
set -euo pipefail

DOMAIN="world-cup-sweeps-2026.surge.sh"
VERSION_FILE="js/version.js"

# 1. Bump version
TODAY=$(date +%Y-%m-%d)
# Find the current counter for today — e.g. 2026-06-22-003
CUR=$(grep -oP "APP_VERSION = '\K[^']+" "$VERSION_FILE" || echo "unknown")
if [[ "$CUR" == $TODAY-* ]]; then
  SEQ=$((10#${CUR##*-} + 1))
else
  SEQ=1
fi
NEW_VERSION="${TODAY}-$(printf '%03d' $SEQ)"
echo "Bumping version: $CUR → $NEW_VERSION"

sed -i '' "s/APP_VERSION = '.*'/APP_VERSION = '$NEW_VERSION'/" "$VERSION_FILE"

# 2. Deploy to Surge
echo "Deploying to $DOMAIN..."
npx surge . --domain "$DOMAIN"

# 3. Update Supabase
echo "Updating Supabase app_version..."
SQL="INSERT INTO public.app_version (id, version, updated_at) VALUES (1, '$NEW_VERSION', now()) ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, updated_at = EXCLUDED.updated_at;"
echo "$SQL" | bash ~/.hermes/scripts/supabase-sql.sh

echo "Done — version $NEW_VERSION deployed."
