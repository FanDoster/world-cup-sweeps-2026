# XP Startup Sound — Design Spec

**Date:** 2026-06-23

## Goal

Play the Windows XP startup sound once per page load — triggered the first time any window is opened (user double-clicks a desktop icon or taps a Today screen item).

## Approach

Download the audio from the YouTube source using `yt-dlp`, convert to MP3 via `ffmpeg`, and commit to `media/startup.mp3`. Play it in `js/xp-shell.js` on the first `openWindow()` call using the HTML5 Audio API.

## Files changed

| File | Change |
|---|---|
| `media/startup.mp3` | New — downloaded from YouTube source |
| `js/xp-shell.js` | Add `var xpStartupPlayed = false;` at top; play audio at start of `openWindow()` |

## Behaviour

- Plays once per page load (flag reset on each page load — not persisted to localStorage)
- Triggered by the first `openWindow()` call regardless of which window
- Uses `new Audio(...).play().catch(function(){})` — silences autoplay policy rejection (safe since `openWindow` is always user-gesture-triggered)
- No UI, no controls, no loop

## Out of scope

- Volume control
- Mute toggle
- Any other sounds
