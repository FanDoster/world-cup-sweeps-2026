# Ticker → Static Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace both scrolling ticker rows with static flex-wrap chip grids — no animation, no rotation, everything visible at once.

**Architecture:** Three sequential tasks, two files. CSS first (strips scrolling, adds chip styles), then JS rewrites for each ticker function. No build step — verify visually by opening `index.html` in a browser.

**Tech Stack:** Vanilla JS (global scope), plain CSS, no bundler.

## Global Constraints

- No ES modules, no `import`/`export` — all code runs in global scope
- No build step — changes take effect on next browser reload
- HTML element IDs `oddsTrack` and `statsTrack` must not change (other code targets them)
- `loadOdds()` and `loadStatsTracker()` function names must not change (called from `main.js`)
- `escapeHtml`, `flagUrl`, `teamIso`, `matchData` are globals from earlier scripts — use them directly
- Colour tokens: white `#fff` for names, amber `#f90` for stats/probabilities

---

### Task 1: CSS — strip scrolling, add chip grid styles

**Files:**
- Modify: `css/tickers.css`

**Interfaces:**
- Produces: `.odds-chip`, `.stats-chip` — inline badge classes consumed by Tasks 2 & 3

- [ ] **Step 1: Replace `.odds-wrap` / `.stats-wrap` block**

Find this block in `css/tickers.css` (lines ~36–43):

```css
.odds-wrap,
.stats-wrap {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
  mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
}
```

Replace with:

```css
.odds-wrap,
.stats-wrap {
  flex: 1;
  display: flex;
  align-items: flex-start;
}
```

- [ ] **Step 2: Replace `.odds-track` / `.stats-track` block**

Find (lines ~45–52):

```css
.odds-track,
.stats-track {
  display: flex;
  align-items: center;
  width: max-content;
  white-space: nowrap;
  will-change: transform;
}
```

Replace with:

```css
.odds-track,
.stats-track {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 6px 12px;
}
```

- [ ] **Step 3: Remove all scroll animation rules**

Delete these lines entirely from `css/tickers.css`:

```css
.odds-track.scrolling { animation: odds-scroll 30s linear infinite; }
.stats-track          { transition: opacity 0.35s ease; }

@keyframes odds-scroll  { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes stats-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

.odds-outer:hover .odds-track.scrolling { animation-play-state: paused; }
.stats-outer:hover .stats-track         { animation-play-state: paused; }
```

- [ ] **Step 4: Add chip styles**

Append to the end of `css/tickers.css`:

```css
/* ── CHIP GRID ── */
.odds-chip,
.stats-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 3px 8px;
}
.odds-chip .oc-match { color: rgba(255,255,255,0.55); font-size: 0.75rem; }
.odds-chip .oc-name  { color: #fff; font-weight: 700; }
.odds-chip .oc-prob  { color: #f90; font-weight: 700; }
.stats-chip .sc-flag { width: 17px; height: 12px; object-fit: cover; border-radius: 1px; flex-shrink: 0; }
.stats-chip .sc-rank { color: rgba(255,255,255,0.4); font-size: 0.75rem; font-weight: 700; }
.stats-chip .sc-name { color: #fff; font-weight: 700; }
.stats-chip .sc-stat { color: #f90; font-weight: 700; }
```

- [ ] **Step 5: Verify visually**

Open `index.html` in a browser. The ticker rows should now show their loading text (`LOADING LIVE MARKETS…`) as plain text with no scrolling. The rows may be taller than before (that's fine — chips wrap). No horizontal animation should occur anywhere in the ticker area.

- [ ] **Step 6: Commit**

```bash
git add css/tickers.css
git commit -m "Replace ticker scroll styles with chip grid layout"
```

---

### Task 2: JS — rewrite `loadOdds()` as chips

**Files:**
- Modify: `js/odds.js`

**Interfaces:**
- Consumes: `.odds-chip`, `.oc-match`, `.oc-name`, `.oc-prob` from Task 1
- Consumes globals: `matchData`, `teamIso`, `escapeHtml`, `getMatchSlugs`, `safePrices`, `oddsTeamName`, `fmtPct`
- Produces: populates `#oddsTrack` with chip HTML

- [ ] **Step 1: Replace `loadOdds()` entirely**

In `js/odds.js`, find the full `loadOdds()` function (lines ~63–120) and replace it with:

```javascript
async function loadOdds() {
  try {
    const slugs = getMatchSlugs();
    if (!slugs.length) return;

    const [matchRes, winnerRes] = await Promise.all([
      Promise.all(slugs.map(slug =>
        fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`).then(r => r.json())
      )),
      fetch('https://gamma-api.polymarket.com/events?slug=world-cup-winner').then(r => r.json())
    ]);

    const chips = [];

    // Top 4 World Cup winner odds
    const wc = winnerRes[0];
    if (wc) {
      const topMarkets = (wc.markets || [])
        .filter(m => { const p = safePrices(m); return p && p[0] > 0.05; })
        .sort((a, b) => safePrices(b)[0] - safePrices(a)[0])
        .slice(0, 4);
      for (const m of topMarkets) {
        const name = oddsTeamName(m.question);
        chips.push(`<span class="odds-chip"><span class="oc-match">🏆</span><span class="oc-name">${escapeHtml(name)}</span><span class="oc-prob">${fmtPct(safePrices(m)[0])}</span></span>`);
      }
    }

    // Today's match odds
    for (const events of matchRes) {
      const ev = events[0];
      if (!ev || !ev.markets) continue;
      const winMarkets = ev.markets.filter(m => !m.question.toLowerCase().includes('draw') && safePrices(m));
      const drawMarket = ev.markets.find(m => m.question.toLowerCase().includes('draw') && safePrices(m));
      if (winMarkets.length < 2) continue;
      const [p1, p2] = winMarkets.map(m => safePrices(m)[0]);
      const dp = drawMarket ? safePrices(drawMarket)[0] : null;
      const [n1, n2] = winMarkets.map(m => oddsTeamName(m.question));
      const probStr = `${fmtPct(p1)}${dp ? ` · D ${fmtPct(dp)}` : ''} · ${fmtPct(p2)}`;
      chips.push(`<span class="odds-chip"><span class="oc-match">${escapeHtml(n1)} vs ${escapeHtml(n2)}</span><span class="oc-prob">${escapeHtml(probStr)}</span></span>`);
    }

    if (!chips.length) return;
    document.getElementById('oddsTrack').innerHTML = chips.join('');
  } catch (e) {
    console.warn('Polymarket chips failed to load:', e);
  }
}
```

- [ ] **Step 2: Verify visually**

Open `index.html` in a browser and wait a few seconds for `loadOdds()` to fire (it's called after `loadData()` resolves in `main.js`). The Polymarket row should show static chips like:

```
🏆 FRANCE 62%   🏆 BRAZIL 18%   🏆 ENG 12%   🏆 ARG 8%
```

And if there are matches today with Polymarket markets:

```
ENG vs USA  45% · D 28% · 27%
```

No horizontal scrolling. Hovering the row should do nothing special.

- [ ] **Step 3: Commit**

```bash
git add js/odds.js
git commit -m "Rewrite loadOdds() to render static chips"
```

---

### Task 3: JS — rewrite `loadStatsTracker()`, remove rotation

**Files:**
- Modify: `js/odds.js`

**Interfaces:**
- Consumes: `.stats-chip`, `.sc-flag`, `.sc-rank`, `.sc-name`, `.sc-stat` from Task 1
- Consumes globals: `matchData`, `teamIso`, `flagUrl`, `escapeHtml`
- Consumes: `FOOTBALL_DATA_TOKEN` (optional global, may be undefined)
- Produces: populates `#statsTrack` with chip HTML; updates `.stats-label .sl-brand` text

