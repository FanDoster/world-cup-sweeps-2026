# CSS Refactor Design

**Date:** 2026-06-15
**Goal:** Split the single 1,635-line `<style>` block in `index.html` into 13 focused CSS files, eliminate duplication in the ticker section, extend design tokens, and extract utility classes. Visual output is identical — this is a structural refactor only.

---

## 1. Architecture

Remove the `<style>` block from `index.html` and replace it with 13 `<link rel="stylesheet">` tags in `<head>`. Load order mirrors dependency order (tokens first, responsive last). No build step required — `<link>` works for both `file://` and server.

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/matches.css">
<link rel="stylesheet" href="css/groups.css">
<link rel="stylesheet" href="css/leaderboard.css">
<link rel="stylesheet" href="css/teams.css">
<link rel="stylesheet" href="css/tickers.css">
<link rel="stylesheet" href="css/predictions.css">
<link rel="stylesheet" href="css/profile.css">
<link rel="stylesheet" href="css/auth.css">
<link rel="stylesheet" href="css/myteams.css">
<link rel="stylesheet" href="css/globe.css">
<link rel="stylesheet" href="css/responsive.css">
```

---

## 2. File Structure

| File | Sections from original `<style>` |
|---|---|
| `css/tokens.css` | DESIGN TOKENS, reset (`* { box-sizing... }`), `body`, `.container` |
| `css/layout.css` | HEADER, TABS, SECTION VISIBILITY, FOOTER |
| `css/matches.css` | MATCHES, MATCH COUNTDOWN STRIP, MATCH BODY |
| `css/groups.css` | GROUP TABLES, OWNER TAGS, QUALIFICATION SCENARIOS |
| `css/leaderboard.css` | LEADERBOARD, BADGES, AWARDS |
| `css/teams.css` | TEAM CHIPS |
| `css/tickers.css` | TICKERS (refactored — see section 3) |
| `css/predictions.css` | PREDICTIONS, HISTORY, MATCH PREDICTION DOTS, JOKER |
| `css/profile.css` | PLAYER PROFILE MODAL, MATCH PREDICTIONS PANEL, H2H, YOUR PREDICTION, COMMENTS |
| `css/auth.css` | AUTH STYLES |
| `css/myteams.css` | MY TEAMS |
| `css/globe.css` | MAP / GLOBE |
| `css/responsive.css` | RESPONSIVE (all `@media` overrides) |

---

## 3. Ticker Duplication Cleanup

The 4 ticker components (sponsor, odds, kickoff, stats) each define near-identical sub-elements. Current cost: ~360 lines. Target: ~200 lines.

**Approach:** extract shared base classes. The JS render functions already emit the per-ticker class names (`odds-outer`, `kickoff-label`, etc.) — the base classes are added alongside these in `css/tickers.css` via multi-selector rules, requiring no HTML or JS changes.

### Shared base classes

```css
.ticker-outer,
.odds-outer,
.kickoff-outer,
.stats-outer {
  display: flex;
  align-items: stretch;
}

.ticker-label,
.odds-label,
.kickoff-label,
.stats-label {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  gap: 1px;
  border-right: 1px solid var(--border-alpha-mid);
}

.ticker-wrap,
.odds-wrap,
.kickoff-wrap,
.stats-wrap {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
  mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
}

.ticker-track,
.odds-track,
.kickoff-track,
.stats-track {
  display: flex;
  align-items: center;
  width: max-content;
  white-space: nowrap;
  will-change: transform;
}

.ticker-divider,
.odds-divider,
.kickoff-divider,
.stats-divider {
  font-size: 1rem;
  padding: 0 2px;
}

.ticker-loading,
.odds-loading,
.kickoff-loading,
.stats-loading {
  font-size: 0.7rem;
  color: var(--ticker-dim);
  letter-spacing: 0.1em;
  padding: 0 20px;
}
```

Per-ticker overrides cover only what differs: background colors, accent colors, animation durations, and item-specific spacing/sizing.

---

## 4. Design Token Extensions

New variables added to `css/tokens.css`:

```css
:root {
  /* Ticker text opacity scale */
  --ticker-dim:  rgba(255,255,255,0.3);
  --ticker-mid:  rgba(255,255,255,0.55);
  --ticker-full: rgba(255,255,255,0.75);

  /* Border alphas (semi-transparent, used on dark surfaces) */
  --border-alpha:     rgba(255,255,255,0.08);
  --border-alpha-mid: rgba(255,255,255,0.12);

  /* Third-party brand colors */
  --color-polymarket:  #2E5CFF;
  --color-stats-green: #15803d;
}
```

All existing hardcoded occurrences of these values are replaced with the variable.

---

## 5. Utility Classes

Extracted only where the identical rule block appears 3+ times. Small class additions required in `index.html` body and `js/render-*.js` innerHTML strings.

| Class | Rule | Appears in |
|---|---|---|
| `.label-sm` | `font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;` | Section titles, date headers, match countdown |
| `.badge-mono` | `font-family: var(--font-mono); font-size: 0.72rem; background: var(--surface); padding: 2px 8px; border-radius: 4px;` | Group badges in match rows, people cards, my teams cards |
| `.card-base` | `background: var(--card); border: 1px solid var(--border-subtle); border-radius: var(--radius);` | Person cards, auth modal, profile modal, pred match cards |

Utility classes live in `css/tokens.css` (they are global primitives, not component-specific).

---

## 6. Scope & Constraints

- **No visual changes.** Every pixel stays the same.
- **No ES modules, no build step.** Plain `<link>` tags only.
- **`file://` compatible.** `<link rel="stylesheet">` works without a server.
- **`.surgeignore` unchanged.** The new `css/` directory is served; no exclusions needed.
- **JS render functions touched only for utility class additions.** No logic changes.
- **`responsive.css` is a single file** — keeping all `@media` overrides together makes it easy to audit mobile behaviour without hunting across files.

---

## 7. CLAUDE.md Update

After migration, update `CLAUDE.md` to:

1. Change the description from "index.html (CSS + HTML only)" to reflect that CSS now lives in `css/` files loaded via `<link>` tags.
2. Add a CSS file layout table (mirroring the existing JS file layout table) documenting each file and its responsibility.

The table should follow the same format as the JS table and list all 13 files with a one-line description of what each covers.

---

## 8. Out of Scope

- CSS variables for every value (only repeated magic numbers get tokenised)
- CSS nesting or any modern syntax that changes browser support
- Any change to JS logic, Supabase queries, or scoring rules
- Animation or transition changes
