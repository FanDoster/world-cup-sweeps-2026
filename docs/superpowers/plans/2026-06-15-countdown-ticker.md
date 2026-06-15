# Countdown Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third scrolling ticker row showing countdowns to the next 4 upcoming/live games, with team flags flanking each matchup.

**Architecture:** A new `.kickoff-outer` row is added inside `.tickers-rows` in `index.html`, following the identical DOM/CSS pattern as the existing Polymarket ticker. A `buildCountdownTicker()` function in `js/odds.js` reads from the existing `matchData` global, builds the item HTML, and doubles it for seamless CSS scroll. `main.js` calls it after `loadData()` and refreshes it every 30 seconds.

**Tech Stack:** Vanilla JS (global scope, no modules), plain CSS, `flagcdn.com` SVG flags, existing `getCountdown()` and `toDate()` from `js/utils.js`, existing `matchData`, `teamIso`, `flagUrl` globals.

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add `.kickoff-*` CSS block; add kickoff HTML row inside `.tickers-rows`; add mobile hide rule |
| `js/odds.js` | Add `buildCountdownTicker()` function |
| `js/main.js` | Call `buildCountdownTicker()` after `loadData()`; add 30s `setInterval` |

---

## Task 1: Add CSS for the kickoff ticker

**Files:**
- Modify: `index.html` (after the `.odds-loading` rule, around line 960; and in the mobile block around line 1111)

- [ ] **Step 1: Add the kickoff CSS block**

In `index.html`, find the comment `/* Broadcast clock */` (around line 962). Insert the following block immediately **before** it:

```css
    /* Kickoff countdown ticker */
    .kickoff-outer {
      display: flex;
      align-items: stretch;
      background: rgba(0,0,0,0.25);
    }
    .kickoff-label {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5px 12px;
      background: #000;
      gap: 1px;
      border-right: 1px solid rgba(255,255,255,0.12);
    }
    .kickoff-label .kl-top {
      font-size: 0.5rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
    }
    .kickoff-label .kl-brand {
      font-size: 0.7rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #fff;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .kickoff-wrap {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
      -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
      mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
    }
    .kickoff-track {
      display: flex;
      align-items: center;
      width: max-content;
      white-space: nowrap;
    }
    .kickoff-track.scrolling { animation: kickoff-scroll 60s linear infinite; }
    @keyframes kickoff-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .kickoff-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 28px;
      font-size: 0.9rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.75);
    }
    .ki-flag { height: 18px; width: auto; }
    .ki-team { color: #fff; font-weight: 700; }
    .ki-vs   { color: rgba(255,255,255,0.4); font-size: 0.75rem; }
    .ki-sep  { color: rgba(255,255,255,0.3); }
    .ki-cd   { color: #f90; font-weight: 700; }
    .ki-live { color: #4ade80; font-weight: 700; }
    .kickoff-divider { color: rgba(255,255,255,0.2); font-size: 1rem; padding: 0 2px; }
    .kickoff-loading { font-size: 0.7rem; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; padding: 0 20px; }

```

- [ ] **Step 2: Add the mobile hide rule**

In `index.html`, find the existing mobile media block. It already has `.ticker-clock { display: none; }`. Add the kickoff row hide immediately after it:

```css
      .kickoff-outer { display: none; }
```

- [ ] **Step 3: Verify CSS parses (open in browser, no console errors)**

Open `index.html` in a browser. Open DevTools console. There should be no CSS parse errors. The ticker block should look the same as before — the new row doesn't appear yet because the HTML hasn't been added.

---

## Task 2: Add the kickoff ticker HTML row

**Files:**
- Modify: `index.html` (inside `.tickers-rows`, after the Polymarket `</div>` and before `</div><!-- /.tickers-rows -->`)

- [ ] **Step 1: Add the HTML row**

In `index.html`, find the comment `</div><!-- /.tickers-rows -->` (around line 1552). Insert the following immediately **before** it (after the closing `</div>` of `.odds-outer`):

```html
        <!-- Kickoff countdown ticker -->
        <div class="kickoff-outer">
          <div class="kickoff-label">
            <span class="kl-top">KICK OFF</span>
            <span class="kl-brand">UPCOMING</span>
          </div>
          <div class="kickoff-wrap">
            <div class="kickoff-track" id="kickoffTrack">
              <span class="kickoff-loading">LOADING…</span>
            </div>
          </div>
        </div>
```

- [ ] **Step 2: Verify the row renders**

Reload `index.html` in the browser. You should see a third ticker row below the Polymarket row, with a black label panel showing "KICK OFF / UPCOMING" and "LOADING…" in the track area. The broadcast clock on the right should now span all three rows.

