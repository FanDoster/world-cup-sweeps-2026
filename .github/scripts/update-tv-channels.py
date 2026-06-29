#!/usr/bin/env python3
"""Scrape live-footballontv.com for World Cup knockout TV channels and update Supabase.

Called by .github/workflows/update-tv-channels.yml daily.
Uses SB_KEY (service_role key) to write directly via REST API.
"""
import json, os, re, sys, urllib.request, urllib.error

URL = "https://www.live-footballontv.com/live-world-cup-football-on-tv.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; WC2026Bot/1.0)"}
SUPABASE_URL = "https://nkztkzrkbeacyltidqwr.supabase.co"

SB_KEY_FILE = "/tmp/sb_key"

def read_key(filepath):
    if not os.path.exists(filepath):
        print(f"ERROR: Key file not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    with open(filepath) as f:
        return f.read().strip()

sb_key = read_key(SB_KEY_FILE)

# ── 1. Fetch and parse ──
req = urllib.request.Request(URL, headers=HEADERS)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", errors="replace")
except Exception as e:
    print(f"Failed to fetch {URL}: {e}")
    sys.exit(1)

text = re.sub(r"<[^>]+>", " ", html)
text = re.sub(r"&nbsp;", " ", text)
text = re.sub(r"\s+", " ", text)

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
    updates.append({"team_a": team_a, "team_b": team_b, "round": db_round, "channel": channel})

print(f"Found {len(updates)} matches with known channels")
if not updates:
    print("No matches found — site may have changed format")
    sys.exit(1)

for u in updates:
    print(f"  {u['team_a']} v {u['team_b']} → {u['channel']}")

# ── 2. Fetch team name → ID from Supabase ──
teams_url = f"{SUPABASE_URL}/rest/v1/teams?select=id,name"
req = urllib.request.Request(teams_url, headers={
    "apikey": sb_key, "Authorization": f"Bearer {sb_key}",
})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        teams_data = json.loads(resp.read())
except Exception as e:
    print(f"Failed to fetch teams: {e}")
    sys.exit(1)

team_name_to_id = {t["name"]: t["id"] for t in teams_data}

# ── 3. Find each match and PATCH ──
updated = 0
for u in updates:
    home_id = team_name_to_id.get(u["team_a"])
    away_id = team_name_to_id.get(u["team_b"])
    if not home_id or not away_id:
        print(f"  WARN: Team not found — {u['team_a']} (id={home_id}) v {u['team_b']} (id={away_id})")
        continue

    # Find the match
    match_url = (
        f"{SUPABASE_URL}/rest/v1/matches"
        f"?home_team_id=eq.{home_id}"
        f"&away_team_id=eq.{away_id}"
        f"&round=eq.{u['round']}"
        f"&select=id,tv_channel"
    )
    req = urllib.request.Request(match_url, headers={
        "apikey": sb_key, "Authorization": f"Bearer {sb_key}",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            matches = json.loads(resp.read())
    except Exception as e:
        print(f"  ERROR: Match lookup failed for {u['team_a']} v {u['team_b']}: {e}")
        continue

    if not matches:
        print(f"  WARN: No match found — {u['team_a']} v {u['team_b']} ({u['round']})")
        continue

    match_id = matches[0]["id"]
    existing_channel = matches[0].get("tv_channel")

    if existing_channel == u["channel"]:
        print(f"  SKIP #{match_id}: {u['team_a']} v {u['team_b']} — already {u['channel']}")
        continue

    # PATCH the match
    patch_url = f"{SUPABASE_URL}/rest/v1/matches?id=eq.{match_id}"
    payload = json.dumps({"tv_channel": u["channel"]}).encode()
    req = urllib.request.Request(patch_url, data=payload, method="PATCH", headers={
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status in (200, 204):
                print(f"  ✅ #{match_id}: {u['team_a']} v {u['team_b']} → {u['channel']}")
                updated += 1
            else:
                print(f"  ERROR #{match_id}: HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"  ERROR #{match_id}: HTTP {e.code} — {e.read().decode()[:200]}")

print(f"\nDone. Updated: {updated}, Skipped: {len(updates) - updated}")
