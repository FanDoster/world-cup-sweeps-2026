# Map / Globe View — Design

**Date:** 2026-06-11  
**Status:** Approved

## Overview

A new "Map" tab added to the existing tab bar that renders an interactive D3-geo orthographic globe showing all 16 World Cup venues across USA, Canada, and Mexico. Clicking a venue marker opens a panel listing every match at that stadium plus all player predictions.

---

## 1. Tab & Layout

- New tab: `🌐 Map`, inserted between "Teams" and the auth tabs in the tab bar
- `section-map` div, shown/hidden by `switchTab()` like all other sections
- Two zones:
  - **Globe**: edge-to-edge, fills viewport, no padding
  - **Venue panel**: slide-in from right on desktop (`width: 380px`, `position: fixed`); bottom sheet on mobile. Hidden by default, opens on venue click.
- Clicking outside the panel or the × button closes it and resumes auto-rotation.

---

## 2. Globe Rendering

**New CDN dependencies** (added to `index.html`):
- `d3` v7 — geo projection, path generation, drag
- `topojson-client` v3 — decode world map TopoJSON
- World atlas data: `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` (~95 KB, fetched once on first tab-open, cached in a module-level variable)

**Projection & style:**
- `d3.geoOrthographic()`, initially rotated to centre on North America (`[-100, -25]`)
- Land fill: `#0e1620` (`--surface`), border: `#1e2e40` (`--border`)
- Ocean: `#070b10` (`--bg`) — globe blends into page background
- Graticule lines: `rgba(255,255,255,0.04)`
- Outer glow ring via SVG `radialGradient` or `filter: drop-shadow`
- Decorative star dots scattered outside the globe clip area

**Interaction:**
- Drag-to-rotate via `d3.drag()` modifying projection rotation
- Idle auto-rotation: slow eastward drift (~0.1°/frame) via `requestAnimationFrame`, paused during drag and while panel is open
- Pinch-to-zoom on mobile adjusts projection scale

---

## 3. Venue Data

Hardcoded `VENUE_DATA` object in `index.html`. Each entry:

```js
'Venue Name': {
  city: 'City',
  country: 'US' | 'CA' | 'MX',
  lat: 00.000,
  lng: -00.000,
  matches: ['team1|team2|YYYY-MM-DD', ...]  // existing matchIdByTeamDate key format
}
```

Match→venue lookup uses `"team1|team2|date"` keys — the same format already used by `matchIdByTeamDate` and `showPredPanel()`, so no new data fetching is needed.

**Name normalisation** (app name → schedule name):
- `Czech Republic` → Czechia
- `Turkey` → Türkiye  
- `DR Congo` → Congo DR

### All 16 venues and match assignments

