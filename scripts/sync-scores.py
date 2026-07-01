#!/usr/bin/env python3
"""
Sync World Cup 2026 match scores from FIFA public API → Supabase.

Fetches all FIFA World Cup 2026 matches from the FIFA API and upserts
home_score / away_score into the Supabase matches table for any match
that has a score.

Designed to be run as a cron job — idempotent, safe to run frequently.

Usage:
  python3 sync-scores.py
"""

import json
import os
import sys
import urllib.request
import urllib.error

# ── Config ──────────────────────────────────────────────
SUPABASE_URL = "https://nkztkzrkbeacyltidqwr.supabase.co"
SB_KEY_FILE = "/tmp/sb_key"          # service_role key (prefix sb_secret_)

FIFA_API = "https://api.fifa.com/api/v3/calendar/matches"

# ── Team name mapping: FIFA API → our matches table ─────
FIFA_TO_DB = {
    "Korea Republic":        "South Korea",
    "Czechia":               "Czech Republic",
    "Bosnia and Herzegovina": "Bosnia & Herzegovina",
    "USA":                   "United States",
    "Türkiye":               "Turkey",
    "Côte d'Ivoire":         "Ivory Coast",
    "Cabo Verde":            "Cape Verde",
    "IR Iran":               "Iran",
    "Congo DR":              "DR Congo",
}


