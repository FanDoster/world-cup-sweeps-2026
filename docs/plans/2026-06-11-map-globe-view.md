# Map / Globe View — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `🌐 Map` tab to the app that renders an interactive D3-geo orthographic globe showing all 16 World Cup venues with click-to-open panels listing matches and player predictions.

**Architecture:** All code added to the single `index.html` file — new CSS in the `<style>` block, new HTML in the body, new JS in the `<script>` block. Two new CDN libs (d3 v7, topojson-client v3) are appended after the existing supabase script tag. Globe is SVG-based, rendered once and updated on drag/rotation. Venue panel reuses existing `matchIdByTeamDate`, `predLookup`, `predResultBadge`, and `calcPredPoints` globals.

**Tech Stack:** D3 v7 (geoOrthographic, drag), topojson-client v3, world-atlas countries-110m.json, vanilla JS/CSS matching existing app conventions.

---

## Key reference points in index.html

- Tab bar buttons: lines ~960–964
- Section divs: lines ~967+ (sectionPlayers, sectionMatches, etc.)
- Auth modal / pred panel overlays: lines ~1049–1052
- `<footer>` + CDN script tags: lines ~1054–1057
- `switchTab()` function: lines ~1790–1804
- `matchIdByTeamDate`, `predLookup` globals declared: lines ~1234–1236
- `calcPredPoints` function: lines ~2040–2046
- `predResultBadge` function: lines ~2071–2077
- CSS `:root` tokens, `.tab-btn`, `.pred-panel` all in the `<style>` block (lines 1–946)

---

## Task 1: Add CDN scripts and Map tab button

**Files:**
- Modify: `index.html` (tab bar HTML ~line 964, CDN scripts ~line 1057)

**Step 1: Add two CDN scripts after the supabase script tag (line 1057)**

Find this line:
```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

Add immediately after it:
```html
  <script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"></script>
```

**Step 2: Add Map tab button to the tab bar (line ~964)**

Find:
```html
      <button type="button" class="tab-btn" data-tab="teams" onclick="switchTab('teams')"><span class="emoji">🌍</span><span class="tab-label"> Teams</span></button>
```

Add immediately after it:
```html
      <button type="button" class="tab-btn" data-tab="map" onclick="switchTab('map')"><span class="emoji">🌐</span><span class="tab-label"> Map</span></button>
```

**Step 3: Add section-map div**

Find the existing `section-teams` div. Add after it (before the sign-in modal):
```html
    <div class="section-map" id="sectionMap">
      <div class="globe-wrap" id="globeWrap">
        <svg id="globeSvg"></svg>
      </div>
      <div class="venue-panel" id="venuePanel">
        <div class="vp-header">
          <div>
            <div class="vp-name" id="vpName"></div>
            <div class="vp-city" id="vpCity"></div>
          </div>
          <button class="vp-close" onclick="closeVenuePanel()">✕</button>
        </div>
        <div class="vp-matches" id="vpMatches"></div>
      </div>
    </div>
```

**Step 4: Verify in browser**

Open `index.html` in a browser. Click the "🌐 Map" tab — you should see a blank section with no errors in the console.

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add Map tab scaffold (CDN scripts, tab button, section HTML)"
```

---

## Task 2: Add CSS for globe, markers, and venue panel

**Files:**
- Modify: `index.html` (inside `<style>` block, just before the closing `</style>` tag at ~line 946)

**Step 1: Add CSS**

Find the closing `</style>` tag (line ~946) and insert before it:

