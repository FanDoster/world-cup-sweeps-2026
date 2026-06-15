# Tournament Stats Ticker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth ticker row that scrolls live tournament stats (Golden Boot, Top Assists, Clean Sheets, Most Goals, Biggest Wins, total goals) between the Polymarket and Kickoff tickers.

**Architecture:** No build step — all changes are plain HTML/CSS in `index.html` and plain JS in `js/odds.js`, `js/config.js`, and `js/main.js`. Stats are computed from the existing `matchData` global; Golden Boot and Top Assists are fetched from the football-data.org free API if `FOOTBALL_DATA_TOKEN` is configured in `js/config.js`. Content is duplicated in the DOM for a seamless CSS loop, matching the existing ticker pattern exactly.

**Tech Stack:** Vanilla JS, CSS animation, football-data.org REST API (optional, free tier, CORS-friendly).

---

### Task 1: Add API token to config and HTML shell

**Files:**
- Modify: `js/config.js` (add token constant after line 2)
- Modify: `index.html` (insert HTML between lines 1622 and 1624)

- [ ] **Step 1: Add `FOOTBALL_DATA_TOKEN` to `js/config.js`**

Insert after the `SB_KEY` line (line 2):

```js
const FOOTBALL_DATA_TOKEN = ''; // Register free at football-data.org and paste token here
```

- [ ] **Step 2: Insert the stats ticker HTML block in `index.html`**

Insert between line 1622 (`</div>` closing `.odds-outer`) and line 1624 (`<!-- Kickoff countdown ticker -->`):

```html
        <!-- Tournament stats ticker -->
        <div class="stats-outer">
          <div class="stats-label">
            <span class="sl-top">LIVE</span>
            <span class="sl-brand">STATS</span>
            <span class="sl-sub">2026</span>
          </div>
          <div class="stats-wrap">
            <div class="stats-track" id="statsTrack">
              <span class="stats-loading">LOADING…</span>
            </div>
          </div>
        </div>

```

- [ ] **Step 3: Open `index.html` in a browser and confirm a new unstyled row appears between Polymarket and Kickoff tickers**

Expected: A third ticker row with raw "LOADING…" text is visible. Layout is not broken.

- [ ] **Step 4: Commit**

```bash
git add js/config.js index.html
git commit -m "feat: add tournament stats ticker HTML shell and config token"
```

---

### Task 2: Add CSS for the stats ticker

**Files:**
- Modify: `index.html` (insert CSS block after line 1030, before `/* Broadcast clock */`)

- [ ] **Step 1: Insert the stats ticker CSS block in `index.html` after line 1030**

Insert after `.kickoff-loading { ... }` (line 1030) and before `/* Broadcast clock */` (line 1032):

```css
    /* Tournament stats ticker */
    .stats-outer {
      display: flex;
      align-items: stretch;
      background: rgba(0,0,0,0.3);
    }
    .stats-label {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5px 12px;
      background: #15803d;
      gap: 1px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }
    .stats-label .sl-top {
      font-size: 0.5rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
    }
    .stats-label .sl-brand {
      font-size: 0.7rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #fff;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .stats-label .sl-sub {
      font-size: 0.38rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      white-space: nowrap;
    }
    .stats-wrap {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
      -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
      mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
    }
    .stats-track {
      display: flex;
      align-items: center;
      width: max-content;
      white-space: nowrap;
    }
    .stats-track.scrolling { animation: stats-scroll 35s linear infinite; }
    @keyframes stats-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .st-section {
      padding: 0 20px 0 28px;
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.14em;
      color: #4ade80;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .st-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .st-item .si-name { color: #fff; font-weight: 700; }
    .st-item .si-stat { color: #f90; font-weight: 700; }
    .st-divider { color: rgba(255,255,255,0.2); font-size: 1rem; padding: 0 4px; }
    .stats-loading { font-size: 0.7rem; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; padding: 0 20px; }
```

- [ ] **Step 2: Refresh the browser and confirm the stats ticker row shows the green badge with "LIVE / STATS / 2026" and the faint "LOADING…" text**

