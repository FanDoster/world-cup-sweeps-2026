#!/usr/bin/env python3
"""
Live match score poller for World Cup 2026.

Polls the FIFA API every 60 seconds during live matches and writes scores
to Supabase in near-real-time — both in-play (so the frontend shows the
running score on the LIVE card) and at full-time. We only write the scores;
the is_complete column is maintained by the check_match_complete() trigger,
and the frontend reads "LIVE" off each match's kickoff window. Designed to
run inside a GitHub Actions workflow that triggers 3× daily (15:00, 21:00,
03:00 UTC).

Each invocation covers a ~5.5-hour window. Exits early if no World Cup
matches are live or upcoming within the window.

Usage:
  python3 sync-live.py
"""

import json
import os
import sys
import time
import calendar
import urllib.request
import urllib.error

# ── Config ──────────────────────────────────────────────
SUPABASE_URL = "https://nkztkzrkbeacyltidqwr.supabase.co"
SB_KEY_FILE = "/tmp/sb_key"          # service_role key (prefix sb_secret_)

FIFA_API = "https://api.fifa.com/api/v3/calendar/matches"
# WC2026 competition/season IDs. WITHOUT these the endpoint returns every
# competition's fixtures interleaved by date and truncates at `count`, so WC
# matches later in the tournament fall off the end and never sync. Filtering
# pins the feed to exactly the 104 World Cup matches.
ID_COMPETITION = "17"
ID_SEASON = "285023"
FROM_DATE = "2026-06-11T00:00:00Z"
TO_DATE = "2026-07-20T00:00:00Z"
FETCH_COUNT = 200

POLL_INTERVAL = 60       # seconds between FIFA API calls
MAX_RUNTIME = 19800      # 5.5 hours (stays under the 6 h GA limit)
MATCH_OVERLAP = 7200     # 2 hours — keep polling after kickoff of last match

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


# ── Helpers ─────────────────────────────────────────────

def read_key(filepath):
    if not os.path.exists(filepath):
        print(f"ERROR: Key file not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    with open(filepath) as f:
        return f.read().strip()


class SupabaseClient:
    """Minimal Supabase REST client."""

    def __init__(self, key):
        self.key = key

    def _headers(self, extra=None):
        h = {"apikey": self.key, "Authorization": f"Bearer {self.key}"}
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


# ── FIFA API ────────────────────────────────────────────

def fetch_fifa_matches():
    """Fetch all WC2026 matches from the FIFA API. Returns list of dicts."""
    url = (
        f"{FIFA_API}"
        f"?language=en"
        f"&idCompetition={ID_COMPETITION}"
        f"&idSeason={ID_SEASON}"
        f"&from={FROM_DATE}"
        f"&to={TO_DATE}"
        f"&count={FETCH_COUNT}"
    )
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; WC2026Sweeps/1.0)"
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"ERROR: FIFA API unreachable: {e}", file=sys.stderr)
        return None

    matches = []
    for m in data.get("Results", []):
        comp = m.get("CompetitionName", [{}])[0].get("Description", "")
        if "World Cup" not in comp:
            continue
        matches.append(m)
    return matches