```css
    /* ── MAP / GLOBE ── */
    .section-map { display: none; position: relative; min-height: 80vh; }
    .section-map.active { display: flex; align-items: stretch; }
    .globe-wrap { flex: 1; display: flex; align-items: center; justify-content: center; background: var(--bg); min-height: 70vh; position: relative; overflow: hidden; }
    #globeSvg { width: 100%; height: 100%; display: block; cursor: grab; }
    #globeSvg:active { cursor: grabbing; }
    .venue-marker { cursor: pointer; }
    .venue-marker circle.outer { animation: pulse-marker 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes pulse-marker { 0%,100% { opacity: 0.55; r: 11; } 50% { opacity: 0.15; r: 14; } }
    .venue-marker:hover circle.inner { filter: brightness(1.4); }
    .venue-tooltip { position: absolute; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 6px 10px; font-size: 0.75rem; color: var(--text); pointer-events: none; white-space: nowrap; z-index: 10; display: none; }
    /* Venue panel */
    .venue-panel { width: 0; overflow: hidden; transition: width 0.28s ease; background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; }
    .venue-panel.open { width: 380px; overflow-y: auto; }
    .vp-header { padding: 20px 20px 14px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0; }
    .vp-name { font-weight: 800; font-size: 1rem; color: var(--text); }
    .vp-city { font-size: 0.75rem; color: var(--text-muted); margin-top: 3px; }
    .vp-close { background: none; border: none; color: var(--text-muted); font-size: 1rem; cursor: pointer; padding: 2px 6px; line-height: 1; }
    .vp-close:hover { color: var(--text); }
    .vp-matches { padding: 12px 0; flex: 1; }
    .vm-row { padding: 12px 20px; border-bottom: 1px solid var(--border-subtle); }
    .vm-row:last-child { border-bottom: none; }
    .vm-teams { display: flex; align-items: center; gap: 6px; font-size: 0.88rem; font-weight: 700; color: var(--text); }
    .vm-teams img { width: 18px; height: 13px; object-fit: cover; border-radius: 2px; }
    .vm-vs { color: var(--text-muted); font-size: 0.72rem; font-weight: 400; }
    .vm-meta { font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; }
    .vm-score { font-family: var(--font-mono); font-weight: 800; color: var(--text); }
    .vm-preds { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
    .vm-pred-dot { font-size: 0.7rem; padding: 2px 5px; border-radius: 3px; font-family: var(--font-mono); font-weight: 700; background: var(--card); border: 1px solid var(--border); color: var(--text-secondary); }
    .vm-pred-dot.has-pred { border-color: var(--accent); color: var(--accent); }
    .vm-pred-dot.no-pred { color: var(--text-muted); }
    /* Mobile: bottom sheet */
    @media (max-width: 700px) {
      .section-map.active { flex-direction: column; }
      .globe-wrap { min-height: 55vw; }
      .venue-panel { width: 100% !important; height: 0; border-left: none; border-top: 1px solid var(--border); transition: height 0.28s ease; }
      .venue-panel.open { height: 55vh; overflow-y: auto; }
    }
```

**Step 2: Verify in browser**

