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
# The file lists are derived from index.html (in document order) so the
# bundle always matches whatever the page loads in dev — new files can never
# silently miss the deploy again.
echo "  Concatenating CSS…"
CSS_FILES=$(grep -o 'href="css/[^"]*\.css"' index.html | sed 's/^href="//;s/"$//')
echo "$CSS_FILES" | sed 's/^/    /'
# shellcheck disable=SC2086
cat $CSS_FILES > css/b.css

# ── JS bundle (dependency order = script-tag order) ──
echo "  Concatenating JS…"
JS_FILES=$(grep -o 'src="js/[^"]*\.js"' index.html | sed 's/^src="//;s/"$//')
echo "$JS_FILES" | sed 's/^/    /'
# shellcheck disable=SC2086
cat $JS_FILES > js/b.js

# ── Rewrite index.html ──
echo "  Rewriting index.html…"
# prefer python3, but fall back to python if python3 is broken/missing
# (e.g. the Windows Store stub that exits nonzero)
if python3 -c 'pass' 2>/dev/null; then PY=python3; else PY=python; fi
"$PY" << 'PYEOF'
import re

with open("index.html", encoding="utf-8") as f:
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

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

PYEOF

echo "  Done — $(wc -c < css/b.css) bytes CSS, $(wc -c < js/b.js) bytes JS"
echo "$BUILD_DIR"
