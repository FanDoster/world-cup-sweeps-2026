# Windows XP Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the World Cup sweepstakes webapp as a Windows XP Luna desktop simulation — Bliss wallpaper, draggable windows opened via desktop icon double-clicks, XP taskbar with Start button and clock; responsive to a Windows Mobile / Pocket PC skin on ≤700px screens.

**Architecture:** A new shell layer (`css/xp-shell.css` + `js/xp-shell.js`) provides the desktop environment. `index.html` is rebuilt to replace the `.container`/tab-bar structure with `#xp-desktop`, desktop icons, and per-section `.xp-window` divs. All existing render functions and section IDs are preserved inside window content panes — no render logic changes.

**Tech Stack:** Vanilla JS, plain CSS custom properties, no build step. All scripts in global scope, loaded via `<script src>` in `index.html`.

## Global Constraints

- No ES modules — all JS in global scope (required for `file://` compatibility).
- No build step, no package manager, no linter.
- Font: `Tahoma, 'MS Sans Serif', Arial, sans-serif` — loaded from system fonts, no Google Fonts needed (remove the Google Fonts `<link>` tags).
- All section element IDs (`#people`, `#matches`, `#sectionPlayers`, etc.) must be preserved exactly — render functions find elements by ID.
- `switchTab(name)` must remain callable (called from render-user-profile.js, render-teams.js, render-myteams.js).
- XP Luna colour palette: title bar `#2462c9 → #1a52b0`, window chrome `#ece9d8`, desktop `#1a6aaf`, border outer `#0a246a`.
- `--radius: 0px` everywhere — XP is boxy.
- Manual browser testing only (no test framework exists).
- Deploy is auto-triggered on push to `main` via `.github/workflows/deploy.yml`.

---

## File Map

| File | Change |
|---|---|
| `css/tokens.css` | Full rewrite — XP design tokens |
| `css/layout.css` | Full rewrite — window content layout, remove tab-bar |
| `css/xp-shell.css` | **New** — XP desktop, icons, windows, taskbar, Start menu |
| `css/auth.css` | Partial — restyle `.auth-modal` as XP dialog; remove `.auth-bar` rules |
| `css/responsive.css` | Partial — replace mobile overrides with Windows Mobile skin |
| `js/xp-shell.js` | **New** — window manager: open/close/minimize/maximize/drag/focus/clock |
| `js/main.js` | Rewrite `switchTab()` as XP-aware shim; open `matches` on init |
| `js/auth.js` | Rewrite `updateAuthBar()` to update `#xp-auth-tray` + desktop icons |
| `index.html` | Full rewrite — XP desktop structure, all sections in `.xp-window` panes |

---

## Task 1: Replace design tokens

**Files:**
- Modify: `css/tokens.css` (full rewrite)

- [ ] **Step 1: Replace `css/tokens.css` entirely**

```css
/* ── XP DESIGN TOKENS ── */
:root {
  /* desktop environment */
  --xp-desktop-bg:     #1a6aaf;
  --xp-titlebar-start: #4a90d9;
  --xp-titlebar-end:   #1a52b0;
  --xp-surface:        #ece9d8;
  --xp-card:           #ffffff;
  --xp-border-hi:      #ffffff;
  --xp-border-sh:      #848284;
  --xp-border-outer:   #0a246a;
  --xp-taskbar-start:  #2d5ba8;
  --xp-taskbar-end:    #1f3a6e;
  --xp-start-green:    #3a7a18;

  /* mapped tokens (used by existing CSS files) */
  --bg:                var(--xp-surface);
  --surface:           var(--xp-surface);
  --card:              var(--xp-card);
  --card-hover:        #f5f3ec;
  --border:            var(--xp-border-sh);
  --border-subtle:     #c8c4b8;
  --border-alpha:      rgba(0,0,0,0.15);
  --border-alpha-mid:  rgba(0,0,0,0.2);
  --text:              #000000;
  --text-secondary:    #444444;
  --text-muted:        #808080;
  --accent:            #2462c9;
  --accent-dim:        #1a52b0;
  --accent-glow:       rgba(36,98,201,0.15);
  --gold:              #cc8800;
  --gold-dim:          #aa7000;
  --silver:            #808080;
  --bronze:            #8b5a00;
  --live:              #cc0000;
  --live-glow:         rgba(204,0,0,0.18);
  --radius:            0px;
  --radius-sm:         0px;
  --radius-xs:         0px;
  --font:              Tahoma, 'MS Sans Serif', Arial, sans-serif;
  --font-mono:         'Courier New', Courier, monospace;
  --ticker-dim:        rgba(0,0,0,0.3);
  --ticker-mid:        rgba(0,0,0,0.55);
  --ticker-full:       rgba(0,0,0,0.75);
  --color-polymarket:  #2E5CFF;
  --color-stats-green: #15803d;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--xp-desktop-bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 11px;
  min-height: 100vh;
}

.container { max-width: none; margin: 0; padding: 0; }

.card-base {
  background: var(--xp-card);
  border: 1px solid var(--xp-border-sh);
  border-radius: 0;
}

.badge-mono {
  font-family: var(--font-mono);
  background: #f0f0f0;
  border-radius: 0;
  color: var(--text-secondary);
  border: 1px solid var(--xp-border-sh);
}

.label-sm {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

- [ ] **Step 2: Open `index.html` in a browser and verify**

Expected: body background is now Bliss blue (`#1a6aaf`), font is Tahoma, all corners are square. The old dark theme is gone. The app content is still visible (tabs still work at this point).

- [ ] **Step 3: Commit**

```bash
git add css/tokens.css
git commit -m "feat: replace design tokens with Windows XP Luna palette"
```

---

## Task 2: Create XP shell CSS

**Files:**
- Create: `css/xp-shell.css`

- [ ] **Step 1: Create `css/xp-shell.css`**