Click the Map tab. The section should now flex properly (blank dark area). No console errors.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add CSS for globe container and venue panel"
```

---

## Task 3: Add VENUE_DATA constant

**Files:**
- Modify: `index.html` (in the `<script>` block, near the top after the `const SB_KEY` line ~1062)

**Step 1: Add VENUE_DATA after the `const sb = ...` line (~line 1062)**

```js
    // ── VENUE DATA ──
    const VENUE_DATA = {
      'Estadio Azteca': {
        city: 'Mexico City', country: 'MX', lat: 19.3029, lng: -99.1505,
        matches: ['Mexico|South Africa|2026-06-11','Uzbekistan|Colombia|2026-06-17','Czech Republic|Mexico|2026-06-24']
      },
      'Estadio Akron': {
        city: 'Guadalajara', country: 'MX', lat: 20.6867, lng: -103.4678,
        matches: ['South Korea|Czech Republic|2026-06-11','Mexico|South Korea|2026-06-18','Colombia|DR Congo|2026-06-23','Uruguay|Spain|2026-06-26']
      },
      'Estadio BBVA': {
        city: 'Monterrey', country: 'MX', lat: 25.6696, lng: -100.2440,
        matches: ['Sweden|Tunisia|2026-06-14','Tunisia|Japan|2026-06-20','South Africa|South Korea|2026-06-24']
      },
      'BMO Field': {
        city: 'Toronto', country: 'CA', lat: 43.6333, lng: -79.4181,
        matches: ['Canada|Bosnia & Herzegovina|2026-06-12','Ghana|Panama|2026-06-17','Germany|Ivory Coast|2026-06-20','Panama|Croatia|2026-06-23','Senegal|Iraq|2026-06-26']
      },
      'BC Place': {
        city: 'Vancouver', country: 'CA', lat: 49.2767, lng: -123.1115,
        matches: ['Australia|Turkey|2026-06-13','Canada|Qatar|2026-06-18','New Zealand|Egypt|2026-06-21','Switzerland|Canada|2026-06-24','New Zealand|Belgium|2026-06-26']
      },
      'MetLife Stadium': {
        city: 'New York / NJ', country: 'US', lat: 40.8135, lng: -74.0745,
        matches: ['Brazil|Morocco|2026-06-13','France|Senegal|2026-06-16','Norway|Senegal|2026-06-22','Ecuador|Germany|2026-06-25','Panama|England|2026-06-27']
      },
      'SoFi Stadium': {
        city: 'Los Angeles', country: 'US', lat: 33.9534, lng: -118.3395,
        matches: ['United States|Paraguay|2026-06-12','Iran|New Zealand|2026-06-15','Switzerland|Bosnia & Herzegovina|2026-06-18','Belgium|Iran|2026-06-21','Turkey|United States|2026-06-25']
      },
      'AT&T Stadium': {
        city: 'Dallas', country: 'US', lat: 32.7480, lng: -97.0929,
        matches: ['Netherlands|Japan|2026-06-14','England|Croatia|2026-06-17','Argentina|Austria|2026-06-22','Japan|Sweden|2026-06-25','Jordan|Argentina|2026-06-27']
      },
      "Levi's Stadium": {
        city: 'San Francisco', country: 'US', lat: 37.4033, lng: -121.9694,
        matches: ['Qatar|Switzerland|2026-06-13','Austria|Jordan|2026-06-16','Turkey|Paraguay|2026-06-19','Jordan|Algeria|2026-06-22','Paraguay|Australia|2026-06-25']
      },
      'Hard Rock Stadium': {
        city: 'Miami', country: 'US', lat: 25.9580, lng: -80.2389,
        matches: ['Saudi Arabia|Uruguay|2026-06-15','Uruguay|Cape Verde|2026-06-21','Scotland|Brazil|2026-06-24','Colombia|Portugal|2026-06-27']
      },
      'Arrowhead Stadium': {
        city: 'Kansas City', country: 'US', lat: 39.0490, lng: -94.4840,
        matches: ['Argentina|Algeria|2026-06-16','Ecuador|Curaçao|2026-06-20','Tunisia|Netherlands|2026-06-25','Algeria|Austria|2026-06-27']
      },
      'Lincoln Financial Field': {
        city: 'Philadelphia', country: 'US', lat: 39.9008, lng: -75.1675,
        matches: ['Ivory Coast|Ecuador|2026-06-14','Brazil|Haiti|2026-06-19','France|Iraq|2026-06-22','Curaçao|Ivory Coast|2026-06-25','Croatia|Ghana|2026-06-27']
      },
      'Lumen Field': {
        city: 'Seattle', country: 'US', lat: 47.5952, lng: -122.3316,
        matches: ['Belgium|Egypt|2026-06-15','United States|Australia|2026-06-19','Bosnia & Herzegovina|Qatar|2026-06-24','Egypt|Iran|2026-06-26']
      },
      'Mercedes-Benz Stadium': {
        city: 'Atlanta', country: 'US', lat: 33.7555, lng: -84.4009,
        matches: ['Spain|Cape Verde|2026-06-15','Czech Republic|South Africa|2026-06-18','Spain|Saudi Arabia|2026-06-21','Morocco|Haiti|2026-06-24','DR Congo|Uzbekistan|2026-06-27']
      },
      'NRG Stadium': {
        city: 'Houston', country: 'US', lat: 29.6847, lng: -95.4107,
        matches: ['Germany|Curaçao|2026-06-14','Portugal|DR Congo|2026-06-17','Netherlands|Sweden|2026-06-20','Portugal|Uzbekistan|2026-06-23','Cape Verde|Saudi Arabia|2026-06-26']
      },
      'Gillette Stadium': {
        city: 'Boston', country: 'US', lat: 42.0909, lng: -71.2643,
        matches: ['Haiti|Scotland|2026-06-13','Iraq|Norway|2026-06-16','Scotland|Morocco|2026-06-19','England|Ghana|2026-06-23','Norway|France|2026-06-26']
      }
    };

    // Build matchByKey lookup from matchData for globe use
    // (populated after matchData is loaded in loadData)
    let matchByKey = {};
