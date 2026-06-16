# CSS Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 1,635-line `<style>` block in `index.html` into 13 focused CSS files, refactor ticker duplication, extend design tokens, and add utility classes — with no visual changes.

**Architecture:** Extract CSS sections from `index.html` into `css/` files, wire them up with `<link>` tags, then refactor in-place. Extraction first, wiring second, refactoring third — so any step can be reverted cleanly.

**Tech Stack:** Vanilla CSS, `sed` for extraction, `file://`-compatible `<link rel="stylesheet">` tags.

---

## File Map

| Created | Purpose |
|---|---|
| `css/tokens.css` | Design tokens, reset, body, container |
| `css/layout.css` | Header, tabs, section visibility, footer |
| `css/matches.css` | Match grid, countdown strip, match body, prob bar |
| `css/groups.css` | People grid, group tables, owner tags, qual scenarios |
| `css/leaderboard.css` | Leaderboard table, badges, awards |
| `css/teams.css` | Team chips |
| `css/tickers.css` | All 4 ticker components (refactored in Task 10) |
| `css/predictions.css` | Predictions, history, match prediction dots |
| `css/profile.css` | Profile modal, pred panel, H2H, your prediction, joker, comments |
| `css/auth.css` | Auth bar, modal |
| `css/myteams.css` | My Teams grid |
| `css/globe.css` | Map/globe |
| `css/responsive.css` | Main `@media (max-width: 700px)` overrides |

| Modified | What changes |
|---|---|
| `index.html` | Remove `<style>` block, add 13 `<link>` tags in `<head>` |
| `js/render-groups.js` | Utility class additions |
| `js/render-leaderboard.js` | Utility class additions |
| `js/render-myteams.js` | Utility class additions |
| `js/render-matches.js` | Utility class additions |
| `js/render-predictions.js` | Utility class additions |
| `CLAUDE.md` | Document `css/` file layout |

---

## Task 1: Create css/ directory and extract tokens.css + layout.css

**Files:**
- Create: `css/tokens.css`
- Create: `css/layout.css`

CSS line ranges from `index.html` (all content is 4-space-indented inside `<style>`):
- `tokens.css` → lines 11–54 (DESIGN TOKENS, reset, body, container)
- `layout.css` → lines 55–128 (HEADER, TABS, SECTION VISIBILITY) + lines 790–800 (FOOTER)

- [ ] **Step 1: Create css/ directory**

```bash
mkdir css
```

- [ ] **Step 2: Extract tokens.css**

```bash
sed -n '11,54p' index.html | sed 's/^    //' > css/tokens.css
```

Verify the file starts with `/* ── DESIGN TOKENS ── */` and ends with the closing `}` of `.container`.

- [ ] **Step 3: Extract layout.css**

```bash
{ sed -n '55,128p' index.html; echo ''; sed -n '790,800p' index.html; } | sed 's/^    //' > css/layout.css
```

Verify it starts with `/* ── HEADER ── */` and ends with `footer a:hover { color: var(--accent); }`.

- [ ] **Step 4: Commit**

```bash
git add css/tokens.css css/layout.css
git commit -m "refactor: extract tokens and layout CSS into css/"
```

---

## Task 2: Extract matches.css

**Files:**
- Create: `css/matches.css`

Lines 215–576 (MATCHES, MATCH COUNTDOWN STRIP, MATCH BODY — ends before GROUP TABLES at 577).

- [ ] **Step 1: Extract**

```bash
sed -n '215,576p' index.html | sed 's/^    //' > css/matches.css
```

Verify it starts with `/* ── MATCHES ── */` and ends with `.match-prob-bars { display: none; }` and the surrounding group-badge and channel rules.

- [ ] **Step 2: Commit**

```bash
git add css/matches.css
git commit -m "refactor: extract matches CSS into css/matches.css"
```

---

## Task 3: Extract groups.css

**Files:**
- Create: `css/groups.css`

