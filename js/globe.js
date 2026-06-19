// ── GLOBE ──
async function initGlobe() {
  if (globeInitialised) { startIdleDrift(); return; }
  globeInitialised = true;

  if (!worldGeoData) {
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    worldGeoData = await res.json();
  }
  if (!usStatesTopoData) {
    const res = await fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_1_states_provinces.geojson');
    const geojson = await res.json();
    const usStates = { type: 'FeatureCollection', features: geojson.features.filter(f => f.properties.iso_a2 === 'US' || f.properties.iso_a2 === 'CA') };
    usStatesTopoData = topojson.topology({ states: usStates });
  }

  // Build territory GeoJSON features (once; reused on every render)
  if (territoryFeatures.length === 0) {
    const statesGeoms = usStatesTopoData.objects.states.geometries;

    const mergeStates = (codes) => topojson.merge(
      usStatesTopoData,
      statesGeoms.filter(g =>
        codes.includes(g.properties.postal || g.properties.abbrev || '')
      )
    );

    const combineFeatures = (...features) => {
      const coords = [];
      for (const f of features) {
        if (!f) continue;
        const geom = f.geometry || f;
        if (geom.type === 'Polygon') coords.push(geom.coordinates);
        else if (geom.type === 'MultiPolygon') coords.push(...geom.coordinates);
      }
      return { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: coords } };
    };

    for (const t of TERRITORY_DATA) {
      let feature;
      if (t.geo === 'country') {
        feature = topojson.merge(
          worldGeoData,
          worldGeoData.objects.countries.geometries.filter(g => +g.id === t.countryId)
        );
      } else if (t.geo === 'states') {
        feature = mergeStates(t.states);
      } else {
        feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [t.coords] } };
      }
      territoryFeatures.push({ name: t.name, feature });
    }
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
    .attr('class', 'ocean-sphere')
    .attr('fill', '#070b10')
    .attr('filter', 'url(#globe-glow)');

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
    .attr('stroke', 'none');

  // Stripe patterns for contested territories (all 15 player pairs)
  for (let i = 0; i < PLAYERS.length; i++) {
    for (let j = i + 1; j < PLAYERS.length; j++) {
      const pA = PLAYERS[i], pB = PLAYERS[j];
      const pat = defs.append('pattern')
        .attr('id', `stripe-${pA}-${pB}`)
        .attr('x', 0).attr('y', 0)
        .attr('width', 10).attr('height', 10)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)');
      pat.append('rect').attr('width', 5).attr('height', 10).attr('fill', ownerHexColors[pA]).attr('fill-opacity', 0.55);
      pat.append('rect').attr('x', 5).attr('width', 5).attr('height', 10).attr('fill', ownerHexColors[pB]).attr('fill-opacity', 0.55);
    }
  }

  // Territory fill layer (clipped to globe sphere, beneath venue markers)
  const territoryGroup = svg.append('g').attr('clip-path', 'url(#globe-clip)').attr('id', 'territoryFills');
  territoryFeatures.forEach(({ name, feature }) => {
    territoryGroup.append('path')
      .datum(feature)
      .attr('class', 'territory-fill')
      .attr('data-territory', name)
      .attr('d', path)
      .attr('fill', 'rgba(255,255,255,0.04)')
      .attr('fill-opacity', 0.45)
      .attr('stroke', 'none')
      .attr('pointer-events', 'all')
      .on('mouseenter', function() {
        const base = parseFloat(this.dataset.baseOpacity || 0.45);
        d3.select(this)
          .attr('stroke', 'rgba(255,255,255,0.75)')
          .attr('stroke-width', 1.5)
          .attr('fill-opacity', Math.min(base + 0.18, 1));
      })
      .on('mouseleave', function() {
        const base = parseFloat(this.dataset.baseOpacity || 0.45);
        d3.select(this)
          .attr('stroke', 'none')
          .attr('fill-opacity', base);
      })
      .on('click', function() {
        openTerritoryPanel(this.dataset.territory);
      });
  });
  updateTerritoryFills();

  // Territory centroid labels
  const labelGroup = svg.append('g').attr('clip-path', 'url(#globe-clip)').attr('id', 'territoryLabels');
  territoryFeatures.forEach(({ name, feature }) => {
    const tData = TERRITORY_DATA.find(t => t.name === name);
    const c = tData?.labelPoint || d3.geoCentroid(feature);
    labelGroup.append('text')
      .datum({ lat: c[1], lng: c[0] })
      .attr('class', 'territory-label')
      .attr('data-territory', name)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'rgba(255,255,255,0.85)')
      .attr('font-size', '9')
      .attr('font-weight', '700')
      .attr('letter-spacing', '1')
      .attr('pointer-events', 'none')
      .attr('style', 'text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,0.9);font-family:var(--font)')
      .text(name);
  });
  updateTerritoryLabels(projection);

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
    .on('start', () => { isDragging = true; stopAutoRotate(); globeIntroPlaying = false; })
    .on('drag', (event) => {
      const sens = 0.3 * (window._globe.baseScale / projection.scale());
      globeRotation[0] += event.dx * sens;
      globeRotation[1] -= event.dy * sens;
      globeRotation[1] = Math.max(-90, Math.min(90, globeRotation[1]));
      projection.rotate(globeRotation);
      svg.select('.graticule').attr('d', path);
      svg.select('.land').attr('d', path);
      svg.selectAll('.territory-fill').attr('d', path);
      updateTerritoryLabels(projection);
      updateMarkers(projection);
    })
    .on('end', () => { isDragging = false; if (!venuePanelOpen) startIdleDrift(); });

  svg.call(drag);

  const minScale = radius * 0.5;
  const maxScale = radius * 6;

  svg.on('wheel', (event) => {
    event.preventDefault();
    const [tx, ty] = projection.translate();
    const scale = projection.scale();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * factor));
    const rect = wrap.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const newTx = mx - (newScale / scale) * (mx - tx);
    const newTy = my - (newScale / scale) * (my - ty);
    projection.scale(newScale).translate([newTx, newTy]);
    updateGlobeZoomElements();
  });

  svg.on('dblclick', (event) => {
    event.preventDefault();
    const [tx, ty] = projection.translate();
    const scale = projection.scale();
    const newScale = Math.min(maxScale, scale * 1.8);
    const rect = wrap.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const newTx = mx - (newScale / scale) * (mx - tx);
    const newTy = my - (newScale / scale) * (my - ty);
    projection.scale(newScale).translate([newTx, newTy]);
    updateGlobeZoomElements();
  });

  // Store refs for use in update functions
  window._globe = { svg, projection, path, radius, W, H, baseScale: radius, baseTranslate: [W / 2, H / 2] };

  if (typeof renderVenueMarkers === 'function') renderVenueMarkers(markerGroup, projection, tooltip);
  playIntroAnimation();
}