```

**Step 2: Verify**

Open browser console, type `VENUE_DATA` — should return the object with 16 keys. Check `Object.values(VENUE_DATA).flatMap(v=>v.matches).length` returns `72`.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add VENUE_DATA constant with all 16 stadiums and 72 match keys"
```

---

## Task 4: Build matchByKey lookup and initialise globe

**Files:**
- Modify: `index.html` (loadData function ~line 1234, new initGlobe function)

**Step 1: Populate matchByKey after matchData loads**

Find the `loadData` function. After the line that sets `matchIdByTeamDate` (around line 1244), add:

```js
        // Build matchByKey for globe venue panel
        matchByKey = {};
        for (const m of matchData) {
          matchByKey[`${m[3]}|${m[4]}|${m[0]}`] = m;
        }
```

**Step 2: Add globe state variables** after the `let matchByKey = {};` line added in Task 3:

```js
    let globeInitialised = false;
    let worldGeoData = null;
    let globeRotation = [-100, -25, 0]; // centred on North America
    let autoRotateRaf = null;
    let isDragging = false;
    let venuePanelOpen = false;
```

**Step 3: Add `initGlobe()` function** — add this near the bottom of the `<script>` block, before the closing `</script>`:

```js
    // ── GLOBE ──
    async function initGlobe() {
      if (globeInitialised) { startAutoRotate(); return; }
      globeInitialised = true;

      if (!worldGeoData) {
        const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        worldGeoData = await res.json();
      }

      const wrap = document.getElementById('globeWrap');
      const svg = d3.select('#globeSvg');
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const radius = Math.min(W, H) * 0.44;

      const projection = d3.geoOrthographic()
        .scale(radius)
        .translate([W / 2, H / 2])
        .rotate(globeRotation)
        .clipAngle(90);

      const path = d3.geoPath().projection(projection);
      const graticule = d3.geoGraticule()();
      const land = topojson.feature(worldGeoData, worldGeoData.objects.land);
      const countries = topojson.feature(worldGeoData, worldGeoData.objects.countries);

      svg.attr('viewBox', `0 0 ${W} ${H}`);

      // Outer glow
      const defs = svg.append('defs');
      const filter = defs.append('filter').attr('id', 'globe-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
      filter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Ocean sphere
      svg.append('circle')
        .attr('cx', W / 2).attr('cy', H / 2).attr('r', radius)
        .attr('fill', '#070b10')
        .attr('filter', 'url(#globe-glow)');

      // Graticule
      svg.append('path').datum(graticule)
        .attr('class', 'graticule')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.04)')
        .attr('stroke-width', 0.5);

      // Land
      svg.append('path').datum(land)
        .attr('class', 'land')
        .attr('d', path)
        .attr('fill', '#0e1620')
        .attr('stroke', '#1e2e40')
        .attr('stroke-width', 0.6);

      // Clip path for markers
      defs.append('clipPath').attr('id', 'globe-clip')
        .append('circle').attr('cx', W / 2).attr('cy', H / 2).attr('r', radius);

      // Marker group (rendered on top, clipped to globe face)
      const markerGroup = svg.append('g').attr('clip-path', 'url(#globe-clip)').attr('id', 'venueMarkers');

      // Tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'venue-tooltip';
      tooltip.id = 'venueTooltip';
      wrap.appendChild(tooltip);

      // Drag rotation
      const drag = d3.drag()
        .on('start', () => { isDragging = true; stopAutoRotate(); })
        .on('drag', (event) => {
          const sens = 0.3;
          globeRotation[0] += event.dx * sens;
          globeRotation[1] -= event.dy * sens;
          globeRotation[1] = Math.max(-90, Math.min(90, globeRotation[1]));
          projection.rotate(globeRotation);
          svg.select('.graticule').attr('d', path);
          svg.select('.land').attr('d', path);
          updateMarkers(projection);
        })
        .on('end', () => { isDragging = false; if (!venuePanelOpen) startAutoRotate(); });

      svg.call(drag);

      // Store refs on window for use in update functions
      window._globe = { svg, projection, path, radius, W, H };

      renderVenueMarkers(markerGroup, projection, tooltip);
      startAutoRotate();
    }

    function updateMarkers(projection) {
      d3.selectAll('.venue-marker').each(function(d) {
        const [x, y] = projection([d.lng, d.lat]);
        const visible = projection.rotate() && isVisible(d.lat, d.lng, projection);
        d3.select(this)
          .attr('transform', `translate(${x},${y})`)
          .attr('opacity', visible ? 1 : 0)
          .attr('pointer-events', visible ? 'all' : 'none');
      });
    }

    function isVisible(lat, lng, projection) {
      const r = projection.rotate();
      const clat = -r[1], clng = -r[0];
      const toRad = Math.PI / 180;
      const d = Math.acos(
        Math.sin(lat * toRad) * Math.sin(clat * toRad) +
        Math.cos(lat * toRad) * Math.cos(clat * toRad) * Math.cos((lng - clng) * toRad)
      );
      return d < Math.PI / 2;
    }

    function startAutoRotate() {
      stopAutoRotate();
      if (venuePanelOpen) return;
      function tick() {
        if (isDragging || venuePanelOpen) return;
        globeRotation[0] += 0.08;
        if (window._globe) {
          window._globe.projection.rotate(globeRotation);
          window._globe.svg.select('.graticule').attr('d', window._globe.path);
          window._globe.svg.select('.land').attr('d', window._globe.path);
          updateMarkers(window._globe.projection);
        }
        autoRotateRaf = requestAnimationFrame(tick);
      }
      autoRotateRaf = requestAnimationFrame(tick);
    }

    function stopAutoRotate() {
      if (autoRotateRaf) { cancelAnimationFrame(autoRotateRaf); autoRotateRaf = null; }
    }
```