---

## Task 3: Add `buildCountdownTicker()` to `js/odds.js`

**Files:**
- Modify: `js/odds.js` (append to end of file)

- [ ] **Step 1: Append the function**

Add the following to the bottom of `js/odds.js`:

```javascript
// ── KICKOFF COUNTDOWN TICKER ──
function buildCountdownTicker() {
  const track = document.getElementById('kickoffTrack');
  if (!track) return;

  const now = new Date();
  const upcoming = matchData
    .filter(m => {
      if (m.score1 !== null && m.score2 !== null) return false;
      const end = new Date(toDate(m.date, m.time, m.tz).getTime() + 2 * 60 * 60 * 1000);
      return end > now;
    })
    .sort((a, b) => toDate(a.date, a.time, a.tz) - toDate(b.date, b.time, b.tz))
    .slice(0, 4);

  if (!upcoming.length) {
    track.innerHTML = '<span class="kickoff-loading">NO UPCOMING MATCHES</span>';
    track.classList.remove('scrolling');
    return;
  }

  const buildItem = m => {
    const iso1 = teamIso[m.team1] || '';
    const iso2 = teamIso[m.team2] || '';
    const cd = getCountdown(m.date, m.time, m.tz);
    const cdClass = cd.cls === 'live-now' ? 'ki-cd ki-live' : 'ki-cd';
    return `<span class="kickoff-item">` +
      `<img class="ki-flag" src="${flagUrl(iso1)}" alt="">` +
      `<span class="ki-team">${escapeHtml(m.team1.toUpperCase())}</span>` +
      `<span class="ki-vs">vs</span>` +
      `<span class="ki-team">${escapeHtml(m.team2.toUpperCase())}</span>` +
      `<img class="ki-flag" src="${flagUrl(iso2)}" alt="">` +
      `<span class="ki-sep">·</span>` +
      `<span class="${cdClass}">${cd.text.toUpperCase()}</span>` +
      `</span><span class="kickoff-divider">|</span>`;
  };

  const html = upcoming.map(buildItem).join('');
  track.innerHTML = html + html;
  track.classList.add('scrolling');
}
```

**Note on globals used:** `matchData`, `teamIso`, `toDate`, `flagUrl`, `escapeHtml`, `getCountdown` — all defined by earlier scripts in the load order. `buildCountdownTicker` is called from `main.js` after `loadData()` resolves.

- [ ] **Step 2: Verify the function is reachable (no syntax errors)**

Reload `index.html` in the browser. Open DevTools console and type `typeof buildCountdownTicker`. It should return `"function"`. If it returns `"undefined"` there's a syntax error in the file — check the console for the parse error.

---

## Task 4: Wire up in `main.js`

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Call `buildCountdownTicker()` after `loadData()` and add interval**

In `js/main.js`, the current init line is:

```javascript
restoreSession().then(() => loadData().then(loadOdds));
setInterval(renderMatches, 60000);
setInterval(loadData, 180000);
setInterval(loadOdds, 600000);
```

Replace it with:

```javascript
restoreSession().then(() => loadData().then(() => { loadOdds(); buildCountdownTicker(); }));
setInterval(renderMatches, 60000);
setInterval(loadData, 180000);
setInterval(loadOdds, 600000);
setInterval(buildCountdownTicker, 30000);
```

- [ ] **Step 2: Verify the ticker populates**

Reload `index.html` in the browser. The third ticker row should now show up to 4 upcoming matches scrolling across, each in the format:

```
[flag] TEAM1  vs  TEAM2 [flag]  ·  in Xh Ym
```

Upcoming games show the countdown in orange. If a game is currently live, the countdown text shows `LIVE` in green.

- [ ] **Step 3: Verify the scroll animation**

Watch the ticker for a few seconds. The items should scroll from right to left continuously and loop seamlessly (no jump/reset visible). If scrolling doesn't start, check the browser console for JS errors.

- [ ] **Step 4: Verify empty state**

Temporarily change `.slice(0, 4)` to `.slice(0, 0)` in `buildCountdownTicker`, reload — the track should show `NO UPCOMING MATCHES` without scrolling. Revert the change after verifying.

- [ ] **Step 5: Verify mobile hide**

Resize the browser to ≤700px width. The kickoff ticker row should disappear entirely while the sponsors and Polymarket tickers remain visible (with reduced font sizes as per existing mobile rules).

---

## Task 5: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
git add index.html js/odds.js js/main.js
git commit -m "feat: add kickoff countdown ticker as third ticker row"
```

Expected output: `[main <hash>] feat: add kickoff countdown ticker as third ticker row`

- [ ] **Step 2: Verify clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`
