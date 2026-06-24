# Joker Video Modal — Design Spec
_2026-06-21_

## Summary

When a player enables their joker pick, play a short YouTube-sourced video in a full-screen frameless modal with sound. The video is preloaded in the background after page load so playback is immediate. The modal dismisses when the video ends or the user clicks anywhere.

## Video File

- Source: `https://www.youtube.com/watch?v=Qhj2VW1LVck`
- Download with yt-dlp:
  ```
  yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" \
    -o "media/joker.%(ext)s" \
    "https://www.youtube.com/watch?v=Qhj2VW1LVck"
  ```
- Stored as `media/joker.mp4` in project root
- Deployed to Surge automatically (not in `.surgeignore`)

## HTML (`index.html`)

Add before `</body>`:

```html
<div id="joker-video-overlay" onclick="closeJokerVideo()">
  <video id="joker-video" src="media/joker.mp4" preload="auto" playsinline></video>
</div>
```

- `preload="auto"` — browser buffers the file as soon as it's idle after page load; no extra JS needed
- `playsinline` — prevents iOS from forcing fullscreen takeover
- No `controls` attribute — no playback controls shown
- Click on overlay (background or video) dismisses modal

## CSS (`css/predictions.css`)

```css
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

z-index 500 clears all existing overlays (pred panel: 210, profile: 200, auth: 100).

## JS (`js/render-predictions.js`)

Two new global functions:

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

Both `toggleJoker` and `toggleJokerFromPanel` call `playJokerVideo()` when `turningOn === true`, immediately after the successful DB update and before `loadPredData()`.

The `.catch(() => {})` handles autoplay policy — in practice a non-issue since the joker button click is a direct user gesture.

## Dismissal

- Video ends → `video.onended` fires `closeJokerVideo()`
- User clicks anywhere on the overlay → `onclick="closeJokerVideo()"` on the overlay div

## Deployment

`media/joker.mp4` must be committed to the repo before deploy. The file will be served as a static asset alongside `index.html`.