**Step 4: Verify**

In the browser, click the Map tab. You should see a dark globe with land masses and graticule lines. It should slowly auto-rotate. Dragging should rotate it. No console errors.

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: render D3-geo orthographic globe with auto-rotation and drag"
```

---

## Task 5: Plot venue markers

**Files:**
- Modify: `index.html` (add `renderVenueMarkers` function in the globe section)

**Step 1: Add `renderVenueMarkers` function** immediately after `stopAutoRotate`:

```js
    function renderVenueMarkers(markerGroup, projection, tooltip) {
      const countryColor = { MX: '#10b981', CA: '#ef4444', US: '#f59e0b' };

      Object.entries(VENUE_DATA).forEach(([name, v]) => {
        const [x, y] = projection([v.lng, v.lat]);
        const color = countryColor[v.country];
        const visible = isVisible(v.lat, v.lng, projection);

        const g = markerGroup.append('g')
          .datum(v)
          .attr('class', 'venue-marker')
          .attr('transform', `translate(${x},${y})`)
          .attr('opacity', visible ? 1 : 0)
          .attr('pointer-events', visible ? 'all' : 'none');

        g.append('circle')
          .attr('class', 'outer')
          .attr('r', 11)
          .attr('fill', color)
          .attr('opacity', 0.35);

        g.append('circle')
          .attr('class', 'inner')
          .attr('r', 6)
          .attr('fill', color)
          .attr('opacity', 0.9);

        g.on('mouseenter', (event) => {
            tooltip.style.display = 'block';
            tooltip.textContent = `${name} · ${v.city} · ${v.matches.length} matches`;
          })
          .on('mousemove', (event) => {
            const rect = document.getElementById('globeWrap').getBoundingClientRect();
            tooltip.style.left = (event.clientX - rect.left + 14) + 'px';
            tooltip.style.top  = (event.clientY - rect.top  - 8) + 'px';
          })
          .on('mouseleave', () => { tooltip.style.display = 'none'; })
          .on('click', () => { tooltip.style.display = 'none'; openVenuePanel(name); });
      });
    }
