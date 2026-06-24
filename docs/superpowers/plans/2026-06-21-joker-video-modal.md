# Joker Video Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a full-screen frameless video modal with sound when a player enables their joker pick, preloaded in the background so playback is instant.

**Architecture:** A single `<video preload="auto">` element lives in the DOM from page load so the browser buffers the file while idle. A full-screen black overlay wraps it. Both joker toggle functions (`toggleJoker` and `toggleJokerFromPanel` in `js/render-predictions.js`) call `playJokerVideo()` when the joker is being turned on. The modal closes when the video ends or the user clicks anywhere.

**Tech Stack:** Vanilla JS, plain HTML/CSS — no build step, no npm, no modules.

## Global Constraints

- No ES modules — all functions must be global scope
- No build step — edit files directly
- `media/joker.mp4` must be committed to the repo so it deploys to Surge
- Do not add `controls` attribute to the `<video>` element
- z-index for the overlay must be ≥ 500 (existing max is pred-panel-overlay at 210)

---

### Task 1: Download the video file

**Files:**
- Create: `media/joker.mp4`

**Interfaces:**
- Produces: `media/joker.mp4` — the video asset consumed by Tasks 2 and 3

- [ ] **Step 1: Check yt-dlp is installed**

```bash
yt-dlp --version
```

Expected: version string like `2024.x.x`. If not found, install:
```bash
brew install yt-dlp
```

- [ ] **Step 2: Create media directory and download video**

```bash
mkdir -p /Users/stevenfrostwick/Documents/world-cup-sweeps-2026/media
cd /Users/stevenfrostwick/Documents/world-cup-sweeps-2026
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" \
  -o "media/joker.%(ext)s" \
  "https://www.youtube.com/watch?v=Qhj2VW1LVck"
```

Expected: file downloaded, ending with something like `[Merger] Merging formats into "media/joker.mp4"`.

- [ ] **Step 3: Verify the file exists and is non-empty**

```bash
ls -lh /Users/stevenfrostwick/Documents/world-cup-sweeps-2026/media/joker.mp4
```

Expected: file size > 0 bytes.

- [ ] **Step 4: Commit**

```bash
cd /Users/stevenfrostwick/Documents/world-cup-sweeps-2026
git add media/joker.mp4
git commit -m "feat: add joker video asset"
```

---

### Task 2: Add overlay HTML and CSS

**Files:**
- Modify: `index.html:459` (before `</body>`)
- Modify: `css/predictions.css` (append at end)

**Interfaces:**
- Consumes: `media/joker.mp4` from Task 1
- Produces: DOM elements `#joker-video-overlay` and `#joker-video`; CSS class `.active` toggles visibility. Consumed by Task 3's JS functions.

- [ ] **Step 1: Add overlay HTML to index.html**

In `index.html`, find line 459 (the `</body>` tag) and insert the overlay immediately before it. The file currently ends:

```html
  <script src="js/main.js"></script>
</body>
```

Change it to:

```html
  <script src="js/main.js"></script>
  <div id="joker-video-overlay" onclick="closeJokerVideo()">
    <video id="joker-video" src="media/joker.mp4" preload="auto" playsinline></video>
  </div>
</body>
```

- [ ] **Step 2: Add CSS to css/predictions.css**

Append these rules at the very end of `css/predictions.css`:

```css
/* ── JOKER VIDEO MODAL ── */
#joker-video-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 500;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
#joker-video-overlay.active { display: flex; }
#joker-video { max-width: 100vw; max-height: 100vh; }
```

- [ ] **Step 3: Verify in browser**

Open `index.html` in a browser. Open DevTools console and run:

```js
document.getElementById('joker-video-overlay').classList.add('active');
```

Expected: screen goes black with the video centered (paused at frame 0). Then run:

```js
document.getElementById('joker-video-overlay').classList.remove('active');
```

Expected: overlay disappears, page returns to normal.

- [ ] **Step 4: Commit**

```bash
git add index.html css/predictions.css
git commit -m "feat: add joker video overlay HTML and CSS"
```

