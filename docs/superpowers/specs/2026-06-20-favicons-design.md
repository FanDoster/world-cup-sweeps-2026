# Favicon Set — Design Spec
_2026-06-20_

## Goal

Replace the current inline SVG soccer-ball favicon with a full multi-size favicon set using a face photo as the icon image.

## Source Image

Screenshot at `/var/folders/46/qf684hmx4p3flxtgqbjnkd2w0000gn/T/TemporaryItems/NSIRD_screencaptureui_2OZIzy/Screenshot 2026-06-20 at 23.41.03.png` — a cropped face photo on a white background.

## Background Removal

Use `rembg` (AI-based portrait segmentation) via `pip3 install rembg`. Produces clean edges around hair at large sizes. Run once to generate a transparent-background PNG master, then resize from that.

## Output Files

All files go in a new `favicon/` directory at the project root:

| File | Size | Purpose |
|------|------|---------|
| `favicon/favicon.ico` | 16+32+48 multi-layer | Legacy browser tab, IE |
| `favicon/favicon-16x16.png` | 16×16 | Browser tab |
| `favicon/favicon-32x32.png` | 32×32 | Browser tab, taskbar |
| `favicon/apple-touch-icon.png` | 180×180 | iOS Add to Home Screen |
| `favicon/android-chrome-192x192.png` | 192×192 | Android PWA |
| `favicon/android-chrome-512x512.png` | 512×512 | PWA splash |
| `favicon/site.webmanifest` | — | PWA manifest JSON |

## site.webmanifest

```json
{
  "name": "World Cup 2026 Sweepstakes",
  "short_name": "WC2026",
  "icons": [
    { "src": "/favicon/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#070b10",
  "background_color": "#070b10",
  "display": "standalone"
}
```

## index.html Changes

Replace the current `<link rel="icon" href="data:image/svg+xml,...">` with:

```html
<link rel="icon" type="image/x-icon" href="favicon/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png">
<link rel="manifest" href="favicon/site.webmanifest">
<meta name="theme-color" content="#070b10">
```

## Implementation Steps

1. `pip3 install rembg` (and dependency `onnxruntime`)
2. Run rembg on source image → `favicon/source-transparent.png`
3. Resize to each target size using ImageMagick (`magick`)
4. Build `favicon.ico` from 16, 32, 48 PNGs using ImageMagick
5. Write `site.webmanifest`
6. Update `index.html` `<head>`
7. Add `favicon/` to `.surgeignore` exclusions check — it should NOT be ignored (needs to be deployed)

## Constraints

- No build step — all output files are static assets committed to the repo
- `favicon/source-transparent.png` can also be committed as the master for future resizing
- The `.surgeignore` file must allow `favicon/` through (check it doesn't accidentally block it)