```

**Step 2: Verify**

Reload. On the Map tab, coloured dots should appear over North America — green (Mexico), red (Canada), amber (USA). Hovering shows a tooltip. Markers on the back of the globe should be invisible.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add venue markers with country colour coding and hover tooltip"
```

---

## Task 6: Venue panel — open, close, and match list

**Files:**
- Modify: `index.html` (add `openVenuePanel`, `closeVenuePanel`, `renderVenueMatches` functions)

**Step 1: Add `openVenuePanel` and `closeVenuePanel`** after `renderVenueMarkers`:

```js
    function openVenuePanel(name) {
      venuePanelOpen = true;
      stopAutoRotate();
      const v = VENUE_DATA[name];
      const flagMap = { MX: '🇲🇽', CA: '🇨🇦', US: '🇺🇸' };
      document.getElementById('vpName').textContent = name;
      document.getElementById('vpCity').textContent = `${flagMap[v.country]} ${v.city}`;
      document.getElementById('venuePanel').classList.add('open');
      renderVenueMatches(name);
    }

    function closeVenuePanel() {
      venuePanelOpen = false;
      document.getElementById('venuePanel').classList.remove('open');
      document.getElementById('vpMatches').innerHTML = '';
      if (!isDragging) startAutoRotate();
    }
```

**Step 2: Add `renderVenueMatches`** immediately after:

```js
    function renderVenueMatches(venueName) {
      const v = VENUE_DATA[venueName];
      const now = Date.now();
      const players = ['Anton', 'Chris', 'Dan', 'Laurie', 'Pat', 'Steven'];
      let html = '';

      for (const key of v.matches) {
        const m = matchByKey[key];
        if (!m) continue; // data not loaded yet

        const [date, time, tz, team1, team2, group, score1, score2] = m;
        const kickoff = toDate(date, time, tz);
        const isFinished = score1 !== null && score2 !== null;
        const locked = kickoff - now < 5 * 60 * 1000;
        const iso1 = teamIso[team1] || '', iso2 = teamIso[team2] || '';
        const mid = matchIdByTeamDate[key];
        const preds = mid ? (predLookup[mid] || []) : [];
        const predByPlayer = {};
        preds.forEach(p => { predByPlayer[p.player_name] = p; });

        let scoreOrTime = '';
        if (isFinished) {
          scoreOrTime = `<span class="vm-score">${score1}–${score2}</span>`;
        } else if (locked) {
          scoreOrTime = `<span style="color:var(--live);font-size:0.7rem;font-weight:700">LIVE / SOON</span>`;
        } else {
          scoreOrTime = `<span style="color:var(--text-muted)">${formatLocalTime(date, time, tz)}</span>`;
        }

        // Prediction dots / badges
        let predHtml = '';
        for (const p of players) {
          const pred = predByPlayer[p];
          if (pred && (locked || isFinished) && pred.home !== undefined && pred.home !== null) {
            let badge = '';
            if (isFinished) badge = predResultBadge(pred.home, pred.away, score1, score2);
            predHtml += `<span class="vm-pred-dot has-pred" title="${p}: ${pred.home}–${pred.away}">${p[0]} ${pred.home}–${pred.away}${badge}</span>`;
          } else if (pred) {
            predHtml += `<span class="vm-pred-dot has-pred" title="${p} has predicted">✓${p[0]}</span>`;
          } else {
            predHtml += `<span class="vm-pred-dot no-pred" title="${p} hasn't predicted">✗${p[0]}</span>`;
          }
        }

        html += `
          <div class="vm-row">
            <div class="vm-teams">
              <img src="${flagUrl(iso1)}" alt="" loading="lazy" onerror="this.style.display='none'">
              ${team1}
              <span class="vm-vs">vs</span>
              ${team2}
              <img src="${flagUrl(iso2)}" alt="" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="vm-meta">
              ${formatDateLabel(date, time, tz)} · Grp ${group} · ${scoreOrTime}
            </div>
            <div class="vm-preds">${predHtml}</div>
          </div>`;
      }

      document.getElementById('vpMatches').innerHTML = html || '<div style="padding:20px;color:var(--text-muted);font-size:0.82rem">No matches yet</div>';
    }
```