Expected: The row is consistent in height and style with the Polymarket and Kickoff rows. Green left badge. Track area visible.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add tournament stats ticker CSS"
```

---

### Task 3: Implement `loadStatsTracker()` in `js/odds.js`

**Files:**
- Modify: `js/odds.js` (append after `buildCountdownTicker`)

- [ ] **Step 1: Append `loadStatsTracker()` to the end of `js/odds.js`**

```js
// ── TOURNAMENT STATS TICKER ──
async function loadStatsTracker() {
  const track = document.getElementById('statsTrack');
  if (!track) return;

  const played = matchData.filter(m => m.score1 !== null && m.score2 !== null);

  // Clean sheets (goals conceded = 0)
  const cleanSheets = {};
  for (const m of played) {
    if (m.score2 === 0) cleanSheets[m.team1] = (cleanSheets[m.team1] || 0) + 1;
    if (m.score1 === 0) cleanSheets[m.team2] = (cleanSheets[m.team2] || 0) + 1;
  }
  const topCleanSheets = Object.entries(cleanSheets)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Most goals scored
  const goalsFor = {};
  for (const m of played) {
    goalsFor[m.team1] = (goalsFor[m.team1] || 0) + m.score1;
    goalsFor[m.team2] = (goalsFor[m.team2] || 0) + m.score2;
  }
  const topGoals = Object.entries(goalsFor)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Biggest wins (show winner first)
  const biggestWins = played
    .map(m => {
      const diff = m.score1 - m.score2;
      if (diff > 0) return { label: `${m.team1.toUpperCase()} ${m.score1}–${m.score2} ${m.team2.toUpperCase()}`, diff };
      if (diff < 0) return { label: `${m.team2.toUpperCase()} ${m.score2}–${m.score1} ${m.team1.toUpperCase()}`, diff: -diff };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  // Tournament totals
  const totalGoals = played.reduce((s, m) => s + m.score1 + m.score2, 0);
  const avgGoals = played.length ? (totalGoals / played.length).toFixed(1) : '0.0';

  // Optional API: scorers from football-data.org
  let topScorers = [];
  let topAssisters = [];
  if (typeof FOOTBALL_DATA_TOKEN === 'string' && FOOTBALL_DATA_TOKEN) {
    try {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/scorers?limit=10', {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
      });
      if (res.ok) {
        const data = await res.json();
        const scorers = data.scorers || [];
        topScorers = scorers
          .filter(s => s.goals > 0)
          .slice(0, 5)
          .map(s => ({ name: s.player.name.toUpperCase(), stat: `${s.goals}G` }));
        topAssisters = scorers
          .filter(s => (s.assists || 0) > 0)
          .sort((a, b) => (b.assists || 0) - (a.assists || 0))
          .slice(0, 5)
          .map(s => ({ name: s.player.name.toUpperCase(), stat: `${s.assists}A` }));
      }
    } catch (e) {
      console.warn('Stats ticker: API fetch failed', e);
    }
  }

  // Build HTML
  const dot = () => '<span class="st-divider">\xB7</span>';
  const sec = label => `<span class="st-section">▌ ${label} ▌</span>`;
  const itm = (name, stat) =>
    `<span class="st-item"><span class="si-name">${escapeHtml(name)}</span>&nbsp;<span class="si-stat">${escapeHtml(stat)}</span></span>`;

  const parts = [];

  if (topScorers.length)
    parts.push(sec('GOLDEN BOOT') + topScorers.map(s => itm(s.name, s.stat)).join(dot()));

  if (topAssisters.length)
    parts.push(sec('TOP ASSISTS') + topAssisters.map(s => itm(s.name, s.stat)).join(dot()));

  if (topCleanSheets.length)
    parts.push(sec('CLEAN SHEETS') + topCleanSheets.map(([t, n]) => itm(t.toUpperCase(), `${n} CS`)).join(dot()));

  if (topGoals.length)
    parts.push(sec('MOST GOALS') + topGoals.map(([t, n]) => itm(t.toUpperCase(), `${n}G`)).join(dot()));

  if (biggestWins.length)
    parts.push(sec('BIGGEST WIN') + biggestWins.map(w =>
      `<span class="st-item"><span class="si-name">${escapeHtml(w.label)}</span></span>`
    ).join(dot()));

  if (played.length)
    parts.push(
      sec('TOURNAMENT') +
      itm(`${totalGoals} GOALS`, `IN ${played.length} GAMES`) +
      dot() +
      itm(avgGoals, 'PER GAME')
    );

  if (!parts.length) {
    track.innerHTML = '<span class="stats-loading">NO MATCH DATA YET</span>';
    track.classList.remove('scrolling');
    return;
  }

  const divider = '<span class="st-divider" style="padding:0 24px">|</span>';
  const content = parts.join(divider) + divider;
  track.innerHTML = content + content;
  track.classList.add('scrolling');
}
```

- [ ] **Step 2: Open browser dev tools console and call the function manually to verify it works before wiring up**

```js
loadStatsTracker()
```

Expected: Stats track updates and begins scrolling. Without a token, shows at minimum CLEAN SHEETS, MOST GOALS, BIGGEST WIN, and TOURNAMENT sections. No console errors.

- [ ] **Step 3: Commit**

```bash
git add js/odds.js
git commit -m "feat: implement loadStatsTracker with match-derived and optional API stats"
```

---

### Task 4: Wire up in `main.js` and verify end-to-end

**Files:**
- Modify: `js/main.js` (update init chain and add interval, lines 22–26)

- [ ] **Step 1: Update `js/main.js` lines 22–26**

Change:
```js
restoreSession().then(() => loadData().then(() => { loadOdds(); buildCountdownTicker(); }));
setInterval(renderMatches, 60000);
setInterval(loadData, 180000);
setInterval(loadOdds, 600000);
setInterval(buildCountdownTicker, 30000);
```

To:
```js
restoreSession().then(() => loadData().then(() => { loadOdds(); buildCountdownTicker(); loadStatsTracker(); }));
setInterval(renderMatches, 60000);
setInterval(loadData, 180000);
setInterval(loadOdds, 600000);
setInterval(buildCountdownTicker, 30000);
setInterval(loadStatsTracker, 300000);
```

- [ ] **Step 2: Hard-reload the browser (Cmd+Shift+R) and verify all four tickers render correctly**

Expected:
- Row 1: Sponsors ticker scrolling (unchanged)
- Row 2: Polymarket odds ticker scrolling (unchanged)
- Row 3: Green "LIVE / STATS / 2026" badge + scrolling category stats
- Row 4: Kickoff countdown scrolling (unchanged)
- No console errors
- Stats ticker content cycles through CLEAN SHEETS, MOST GOALS, BIGGEST WIN, TOURNAMENT (plus GOLDEN BOOT and TOP ASSISTS if `FOOTBALL_DATA_TOKEN` is set)

- [ ] **Step 3: Verify graceful degradation**

If `FOOTBALL_DATA_TOKEN` is `''` (the default), confirm the ticker scrolls through CLEAN SHEETS, MOST GOALS, BIGGEST WIN, and TOURNAMENT only — no GOLDEN BOOT or TOP ASSISTS sections, and no console errors. This was already validated in Task 3 Step 2; just confirm it still holds after wiring up.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: wire up loadStatsTracker on load and 5-minute refresh"
```
