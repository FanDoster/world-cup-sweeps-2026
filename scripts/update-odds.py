#!/usr/bin/env python3
"""
Update World Cup 2026 team + match odds from Polymarket → Supabase.

Fetches Polymarket's World Cup Winner market for team-level win percentages
and per-match markets for match-level home/draw/away probabilities. Only
updates matches that haven't been played yet (home_score IS NULL).

For matches without Polymarket coverage, derives odds from the updated team
win percentages using a draw-factor model.

Designed to be run as a cron job — idempotent, safe to run frequently.

Usage:
  python3 update-odds.py
"""

import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Config ──────────────────────────────────────────────
SUPABASE_URL = "https://nkztkzrkbeacyltidqwr.supabase.co"
SB_KEY_FILE = "/tmp/sb_key"          # service_role key (prefix sb_secret_)

POLY_GAMMA = "https://gamma-api.polymarket.com/events"

# ── ISO → Polymarket 3-letter slug codes ────────────────
ISO_TO_POLY = {
    'us': 'usa', 'ca': 'can', 'br': 'bra', 'fr': 'fra', 'de': 'ger',
    'es': 'esp', 'nl': 'nld', 'gb-eng': 'eng', 'gb-sct': 'sco',
    'jp': 'jpn', 'kr': 'kor', 'ar': 'arg', 'pt': 'por', 'uy': 'uru',
    'py': 'par', 'ec': 'ecu', 'co': 'col', 'mx': 'mex', 'ma': 'mar',
    'sn': 'sen', 'gh': 'gha', 'eg': 'egy', 'dz': 'alg', 'tn': 'tun',
    'za': 'rsa', 'cd': 'cod', 'cv': 'cvi', 'be': 'bel', 'ch': 'che',
    'at': 'aut', 'hr': 'cro', 'cz': 'cze', 'se': 'swe', 'no': 'nor',
    'tr': 'tur', 'ir': 'irn', 'iq': 'irq', 'sa': 'ksa', 'qa': 'qat',
    'jo': 'jor', 'uz': 'uzb', 'au': 'aus', 'nz': 'nzl', 'ht': 'hai',
    'pa': 'pan', 'ci': 'civ', 'cw': 'cur', 'ba': 'bih',
}

# ── Team name: DB → ISO ─────────────────────────────────
TEAM_ISO = {
    'Argentina': 'ar', 'France': 'fr', 'Spain': 'es', 'Germany': 'de',
    'England': 'gb-eng', 'Portugal': 'pt', 'Brazil': 'br', 'Belgium': 'be',
    'Netherlands': 'nl', 'Colombia': 'co', 'Mexico': 'mx', 'Croatia': 'hr',
    'Uruguay': 'uy', 'Morocco': 'ma', 'United States': 'us', 'Switzerland': 'ch',
    'Senegal': 'sn', 'South Korea': 'kr', 'Canada': 'ca', 'Iran': 'ir',
    'Japan': 'jp', 'Austria': 'at', 'Ecuador': 'ec', 'Australia': 'au',
    'Turkey': 'tr', 'Egypt': 'eg', 'Ivory Coast': 'ci', 'Sweden': 'se',
    'Czech Republic': 'cz', 'Scotland': 'gb-sct', 'Norway': 'no', 'Algeria': 'dz',
    'Qatar': 'qa', 'Bosnia & Herzegovina': 'ba', 'Saudi Arabia': 'sa',
    'Paraguay': 'py', 'South Africa': 'za', 'Ghana': 'gh', 'DR Congo': 'cd',
    'Tunisia': 'tn', 'Uzbekistan': 'uz', 'Curaçao': 'cw', 'Panama': 'pa',
    'New Zealand': 'nz', 'Cape Verde': 'cv', 'Jordan': 'jo', 'Iraq': 'iq',
    'Haiti': 'ht',
}