def fetch_fifa_matches():
    """Fetch all WC2026 group stage matches from the FIFA API."""
    # idCompetition/idSeason pin the feed to the 104 World Cup matches. Without
    # them the endpoint returns every competition interleaved by date and
    # truncates at `count`, dropping WC matches later in the tournament — they'd
    # never sync (this is what stranded England vs Ghana).
    url = (
        f"{FIFA_API}"
        f"?language=en"
        f"&idCompetition=17"
        f"&idSeason=285023"
        f"&from=2026-06-11T00:00:00Z"
        f"&to=2026-07-20T00:00:00Z"
        f"&count=500"
    )
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; WC2026Sweeps/1.0)"
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
    except urllib.error.URLError as e:
        print(f"ERROR: FIFA API unreachable: {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: FIFA API returned invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    results = []
    skipped_live = 0
    for m in data.get("Results", []):
        comp = m.get("CompetitionName", [{}])[0].get("Description", "")
        if "World Cup" not in comp:
            continue

        home = m.get("Home") or {}
        away = m.get("Away") or {}
        hs = m.get("HomeTeamScore")
        aws = m.get("AwayTeamScore")

        # Skip matches without scores yet
        if hs is None or aws is None:
            continue

        # Only sync scores for finished matches. MatchStatus is authoritative:
        # 0 = finished (every status-0 fixture in the WC feed has final scores),
        # 1 = not started, 3 = live. This replaces the old MatchTime minute-range
        # parsing, which mis-handled stoppage time and the post-match clock.
        status = m.get("MatchStatus")
        if status != 0:
            if status == 3:
                skipped_live += 1  # match still in progress
            continue

        home_name = home.get("TeamName", [{}])[0].get("Description", "")
        away_name = away.get("TeamName", [{}])[0].get("Description", "")
        group_name_list = m.get("GroupName") or []
        group = group_name_list[0].get("Description", "") if group_name_list else ""
        stage = m.get("StageName", [{}])[0].get("Description", "") if m.get("StageName") else ""

        # Extract group letter (null for knockout)
        group_letter = group.replace("Group ", "").strip() if group.startswith("Group") else None

        # Map FIFA round name to DB round code
        round_map = {
            "Round of 32": "R32", "Round of 16": "R16",
            "Quarter-final": "QF", "Semi-final": "SF",
            "Third place": "3P", "Final": "Final",
        }
        db_round = round_map.get(stage, None)

        # Apply name mapping
        home_db = FIFA_TO_DB.get(home_name, home_name)
        away_db = FIFA_TO_DB.get(away_name, away_name)

        results.append({
            "home": home_db,
            "away": away_db,
            "home_score": int(hs),
            "away_score": int(aws),
            "group": group_letter,
            "round": db_round,
        })

    if skipped_live:
        print(f"Skipped {skipped_live} live/in-progress match(es) — waiting for full-time")

    return results


def read_key(filepath):
    """Read a single-line key from a file."""
    if not os.path.exists(filepath):
        print(f"ERROR: Key file not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    with open(filepath) as f:
        return f.read().strip()


class SupabaseSession:
    """Minimal Supabase REST client using only stdlib urllib."""

    def __init__(self, key):
        self.key = key

    def _headers(self, extra=None):
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
        if extra:
            h.update(extra)
        return h

    def get(self, path):
        url = f"{SUPABASE_URL}/rest/v1/{path}"
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        return self._do(req)

    def patch(self, path, body):
        url = f"{SUPABASE_URL}/rest/v1/{path}"
        data = json.dumps(body).encode()
        headers = self._headers({
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        })
        req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
        return self._do(req)

    @staticmethod
    def _do(request):
        try:
            with urllib.request.urlopen(request, timeout=15) as resp:
                return resp.status, resp.read().decode()
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            return e.code, body


def find_match(session, home_team, away_team, group_letter, db_round=None):
    """Find a match in Supabase by team names and group/round. Returns (match_id, existing_hs, existing_aws, already_complete) or None."""
    # Get all teams to resolve names → IDs
    status, body = session.get("teams?select=id,name")
    if status != 200:
        print(f"ERROR: Failed to fetch teams: {status}", file=sys.stderr)
        return None
    teams = {t["name"]: t["id"] for t in json.loads(body)}

    home_id = teams.get(home_team)
    away_id = teams.get(away_team)

    if not home_id:
        print(f"WARN: Team not in DB: {home_team}", file=sys.stderr)
        return None
    if not away_id:
        print(f"WARN: Team not in DB: {away_team}", file=sys.stderr)
        return None

    # Build query — use round for knockout, group_letter for group stage
    path = (
        f"matches"
        f"?home_team_id=eq.{home_id}"
        f"&away_team_id=eq.{away_id}"
    )
    if db_round:
        path += f"&round=eq.{db_round}"
    elif group_letter:
        path += f"&group_letter=eq.{group_letter}"
    # else: no round and no group → match by teams only (fallback)
    path += f"&select=id,home_score,away_score,is_complete"
    status, body = session.get(path)
    if status != 200:
        print(f"ERROR: Failed to query matches: {status}", file=sys.stderr)
        return None

    rows = json.loads(body)
    if not rows:
        print(f"WARN: No match for {home_team} vs {away_team} (Group {group_letter})", file=sys.stderr)
        return None

    r = rows[0]
    return r["id"], r.get("home_score"), r.get("away_score"), r.get("is_complete")


def update_score(session, match_id, home_score, away_score):
    """Update match scores and mark as complete in Supabase."""
    path = f"matches?id=eq.{match_id}"
    body = {
        "home_score": home_score,
        "away_score": away_score,
        "is_complete": True,
    }
    status, _ = session.patch(path, body)
    return status in (200, 204)


# ── Knockout bracket structure (matches js/render-bracket.js) ──
# Each tuple: (target_match_id, feeder_a_id, feeder_b_id, [losers])
# When feeder matches complete, their winners populate the target's team slots.
# The optional fourth field: True = take losers instead of winners (3rd place).

BRACKET_STAGES = [
    # R32 winners → R16
    [(89, 73, 75), (90, 74, 77), (91, 76, 78), (92, 79, 80),
     (93, 83, 84), (94, 81, 82), (95, 86, 88), (96, 85, 87)],
    # R16 winners → QF
    [(97, 89, 90), (98, 93, 94), (99, 91, 92), (100, 95, 96)],
    # QF winners → SF
    [(101, 97, 98), (102, 99, 100)],
    # SF winners → Final; SF losers → 3rd Place
    [(104, 101, 102), (103, 101, 102, True)],
]


def _resolve_winner(m, take_losers=False):
    """Return (winner_team_id, winner_name) or (None, None) if unresolved."""
    if not m or not m.get("is_complete"):
        return None, None
    h, a = m.get("home_score"), m.get("away_score")
    if h is None or a is None:
        return None, None
    if take_losers:
        # Losers: the team that DIDN'T win
        if h > a:
            return m.get("away_team_id"), m.get("away_name")
        if a > h:
            return m.get("home_team_id"), m.get("home_name")
        aw = m.get("actual_winner")
        if aw:
            return (m.get("away_team_id") if aw == m.get("home_name") else m.get("home_team_id"),
                    m.get("away_name") if aw == m.get("home_name") else m.get("home_name"))
        return None, None
    # Winners
    if h > a:
        return m.get("home_team_id"), m.get("home_name")
    if a > h:
        return m.get("away_team_id"), m.get("away_name")
    aw = m.get("actual_winner")
    if aw:
        return (m.get("home_team_id") if aw == m.get("home_name") else m.get("away_team_id"),
                m.get("home_name") if aw == m.get("home_name") else m.get("away_name"))
    return None, None


def resolve_bracket_placeholders(session):
    """Populate NULL home_team_id/away_team_id on knockout placeholder rows
    once both feeder matches are complete. Cascades through the bracket
    so R32→R16→QF→SF→Final placeholders fill in automatically."""
    # Fetch all knockout matches with team IDs and score info
    status, body = session.get(
        "matches?select=id,home_team_id,away_team_id,home_score,away_score,"
        "is_complete,round,actual_winner,"
        "home:home_team_id(name),away:away_team_id(name)"
        "&round=not.is.null&order=id"
    )
    if status != 200:
        print(f"ERROR: Failed to fetch knockout matches: {status}", file=sys.stderr)
        return 0

    rows = json.loads(body)
    by_id = {}
    for r in rows:
        h = r.get("home") or {}
        a = r.get("away") or {}
        by_id[r["id"]] = {
            "home_team_id": r.get("home_team_id"),
            "away_team_id": r.get("away_team_id"),
            "home_name": h.get("name") if h else None,
            "away_name": a.get("name") if a else None,
            "home_score": r.get("home_score"),
            "away_score": r.get("away_score"),
            "is_complete": r.get("is_complete"),
            "actual_winner": r.get("actual_winner"),
            "round": r.get("round"),
        }

    resolved = 0
    for stage in BRACKET_STAGES:
        for target_id, fa, fb, *opts in stage:
            take_losers = opts[0] if opts else False
            target = by_id.get(target_id)
            if not target:
                continue
            # Only fill placeholders that still have NULL teams
            if target["home_team_id"] is not None and target["away_team_id"] is not None:
                continue

            feeder_a = by_id.get(fa)
            feeder_b = by_id.get(fb)
            if not feeder_a or not feeder_b:
                continue

            home_id, home_name = _resolve_winner(feeder_a, take_losers)
            away_id, away_name = _resolve_winner(feeder_b, take_losers)
            if home_id is None or away_id is None:
                continue

            path = f"matches?id=eq.{target_id}"
            body_patch = {"home_team_id": home_id, "away_team_id": away_id}
            st, _ = session.patch(path, body_patch)
            if st in (200, 204):
                print(f"  Resolved #{target_id} ({target['round']}): "
                      f"{home_name} vs {away_name}")
                # Update in-memory cache so cascading stages see the new data
                by_id[target_id]["home_team_id"] = home_id
                by_id[target_id]["away_team_id"] = away_id
                by_id[target_id]["home_name"] = home_name
                by_id[target_id]["away_name"] = away_name
                resolved += 1
            else:
                print(f"  ERROR resolving #{target_id}: HTTP {st}", file=sys.stderr)

    return resolved


def main():
    # Read the service_role key (sb_secret_ prefix — can write)
    sb_key = read_key(SB_KEY_FILE)
    session = SupabaseSession(sb_key)

    # Fetch scores from FIFA
    print("Fetching scores from FIFA API...")
    results = fetch_fifa_matches()
    print(f"Found {len(results)} matches with scores.")

    updated = 0
    skipped = 0

    for r in results:
        found = find_match(session, r["home"], r["away"], r.get("group"), r.get("round"))
        if found is None:
            skipped += 1
            continue

        mid, existing_hs, existing_aws, already_complete = found

        # Skip if already up to date (scores match AND already marked complete)
        if existing_hs == r["home_score"] and existing_aws == r["away_score"] and already_complete:
            skipped += 1
            continue

        print(f"  Updating #{mid}: {r['home']} {r['home_score']}-{r['away_score']} {r['away']} (was {existing_hs}-{existing_aws})")
        if update_score(session, mid, r["home_score"], r["away_score"]):
            updated += 1
        else:
            print(f"  ERROR: Failed to update match #{mid}", file=sys.stderr)
            skipped += 1

    print(f"\nDone. Updated: {updated}, Skipped (up to date): {skipped}")

    # Resolve knockout bracket placeholders — once feeder matches complete,
    # populate the next round's home_team_id/away_team_id so the DB stays
    # in sync and the frontend doesn't need bracket-tree fallbacks.
    resolved = resolve_bracket_placeholders(session)
    if resolved:
        print(f"Resolved {resolved} bracket placeholder(s).")


if __name__ == "__main__":
    main()
