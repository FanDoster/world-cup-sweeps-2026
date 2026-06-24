# XP Startup Sound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play the Windows XP startup sound once per page load the first time any window is opened.

**Architecture:** Download audio from YouTube via yt-dlp, commit it to `media/startup.mp3`, then add a one-shot play guard (`xpStartupPlayed`) at the top of `openWindow()` in `js/xp-shell.js`. No new files beyond the MP3 — the flag and play call live inline in the existing function.

**Tech Stack:** Plain JS (HTML5 Audio API), yt-dlp + ffmpeg for audio extraction, no build step.

## Global Constraints

- No build step, no ES modules, no package.json — plain JS loaded via `<script src>`.
- All scripts run in global scope (`file://` compatible).
- No new JS files — change goes inside `js/xp-shell.js` only.
- Audio plays at most once per page load (flag NOT persisted to localStorage).
- `new Audio(...).play().catch(function(){})` — silence autoplay policy rejections silently; no user-visible error.
- `openWindow()` is always called from a user-gesture handler, so autoplay is permitted.
- yt-dlp binary: `/opt/homebrew/bin/yt-dlp`; ffmpeg binary: `/opt/homebrew/bin/ffmpeg`.
- Output audio file: `media/startup.mp3` (relative to repo root).

---

### Task 1: Download the startup sound

**Files:**
- Create: `media/startup.mp3`

**Interfaces:**
- Consumes: nothing
- Produces: `media/startup.mp3` — an MP3 audio file loadable by `new Audio('media/startup.mp3')`

- [ ] **Step 1: Create the media/ directory if it doesn't exist**

```bash
mkdir -p media
```

Expected: directory exists (no error).

- [ ] **Step 2: Download and convert audio**

```bash
/opt/homebrew/bin/yt-dlp -x --audio-format mp3 \
  --ffmpeg-location /opt/homebrew/bin \
  -o "media/startup.%(ext)s" \
  https://www.youtube.com/watch?v=7nQ2oiVqKHw
```

Expected: `media/startup.mp3` exists and is > 0 bytes. Verify:

```bash
ls -lh media/startup.mp3
```

Expected output (example): `-rw-r--r--  1 user  staff   1.2M 23 Jun 12:34 media/startup.mp3`

- [ ] **Step 3: Verify the file is a valid MP3**

```bash
/opt/homebrew/bin/ffmpeg -i media/startup.mp3 -f null - 2>&1 | tail -5
```

Expected: last line contains `video:0kB audio:` with no errors. A line like `size=N kB time=00:00:XX` confirms a valid audio stream.

- [ ] **Step 4: Commit**

```bash
git add media/startup.mp3
git commit -m "feat: add XP startup sound (media/startup.mp3)"
```

---

### Task 2: Wire up one-shot playback in xp-shell.js

**Files:**
- Modify: `js/xp-shell.js` (lines 1–31 — top of file through end of `openWindow`)

**Interfaces:**
- Consumes: `media/startup.mp3` from Task 1
- Produces: `xpStartupPlayed` global flag (boolean, starts `false`); `openWindow()` plays the sound on first call

**Verify before starting:** Open `js/xp-shell.js` and confirm line 1 starts with `// XP window registry` and `openWindow` begins at line 21 with `function openWindow(name) {`.

- [ ] **Step 1: Manually verify the current openWindow function looks like this**

Read `js/xp-shell.js` lines 1–31. Confirm:
```js
// XP window registry: name -> { el, minimized, maximized, savedTop, savedLeft, savedWidth, savedHeight }
var xpWindows = {};
var xpZTop = 100;
var xpDragState = null;
// ... XP_WIN_LABELS ...
function openWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  el.style.display = 'flex';
  // ...
}
```

If the structure differs, read the actual file before proceeding.

- [ ] **Step 2: Add the startup-played flag after the existing top-of-file globals**

In `js/xp-shell.js`, after line 4 (`var xpDragState = null;`), insert one new line:

```js
var xpStartupPlayed = false;
```

Result: lines 1–5 should now read:
```js
// XP window registry: name -> { el, minimized, maximized, savedTop, savedLeft, savedWidth, savedHeight }
var xpWindows = {};
var xpZTop = 100;
var xpDragState = null;
var xpStartupPlayed = false;
```

- [ ] **Step 3: Add the one-shot play call at the top of openWindow()**

Inside `openWindow(name)`, immediately after `var el = document.getElementById('xp-window-' + name);` and `if (!el) return;`, insert the startup sound block. The function should become:

```js
function openWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  if (!xpStartupPlayed) {
    xpStartupPlayed = true;
    new Audio('media/startup.mp3').play().catch(function(){});
  }
  el.style.display = 'flex';
  if (!xpWindows[name]) {
    xpWindows[name] = { el: el, minimized: false, maximized: false };
  }
  xpWindows[name].minimized = false;
  focusWindow(name);
  xpSyncTaskbarBtn(name);
}
```

- [ ] **Step 4: Verify the edit looks right**

Read `js/xp-shell.js` lines 1–38 and confirm the flag declaration is present and the `if (!xpStartupPlayed)` block is the first thing inside `openWindow` after the early return.

- [ ] **Step 5: Manual smoke test**

Open `index.html` in a browser (or the live site after deploy). Double-click any desktop icon. Confirm you hear the startup sound. Double-click a second icon — no second sound plays. Reload the page and double-click again — sound plays once more.

- [ ] **Step 6: Commit**

```bash
git add js/xp-shell.js
git commit -m "feat: play XP startup sound once per page load on first window open"
```

---

### Task 3: Push to remote

- [ ] **Step 1: Push main**

```bash
git push origin main
```

Expected: GitHub Actions deploys to `world-cup-sweeps-2026.surge.sh`. Confirm deploy succeeds in the Actions tab.