| Venue | City | Country | Lat | Lng | Matches |
|---|---|---|---|---|---|
| Estadio Azteca | Mexico City | Mexico | 19.3029 | -99.1505 | Mexico/South Africa (Jun 11), Mexico/South Korea (Jun 18), Czechia/Mexico (Jun 24) |
| Estadio Akron | Guadalajara | Mexico | 20.6867 | -103.4678 | South Korea/Czechia (Jun 11), Mexico/South Korea (Jun 18), Colombia/DR Congo (Jun 23), Uruguay/Spain (Jun 26) |
| Estadio BBVA | Monterrey | Mexico | 25.6696 | -100.2440 | Sweden/Tunisia (Jun 14), Tunisia/Japan (Jun 20), South Africa/South Korea (Jun 24) |
| BMO Field | Toronto | Canada | 43.6333 | -79.4181 | Canada/Bosnia (Jun 12), Ghana/Panama (Jun 17), Germany/Ivory Coast (Jun 20), Panama/Croatia (Jun 23), Senegal/Iraq (Jun 26) |
| BC Place | Vancouver | Canada | 49.2767 | -123.1115 | Australia/Turkey (Jun 13), Canada/Qatar (Jun 18), New Zealand/Egypt (Jun 21), Switzerland/Canada (Jun 24), New Zealand/Belgium (Jun 26) |
| MetLife Stadium | New York/NJ | USA | 40.8135 | -74.0745 | Brazil/Morocco (Jun 13), France/Senegal (Jun 16), Norway/Senegal (Jun 22), Ecuador/Germany (Jun 25), Panama/England (Jun 27) |
| SoFi Stadium | Los Angeles | USA | 33.9534 | -118.3395 | USA/Paraguay (Jun 12), Switzerland/Bosnia (Jun 18), Iran/New Zealand (Jun 15), Belgium/Iran (Jun 21), Turkey/USA (Jun 25) |
| AT&T Stadium | Dallas | USA | 32.7480 | -97.0929 | Netherlands/Japan (Jun 14), England/Croatia (Jun 17), Argentina/Austria (Jun 22), Japan/Sweden (Jun 25), Jordan/Argentina (Jun 27) |
| Levi's Stadium | San Francisco | USA | 37.4033 | -121.9694 | Qatar/Switzerland (Jun 13), Turkey/Paraguay (Jun 19), Austria/Jordan (Jun 16), Jordan/Algeria (Jun 22), Paraguay/Australia (Jun 25) |
| Hard Rock Stadium | Miami | USA | 25.9580 | -80.2389 | Saudi Arabia/Uruguay (Jun 15), Uruguay/Cape Verde (Jun 21), Scotland/Brazil (Jun 24), Colombia/Portugal (Jun 27) |
| Arrowhead Stadium | Kansas City | USA | 39.0490 | -94.4840 | Argentina/Algeria (Jun 16), Ecuador/Curaçao (Jun 20), Tunisia/Netherlands (Jun 25), Algeria/Austria (Jun 27) |
| Lincoln Financial Field | Philadelphia | USA | 39.9008 | -75.1675 | Ivory Coast/Ecuador (Jun 14), Brazil/Haiti (Jun 19), France/Iraq (Jun 22), Curaçao/Ivory Coast (Jun 25), Croatia/Ghana (Jun 27) |
| Lumen Field | Seattle | USA | 47.5952 | -122.3316 | Belgium/Egypt (Jun 15), USA/Australia (Jun 19), Bosnia/Qatar (Jun 24), Egypt/Iran (Jun 26) |
| Mercedes-Benz Stadium | Atlanta | USA | 33.7555 | -84.4009 | Spain/Cape Verde (Jun 15), Czechia/South Africa (Jun 18), Spain/Saudi Arabia (Jun 21), Morocco/Haiti (Jun 24), DR Congo/Uzbekistan (Jun 27) |
| NRG Stadium | Houston | USA | 29.6847 | -95.4107 | Germany/Curaçao (Jun 14), Portugal/DR Congo (Jun 17), Netherlands/Sweden (Jun 20), Portugal/Uzbekistan (Jun 23), Cape Verde/Saudi Arabia (Jun 26) |
| Gillette Stadium | Boston | USA | 42.0909 | -71.2643 | Haiti/Scotland (Jun 13), Iraq/Norway (Jun 16), Scotland/Morocco (Jun 19), England/Ghana (Jun 23), Norway/France (Jun 26) |

---

## 4. Venue Markers

- SVG `<circle>` projected via D3 projection, hidden when on back face of globe
- Two rings: inner solid dot (`r=7`), outer pulsing ring (`r=12`, CSS animation using `--accent-glow`)
- **Colour by country:** Mexico = `--accent` (green), Canada = `#ef4444` (red), USA = `--gold` (amber)
- Hover tooltip: venue name + city + match count (e.g. "MetLife Stadium · New York/NJ · 5 matches")
- Click opens the venue panel

---

## 5. Venue Panel

**Header:** Stadium name, city, country flag emoji

**Match list:** one row per match at that venue, each showing:
- Team flags (flagcdn.com, same as rest of app) + team names
- Date/time in viewer's local timezone (same `toDate()` logic)
- Score if played, countdown if upcoming, "Live" badge if in progress

**Predictions row** (below each match):
- Before lock (>5 min to kickoff): `✓`/`✗` dots per player (existence only, same as match cards)
- After lock / played: predicted scoreline badge per player, e.g. `A 2–1`, colour-coded:
  - Green = exact score (5★)
  - Amber = correct result
  - Grey = wrong
- Logged-in user's own prediction highlighted

All data comes from existing globals (`predLookup`, `matchIdByTeamDate`, `calcPredPoints`) — no new fetches.

**Styling:** uses existing CSS tokens (`--card`, `--border`, `--text`, `--radius`) for seamless fit.

---

## Out of scope

- Knockout stage matches (venues not yet assigned)
- Any backend/Supabase changes
- Venue photos or external map tiles
