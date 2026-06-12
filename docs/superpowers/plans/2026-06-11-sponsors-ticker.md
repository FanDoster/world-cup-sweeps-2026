# Sponsors Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dual-row broadcast-style ticker between the header and tab bar in `index.html` — row 1: scrolling fake sponsors with logos, row 2: live Polymarket World Cup odds — with a Sky Sports–style clock spanning both rows on the right.

**Architecture:** All HTML/CSS/JS is inserted directly into the single `index.html` file following the existing pattern. Logo images live in a `sponsors/` directory already created and populated. The Polymarket ticker fetches live data from the public Gamma API (`https://gamma-api.polymarket.com`) on page load with no authentication.

**Tech Stack:** Vanilla HTML/CSS/JS. CSS `@keyframes` infinite scroll. Google Fonts (Share Tech Mono). Polymarket Gamma API (public REST, no auth).

---

### Task 1: Protect preview file from public deployment

**Files:**
- Modify: `.surgeignore`

- [ ] **Step 1: Add preview.html to .surgeignore**

Open `.surgeignore` and append one line:

```
sponsors/preview.html
```

The file should now read:
```
*.md
*.sql
*.sh
.claude/
.github/
.gitignore
supabase/
sponsors/preview.html
```

- [ ] **Step 2: Verify sponsors/ images are NOT ignored**

Run:
```bash
cat .surgeignore
```
Confirm `sponsors/` (the directory itself) is not listed — only `sponsors/preview.html`. The logo images must be publicly deployed.

- [ ] **Step 3: Commit**

```bash
git add .surgeignore
git commit -m "chore: exclude sponsors/preview.html from surge deployment"
```

---

### Task 2: Add Google Fonts link to index.html head

**Files:**
- Modify: `index.html:7` (after the favicon `<link>`)

- [ ] **Step 1: Insert the font link**

Find this line in `index.html` (line ~7):
```html
  <link rel="icon" href="data:image/svg+xml,...">
```

Insert immediately after it:
```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verify in browser**

Open `index.html` locally. Open DevTools → Network → filter by "fonts.googleapis" — confirm the font loads. The clock won't exist yet but the font request should appear.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: add Share Tech Mono font for broadcast clock"
```

---

### Task 3: Add ticker CSS to the style block

**Files:**
- Modify: `index.html` — inside the `<style>` block, after line ~785 (after the `footer a:hover` rule, before the `@media (max-width: 700px)` block at line ~788)

- [ ] **Step 1: Insert the ticker CSS**

Find this exact block in `index.html`:
```css
    footer a:hover { color: var(--accent); }

    /* ── RESPONSIVE ── */
```

Insert between them:
```css
    /* ── TICKERS ── */
    .tickers-container {
      display: flex;
      align-items: stretch;
      border-top: 1px solid rgba(255,255,255,0.08);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .tickers-rows {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .tickers-rows .ticker-outer { border-bottom: 1px solid rgba(255,255,255,0.06); }

    .ticker-outer {
      display: flex;
      align-items: stretch;
      background: rgba(0,0,0,0.2);
    }
    .ticker-label {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 12px;
      background: #000;
      gap: 3px;
      border-right: 1px solid rgba(255,255,255,0.12);
    }
    .ticker-label img { height: 36px; width: auto; display: block; }
    .ticker-label .tl-partners {
      font-size: 0.42rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.6);
      white-space: nowrap;
    }
    .ticker-wrap {
      flex: 1;
      overflow: hidden;
      padding: 14px 0;
      -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
      mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
    }
    .ticker-track {
      display: flex;
      align-items: center;
      width: max-content;
      animation: ticker-scroll 30s linear infinite;
    }
    @keyframes ticker-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
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
      height: 32px;
      width: auto;
      max-width: 100px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .sponsor img.invert { filter: brightness(0) invert(1) opacity(0.75); }
    .sponsor img.gs     { filter: brightness(100%) grayscale(1) opacity(0.75); }
    .sponsor-tag {
      font-size: 0.95rem;
      color: rgba(255,255,255,0.55);
      letter-spacing: 0.06em;
      white-space: nowrap;
      text-transform: uppercase;
    }
    .ticker-divider {
      color: rgba(255,255,255,0.15);
      font-size: 1rem;
      padding: 0 4px;
      flex-shrink: 0;
      align-self: center;
    }

    /* Polymarket odds ticker */
    .odds-outer {
      display: flex;
      align-items: stretch;
      background: rgba(0,0,0,0.35);
    }
    .odds-label {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5px 12px;
      background: #2E5CFF;
      gap: 1px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }
    .odds-label .ol-top {
      font-size: 0.5rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
    }
    .odds-label .ol-brand {
      font-size: 0.7rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #fff;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .odds-label .ol-sub {
      font-size: 0.38rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      white-space: nowrap;
    }
    .odds-wrap {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
      -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
      mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
    }
    .odds-track {
      display: flex;
      align-items: center;
      width: max-content;
      white-space: nowrap;
    }
    .odds-track.scrolling { animation: odds-scroll 75s linear infinite; }
    @keyframes odds-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .odds-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 28px;
      font-size: 0.9rem;
      letter-spacing: 0.04em;
      color: rgba(255,255,255,0.75);
      text-transform: uppercase;
    }
    .odds-item .oi-match { color: #fff; font-weight: 700; }
    .odds-item .oi-prob  { color: #f90; font-weight: 700; }
    .odds-item .oi-vol   { color: rgba(255,255,255,0.75); font-size: 0.8rem; }
    .odds-divider { color: #2E5CFF; font-size: 1rem; opacity: 0.6; padding: 0 2px; }
    .odds-loading { font-size: 0.7rem; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; padding: 0 20px; }

    /* Broadcast clock */
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
      box-shadow: inset 4px 0 0 #2E5CFF;
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
      color: #2E5CFF;
      text-transform: uppercase;
    }
```