Three non-contiguous ranges:
- Lines 130–213 (PEOPLE GRID)
- Lines 577–662 (GROUP TABLES, OWNER TAGS)
- Lines 1545–1552 (QUALIFICATION SCENARIOS)

- [ ] **Step 1: Extract**

```bash
{ sed -n '130,213p' index.html; echo ''; sed -n '577,662p' index.html; echo ''; sed -n '1545,1552p' index.html; } | sed 's/^    //' > css/groups.css
```

Verify it starts with `/* ── PEOPLE GRID ── */` and ends with `.qual-tag.third { ... }`.

- [ ] **Step 2: Commit**

```bash
git add css/groups.css
git commit -m "refactor: extract groups CSS into css/groups.css"
```

---

## Task 4: Extract leaderboard.css + teams.css

**Files:**
- Create: `css/leaderboard.css`
- Create: `css/teams.css`

- `leaderboard.css` → lines 663–714 (LEADERBOARD) + lines 1532–1544 (BADGES, AWARDS)
- `teams.css` → lines 715–789 (TEAM CHIPS, channel badges, win badges)

- [ ] **Step 1: Extract leaderboard.css**

```bash
{ sed -n '663,714p' index.html; echo ''; sed -n '1532,1544p' index.html; } | sed 's/^    //' > css/leaderboard.css
```

Verify it starts with `/* ── LEADERBOARD ── */` and ends with `.award-card .aw-detail { ... }`.

- [ ] **Step 2: Extract teams.css**

```bash
sed -n '715,789p' index.html | sed 's/^    //' > css/teams.css
```

Verify it starts with `/* ── TEAM CHIPS ── */` and ends with `.player-win-pct { ... }`.

- [ ] **Step 3: Commit**

```bash
git add css/leaderboard.css css/teams.css
git commit -m "refactor: extract leaderboard and teams CSS"
```

---

## Task 5: Extract tickers.css

**Files:**
- Create: `css/tickers.css`

Lines 801–1161 (all ticker components).

- [ ] **Step 1: Extract**

```bash
sed -n '801,1161p' index.html | sed 's/^    //' > css/tickers.css
```

Verify it starts with `/* ── TICKERS ── */` and ends with the `.ticker-clock .tc-tz { ... }` rule.

- [ ] **Step 2: Commit**

```bash
git add css/tickers.css
git commit -m "refactor: extract tickers CSS into css/tickers.css"
```

---

## Task 6: Extract predictions.css + profile.css

**Files:**
- Create: `css/predictions.css`
- Create: `css/profile.css`

- `predictions.css` → lines 1335–1413 (PREDICTIONS, HISTORY, MATCH PREDICTION DOTS)
- `profile.css` → lines 1414–1531 (PLAYER PROFILE MODAL, MATCH PREDICTIONS PANEL, H2H, YOUR PREDICTION, JOKER, COMMENTS)

- [ ] **Step 1: Extract predictions.css**

```bash
sed -n '1335,1413p' index.html | sed 's/^    //' > css/predictions.css
```

Verify it starts with `/* ── PREDICTIONS ── */` and ends with `.pred-dot.no-pred { ... }`.

- [ ] **Step 2: Extract profile.css**

```bash
sed -n '1414,1531p' index.html | sed 's/^    //' > css/profile.css
```

Verify it starts with `/* ── PLAYER PROFILE MODAL ── */` and ends with `.pp-comment-signin { ... }`.

- [ ] **Step 3: Commit**

```bash
git add css/predictions.css css/profile.css
git commit -m "refactor: extract predictions and profile CSS"
```

---

## Task 7: Extract auth.css, myteams.css, globe.css, responsive.css

**Files:**
- Create: `css/auth.css`
- Create: `css/myteams.css`
- Create: `css/globe.css`
- Create: `css/responsive.css`

Line ranges:
- `auth.css` → lines 1287–1321 (AUTH STYLES — includes its own embedded `@media (max-width: 700px)`)
- `myteams.css` → lines 1322–1334 (MY TEAMS)
- `globe.css` → lines 1553–1643 (MAP / GLOBE — includes its own embedded `@media` blocks)
- `responsive.css` → lines 1162–1286 (main RESPONSIVE block)

