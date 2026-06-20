# get_user_predictions — Response Schema

## Calling

```js
const { data, error } = await sb.rpc('get_user_predictions', {
  target_user_id: 'f47ac10b-...',
});
```

Returns a single JSONB object (the `data` is the object directly — no `.data` nesting from rpc).

## Response shape

```jsonc
{
  "user_id":    "uuid",       // requested user's auth.users.id
  "user_name":  "string",     // display name from player_profiles

  "predictions": [
    {
      "prediction_id":   integer,
      "match_id":        integer,
      "home_team":       "string",     // e.g. "England"
      "home_iso":        "string|null", // e.g. "gb-eng"
      "away_team":       "string",     // e.g. "Croatia"
      "away_iso":        "string|null", // e.g. "hr"
      "group":           "string",     // e.g. "L"
      "match_date":      "date",       // e.g. "2026-06-17"
      "kickoff_time":    "time",       // e.g. "12:00:00"
      "tz_offset":       integer,      // hours from UTC, e.g. -6 for Mexico City
      "tv_channel":      "string|null", // e.g. "BBC One"
      "is_joker":        boolean,
      "predicted_at":    "timestamptz",

      "predicted_score": {
        "home": integer,
        "away": integer
      },
      "actual_score":    null | {
        "home": integer,
        "away": integer
      },
      "match_played":    boolean,      // true when both scores are non-null
      "base_points":     integer|null, // 0,1,2,3,5 or null (not yet played)
      "points":          integer|null  // base_points × (is_joker ? 2 : 1), null if not played
    },
    // ... sorted newest match first
  ],

  "stats": {
    "total_predictions":    integer,  // all predictions ever made by this user
    "resolved":             integer,  // predictions on matches that have scores
    "pending":              integer,  // predictions on matches not yet played
    "correct":              integer,  // resolved predictions with base_points > 0
    "wrong":                integer,  // resolved predictions with base_points = 0
    "exact_scores":         integer,  // perfect 5★ predictions
    "jokers_used":          integer,  // total predictions flagged as joker
    "jokers_settled":       integer,  // joker predictions on resolved matches
    "total_points":         integer,  // sum of points across all resolved predictions
    "max_points":           integer,  // highest points on any single prediction
    "win_rate_pct":         number,   // correct ÷ resolved × 100, rounded to 2 dp
    "avg_points_per_match": number    // total_points ÷ resolved, rounded to 2 dp
  }
}
```

## Scoring rules

| Condition                                     | Base points |
|-----------------------------------------------|-------------|
| Exact score (both scores match)               | 5           |
| Correct result + one correct score            | 3           |
| Correct result (W/D/L sign) only              | 1           |
| One correct score, wrong result               | 2           |
| Wrong result, wrong scores                    | 0           |

Joker doubles the base: max 10★ per prediction.

Identical to the client-side `calcPredPoints()` in `render-leaderboard.js`.

## Privacy / RLS

The function is `SECURITY INVOKER` — it respects the existing `pred_read` policy:
- The caller's **own** predictions are always fully visible.
- **Other players'** predictions are visible only for matches that are locked (within 5 min of kickoff) or already played.

## Edge cases

- **User has no predictions**: `predictions` is `[]`, `stats` shows zeroes.
- **User doesn't exist**: returns `null` for `user_name`, empty predictions, zero stats.
- **No matches played yet**: all `base_points`/`points` are null, `stats.resolved` is 0, rates are 0.
- **Player_profiles row missing**: `user_name` is null (predictions still returned — the profile might have been created after predictions via upsert but the profiles INSERT hasn't run yet).
