#!/bin/bash
# Deploy World Cup Sweepstakes to Surge
# Requires SURGE_TOKEN env var
set -e
cd "$(dirname "$0")"

if [ -z "$SURGE_TOKEN" ]; then
  echo "SURGE_TOKEN not set. Get it: npx surge token"
  exit 1
fi

echo "Deploying to world-cup-sweeps-2026.surge.sh..."
npx surge . --domain world-cup-sweeps-2026.surge.sh
echo "Done."
