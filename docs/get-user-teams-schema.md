# get_user_teams — Response Schema

## Overview

`GET /api/users/:id/teams` → `sb.rpc('get_user_teams', { user_id: '<uuid>' })`

Returns every team the authenticated user supports (via the `picks` table), along with current group standing, last 2 results, and next 2 fixtures.

## Request

| Parameter  | Type   | Description                    |
|------------|--------|--------------------------------|
| `user_id`  | UUID   | The Supabase auth.users.id     |

## Response

```jsonc
{
  "user_id": "d1a2b3c4-...",      // UUID echoed back
  "teams": [                        // Array, sorted by group_letter then name
    {
      // ── Team Identifiers ──
      "id": 12,                     // teams.id (integer)
      "name": "England",            // teams.name
      "iso": "gb-eng",              // teams.iso — flag code for flagUrl()
      "group_letter": "L",          // teams.group_letter
      "win_pct": 75,                // teams.win_pct (integer 0-100)
      "owner": "Anton",             // teams.owner — player name

      // ── Group Standing (null if no matches played yet) ──
      "group_standing": {
        "rank": 1,                  // Position in group (1-4)
        "played": 2,                // Matches completed
        "wins": 1,                  // Count
        "draws": 1,                 // Count
        "losses": 0,                // Count
        "gf": 4,                    // Goals For
        "ga": 2,                    // Goals Against
        "gd": 2,                    // Goal Difference (gf - ga)
        "pts": 4                    // Points (wins*3 + draws)
      },

      // ── Recent Results (last 2 completed matches, most recent first) ──
      "recent_results": [
        {
          "match_id": 104,          // matches.id
          "date": "2026-06-25",     // match_date
          "opponent": "Ghana",      // The other team
          "score": "2-1",           // "home_score-away_score"
          "result": "W",            // "W" | "D" | "L"
          "venue": "home"           // "home" | "away"
        }
      ],

      // ── Upcoming Fixtures (next 2 unplayed matches, earliest first) ──
      "upcoming_fixtures": [
        {
          "match_id": 105,          // matches.id
          "date": "2026-06-30",     // match_date
          "time": "18:00:00",        // kickoff_time
          "tz_offset": -6,          // Hours offset for venue-local time
          "opponent": "Panama",      // The other team
          "venue": "home",           // "home" | "away"
          "group": "L",             // Group letter
          "tv_channel": "BBC One",  // Broadcast channel
          "prob_home": 82,          // Win probability % (home team's perspective — raw DB value)
          "prob_draw": 10,          // Draw probability %
          "prob_away": 8            // Win probability % (away team's perspective — raw DB value)
        }
      ]
    }
  ]
}
```

## Empty / No Picks

If the user has no teams in `picks`, `teams` is an empty array `[]`:

```json
{ "user_id": "d1a2b3c4-...", "teams": [] }
```

## Error States

| Scenario                          | Behaviour                              |
|-----------------------------------|----------------------------------------|
| User not in `auth.users`          | Returns `teams: []` (no rows in picks) |
| picks table has no rows for user  | Returns `teams: []`                    |
| No matches played yet (pre-June 11) | `group_standing: null` per team, `recent_results: null`, `upcoming_fixtures` populated |

## JS Usage (client-side)

```js
const { data, error } = await sb.rpc('get_user_teams', {
  user_id: currentSession.user.id
});

if (!error) {
  data.teams.forEach(team => {
    console.log(`${team.name} — Group ${team.group_letter} #${team.group_standing?.rank ?? '-'}`);
    console.log(`  Last: ${team.recent_results?.[0]?.score ?? 'none'}`);
    console.log(`  Next: ${team.upcoming_fixtures?.[0]?.opponent ?? 'none'} on ${team.upcoming_fixtures?.[0]?.date ?? 'TBD'}`);
  });
}
```