# ── Polymarket market team name → DB team name ──────────
POLY_TEAM_TO_DB = {
    'mexico': 'Mexico', 'south africa': 'South Africa', 'czechia': 'Czech Republic',
    'switzerland': 'Switzerland', 'canada': 'Canada', 'morocco': 'Morocco',
    'haiti': 'Haiti', 'qatar': 'Qatar', 'bosnia and herzegovina': 'Bosnia & Herzegovina',
    'germany': 'Germany', "côte d'ivoire": 'Ivory Coast', 'scotland': 'Scotland',
    'brazil': 'Brazil', 'new zealand': 'New Zealand', 'egypt': 'Egypt',
    'austria': 'Austria', 'argentina': 'Argentina', 'england': 'England',
    'panama': 'Panama', 'ir iran': 'Iran', 'belgium': 'Belgium',
    'spain': 'Spain', 'saudi arabia': 'Saudi Arabia', 'algeria': 'Algeria',
    'jordan': 'Jordan', 'france': 'France', 'iraq': 'Iraq',
    'tunisia': 'Tunisia', 'netherlands': 'Netherlands', 'senegal': 'Senegal',
    'norway': 'Norway', 'ghana': 'Ghana', 'paraguay': 'Paraguay',
    'australia': 'Australia', 'ecuador': 'Ecuador', 'japan': 'Japan',
    'sweden': 'Sweden', 'cabo verde': 'Cape Verde', 'türkiye': 'Turkey',
    'united states': 'United States', 'uzbekistan': 'Uzbekistan',
    'colombia': 'Colombia', 'croatia': 'Croatia', 'portugal': 'Portugal',
    'uruguay': 'Uruguay', 'ivory coast': 'Ivory Coast', 'senegal': 'Senegal',
    'south korea': 'South Korea', 'congo dr': 'DR Congo',
    'curaçao': 'Curaçao', 'cape verde': 'Cape Verde',
}


# ── Helpers ─────────────────────────────────────────────