function updateMarkers(projection) {
  d3.selectAll('.venue-marker').each(function(d) {
    const [x, y] = projection([d.lng, d.lat]);
    const visible = isVisible(d.lat, d.lng, projection);
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
  const dot = Math.sin(lat * toRad) * Math.sin(clat * toRad) +
              Math.cos(lat * toRad) * Math.cos(clat * toRad) * Math.cos((lng - clng) * toRad);
  const d = Math.acos(Math.max(-1, Math.min(1, dot)));
  return d < Math.PI / 2;
}

function updateGlobeZoomElements() {
  if (!window._globe) return;
  const { svg, projection, path } = window._globe;
  const [tx, ty] = projection.translate();
  const r = projection.scale();
  svg.select('.ocean-sphere').attr('cx', tx).attr('cy', ty).attr('r', r);
  d3.select('#globe-clip circle').attr('cx', tx).attr('cy', ty).attr('r', r);
  svg.select('.graticule').attr('d', path);
  svg.select('.land').attr('d', path);
  svg.selectAll('.territory-fill').attr('d', path);
  updateMarkers(projection);
  if (typeof updateTerritoryLabels === 'function') updateTerritoryLabels(projection);
}

function resetGlobe() {
  if (!window._globe) return;
  const { projection, baseScale, baseTranslate } = window._globe;
  globeRotation = [96.3, -35.1, 0];
  projection.rotate(globeRotation).scale(baseScale).translate(baseTranslate);
  updateGlobeZoomElements();
}

function updateTerritoryFills() {
  const controlMap = Object.fromEntries(territoryControl.map(t => [t.name, t]));
  const neutralColor = Object.fromEntries(TERRITORY_DATA.map(t => [t.name, t.color || 'rgba(255,255,255,0.15)']));
  d3.selectAll('.territory-fill').each(function() {
    const name = this.dataset.territory;
    const tc = controlMap[name];
    if (!tc || tc.matchesPlayed === 0) {
      d3.select(this).attr('fill', neutralColor[name]).attr('fill-opacity', 0.85).attr('data-base-opacity', 0.85);
    } else if (tc.contested) {
      const [pA, pB] = tc.contestedPlayers;
      const id = pA < pB ? `stripe-${pA}-${pB}` : `stripe-${pB}-${pA}`;
      d3.select(this).attr('fill', `url(#${id})`).attr('fill-opacity', 0.75).attr('data-base-opacity', 0.75);
    } else {
      d3.select(this).attr('fill', ownerHexColors[tc.controller]).attr('fill-opacity', 0.65).attr('data-base-opacity', 0.65);
    }
  });
  updateMarkerColors();
}

function updateTerritoryLabels(projection) {
  d3.selectAll('.territory-label').each(function(d) {
    if (!d) return;
    const [x, y] = projection([d.lng, d.lat]);
    const visible = isVisible(d.lat, d.lng, projection);
    d3.select(this).attr('x', x).attr('y', y).attr('opacity', visible ? 0.85 : 0);
  });
}

function updateMarkerColors() {
  const venueToTerr = {};
  for (const t of TERRITORY_DATA) { for (const vn of t.venues) venueToTerr[vn] = t.name; }
  const controlMap = Object.fromEntries(territoryControl.map(t => [t.name, t]));
  d3.selectAll('.venue-marker').each(function(d) {
    if (!d || !d.name) return;
    const tc = controlMap[venueToTerr[d.name]];
    const color = tc?.controller ? ownerHexColors[tc.controller] : 'rgba(255,255,255,0.35)';
    d3.select(this).select('circle.inner').attr('fill', color);
    d3.select(this).select('circle.outer').attr('fill', color);
  });
}

function stopAutoRotate() {
  if (autoRotateRaf) { cancelAnimationFrame(autoRotateRaf); autoRotateRaf = null; }
}

function startIdleDrift() {
  stopAutoRotate();
  if (venuePanelOpen) return;
  driftBase = [globeRotation[0], globeRotation[1], 0];
  const t0 = performance.now();
  function tick(now) {
    if (isDragging || venuePanelOpen || globeIntroPlaying) {
      autoRotateRaf = requestAnimationFrame(tick);
      return;
    }
    const t = (now - t0) / 1000;
    globeRotation[0] = driftBase[0] + 14 * Math.sin(t * 0.14);
    globeRotation[1] = driftBase[1] + 6 * Math.sin(t * 0.09);
    if (window._globe) {
      const { projection, path, svg } = window._globe;
      projection.rotate(globeRotation);
      svg.select('.graticule').attr('d', path);
      svg.select('.land').attr('d', path);
      svg.selectAll('.territory-fill').attr('d', path);
      updateTerritoryLabels(projection);
      updateMarkers(projection);
    }
    autoRotateRaf = requestAnimationFrame(tick);
  }
  autoRotateRaf = requestAnimationFrame(tick);
}

function playIntroAnimation() {
  if (!window._globe) return;
  stopAutoRotate();
  globeIntroPlaying = true;
  const { projection, baseTranslate, radius } = window._globe;
  const startRot = [0, -15, 0];
  const endRot = [96.3, -35.1, 0];
  const startScale = radius * 0.65;
  const endScale = radius * 1.8;
  const duration = 2800;
  globeRotation = [...startRot];
  projection.rotate(globeRotation).scale(startScale).translate(baseTranslate);
  updateGlobeZoomElements();
  const t0 = performance.now();
  function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function tick(now) {
    if (!globeIntroPlaying) return;
    const raw = Math.min((now - t0) / duration, 1);
    const e = ease(raw);
    globeRotation[0] = startRot[0] + (endRot[0] - startRot[0]) * e;
    globeRotation[1] = startRot[1] + (endRot[1] - startRot[1]) * e;
    const scale = startScale + (endScale - startScale) * e;
    projection.rotate(globeRotation).scale(scale).translate(baseTranslate);
    updateGlobeZoomElements();
    if (raw < 1) {
      autoRotateRaf = requestAnimationFrame(tick);
    } else {
      globeIntroPlaying = false;
      globeRotation = [...endRot];
      driftBase = [...endRot];
      startIdleDrift();
    }
  }
  autoRotateRaf = requestAnimationFrame(tick);
}

function renderVenueMarkers(markerGroup, projection, tooltip) {
  const venueToTerr = {};
  for (const t of TERRITORY_DATA) { for (const vn of t.venues) venueToTerr[vn] = t.name; }
  const terrControl = Object.fromEntries(territoryControl.map(t => [t.name, t]));
  const markerColor = venueName => {
    const tc = terrControl[venueToTerr[venueName]];
    return tc?.controller ? ownerHexColors[tc.controller] : 'rgba(255,255,255,0.35)';
  };

  Object.entries(VENUE_DATA).forEach(([name, v]) => {
    const [x, y] = projection([v.lng, v.lat]);
    const color = markerColor(name);
    const visible = isVisible(v.lat, v.lng, projection);

    const g = markerGroup.append('g')
      .datum({ ...v, name })
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

function openVenuePanel(name) {
  venuePanelOpen = true;
  stopAutoRotate();
  const v = VENUE_DATA[name];
  const flagMap = { MX: '🇲🇽', CA: '🇨🇦', US: '🇺🇸' };
  document.getElementById('vpName').textContent = name;
  document.getElementById('vpCity').textContent = `${flagMap[v.country]} ${v.city}`;
  document.getElementById('venuePanel').classList.add('open');
  document.getElementById('drawerBackdrop').style.display = 'block';
  requestAnimationFrame(() => document.getElementById('drawerBackdrop').classList.add('active'));
  renderVenueMatches(name);
}

function openTerritoryPanel(name) {
  venuePanelOpen = true;
  stopAutoRotate();
  document.getElementById('drawerBackdrop').style.display = 'block';
  requestAnimationFrame(() => document.getElementById('drawerBackdrop').classList.add('active'));
  const tc = territoryControl.find(t => t.name === name);
  document.getElementById('vpName').textContent = name;
  let subtitle = 'Uncontested';
  if (tc && tc.matchesPlayed > 0) {
    if (tc.contested) {
      subtitle = '⚔️ Contested';
    } else if (tc.controller) {
      const pts = tc.totalPts?.[tc.controller] ?? 0;
      subtitle = `Controlled by ${tc.controller} · ${pts} pts`;
    }
  }
  document.getElementById('vpCity').textContent = subtitle;
  document.getElementById('venuePanel').classList.add('open');
  renderTerritoryPanel(name);
}

function renderTerritoryPanel(territoryName) {
  const players = PLAYERS;
  const territory = TERRITORY_DATA.find(t => t.name === territoryName);
  const tc = territoryControl.find(t => t.name === territoryName);
  const now = Date.now();
  let html = '';

  // Standings
  html += `<div class="tp-section-title">Standings</div>`;
  if (!tc || tc.matchesPlayed === 0) {
    html += `<div style="padding:6px 20px 12px;color:var(--text-muted);font-size:0.82rem">No matches played yet</div>`;
  } else {
    const ranked = players.slice().sort((a, b) => (tc.totalPts[b] || 0) - (tc.totalPts[a] || 0));
    html += `<div class="tp-standings">`;
    ranked.forEach((p, i) => {
      const pts = tc.totalPts[p] ?? 0;
      const isLeader = p === tc.controller || (tc.contested && tc.contestedPlayers.includes(p));
      html += `<div class="tp-player-row">
        <span class="tp-rank">${i + 1}</span>
        <span class="ts-dot" style="background:${ownerHexColors[p]}"></span>
        <span class="tp-player-name" style="${isLeader ? `color:${ownerHexColors[p]}` : ''}">${p}</span>
        <span class="tp-avg">${pts} pts</span>
      </div>`;
    });
    html += `</div>`;
  }

  // Matches grouped by venue
  html += `<div class="tp-section-title">Matches</div>`;
  for (const venueName of territory.venues) {
    const venue = VENUE_DATA[venueName];
    if (!venue) continue;
    html += `<div class="tp-venue-header">${venueName}</div>`;
    for (const key of venue.matches) {
      const m = matchByKey[key];
      if (!m) continue;
      const { date, time, tz, team1, team2, group, score1, score2 } = m;
      const kickoff = toDate(date, time, tz);
      const isFinished = m.isComplete;
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

      const safeVenue = venueName.replace(/'/g, "\\'");
      html += `<div class="vm-row tp-clickable" onclick="openVenuePanel('${safeVenue}')">
        <div class="vm-teams">
          <img src="${flagUrl(iso1)}" alt="" loading="lazy" onerror="this.style.display='none'">
          ${team1} <span class="vm-vs">vs</span> ${team2}
          <img src="${flagUrl(iso2)}" alt="" loading="lazy" onerror="this.style.display='none'">
        </div>
        <div class="vm-meta">${formatDateLabel(date, time, tz)} · Grp ${group} · ${scoreOrTime}</div>
        <div class="vm-preds">${predHtml}</div>
      </div>`;
    }
  }

  document.getElementById('vpMatches').innerHTML = html;
}

function closeVenuePanel() {
  venuePanelOpen = false;
  document.getElementById('venuePanel').classList.remove('open');
  document.getElementById('vpMatches').innerHTML = '';
  const backdrop = document.getElementById('drawerBackdrop');
  backdrop.classList.remove('active');
  backdrop.addEventListener('transitionend', () => { backdrop.style.display = 'none'; }, { once: true });
  if (!isDragging) startIdleDrift();
}

function renderVenueMatches(venueName) {
  const v = VENUE_DATA[venueName];
  const now = Date.now();
  const players = PLAYERS;
  let html = '';

  for (const key of v.matches) {
    const m = matchByKey[key];
    if (!m) continue;

    const { date, time, tz, team1, team2, group, score1, score2 } = m;
    const kickoff = toDate(date, time, tz);
    const isFinished = m.isComplete;
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