- [ ] **Step 1: Extract all four**

```bash
sed -n '1287,1321p' index.html | sed 's/^    //' > css/auth.css
sed -n '1322,1334p' index.html | sed 's/^    //' > css/myteams.css
sed -n '1553,1643p' index.html | sed 's/^    //' > css/globe.css
sed -n '1162,1286p' index.html | sed 's/^    //' > css/responsive.css
```

Verify:
- `auth.css` starts with `/* ── AUTH STYLES ── */`
- `myteams.css` starts with `/* ── MY TEAMS ── */`
- `globe.css` starts with `/* ── MAP / GLOBE ── */`
- `responsive.css` starts with `/* ── RESPONSIVE ── */` and ends with the empty `@media (prefers-reduced-motion: reduce) {}`

- [ ] **Step 2: Commit**

```bash
git add css/auth.css css/myteams.css css/globe.css css/responsive.css
git commit -m "refactor: extract auth, myteams, globe, responsive CSS"
```

---

## Task 8: Wire up index.html + visual verify

**Files:**
- Modify: `index.html` (lines 10–1644)

Replace the entire `<style>…</style>` block with 13 `<link>` tags. The `<style>` block runs from line 10 (`  <style>`) to line 1644 (`  </style>`).

- [ ] **Step 1: Open index.html in a browser and take note of current appearance**

Open `index.html` directly in Chrome/Firefox (`file://` URL). Check each tab: Leaderboard, Matches, Groups, Teams, Globe, Tickers. This is your visual baseline.

- [ ] **Step 2: Replace the style block**

In `index.html`, find the block starting at line 10:

```html
  <style>
```

…ending at line 1644:

```html
  </style>
```

Replace the entire block (lines 10–1644) with:

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

- [ ] **Step 3: Verify visually**

Reload `index.html` in the browser. Check:
- Header, subtitle, auth bar render correctly
- Tab bar is styled
- All tabs show correct content
- Tickers animate along the top
- Mobile: resize to ≤700px in dev tools — match rows, tabs, leaderboard collapse correctly
- Globe tab: D3 globe renders, venue panel opens on click

If anything is wrong, check the browser console for 404s on any CSS file.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor: replace inline style block with 13 CSS link tags"
```

---

## Task 9: Extend design tokens

**Files:**
- Modify: `css/tokens.css`
- Modify: `css/tickers.css`
- Modify: `css/layout.css` (tickers-container uses `rgba(255,255,255,0.08)`)

Add 7 new variables to the `:root` block in `css/tokens.css`, then replace their hardcoded values in the relevant CSS files.

- [ ] **Step 1: Add new variables to css/tokens.css**

Open `css/tokens.css`. Inside the `:root { … }` block, after the existing `--font-mono` line, add:

```css
  /* ticker colour scale */
  --ticker-dim:        rgba(255,255,255,0.3);
  --ticker-mid:        rgba(255,255,255,0.55);
  --ticker-full:       rgba(255,255,255,0.75);
  /* semi-transparent borders used on dark surfaces */
  --border-alpha:      rgba(255,255,255,0.08);
  --border-alpha-mid:  rgba(255,255,255,0.12);
  /* third-party brand colours */
  --color-polymarket:  #2E5CFF;
  --color-stats-green: #15803d;
```

- [ ] **Step 2: Replace values in css/tickers.css**

Run these replacements in `css/tickers.css`:

```bash
cd css
sed -i '' \
  's/rgba(255,255,255,0\.08)/var(--border-alpha)/g;
   s/rgba(255,255,255,0\.12)/var(--border-alpha-mid)/g;
   s/rgba(255,255,255,0\.3)/var(--ticker-dim)/g;
   s/rgba(255,255,255,0\.55)/var(--ticker-mid)/g;
   s/rgba(255,255,255,0\.75)/var(--ticker-full)/g;
   s/#2E5CFF/var(--color-polymarket)/g;
   s/#15803d/var(--color-stats-green)/g' tickers.css