```css
/* ── XP DESKTOP ── */
#xp-desktop {
  position: fixed;
  inset: 0 0 40px 0;           /* leave room for taskbar */
  background:
    linear-gradient(to bottom,
      #1a6aaf  0%,
      #4d9fd4 42%,
      #7ec8a0 58%,
      #4a8f3a 72%,
      #3d7a2e 100%);
  overflow: hidden;
  user-select: none;
}

/* ── DESKTOP ICONS ── */
#xp-icons {
  position: absolute;
  top: 12px;
  left: 12px;
  display: grid;
  grid-template-columns: repeat(2, 72px);
  gap: 8px;
  z-index: 1;
}

.xp-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  cursor: default;
  width: 72px;
}

.xp-icon-img {
  width: 48px;
  height: 48px;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
}

.xp-icon-label {
  font-family: var(--font);
  font-size: 11px;
  color: #ffffff;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9);
  line-height: 1.2;
  word-break: break-word;
  max-width: 72px;
}

.xp-icon:hover .xp-icon-img,
.xp-icon.xp-selected .xp-icon-img {
  background: rgba(49, 106, 197, 0.5);
  border-color: rgba(255,255,255,0.6);
}

.xp-icon:hover .xp-icon-label,
.xp-icon.xp-selected .xp-icon-label {
  background: #316ac5;
  color: #fff;
}

/* ── WINDOWS ── */
.xp-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 320px;
  min-height: 120px;
  /* Luna blue outer border + classic bevel */
  border: 3px solid;
  border-color: #5ba6e8 #1a52b0 #1a52b0 #5ba6e8;
  outline: 1px solid var(--xp-border-outer);
  box-shadow: 4px 4px 14px rgba(0,0,0,0.55);
  z-index: 10;
}

.xp-window.xp-focused {
  border-color: #6db8ff #1a52b0 #1a52b0 #6db8ff;
}

/* ── TITLE BAR ── */
.xp-title-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 3px 0 6px;
  background: linear-gradient(to bottom,
    var(--xp-titlebar-start) 0%,
    var(--xp-titlebar-end) 100%);
  cursor: default;
  flex-shrink: 0;
}

.xp-window:not(.xp-focused) .xp-title-bar {
  background: linear-gradient(to bottom, #7a96c2 0%, #5b7ab5 100%);
}

.xp-title-icon { font-size: 16px; line-height: 1; flex-shrink: 0; }

.xp-title-text {
  flex: 1;
  color: #ffffff;
  font-family: var(--font);
  font-size: 12px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── CONTROL BUTTONS ── */
.xp-controls {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.xp-btn-min,
.xp-btn-max,
.xp-btn-close {
  width: 21px;
  height: 21px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  font-family: var(--font);
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-shadow: 0 1px 1px rgba(0,0,0,0.4);
}

.xp-btn-min,
.xp-btn-max {
  background: linear-gradient(to bottom, #5090d8 0%, #3060b8 100%);
  border: 1px solid #1a3880;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
}

.xp-btn-min:hover,
.xp-btn-max:hover {
  background: linear-gradient(to bottom, #70aaf0 0%, #4080d0 100%);
}

.xp-btn-close {
  background: linear-gradient(to bottom, #d84040 0%, #b02020 100%);
  border: 1px solid #801010;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
}

.xp-btn-close:hover {
  background: linear-gradient(to bottom, #f05050 0%, #c03030 100%);
}

/* ── WINDOW CONTENT ── */
.xp-window-content {
  flex: 1;
  background: var(--xp-surface);
  overflow: auto;
  padding: 8px;
  /* inset bevel */
  border-top: 1px solid var(--xp-border-sh);
  border-left: 1px solid var(--xp-border-sh);
  border-bottom: 1px solid var(--xp-border-hi);
  border-right: 1px solid var(--xp-border-hi);
}

/* section divs inside windows should always be visible */
.xp-window-content .section-players,
.xp-window-content .section-matches,
.xp-window-content .section-groups,
.xp-window-content .section-leaderboard,
.xp-window-content .section-teams,
.xp-window-content .section-myteams,
.xp-window-content .section-predictions,
.xp-window-content .section-map,
.xp-window-content .section-shooter,
.xp-window-content .section-profile,
.xp-window-content .section-bracket {
  display: block !important;
}

/* ── TASKBAR ── */
#xp-taskbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, var(--xp-taskbar-start), var(--xp-taskbar-end));
  border-top: 1px solid #5b8ad8;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  z-index: 9999;
}

/* ── START BUTTON ── */
#xp-start-btn {
  height: 32px;
  padding: 0 12px 0 8px;
  background: linear-gradient(to bottom, #5aac28 0%, #3a8010 40%, #3a8010 60%, #5aac28 100%);
  border: 1px solid #1a5008;
  border-radius: 0 14px 14px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-family: var(--font);
  font-size: 13px;
  font-weight: bold;
  font-style: italic;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 2px 2px 6px rgba(0,0,0,0.4);
  flex-shrink: 0;
}

#xp-start-btn:hover {
  background: linear-gradient(to bottom, #70cc38 0%, #50a020 40%, #50a020 60%, #70cc38 100%);
}

.xp-start-logo { font-size: 20px; font-style: normal; }

/* ── TASKBAR WINDOW BUTTONS ── */
#xp-taskbar-windows {
  display: flex;
  gap: 3px;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.xp-taskbar-btn {
  height: 28px;
  max-width: 160px;
  min-width: 80px;
  padding: 0 8px;
  background: linear-gradient(to bottom, #4a7ac8 0%, #3060b0 100%);
  border: 1px solid #1a3880;
  border-radius: 2px;
  color: #fff;
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
}

.xp-taskbar-btn:hover {
  background: linear-gradient(to bottom, #5a90e0 0%, #4070c8 100%);
}

.xp-taskbar-btn.xp-tb-active {
  background: linear-gradient(to bottom, #2050a0 0%, #3060b0 100%);
  border-color: #0a2460;
  box-shadow: inset 1px 1px 3px rgba(0,0,0,0.4);
}

/* ── SYSTEM TRAY ── */
#xp-system-tray {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(to bottom, #1a3a7a, #0e2458);
  border: 1px solid #0a1a50;
  border-radius: 0 0 0 0;
  padding: 0 8px;
  height: 32px;
  flex-shrink: 0;
}

#xp-auth-tray {
  display: flex;
  align-items: center;
  gap: 6px;
}

.xp-tray-user {
  color: #c8d8f0;
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.xp-tray-user:hover { color: #fff; text-decoration: underline; }

.xp-tray-signout,
.xp-tray-signin {
  background: linear-gradient(to bottom, #3a60b0 0%, #2a4898 100%);
  border: 1px solid #1a2870;
  color: #fff;
  font-family: var(--font);
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 0;
}

.xp-tray-signout:hover,
.xp-tray-signin:hover {
  background: linear-gradient(to bottom, #5080d0 0%, #3060b8 100%);
}

#xp-clock {
  color: #c8d8f0;
  font-family: var(--font);
  font-size: 11px;
  text-align: center;
  min-width: 40px;
  border-left: 1px solid rgba(255,255,255,0.1);
  padding-left: 8px;
}

/* ── START MENU ── */
#xp-start-menu {
  position: fixed;
  bottom: 40px;
  left: 0;
  width: 280px;
  background: #fff;
  border: 1px solid var(--xp-border-outer);
  box-shadow: 4px 0 12px rgba(0,0,0,0.4);
  z-index: 10000;
  display: none;
}

.xp-start-header {
  background: linear-gradient(to right, #2462c9, #4a90d9);
  padding: 12px 16px;
  color: #fff;
  font-family: var(--font);
  font-size: 14px;
  font-weight: bold;
  border-bottom: 2px solid var(--xp-border-outer);
}

.xp-start-items {
  padding: 4px 0;
}

.xp-start-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  font-family: var(--font);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  color: #000;
}

.xp-start-item:hover {
  background: #316ac5;
  color: #fff;
}

.xp-start-separator {
  height: 1px;
  background: #d0ccc0;
  margin: 4px 0;
}

/* ── HOME WINDOW HEADER ── */
.xp-home-header { text-align: center; padding: 8px; }
.xp-home-header svg { max-width: 380px; display: block; margin: 0 auto; }
```

- [ ] **Step 2: Verify CSS added, no change yet**

