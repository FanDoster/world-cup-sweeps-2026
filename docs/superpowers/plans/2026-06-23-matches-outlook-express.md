# Matches Window — Outlook Express Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Matches XP window to look like Outlook Express 6 — folder tree, message list rows, and a reading pane replacing the filter buttons.

**Architecture:** Two tasks: (1) add `.oe-*` CSS classes to `css/matches.css` and replace the static HTML in the Matches window content with the OE three-pane shell; (2) rewrite `renderMatches()` to emit OE message rows into `#oe-message-list`, add `oeSelectMessage(key)` to populate the reading pane, and wire folder clicks to the existing filter state.

**Tech Stack:** Plain HTML/CSS/JS, no build step. Global scope. All render functions are synchronous except async Supabase calls in other files — `renderMatches()` is synchronous. No testing framework — verification is manual browser inspection.

## Global Constraints

- No build step, no ES modules. All JS in global scope, `var` declarations.
- CSS namespace: `.oe-` prefix for all new Outlook Express chrome classes.
- Do NOT change `submitPrediction`, `showPredPanel`, `loadData`, `calcLeaderboard`, or any function outside `render-matches.js` and `index.html`.
- Do NOT add `matchTeamFilter` handling in HTML — the "My Teams" folder calls `setMatchTeamFilter('mine')` and 'All Matches' calls `setMatchTeamFilter('all')`.
- `matchFilter` and `matchTeamFilter` global vars stay as-is. The OE folder clicks call the existing `setMatchFilter` / `setMatchTeamFilter` and also update folder highlight state.
- `setMatchFilter()` currently updates `#matchFilterBar` buttons — that element will be gone after the HTML change. Update `setMatchFilter` to skip the querySelectorAll if the element doesn't exist, OR (simpler) remove the button-state logic from `setMatchFilter` since it's no longer needed for the matches tab.
- Reading pane [Predict] button calls `showPredPanel(key)` exactly as before.
- Mobile (≤700px): hide `.oe-folders`, `.oe-menubar`, `.oe-toolbar`; reading pane hidden; message list fills full height.
- Do NOT modify `index.html` lines outside the matches window's `<div class="xp-window-content">...</div>` block (lines 249–264).

---

### Task 1: OE Chrome — CSS and HTML

**Files:**
- Modify: `css/matches.css`
- Modify: `index.html` (lines 249–264 only — the `.xp-window-content` block of the Matches window)

**Interfaces:**
- Produces:
  - `#oe-message-list` — empty `<div>` that Task 2 renders match rows into
  - `#oe-reading-pane` — `<div>` that Task 2 renders selected-match detail into
  - `#oe-status-left` — `<span>` Task 2 updates with message count
  - `#oe-status-right` — `<span>` Task 2 updates with filter label
  - `#oe-unread-count` — `<span>` Task 2 updates with upcoming match count
  - `#oe-folder-upcoming`, `#oe-folder-completed`, `#oe-folder-all`, `#oe-folder-mine` — folder `<div>`s that Task 2 toggles `.oe-folder-active` on

- [ ] **Step 1: Add OE chrome CSS to `css/matches.css`**

Append the following to the end of `css/matches.css`:

```css
/* ── OUTLOOK EXPRESS CHROME ── */
#xp-window-matches .xp-window-content {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
#sectionMatches {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}
.oe-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  font-family: "Pixelated MS Sans Serif", Tahoma, Arial, sans-serif;
  font-size: 11px;
  overflow: hidden;
  background: #fff;
  min-height: 0;
}
.oe-menubar {
  height: 22px;
  background: #ece9d8;
  border-bottom: 1px solid #b0a898;
  display: flex;
  align-items: center;
  padding: 0 4px;
  gap: 0;
  flex-shrink: 0;
}
.oe-menu-item {
  padding: 0 7px;
  height: 22px;
  display: flex;
  align-items: center;
  cursor: default;
  font-size: 11px;
}
.oe-menu-item:hover { background: #316ac5; color: #fff; }
.oe-toolbar {
  height: 28px;
  background: #ece9d8;
  border-bottom: 1px solid #b0a898;
  display: flex;
  align-items: center;
  padding: 0 4px;
  gap: 2px;
  flex-shrink: 0;
}
.oe-tb-btn {
  height: 22px;
  padding: 0 7px;
  background: transparent;
  border: 1px solid transparent;
  font-size: 11px;
  cursor: default;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  border-radius: 2px;
}
.oe-tb-btn:hover { border-color: #316ac5; background: #dce8f8; }
.oe-tb-sep {
  width: 1px;
  height: 20px;
  background: #b0a898;
  margin: 0 3px;
  flex-shrink: 0;
}
/* ── Three-pane body ── */
.oe-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
/* ── Folder pane ── */
.oe-folders {
  width: 160px;
  background: #f5f5f5;
  border-right: 1px solid #d4d0c8;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-size: 11px;
}
.oe-folder-root {
  padding: 5px 8px;
  font-weight: bold;
  font-size: 11px;
  border-bottom: 1px solid #d4d0c8;
}
.oe-folder-group-label {
  padding: 5px 8px 2px;
  font-size: 10px;
  color: #555;
  font-weight: bold;
}
.oe-folder-item {
  padding: 3px 8px 3px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #000;
  white-space: nowrap;
}
.oe-folder-item:hover { background: #e4eeff; }
.oe-folder-item.oe-folder-active { background: #316ac5; color: #fff; }
.oe-unread-badge {
  background: #316ac5;
  color: #fff;
  border-radius: 8px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: bold;
  margin-left: auto;
}
.oe-folder-item.oe-folder-active .oe-unread-badge {
  background: #fff;
  color: #316ac5;
}
/* ── Right pane ── */
.oe-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
/* ── Message list ── */
.oe-msg-list-wrap {
  flex: 0 0 58%;
  overflow-y: auto;
  min-height: 0;
}
.oe-msg-col-headers {
  display: flex;
  height: 22px;
  background: #d4d0c8;
  border-bottom: 1px solid #808080;
  position: sticky;
  top: 0;
  z-index: 2;
  flex-shrink: 0;
}
.oe-msg-col {
  border-right: 1px solid #b0a898;
  display: flex;
  align-items: center;
  padding: 0 4px;
  font-size: 11px;
  user-select: none;
  overflow: hidden;
  white-space: nowrap;
}
.oe-date-sep {
  padding: 2px 8px;
  background: #ece9d8;
  font-style: italic;
  font-size: 11px;
  color: #555;
  border-bottom: 1px solid #d4d0c8;
}
.oe-msg-row {
  display: flex;
  height: 22px;
  border-bottom: 1px solid #ebebeb;
  cursor: pointer;
  align-items: center;
}
.oe-msg-row:hover { background: #e4eeff; }
.oe-msg-row.oe-msg-selected { background: #316ac5; color: #fff; }
.oe-msg-row.oe-msg-unread .oe-msg-from,
.oe-msg-row.oe-msg-unread .oe-msg-subject { font-weight: bold; }
.oe-msg-cell {
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
/* ── Resize handle ── */
.oe-splitter {
  height: 4px;
  background: #d4d0c8;
  border-top: 1px solid #b0a898;
  border-bottom: 1px solid #b0a898;
  flex-shrink: 0;
}
/* ── Reading pane ── */
.oe-reading-pane {
  flex: 1;
  overflow-y: auto;
  background: #fff;
  min-height: 80px;
}
.oe-reading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
  font-size: 11px;
  font-style: italic;
  padding: 20px;
}
.oe-reading-header {
  background: #ece9d8;
  border-bottom: 1px solid #d4d0c8;
  padding: 6px 12px;
}
.oe-reading-field {
  display: flex;
  gap: 6px;
  font-size: 11px;
  line-height: 18px;
}
.oe-reading-lbl { color: #555; font-weight: bold; min-width: 52px; flex-shrink: 0; }
.oe-reading-val { color: #000; }
.oe-reading-body { padding: 10px 14px; }
.oe-reading-teams {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: bold;
}
.oe-reading-flag { width: 24px; height: 16px; object-fit: cover; border: 1px solid #ccc; }
.oe-reading-score { font-size: 18px; font-weight: bold; margin: 0 6px; }
.oe-reading-prob { margin: 6px 0; }
.oe-reading-dots { margin: 6px 0; }
.oe-predict-btn {
  margin-top: 10px;
  padding: 4px 12px;
  background: #ece9d8;
  border: 1px solid;
  border-color: #fff #808080 #808080 #fff;
  box-shadow: inset -1px -1px #0a246a, inset 1px 1px rgba(255,255,255,0.9),
    inset -2px -2px #0040b4, inset 2px 2px #d8e6f8;
  font-size: 11px;
  cursor: pointer;
}
.oe-predict-btn:active {
  box-shadow: inset 1px 1px #0a246a, inset -1px -1px rgba(255,255,255,0.9),
    inset 2px 2px #0040b4, inset -2px -2px #d8e6f8;
}
/* ── Status bar ── */
.oe-status-bar {
  height: 20px;
  background: #d4d0c8;
  border-top: 1px solid #808080;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  flex-shrink: 0;
  font-size: 11px;
}
/* ── Mobile overrides ── */
@media (max-width: 700px) {
  .oe-folders { display: none; }
  .oe-menubar, .oe-toolbar { display: none; }
  .oe-reading-pane { display: none; }
  .oe-splitter { display: none; }
  .oe-msg-list-wrap { flex: 1; }
}
```