def parse_match_status(m):
    """
    Parse a FIFA API match dict into a status summary.
    Returns dict with:
      home_name, away_name, home_score, away_score,
      match_time (minutes as int, or -1),
      winner_id,
      group_letter,
      is_finished (bool),
      is_live (bool),
    """
    home = m.get("Home") or {}
    away = m.get("Away") or {}
    home_name = home.get("TeamName", [{}])[0].get("Description", "")
    away_name = away.get("TeamName", [{}])[0].get("Description", "")
    hs = m.get("HomeTeamScore")
    aws = m.get("AwayTeamScore")
    group_name_list = m.get("GroupName") or []
    group = group_name_list[0].get("Description", "") if group_name_list else ""
    group_letter = group.replace("Group ", "").strip() if group else ""

    # MatchTime is like "37'" or "45+2'" (stoppage) — take the base minute.
    match_time_str = m.get("MatchTime", "")
    try:
        minutes = int(match_time_str.replace("'", "").split("+")[0])
    except (ValueError, AttributeError):
        minutes = -1

    winner = m.get("Winner")

    # MatchStatus is the authoritative state: 0 = finished (every status-0 fixture
    # in the WC feed carries final scores), 1 = not started, 3 = live. We key
    # "finished" off it rather than parsing MatchTime minute ranges (which broke on
    # stoppage time and on the post-match clock). Live still uses the MatchTime
    # heuristic so we push in-play scores during the run of play.
    status = m.get("MatchStatus")
    is_finished = status == 0
    # A match is live when it's in open play (1st/2nd half). Stoppage/half-time
    # gaps simply skip an in-play update until the next clean minute.
    is_live = (0 < minutes < 90) and not is_finished

    return {
        "home_name": home_name,
        "away_name": away_name,
        "home_score": hs,
        "away_score": aws,
        "match_time_minutes": minutes,
        "winner_id": winner,
        "group_letter": group_letter,
        "is_finished": is_finished,
        "is_live": is_live,
        "has_scores": hs is not None and aws is not None,
    }


# ── Supabase Sync ───────────────────────────────────────

def find_and_update(session, status, team_lookup, label):
    """
    Find the match in Supabase and write its current scores.

    We only PATCH home_score/away_score — the is_complete column is owned by the
    check_match_complete() trigger (TRUE once both scores are set and kickoff has
    passed), so we never send it. The frontend distinguishes a live match from a
    finished one by its kickoff time window, not by is_complete. `label` ("live"
    or "FT") is only used for logging.

    Returns True if updated, False if skipped/not-found/error.
    """
    home_db = FIFA_TO_DB.get(status["home_name"], status["home_name"])
    away_db = FIFA_TO_DB.get(status["away_name"], status["away_name"])

    home_id = team_lookup.get(home_db)
    away_id = team_lookup.get(away_db)
    if not home_id or not away_id:
        return False

    path = (
        f"matches"
        f"?home_team_id=eq.{home_id}"
        f"&away_team_id=eq.{away_id}"
        f"&group_letter=eq.{status['group_letter']}"
        f"&select=id,home_score,away_score"
    )
    code, body = session.get(path)
    if code != 200:
        return False

    rows = json.loads(body)
    if not rows:
        return False

    r = rows[0]
    mid = r["id"]
    existing_hs = r.get("home_score")
    existing_aws = r.get("away_score")

    new_hs = int(status["home_score"])
    new_aws = int(status["away_score"])

    # Skip if the scores are already up to date
    if existing_hs == new_hs and existing_aws == new_aws:
        return False

    body_patch = {
        "home_score": new_hs,
        "away_score": new_aws,
    }
    code, _ = session.patch(f"matches?id=eq.{mid}", body_patch)

    if code in (200, 204):
        print(f"  ✓ [{label}] {home_db} {new_hs}-{new_aws} {away_db}  (was {existing_hs}-{existing_aws})")
        return True
    return False


def build_team_lookup(session):
    """Fetch team name → id mapping from Supabase. Returns dict or None."""
    code, body = session.get("teams?select=id,name")
    if code != 200:
        print("ERROR: Failed to fetch teams", file=sys.stderr)
        return None
    return {t["name"]: t["id"] for t in json.loads(body)}


# ── Main Polling Loop ──────────────────────────────────