---

### Task 3: Add JS functions and wire up joker toggles

**Files:**
- Modify: `js/render-predictions.js` (append two functions at end; modify lines 200–206 and 256–266)

**Interfaces:**
- Consumes: `#joker-video-overlay` and `#joker-video` DOM elements from Task 2
- Produces: global functions `playJokerVideo()` and `closeJokerVideo()`

- [ ] **Step 1: Append playJokerVideo and closeJokerVideo to render-predictions.js**

At the very end of `js/render-predictions.js` (after line 288), append:

```js
function playJokerVideo() {
  const overlay = document.getElementById('joker-video-overlay');
  const video = document.getElementById('joker-video');
  if (!overlay || !video) return;
  video.currentTime = 0;
  overlay.classList.add('active');
  video.play().catch(() => {});
  video.onended = closeJokerVideo;
}

function closeJokerVideo() {
  const overlay = document.getElementById('joker-video-overlay');
  const video = document.getElementById('joker-video');
  if (overlay) overlay.classList.remove('active');
  if (video) { video.pause(); video.currentTime = 0; }
}
```

- [ ] **Step 2: Wire playJokerVideo into toggleJoker (line ~200)**

In `toggleJoker`, the block after a successful DB update currently reads (lines 200–206):

```js
  const { error } = await sb.from('predictions').update({ is_joker: turningOn }).eq('user_id', uid).eq('match_id', matchId);
  if (error) {
    alert(error.message.includes('one joker') ? 'Your 🃏 is already locked in on another match that day.' : 'Error: ' + error.message);
    return;
  }
  loadPredData();
  renderPredictions();
```

Change it to:

```js
  const { error } = await sb.from('predictions').update({ is_joker: turningOn }).eq('user_id', uid).eq('match_id', matchId);
  if (error) {
    alert(error.message.includes('one joker') ? 'Your 🃏 is already locked in on another match that day.' : 'Error: ' + error.message);
    return;
  }
  if (turningOn) playJokerVideo();
  loadPredData();
  renderPredictions();
```

- [ ] **Step 3: Wire playJokerVideo into toggleJokerFromPanel (line ~256)**

In `toggleJokerFromPanel`, the block after a successful DB update currently reads (lines 256–266):

```js
  const { error } = await sb.from('predictions').update({ is_joker: turningOn }).eq('user_id', uid).eq('match_id', matchId);
  if (error) {
    alert(error.message.includes('one joker') ? 'Your 🃏 is already locked in on another match that day.' : 'Error: ' + error.message);
    return;
  }
  await loadPredData();
  const m = matchData.find(m => {
    const key = `${m.team1}|${m.team2}|${m.date}`;
    return matchIdByTeamDate[key] === matchId;
  });
  if (m) renderPredPanel(`${m.team1}|${m.team2}|${m.date}`);
```

Change it to:

```js
  const { error } = await sb.from('predictions').update({ is_joker: turningOn }).eq('user_id', uid).eq('match_id', matchId);
  if (error) {
    alert(error.message.includes('one joker') ? 'Your 🃏 is already locked in on another match that day.' : 'Error: ' + error.message);
    return;
  }
  if (turningOn) playJokerVideo();
  await loadPredData();
  const m = matchData.find(m => {
    const key = `${m.team1}|${m.team2}|${m.date}`;
    return matchIdByTeamDate[key] === matchId;
  });
  if (m) renderPredPanel(`${m.team1}|${m.team2}|${m.date}`);
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Sign in. Navigate to the Predictions tab. Find a match with an existing prediction and click the `🃏 2×` button to enable the joker.

Expected:
1. Screen goes black immediately, video plays with sound, no controls visible
2. Clicking anywhere on the screen closes the modal
3. Waiting for the video to end also closes the modal
4. Toggling the joker OFF (clicking `🃏 2×` again) does NOT trigger the video

- [ ] **Step 5: Commit**

```bash
git add js/render-predictions.js
git commit -m "feat: play video modal when joker is enabled"
```