- [ ] **Step 2: Replace the Matches window's `.xp-window-content` in `index.html`**

Find and replace the block from line 249 (`<div class="xp-window-content">`) through line 264 (`</div>`) — the content of the Matches window. Replace with:

```html
    <div class="xp-window-content">
      <div class="section-matches" id="sectionMatches">
        <div class="oe-wrap">
          <div class="oe-menubar">
            <span class="oe-menu-item">File</span>
            <span class="oe-menu-item">Edit</span>
            <span class="oe-menu-item">View</span>
            <span class="oe-menu-item">Tools</span>
            <span class="oe-menu-item">Message</span>
            <span class="oe-menu-item">Help</span>
          </div>
          <div class="oe-toolbar">
            <button class="oe-tb-btn">📧 New Mail</button>
            <button class="oe-tb-btn">&#x21A9; Reply</button>
            <button class="oe-tb-btn">&#x21A9; Reply All</button>
            <button class="oe-tb-btn">&#x2192; Forward</button>
            <span class="oe-tb-sep"></span>
            <button class="oe-tb-btn">&#128424; Print</button>
            <button class="oe-tb-btn">&#128465; Delete</button>
            <span class="oe-tb-sep"></span>
            <button class="oe-tb-btn">&#128229; Send/Receive</button>
          </div>
          <div class="oe-body">
            <div class="oe-folders">
              <div class="oe-folder-root">&#128231; Outlook Express</div>
              <div class="oe-folder-group-label">Local Folders</div>
              <div class="oe-folder-item oe-folder-active" id="oe-folder-upcoming" onclick="oeSetFolder('upcoming')">&#128229; Inbox <span class="oe-unread-badge" id="oe-unread-count">—</span></div>
              <div class="oe-folder-item" id="oe-folder-completed" onclick="oeSetFolder('completed')">&#128228; Sent Items</div>
              <div class="oe-folder-item" id="oe-folder-all" onclick="oeSetFolder('all')">&#127758; All Matches</div>
              <div class="oe-folder-item" id="oe-folder-mine" onclick="oeSetFolder('mine')">&#11088; My Teams</div>
            </div>
            <div class="oe-right">
              <div class="oe-msg-list-wrap">
                <div class="oe-msg-col-headers">
                  <div class="oe-msg-col" style="width:20px">!</div>
                  <div class="oe-msg-col" style="width:20px">&#9993;</div>
                  <div class="oe-msg-col" style="width:200px">From</div>
                  <div class="oe-msg-col" style="flex:1">Subject</div>
                  <div class="oe-msg-col" style="width:72px">Received</div>
                </div>
                <div id="oe-message-list"></div>
              </div>
              <div class="oe-splitter"></div>
              <div class="oe-reading-pane" id="oe-reading-pane">
                <div class="oe-reading-placeholder">Select a message to read it.</div>
              </div>
              <div class="oe-status-bar">
                <span id="oe-status-left">Loading…</span>
                <span id="oe-status-right"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 3: Verify structure renders**

Open `index.html` in a browser. Double-click the "Matches" desktop icon (or run `open index.html`).
Expected: the Matches window opens showing the OE two-pane layout — folder tree on left (Inbox/Sent Items/All Matches/My Teams), empty message list on right with column headers (!  ✉  From  Subject  Received), empty reading pane below, status bar at bottom showing "Loading…". The menu bar (File Edit View…) and toolbar (New Mail Reply…) appear above the panes.

- [ ] **Step 4: Commit Task 1**

```bash
git add css/matches.css index.html
git commit -m "feat: add Outlook Express chrome CSS and HTML shell to Matches window"
```

---

### Task 2: OE JS — renderMatches rewrite and folder wiring

**Files:**
- Modify: `js/render-matches.js`

**Interfaces:**
- Consumes (from Task 1):
  - `#oe-message-list` — render target div
  - `#oe-reading-pane` — reading pane div
  - `#oe-status-left`, `#oe-status-right` — status bar spans
  - `#oe-unread-count` — unread count badge span
  - `#oe-folder-upcoming`, `#oe-folder-completed`, `#oe-folder-all`, `#oe-folder-mine` — folder divs