Open `index.html` in browser. The page still shows the old tab-bar layout (XP shell elements don't exist in HTML yet). No errors in console. ✓

- [ ] **Step 3: Commit**

```bash
git add css/xp-shell.css
git commit -m "feat: add XP shell CSS (desktop, windows, taskbar, icons)"
```

---

## Task 3: Create XP shell JS

**Files:**
- Create: `js/xp-shell.js`

**Interfaces:**
- Produces: `openWindow(name)`, `closeWindow(name)`, `minimizeWindow(name)`, `maximizeWindow(name)`, `focusWindow(name)`, `startDrag(event, name)`, `toggleStartMenu()`, `closeStartMenu()` — all in global scope

- [ ] **Step 1: Create `js/xp-shell.js`**

```js
// XP window registry: name -> { el, minimized, maximized, savedTop, savedLeft, savedWidth, savedHeight }
var xpWindows = {};
var xpZTop = 100;
var xpDragState = null;

var XP_WIN_LABELS = {
  home:        '⚽ World Cup 2026',
  players:     '🏆 Players',
  matches:     '⏱️ Matches',
  groups:      '📋 Groups',
  leaderboard: '🏅 Leaderboard',
  teams:       '🌍 Teams',
  map:         '🌐 Battle Map',
  bracket:     '📊 Bracket',
  shooter:     '🔫 Shooter',
  myteams:     '⭐ My Teams',
  predictions: '🔮 Predictions',
  profile:     '👤 Profile'
};

function openWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  el.style.display = 'flex';
  if (!xpWindows[name]) {
    xpWindows[name] = { el: el, minimized: false, maximized: false };
  }
  xpWindows[name].minimized = false;
  focusWindow(name);
  xpSyncTaskbarBtn(name);
}

function closeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  el.style.display = 'none';
  delete xpWindows[name];
  xpRemoveTaskbarBtn(name);
  if (name === 'shooter' && typeof pauseShooter === 'function') pauseShooter();
}

function minimizeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  el.style.display = 'none';
  if (xpWindows[name]) xpWindows[name].minimized = true;
  xpSyncTaskbarBtn(name);
}

function maximizeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el || !xpWindows[name]) return;
  var state = xpWindows[name];
  if (state.maximized) {
    el.style.top    = state.savedTop;
    el.style.left   = state.savedLeft;
    el.style.width  = state.savedWidth;
    el.style.height = state.savedHeight || '';
    state.maximized = false;
  } else {
    state.savedTop    = el.style.top;
    state.savedLeft   = el.style.left;
    state.savedWidth  = el.style.width;
    state.savedHeight = el.style.height;
    el.style.top    = '0';
    el.style.left   = '0';
    el.style.width  = '100vw';
    el.style.height = '100%';  /* fills #xp-desktop which already excludes taskbar */
    state.maximized = true;
  }
  focusWindow(name);
}

function focusWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  xpZTop++;
  el.style.zIndex = xpZTop;
  document.querySelectorAll('.xp-window').forEach(function(w) {
    w.classList.remove('xp-focused');
  });
  el.classList.add('xp-focused');
  document.querySelectorAll('.xp-taskbar-btn').forEach(function(b) {
    b.classList.remove('xp-tb-active');
  });
  var btn = document.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  if (btn) btn.classList.add('xp-tb-active');
}

/* ── DRAG ── */
function startDrag(e, name) {
  if (e.button !== 0) return;
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  focusWindow(name);
  if (xpWindows[name] && xpWindows[name].maximized) return;
  var rect = el.getBoundingClientRect();
  xpDragState = { name: name, el: el, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
  document.addEventListener('mousemove', xpOnDragMove);
  document.addEventListener('mouseup', xpOnDragEnd);
  e.preventDefault();
}

function xpOnDragMove(e) {
  if (!xpDragState) return;
  var dx = e.clientX - xpDragState.startX;
  var dy = e.clientY - xpDragState.startY;
  xpDragState.el.style.left = (xpDragState.origLeft + dx) + 'px';
  xpDragState.el.style.top  = Math.max(0, xpDragState.origTop + dy) + 'px';
}

function xpOnDragEnd() {
  xpDragState = null;
  document.removeEventListener('mousemove', xpOnDragMove);
  document.removeEventListener('mouseup', xpOnDragEnd);
}

/* ── TASKBAR ── */
function xpSyncTaskbarBtn(name) {
  var strip = document.getElementById('xp-taskbar-windows');
  if (!strip) return;
  var btn = strip.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'xp-taskbar-btn';
    btn.dataset.win = name;
    btn.textContent = XP_WIN_LABELS[name] || name;
    btn.addEventListener('click', function() { xpTaskbarBtnClick(name); });
    strip.appendChild(btn);
  }
  var state = xpWindows[name];
  if (state && !state.minimized) {
    btn.classList.add('xp-tb-active');
  } else {
    btn.classList.remove('xp-tb-active');
  }
}

function xpTaskbarBtnClick(name) {
  var el = document.getElementById('xp-window-' + name);
  var state = xpWindows[name];
  if (!state || state.minimized) {
    openWindow(name);
    return;
  }
  /* if already focused, minimize; otherwise focus */
  if (el && parseInt(el.style.zIndex) === xpZTop) {
    minimizeWindow(name);
  } else {
    focusWindow(name);
  }
}

function xpRemoveTaskbarBtn(name) {
  var strip = document.getElementById('xp-taskbar-windows');
  if (!strip) return;
  var btn = strip.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  if (btn) btn.remove();
}

/* ── CLICK TO FOCUS ── */
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.xp-window').forEach(function(el) {
    el.addEventListener('mousedown', function() {
      var name = el.dataset.win;
      if (name) focusWindow(name);
    });
  });
});

/* ── CLOCK ── */
function xpUpdateClock() {
  var el = document.getElementById('xp-clock');
  if (!el) return;
  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  el.textContent = h + ':' + m;
}
setInterval(xpUpdateClock, 1000);
/* clock initialised after DOM ready — called from main.js init */

/* ── START MENU ── */
function toggleStartMenu() {
  var menu = document.getElementById('xp-start-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeStartMenu() {
  var menu = document.getElementById('xp-start-menu');
  if (menu) menu.style.display = 'none';
}

document.addEventListener('click', function(e) {
  var startBtn = document.getElementById('xp-start-btn');
  var menu = document.getElementById('xp-start-menu');
  if (!menu || !startBtn) return;
  if (!startBtn.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display = 'none';
  }
});

/* ── ICON SINGLE-CLICK SELECT ── */
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.xp-icon').forEach(function(icon) {
    icon.addEventListener('click', function(e) {
      document.querySelectorAll('.xp-icon').forEach(function(i) { i.classList.remove('xp-selected'); });
      icon.classList.add('xp-selected');
      e.stopPropagation();
    });
  });
  document.getElementById('xp-desktop').addEventListener('click', function() {
    document.querySelectorAll('.xp-icon').forEach(function(i) { i.classList.remove('xp-selected'); });
  });
});
```

- [ ] **Step 2: Verify JS loaded (no errors yet)**

Open browser devtools console. Confirm no `ReferenceError` for `xpWindows`, `openWindow`, etc. (they won't do anything visible yet — HTML elements they target don't exist until Task 4). ✓

- [ ] **Step 3: Commit**

```bash
git add js/xp-shell.js
git commit -m "feat: add XP shell JS (window manager, drag, taskbar, clock)"
```

---

## Task 4: Rebuild `index.html` and replace `layout.css`

**Files:**
- Modify: `index.html` (full rewrite)
- Modify: `css/layout.css` (full rewrite)

This is the biggest task. The tab-bar and `.container` go away. All section divs move inside `.xp-window` content panes. The Gazza header/SVG moves to the `home` window. After this task the XP desktop is visible and windows open on icon double-click.

- [ ] **Step 1: Replace `css/layout.css` entirely**

```css
/* ── WINDOW CONTENT LAYOUT ── */

/* Section divs inside windows are always visible */
.section-players, .section-matches, .section-groups,
.section-leaderboard, .section-teams, .section-myteams,
.section-predictions, .section-map, .section-shooter,
.section-profile, .section-bracket { display: block; }

/* Content layout tokens */
.lb-two-col { display: flex; gap: 20px; flex-wrap: wrap; }
.lb-col { flex: 1; min-width: 260px; }
.lb-col-header {
  font-family: var(--font);
  font-size: 11px;
  font-weight: bold;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
  padding: 0 2px;
}

/* Footer suppressed — taskbar replaces it */
footer { display: none; }

/* Auth bar suppressed — system tray replaces it */
.auth-bar { display: none; }

/* Tab bar suppressed — desktop icons replace it */
.tab-bar { display: none; }

/* War dispatch inside home window */
.war-dispatch { margin-bottom: 8px; }
```

- [ ] **Step 2: Rewrite `index.html`**

Replace the entire file. The structure below is complete — copy it exactly, filling in the SVG/content from the current file where indicated by comments.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Cup 2026 Sweepstakes</title>
  <link rel="mask-icon" href="favicon/safari-pinned-tab.svg" color="#2462c9">
  <link rel="icon" type="image/x-icon" href="favicon/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png">
  <link rel="manifest" href="favicon/site.webmanifest">
  <meta name="theme-color" content="#2462c9">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/xp-shell.css">
  <link rel="stylesheet" href="css/layout.css">
  <link rel="stylesheet" href="css/matches.css">
  <link rel="stylesheet" href="css/groups.css">
  <link rel="stylesheet" href="css/leaderboard.css">
  <link rel="stylesheet" href="css/teams.css">
  <link rel="stylesheet" href="css/dispatch.css">
  <link rel="stylesheet" href="css/predictions.css">
  <link rel="stylesheet" href="css/profile.css">
  <link rel="stylesheet" href="css/auth.css">
  <link rel="stylesheet" href="css/myteams.css">
  <link rel="stylesheet" href="css/globe.css">
  <link rel="stylesheet" href="css/shooter.css">
  <link rel="stylesheet" href="css/profile-picture.css">
  <link rel="stylesheet" href="css/user-profile.css">
  <link rel="stylesheet" href="css/bracket.css">
  <link rel="stylesheet" href="css/responsive.css">
  <link rel="stylesheet" href="css/update-notification.css">
</head>
<body>

<!-- ══════════════════════════════════════════════
     XP DESKTOP
═══════════════════════════════════════════════ -->
<div id="xp-desktop">

  <!-- ── DESKTOP ICONS ── -->
  <div id="xp-icons">
    <div class="xp-icon" data-window="home" ondblclick="openWindow('home')">
      <div class="xp-icon-img">⚽</div>
      <div class="xp-icon-label">World Cup 2026</div>
    </div>
    <div class="xp-icon" data-window="matches" ondblclick="openWindow('matches')">
      <div class="xp-icon-img">⏱️</div>
      <div class="xp-icon-label">Matches</div>
    </div>
    <div class="xp-icon" data-window="players" ondblclick="openWindow('players')">
      <div class="xp-icon-img">🏆</div>
      <div class="xp-icon-label">Players</div>
    </div>
    <div class="xp-icon" data-window="groups" ondblclick="openWindow('groups')">
      <div class="xp-icon-img">📋</div>
      <div class="xp-icon-label">Groups</div>
    </div>
    <div class="xp-icon" data-window="leaderboard" ondblclick="openWindow('leaderboard')">
      <div class="xp-icon-img">🏅</div>
      <div class="xp-icon-label">Leaderboard</div>
    </div>
    <div class="xp-icon" data-window="teams" ondblclick="openWindow('teams')">
      <div class="xp-icon-img">🌍</div>
      <div class="xp-icon-label">Teams</div>
    </div>
    <div class="xp-icon" data-window="map" ondblclick="openWindow('map')">
      <div class="xp-icon-img">🌐</div>
      <div class="xp-icon-label">Battle Map</div>
    </div>
    <div class="xp-icon" data-window="bracket" ondblclick="openWindow('bracket')">
      <div class="xp-icon-img">📊</div>
      <div class="xp-icon-label">Bracket</div>
    </div>
    <div class="xp-icon" data-window="shooter" ondblclick="openWindow('shooter')">
      <div class="xp-icon-img">🔫</div>
      <div class="xp-icon-label">Shooter</div>
    </div>
    <div class="xp-icon" data-window="profile" ondblclick="openWindow('profile')">
      <div class="xp-icon-img">👤</div>
      <div class="xp-icon-label">Profile</div>
    </div>
    <!-- auth-gated: shown by updateAuthBar() when signed in -->
    <div class="xp-icon xp-icon-auth" data-window="myteams" ondblclick="openWindow('myteams')" style="display:none">
      <div class="xp-icon-img">⭐</div>
      <div class="xp-icon-label">My Teams</div>
    </div>
    <div class="xp-icon xp-icon-auth" data-window="predictions" ondblclick="openWindow('predictions')" style="display:none">
      <div class="xp-icon-img">🔮</div>
      <div class="xp-icon-label">Predictions</div>
    </div>
  </div>

  <!-- ════════════════════════════════════════════
       WINDOWS
  ════════════════════════════════════════════ -->

  <!-- ── World Cup 2026 (home) ── -->
  <div class="xp-window" id="xp-window-home" data-win="home"
       style="display:none; top:50px; left:280px; width:520px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'home')">
      <span class="xp-title-icon">⚽</span>
      <span class="xp-title-text">World Cup 2026</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('home')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('home')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('home')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content xp-home-header">
      <div id="warDispatch" class="war-dispatch"></div>
      <!-- PASTE THE FULL <svg> CUM HEADER FROM THE ORIGINAL index.html HERE -->
      <svg width="100%" viewBox="0 0 320 255" role="img" aria-label="World Cup 2026 — Canada, USA, Mexico">
        <defs>
          <clipPath id="cC"><text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif">C</text></clipPath>
          <clipPath id="cU"><text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif">U</text></clipPath>
          <clipPath id="cM"><text x="0" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif">M</text></clipPath>
        </defs>
        <path id="archPath" d="M 10,75 Q 160,10 310,75" fill="none"/>
        <text font-size="13" font-weight="800" letter-spacing="5" fill="#888" font-family="system-ui,sans-serif">
          <textPath href="#archPath" startOffset="50%" text-anchor="middle">&#9733;  WORLD CUP 2026  &#9733;</textPath>
        </text>
        <g transform="translate(0,72)">
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round">C</text>
          <g clip-path="url(#cC)">
            <image href="https://flagcdn.com/w320/ca.png" x="-55" y="0" width="200" height="155" preserveAspectRatio="xMidYMid slice"/>
          </g>
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4.5">C</text>
        </g>
        <g transform="translate(102,72)">
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round">U</text>
          <g clip-path="url(#cU)">
            <image href="https://flagcdn.com/w320/us.png" x="10" y="0" width="115" height="155" preserveAspectRatio="xMidYMid slice"/>
          </g>
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4.5">U</text>
        </g>
        <g transform="translate(205,72)">
          <text x="0" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round">M</text>
          <g clip-path="url(#cM)">
            <image href="https://flagcdn.com/w320/mx.png" x="-40" y="0" width="185" height="155" preserveAspectRatio="xMidYMid slice"/>
          </g>
          <text x="0" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4.5">M</text>
        </g>
        <line x1="10" y1="242" x2="72" y2="242" stroke="#555" stroke-width="1"/>
        <text x="160" y="246" font-size="11" font-weight="700" textLength="160" lengthAdjust="spacing" fill="#999" font-family="system-ui,sans-serif" text-anchor="middle">CANADA · USA · MEXICO</text>
        <line x1="248" y1="242" x2="310" y2="242" stroke="#555" stroke-width="1"/>
      </svg>
      <!-- Gazza SVG filter -->
      <svg width="0" height="0" style="position:absolute">
        <defs>
          <filter id="gazza-ripple" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="5" result="noise">
              <animate attributeName="baseFrequency"
                values="0.012 0.018;0.018 0.028;0.01 0.022;0.016 0.02;0.012 0.018"
                dur="6s" repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>
      <img src="img/gazza-crying.jpg" alt="Gazza crying" style="width:100%;display:block;filter:url(#gazza-ripple);">
    </div>
  </div>

  <!-- ── Matches (open by default) ── -->
  <div class="xp-window" id="xp-window-matches" data-win="matches"
       style="top:44px; left:180px; width:880px; height:600px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'matches')">
      <span class="xp-title-icon">⏱️</span>
      <span class="xp-title-text">Matches</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('matches')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('matches')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('matches')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-matches" id="sectionMatches">
        <div class="matches-toolbar">
          <div class="filter-bar" id="matchTeamFilterBar">
            <button type="button" class="filter-btn active" data-filter="all" onclick="setMatchTeamFilter('all')">All Teams</button>
            <button type="button" class="filter-btn" data-filter="mine" onclick="setMatchTeamFilter('mine')">My Teams</button>
          </div>
          <div class="filter-bar" id="matchFilterBar">
            <button type="button" class="filter-btn active" data-filter="upcoming" onclick="setMatchFilter('upcoming', 'matches')">Upcoming</button>
            <button type="button" class="filter-btn" data-filter="completed" onclick="setMatchFilter('completed', 'matches')">Completed</button>
            <button type="button" class="filter-btn" data-filter="all" onclick="setMatchFilter('all', 'matches')">All</button>
          </div>
        </div>
        <div class="matches-grid" id="matches"></div>
      </div>
    </div>
  </div>

  <!-- ── Players ── -->
  <div class="xp-window" id="xp-window-players" data-win="players"
       style="display:none; top:64px; left:200px; width:880px; height:600px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'players')">
      <span class="xp-title-icon">🏆</span>
      <span class="xp-title-text">Players</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('players')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('players')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('players')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-players" id="sectionPlayers">
        <div class="people-grid" id="people"></div>
      </div>
    </div>
  </div>

  <!-- ── Groups ── -->
  <div class="xp-window" id="xp-window-groups" data-win="groups"
       style="display:none; top:84px; left:220px; width:960px; height:640px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'groups')">
      <span class="xp-title-icon">📋</span>
      <span class="xp-title-text">Groups</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('groups')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('groups')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('groups')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-groups" id="sectionGroups">
        <div class="groups-grid" id="groups"></div>
      </div>
    </div>
  </div>

  <!-- ── Leaderboard ── -->
  <div class="xp-window" id="xp-window-leaderboard" data-win="leaderboard"
       style="display:none; top:74px; left:210px; width:920px; height:620px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'leaderboard')">
      <span class="xp-title-icon">🏅</span>
      <span class="xp-title-text">Leaderboard</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('leaderboard')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('leaderboard')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('leaderboard')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-leaderboard" id="sectionLeaderboard">
        <div class="lb-two-col">
          <div class="lb-col">
            <div class="lb-col-header">⚽ Match Results</div>
            <div class="leaderboard-wrap card-base">
              <table class="leaderboard-table" id="matchLeaderboard">
                <thead><tr><th>#</th><th>Player</th><th class="wdl">W–D–L</th><th class="pts sortable" data-sort="pts" onclick="sortMatchLeaderboard('pts')">Pts <span class="sort-arrow" id="sortArrowMatchPts"></span></th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
            <p style="color:var(--text-muted);font-size:0.7rem;margin-top:8px;text-align:center;letter-spacing:0.02em">3 pts win · 1 pt draw</p>
          </div>
          <div class="lb-col">
            <div class="lb-col-header">🔮 Predictions</div>
            <div class="leaderboard-wrap card-base">
              <table class="leaderboard-table" id="predLeaderboard">
                <thead><tr><th>#</th><th>Player</th><th class="pts sortable" data-sort="predPts" onclick="sortPredLeaderboard('predPts')">Pts <span class="sort-arrow" id="sortArrowPredPts"></span></th><th class="sub-pts">Avg</th><th class="sub-pts">★</th><th class="sub-pts">🔥</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
            <p style="color:var(--text-muted);font-size:0.7rem;margin-top:8px;text-align:center;letter-spacing:0.02em">1 pt correct winner · +2 per exact score (max 5) · 🃏 doubles</p>
          </div>
        </div>
        <div id="awardsWrap"></div>
        <div id="jokerStatsWrap"></div>
      </div>
    </div>
  </div>

  <!-- ── Teams ── -->
  <div class="xp-window" id="xp-window-teams" data-win="teams"
       style="display:none; top:90px; left:230px; width:880px; height:600px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'teams')">
      <span class="xp-title-icon">🌍</span>
      <span class="xp-title-text">Teams</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('teams')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('teams')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('teams')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-teams" id="sectionTeams">
        <div class="team-chips" id="teamChips"></div>
        <div class="teams-toolbar">
          <div class="filter-bar" id="teamFilterBar">
            <button type="button" class="filter-btn active" data-filter="upcoming" onclick="setMatchFilter('upcoming', 'teams')">Upcoming</button>
            <button type="button" class="filter-btn" data-filter="completed" onclick="setMatchFilter('completed', 'teams')">Completed</button>
            <button type="button" class="filter-btn" data-filter="all" onclick="setMatchFilter('all', 'teams')">All</button>
          </div>
        </div>
        <div id="teamSchedule"></div>
      </div>
    </div>
  </div>

  <!-- ── Battle Map ── -->
  <div class="xp-window" id="xp-window-map" data-win="map"
       style="display:none; top:44px; left:160px; width:1040px; height:700px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'map')">
      <span class="xp-title-icon">🌐</span>
      <span class="xp-title-text">Battle Map</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('map')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('map')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('map')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content" style="padding:0; overflow:hidden;">
      <div class="section-map" id="sectionMap">
        <div class="globe-row" style="display:flex;align-items:stretch;flex:1;min-height:60vh">
          <div class="globe-wrap" id="globeWrap">
            <svg id="globeSvg"></svg>
            <button class="globe-reset" id="globeReset" onclick="resetGlobe()" title="Reset view">&#8635;</button>
          </div>
          <div class="drawer-backdrop" id="drawerBackdrop" onclick="closeVenuePanel()"></div>
          <div class="venue-panel" id="venuePanel">
            <div class="vp-header">
              <div>
                <div class="vp-name" id="vpName"></div>
                <div class="vp-city" id="vpCity"></div>
              </div>
              <button class="vp-close" onclick="closeVenuePanel()">&#10005;</button>
            </div>
            <div class="vp-matches" id="vpMatches"></div>
          </div>
        </div>
        <div class="territory-standings" id="territoryStandings" style="display:none">
          <div class="ts-title">The Territories</div>
          <div id="tsChampion"></div>
          <div class="ts-scores" id="tsScores"></div>
          <div class="ts-grid" id="tsGrid"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Bracket ── -->
  <div class="xp-window" id="xp-window-bracket" data-win="bracket"
       style="display:none; top:60px; left:170px; width:1100px; height:640px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'bracket')">
      <span class="xp-title-icon">📊</span>
      <span class="xp-title-text">Bracket</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('bracket')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('bracket')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('bracket')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-bracket" id="sectionBracket"></div>
    </div>
  </div>

  <!-- ── Shooter ── -->
  <div class="xp-window" id="xp-window-shooter" data-win="shooter"
       style="display:none; top:54px; left:240px; width:720px; height:560px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'shooter')">
      <span class="xp-title-icon">🔫</span>
      <span class="xp-title-text">Shooter</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('shooter')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('shooter')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('shooter')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content" style="padding:0; overflow:hidden; position:relative;">
      <div class="section-shooter" id="sectionShooter">
        <canvas id="shooter-canvas"></canvas>
        <video id="wave-clear-gif" autoplay muted playsinline loop></video>
        <video id="game-over-gif" autoplay muted playsinline loop></video>
        <div id="wave-clear-top" class="wave-clear-text"></div>
        <div id="wave-clear-bottom" class="wave-clear-text"></div>
        <div id="game-over-overlay"></div>
      </div>
    </div>
  </div>

  <!-- ── My Teams (auth-gated) ── -->
  <div class="xp-window" id="xp-window-myteams" data-win="myteams"
       style="display:none; top:80px; left:220px; width:880px; height:600px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'myteams')">
      <span class="xp-title-icon">⭐</span>
      <span class="xp-title-text">My Teams</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('myteams')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('myteams')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('myteams')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-myteams" id="sectionMyTeams">
        <div class="myteams-grid" id="myTeamsGrid"></div>
      </div>
    </div>
  </div>

  <!-- ── Predictions (auth-gated) ── -->
  <div class="xp-window" id="xp-window-predictions" data-win="predictions"
       style="display:none; top:80px; left:220px; width:880px; height:640px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'predictions')">
      <span class="xp-title-icon">🔮</span>
      <span class="xp-title-text">Predictions</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('predictions')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('predictions')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('predictions')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-predictions" id="sectionPredictions">
        <div class="predictions-wrap" id="predictionsWrap"></div>
      </div>
    </div>
  </div>

  <!-- ── Profile ── -->
  <div class="xp-window" id="xp-window-profile" data-win="profile"
       style="display:none; top:70px; left:210px; width:900px; height:620px;">
    <div class="xp-title-bar" onmousedown="startDrag(event,'profile')">
      <span class="xp-title-icon">👤</span>
      <span class="xp-title-text">Profile</span>
      <div class="xp-controls">
        <button class="xp-btn-min" onclick="minimizeWindow('profile')" title="Minimize">&#8211;</button>
        <button class="xp-btn-max" onclick="maximizeWindow('profile')" title="Maximize">&#9633;</button>
        <button class="xp-btn-close" onclick="closeWindow('profile')" title="Close">&#10005;</button>
      </div>
    </div>
    <div class="xp-window-content">
      <div class="section-profile" id="sectionProfile">
        <div id="userProfileContent"></div>
      </div>
    </div>
  </div>

  <!-- ══ TASKBAR ══ -->
  <div id="xp-taskbar">
    <button id="xp-start-btn" onclick="toggleStartMenu()">
      <span class="xp-start-logo">&#11088;</span>
      <span class="xp-start-text">start</span>
    </button>
    <div id="xp-taskbar-windows"></div>
    <div id="xp-system-tray">
      <div id="xp-auth-tray"></div>
      <div id="xp-clock">00:00</div>
    </div>
  </div>

  <!-- ══ START MENU ══ -->
  <div id="xp-start-menu">
    <div class="xp-start-header">
      <span id="xp-start-user-name">World Cup 2026</span>
    </div>
    <div class="xp-start-items">
      <button class="xp-start-item" onclick="openWindow('matches');closeStartMenu()">⏱️ Matches</button>
      <button class="xp-start-item" onclick="openWindow('players');closeStartMenu()">🏆 Players</button>
      <button class="xp-start-item" onclick="openWindow('groups');closeStartMenu()">📋 Groups</button>
      <button class="xp-start-item" onclick="openWindow('leaderboard');closeStartMenu()">🏅 Leaderboard</button>
      <div class="xp-start-separator"></div>
      <button class="xp-start-item" onclick="openWindow('teams');closeStartMenu()">🌍 Teams</button>
      <button class="xp-start-item" onclick="openWindow('map');closeStartMenu()">🌐 Battle Map</button>
      <button class="xp-start-item" onclick="openWindow('bracket');closeStartMenu()">📊 Bracket</button>
      <button class="xp-start-item" onclick="openWindow('shooter');closeStartMenu()">🔫 Shooter</button>
      <div class="xp-start-separator"></div>
      <button class="xp-start-item xp-start-item-auth" onclick="openWindow('myteams');closeStartMenu()" style="display:none">⭐ My Teams</button>
      <button class="xp-start-item xp-start-item-auth" onclick="openWindow('predictions');closeStartMenu()" style="display:none">🔮 Predictions</button>
      <button class="xp-start-item" onclick="openWindow('profile');closeStartMenu()">👤 Profile</button>
      <div class="xp-start-separator"></div>
      <button class="xp-start-item" onclick="openWindow('home');closeStartMenu()">⚽ About</button>
    </div>
  </div>

</div><!-- #xp-desktop -->

<!-- ════════════════════════════════════════════
     MODALS — outside desktop, overlay everything
════════════════════════════════════════════ -->

<!-- Sign In Modal -->
<div class="auth-modal-overlay" id="signInModal">
  <div class="auth-modal">
    <h2>Sign in</h2>
    <div class="error-msg" id="signInError"></div>
    <label>Email</label>
    <input type="email" id="signInEmail" placeholder="you@email.com" onkeydown="if(event.key==='Enter')doSignIn()">
    <label>Password</label>
    <input type="password" id="signInPassword" placeholder="Your password" onkeydown="if(event.key==='Enter')doSignIn()">
    <div class="btn-row">
      <button class="btn-ghost" onclick="closeModals()">Cancel</button>
      <button class="btn-primary" onclick="doSignIn()">Sign in</button>
    </div>
    <div class="switch-link">No account? <a onclick="showSignUp()">Create one</a></div>
  </div>
</div>

<!-- Sign Up Modal -->
<div class="auth-modal-overlay" id="signUpModal">
  <div class="auth-modal">
    <h2>Create account</h2>
    <div class="error-msg" id="signUpError"></div>
    <label>Your name</label>
    <select id="signUpPlayer">
      <option value="">Choose your sweepstakes name…</option>
      <option>Anton</option><option>Chris</option><option>Dan</option>
      <option>Laurie</option><option>Pat</option><option>Steven</option>
    </select>
    <label>Email</label>
    <input type="email" id="signUpEmail" placeholder="you@email.com" onkeydown="if(event.key==='Enter')doSignUp()">
    <label>Password</label>
    <input type="password" id="signUpPassword" placeholder="6+ characters" onkeydown="if(event.key==='Enter')doSignUp()">
    <label>Invite code</label>
    <input type="text" id="signUpCode" placeholder="Enter sweepstakes code" onkeydown="if(event.key==='Enter')doSignUp()">
    <div class="btn-row">
      <button class="btn-ghost" onclick="closeModals()">Cancel</button>
      <button class="btn-primary" onclick="doSignUp()">Create account</button>
    </div>
    <div class="switch-link">Already have an account? <a onclick="showSignIn()">Sign in</a></div>
  </div>
</div>

<!-- Joker Reset Notification -->
<div class="auth-modal-overlay" id="jokerResetModal">
  <div class="auth-modal">
    <div style="font-size:3rem;text-align:center;line-height:1;margin-bottom:12px">🃏</div>
    <h2 style="text-align:center">Jokers Reset</h2>
    <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.5;margin-bottom:18px">All jokers have been wiped from previous matchdays. Please re-apply your jokers on upcoming matches before they kick off.</p>
    <div class="btn-row">
      <button class="btn-primary" onclick="dismissJokerNotification()">OK</button>
    </div>
  </div>
</div>

<!-- Team Result Notification -->
<div class="auth-modal-overlay" id="teamResultModal">
  <div class="auth-modal" style="text-align:center">
    <canvas id="confettiCanvas" style="position:fixed;inset:0;pointer-events:none;z-index:200"></canvas>
    <div class="result-emoji" id="resultEmoji" style="font-size:3.5rem;line-height:1;margin-bottom:8px"></div>
    <h2 style="text-align:center;margin-bottom:4px" id="resultTitle"></h2>
    <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:4px" id="resultSubtitle"></p>
    <div id="resultDetails" style="text-align:left;margin-bottom:18px;font-size:0.88rem;color:var(--text-secondary);line-height:1.6"></div>
    <div class="btn-row">
      <button class="btn-primary" onclick="dismissTeamResults()">Got it</button>
    </div>
  </div>
</div>

<!-- Player Profile Modal -->
<div class="profile-overlay" id="profileOverlay" onclick="if(event.target===this)closeProfile()">
  <div class="profile-card" id="profileCard"></div>
</div>

<!-- Match Predictions Panel -->
<div class="pred-panel-overlay" id="predPanelOverlay" onclick="if(event.target===this)closePredPanel()">
  <div class="pred-panel" id="predPanel"></div>
</div>

<!-- Joker Video Overlay -->
<div id="joker-video-overlay" onclick="closeJokerVideo()">
  <video id="joker-video" src="media/joker.mp4" preload="auto" playsinline></video>
</div>

<!-- ════════════════════════════════════════════
     SCRIPTS
════════════════════════════════════════════ -->
<script src="h2h-data.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-server@3/dist/topojson-server.min.js"></script>
<script src="js/config.js"></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<script src="js/data.js"></script>
<script src="js/render-matches.js"></script>
<script src="js/render-groups.js"></script>
<script src="js/render-leaderboard.js"></script>
<script src="js/render-predictions.js"></script>
<script src="js/render-teams.js"></script>
<script src="js/render-myteams.js"></script>
<script src="js/render-profile.js"></script>
<script src="js/globe.js"></script>
<script src="js/shooter.js"></script>
<script src="js/team-results.js"></script>
<script src="js/profile-picture.js"></script>
<script src="js/render-user-profile.js"></script>
<script src="js/render-bracket.js"></script>
<script src="js/xp-shell.js"></script>
<script src="js/version.js"></script>
<script src="js/version-refresh.js"></script>
<script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Open in browser and verify desktop visible**

Expected: 
- Bliss wallpaper gradient fills the viewport
- Desktop icons visible top-left
- Taskbar at bottom with Start button and clock
- Matches window open in the centre
- Double-clicking other icons opens their windows
- Windows are draggable by their title bars

- [ ] **Step 4: Commit**

```bash
git add index.html css/layout.css
git commit -m "feat: rebuild index.html as XP desktop; replace layout.css"
```

---

## Task 5: Update `main.js`

**Files:**
- Modify: `js/main.js`

Replace `switchTab()` with an XP-aware shim that calls `openWindow()` and preserves all side-effect hooks. Update the init to open the Matches window and start the clock.

- [ ] **Step 1: Replace `js/main.js` entirely**

```js
function switchTab(tab) {
  openWindow(tab);
  if (tab === 'teams') renderTeamChips();
  if (tab === 'map') { initGlobe(); renderTerritoryStandings(); }
  if (tab !== 'map') stopAutoRotate();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'myteams') renderMyTeams();
  if (tab === 'predictions') renderPredictions();
  if (tab === 'bracket') renderBracket();
  if (tab === 'shooter') initShooter();
  if (tab !== 'shooter') pauseShooter();
  var tabHash = (tab === 'profile' && typeof userProfilePlayer !== 'undefined' && userProfilePlayer)
    ? '#/users/' + encodeURIComponent(userProfilePlayer)
    : '#/' + tab;
  history.pushState(null, '', tabHash);
}

// ── INIT ──
restoreSession().then(async function() {
  await preloadAvatars(PLAYERS).catch(function() {});
  return loadData().then(function() {
    renderWarDispatch();
    checkTeamResults();
    xpUpdateClock();
    handleHashRoute();
    // Open Matches by default if no hash navigates elsewhere
    if (!location.hash || location.hash === '#/' || location.hash === '#/matches') {
      openWindow('matches');
    }
  });
});
setInterval(renderMatches, 60000);
setInterval(function() { if (typeof selectedTeam !== 'undefined' && selectedTeam) renderTeamSchedule(); }, 60000);
setInterval(function() { loadData().then(function() { renderWarDispatch(); checkTeamResults(); }); }, 180000);
```

- [ ] **Step 2: Verify in browser**

Open app. Matches window should open automatically on load. Clicking a desktop icon should open the correct window. Clicking Players in the start menu should open the Players window. Clicking Teams in a My Teams card should open the Teams window (calls `switchTab('teams')` → `openWindow('teams')`).

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: replace switchTab with XP openWindow shim in main.js"
```

---

## Task 6: Update `auth.js`

**Files:**
- Modify: `js/auth.js`

Replace `updateAuthBar()` to update the system tray (`#xp-auth-tray`) and show/hide the auth-gated desktop icons + Start Menu items instead of injecting tab buttons.

- [ ] **Step 1: Replace `updateAuthBar()` in `js/auth.js`**

Find the existing `updateAuthBar()` function (lines 17–33) and replace it with:

```js
function updateAuthBar() {
  var tray = document.getElementById('xp-auth-tray');
  if (tray) {
    if (currentSession && currentProfile) {
      tray.innerHTML = '<a class="xp-tray-user" onclick="openWindow(\'profile\')">'
        + avatarHtml(currentProfile.player_name, 16)
        + ' ' + currentProfile.player_name + '</a>'
        + ' <button class="xp-tray-signout" onclick="doSignOut()">Sign out</button>';
    } else {
      tray.innerHTML = '<button class="xp-tray-signin" onclick="showSignIn()">Sign in</button>';
    }
  }

  var authed = !!(currentSession && currentProfile);

  // Desktop icons
  document.querySelectorAll('.xp-icon-auth').forEach(function(el) {
    el.style.display = authed ? 'flex' : 'none';
  });

  // Start menu auth items
  document.querySelectorAll('.xp-start-item-auth').forEach(function(el) {
    el.style.display = authed ? 'flex' : 'none';
  });

  // Start menu user name
  var startUser = document.getElementById('xp-start-user-name');
  if (startUser) {
    startUser.textContent = (authed && currentProfile) ? currentProfile.player_name : 'World Cup 2026';
  }
}
```

Also remove the `tabBar` reference inside the old function — confirm there is no remaining reference to `tabBar.querySelectorAll('.auth-tab')` or `tabBar.insertAdjacentHTML` in `auth.js`. If any remain, delete them.

- [ ] **Step 2: Verify in browser**

Sign in. Expected:
- System tray shows your player name + "Sign out" button.
- My Teams and Predictions icons appear on the desktop.
- My Teams and Predictions items appear in the Start Menu.
- Start Menu header shows your player name.

Sign out. Expected: tray shows "Sign in" button; auth-gated icons disappear.

- [ ] **Step 3: Commit**

```bash
git add js/auth.js
git commit -m "feat: update updateAuthBar to drive XP system tray + desktop icons"
```

---

## Task 7: Windows Mobile skin

**Files:**
- Modify: `css/responsive.css` (full rewrite)
- Modify: `css/xp-shell.css` (append mobile section)

Replace the old mobile tab-bar overrides with a Windows Mobile / Pocket PC skin for ≤700px.

- [ ] **Step 1: Replace `css/responsive.css` entirely**

```css
/* ── WINDOWS MOBILE / POCKET PC SKIN (≤700px) ── */
@media (max-width: 700px) {

  /* Desktop fills full viewport — taskbar still at bottom */
  #xp-desktop {
    inset: 30px 0 40px 0;   /* top bar 30px, taskbar 40px */
    background:
      linear-gradient(to bottom,
        #1a6aaf 0%, #4d9fd4 42%, #7ec8a0 58%, #4a8f3a 72%, #3d7a2e 100%);
  }

  /* Hide desktop icons — today screen replaces them */
  #xp-icons { display: none; }

  /* All windows fill the viewport between the two bars */
  .xp-window {
    position: fixed !important;
    top: 30px !important;
    left: 0 !important;
    width: 100vw !important;
    height: calc(100vh - 70px) !important;  /* 30px top bar + 40px taskbar */
    display: none !important;
    z-index: 50 !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  .xp-window.xp-mob-open {
    display: flex !important;
  }

  /* Title bar — slimmer on mobile */
  .xp-title-bar { height: 26px; font-size: 10px; cursor: default; }
  .xp-title-text { font-size: 11px; }
  .xp-btn-min, .xp-btn-max { display: none; }  /* only show close */
  .xp-btn-close { width: 24px; height: 24px; }

  /* Top title bar (Pocket PC style) */
  #xp-mob-topbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 30px;
    background: linear-gradient(to bottom, #4a90d9, #2462c9);
    color: #fff;
    font-family: var(--font);
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    border-bottom: 1px solid #0a246a;
  }

  /* Today screen — shown when no window is open */
  #xp-today {
    position: fixed;
    top: 30px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 70px);
    background: var(--xp-surface);
    overflow-y: auto;
    z-index: 40;
  }

  .xp-today-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font);
    font-size: 13px;
    cursor: pointer;
    background: none;
    width: 100%;
    text-align: left;
    color: var(--text);
    border-left: none;
    border-right: none;
    border-top: none;
  }

  .xp-today-item:hover { background: #e8e4d4; }
  .xp-today-item-icon { font-size: 24px; }
  .xp-today-item-label { flex: 1; }
  .xp-today-item-arrow { color: var(--text-muted); }

  /* Taskbar on mobile */
  #xp-taskbar { height: 40px; padding: 0 8px; }
  #xp-start-btn { border-radius: 0 4px 4px 0; font-size: 11px; padding: 0 10px 0 6px; }
  #xp-taskbar-windows { display: none; }  /* no window buttons — use today screen */
  #xp-system-tray { gap: 6px; padding: 0 6px; }
  #xp-clock { font-size: 11px; }

  /* Start menu on mobile — full width slide up */
  #xp-start-menu {
    width: 100vw;
    max-height: 70vh;
    overflow-y: auto;
    bottom: 40px;
  }

  /* Content legibility inside windows on mobile */
  .xp-window-content { padding: 6px; font-size: 12px; }

  /* Grids */
  .people-grid { grid-template-columns: 1fr; }
  .matches-grid { grid-template-columns: 1fr; }
  .groups-grid { grid-template-columns: 1fr; }

  /* Match rows */
  .match-row { padding: 10px 12px; }
  .match-date { display: none; }
  .match-meta-mobile { display: flex !important; align-items: center; gap: 8px; font-size: 0.68rem; color: var(--text-muted); margin-bottom: 6px; }
  .match-body { gap: 0; }
  .match-team-home .team-name-label, .match-team-away .team-name-label { font-size: 0.78rem; }
  .match-flag { width: 70px; height: 48px; }
  .match-centre { width: 56px; }
  .match-score-pill { font-size: 0.85rem; padding: 4px 7px; }
  .match-prob-bar { height: 12px; opacity: 1; }
  .match-prob-bar .prob-seg { color: rgba(0,0,0,0.65); }
  .match-owner { font-size: 0.58rem; padding: 1px 5px; }

  /* Leaderboard */
  .leaderboard-table .wdl { display: none; }
  .leaderboard-table th, .leaderboard-table td { padding: 10px 12px; }
  .lb-two-col { flex-direction: column; }

  /* Predictions */
  .pred-match-card .pmc-inner { flex-direction: column; align-items: flex-start; gap: 10px; padding: 12px 14px; }
  .pred-match-card .pmc-date { min-width: unset; }
  .pred-match-card .pmc-teams { font-size: 0.85rem; }
  .pred-summary { gap: 8px; }
  .pred-stat { padding: 10px 12px; }
  .pred-stat .ps-num { font-size: 1.3rem; }

  /* Hide shooter on mobile */
  .xp-icon[data-window="shooter"] { display: none; }
}

@media (prefers-reduced-motion: reduce) {}
```

- [ ] **Step 2: Add mobile Today screen to `index.html`**

Insert the following immediately after `<div id="xp-desktop">` (before the `#xp-icons` div):

```html
  <!-- Today screen (mobile only) -->
  <div id="xp-today">
    <button class="xp-today-item" ondblclick="openWindow('matches')">
      <span class="xp-today-item-icon">⏱️</span>
      <span class="xp-today-item-label">Matches</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item" ondblclick="openWindow('players')">
      <span class="xp-today-item-icon">🏆</span>
      <span class="xp-today-item-label">Players</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item" ondblclick="openWindow('groups')">
      <span class="xp-today-item-icon">📋</span>
      <span class="xp-today-item-label">Groups</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item" ondblclick="openWindow('leaderboard')">
      <span class="xp-today-item-icon">🏅</span>
      <span class="xp-today-item-label">Leaderboard</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item" ondblclick="openWindow('teams')">
      <span class="xp-today-item-icon">🌍</span>
      <span class="xp-today-item-label">Teams</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item" ondblclick="openWindow('map')">
      <span class="xp-today-item-icon">🌐</span>
      <span class="xp-today-item-label">Battle Map</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item" ondblclick="openWindow('bracket')">
      <span class="xp-today-item-icon">📊</span>
      <span class="xp-today-item-label">Bracket</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item xp-today-auth" ondblclick="openWindow('myteams')" style="display:none">
      <span class="xp-today-item-icon">⭐</span>
      <span class="xp-today-item-label">My Teams</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item xp-today-auth" ondblclick="openWindow('predictions')" style="display:none">
      <span class="xp-today-item-icon">🔮</span>
      <span class="xp-today-item-label">Predictions</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
    <button class="xp-today-item" ondblclick="openWindow('profile')">
      <span class="xp-today-item-icon">👤</span>
      <span class="xp-today-item-label">Profile</span>
      <span class="xp-today-item-arrow">›</span>
    </button>
  </div>

  <!-- Mobile top bar (Pocket PC style) -->
  <div id="xp-mob-topbar">World Cup 2026</div>
```

- [ ] **Step 3: Update `js/xp-shell.js` — mobile window open/close**

Append to `js/xp-shell.js`:

```js
/* ── MOBILE: open/close hooks ── */
var XP_IS_MOBILE = function() { return window.innerWidth <= 700; };

var _origOpenWindow = openWindow;
openWindow = function(name) {
  _origOpenWindow(name);
  if (XP_IS_MOBILE()) {
    document.querySelectorAll('.xp-window').forEach(function(w) {
      w.classList.remove('xp-mob-open');
    });
    var el = document.getElementById('xp-window-' + name);
    if (el) el.classList.add('xp-mob-open');
    var topbar = document.getElementById('xp-mob-topbar');
    if (topbar) topbar.textContent = (XP_WIN_LABELS[name] || name).replace(/^.+ /, '');
    var today = document.getElementById('xp-today');
    if (today) today.style.display = 'none';
  }
};

var _origCloseWindow = closeWindow;
closeWindow = function(name) {
  _origCloseWindow(name);
  if (XP_IS_MOBILE()) {
    var el = document.getElementById('xp-window-' + name);
    if (el) el.classList.remove('xp-mob-open');
    var anyOpen = document.querySelector('.xp-window.xp-mob-open');
    if (!anyOpen) {
      var today = document.getElementById('xp-today');
      if (today) today.style.display = 'block';
      var topbar = document.getElementById('xp-mob-topbar');
      if (topbar) topbar.textContent = 'World Cup 2026';
    }
  }
};
```

Also update `updateAuthBar()` in `auth.js` to show/hide `.xp-today-auth` items alongside `.xp-icon-auth`:

In the `updateAuthBar` function, after the `.xp-start-item-auth` block, add:
```js
  document.querySelectorAll('.xp-today-auth').forEach(function(el) {
    el.style.display = authed ? 'flex' : 'none';
  });
```

- [ ] **Step 4: Verify on mobile (resize browser to ≤700px)**

Expected:
- Bliss wallpaper shows between top bar and taskbar
- Today screen lists all sections
- Tapping a Today item (single or double click) opens that section fullscreen
- Top bar shows the section name
- Closing a window returns to Today screen

- [ ] **Step 5: Commit**

```bash
git add css/responsive.css js/xp-shell.js js/auth.js index.html
git commit -m "feat: add Windows Mobile Pocket PC skin for ≤700px"
```

---

## Task 8: XP dialog modals

**Files:**
- Modify: `css/auth.css`

Restyle `.auth-modal` to look like an XP dialog box — white body, `#ece9d8` button strip, XP title bar, raised buttons.

- [ ] **Step 1: Replace `css/auth.css` entirely**

```css
/* ── AUTH OVERLAY ── */
.auth-modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 10000;
  justify-content: center;
  align-items: center;
}
.auth-modal-overlay.active { display: flex; }

/* ── XP DIALOG BOX ── */
.auth-modal {
  background: var(--xp-surface);
  border: 3px solid;
  border-color: #5ba6e8 #1a52b0 #1a52b0 #5ba6e8;
  outline: 1px solid var(--xp-border-outer);
  box-shadow: 4px 4px 14px rgba(0,0,0,0.55);
  width: 360px;
  max-width: 92vw;
  font-family: var(--font);
  font-size: 11px;
}

/* Title bar for dialogs */
.auth-modal h2 {
  background: linear-gradient(to bottom, var(--xp-titlebar-start), var(--xp-titlebar-end));
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  padding: 6px 10px;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  font-family: var(--font);
}

/* Dialog body */
.auth-modal label {
  display: block;
  font-size: 11px;
  color: var(--text);
  margin-bottom: 2px;
  font-weight: normal;
  padding: 0 12px;
}

.auth-modal label:first-of-type { margin-top: 12px; }

.auth-modal input,
.auth-modal select {
  width: calc(100% - 24px);
  margin: 0 12px 10px;
  padding: 3px 4px;
  border: 1px solid var(--xp-border-sh);
  border-top-color: #555;
  border-left-color: #555;
  background: #fff;
  font-family: var(--font);
  font-size: 11px;
  color: var(--text);
  display: block;
}

.auth-modal input:focus,
.auth-modal select:focus {
  outline: 1px dotted var(--accent);
}

/* Button strip */
.auth-modal .btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 8px 12px;
  background: var(--xp-surface);
  border-top: 1px solid var(--xp-border-sh);
  margin-top: 4px;
}

/* XP pushbuttons */
.auth-modal button {
  min-width: 75px;
  padding: 4px 12px;
  background: linear-gradient(to bottom, #f8f6f0 0%, #e0dcd0 100%);
  border: 1px solid var(--xp-border-sh);
  border-top-color: var(--xp-border-hi);
  border-left-color: var(--xp-border-hi);
  font-family: var(--font);
  font-size: 11px;
  color: var(--text);
  cursor: pointer;
  box-shadow: 1px 1px 0 var(--xp-border-sh);
}

.auth-modal button:hover {
  background: linear-gradient(to bottom, #e8f0ff 0%, #c0d0f0 100%);
  border-color: var(--accent);
}

.auth-modal button:active {
  background: linear-gradient(to bottom, #d0d8f0 0%, #e8f0ff 100%);
  border-color: var(--accent);
  box-shadow: none;
  transform: translateY(1px);
}

.auth-modal .btn-primary {
  font-weight: bold;
  border: 2px solid var(--xp-border-sh);
}

.auth-modal .btn-ghost { background: linear-gradient(to bottom, #f8f6f0 0%, #e0dcd0 100%); }

.auth-modal .error-msg {
  color: var(--live);
  font-size: 11px;
  margin: 4px 12px 4px;
  display: none;
}

.auth-modal .switch-link {
  text-align: center;
  padding: 0 12px 10px;
  font-size: 11px;
  color: var(--text-muted);
}

.auth-modal .switch-link a {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}

.auth-modal .switch-link a:hover { text-decoration: underline; }

.my-teams-badge {
  background: var(--accent);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 1px 7px;
  margin-left: 6px;
}
```

- [ ] **Step 2: Verify dialogs in browser**

Click "Sign in" in the system tray. Expected: a dialog box appears with a Luna blue title bar labelled "Sign in", white input fields with sunken bevel, XP-style pushbuttons at the bottom in a `#ece9d8` strip. The Joker Reset and Team Result modals should look the same.

- [ ] **Step 3: Commit**

```bash
git add css/auth.css
git commit -m "feat: restyle auth modals as XP dialog boxes"
```

---

## Self-Review Checklist

Run after writing the plan:

1. **Spec coverage:**
   - ✅ Bliss wallpaper — Task 2 (CSS gradient)
   - ✅ Desktop icons + double-click open — Task 4 (HTML) + Task 3 (JS `openWindow`)
   - ✅ XP title bars + control buttons — Tasks 2 + 4
   - ✅ Draggable windows — Task 3 (`startDrag`)
   - ✅ Taskbar + Start button — Tasks 2 + 4
   - ✅ System tray clock — Task 3 (`xpUpdateClock`)
   - ✅ Auth-gated icons — Tasks 4 + 6
   - ✅ `switchTab()` preserved as shim — Task 5
   - ✅ All section IDs preserved — Task 4
   - ✅ Windows Mobile skin — Task 7
   - ✅ XP dialog modals — Task 8
   - ✅ XP design tokens — Task 1
   - ✅ `--radius: 0px` — Task 1
   - ✅ Tahoma font — Task 1

2. **Type consistency:** `openWindow`, `closeWindow`, `minimizeWindow`, `maximizeWindow`, `focusWindow`, `startDrag`, `toggleStartMenu`, `closeStartMenu`, `xpUpdateClock` are all defined in Task 3 and called consistently in Tasks 4–7.

3. **No placeholders:** All steps contain actual code.
