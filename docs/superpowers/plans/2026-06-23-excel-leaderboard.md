# Excel XP Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Leaderboard window content with a faithful Microsoft Excel 2002/XP spreadsheet chrome — menu bar, two toolbars, formula bar, column-header row, data grid, three sheet tabs, and status bar — all driven by the existing scoring functions.

**Architecture:** Two tasks. Task 1 creates `css/excel.css` (all `.xl-*` styles), wires the `<link>` tag in `index.html`, simplifies the static leaderboard HTML, and adds mobile overrides to `css/responsive.css`. Task 2 rewrites `renderLeaderboard()` in `render-leaderboard.js` and adds the helper functions `xlSwitchSheet`, `xlSelectCell`, and three sheet-builder functions (`xlSheetLeaderboard`, `xlSheetMatch`, `xlSheetPred`).

**Tech Stack:** Plain HTML/CSS/JS — no build step, no modules, global scope. Existing globals: `calcMatchLeaderboard()`, `calcPredLeaderboard()`, `getPredStatsByPlayer()`, `escapeHtml()`, `showUserProfile()`, `playerDisplayName()`.

## Global Constraints

- All CSS classes must use the `.xl-` prefix — no styles may bleed outside `.xl-*` selectors except the two scoped overrides for `#xp-window-leaderboard .xp-window-content` and `#sectionLeaderboard`.
- No changes to `calcMatchLeaderboard`, `calcPredLeaderboard`, `getPredStatsByPlayer`, `calcPredPoints`, `renderAwards`, or `renderJokerStats`.
- No ES modules — all JS in global scope, `var` declarations only.
- No new image files. Icons use Unicode characters only.
- `.surgeignore` must not be modified.
- Mobile breakpoint is `max-width: 700px` — overrides go in the existing `css/responsive.css`.

---

### Task 1: Excel CSS, HTML wiring, and mobile overrides

**Files:**
- Create: `css/excel.css`
- Modify: `index.html` — add `<link>` tag; simplify leaderboard section HTML
- Modify: `css/responsive.css` — add mobile hide rules for Excel chrome layers

**Interfaces:**
- Produces: `.xl-wrap`, `.xl-menubar`, `.xl-menu-item`, `.xl-help-box`, `.xl-toolbar`, `.xl-toolbar-standard`, `.xl-toolbar-fmt`, `.xl-font-select`, `.xl-size-select`, `.xl-zoom-select`, `.xl-fmt-btn`, `.xl-italic`, `.xl-underline`, `.xl-formula-bar`, `.xl-name-box`, `.xl-name-val`, `.xl-name-arrow`, `.xl-formula-sep`, `.xl-fx-btn`, `.xl-formula-field`, `.xl-grid-wrap`, `.xl-col-headers`, `.xl-row-gutter-header`, `.xl-col-header`, `.xl-grid`, `.xl-row`, `.xl-row-header`, `.xl-row-gold`, `.xl-row-stripe`, `.xl-row-num`, `.xl-cell`, `.xl-cell-selected`, `.xl-hyperlink`, `.xl-num`, `.xl-sheet-tabs-wrap`, `.xl-tab-nav`, `.xl-tab-nav-btn`, `.xl-tab`, `.xl-tab-active`, `.xl-status-bar`, `.xl-status-ready`, `.xl-status-right` — all used by Task 2's generated HTML.

- [ ] **Step 1: Create `css/excel.css`**