- [ ] **Step 2: Spot-check the style block**

Run:
```bash
grep -c "ticker-clock\|tickers-container\|odds-outer" index.html
```
Expected: `3` (one occurrence of each).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add ticker CSS (sponsors + polymarket + clock)"
```

---

### Task 4: Add ticker HTML between header and tab bar

**Files:**
- Modify: `index.html:1268–1270`

- [ ] **Step 1: Insert the ticker HTML**

Find this exact block in `index.html` (around line 1268):
```html
    </header>

    <div class="tab-bar" id="tabBar">
```

Replace with:
```html
    </header>

    <div class="tickers-container">
      <div class="tickers-rows">

        <!-- Sponsors ticker -->
        <div class="ticker-outer">
          <div class="ticker-label">
            <img src="sponsors/wc2026-badge.jpg" alt="FIFA World Cup 2026">
            <span class="tl-partners">Official Partners®</span>
          </div>
          <div class="ticker-wrap">
            <div class="ticker-track">
              <!-- set 1 -->
              <div class="sponsor"><img src="sponsors/greggs.png" class="invert" alt="Greggs"><span class="sponsor-tag">Official Sausage Roll Provider of the FIFA World Cup 2026</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/lynx.png" class="invert" alt="Lynx Africa"><span class="sponsor-tag">Official scent of the away end</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/strongbow.png" class="invert" alt="Strongbow Dark Fruits"><span class="sponsor-tag">As drunk by Chris Lee</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/lambrini.png" class="invert" alt="Lambrini"><span class="sponsor-tag">Official drink of the park bench</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/white-lightning.png" class="gs" alt="White Lightning"><span class="sponsor-tag">3 litres. £3.49</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/wonga.png" class="gs" alt="Wonga"><span class="sponsor-tag">They shut us down. Now you have Polymarket</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/sports-direct.png" class="gs" alt="Sports Direct"><span class="sponsor-tag">Changing rooms are at the back</span></div>
              <div class="ticker-divider">·</div>
              <!-- set 2 — duplicate for seamless loop -->
              <div class="sponsor"><img src="sponsors/greggs.png" class="invert" alt="Greggs"><span class="sponsor-tag">Official Sausage Roll Provider of the FIFA World Cup 2026</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/lynx.png" class="invert" alt="Lynx Africa"><span class="sponsor-tag">Official scent of the away end</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/strongbow.png" class="invert" alt="Strongbow Dark Fruits"><span class="sponsor-tag">As drunk by Chris Lee</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/lambrini.png" class="invert" alt="Lambrini"><span class="sponsor-tag">Official drink of the park bench</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/white-lightning.png" class="gs" alt="White Lightning"><span class="sponsor-tag">3 litres. £3.49</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/wonga.png" class="gs" alt="Wonga"><span class="sponsor-tag">They shut us down. Now you have Polymarket</span></div>
              <div class="ticker-divider">·</div>
              <div class="sponsor"><img src="sponsors/sports-direct.png" class="gs" alt="Sports Direct"><span class="sponsor-tag">Changing rooms are at the back</span></div>
              <div class="ticker-divider">·</div>
            </div>
          </div>
        </div>

        <!-- Polymarket odds ticker -->
        <div class="odds-outer">
          <div class="odds-label">
            <span class="ol-top">LIVE ODDS</span>
            <span class="ol-brand">POLYMARKET</span>
            <span class="ol-sub">PREDICTION MARKET</span>
          </div>
          <div class="odds-wrap">
            <div class="odds-track" id="oddsTrack">
              <span class="odds-loading">LOADING LIVE MARKETS…</span>
            </div>
          </div>
        </div>

      </div><!-- /.tickers-rows -->

      <!-- Clock spans both rows -->
      <div class="ticker-clock">
        <span class="tc-time" id="tcTime">00:00:00</span>
        <span class="tc-date" id="tcDate"></span>
        <span class="tc-tz">BST</span>
      </div>
    </div><!-- /.tickers-container -->

    <div class="tab-bar" id="tabBar">