cd ..
```

- [ ] **Step 3: Replace border-alpha in css/layout.css**

The tickers container uses `rgba(255,255,255,0.08)` for its top/bottom borders (these are in the tickers section, already handled). Check `css/tickers.css` was updated. If any remain in other files, they are intentional context-specific values — do not replace them.

```bash
grep -n 'rgba(255,255,255,0\.08)\|rgba(255,255,255,0\.12)\|rgba(255,255,255,0\.3)\|#2E5CFF\|#15803d' css/tickers.css
```

Expected output: zero matches. If any remain, inspect and replace manually.

- [ ] **Step 4: Verify**

Reload `index.html` in browser. Tickers should look identical to before.

- [ ] **Step 5: Commit**

```bash
git add css/tokens.css css/tickers.css
git commit -m "refactor: extend design tokens for ticker colours and border alphas"
```

---

## Task 10: Refactor tickers.css — shared base classes

**Files:**
- Modify: `css/tickers.css`

Replace the current `css/tickers.css` (raw extraction) with a refactored version that extracts shared structural rules into multi-selector groups. This cuts the file from ~360 lines to ~195 lines. No HTML or JS changes needed — the base classes are applied via shared CSS selectors, not new HTML classes.

- [ ] **Step 1: Overwrite css/tickers.css with the refactored content**

```css
/* ── TICKERS ── */

.tickers-container {
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--border-alpha);
  border-bottom: 1px solid var(--border-alpha);
}
.tickers-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tickers-rows .ticker-outer { border-bottom: 1px solid rgba(255,255,255,0.06); }

/* ── SHARED ROW BASES ── */
.ticker-outer,
.odds-outer,
.kickoff-outer,
.stats-outer { display: flex; align-items: stretch; }

.ticker-label,
.odds-label,
.kickoff-label,
.stats-label {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.odds-label,
.kickoff-label,
.stats-label {
  padding: 5px 12px;
  gap: 1px;
  border-right: 1px solid var(--border-alpha-mid);
}

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

.odds-track,
.kickoff-track,
.stats-track {
  display: flex;
  align-items: center;
  width: max-content;
  white-space: nowrap;
  will-change: transform;
}

.odds-item,
.kickoff-item {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ticker-full);
}

.ticker-divider,
.odds-divider,
.kickoff-divider,
.stats-divider { font-size: 1rem; padding: 0 2px; }

.odds-loading,
.kickoff-loading,
.stats-loading {
  font-size: 0.7rem;
  color: var(--ticker-dim);
  letter-spacing: 0.1em;
  padding: 0 20px;
}

.odds-track.scrolling    { animation: odds-scroll    30s linear infinite; }
.kickoff-track.scrolling { animation: kickoff-scroll 20s linear infinite; }
.stats-track             { transition: opacity 0.35s ease; }