def read_key(filepath):
    """Read a single-line key from a file."""
    if not os.path.exists(filepath):
        print(f"ERROR: Key file not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    with open(filepath) as f:
        return f.read().strip()


class SupabaseClient:
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


def fetch_poly(url_path):
    """Fetch from Polymarket gamma API. Returns parsed JSON or None."""
    try:
        url = f"{POLY_GAMMA}{url_path}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; WC2026Sweeps/1.0)"
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  WARN: Polymarket fetch failed ({url_path}): {e}", file=sys.stderr)
        return None


def parse_market_prices(markets):
    """
    Parse Polymarket market list into {team_name: probability} and draw_probability.
    Uses lastTradePrice as the probability signal.
    Returns (win_probs_dict, draw_prob) or (None, None) on failure.
    """
    win_probs = {}
    draw_prob = None
    for mk in markets:
        q = mk.get('question', '').lower()
        ltp = mk.get('lastTradePrice')
        if ltp is None:
            continue
        if 'draw' in q:
            draw_prob = ltp
        else:
            # Extract team from "Will {team} win on YYYY-MM-DD?"
            team = q.replace('will ', '').replace(' win on ', '|').split('|')[0].strip()
            win_probs[team] = ltp

    if not win_probs or draw_prob is None:
        return None, None
    return win_probs, draw_prob


def normalise_pct(p1, p2, p3):
    """Normalise three floats (0..1) to integer percentages summing to 100."""
    total = p1 + p2 + p3
    if total == 0:
        return 33, 34, 33
    a = round(p1 / total * 100)
    b = round(p2 / total * 100)
    c = round(p3 / total * 100)
    diff = 100 - (a + b + c)
    # Add diff to largest
    if a >= b and a >= c: a += diff
    elif b >= a and b >= c: b += diff
    else: c += diff
    return a, b, c


# ── Phase 1: Update team win percentages ────────────────

def update_team_odds(session):
    """Fetch World Cup Winner market from Polymarket and update teams table."""
    print("── Phase 1: Team win percentages ──")

    data = fetch_poly("?slug=world-cup-winner")
    if not data:
        print("ERROR: Failed to fetch World Cup Winner market", file=sys.stderr)
        return 0

    event = data[0]
    markets = event.get('markets', [])
    print(f"  Polymarket volume: ${float(event.get('volume', 0)):,.0f}")

    # DB team name → Polymarket question mapping
    POLY_WINNER_NAMES = {
        'Argentina': 'Argentina', 'France': 'France', 'Spain': 'Spain',
        'Germany': 'Germany', 'England': 'England', 'Portugal': 'Portugal',
        'Brazil': 'Brazil', 'Belgium': 'Belgium', 'Netherlands': 'Netherlands',
        'Colombia': 'Colombia', 'Mexico': 'Mexico', 'Croatia': 'Croatia',
        'Uruguay': 'Uruguay', 'Morocco': 'Morocco', 'United States': 'USA',
        'Switzerland': 'Switzerland', 'Senegal': 'Senegal', 'South Korea': 'South Korea',
        'Canada': 'Canada', 'Iran': 'Iran', 'Japan': 'Japan', 'Austria': 'Austria',
        'Ecuador': 'Ecuador', 'Australia': 'Australia', 'Turkey': 'Türkiye',
        'Egypt': 'Egypt', 'Ivory Coast': 'Ivory Coast', 'Sweden': 'Sweden',
        'Czech Republic': 'Czech Republic', 'Scotland': 'Scotland', 'Norway': 'Norway',
        'Algeria': 'Algeria', 'Qatar': 'Qatar', 'Bosnia & Herzegovina': 'Bosnia',
        'Saudi Arabia': 'Saudi Arabia', 'Paraguay': 'Paraguay',
        'South Africa': 'South Africa', 'Ghana': 'Ghana', 'DR Congo': 'DR Congo',
        'Tunisia': 'Tunisia', 'Uzbekistan': 'Uzbekistan', 'Curaçao': 'Curaçao',
        'Panama': 'Panama', 'New Zealand': 'New Zealand', 'Cape Verde': 'Cape Verde',
        'Jordan': 'Jordan', 'Iraq': 'Iraq', 'Haiti': 'Haiti',
    }

    # Build polymarket question → price lookup
    poly_pcts = {}
    for m in markets:
        q = m.get('question', '')
        prices_str = m.get('outcomePrices', '[]')
        try:
            prices = json.loads(prices_str)
        except (json.JSONDecodeError, TypeError):
            prices = []
        pct = float(prices[0]) if prices else 0
        # Also check lastTradePrice for CLOB markets
        ltp = m.get('lastTradePrice')
        if ltp is not None and (pct == 0 or pct == 1):
            pct = ltp
        # Extract team name: "Will Argentina win the 2026 FIFA World Cup?"
        team = q.replace('Will ', '').replace(' win the 2026 FIFA World Cup?', '').strip()
        poly_pcts[team] = max(1, round(pct * 100))  # floor at 1%

    updated = 0
    for db_name, poly_name in POLY_WINNER_NAMES.items():
        new_pct = poly_pcts.get(poly_name)
        if new_pct is None:
            print(f"  WARN: No Polymarket odds for {db_name} (tried '{poly_name}')", file=sys.stderr)
            continue

        status, _ = session.patch(
            f"teams?name=eq.{urllib.parse.quote(db_name)}",
            {"win_pct": new_pct}
        )
        if status in (200, 204):
            updated += 1
        else:
            print(f"  ERROR: Failed to update {db_name}: HTTP {status}", file=sys.stderr)

    print(f"  Updated {updated} team win percentages")
    return updated


# ── Phase 2: Update match odds ──────────────────────────

def update_match_odds(session):
    """Fetch per-match Polymarket odds and update matches table.
    Only updates matches where home_score IS NULL (not yet played)."""
    print("── Phase 2: Match odds ──")

    # Get all matches that haven't been played yet
    status, body = session.get(
        "matches?home_score=is.null"
        "&select=id,match_date,home_team_id(name),away_team_id(name),prob_home,prob_draw,prob_away"
        "&order=match_date"
    )
    if status != 200:
        print(f"ERROR: Failed to fetch matches: {status}", file=sys.stderr)
        return 0

    matches = json.loads(body)
    print(f"  Unplayed matches in DB: {len(matches)}")

    # Build slug → match lookup
    slugs_to_match = {}
    for m in matches:
        t1 = m['home_team_id']['name']
        t2 = m['away_team_id']['name']
        iso1 = TEAM_ISO.get(t1)
        iso2 = TEAM_ISO.get(t2)
        if not iso1 or not iso2:
            continue
        poly1 = ISO_TO_POLY.get(iso1)
        poly2 = ISO_TO_POLY.get(iso2)
        if not poly1 or not poly2:
            continue
        slug = f"fifwc-{poly1}-{poly2}-{m['match_date']}"
        slugs_to_match[slug] = m

    print(f"  Polymarket slugs to fetch: {len(slugs_to_match)}")

    # Fetch all Polymarket match events in parallel
    results = {}
    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = {
            ex.submit(fetch_poly, f"?slug={slug}"): slug
            for slug in slugs_to_match
        }
        for f in as_completed(futures):
            slug = futures[f]
            try:
                results[slug] = f.result()
            except Exception as e:
                print(f"  WARN: {slug} failed: {e}", file=sys.stderr)
                results[slug] = None

    # Process results
    updated_from_poly = 0
    missing_poly = []

    for slug, data in results.items():
        m = slugs_to_match[slug]
        t1 = m['home_team_id']['name']
        t2 = m['away_team_id']['name']

        if not data:
            missing_poly.append(m)
            continue

        ev = data[0]
        markets = ev.get('markets', [])
        win_probs, draw_prob = parse_market_prices(markets)

        if win_probs is None:
            missing_poly.append(m)
            continue

        # Check if this looks like a resolved market (any outcome > 0.95)
        max_prob = max(list(win_probs.values()) + [draw_prob])
        if max_prob > 0.95:
            # Likely resolved — skip (already played according to Polymarket)
            continue

        # Map Polymarket team names back to our DB names
        db_prob1 = None
        db_prob2 = None
        for poly_team, prob in win_probs.items():
            db_team = POLY_TEAM_TO_DB.get(poly_team)
            if db_team == t1:
                db_prob1 = prob
            elif db_team == t2:
                db_prob2 = prob

        if db_prob1 is None or db_prob2 is None:
            missing_poly.append(m)
            continue

        p1, pd, p2 = normalise_pct(db_prob1, draw_prob, db_prob2)

        status, _ = session.patch(
            f"matches?id=eq.{m['id']}",
            {"prob_home": p1, "prob_draw": pd, "prob_away": p2}
        )
        if status in (200, 204):
            updated_from_poly += 1

    print(f"  Updated from Polymarket: {updated_from_poly}")

    # ── Phase 2b: Derive odds for matches without Polymarket coverage ──
    if missing_poly:
        print(f"  Matches without Polymarket coverage: {len(missing_poly)}")
        updated_derived = derive_match_odds(session, missing_poly)
        print(f"  Updated from derived odds: {updated_derived}")
    else:
        updated_derived = 0

    return updated_from_poly + updated_derived


def derive_match_odds(session, matches):
    """Derive match odds from team win percentages for matches without Polymarket data."""
    # Get current team win percentages
    status, body = session.get("teams?select=name,win_pct")
    if status != 200:
        return 0
    teams = json.loads(body)
    team_pct = {t['name']: t['win_pct'] for t in teams}

    updated = 0
    for m in matches:
        t1 = m['home_team_id']['name']
        t2 = m['away_team_id']['name']
        hp = team_pct.get(t1, 1)
        ap = team_pct.get(t2, 1)
        total = hp + ap

        if total == 0:
            p1 = pd = p2 = 33
        else:
            # Draw factor: 18-26% based on matchup closeness
            ratio = min(hp, ap) / max(hp, ap) if max(hp, ap) > 0 else 1
            draw_factor = 0.18 + (ratio * 0.08)
            remaining = 1.0 - draw_factor
            prob_home = (hp / total) * remaining
            prob_away = (ap / total) * remaining
            p1, pd, p2 = normalise_pct(prob_home, draw_factor, prob_away)

        status, _ = session.patch(
            f"matches?id=eq.{m['id']}",
            {"prob_home": p1, "prob_draw": pd, "prob_away": p2}
        )
        if status in (200, 204):
            updated += 1

    return updated


# ── Main ────────────────────────────────────────────────

def main():
    sb_key = read_key(SB_KEY_FILE)
    session = SupabaseClient(sb_key)

    print("Polymarket Odds Updater —", __import__('datetime').datetime.now().isoformat())

    teams_updated = update_team_odds(session)
    matches_updated = update_match_odds(session)

    print(f"\nDone. Teams updated: {teams_updated}, Matches updated: {matches_updated}")


if __name__ == "__main__":
    main()