```

- [ ] **Step 2: Open index.html in browser and verify**

Open `index.html` locally. Check:
- Both ticker rows are visible between the header and the tab bar
- All 7 sponsor logos load and are greyscale/inverted
- Sponsors strip is animating
- Clock shows the current time and updates every second
- Polymarket ticker shows "LOADING LIVE MARKETS…" (JS not added yet)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add ticker HTML (sponsors + polymarket + clock)"
```

---

### Task 5: Add clock and Polymarket JS to the script block

**Files:**
- Modify: `index.html` — inside the existing `<script>` block (append before the closing `</script>`)

- [ ] **Step 1: Find the end of the script block**

Run:
```bash
grep -n "^  </script>" index.html | tail -1
```
Note the line number — insert the new JS just before that line.

- [ ] **Step 2: Insert the JS**

Find the closing `</script>` tag of the main script block and insert this immediately before it:

```javascript
    // ── BROADCAST CLOCK ──
    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      document.getElementById('tcTime').textContent = `${h}:${m}:${s}`;
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      document.getElementById('tcDate').textContent =
        `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ── POLYMARKET ODDS TICKER ──
    const POLYMARKET_SLUGS = [
      'fifwc-can-bih-2026-06-12',
      'fifwc-usa-par-2026-06-12',
      'fifwc-qat-che-2026-06-13',
      'fifwc-bra-mar-2026-06-13',
      'fifwc-hai-sco-2026-06-13',
      'fifwc-ger-kor-2026-06-14',
      'fifwc-nld-jpn-2026-06-14',
      'fifwc-esp-cvi-2026-06-15',
      'fifwc-fra-sen-2026-06-16',
    ];

    function fmtVol(v) {
      if (v >= 1e9) return `$${(v/1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v/1e6).toFixed(2)}M`;
      if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    }

    function fmtPct(p) { return `${Math.round(p * 100)}%`; }

    function safePrices(m) {
      try { return m.outcomePrices ? JSON.parse(m.outcomePrices) : null; } catch { return null; }
    }

    function oddsTeamName(question) {
      return question.replace(/will /i,'').replace(/ win.*/i,'').replace(/ vs\..*/i,'').trim().toUpperCase();
    }

    async function loadOdds() {
      try {
        const [matchRes, winnerRes] = await Promise.all([
          Promise.all(POLYMARKET_SLUGS.map(slug =>
            fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`).then(r => r.json())
          )),
          fetch('https://gamma-api.polymarket.com/events?slug=world-cup-winner').then(r => r.json())
        ]);

        const items = [];

        const wc = winnerRes[0];
        if (wc) {
          const topMarkets = (wc.markets || [])
            .filter(m => { const p = safePrices(m); return p && p[0] > 0.05; })
            .sort((a,b) => safePrices(b)[0] - safePrices(a)[0])
            .slice(0,4);
          const oddsStr = topMarkets.map(m => `${oddsTeamName(m.question)} ${fmtPct(safePrices(m)[0])}`).join(' · ');
          items.push({ type:'winner', oddsStr, vol: wc.volume || 0 });
        }

        for (const events of matchRes) {
          const ev = events[0];
          if (!ev || !ev.markets) continue;
          const winMarkets = ev.markets.filter(m => !m.question.toLowerCase().includes('draw') && safePrices(m));
          const drawMarket = ev.markets.find(m => m.question.toLowerCase().includes('draw') && safePrices(m));
          if (winMarkets.length < 2) continue;
          const [p1, p2] = winMarkets.map(m => safePrices(m)[0]);
          const dp = drawMarket ? safePrices(drawMarket)[0] : null;
          const [n1, n2] = winMarkets.map(m => oddsTeamName(m.question));
          const line = `${n1} ${fmtPct(p1)} · ${dp ? `DRAW ${fmtPct(dp)} · ` : ''}${n2} ${fmtPct(p2)}`;
          items.push({ type:'match', match: `${n1} vs ${n2}`, line, vol: parseFloat(ev.volume || 0) });
        }

        if (!items.length) return;

        const buildItems = () => items.map(item => {
          if (item.type === 'winner') {
            return `<span class="odds-item"><span class="oi-match">🏆 WORLD CUP WINNER</span><span>—</span><span class="oi-prob">${item.oddsStr}</span><span class="oi-vol">${fmtVol(item.vol)} WAGERED</span></span><span class="odds-divider">|</span>`;
          }
          return `<span class="odds-item"><span class="oi-match">${item.match}</span><span>·</span><span class="oi-prob">${item.line}</span><span class="oi-vol">${fmtVol(item.vol)} WAGERED</span></span><span class="odds-divider">|</span>`;
        }).join('');

        const track = document.getElementById('oddsTrack');
        track.innerHTML = buildItems() + buildItems();
        track.classList.add('scrolling');
      } catch (e) {
        console.warn('Polymarket ticker failed to load:', e);
      }
    }

    loadOdds();
```

- [ ] **Step 3: Open index.html in browser and verify**

Open `index.html` locally. Check:
- Clock ticks every second
- After a moment, Polymarket ticker populates with live match odds and world cup winner market
- Both tickers scroll smoothly
- Clock spans both rows on the right

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add broadcast clock and live Polymarket odds ticker"
```

---

### Task 6: Add mobile CSS for the tickers

**Files:**
- Modify: `index.html` — inside the first `@media (max-width: 700px)` block (around line 788)

- [ ] **Step 1: Find the first mobile media block**

Run:
```bash
grep -n "@media (max-width: 700px)" index.html | head -1
```
Note the line number. Find the closing `}` of that block.

- [ ] **Step 2: Append mobile ticker rules inside that block**

Inside the first `@media (max-width: 700px) { ... }` block, append:

```css
      /* Tickers on mobile */
      .sponsor-tag { font-size: 0.75rem; }
      .odds-item { font-size: 0.72rem; }
      .odds-item .oi-vol { font-size: 0.65rem; }
      .ticker-clock { min-width: 70px; padding: 4px 10px; }
      .ticker-clock .tc-time { font-size: 0.85rem; }
      .ticker-clock .tc-date { display: none; }
      .ticker-label img { height: 28px; }
      .sponsor img { height: 24px; max-width: 72px; }
      .sponsor { padding: 0 20px; }
```

- [ ] **Step 3: Open index.html in a narrow browser window (≤700px) and verify**

Resize browser to 375px wide. Check:
- Both tickers are visible and scroll
- Clock is readable but compact, date hidden
- Logos are smaller but visible
- No horizontal overflow breaking the layout

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: mobile styles for sponsor and odds tickers"
```

---

### Task 7: Final check and deploy

- [ ] **Step 1: Open index.html and do a full walkthrough**

Check each tab still works: Players, Matches, Groups, Leaderboard, Teams, Battle Map. The tickers should have no impact on tab functionality.

- [ ] **Step 2: Sign in and check auth tabs**

Sign in to verify the My Teams and Predictions tabs still appear and work correctly.

- [ ] **Step 3: Check the Polymarket API isn't blocked by the browser**

Open DevTools → Console. Confirm no CORS errors from the `gamma-api.polymarket.com` fetch calls. (The Gamma API allows cross-origin requests.)

- [ ] **Step 4: Push to main to trigger Surge deploy**

```bash
git push origin main
```

- [ ] **Step 5: Verify on live site**

Open `https://world-cup-sweeps-2026.surge.sh` and confirm:
- Both tickers render
- Logo images load (confirms `sponsors/` is deployed)
- Polymarket ticker populates with live data
- Clock ticks
