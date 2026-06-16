# CUM Header Design

**Date:** 2026-06-16  
**Status:** Approved

## Summary

Replace the existing plain-text `<header>` with a collegiate varsity-style SVG lockup inspired by the 2026 FIFA World Cup host-nation t-shirt design: arched "★ WORLD CUP 2026 ★" over large block letters **C U M** (Canada, USA, Mexico) each filled with the real national flag, with "CANADA · USA · MEXICO" and ruled lines below.

## What Changes

### Removed
- `<h1><span class="trophy">⚽</span> World Cup 2026 Sweepstakes</h1>`
- `<p class="subtitle">Canada · Mexico · United States — June 11 to July 19, 2026</p>`
- `header h1`, `header h1 .trophy`, `header .subtitle`, `header .subtitle .host` CSS rules

### Added
- Inline `<svg>` inside `<header>` containing the full lockup

## SVG Structure

```
<svg width="320" height="255" viewBox="0 0 320 255">
  <defs>
    <!-- clipPath per letter (Impact 145px, baseline y=148) -->
    <clipPath id="cC"> <text …>C</text> </clipPath>
    <clipPath id="cU"> <text …>U</text> </clipPath>
    <clipPath id="cM"> <text …>M</text> </clipPath>
  </defs>

  <!-- 1. Arched title -->
  <path id="archPath" d="M 10,75 Q 160,10 310,75"/>
  <text><textPath href="#archPath" …>★  WORLD CUP 2026  ★</textPath></text>

  <!-- 2. Three letters (each: black stroke → flag image → white inner stroke) -->
  <g transform="translate(0,72)">   <!-- C — Canada  -->
  <g transform="translate(102,72)"> <!-- U — USA     -->
  <g transform="translate(205,72)"> <!-- M — Mexico  -->

  <!-- 3. Host names strip -->
  <line … /> CANADA · USA · MEXICO <line … />
</svg>
```

## Per-Letter Specs

| Letter | Group translate | Flag image src | image x | image y | width | height |
|--------|----------------|----------------|---------|---------|-------|--------|
| C      | (0, 72)        | flagcdn.com/w320/ca.png | -55 | 0 | 200 | 155 |
| U      | (102, 72)      | flagcdn.com/w320/us.png | 10  | 0 | 115 | 155 |
| M      | (205, 72)      | flagcdn.com/w320/mx.png | -40 | 0 | 185 | 155 |

All images use `preserveAspectRatio="xMidYMid slice"`.

## Letter Stroke Treatment

Each letter renders three layers in order:
1. **Black outer stroke** — `fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round"`
2. **Flag image** — clipped via `clip-path="url(#cX)"`
3. **White inner stroke** — `fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4.5"`

Font: `Impact,'Arial Black',sans-serif` — system font, no CDN dependency.

## Arc Text

- Path: quadratic bezier `M 10,75 Q 160,10 310,75`
- Font: `system-ui, sans-serif`, 13px, weight 800, letter-spacing 5px, fill `#888`
- Content: `★  WORLD CUP 2026  ★` centred via `startOffset="50%" text-anchor="middle"`

## Host Names Strip

- SVG `<text>` at y=246, 11px, weight 700, letter-spacing 5px, fill `#999`
- Content: `CANADA · USA · MEXICO`
- Two `<line>` decorators either side (x: 10→82 and 238→310, y=242, stroke `#555`)

## Responsive SVG

Use `width="100%"` on the SVG element (not a fixed pixel width) and rely on the viewBox for intrinsic sizing. This means the lockup scales down naturally on narrow screens without any extra CSS.

## CSS Changes (`css/layout.css`)

- Remove: `header h1`, `header h1 .trophy`, `header .subtitle`, `header .subtitle .host` rules
- Keep: `header` block padding
- Remove: `header::after` divider — the SVG's own ruled lines serve the same purpose; the external line would double up

## Files Touched

- `index.html` — replace `<h1>` + `<p class="subtitle">` with the SVG
- `css/layout.css` — remove now-unused h1/subtitle rules, add svg max-width
