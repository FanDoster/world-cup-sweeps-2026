# Groups Window — Windows Explorer Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Groups XP window to look like Windows Explorer in Details view — a folder tree on the left (Groups A–L + Best Thirds), and the selected group's team standings table in the right pane.

**Architecture:** Two tasks: (1) add `.we-*` CSS classes to `css/groups.css` and replace the Groups window content in `index.html` with the Explorer two-pane shell including the static folder tree; (2) add `weSelectedGroup` state var and `weSelectGroup(letter)` function to `render-groups.js`, refactor `renderGroups()` to render only the selected group into `#we-detail-pane`.

**Tech Stack:** Plain HTML/CSS/JS, no build step. Global scope, `var` declarations. No test framework — verification is manual browser inspection.

## Global Constraints

- No build step, no ES modules. All JS in global scope, `var` declarations.
- CSS namespace: `.we-` prefix for all new Windows Explorer chrome classes.
- Do NOT change `qualScenarios`, `renderPeople`, the best-thirds sort logic, or any function outside `render-groups.js` and `index.html`.
- `renderGroups()` must still compute standings for ALL groups internally (the best-thirds calculation depends on all 12 groups' third-placed teams), but only render ONE group's table into `#we-detail-pane` at a time.
- `weSelectedGroup` is a module-level `var` defaulting to `'A'`. A special value `'thirds'` shows the best-thirds table.
- The address bar (`.xp-addr-field` inside `#xp-window-groups`) must be updated when a folder is selected. Its text format is `C:\WorldCup2026\Groups\Group {letter}` for groups A–L and `C:\WorldCup2026\Groups\Best Thirds` for the thirds view.
- `owner-tag` click on a team row still calls `showUserProfile(name)` — preserve this.
- Mobile (≤700px): hide `.we-folders`; show a horizontal scrollable group tab strip (pill buttons A–L + Thirds) above the detail pane.
- Do NOT modify `index.html` lines outside the Groups window's `<div class="xp-window-content">...</div>` block (lines 298–303).

---

### Task 1: Explorer Chrome — CSS and HTML

**Files:**
- Modify: `css/groups.css`
- Modify: `index.html` (lines 298–303 only — the `.xp-window-content` block of the Groups window)

**Interfaces:**
- Produces:
  - `#we-detail-pane` — empty `<div>` that Task 2 renders the selected group table into
  - `#we-col-header` — the column header row div that stays static
  - `#we-status-bar` — status bar div that Task 2 updates
  - `.we-folder-item[data-group]` — folder items Task 2 toggles `.we-folder-active` on
  - `#we-mobile-tabs` — mobile tab strip that Task 2 builds

- [ ] **Step 1: Add Explorer chrome CSS to `css/groups.css`**

Append the following to the end of `css/groups.css`:

```css
/* ── WINDOWS EXPLORER CHROME ── */
#xp-window-groups .xp-window-content {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
#sectionGroups {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}
/* ── Two-pane body ── */
.we-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  font-family: "Pixelated MS Sans Serif", Tahoma, Arial, sans-serif;
  font-size: 11px;
}
/* ── Folder pane ── */
.we-folders {
  width: 180px;
  background: #f5f5f5;
  border-right: 1px solid #d4d0c8;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-size: 11px;
  user-select: none;
}
.we-folder-header {
  padding: 5px 8px;
  background: #ece9d8;
  border-bottom: 1px solid #d4d0c8;
  font-weight: bold;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.we-folder-close-x { cursor: pointer; color: #666; font-size: 10px; }
.we-folder-section {
  padding: 4px 0;
}
.we-folder-tree-item {
  padding: 2px 8px 2px 10px;
  font-size: 11px;
  cursor: default;
  color: #555;
  display: flex;
  align-items: center;
  gap: 4px;
}
.we-folder-item {
  padding: 3px 8px 3px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #000;
  white-space: nowrap;
}
.we-folder-item:hover { background: #e4eeff; }
.we-folder-item.we-folder-active {
  background: #316ac5;
  color: #fff;
}
/* ── Right pane: column header + detail view ── */
.we-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
/* ── Column header row ── */
.we-col-header-row {
  display: flex;
  height: 22px;
  background: #d4d0c8;
  border-bottom: 1px solid #808080;
  flex-shrink: 0;
  user-select: none;
}
.we-col-h {
  border-right: 1px solid #b0a898;
  display: flex;
  align-items: center;
  padding: 0 4px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}
/* ── Detail pane ── */
.we-detail-pane {
  flex: 1;
  overflow-y: auto;
  background: #fff;
  min-height: 0;
}
/* ── File rows (teams) ── */
.we-file-row {
  display: flex;
  height: 22px;
  border-bottom: 1px solid #efefef;
  cursor: default;
  align-items: center;
}
.we-file-row:hover { background: #e4eeff; }
.we-file-row.we-row-selected { background: #316ac5; color: #fff; }
.we-file-row.we-row-qual { border-left: 3px solid #22aa44; background: rgba(0,180,60,0.05); }
.we-file-row.we-row-third { border-left: 3px solid #f59e0b; background: rgba(245,158,11,0.05); }
.we-file-row.we-row-out { color: #999; }
.we-file-row.we-row-qual:hover,
.we-file-row.we-row-third:hover { background: #e4eeff; }
.we-file-cell {
  padding: 0 4px;
  font-size: 11px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 100%;
  border-right: 1px solid transparent;
}
.we-file-cell.we-num { justify-content: flex-end; font-variant-numeric: tabular-nums; }
.we-file-flag { width: 16px; height: 11px; object-fit: cover; border: 1px solid #ccc; margin-right: 4px; }
/* ── Status bar ── */
.we-status-bar {
  height: 20px;
  background: #d4d0c8;
  border-top: 1px solid #808080;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  flex-shrink: 0;
  font-size: 11px;
  user-select: none;
}
/* ── Mobile: replace folder tree with tab strip ── */
@media (max-width: 700px) {
  .we-folders { display: none; }
  .we-mobile-tabs {
    display: flex !important;
    overflow-x: auto;
    background: #ece9d8;
    border-bottom: 1px solid #b0a898;
    padding: 4px 6px;
    gap: 4px;
    flex-shrink: 0;
  }
  .we-mobile-tab {
    padding: 3px 9px;
    background: #d4d0c8;
    border: 1px solid #808080;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .we-mobile-tab.we-tab-active {
    background: #316ac5;
    color: #fff;
    border-color: #0a246a;
  }
}
.we-mobile-tabs { display: none; }
```

- [ ] **Step 2: Replace the Groups window's `.xp-window-content` in `index.html`**

Find and replace the block from line 298 (`<div class="xp-window-content">`) through line 303 (`</div>`) — the content of the Groups window. Replace with:

```html
    <div class="xp-window-content">
      <div class="section-groups" id="sectionGroups">
        <!-- Mobile tab strip (hidden on desktop) -->
        <div class="we-mobile-tabs" id="we-mobile-tabs"></div>
        <!-- Explorer two-pane body -->
        <div class="we-body">
          <!-- Folder pane -->
          <div class="we-folders">
            <div class="we-folder-header">Folders <span class="we-folder-close-x">&#215;</span></div>
            <div class="we-folder-section">
              <div class="we-folder-tree-item">&#128421; My Computer</div>
              <div class="we-folder-tree-item" style="padding-left:18px">&#128193; WorldCup2026</div>
              <div class="we-folder-tree-item" style="padding-left:30px">&#128193; Players</div>
              <div class="we-folder-tree-item" style="padding-left:30px">&#128193; Matches</div>
              <div class="we-folder-tree-item" style="padding-left:30px;font-weight:bold;color:#000">&#9660; Groups</div>
            </div>
            <div id="we-folder-list">
              <!-- Populated by weSelectGroup on init -->
            </div>
          </div>
          <!-- Right pane -->
          <div class="we-right">
            <div class="we-col-header-row" id="we-col-header">
              <div class="we-col-h" style="flex:1;min-width:140px">Name</div>
              <div class="we-col-h we-num" style="width:32px">Pld</div>
              <div class="we-col-h we-num" style="width:28px">W</div>
              <div class="we-col-h we-num" style="width:28px">D</div>
              <div class="we-col-h we-num" style="width:28px">L</div>
              <div class="we-col-h we-num" style="width:34px">GF</div>
              <div class="we-col-h we-num" style="width:34px">GA</div>
              <div class="we-col-h we-num" style="width:38px">GD</div>
              <div class="we-col-h we-num" style="width:38px">Pts</div>
              <div class="we-col-h" style="width:80px">Owner</div>
            </div>
            <div class="we-detail-pane" id="we-detail-pane"></div>
            <div class="we-status-bar" id="we-status-bar">
              <span id="we-status-left">4 objects</span>
              <span id="we-status-right"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 3: Verify structure renders**

Open `index.html` in browser. Double-click the "Groups" icon.
Expected: the Groups window opens showing the Explorer two-pane layout — folder tree on left with My Computer / WorldCup2026 / Groups hierarchy, empty detail pane on right with column headers (Name Pld W D L GF GA GD Pts Owner), status bar at bottom showing "4 objects".

- [ ] **Step 4: Commit Task 1**

```bash
git add css/groups.css index.html
git commit -m "feat: add Windows Explorer chrome CSS and HTML shell to Groups window"
```

---

### Task 2: Explorer JS — weSelectGroup and renderGroups refactor

**Files:**
- Modify: `js/render-groups.js`

**Interfaces:**
- Consumes (from Task 1):
  - `#we-detail-pane` — render target
  - `#we-folder-list` — container for folder item divs
  - `#we-status-left`, `#we-status-right` — status bar spans
  - `#we-mobile-tabs` — mobile tab strip container
  - `#xp-window-groups .xp-addr-field` — address bar text node (updated by `weSelectGroup`)
- Consumes (existing globals): `matchData`, `groups`, `teamOwner`, `teamIso`, `flagUrl`, `ownerColors`, `qualScenarios`, `showUserProfile`
- Produces: `weSelectedGroup` (global `var`, default `'A'`), `weSelectGroup(letter)` (global function)

- [ ] **Step 1: Add `weSelectedGroup` state variable at the top of `render-groups.js`**

Add this line at the very top of `js/render-groups.js`, before `function renderPeople()`:

```js
var weSelectedGroup = 'A';
```

- [ ] **Step 2: Add `weSelectGroup(letter)` function**

Add this function after the `weSelectedGroup` declaration and before `renderPeople()`:

```js
function weSelectGroup(letter) {
  weSelectedGroup = letter;

  // Update folder active state
  document.querySelectorAll('#we-folder-list .we-folder-item').forEach(function(el) {
    el.classList.toggle('we-folder-active', el.dataset.group === letter);
  });

  // Update address bar
  var addrField = document.querySelector('#xp-window-groups .xp-addr-field');
  if (addrField) {
    addrField.textContent = letter === 'thirds'
      ? 'C:\\WorldCup2026\\Groups\\Best Thirds'
      : 'C:\\WorldCup2026\\Groups\\Group ' + letter;
  }

  // Update mobile tabs
  document.querySelectorAll('#we-mobile-tabs .we-mobile-tab').forEach(function(el) {
    el.classList.toggle('we-tab-active', el.dataset.group === letter);
  });

  renderGroups();
}
```

- [ ] **Step 3: Rewrite `renderGroups()` to single-group Explorer view**

Replace the entire `renderGroups()` function in `render-groups.js` with:

```js
function renderGroups() {
  var detailPane = document.getElementById('we-detail-pane');
  if (!detailPane) return;

  // ── Compute standings for ALL groups (needed for best-thirds) ──
  var standings = {};
  for (var i = 0; i < matchData.length; i++) {
    var m = matchData[i];
    if (!m.isComplete) continue;
    var score1 = m.score1, score2 = m.score2, team1 = m.team1, team2 = m.team2;
    if (!standings[team1]) standings[team1] = { p:0, w:0, d:0, l:0, gf:0, ga:0 };
    if (!standings[team2]) standings[team2] = { p:0, w:0, d:0, l:0, gf:0, ga:0 };
    standings[team1].p++; standings[team2].p++;
    standings[team1].gf += score1; standings[team1].ga += score2;
    standings[team2].gf += score2; standings[team2].ga += score1;
    if (score1 > score2) { standings[team1].w++; standings[team2].l++; }
    else if (score2 > score1) { standings[team2].w++; standings[team1].l++; }
    else { standings[team1].d++; standings[team2].d++; }
  }

  // ── Build per-group sorted rows ──
  var allGroupLetters = Object.keys(groups).sort();
  var allGroupRows = {};
  var thirds = [];
  for (var gi = 0; gi < allGroupLetters.length; gi++) {
    var letter = allGroupLetters[gi];
    var teams = groups[letter];
    var rows = teams.map(function(t) {
      var s = standings[t.team] || { p:0, w:0, d:0, l:0, gf:0, ga:0 };
      return { team: t.team, iso: t.iso, owner: t.owner,
        p: s.p, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga,
        gd: s.gf - s.ga, pts: s.w * 3 + s.d };
    }).sort(function(a, b) {
      return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team);
    });
    allGroupRows[letter] = rows;
    if (rows[2]) thirds.push(Object.assign({}, rows[2], { group: letter }));
  }
  thirds.sort(function(a, b) {
    return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team);
  });

  // ── Build folder list (A–L + Best Thirds) ──
  var folderList = document.getElementById('we-folder-list');
  if (folderList && folderList.children.length === 0) {
    var folderHtml = '';
    for (var fi = 0; fi < allGroupLetters.length; fi++) {
      var fl = allGroupLetters[fi];
      folderHtml += '<div class="we-folder-item' + (fl === weSelectedGroup ? ' we-folder-active' : '') +
        '" data-group="' + fl + '" onclick="weSelectGroup(\'' + fl + '\')">&#128193; Group ' + fl + '</div>';
    }
    folderHtml += '<div class="we-folder-item' + (weSelectedGroup === 'thirds' ? ' we-folder-active' : '') +
      '" data-group="thirds" onclick="weSelectGroup(\'thirds\')">&#128202; Best Thirds</div>';
    folderList.innerHTML = folderHtml;
  } else if (folderList) {
    // Just update active state
    folderList.querySelectorAll('.we-folder-item').forEach(function(el) {
      el.classList.toggle('we-folder-active', el.dataset.group === weSelectedGroup);
    });
  }

  // ── Build mobile tab strip ──
  var mobileTabs = document.getElementById('we-mobile-tabs');
  if (mobileTabs && mobileTabs.children.length === 0) {
    var tabHtml = '';
    for (var ti = 0; ti < allGroupLetters.length; ti++) {
      var tl = allGroupLetters[ti];
      tabHtml += '<button class="we-mobile-tab' + (tl === weSelectedGroup ? ' we-tab-active' : '') +
        '" data-group="' + tl + '" onclick="weSelectGroup(\'' + tl + '\')">' + tl + '</button>';
    }
    tabHtml += '<button class="we-mobile-tab' + (weSelectedGroup === 'thirds' ? ' we-tab-active' : '') +
      '" data-group="thirds" onclick="weSelectGroup(\'thirds\')">3rds</button>';
    mobileTabs.innerHTML = tabHtml;
  } else if (mobileTabs) {
    mobileTabs.querySelectorAll('.we-mobile-tab').forEach(function(el) {
      el.classList.toggle('we-tab-active', el.dataset.group === weSelectedGroup);
    });
  }

  // ── Render selected group into detail pane ──
  if (weSelectedGroup === 'thirds') {
    // Best-thirds table
    var thirdsHtml = thirds.map(function(r, i) {
      var qualCls = i < 8 ? 'we-row-qual' : '';
      var ownerHtml = r.owner
        ? '<span class="owner-tag ' + ownerColors[r.owner] + '" onclick="event.stopPropagation();showUserProfile(\'' + r.owner + '\')" style="cursor:pointer">' + r.owner + '</span>'
        : '<span style="color:#999">—</span>';
      var gdStr = r.gd > 0 ? '+' + r.gd : String(r.gd);
      return '<div class="we-file-row ' + qualCls + '">' +
        '<div class="we-file-cell" style="flex:1;min-width:140px">' +
          '<img class="we-file-flag" src="' + flagUrl(r.iso) + '" alt="">' +
          escapeHtml(r.team) + ' <span style="color:#888;font-size:10px">G' + r.group + '</span>' +
        '</div>' +
        '<div class="we-file-cell we-num" style="width:32px">' + r.p + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.w + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.d + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.l + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.gf + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.ga + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + gdStr + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + r.pts + '</div>' +
        '<div class="we-file-cell" style="width:80px">' + ownerHtml + '</div>' +
        '</div>';
    }).join('');
    detailPane.innerHTML = thirdsHtml || '<div style="padding:20px;color:#888;font-size:11px;font-style:italic">No data yet.</div>';

    // Status bar
    var statusLeft = document.getElementById('we-status-left');
    if (statusLeft) statusLeft.textContent = thirds.length + ' objects';
    var statusRight = document.getElementById('we-status-right');
    if (statusRight) {
      var q = thirds.filter(function(r, i) { return i < 8; }).length;
      statusRight.textContent = q > 0 ? q + ' advancing' : '';
    }

  } else {
    // Single group table
    var rows = allGroupRows[weSelectedGroup];
    if (!rows) { detailPane.innerHTML = ''; return; }

    var scen = qualScenarios(weSelectedGroup, rows);
    var rowsHtml = rows.map(function(r, i) {
      var isSure2 = scen && scen.worst[r.team] <= 2;
      var isOut = scen && scen.best[r.team] > 3;
      var isThird = !isSure2 && !isOut && i === 2;
      var qualCls = i < 2 ? 'we-row-qual' : (i === 2 ? 'we-row-third' : 'we-row-out');
      if (isSure2) qualCls = 'we-row-qual';
      if (isOut) qualCls = 'we-row-out';
      var ownerHtml = r.owner
        ? '<span class="owner-tag ' + ownerColors[r.owner] + '" onclick="event.stopPropagation();showUserProfile(\'' + r.owner + '\')" style="cursor:pointer">' + r.owner + '</span>'
        : '<span style="color:#999">—</span>';
      var gdStr = r.gd > 0 ? '+' + r.gd : String(r.gd);
      return '<div class="we-file-row ' + qualCls + '">' +
        '<div class="we-file-cell" style="flex:1;min-width:140px">' +
          '<img class="we-file-flag" src="' + flagUrl(r.iso) + '" alt="">' +
          escapeHtml(r.team) +
        '</div>' +
        '<div class="we-file-cell we-num" style="width:32px">' + r.p + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.w + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.d + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.l + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.gf + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.ga + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + gdStr + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + r.pts + '</div>' +
        '<div class="we-file-cell" style="width:80px">' + ownerHtml + '</div>' +
        '</div>';
    }).join('');

    detailPane.innerHTML = rowsHtml || '<div style="padding:20px;color:#888;font-size:11px;font-style:italic">No matches played yet.</div>';

    // Status bar
    var statusLeft2 = document.getElementById('we-status-left');
    if (statusLeft2) statusLeft2.textContent = rows.length + ' objects';
    var statusRight2 = document.getElementById('we-status-right');
    if (statusRight2) {
      var qualified = rows.filter(function(r, i) { return i < 2; }).length;
      var thirdText = '';
      if (scen) {
        var sureThird = rows.filter(function(r) { return scen.best[r.team] <= 3 && scen.worst[r.team] > 2; }).length;
        if (sureThird) thirdText = '  ·  ' + sureThird + ' third-place contender' + (sureThird !== 1 ? 's' : '');
      }
      statusRight2.textContent = (qualified === 2 ? '2 qualified' : '') + thirdText;
    }
  }
}
```

- [ ] **Step 4: Verify Explorer functionality in browser**

Open `index.html`. Double-click the "Groups" icon.
Expected:
1. Folder pane shows tree structure with Groups A–L and "Best Thirds" listed
2. Group A is selected by default (blue highlight in folder pane)
3. Right pane shows Group A's 4 teams as file rows with flag, team name, Pld/W/D/L/GF/GA/GD/Pts stats, owner tag
4. Top 2 teams have green left border; 3rd-place team has amber border; 4th has dimmed text
5. Click "Group B" folder → right pane updates to Group B's teams, address bar updates to `C:\WorldCup2026\Groups\Group B`
6. Click "Best Thirds" → shows all 12 third-placed teams in order, top 8 have green left border
7. Owner tag click → opens user profile popup
8. Status bar shows "4 objects" and qualification summary

- [ ] **Step 5: Commit Task 2**

```bash
git add js/render-groups.js
git commit -m "feat: refactor renderGroups() to Windows Explorer detail view with folder navigation"
```