- Consumes (existing globals): `matchData`, `toDate`, `formatDateHeader`, `formatLocalTime`, `formatDateLabel`, `getCountdown`, `teamOwner`, `teamIso`, `flagUrl`, `ownerColors`, `currentProfile`, `people`, `PLAYERS`, `predLookup`, `matchIdByTeamDate`, `predResultBadge`, `showPredPanel`, `currentSession`
- `oeSelectedKey` — module-level var, the currently selected match key (`"team1|team2|date"`)

- [ ] **Step 1: Add `oeSelectedKey` and `oeSetFolder` at the top of `render-matches.js`**

The file currently starts with:
```js
let matchFilter = 'upcoming';
let teamScheduleFilter = 'upcoming';
let matchTeamFilter = 'all';
```

Replace those three lines with:

```js
let matchFilter = 'upcoming';
let teamScheduleFilter = 'upcoming';
let matchTeamFilter = 'all';
var oeSelectedKey = null;

function oeSetFolder(folder) {
  // Determine which matchFilter and matchTeamFilter to apply
  if (folder === 'mine') {
    matchTeamFilter = 'mine';
  } else {
    matchTeamFilter = 'all';
    if (folder === 'upcoming' || folder === 'completed' || folder === 'all') {
      matchFilter = folder;
    }
  }
  // Update folder active state
  ['upcoming', 'completed', 'all', 'mine'].forEach(function(f) {
    var el = document.getElementById('oe-folder-' + f);
    if (el) el.classList.toggle('oe-folder-active', f === folder);
  });
  renderMatches();
}
```

- [ ] **Step 2: Update `setMatchFilter` and `setMatchTeamFilter` to skip missing DOM elements**

Replace the current `setMatchFilter` function:

```js
function setMatchFilter(filter, tab) {
  if (tab === 'matches') {
    matchFilter = filter;
    renderMatches();
  } else if (tab === 'teams') {
    teamScheduleFilter = filter;
    document.querySelectorAll('#teamFilterBar .filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === filter);
    });
    renderTeamSchedule();
  }
}
```

Replace the current `setMatchTeamFilter` function:

```js
function setMatchTeamFilter(filter) {
  matchTeamFilter = filter;
  renderMatches();
}
```

- [ ] **Step 3: Rewrite `renderMatches()` to emit OE message rows**

Replace the entire `renderMatches()` function (lines 32–168 in the current file) with:

```js
function renderMatches() {
  var el = document.getElementById('oe-message-list');
  if (!el) return;
  var now = new Date();
  var twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  var all = matchData
    .map(function(m) { return Object.assign({}, m, { kickoff: toDate(m.date, m.time, m.tz) }); })
    .sort(function(a, b) { return a.kickoff - b.kickoff; });

  if (matchTeamFilter === 'mine' && currentProfile) {
    var playerTeams = people[currentProfile.player_name] || [];
    var teamNames = playerTeams.map(function(t) { return t.team; });
    all = all.filter(function(m) { return teamNames.includes(m.team1) || teamNames.includes(m.team2); });
  }

  var upcomingOnly = all.filter(function(m) { return !m.isComplete; });
  var completed = all.filter(function(m) { return m.isComplete; });
  var visible;
  if (matchFilter === 'all') visible = all;
  else if (matchFilter === 'completed') visible = completed;
  else visible = upcomingOnly.slice(0, 36);

  // Update unread badge (upcoming count)
  var unreadEl = document.getElementById('oe-unread-count');
  if (unreadEl) unreadEl.textContent = upcomingOnly.length || '';

  // Update status bar
  var statusLeft = document.getElementById('oe-status-left');
  if (statusLeft) statusLeft.textContent = visible.length + ' message' + (visible.length !== 1 ? 's' : '');
  var statusRight = document.getElementById('oe-status-right');
  if (statusRight) {
    var label = matchFilter === 'upcoming' ? 'Inbox' : matchFilter === 'completed' ? 'Sent Items' : 'All Matches';
    if (matchTeamFilter === 'mine') label = 'My Teams';
    statusRight.textContent = label;
  }

  if (visible.length === 0) {
    el.innerHTML = '<div style="padding:20px;color:#666;font-style:italic;font-size:11px">No messages.</div>';
    return;
  }

  var byDate = {};
  var byDateOrder = [];
  for (var i = 0; i < visible.length; i++) {
    var m = visible[i];
    if (!byDate[m.date]) { byDate[m.date] = []; byDateOrder.push(m.date); }
    byDate[m.date].push(m);
  }

  var html = '';
  var rowIndex = 0;
  for (var di = 0; di < byDateOrder.length; di++) {
    var date = byDateOrder[di];
    var dayMatches = byDate[date];
    html += '<div class="oe-date-sep">' + formatDateHeader(date, dayMatches[0].time, dayMatches[0].tz) + '</div>';

    for (var mi = 0; mi < dayMatches.length; mi++) {
      var m = dayMatches[mi];
      var key = m.team1 + '|' + m.team2 + '|' + m.date;
      var cd = getCountdown(m.date, m.time, m.tz);
      var inLiveWindow = cd.rowCls === 'live';
      var isFinished = m.isComplete && !inLiveWindow;
      var localTime = formatLocalTime(m.date, m.time, m.tz);
      var i1 = teamIso[m.team1];
      var i2 = teamIso[m.team2];
      var o1 = teamOwner[m.team1];
      var o2 = teamOwner[m.team2];

      // Pred dot: does current user have a prediction?
      var mid = matchIdByTeamDate[key];
      var hasPred = false;
      if (mid && predLookup[mid]) {
        var preds = predLookup[mid];
        if (currentProfile) {
          hasPred = preds.some(function(p) { return p.player_name === currentProfile.player_name; });
        }
      }

      var isUnread = !m.isComplete && !hasPred;
      var isSelected = key === oeSelectedKey;

      // Subject: score if finished, live score if live, otherwise kick-off time
      var subject;
      if (isFinished) subject = m.score1 + '&#8211;' + m.score2 + ' FT';
      else if (inLiveWindow && m.score1 !== null) subject = '&#128308; LIVE ' + m.score1 + '&#8211;' + (m.score2 || 0);
      else subject = 'Kick-off ' + localTime;

      var fromText = m.team1 + ' v ' + m.team2;
      if (o1) fromText += ' <span style="background:' + (ownerColors[o1] ? '' : '') + ';font-size:9px;padding:0 3px;border-radius:2px">' + o1 + '</span>';

      html += '<div class="oe-msg-row' +
        (isSelected ? ' oe-msg-selected' : '') +
        (isUnread ? ' oe-msg-unread' : '') +
        '" onclick="oeSelectMessage(\'' + safeAttr(key) + '\')">' +
        '<div class="oe-msg-cell" style="width:20px">' + (hasPred ? '&#8226;' : '') + '</div>' +
        '<div class="oe-msg-cell" style="width:20px"><img src="' + flagUrl(i1) + '" style="width:16px;height:11px;object-fit:cover" alt=""></div>' +
        '<div class="oe-msg-cell oe-msg-from" style="width:200px">' + escapeHtml(fromText) + '</div>' +
        '<div class="oe-msg-cell oe-msg-subject" style="flex:1">' + subject + '</div>' +
        '<div class="oe-msg-cell" style="width:72px">' + localTime + '</div>' +
        '</div>';
      rowIndex++;
    }
  }

  el.innerHTML = html;

  // Re-select previously selected row (preserve reading pane)
  if (oeSelectedKey) oeSelectMessage(oeSelectedKey);
}
```