@keyframes ticker-scroll  { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes odds-scroll    { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes kickoff-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes stats-scroll   { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

.ticker-outer:hover .ticker-track             { animation-play-state: paused; }
.odds-outer:hover .odds-track.scrolling       { animation-play-state: paused; }
.kickoff-outer:hover .kickoff-track.scrolling { animation-play-state: paused; }
.stats-outer:hover .stats-track               { animation-play-state: paused; }

/* ── SPONSOR TICKER (Infantino quotes) ── */
.ticker-outer { background: rgba(0,0,0,0.2); }
.ticker-label {
  padding: 6px 12px;
  gap: 3px;
  background: #000;
  border-right: 1px solid var(--border-alpha-mid);
}
.ticker-label img { height: 26px; width: auto; display: block; }
.ticker-label .tl-partners {
  font-size: 0.42rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ticker-mid);
  white-space: nowrap;
}
.ticker-wrap {
  flex: 1;
  overflow: hidden;
  padding: 6px 0;
  -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
  mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
}
.ticker-track {
  display: flex;
  align-items: center;
  width: max-content;
  animation: ticker-scroll 22s linear infinite;
}
.sponsor {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 0 36px;
  flex-shrink: 0;
}
.sponsor img {
  height: 24px;
  width: auto;
  max-width: 100px;
  object-fit: contain;
  flex-shrink: 0;
}
.sponsor img.invert { filter: brightness(0) invert(1) opacity(0.75); }
.sponsor img.gs     { filter: brightness(100%) grayscale(1) opacity(0.75); }
.ticker-track .sponsor-tag {
  font-size: 0.95rem;
  color: var(--ticker-mid);
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-transform: uppercase;
}
.ticker-divider { color: rgba(255,255,255,0.15); }

/* ── POLYMARKET ODDS TICKER ── */
.odds-outer { background: rgba(0,0,0,0.35); }
.odds-label { background: var(--color-polymarket); }
.odds-label .ol-top {
  font-size: 0.5rem; font-weight: 900; letter-spacing: 0.18em;
  color: rgba(255,255,255,0.8); text-transform: uppercase;
}
.odds-label .ol-brand {
  font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em;
  color: #fff; text-transform: uppercase; white-space: nowrap;
}
.odds-label .ol-sub {
  font-size: 0.38rem; font-weight: 700; letter-spacing: 0.12em;
  color: var(--ticker-mid); text-transform: uppercase; white-space: nowrap;
}
.odds-item { gap: 6px; padding: 0 28px; }
.odds-item .oi-match { color: #fff; font-weight: 700; }
.odds-item .oi-prob  { color: #f90; font-weight: 700; }
.odds-item .oi-vol   { color: var(--ticker-full); font-size: 0.8rem; }
.odds-divider { color: var(--color-polymarket); opacity: 0.6; }

/* ── KICKOFF COUNTDOWN TICKER ── */
.kickoff-outer { background: rgba(0,0,0,0.25); }
.kickoff-label { background: #000; }
.kickoff-label .kl-top {
  font-size: 0.5rem; font-weight: 900; letter-spacing: 0.18em;
  color: rgba(255,255,255,0.8); text-transform: uppercase;
}
.kickoff-label .kl-brand {
  font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em;
  color: #fff; text-transform: uppercase; white-space: nowrap;
}
.kickoff-item { gap: 8px; padding: 0 28px; }
.ki-flag { height: 18px; width: auto; }
.ki-team { color: #fff; font-weight: 700; }
.ki-vs   { color: rgba(255,255,255,0.4); font-size: 0.75rem; }
.ki-sep  { color: rgba(255,255,255,0.3); }
.ki-cd   { color: #f90; font-weight: 700; }
.ki-live { color: #4ade80; font-weight: 700; }
.kickoff-divider { color: rgba(255,255,255,0.2); }

/* ── TOURNAMENT STATS TICKER ── */
.stats-outer { background: rgba(0,0,0,0.3); }
.stats-label { background: var(--color-stats-green); }
.stats-label .sl-top {
  font-size: 0.5rem; font-weight: 900; letter-spacing: 0.18em;
  color: rgba(255,255,255,0.8); text-transform: uppercase;
}
.stats-label .sl-brand {
  font-size: 0.65rem; font-weight: 900; letter-spacing: 0.05em;
  color: #fff; text-transform: uppercase; white-space: nowrap;
  min-width: 4ch; text-align: center; transition: opacity 0.35s ease;
}
.stats-label .sl-sub {
  font-size: 0.38rem; font-weight: 700; letter-spacing: 0.12em;
  color: var(--ticker-mid); text-transform: uppercase; white-space: nowrap;
}
.st-cat { font-size: 0; }
.st-item {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.9rem; letter-spacing: 0.04em;
  text-transform: uppercase; white-space: nowrap;
}
.st-item .si-flag { width: 17px; height: 12px; object-fit: cover; border-radius: 1px; flex-shrink: 0; }
.st-item .si-rank { color: rgba(255,255,255,0.45); font-size: 0.7rem; font-weight: 700; min-width: 1ch; }
.st-item .si-name { color: #fff; font-weight: 700; }
.st-item .si-stat { color: #f90; font-weight: 700; padding-left: 2px; }
.st-divider { color: rgba(255,255,255,0.45); font-size: 1rem; padding: 0 8px; }

/* ── BROADCAST CLOCK ── */
.ticker-clock {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 18px;
  background: #0a0a0a;
  gap: 3px;
  border-left: 1px solid rgba(255,255,255,0.1);
  min-width: 88px;
  box-shadow: inset 4px 0 0 var(--color-polymarket);
}
.ticker-clock .tc-time {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.ticker-clock .tc-date {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.38rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
}
.ticker-clock .tc-tz {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--color-polymarket);
  text-transform: uppercase;
}
```

- [ ] **Step 2: Verify**

Reload `index.html`. All 4 ticker rows (Infantino quotes, Polymarket odds, kickoff countdown, tournament stats) and the broadcast clock must look identical to before. Check the pause-on-hover works for each row.

- [ ] **Step 3: Commit**

```bash
git add css/tickers.css
git commit -m "refactor: consolidate ticker CSS with shared base selectors"
```

---

## Task 11: Utility classes

**Files:**
- Modify: `css/tokens.css`
- Modify: `css/groups.css`
- Modify: `css/leaderboard.css`
- Modify: `css/myteams.css`
- Modify: `css/matches.css`
- Modify: `css/predictions.css`
- Modify: `js/render-groups.js`
- Modify: `js/render-leaderboard.js`
- Modify: `js/render-myteams.js`
- Modify: `js/render-matches.js`
- Modify: `js/render-predictions.js`

Three utility classes cover patterns that repeat 3+ times. They live in `css/tokens.css` (global primitives). After adding, the duplicate declarations are removed from the per-component CSS rules.

### 11a — Add utility classes to tokens.css

- [ ] **Step 1: Add utilities to css/tokens.css**

At the end of `css/tokens.css`, after the `.container` rule, add:

```css
/* ── UTILITY CLASSES ── */
.card-base {
  background: var(--card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
}
.badge-mono {
  font-family: var(--font-mono);
  background: var(--surface);
  border-radius: 4px;
  color: var(--text-muted);
}
.label-sm {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

### 11b — Apply .card-base and slim component CSS

`.card-base` applies to: `person-card`, `group-card` (render-groups.js), `myteam-card` (render-myteams.js), `leaderboard-wrap` (render-leaderboard.js).

- [ ] **Step 2: Update render-groups.js**

File: `js/render-groups.js`, line 9:
```js
// before
card.className = "person-card";
// after
card.className = "person-card card-base";
```

File: `js/render-groups.js`, line 104:
```js
// before
card.className = "group-card";
// after
card.className = "group-card card-base";
```

File: `js/render-groups.js`, line 152:
```js
// before
thirdsCard.className = "group-card";
// after
thirdsCard.className = "group-card card-base";
```

- [ ] **Step 3: Remove duplicate declarations from css/groups.css**

In `css/groups.css`, find `.person-card { … }` and remove the three lines now covered by `.card-base`:
```css
/* remove these three lines from .person-card: */
background: var(--card);
border: 1px solid var(--border-subtle);
border-radius: var(--radius);
```

In `css/groups.css`, find `.group-card { … }` and remove:
```css
/* remove these three lines from .group-card: */
background: var(--card);
border: 1px solid var(--border-subtle);
border-radius: var(--radius);
```

- [ ] **Step 4: Update render-myteams.js**

File: `js/render-myteams.js`, line 28:
```js
// before
return `<div class="myteam-card" onclick=…
// after
return `<div class="myteam-card card-base" onclick=…
```

In `css/myteams.css`, find `.myteam-card { … }` and remove:
```css
background: var(--card);
border: 1px solid var(--border-subtle);
border-radius: var(--radius);
```

- [ ] **Step 5: Update render-leaderboard.js for leaderboard-wrap**

Find where `leaderboard-wrap` is emitted in `js/render-leaderboard.js`:

```bash
grep -n 'leaderboard-wrap' js/render-leaderboard.js
```

Add `card-base` to that element's class string (the exact template literal will be on that line). In `css/leaderboard.css`, remove these three lines from `.leaderboard-wrap`:
```css
background: var(--card);
border: 1px solid var(--border-subtle);
border-radius: var(--radius);
```

### 11c — Apply .badge-mono

`.badge-mono` applies to: `team-group` (render-groups.js:23), `mt-group` (render-myteams.js:32), `match-group-badge` (render-matches.js:117, 124), `pmc-group` (render-predictions.js:49, 59, 82, 92).

- [ ] **Step 6: Add badge-mono to render-groups.js**

File: `js/render-groups.js`, line 23:
```js
// before
<span class="team-group">Group ${t.group}</span>
// after
<span class="team-group badge-mono">Group ${t.group}</span>
```

In `css/groups.css`, find `.team-group { … }` and remove:
```css
font-family: var(--font-mono);
background: var(--surface);
border-radius: 4px;
color: var(--text-muted);
```
(Keep font-size, padding, font-weight, letter-spacing — these differ from the base.)

- [ ] **Step 7: Add badge-mono to render-myteams.js**

File: `js/render-myteams.js`, line 32:
```js
// before
<span class="mt-group">G${t.group}</span>
// after
<span class="mt-group badge-mono">G${t.group}</span>
```

In `css/myteams.css`, find `.myteam-card .mt-group { … }` and remove:
```css
color: var(--text-muted);
background: var(--surface);
border-radius: 4px;
font-family: var(--font-mono);
```

- [ ] **Step 8: Add badge-mono to render-matches.js**

File: `js/render-matches.js`, lines 117 and 124:
```js
// before (both occurrences)
<span class="match-group-badge">
<span class="match-group-badge" style="margin:0">
// after
<span class="match-group-badge badge-mono">
<span class="match-group-badge badge-mono" style="margin:0">
```

In `css/matches.css`, find `.match-group-badge { … }` and remove:
```css
color: var(--text-muted);
background: var(--surface);
border-radius: 4px;
font-family: var(--font-mono);
```

- [ ] **Step 9: Add badge-mono to render-predictions.js**

File: `js/render-predictions.js`, lines 49, 59, 82, 92 (all four `.pmc-group` occurrences):
```js
// before
<span class="pmc-group">G${m.group}</span>
// after
<span class="pmc-group badge-mono">G${m.group}</span>
```

In `css/predictions.css`, find `.pred-match-card .pmc-group { … }` and remove:
```css
color: var(--text-muted);
background: var(--surface);
border-radius: 4px;
font-family: var(--font-mono);
```

### 11d — Apply .label-sm

`.label-sm` applies to: `pred-section-title` (render-predictions.js:37, 145), `awards-title` (render-leaderboard.js:70).

- [ ] **Step 10: Add label-sm to render-predictions.js**

File: `js/render-predictions.js`, line 37:
```js
// before
html += '<div class="pred-section-title">Upcoming Matches</div>';
// after
html += '<div class="pred-section-title label-sm">Upcoming Matches</div>';
```

File: `js/render-predictions.js`, line 145:
```js
// before
html += `<div class="pred-section-title">Your History</div>…
// after
html += `<div class="pred-section-title label-sm">Your History</div>…
```

In `css/predictions.css`, find `.pred-section-title { … }` and remove:
```css
font-size: 0.78rem;
font-weight: 700;
color: var(--text-muted);
text-transform: uppercase;
letter-spacing: 0.08em;
```

- [ ] **Step 11: Add label-sm to render-leaderboard.js**

File: `js/render-leaderboard.js`, line 70 — the awards-title div in the template literal:
```js
// before
<div class="awards-title">🏆 Tournament Awards</div>
// after
<div class="awards-title label-sm">🏆 Tournament Awards</div>
```

In `css/leaderboard.css`, find `.awards-title { … }` and remove:
```css
font-size: 0.78rem;
font-weight: 700;
color: var(--text-muted);
text-transform: uppercase;
letter-spacing: 0.08em;
```
(Keep `margin: 28px 0 10px;` — that's not in the utility.)

- [ ] **Step 12: Verify**

Reload `index.html`. Check:
- People cards, group cards, leaderboard, my teams cards — same appearance
- Group badges (G-A, G-B etc.) in match rows, people cards, my teams, predictions — same appearance
- "Upcoming Matches" / "Your History" section titles and "🏆 Tournament Awards" heading — same appearance

- [ ] **Step 13: Commit**

```bash
git add css/tokens.css css/groups.css css/leaderboard.css css/myteams.css css/matches.css css/predictions.css
git add js/render-groups.js js/render-leaderboard.js js/render-myteams.js js/render-matches.js js/render-predictions.js
git commit -m "refactor: extract card-base, badge-mono, label-sm utility classes"
```

---

## Task 12: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Update the project description and add a CSS file layout table to match what was added in Tasks 1–11.

- [ ] **Step 1: Update the opening description**

In `CLAUDE.md`, find the sentence:

```
The app is **`index.html`** (CSS + HTML only) plus a `js/` directory of plain JS files loaded via `<script src>` tags
```

Change it to:

```
The app is **`index.html`** (HTML only — CSS lives in `css/` files) plus a `js/` directory of plain JS files loaded via `<script src>` tags
```

- [ ] **Step 2: Add CSS file layout table**

In `CLAUDE.md`, directly after the existing JS file layout table (the one that ends with `js/main.js`), add:

```markdown
### CSS file layout

Stylesheets load in dependency order via `<link>` tags in `<head>` (tokens first, responsive last):

| File | Responsibility |
|------|---------------|
| `css/tokens.css` | Design tokens (`:root` variables), reset, `body`, `.container`, utility classes (`.card-base`, `.badge-mono`, `.label-sm`) |
| `css/layout.css` | Header, tab bar, section visibility, footer |
| `css/matches.css` | Match grid, countdown strip, match body row, probability bar |
| `css/groups.css` | People/player cards, group tables, owner tags, qualification scenarios |
| `css/leaderboard.css` | Leaderboard table, stat badges, awards grid |
| `css/teams.css` | Team chips, channel badges, win-probability badges |
| `css/tickers.css` | All 4 ticker rows (sponsor, Polymarket odds, kickoff countdown, stats) + broadcast clock; shared base selectors reduce duplication |
| `css/predictions.css` | Prediction cards, prediction history, match prediction dots |
| `css/profile.css` | Player profile modal, match predictions panel, H2H block, your-prediction form, joker chip, comments |
| `css/auth.css` | Auth bar, sign-in/sign-up modal |
| `css/myteams.css` | My Teams tab grid |
| `css/globe.css` | D3 globe, venue panel, territory standings |
| `css/responsive.css` | `@media (max-width: 700px)` overrides for the main layout (auth and globe embed their own responsive rules inline) |
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for css/ file layout"
```

---

## Self-Review Notes

- **Spec coverage:** All 7 spec sections covered: file structure (Tasks 1–8), ticker cleanup (Task 10), token extension (Task 9), utility classes (Task 11), CLAUDE.md (Task 12).
- **Non-contiguous extractions** (layout, groups, leaderboard) use shell process substitution to concatenate ranges — exact commands are in each task.
- **Auth and globe embedded responsive rules** stay with their sections (not moved to responsive.css) — consistent with CLAUDE.md note about embedded rules.
- **No HTML changes in index.html body** — utility class additions are only in JS render functions.
- **Visual regression check** is included after Task 8 (wire-up) and after Task 11 (utilities).