```css
/* css/excel.css — Excel XP chrome. All classes prefixed .xl- */

/* Remove window-content padding for the leaderboard so the Excel chrome
   fills edge-to-edge; awards section below restores its own padding. */
#xp-window-leaderboard .xp-window-content {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
#sectionLeaderboard {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* ── Outer wrapper ── */
.xl-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 360px;
  font-family: "Pixelated MS Sans Serif", Tahoma, Arial, sans-serif;
  font-size: 11px;
  overflow: hidden;
  background: #fff;
}

/* ── Menu bar ── */
.xl-menubar {
  height: 22px;
  background: #f0ede4;
  border-bottom: 1px solid #b0a898;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  flex-shrink: 0;
  user-select: none;
}
.xl-menu-items {
  display: flex;
}
.xl-menu-item {
  padding: 0 6px;
  height: 22px;
  display: flex;
  align-items: center;
  cursor: default;
  color: #000;
}
.xl-menu-item:hover {
  background: #316ac5;
  color: #fff;
}
.xl-help-box {
  width: 160px;
  height: 16px;
  border: 1px solid #7b9ecc;
  background: #fff;
  font-family: "Pixelated MS Sans Serif", Tahoma, Arial, sans-serif;
  font-size: 11px;
  color: #808080;
  padding: 0 4px;
  outline: none;
  cursor: default;
}

/* ── Toolbars ── */
.xl-toolbar {
  height: 26px;
  background: #ece9d8;
  border-bottom: 1px solid #b0a898;
  display: flex;
  align-items: center;
  padding: 0 2px;
  gap: 0;
  flex-shrink: 0;
}
.xl-font-select,
.xl-size-select,
.xl-zoom-select {
  height: 18px;
  border: 1px solid;
  border-color: #808080 #d4d0c8 #d4d0c8 #808080;
  background: #fff;
  font-family: "Pixelated MS Sans Serif", Tahoma, Arial, sans-serif;
  font-size: 11px;
  appearance: none;
  -webkit-appearance: none;
  padding: 0 4px;
  color: #000;
}
.xl-font-select { width: 100px; }
.xl-size-select { width: 36px; }
.xl-zoom-select { width: 52px; }
.xl-fmt-btn { font-weight: bold; min-width: 20px; padding: 0 3px; }
.xl-fmt-btn.xl-italic { font-style: italic; font-weight: normal; }
.xl-fmt-btn.xl-underline { text-decoration: underline; }

/* ── Formula bar ── */
.xl-formula-bar {
  height: 24px;
  background: #ece9d8;
  border-bottom: 1px solid #b0a898;
  display: flex;
  align-items: center;
  padding: 0 2px;
  flex-shrink: 0;
}
.xl-name-box {
  width: 80px;
  height: 18px;
  background: #fff;
  border: 1px solid;
  border-color: #7a7a7a #d4d0c8 #d4d0c8 #7a7a7a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 3px;
  flex-shrink: 0;
  box-sizing: border-box;
}
.xl-name-val { flex: 1; text-align: center; font-size: 11px; }
.xl-name-arrow { font-size: 8px; color: #555; }
.xl-formula-sep {
  width: 1px;
  height: 20px;
  background: #b0a898;
  margin: 0 4px;
  flex-shrink: 0;
}
.xl-fx-btn {
  font-style: italic !important;
  color: #000080 !important;
  font-weight: bold !important;
  width: 28px;
  text-align: center;
}
.xl-formula-field {
  flex: 1;
  height: 18px;
  background: #fff;
  border: 1px solid;
  border-color: #7a7a7a #d4d0c8 #d4d0c8 #7a7a7a;
  padding: 0 4px;
  display: flex;
  align-items: center;
  font-size: 11px;
  overflow: hidden;
  white-space: nowrap;
  box-sizing: border-box;
}

/* ── Grid wrapper ── */
.xl-grid-wrap {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  background: #fff;
  min-height: 0;
}

/* ── Column headers ── */
.xl-col-headers {
  display: flex;
  flex-shrink: 0;
  background: #d4d0c8;
  border-bottom: 1px solid #808080;
  position: sticky;
  top: 0;
  z-index: 2;
}
.xl-row-gutter-header {
  width: 24px;
  flex-shrink: 0;
  border-right: 1px solid #808080;
}
.xl-col-header {
  text-align: center;
  border-right: 1px solid #808080;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  user-select: none;
  flex-shrink: 0;
}

/* ── Data grid ── */
.xl-row {
  display: flex;
  border-bottom: 1px solid #d0cdc4;
  min-height: 18px;
  flex-shrink: 0;
}
.xl-row-num {
  width: 24px;
  flex-shrink: 0;
  background: #d4d0c8;
  border-right: 1px solid #808080;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 3px;
  font-size: 11px;
  user-select: none;
}
.xl-row-header .xl-cell { background: #dce6f1 !important; font-weight: bold; }
.xl-row-gold    .xl-cell { background: #fffbe6 !important; }
.xl-row-stripe  .xl-cell { background: #f0f5ff !important; }

/* ── Cells ── */
.xl-cell {
  border-right: 1px solid #d0cdc4;
  padding: 0 4px;
  display: flex;
  align-items: center;
  font-size: 11px;
  cursor: cell;
  overflow: hidden;
  white-space: nowrap;
  background: #fff;
  box-sizing: border-box;
  user-select: none;
  flex-shrink: 0;
}
.xl-cell:hover { background: #eef4ff !important; }
.xl-cell.xl-cell-selected {
  outline: 2px solid #0055a8;
  outline-offset: -2px;
  z-index: 1;
  position: relative;
}
.xl-cell.xl-hyperlink {
  color: #0563c1;
  text-decoration: underline;
  cursor: pointer;
}
.xl-cell.xl-num { justify-content: flex-end; }

/* ── Sheet tab strip ── */
.xl-sheet-tabs-wrap {
  height: 22px;
  background: #d4d0c8;
  border-top: 1px solid #808080;
  display: flex;
  align-items: flex-end;
  flex-shrink: 0;
  padding-left: 2px;
  overflow: hidden;
}
.xl-tab-nav {
  display: flex;
  align-items: center;
  height: 18px;
  border-right: 1px solid #808080;
  padding: 0 2px;
  margin-right: 4px;
  flex-shrink: 0;
  gap: 1px;
}
.xl-tab-nav-btn {
  background: none;
  border: none;
  cursor: default;
  font-size: 8px;
  color: #000;
  padding: 0 2px;
  line-height: 1;
  pointer-events: none;
}
.xl-tab {
  padding: 2px 10px 0;
  background: #c8c4b8;
  border: 1px solid #808080;
  border-bottom: none;
  border-radius: 3px 3px 0 0;
  cursor: pointer;
  font-size: 11px;
  height: 19px;
  display: flex;
  align-items: center;
  user-select: none;
  margin-right: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}
.xl-tab.xl-tab-active {
  background: #fff;
  font-weight: bold;
  border-bottom: 1px solid #fff;
  margin-bottom: -1px;
}

/* ── Status bar ── */
.xl-status-bar {
  height: 20px;
  background: #d4d0c8;
  border-top: 1px solid #808080;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  flex-shrink: 0;
  font-size: 11px;
}
.xl-status-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Awards / joker wrap below the spreadsheet */
.xl-awards-wrap {
  padding: 8px;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Add `<link>` for `css/excel.css` in `index.html`**

In `index.html`, find the line `<link rel="stylesheet" href="css/leaderboard.css">` and add the new link immediately after it:

```html
  <link rel="stylesheet" href="css/leaderboard.css">
  <link rel="stylesheet" href="css/excel.css">
