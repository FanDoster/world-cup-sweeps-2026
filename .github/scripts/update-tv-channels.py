#!/usr/bin/env python3
"""Scrape live-footballontv.com for World Cup knockout TV channels and update Supabase.

Called by .github/workflows/update-tv-channels.yml daily.
Requires SUPABASE_PAT env var (Management API token with Database scope).
"""
import json, os, re, sys, urllib.request, urllib.error

URL = "https://www.live-footballontv.com/live-world-cup-football-on-tv.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; WC2026Bot/1.0)"}
PROJECT_REF = "nkztkzrkbeacyltidqwr"
PAT = os.environ.get("SUPABASE_PAT", "")

if not PAT:
    print("SUPABASE_PAT not set — exiting")
    sys.exit(1)

# ── 1. Fetch and parse ──
req = urllib.request.Request(URL, headers=HEADERS)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", errors="replace")
except Exception as e:
    print(f"Failed to fetch {URL}: {e}")
    sys.exit(1)

# Strip HTML tags for plain-text parsing
text = re.sub(r"<[^>]+>", " ", html)
text = re.sub(r"&nbsp;", " ", text)
text = re.sub(r"\s+", " ", text)

# Pattern: HH:MM TeamA v TeamB FIFA World Cup 2026 <round> <channel>
PATTERN = re.compile(
    r"(\d{2}:\d{2})\s+(.+?)\s+v\s+(.+?)\s+FIFA World Cup 2026\s+"
    r"(Round of (?:32|16)|Quarter-Final|Semi-Final|Third Place Play-Off|Final)\s+"
    r"(BBC One|BBC Two|ITV1|ITV4)(?:\s|$)"
)

ROUND_MAP = {
    "Round of 32": "R32", "Round of 16": "R16",
    "Quarter-Final": "QF", "Semi-Final": "SF",
    "Third Place Play-Off": "3P", "Final": "Final",
}

updates = []
for m in PATTERN.finditer(text):
    team_a = m.group(2).strip().replace("Bosnia-Herzegovina", "Bosnia & Herzegovina")
    team_b = m.group(3).strip().replace("Bosnia-Herzegovina", "Bosnia & Herzegovina")
    db_round = ROUND_MAP.get(m.group(4))
    channel = m.group(5)

    if not db_round:
        continue

    updates.append({
        "team_a": team_a, "team_b": team_b,
        "round": db_round, "channel": channel,
    })

print(f"Found {len(updates)} matches with known channels")
if not updates:
    print("No matches found — site may have changed format")
    sys.exit(1)

for u in updates:
    print(f"  {u['team_a']} v {u['team_b']} → {u['channel']}")

# ── 2. Build SQL ──
statements = []
for u in updates:
    statements.append(
        f"UPDATE matches SET tv_channel = '{u['channel']}' "
        f"WHERE round = '{u['round']}' "
        f"AND home_team_id = (SELECT id FROM teams WHERE name = '{u['team_a']}') "
        f"AND away_team_id = (SELECT id FROM teams WHERE name = '{u['team_b']}');"
    )

sql = " ".join(statements)

# ── 3. Run via Supabase Management API ──
mgmt_url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/query"
payload = json.dumps({"query": sql}).encode()

req = urllib.request.Request(mgmt_url, data=payload, method="POST")
req.add_header("Authorization", f"Bearer {PAT}")
req.add_header("Content-Type", "application/json")

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode()
        status = resp.status
        print(f"Management API: {status}")
        if status >= 400:
            print(body[:800])
            sys.exit(1)
        # Log truncated success
        print(body[:200] if len(body) > 200 else body)
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:800]}")
    sys.exit(1)
except Exception as e:
    print(f"API call failed: {e}")
    sys.exit(1)

print("TV channels updated successfully")