- [ ] **Step 1: Remove rotation globals and `showStatsCategory`**

At the top of the stats section in `js/odds.js` (around line 125), find and delete these three lines:

```javascript
let _statsCategories = [];
let _statsCatIndex = 0;
let _statsGeneration = 0;
```

Then find and delete the entire `showStatsCategory(index, gen)` function (lines ~129–163 in the original file). It starts with `function showStatsCategory(index, gen) {` and ends with its closing `}`.

- [ ] **Step 2: Replace `loadStatsTracker()` entirely**

Find the full `loadStatsTracker()` function and replace it with:

```javascript
async function loadStatsTracker() {
  const track = document.getElementById('statsTrack');
  const brandEl = document.querySelector('.stats-label .sl-brand');
  if (!track) return;

  const played = matchData.filter(m => m.isComplete);
  let chips = [];
  let categoryLabel = '';

  if (typeof FOOTBALL_DATA_TOKEN === 'string' && FOOTBALL_DATA_TOKEN) {
    try {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/scorers?limit=10', {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
      });
      if (res.ok) {
        const data = await res.json();
        const topScorers = (data.scorers || []).filter(s => s.goals > 0).slice(0, 5);
        if (topScorers.length) {
          categoryLabel = 'GOLDEN BOOT';
          chips = topScorers.map((s, i) =>
            `<span class="stats-chip"><span class="sc-rank">${i + 1}</span><span class="sc-name">${escapeHtml(s.player.name.toUpperCase())}</span><span class="sc-stat">${s.goals}G</span></span>`
          );
        }
      }
    } catch (e) {
      console.warn('Stats chips: API fetch failed', e);
    }
  }

  if (!chips.length && played.length) {
    const goalsFor = {};
    for (const m of played) {
      goalsFor[m.team1] = (goalsFor[m.team1] || 0) + m.score1;
      goalsFor[m.team2] = (goalsFor[m.team2] || 0) + m.score2;
    }
    categoryLabel = 'MOST GOALS';
    chips = Object.entries(goalsFor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([teamName, n], i) => {
        const iso = teamIso[teamName];
        const flag = iso ? `<img class="sc-flag" src="${flagUrl(iso)}" alt="">` : '';
        return `<span class="stats-chip">${flag}<span class="sc-rank">${i + 1}</span><span class="sc-name">${escapeHtml(teamName.toUpperCase())}</span><span class="sc-stat">${n}G</span></span>`;
      });
  }

  if (!chips.length) {
    track.innerHTML = '<span class="stats-loading">NO MATCH DATA YET</span>';
    return;
  }

  if (brandEl) brandEl.textContent = categoryLabel;
  track.innerHTML = chips.join('');
}
```

- [ ] **Step 3: Verify visually**

Open `index.html` in a browser. The stats row should show static chips for the best available category. If matches have been played:

- With API token + scorer data: chips show `1 MBAPPÉ 3G`, `2 RONALDO 2G`, etc., label reads `GOLDEN BOOT`
- Without scorer data: chips show flag + `1 FRANCE 8G`, `2 BRAZIL 6G`, etc., label reads `MOST GOALS`
- With no played matches: row shows `NO MATCH DATA YET`

No rotation, no fade transition, no auto-advance.

- [ ] **Step 4: Commit**

```bash
git add js/odds.js
git commit -m "Rewrite loadStatsTracker() as static chips, remove rotation"
```
