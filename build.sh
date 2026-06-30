#!/bin/bash
# ── WC2026 build step ──
# Concatenates CSS + JS into bundles and rewrites index.html for production.
# Called by deploy.sh and the GH Actions deploy workflow.
# Outputs the build directory path on stdout.
set -euo pipefail

BUILD_DIR=$(mktemp -d)

echo "Building in $BUILD_DIR"

# Copy everything (respects .gitignore via the working tree)
cp -R . "$BUILD_DIR"/

cd "$BUILD_DIR"

# ── CSS bundle ──
echo "  Concatenating CSS…"
cat css/tokens.css \
    css/layout.css \
    css/matches.css \
    css/groups.css \
    css/leaderboard.css \
    css/teams.css \
    css/dispatch.css \
    css/predictions.css \
    css/profile.css \
    css/auth.css \
    css/myteams.css \
    css/globe.css \
    css/shooter.css \
    css/profile-picture.css \
    css/user-profile.css \
    css/bracket.css \
    css/responsive.css \
    css/update-notification.css \
    css/banter.css \
    > css/b.css

# ── JS bundle (dependency order) ──
echo "  Concatenating JS…"
cat js/config.js \
    js/utils.js \
    js/auth.js \
    js/data.js \
    js/render-matches.js \
    js/render-groups.js \
    js/render-leaderboard.js \
    js/render-predictions.js \
    js/render-teams.js \
    js/render-myteams.js \
    js/render-profile.js \
    js/shooter.js \
    js/team-results.js \
    js/profile-picture.js \
    js/render-user-profile.js \
    js/render-bracket.js \
    js/render-banter.js \
    js/version.js \
    js/version-refresh.js \
    js/main.js \
    > js/b.js

# ── Rewrite index.html ──
echo "  Rewriting index.html…"
python3 << 'PYEOF'
import re

with open("index.html") as f:
    html = f.read()

# Replace CSS links (all <link rel="stylesheet" href="css/...">)
# Keep the fonts.googleapis.com link and preconnect
css_block_pattern = re.compile(
    r'(\n  <link rel="stylesheet" href="css/[^"]+">)+',
    re.MULTILINE
)
# Find the block by locating the first and last CSS link
lines = html.split('\n')
first_css = None
last_css = None
for i, line in enumerate(lines):
    if '<link rel="stylesheet" href="css/' in line and 'fonts.googleapis' not in line:
        if first_css is None:
            first_css = i
        last_css = i

if first_css is not None:
    indent = '  '
    lines[first_css:last_css+1] = [indent + '<link rel="stylesheet" href="css/b.css">']
    html = '\n'.join(lines)

# Replace app JS scripts (all <script src="js/...">)
# Keep h2h-data.js and the supabase CDN script
lines = html.split('\n')
first_js = None
last_js = None
for i, line in enumerate(lines):
    if '<script src="js/' in line:
        if first_js is None:
            first_js = i
        last_js = i

if first_js is not None:
    indent = '  '
    # Keep h2h-data.js and supabase CDN (lines before first app JS)
    keep_before = []
    keep_after = []
    # Everything before the first app JS script
    for j in range(first_js):
        keep_before.append(lines[j])
    # Insert bundle
    bundle_line = indent + '<script src="js/b.js"></script>'
    # Everything after the last app JS script
    for j in range(last_js + 1, len(lines)):
        keep_after.append(lines[j])
    
    html = '\n'.join(keep_before + [bundle_line] + keep_after)

with open("index.html", "w") as f:
    f.write(html)

PYEOF

echo "  Done — $(wc -c < css/b.css) bytes CSS, $(wc -c < js/b.js) bytes JS"
echo "$BUILD_DIR"