```

- [ ] **Step 3: Simplify the leaderboard section HTML in `index.html`**

Find the leaderboard window content block (inside `id="xp-window-leaderboard"`). Replace everything inside `<div class="xp-window-content">` with:

```html
    <div class="xp-window-content">
      <div class="section-leaderboard" id="sectionLeaderboard">
        <div id="xl-leaderboard-target"></div>
        <div class="xl-awards-wrap">
          <div id="awardsWrap"></div>
          <div id="jokerStatsWrap"></div>
        </div>
      </div>
    </div>
```

The old content being replaced is the `<div class="lb-two-col">` block plus the bare `<div id="awardsWrap">` and `<div id="jokerStatsWrap">`.

- [ ] **Step 4: Add mobile overrides to `css/responsive.css`**

Append to the end of `css/responsive.css` inside the existing `@media (max-width: 700px)` block:

```css
  /* Excel chrome: hide decorative layers on mobile */
  .xl-menubar,
  .xl-toolbar,
  .xl-formula-bar,
  .xl-col-headers,
  .xl-row-num,
  .xl-tab-nav { display: none !important; }
  .xl-cell { font-size: 12px; }
  .xl-wrap { min-height: 0; }
```

- [ ] **Step 5: Open `index.html` in a browser and confirm**

Open the Leaderboard window. Expect: a blank/empty window with no visual errors (the Excel chrome is not rendered yet — Task 2 does that). Confirm there are no console errors.

- [ ] **Step 6: Commit**

```bash
git add css/excel.css index.html css/responsive.css
git commit -m "feat: add Excel XP leaderboard CSS + HTML structure"
```

---

### Task 2: Excel JS — `renderLeaderboard` rewrite and sheet helpers

**Files:**
- Modify: `js/render-leaderboard.js` — rewrite `renderLeaderboard()`; add `xlSwitchSheet`, `xlSelectCell`, `xlBuildSheet`, `xlSheetLeaderboard`, `xlSheetMatch`, `xlSheetPred`

**Interfaces:**
- Consumes from Task 1: all `.xl-*` CSS classes; DOM IDs `xl-leaderboard-target`, `xl-col-headers`, `xl-grid`, `xl-name-val`, `xl-formula-field`, `xl-sum`, `awardsWrap`, `jokerStatsWrap`
- Consumes existing globals: `calcMatchLeaderboard()` → `[{name, pts, w, d, l}]`; `calcPredLeaderboard()` → `[{name, predPts, settled, exact, bestStreak, avg}]`; `getPredStatsByPlayer()` → `{playerName: {pts, settled, exact, best, upsets, jokerPts, scored, avg}}`; `escapeHtml(str)` → safe HTML string; `showUserProfile(name)`; `playerDisplayName(name)`
- Produces globals: `xlSwitchSheet(sheetName)`, `xlSelectCell(el, addr, formula)` — both called from inline `onclick` attributes in generated HTML

- [ ] **Step 1: Add `xlSelectCell` to `render-leaderboard.js`**

Add the following function **before** the existing `renderLeaderboard` function:

```javascript
function xlSelectCell(el, addr, formula) {
  document.querySelectorAll('.xl-cell.xl-cell-selected').forEach(function(c) {
    c.classList.remove('xl-cell-selected');
  });
  if (el) el.classList.add('xl-cell-selected');
  var nameVal = document.getElementById('xl-name-val');
  if (nameVal) nameVal.textContent = addr;
  var fField = document.getElementById('xl-formula-field');
  if (fField) fField.textContent = formula;
  var sumEl = document.getElementById('xl-sum');
  if (sumEl) {
    var num = parseFloat(String(formula).replace(/^=/, ''));
    sumEl.textContent = (!isNaN(num) && formula !== addr) ? 'Sum: ' + num : '';
  }
}
```

- [ ] **Step 2: Add `xlSwitchSheet` to `render-leaderboard.js`**

Add immediately after `xlSelectCell`:

```javascript
function xlSwitchSheet(name) {
  document.querySelectorAll('.xl-tab').forEach(function(t) {
    t.classList.toggle('xl-tab-active', t.dataset.sheet === name);
  });
  var built = xlBuildSheet(name);
  var colHeaders = document.getElementById('xl-col-headers');
  var grid = document.getElementById('xl-grid');
  if (colHeaders) colHeaders.innerHTML = built.headers;
  if (grid) grid.innerHTML = built.rows;
  xlSelectCell(null, 'A1', '');
}
```

- [ ] **Step 3: Add `xlBuildSheet` dispatcher to `render-leaderboard.js`**

```javascript
function xlBuildSheet(name) {
  if (name === 'match') return xlSheetMatch();
  if (name === 'pred')  return xlSheetPred();
  return xlSheetLeaderboard();
}
```

- [ ] **Step 4: Add `xlSheetLeaderboard` to `render-leaderboard.js`**

```javascript
function xlSheetLeaderboard() {
  var matchRows = calcMatchLeaderboard();
  var predStats = getPredStatsByPlayer();
  var rows = matchRows.map(function(m) {
    var pp = predStats[m.name] ? predStats[m.name].pts : 0;
    return { name: m.name, matchPts: m.pts, predPts: pp, total: m.pts + pp };
  });
  rows.sort(function(a, b) { return b.total - a.total || b.matchPts - a.matchPts; });

  var cols = [
    { key: 'A', label: '#',         width: 30  },
    { key: 'B', label: 'Player',    width: 120 },
    { key: 'C', label: 'Match Pts', width: 80  },
    { key: 'D', label: 'Pred Pts',  width: 80  },
    { key: 'E', label: 'Total',     width: 80  }
  ];

  var headers = '<div class="xl-row-gutter-header"></div>' +
    cols.map(function(c) {
      return '<div class="xl-col-header" style="width:' + c.width + 'px">' + c.key + '</div>';
    }).join('');

  var headerRow = '<div class="xl-row xl-row-header">' +
    '<div class="xl-row-num">1</div>' +
    cols.map(function(c) {
      return '<div class="xl-cell" style="width:' + c.width + 'px" onclick="xlSelectCell(this,\'' +
        c.key + '1\',\'' + escapeHtml(c.label) + '\')">' + escapeHtml(c.label) + '</div>';
    }).join('') +
    '</div>';

  var dataRows = rows.map(function(p, i) {
    var r = i + 2;
    var rowCls = i === 0 ? 'xl-row-gold' : (r % 2 === 0 ? '' : 'xl-row-stripe');
    var rankFml = '=RANK(E' + r + ',$E$2:$E$7,0)';
    var totFml  = '=C' + r + '+D' + r;
    return '<div class="xl-row ' + rowCls + '">' +
      '<div class="xl-row-num">' + r + '</div>' +
      '<div class="xl-cell xl-num" style="width:30px" onclick="xlSelectCell(this,\'A' + r + '\',\'' + escapeHtml(rankFml) + '\')">' + (i + 1) + '</div>' +
      '<div class="xl-cell xl-hyperlink" style="width:120px" onclick="event.stopPropagation();showUserProfile(\'' + escapeHtml(p.name) + '\')">' + escapeHtml(playerDisplayName(p.name)) + '</div>' +
      '<div class="xl-cell xl-num" style="width:80px" onclick="xlSelectCell(this,\'C' + r + '\',\'=' + p.matchPts + '\')">' + p.matchPts + '</div>' +
      '<div class="xl-cell xl-num" style="width:80px" onclick="xlSelectCell(this,\'D' + r + '\',\'=' + p.predPts + '\')">' + p.predPts + '</div>' +
      '<div class="xl-cell xl-num" style="width:80px" onclick="xlSelectCell(this,\'E' + r + '\',\'' + escapeHtml(totFml) + '\')">' + p.total + '</div>' +
      '</div>';
  }).join('');

  return { headers: headers, rows: headerRow + dataRows };
}
```

- [ ] **Step 5: Add `xlSheetMatch` to `render-leaderboard.js`**

```javascript
function xlSheetMatch() {
  var rows = calcMatchLeaderboard();

  var cols = [
    { key: 'A', label: '#',      width: 30  },
    { key: 'B', label: 'Player', width: 120 },
    { key: 'C', label: 'W',      width: 50  },
    { key: 'D', label: 'D',      width: 50  },
    { key: 'E', label: 'L',      width: 50  },
    { key: 'F', label: 'Pts',    width: 60  }
  ];

  var headers = '<div class="xl-row-gutter-header"></div>' +
    cols.map(function(c) {
      return '<div class="xl-col-header" style="width:' + c.width + 'px">' + c.key + '</div>';
    }).join('');

  var headerRow = '<div class="xl-row xl-row-header">' +
    '<div class="xl-row-num">1</div>' +
    cols.map(function(c) {
      return '<div class="xl-cell" style="width:' + c.width + 'px" onclick="xlSelectCell(this,\'' +
        c.key + '1\',\'' + escapeHtml(c.label) + '\')">' + escapeHtml(c.label) + '</div>';
    }).join('') +
    '</div>';

  var dataRows = rows.map(function(p, i) {
    var r = i + 2;
    var rowCls = i === 0 ? 'xl-row-gold' : (r % 2 === 0 ? '' : 'xl-row-stripe');
    var rankFml = '=RANK(F' + r + ',$F$2:$F$7,0)';
    return '<div class="xl-row ' + rowCls + '">' +
      '<div class="xl-row-num">' + r + '</div>' +
      '<div class="xl-cell xl-num" style="width:30px" onclick="xlSelectCell(this,\'A' + r + '\',\'' + escapeHtml(rankFml) + '\')">' + (i + 1) + '</div>' +
      '<div class="xl-cell xl-hyperlink" style="width:120px" onclick="event.stopPropagation();showUserProfile(\'' + escapeHtml(p.name) + '\')">' + escapeHtml(playerDisplayName(p.name)) + '</div>' +
      '<div class="xl-cell xl-num" style="width:50px" onclick="xlSelectCell(this,\'C' + r + '\',\'=' + p.w + '\')">' + p.w + '</div>' +
      '<div class="xl-cell xl-num" style="width:50px" onclick="xlSelectCell(this,\'D' + r + '\',\'=' + p.d + '\')">' + p.d + '</div>' +
      '<div class="xl-cell xl-num" style="width:50px" onclick="xlSelectCell(this,\'E' + r + '\',\'=' + p.l + '\')">' + p.l + '</div>' +
      '<div class="xl-cell xl-num" style="width:60px" onclick="xlSelectCell(this,\'F' + r + '\',\'=' + p.pts + '\')">' + p.pts + '</div>' +
      '</div>';
  }).join('');

  return { headers: headers, rows: headerRow + dataRows };
}
```

- [ ] **Step 6: Add `xlSheetPred` to `render-leaderboard.js`**

```javascript
function xlSheetPred() {
  var rows = calcPredLeaderboard();

  var cols = [
    { key: 'A', label: '#',            width: 30  },
    { key: 'B', label: 'Player',       width: 120 },
    { key: 'C', label: 'Pred Pts',     width: 70  },
    { key: 'D', label: 'Avg/Game',     width: 70  },
    { key: 'E', label: 'Exact',        width: 60  },
    { key: 'F', label: 'Best Streak',  width: 80  }
  ];

  var headers = '<div class="xl-row-gutter-header"></div>' +
    cols.map(function(c) {
      return '<div class="xl-col-header" style="width:' + c.width + 'px">' + c.key + '</div>';
    }).join('');

  var headerRow = '<div class="xl-row xl-row-header">' +
    '<div class="xl-row-num">1</div>' +
    cols.map(function(c) {
      return '<div class="xl-cell" style="width:' + c.width + 'px" onclick="xlSelectCell(this,\'' +
        c.key + '1\',\'' + escapeHtml(c.label) + '\')">' + escapeHtml(c.label) + '</div>';
    }).join('') +
    '</div>';

  var dataRows = rows.map(function(p, i) {
    var r = i + 2;
    var rowCls = i === 0 ? 'xl-row-gold' : (r % 2 === 0 ? '' : 'xl-row-stripe');
    var rankFml = '=RANK(C' + r + ',$C$2:$C$7,0)';
    var avgFml  = '=C' + r + '/COUNTA($B$2:$B$7)';
    return '<div class="xl-row ' + rowCls + '">' +
      '<div class="xl-row-num">' + r + '</div>' +
      '<div class="xl-cell xl-num" style="width:30px" onclick="xlSelectCell(this,\'A' + r + '\',\'' + escapeHtml(rankFml) + '\')">' + (i + 1) + '</div>' +
      '<div class="xl-cell xl-hyperlink" style="width:120px" onclick="event.stopPropagation();showUserProfile(\'' + escapeHtml(p.name) + '\')">' + escapeHtml(playerDisplayName(p.name)) + '</div>' +
      '<div class="xl-cell xl-num" style="width:70px" onclick="xlSelectCell(this,\'C' + r + '\',\'=' + p.predPts + '\')">' + p.predPts + '</div>' +
      '<div class="xl-cell xl-num" style="width:70px" onclick="xlSelectCell(this,\'D' + r + '\',\'' + escapeHtml(avgFml) + '\')">' + p.avg + '</div>' +
      '<div class="xl-cell xl-num" style="width:60px" onclick="xlSelectCell(this,\'E' + r + '\',\'=' + p.exact + '\')">' + p.exact + '</div>' +
      '<div class="xl-cell xl-num" style="width:80px" onclick="xlSelectCell(this,\'F' + r + '\',\'=' + p.bestStreak + '\')">' + p.bestStreak + '</div>' +
      '</div>';
  }).join('');

  return { headers: headers, rows: headerRow + dataRows };
}
```

- [ ] **Step 7: Rewrite `renderLeaderboard` in `render-leaderboard.js`**

Replace the existing `renderLeaderboard` function body (currently four lines calling `renderMatchLeaderboard`, `renderPredLeaderboard`, `renderAwards`, `renderJokerStats`) with:

```javascript
function renderLeaderboard() {
  var target = document.getElementById('xl-leaderboard-target');
  if (!target) return;

  var initial = xlBuildSheet('leaderboard');

  target.innerHTML =
    '<div class="xl-wrap">' +

    // ── Menu bar ──
    '<div class="xl-menubar">' +
    '<div class="xl-menu-items">' +
    ['File','Edit','View','Insert','Format','Tools','Data','Window','Help'].map(function(item) {
      return '<span class="xl-menu-item">' + item + '</span>';
    }).join('') +
    '</div>' +
    '<input class="xl-help-box" type="text" value="Type a question for help" readonly>' +
    '</div>' +

    // ── Standard toolbar ──
    '<div class="xl-toolbar xl-toolbar-standard">' +
    '<button class="xp-tb-btn" disabled>&#128196;</button>' +
    '<button class="xp-tb-btn" disabled>&#128194;</button>' +
    '<button class="xp-tb-btn" disabled>&#128190;</button>' +
    '<span class="xp-tb-sep"></span>' +
    '<button class="xp-tb-btn" disabled>&#128438;</button>' +
    '<button class="xp-tb-btn" disabled>&#128269;</button>' +
    '<span class="xp-tb-sep"></span>' +
    '<button class="xp-tb-btn" disabled>&#9986;</button>' +
    '<button class="xp-tb-btn" disabled>&#128203;</button>' +
    '<button class="xp-tb-btn" disabled>&#128204;</button>' +
    '<span class="xp-tb-sep"></span>' +
    '<button class="xp-tb-btn" disabled>&#8617;</button>' +
    '<button class="xp-tb-btn" disabled>&#8618;</button>' +
    '<span class="xp-tb-sep"></span>' +
    '<button class="xp-tb-btn" disabled>&Sigma;</button>' +
    '<span class="xp-tb-sep"></span>' +
    '<select class="xl-zoom-select" disabled><option>100%</option></select>' +
    '</div>' +

    // ── Formatting toolbar ──
    '<div class="xl-toolbar xl-toolbar-fmt">' +
    '<select class="xl-font-select" disabled><option>Arial</option></select>' +
    '<select class="xl-size-select" disabled><option>10</option></select>' +
    '<span class="xp-tb-sep"></span>' +
    '<button class="xp-tb-btn xl-fmt-btn" disabled>B</button>' +
    '<button class="xp-tb-btn xl-fmt-btn xl-italic" disabled>I</button>' +
    '<button class="xp-tb-btn xl-fmt-btn xl-underline" disabled>U</button>' +
    '<span class="xp-tb-sep"></span>' +
    '<button class="xp-tb-btn" disabled>&#8676;</button>' +
    '<button class="xp-tb-btn" disabled>&#8803;</button>' +
    '<button class="xp-tb-btn" disabled>&#8677;</button>' +
    '<span class="xp-tb-sep"></span>' +
    '<button class="xp-tb-btn" disabled>$</button>' +
    '<button class="xp-tb-btn" disabled>%</button>' +
    '<button class="xp-tb-btn" disabled>,</button>' +
    '</div>' +

    // ── Formula bar ──
    '<div class="xl-formula-bar">' +
    '<div class="xl-name-box">' +
    '<span class="xl-name-val" id="xl-name-val">A1</span>' +
    '<span class="xl-name-arrow">&#9660;</span>' +
    '</div>' +
    '<div class="xl-formula-sep"></div>' +
    '<button class="xp-tb-btn xl-fx-btn" disabled>fx</button>' +
    '<div class="xl-formula-field" id="xl-formula-field"></div>' +
    '</div>' +

    // ── Grid wrapper ──
    '<div class="xl-grid-wrap">' +
    '<div class="xl-col-headers" id="xl-col-headers">' + initial.headers + '</div>' +
    '<div class="xl-grid" id="xl-grid">' + initial.rows + '</div>' +
    '</div>' +

    // ── Sheet tabs ──
    '<div class="xl-sheet-tabs-wrap">' +
    '<div class="xl-tab-nav">' +
    '<button class="xl-tab-nav-btn" disabled>&#9664;&#9664;</button>' +
    '<button class="xl-tab-nav-btn" disabled>&#9664;</button>' +
    '<button class="xl-tab-nav-btn" disabled>&#9654;</button>' +
    '<button class="xl-tab-nav-btn" disabled>&#9654;&#9654;</button>' +
    '</div>' +
    '<div class="xl-sheet-tabs">' +
    '<div class="xl-tab xl-tab-active" data-sheet="leaderboard" onclick="xlSwitchSheet(\'leaderboard\')">&#128202; Leaderboard</div>' +
    '<div class="xl-tab" data-sheet="match" onclick="xlSwitchSheet(\'match\')">&#9917; Match Results</div>' +
    '<div class="xl-tab" data-sheet="pred" onclick="xlSwitchSheet(\'pred\')">&#128302; Predictions</div>' +
    '</div>' +
    '</div>' +

    // ── Status bar ──
    '<div class="xl-status-bar">' +
    '<span class="xl-status-ready">Ready</span>' +
    '<span class="xl-status-right"><span id="xl-sum"></span>NUM</span>' +
    '</div>' +

    '</div>'; // .xl-wrap

  renderAwards(calcMatchLeaderboard());
  renderJokerStats();
}
```

- [ ] **Step 8: Open `index.html` in a browser and verify**

Open the Leaderboard window. Confirm:
1. Excel chrome renders: menu bar, two toolbars, formula bar, column headers (A B C D E), data rows for all 6 players, three sheet tabs, status bar
2. Clicking a cell selects it (blue outline), Name Box updates to e.g. `C3`, formula field shows `=18`
3. Clicking player name opens their profile
4. Clicking `⚽ Match Results` tab switches the grid to W/D/L/Pts columns
5. Clicking `🔮 Predictions` tab switches to Pred Pts / Avg / Exact / Streak columns
6. Clicking back to `📊 Leaderboard` tab restores combined view
7. Awards section still appears below the spreadsheet
8. No console errors

- [ ] **Step 9: Commit**

```bash
git add js/render-leaderboard.js
git commit -m "feat: render leaderboard as Excel XP spreadsheet"
```

- [ ] **Step 10: Push**

```bash
git push
```