- [ ] **Step 4: Add `oeSelectMessage(key)` function**

Add this function after `renderMatches()`:

```js
function oeSelectMessage(key) {
  oeSelectedKey = key;

  // Update selected row highlight
  document.querySelectorAll('#oe-message-list .oe-msg-row').forEach(function(row) {
    row.classList.toggle('oe-msg-selected', row.getAttribute('onclick') === 'oeSelectMessage(\'' + safeAttr(key) + '\')');
  });

  var pane = document.getElementById('oe-reading-pane');
  if (!pane) return;

  // Find the match
  var m = null;
  for (var i = 0; i < matchData.length; i++) {
    var mk = matchData[i].team1 + '|' + matchData[i].team2 + '|' + matchData[i].date;
    if (mk === key) { m = matchData[i]; break; }
  }
  if (!m) { pane.innerHTML = '<div class="oe-reading-placeholder">Match not found.</div>'; return; }

  var i1 = teamIso[m.team1];
  var i2 = teamIso[m.team2];
  var o1 = teamOwner[m.team1];
  var o2 = teamOwner[m.team2];
  var localTime = formatLocalTime(m.date, m.time, m.tz);
  var dateLabel = formatDateLabel(m.date, m.time, m.tz);
  var now = new Date();
  var kickoff = toDate(m.date, m.time, m.tz);
  var cd = getCountdown(m.date, m.time, m.tz);
  var inLiveWindow = cd.rowCls === 'live';
  var isFinished = m.isComplete && !inLiveWindow;
  var isLocked = kickoff - now < 5 * 60 * 1000;

  // Score display
  var scoreHtml;
  if (isFinished) scoreHtml = '<span style="font-size:20px;font-weight:bold">' + m.score1 + ' &#8211; ' + m.score2 + '</span> <span style="font-size:11px;color:#555">FT</span>';
  else if (inLiveWindow && m.score1 !== null) scoreHtml = '<span style="font-size:20px;font-weight:bold;color:#cc0000">' + m.score1 + ' &#8211; ' + (m.score2 || 0) + '</span> <span style="font-size:11px;color:#cc0000">&#128308; LIVE</span>';
  else scoreHtml = '<span style="font-size:14px;color:#888">vs</span>';

  // Prob bar
  var probHtml = '';
  var probTotal = m.prob1 + m.probD + m.prob2;
  if (probTotal > 0 && !isFinished) {
    probHtml = '<div class="oe-reading-prob"><div class="match-prob-bar" style="margin:0">' +
      '<span class="prob-seg prob-h" style="width:' + m.prob1 + '%" title="' + m.team1 + ' ' + m.prob1 + '%">' + m.prob1 + '%</span>' +
      '<span class="prob-seg prob-d" style="width:' + m.probD + '%" title="Draw ' + m.probD + '%">' + m.probD + '%</span>' +
      '<span class="prob-seg prob-a" style="width:' + m.prob2 + '%" title="' + m.team2 + ' ' + m.prob2 + '%">' + m.prob2 + '%</span>' +
      '</div></div>';
  }

  // Pred dots
  var mid = matchIdByTeamDate[key];
  var dotsHtml = '';
  if (mid) {
    var preds = predLookup[mid] || [];
    var predByPlayer = {};
    preds.forEach(function(p) { predByPlayer[p.player_name] = p; });
    var showScores = isLocked || isFinished;
    var dots = '';
    for (var pi = 0; pi < PLAYERS.length; pi++) {
      var p = PLAYERS[pi];
      var pred = predByPlayer[p];
      if (pred && showScores) {
        var icon = isFinished ? predResultBadge(pred.home, pred.away, m.score1, m.score2, pred.j) : '';
        dots += '<span class="pred-dot has-pred" title="' + p + ': ' + pred.home + '&#8211;' + pred.away + '">' + p[0] + icon + '</span>';
      } else if (pred) {
        dots += '<span class="pred-dot has-pred" title="' + p + ' predicted">' + p[0] + '&#10003;</span>';
      } else {
        dots += '<span class="pred-dot no-pred" title="' + p + ' hasn\'t predicted">' + p[0] + '&#10007;</span>';
      }
    }
    dotsHtml = '<div class="oe-reading-dots"><div class="match-pred-dots">' + dots + '</div></div>';
  }

  // Channel
  var channelHtml = '';
  if (m.channel) {
    var href = m.channel.startsWith('BBC') ? 'https://www.bbc.co.uk/iplayer' : 'https://www.itv.com/watch';
    var cls = m.channel.startsWith('BBC') ? 'channel-bbc' : 'channel-itv';
    channelHtml = '<div style="margin-top:6px"><a href="' + href + '" target="_blank" rel="noopener" class="match-channel ' + cls + '">' + escapeHtml(m.channel) + '</a></div>';
  }

  // Predict button
  var predictBtn = '';
  if (!isLocked && !isFinished && typeof currentSession !== 'undefined' && currentSession) {
    predictBtn = '<div style="margin-top:10px"><button class="oe-predict-btn" onclick="showPredPanel(\'' + safeAttr(key) + '\')">&#128270; Predict</button></div>';
  }

  // Owner badges
  var fromLine = '<img class="oe-reading-flag" src="' + flagUrl(i1) + '" alt=""> ' + escapeHtml(m.team1) +
    (o1 ? ' <span class="match-owner ' + ownerColors[o1] + '">' + o1 + '</span>' : '') +
    ' <span style="color:#888;font-size:16px">&#8211;</span> ' +
    '<img class="oe-reading-flag" src="' + flagUrl(i2) + '" alt=""> ' + escapeHtml(m.team2) +
    (o2 ? ' <span class="match-owner ' + ownerColors[o2] + '">' + o2 + '</span>' : '');

  pane.innerHTML =
    '<div class="oe-reading-header">' +
      '<div class="oe-reading-field"><span class="oe-reading-lbl">From:</span><span class="oe-reading-val">' + escapeHtml(m.team1) + ' v ' + escapeHtml(m.team2) + '</span></div>' +
      '<div class="oe-reading-field"><span class="oe-reading-lbl">Subject:</span><span class="oe-reading-val">Group ' + m.group + ' Match</span></div>' +
      '<div class="oe-reading-field"><span class="oe-reading-lbl">Date:</span><span class="oe-reading-val">' + dateLabel + ' ' + localTime + '</span></div>' +
    '</div>' +
    '<div class="oe-reading-body">' +
      '<div class="oe-reading-teams">' + fromLine + '</div>' +
      '<div style="margin-bottom:8px">' + scoreHtml + '</div>' +
      probHtml +
      dotsHtml +
      channelHtml +
      predictBtn +
    '</div>';
}
```

- [ ] **Step 5: Verify OE functionality in browser**

Open `index.html`. Double-click the Matches icon.
Expected:
1. Folder pane shows Inbox (active, blue), Sent Items, All Matches, My Teams
2. Message list shows match rows grouped by date with separator rows
3. Click any row → reading pane fills with match detail (teams, score/vs, prob bar, pred dots)
4. Click "Inbox" folder → shows upcoming matches only
5. Click "Sent Items" folder → shows completed matches
6. Click "All Matches" folder → shows all matches
7. Click "My Teams" (when signed in) → filters to own teams
8. If signed in and match not locked: reading pane shows [Predict] button; clicking it opens the pred panel
9. Status bar shows message count and current folder name

- [ ] **Step 6: Commit Task 2**

```bash
git add js/render-matches.js
git commit -m "feat: rewrite renderMatches() as Outlook Express message list with reading pane"
```