def main():
    sb_key = read_key(SB_KEY_FILE)
    session = SupabaseClient(sb_key)
    start_time = time.time()

    print(f"Live score poller started at {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")

    # Phase 1: check if there are any WC matches today at all
    fifa_matches = fetch_fifa_matches()
    if fifa_matches is None:
        print("FIFA API unavailable — exiting")
        sys.exit(1)

    statuses = [parse_match_status(m) for m in fifa_matches]

    # Check if any matches are live, or will kick off within the next 6 hours
    now = time.time()
    any_in_window = False
    for m in fifa_matches:
        match_date = m.get("Date", "")
        if not match_date:
            continue
        try:
            kickoff_ts = calendar.timegm(time.strptime(match_date[:19], "%Y-%m-%dT%H:%M:%S"))
        except (ValueError, OSError):
            continue
        # Match is within our window if it kicked off less than 3 hours ago
        # OR will kick off within the next 6 hours
        if (now - 10800) <= kickoff_ts <= (now + 21600):
            any_in_window = True
            break

    if not any_in_window:
        print("No World Cup matches in this 6-hour window — exiting")
        return

    # Phase 2: build team lookup
    team_lookup = build_team_lookup(session)
    if team_lookup is None:
        sys.exit(1)

    # Phase 3: polling loop
    poll_count = 0
    updated_total = 0
    consecutive_idle = 0
    MAX_IDLE_POLLS = 10  # exit after 10 minutes of nothing happening

    print(f"Monitoring {len(fifa_matches)} matches…")

    while True:
        elapsed = time.time() - start_time
        if elapsed > MAX_RUNTIME:
            print(f"Max runtime ({MAX_RUNTIME}s) reached — exiting")
            break

        poll_count += 1

        # Fetch fresh data from FIFA
        fifa_matches = fetch_fifa_matches()
        if fifa_matches is None:
            print("FIFA API unavailable — will retry next poll", file=sys.stderr)
            time.sleep(POLL_INTERVAL)
            continue

        statuses = [parse_match_status(m) for m in fifa_matches]

        live_count = sum(1 for s in statuses if s["is_live"])
        live_unsynced = [
            s for s in statuses
            if s["is_live"] and s["has_scores"]
        ]
        finished_unsynced = [
            s for s in statuses
            if s["is_finished"] and s["has_scores"]
        ]

        # Sync in-play scores (trigger keeps is_complete in step; the card reads
        # LIVE off its kickoff window regardless)
        live_updated = 0
        for s in live_unsynced:
            if find_and_update(session, s, team_lookup, label="live"):
                live_updated += 1

        # Sync finished matches (trigger finalises is_complete=True)
        updated_this_poll = 0
        for s in finished_unsynced:
            if find_and_update(session, s, team_lookup, label="FT"):
                updated_this_poll += 1
        updated_total += updated_this_poll

        # Determine if we should keep polling
        if live_count > 0:
            # Matches are live — keep polling
            consecutive_idle = 0
            status_line = f"poll #{poll_count}: {live_count} live ({live_updated} score updates), synced {updated_this_poll} finished"
        elif finished_unsynced:
            # No live matches but some just finished
            consecutive_idle = 0
            status_line = f"poll #{poll_count}: 0 live, synced {updated_this_poll} finished"
        else:
            # Nothing happening — check if any upcoming matches start soon
            upcoming_soon = False
            now_ts = time.time()
            for m in fifa_matches:
                match_date = m.get("Date", "")
                if not match_date:
                    continue
                try:
                    kickoff_ts = calendar.timegm(time.strptime(
                        match_date[:19], "%Y-%m-%dT%H:%M:%S"
                    ))
                except (ValueError, OSError):
                    continue
                # Match starts within next 15 minutes?
                if 0 <= (kickoff_ts - now_ts) <= 900:
                    upcoming_soon = True
                    break

            if upcoming_soon:
                consecutive_idle = 0
                status_line = f"poll #{poll_count}: waiting for upcoming kickoff…"
            else:
                consecutive_idle += 1
                status_line = (
                    f"poll #{poll_count}: idle {consecutive_idle}/{MAX_IDLE_POLLS}"
                )

        if updated_this_poll > 0 or live_updated > 0 or poll_count % 5 == 0:
            print(status_line)

        if consecutive_idle >= MAX_IDLE_POLLS:
            print("No activity for 10 minutes — exiting")
            break

        time.sleep(POLL_INTERVAL)

    print(f"\nDone. {poll_count} polls, {updated_total} score updates over "
          f"{int(elapsed/60)} minutes.")


if __name__ == "__main__":
    main()