**Step 3: Verify**

Reload. Click a venue marker — the panel should slide in from the right showing the venue name, city, and a list of matches with flags, dates, and prediction dots. Clicking ✕ should close it and resume rotation.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: venue panel with match list and prediction dots/badges"
```

---

## Task 7: Wire switchTab and final polish

**Files:**
- Modify: `index.html` (switchTab function ~line 1790)

**Step 1: Add map case to switchTab**

Find:
```js
      document.getElementById('sectionPredictions').classList.toggle('active', tab === 'predictions');
```

Add immediately after it:
```js
      document.getElementById('sectionMap').classList.toggle('active', tab === 'map');
      if (tab === 'map') initGlobe();
      if (tab !== 'map') stopAutoRotate();
```

**Step 2: Add decorative star dots** to `initGlobe()`, after the `svg.append('circle')` ocean sphere call:

```js
      // Stars
      const starData = Array.from({length: 60}, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        op: Math.random() * 0.5 + 0.2
      })).filter(s => Math.hypot(s.x - W/2, s.y - H/2) > radius + 15);
      svg.selectAll('.star').data(starData).enter()
        .append('circle').attr('class', 'star')
        .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r)
        .attr('fill', 'white').attr('opacity', d => d.op);
```

**Step 3: Verify full flow**

1. Click Map tab — globe renders with stars, land, markers
2. Auto-rotation is smooth
3. Drag rotates the globe, markers update correctly
4. Click a venue marker — panel opens, matches listed with flags + times + prediction dots
5. For played matches — prediction badges show correct/incorrect colouring
6. Click ✕ or switch to another tab — panel closes, rotation resumes
7. On mobile (resize to <700px) — panel appears as bottom sheet

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: wire Map tab to switchTab, add star decoration"
```

---

## Task 8: Final check and browser test

**Step 1: Open app locally**

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

**Step 2: Verify checklist**

- [ ] Map tab appears in tab bar between Teams and auth tabs
- [ ] Globe renders with dark ocean, land, graticule, glow, stars
- [ ] 16 coloured venue markers visible over North America
- [ ] Markers hidden when globe is rotated to put them on the back face
- [ ] Hover tooltip shows venue name, city, match count
- [ ] Click marker → panel slides in with venue name + flag + city
- [ ] Each match row shows: flags, team names, date/time, score/countdown
- [ ] Prediction dots: ✓/✗ before lock, scoreline badges after lock
- [ ] `calcPredPoints` colouring is consistent with the Predictions tab
- [ ] ✕ closes panel, auto-rotation resumes
- [ ] Switching to another tab stops rotation
- [ ] Mobile (≤700px): bottom sheet layout, no overflow
- [ ] Console: no errors

**Step 3: Final commit if any polish was needed**

```bash
git add index.html
git commit -m "fix: map globe polish from browser test"
```
