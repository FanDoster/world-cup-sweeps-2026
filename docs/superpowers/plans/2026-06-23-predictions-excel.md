# Predictions Window — Excel XP Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Predictions XP window to look like Microsoft Excel XP — same visual chrome as the Leaderboard window (menu bar, two toolbars, formula bar, column/row headers, sheet tabs, status bar), with score inputs as editable spreadsheet cells and joker toggles as a dedicated column cell.

**Architecture:** Two tasks: (1) add scoped prediction CSS to `css/excel.css` (scoped under `#xp-window-predictions`) and replace the Predictions window content in `index.html` with the static Excel chrome shell; (2) rewrite `renderPredictions()` to generate Excel grid rows into `#xl-pred-target`, add `xlPredSelectCell(addr, formula)` to update the formula bar, and add `xlPredSwitchSheet(name)` for Upcoming/History tab switching.

**Tech Stack:** Plain HTML/CSS/JS, no build step. Global scope, `var` declarations. Supabase queries via `sb`. No test framework — verification is manual browser inspection.

## Global Constraints

- No build step, no ES modules. All JS in global scope, `var` declarations.
- CSS namespace: re-use `.xl-` prefix from `css/excel.css`. Prediction-specific overrides scoped under `#xp-window-predictions`.
- Do NOT change `submitPrediction`, `toggleJoker`, `stepScore`, `editPrediction`, `getLockCountdown`, `loadPredData`, or any Supabase query logic. The visual wrapper changes but the submission mechanisms stay the same.
- Score input elements MUST keep their existing IDs `ph-{matchId}` and `pa-{matchId}` — `submitPrediction(matchId)` reads them by those IDs.
- `xlPredSheet` is a module-level `var` defaulting to `'upcoming'`. `renderPredictions()` checks this var and renders the appropriate content into `#xl-pred-target`.
- The History sheet is read-only — no editable cells.
- The formula bar (`#xl-pred-namebox` / `#xl-pred-formulafield`) is cosmetic — updated on cell click to show a plausible address/formula.
- Do NOT modify `index.html` lines outside the Predictions window's `<div class="xp-window-content">...</div>` block (lines 482–487).
- The pred summary stats block (predicted/open/locked counts) moves to the Excel status bar, not a card at the top of the grid.

---

### Task 1: Excel Chrome — CSS and static HTML shell

**Files:**
- Modify: `css/excel.css`
- Modify: `index.html` (lines 482–487 only — the `.xp-window-content` block of the Predictions window)

**Interfaces:**
- Produces:
  - `#xl-pred-target` — empty `<div>` that Task 2 renders Excel rows into
  - `#xl-pred-namebox` — name box span Task 2 updates with cell address (e.g. `C5`)
  - `#xl-pred-formulafield` — formula field span Task 2 updates with formula string
  - `#xl-pred-tab-upcoming`, `#xl-pred-tab-history` — sheet tab elements Task 2 toggles `.xl-tab-active` on
  - `#xl-pred-status-left` — status bar left span Task 2 updates with match count
  - `#xl-pred-status-right` — status bar right span Task 2 updates with pred stats

- [ ] **Step 1: Add scoped Predictions Excel CSS to `css/excel.css`**

Append the following to the end of `css/excel.css`:

```css
/* ── PREDICTIONS WINDOW: Excel skin ── */
#xp-window-predictions .xp-window-content {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
#sectionPredictions {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* ── Score cell in edit mode ── */
.xl-score-input {
  width: 100%;
  height: 16px;
  border: none;
  outline: none;
  background: transparent;
  font-family: "Pixelated MS Sans Serif", Tahoma, Arial, sans-serif;
  font-size: 11px;
  text-align: center;
  padding: 0;
  color: #000080;
}
.xl-score-input::-webkit-inner-spin-button,
.xl-score-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.xl-score-input[type=number] { -moz-appearance: textfield; }

/* Score cells get blue outline when focused */
.xl-cell-score:focus-within {
  outline: 2px solid #316ac5;
  outline-offset: -2px;
  z-index: 1;
  position: relative;
}

/* Locked score cell */
.xl-cell-locked {
  color: #999;
  background: #f5f5f5 !important;
  cursor: default !important;
}

/* Joker cell states */
.xl-cell-joker-on {
  color: #b8860b;
  font-weight: bold;
  background: #fff8dc !important;
  cursor: pointer;
}
.xl-cell-joker-off {
  color: #ccc;
  cursor: pointer;
}
.xl-cell-joker-off:hover { color: #b8860b; }
.xl-cell-joker-unavail {
  color: #ddd;
  cursor: default !important;
}

/* Status cell colors */
.xl-status-saved { color: #22aa44; }
.xl-status-unsaved { color: #cc6600; }
.xl-status-locked { color: #cc2222; }
.xl-status-empty { color: #999; }

/* Date group separator row */
.xl-date-sep-row .xl-cell {
  background: #ece9d8 !important;
  font-style: italic;
  color: #555;
  font-weight: normal;
}

/* Header row */
.xl-row-pred-header .xl-cell {
  background: #dce6f1 !important;
  font-weight: bold;
}

/* Alternating row tint */
.xl-row-pred-even .xl-cell { background: #fafaf8 !important; }
.xl-row-pred-odd .xl-cell { background: #fff !important; }

/* Selected row */
.xl-row-pred-selected .xl-cell { background: #dce8ff !important; }
.xl-row-pred-selected:hover .xl-cell { background: #cde0ff !important; }

/* History badge cells */
.xl-badge-exact  { color: #22aa44; font-weight: bold; }
.xl-badge-scored { color: #316ac5; font-weight: bold; }
.xl-badge-zero   { color: #cc2222; }

/* Not signed in placeholder */
.xl-pred-signin {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #666;
  font-style: italic;
  font-size: 11px;
  padding: 40px;
}

/* Mobile: hide toolbars */
@media (max-width: 700px) {
  #xp-window-predictions .xl-toolbar { display: none; }
  #xp-window-predictions .xl-formula-bar { display: none; }
}
```

- [ ] **Step 2: Replace the Predictions window's `.xp-window-content` in `index.html`**

Find and replace the block from line 482 (`<div class="xp-window-content">`) through line 487 (`</div>`) — the content of the Predictions window. Replace with:

```html
    <div class="xp-window-content">
      <div class="section-predictions" id="sectionPredictions">
        <div class="xl-wrap">
          <!-- Menu bar -->
          <div class="xl-menubar">
            <div class="xl-menu-items">
              <span class="xl-menu-item">File</span>
              <span class="xl-menu-item">Edit</span>
              <span class="xl-menu-item">View</span>
              <span class="xl-menu-item">Insert</span>
              <span class="xl-menu-item">Format</span>
              <span class="xl-menu-item">Tools</span>
              <span class="xl-menu-item">Data</span>
              <span class="xl-menu-item">Window</span>
              <span class="xl-menu-item">Help</span>
            </div>
            <input class="xl-help-box" type="text" value="Type a question for help" readonly>
          </div>
          <!-- Standard toolbar -->
          <div class="xl-toolbar">
            <button class="xp-tb-btn xl-tb-btn" disabled title="New">&#128196;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Open">&#128193;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Save">&#128190;</button>
            <span class="xp-tb-sep"></span>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Print">&#128424;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Preview">&#128269;</button>
            <span class="xp-tb-sep"></span>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Cut">&#9986;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Copy">&#128203;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Paste">&#128196;</button>
            <span class="xp-tb-sep"></span>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Undo">&#8630;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled title="Redo">&#8631;</button>
            <span class="xp-tb-sep"></span>
            <span style="font-size:11px;padding:0 4px">&#931; AutoSum</span>
          </div>
          <!-- Formatting toolbar -->
          <div class="xl-toolbar">
            <select class="xl-font-select" disabled><option>Tahoma</option></select>
            <select class="xl-size-select" disabled><option>11</option></select>
            <button class="xp-tb-btn xl-tb-btn xl-fmt-btn" disabled>B</button>
            <button class="xp-tb-btn xl-tb-btn xl-fmt-btn xl-italic" disabled>I</button>
            <button class="xp-tb-btn xl-tb-btn xl-fmt-btn xl-underline" disabled>U</button>
            <span class="xp-tb-sep"></span>
            <button class="xp-tb-btn xl-tb-btn" disabled>&#9664;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled>&#9646;</button>
            <button class="xp-tb-btn xl-tb-btn" disabled>&#9654;</button>
            <span class="xp-tb-sep"></span>
            <button class="xp-tb-btn xl-tb-btn" disabled>%</button>
            <button class="xp-tb-btn xl-tb-btn" disabled>,</button>
          </div>
          <!-- Formula bar -->
          <div class="xl-formula-bar">
            <div class="xl-name-box">
              <span class="xl-name-val" id="xl-pred-namebox">A1</span>
              <span class="xl-name-arrow">&#9660;</span>
            </div>
            <span class="xl-formula-sep"></span>
            <button class="xp-tb-btn xl-tb-btn xl-fx-btn" disabled>fx</button>
            <div class="xl-formula-field" id="xl-pred-formulafield">=predictions!A1</div>
          </div>
          <!-- Column headers -->
          <div class="xl-col-headers">
            <div class="xl-row-gutter-header"></div>
            <div class="xl-col-header" style="width:90px">A</div>
            <div class="xl-col-header" style="flex:1;min-width:150px">B</div>
            <div class="xl-col-header" style="width:60px">C</div>
            <div class="xl-col-header" style="width:30px">D</div>
            <div class="xl-col-header" style="width:60px">E</div>
            <div class="xl-col-header" style="width:55px">F</div>
            <div class="xl-col-header" style="width:80px">G</div>
          </div>
          <!-- Data grid target -->
          <div class="xl-grid-wrap">
            <div id="xl-pred-target"></div>
          </div>
          <!-- Sheet tabs -->
          <div class="xl-sheet-tabs-wrap">
            <div class="xl-tab-nav">
              <button class="xl-tab-nav-btn">|&#9664;</button>
              <button class="xl-tab-nav-btn">&#9664;</button>
              <button class="xl-tab-nav-btn">&#9654;</button>
              <button class="xl-tab-nav-btn">&#9654;|</button>
            </div>
            <div class="xl-sheet-tabs">
              <div class="xl-tab xl-tab-active" id="xl-pred-tab-upcoming" onclick="xlPredSwitchSheet('upcoming')">Upcoming</div>
              <div class="xl-tab" id="xl-pred-tab-history" onclick="xlPredSwitchSheet('history')">History</div>
            </div>
          </div>
          <!-- Status bar -->
          <div class="xl-status-bar">
            <span id="xl-pred-status-left">Ready</span>
            <div class="xl-status-right">
              <span id="xl-pred-status-right"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 3: Verify static chrome renders**

Open `index.html`. Sign in with a valid account, then click the Predictions icon.
Expected: the Predictions window opens showing Excel chrome — menu bar (File…Help), Standard toolbar, Formatting toolbar, formula bar with "A1" in the name box, column headers (A B C D E F G), empty grid area, two sheet tabs (Upcoming active, History), status bar showing "Ready".

- [ ] **Step 4: Commit Task 1**

```bash
git add css/excel.css index.html
git commit -m "feat: add Excel XP chrome CSS and HTML shell to Predictions window"
```

---

### Task 2: Predictions Excel JS — renderPredictions rewrite

**Files:**
- Modify: `js/render-predictions.js`

**Interfaces:**
- Consumes (from Task 1):
  - `#xl-pred-target` — render target
  - `#xl-pred-namebox`, `#xl-pred-formulafield` — formula bar elements
  - `#xl-pred-tab-upcoming`, `#xl-pred-tab-history` — tab elements
  - `#xl-pred-status-left`, `#xl-pred-status-right` — status bar spans
- Consumes (existing globals): `matchData`, `toDate`, `formatDateLabel`, `formatLocalTime`, `getLockCountdown`, `calcPredPoints`, `predResultBadge`, `jokersEnabled`, `currentSession`, `sb`, `PLAYERS`
- Preserves (unchanged functions): `submitPrediction(matchId)`, `toggleJoker(matchId)`, `editPrediction(matchId)`, `stepScore(inputId, delta)`, `getLockCountdown(lockMs)`, `submitPredictionFromPanel`, `toggleJokerFromPanel`, `editPredictionFromPanel`, `playJokerVideo`, `closeJokerVideo`
- Produces:
  - `xlPredSheet` — module-level `var`, default `'upcoming'`
  - `xlPredSelectCell(addr, formula)` — updates formula bar; called from `onclick` on cells
  - `xlPredSwitchSheet(name)` — sets `xlPredSheet`, updates tab active state, calls `renderPredictions()`

- [ ] **Step 1: Add `xlPredSheet`, `xlPredSelectCell`, `xlPredSwitchSheet` before `renderPredictions()`**

Add these declarations at the very top of `js/render-predictions.js`, before the `async function renderPredictions()` line:

```js
var xlPredSheet = 'upcoming';

function xlPredSelectCell(addr, formula) {
  var nb = document.getElementById('xl-pred-namebox');
  var ff = document.getElementById('xl-pred-formulafield');
  if (nb) nb.textContent = addr;
  if (ff) ff.textContent = formula;
}

function xlPredSwitchSheet(name) {
  xlPredSheet = name;
  var tabUp = document.getElementById('xl-pred-tab-upcoming');
  var tabHist = document.getElementById('xl-pred-tab-history');
  if (tabUp) tabUp.classList.toggle('xl-tab-active', name === 'upcoming');
  if (tabHist) tabHist.classList.toggle('xl-tab-active', name === 'history');
  renderPredictions();
}
```

- [ ] **Step 2: Rewrite `renderPredictions()` to emit Excel grid rows**

Replace the entire `async function renderPredictions()` function (lines that start with `async function renderPredictions()` through the closing `}` before `async function submitPrediction`) with:

```js
async function renderPredictions() {
  var el = document.getElementById('xl-pred-target');
  if (!el) return;

  if (!currentSession) {
    el.innerHTML = '<div class="xl-pred-signin">Sign in to make predictions.</div>';
    var statusLeft = document.getElementById('xl-pred-status-left');
    if (statusLeft) statusLeft.textContent = 'Not signed in';
    return;
  }

  var now = new Date();
  var upcoming = matchData
    .filter(function(m) { return !m.isComplete; })
    .map(function(m) { return Object.assign({}, m, { kickoff: toDate(m.date, m.time, m.tz) }); })
    .sort(function(a, b) { return a.kickoff - b.kickoff; })
    .slice(0, 20);

  var { data: existing } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '')).eq('user_id', currentSession.user.id);
  var predMap = {};
  if (existing) existing.forEach(function(p) { predMap[p.match_id] = p; });

  var { data: allMatches } = await sb.from('matches').select('id,match_date,kickoff_time,home_team_id(name),away_team_id(name)').order('match_date').order('kickoff_time');
  if (!allMatches) { el.innerHTML = '<div class="xl-pred-signin">Unable to load match data.</div>'; return; }
  var matchIdMap = {};
  allMatches.forEach(function(m) {
    matchIdMap[m.home_team_id.name + '|' + m.away_team_id.name + '|' + m.match_date] = m.id;
  });

  // ── UPCOMING SHEET ──
  if (xlPredSheet === 'upcoming') {
    var predicted = 0, open = 0, locked = 0;
    upcoming.forEach(function(m) {
      var mid = matchIdMap[m.team1 + '|' + m.team2 + '|' + m.date];
      if (mid && predMap[mid]) predicted++;
      else if (m.kickoff - now < 5 * 60 * 1000) locked++;
      else open++;
    });

    // Update status bar
    var statusLeft = document.getElementById('xl-pred-status-left');
    if (statusLeft) statusLeft.textContent = upcoming.length + ' matches';
    var statusRight = document.getElementById('xl-pred-status-right');
    if (statusRight) statusRight.textContent = 'Predicted: ' + predicted + '  |  Open: ' + open + '  |  Locked: ' + locked;

    if (upcoming.length === 0) {
      el.innerHTML = '<div class="xl-pred-signin">No upcoming matches to predict.</div>';
      return;
    }

    // Group by date
    var byDate = {}, byDateOrder = [];
    upcoming.forEach(function(m) {
      if (!byDate[m.date]) { byDate[m.date] = []; byDateOrder.push(m.date); }
      byDate[m.date].push(m);
    });

    var html = '';
    // Header row (row 1)
    html += '<div class="xl-row xl-row-pred-header">' +
      '<div class="xl-row-num">1</div>' +
      '<div class="xl-cell" style="width:90px" onclick="xlPredSelectCell(\'A1\',\'=Date\')">Date</div>' +
      '<div class="xl-cell" style="flex:1;min-width:150px" onclick="xlPredSelectCell(\'B1\',\'=Match\')">Match</div>' +
      '<div class="xl-cell xl-num" style="width:60px" onclick="xlPredSelectCell(\'C1\',\'=Home\')">Home</div>' +
      '<div class="xl-cell xl-num" style="width:30px"></div>' +
      '<div class="xl-cell xl-num" style="width:60px" onclick="xlPredSelectCell(\'E1\',\'=Away\')">Away</div>' +
      '<div class="xl-cell xl-num" style="width:55px" onclick="xlPredSelectCell(\'F1\',\'=Joker\')">Joker</div>' +
      '<div class="xl-cell" style="width:80px" onclick="xlPredSelectCell(\'G1\',\'=Status\')">Status</div>' +
      '</div>';

    var rowNum = 2;
    // Count joker usage per day for current user
    var jokersByDate = {};
    upcoming.forEach(function(m) {
      var mid = matchIdMap[m.team1 + '|' + m.team2 + '|' + m.date];
      var ep = mid ? predMap[mid] : null;
      if (ep && ep.is_joker) jokersByDate[m.date] = mid;
    });

    for (var di = 0; di < byDateOrder.length; di++) {
      var date = byDateOrder[di];
      var dayMatches = byDate[date];
      var dayHasJoker = !!jokersByDate[date];

      // Date separator row
      html += '<div class="xl-row xl-date-sep-row">' +
        '<div class="xl-row-num">' + rowNum + '</div>' +
        '<div class="xl-cell" style="width:90px;font-style:italic;color:#555">' + formatDateLabel(dayMatches[0].date, dayMatches[0].time, dayMatches[0].tz) + '</div>' +
        '<div class="xl-cell" style="flex:1;min-width:150px;color:#555">' + dayMatches.length + ' match' + (dayMatches.length !== 1 ? 'es' : '') + (dayHasJoker ? ' — &#127923; Joker active' : '') + '</div>' +
        '<div class="xl-cell" style="width:60px"></div>' +
        '<div class="xl-cell" style="width:30px"></div>' +
        '<div class="xl-cell" style="width:60px"></div>' +
        '<div class="xl-cell" style="width:55px"></div>' +
        '<div class="xl-cell" style="width:80px"></div>' +
        '</div>';
      rowNum++;

      for (var mi = 0; mi < dayMatches.length; mi++) {
        var m = dayMatches[mi];
        var key = m.team1 + '|' + m.team2 + '|' + m.date;
        var mid = matchIdMap[key];
        if (!mid) { rowNum++; continue; }
        var ep = predMap[mid];
        var isLocked = m.kickoff - now < 5 * 60 * 1000;
        var lockMs = m.kickoff - 5 * 60 * 1000;
        var lockStr = getLockCountdown(lockMs);
        var rowCls = mi % 2 === 0 ? 'xl-row-pred-even' : 'xl-row-pred-odd';
        var rowAddr = 'C' + rowNum;

        // Home score cell
        var homeCellContent, awayCellContent;
        if (isLocked) {
          homeCellContent = '<div class="xl-cell xl-num xl-cell-locked" style="width:60px" onclick="xlPredSelectCell(\'' + rowAddr + '\',\'=IF(locked,\\\"—\\\",home_pred)\')">' + (ep ? ep.predicted_home_score : '—') + '</div>';
          awayCellContent = '<div class="xl-cell xl-num xl-cell-locked" style="width:60px" onclick="xlPredSelectCell(\'E' + rowNum + '\',\'=IF(locked,\\\"—\\\",away_pred)\')">' + (ep ? ep.predicted_away_score : '—') + '</div>';
        } else if (ep) {
          homeCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'' + rowAddr + '\',\'=IF(locked,\\\"—\\\",home_pred)\')">' +
            '<input class="xl-score-input" type="number" id="ph-' + mid + '" min="0" max="20" value="' + ep.predicted_home_score + '" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
          awayCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'E' + rowNum + '\',\'=IF(locked,\\\"—\\\",away_pred)\')">' +
            '<input class="xl-score-input" type="number" id="pa-' + mid + '" min="0" max="20" value="' + ep.predicted_away_score + '" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
        } else {
          homeCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'' + rowAddr + '\',\'=IF(locked,\\\"—\\\",home_pred)\')">' +
            '<input class="xl-score-input" type="number" id="ph-' + mid + '" min="0" max="20" value="0" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
          awayCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'E' + rowNum + '\',\'=IF(locked,\\\"—\\\",away_pred)\')">' +
            '<input class="xl-score-input" type="number" id="pa-' + mid + '" min="0" max="20" value="0" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
        }

        // Joker cell
        var jokerCell;
        if (!jokersEnabled || isLocked) {
          jokerCell = '<div class="xl-cell xl-num xl-cell-locked" style="width:55px" onclick="xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,\\\"\\\")\')">—</div>';
        } else if (ep && ep.is_joker) {
          jokerCell = '<div class="xl-cell xl-num xl-cell-joker-on" style="width:55px" onclick="toggleJoker(' + mid + ');xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,\\\"\\\")\')">&#127923; 2&#215;</div>';
        } else if (dayHasJoker) {
          jokerCell = '<div class="xl-cell xl-num xl-cell-joker-unavail" style="width:55px" onclick="xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,\\\"\\\")\')">·</div>';
        } else {
          jokerCell = '<div class="xl-cell xl-num xl-cell-joker-off" style="width:55px" onclick="toggleJoker(' + mid + ');xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,\\\"\\\")\')">&#127923;</div>';
        }

        // Status cell
        var statusCell;
        if (isLocked && ep) {
          statusCell = '<div class="xl-cell xl-status-locked" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">&#128274; Saved</div>';
        } else if (isLocked) {
          statusCell = '<div class="xl-cell xl-status-locked" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">&#128274; Locked</div>';
        } else if (ep) {
          statusCell = '<div class="xl-cell xl-status-saved" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">&#10003; Saved</div>';
        } else {
          statusCell = '<div class="xl-cell xl-status-empty" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">' + lockStr + '</div>';
        }

        // Match cell content
        var matchCell = '<div class="xl-cell" style="flex:1;min-width:150px" onclick="xlPredSelectCell(\'B' + rowNum + '\',\'=\\\"' + m.team1 + ' vs ' + m.team2 + '\\\"\')">' +
          escapeHtml(m.team1) + ' <span style="color:#888">vs</span> ' + escapeHtml(m.team2) +
          ' <span class="badge-mono" style="font-size:9px;color:#888">G' + m.group + '</span>' +
          '</div>';

        html += '<div class="xl-row ' + rowCls + '">' +
          '<div class="xl-row-num">' + rowNum + '</div>' +
          '<div class="xl-cell" style="width:90px" onclick="xlPredSelectCell(\'A' + rowNum + '\',\'=\\\"' + formatLocalTime(m.date, m.time, m.tz) + '\\\"\')">' + formatLocalTime(m.date, m.time, m.tz) + '</div>' +
          matchCell +
          homeCellContent +
          '<div class="xl-cell xl-num" style="width:30px;color:#888">&#8211;</div>' +
          awayCellContent +
          jokerCell +
          statusCell +
          '</div>';
        rowNum++;
      }
    }
    el.innerHTML = html;
  }

  // ── HISTORY SHEET ──
  else if (xlPredSheet === 'history') {
    var { data: history } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '')).eq('user_id', currentSession.user.id).order('created_at', { ascending: false }).limit(50);

    var completedPreds = [];
    if (history) {
      for (var hi = 0; hi < history.length; hi++) {
        var p = history[hi];
        var am = allMatches.find(function(am) { return am.id === p.match_id; });
        if (!am) continue;
        var m = matchData.find(function(md) { return md.team1 === am.home_team_id.name && md.team2 === am.away_team_id.name && md.date === am.match_date; });
        if (!m || !m.isComplete) continue;
        completedPreds.push({ p: p, m: m });
      }
    }

    var statusLeft2 = document.getElementById('xl-pred-status-left');
    if (statusLeft2) statusLeft2.textContent = completedPreds.length + ' records';
    var statusRight2 = document.getElementById('xl-pred-status-right');
    if (statusRight2) {
      var exact = completedPreds.filter(function(cp) { return calcPredPoints(cp.p.predicted_home_score, cp.p.predicted_away_score, cp.m.score1, cp.m.score2) === 5; }).length;
      var scored = completedPreds.filter(function(cp) { var pts = calcPredPoints(cp.p.predicted_home_score, cp.p.predicted_away_score, cp.m.score1, cp.m.score2); return pts >= 1 && pts < 5; }).length;
      statusRight2.textContent = 'Perfect 5&#9733;: ' + exact + '  |  Scored: ' + scored;
    }

    if (completedPreds.length === 0) {
      el.innerHTML = '<div class="xl-pred-signin">No completed predictions yet.</div>';
      return;
    }

    var histHtml = '';
    // Header row
    histHtml += '<div class="xl-row xl-row-pred-header">' +
      '<div class="xl-row-num">1</div>' +
      '<div class="xl-cell" style="width:90px">Date</div>' +
      '<div class="xl-cell" style="flex:1;min-width:150px">Match</div>' +
      '<div class="xl-cell xl-num" style="width:60px">Result</div>' +
      '<div class="xl-cell xl-num" style="width:30px"></div>' +
      '<div class="xl-cell xl-num" style="width:60px">Your Pick</div>' +
      '<div class="xl-cell xl-num" style="width:55px">Joker</div>' +
      '<div class="xl-cell xl-num" style="width:80px">Score</div>' +
      '</div>';

    for (var ci = 0; ci < completedPreds.length; ci++) {
      var cp = completedPreds[ci];
      var p = cp.p, m = cp.m;
      var pts = calcPredPoints(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2);
      if (p.is_joker) pts *= 2;
      var scoreCls = pts >= 10 ? 'xl-badge-exact' : (pts >= 1 ? 'xl-badge-scored' : 'xl-badge-zero');
      var scoreStr = pts >= 10 ? '&#9733;&#9733;&#9733;&#9733;&#9733; (10)' : pts >= 6 ? '&#9733;&#9733;&#9733; (6)' : pts >= 2 ? '&#9733; (2)' : pts === 5 ? '&#9733;&#9733;&#9733;&#9733;&#9733;' : pts === 3 ? '&#9733;&#9733;&#9733;' : pts === 1 ? '&#9733;' : '&#10007;';
      // Recompute without joker for display
      var basePts = calcPredPoints(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2);
      if (basePts === 5) scoreStr = '&#9733;&#9733;&#9733;&#9733;&#9733;' + (p.is_joker ? ' (10)' : '');
      else if (basePts === 3) scoreStr = '&#9733;&#9733;&#9733;' + (p.is_joker ? ' (6)' : '');
      else if (basePts === 1) scoreStr = '&#9733;' + (p.is_joker ? ' (2)' : '');
      else scoreStr = '&#10007;';

      var rowCls2 = ci % 2 === 0 ? 'xl-row-pred-even' : 'xl-row-pred-odd';
      var rn = ci + 2;
      histHtml += '<div class="xl-row ' + rowCls2 + '">' +
        '<div class="xl-row-num">' + rn + '</div>' +
        '<div class="xl-cell" style="width:90px">' + formatDateLabel(m.date, m.time, m.tz) + '</div>' +
        '<div class="xl-cell" style="flex:1;min-width:150px">' + escapeHtml(m.team1) + ' <span style="color:#888">vs</span> ' + escapeHtml(m.team2) + '</div>' +
        '<div class="xl-cell xl-num" style="width:60px;font-weight:bold">' + m.score1 + '&#8211;' + m.score2 + '</div>' +
        '<div class="xl-cell xl-num" style="width:30px;color:#888">&#8594;</div>' +
        '<div class="xl-cell xl-num" style="width:60px;color:#555">' + p.predicted_home_score + '&#8211;' + p.predicted_away_score + '</div>' +
        '<div class="xl-cell xl-num" style="width:55px">' + (p.is_joker ? '&#127923;' : '—') + '</div>' +
        '<div class="xl-cell xl-num ' + scoreCls + '" style="width:80px">' + scoreStr + '</div>' +
        '</div>';
    }
    el.innerHTML = histHtml;
  }
}
```

- [ ] **Step 3: Verify Predictions Excel functionality in browser**

Open `index.html`. Sign in with a valid account. Click the Predictions icon.
Expected:
1. Upcoming sheet shows header row + date separator rows + one row per upcoming match
2. Each match row has: local time in col A, "Team1 vs Team2 GX" in col B, score input in col C, "–" in col D, score input in col E, joker cell in col F, status in col G
3. Clicking a score input cell → updates formula bar name box to e.g. `C3` and formula field to `=IF(locked,"—",home_pred)`
4. Changing a score input and pressing Enter → calls `submitPrediction(matchId)`, row status updates to "✓ Saved"
5. Clicking joker cell (when available) → calls `toggleJoker(matchId)`, cell turns gold with 🃏 2×
6. Locked matches show "—" in score cells and "🔒 Locked" in status col
7. Click "History" tab → shows completed predictions in read-only rows with actual score, your pick, and score badge (★★★★★ / ★★★ / ★ / ✗)
8. Click "Upcoming" tab → returns to editable upcoming matches
9. Status bar shows match count and prediction stats

- [ ] **Step 4: Commit Task 2**

```bash
git add js/render-predictions.js
git commit -m "feat: rewrite renderPredictions() as Excel XP spreadsheet with editable score cells"
```
