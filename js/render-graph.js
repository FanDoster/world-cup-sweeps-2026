// ── GRAPH TAB: Points over time line chart ──
// Renders an interactive canvas chart showing cumulative points per player
// across match days. Uses matchData (global from data.js), people (config.js),
// and predLookup (data.js) for prediction points.

const GRAPH_COLORS = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#00cec9',
  '#e17055', '#6c5ce7', '#fdcb6e', '#00b894', '#e84393', '#0984e3'
];
const GRAPH_PADDING = { top: 20, right: 30, bottom: 50, left: 50 };

function renderGraph() {
  const container = document.getElementById('leaderboardGraph');
  if (!container) return;

  const players = Object.keys(people);
  if (players.length === 0) {
    container.innerHTML = '<div class="graph-empty">No players configured</div>';
    return;
  }

  // Build time series: for each match day, compute cumulative points per player
  const days = buildTimeSeries(players);
  if (days.length === 0) {
    container.innerHTML = '<div class="graph-empty">No completed matches yet</div>';
    return;
  }

  const mode = window._graphMode || 'total'; // 'total' | 'match' | 'pred'

  const html = `
    <div class="graph-header">
      <span class="graph-title">POINTS PROGRESSION</span>
      <div class="graph-toggles">
        <button class="graph-mode-btn ${mode === 'total' ? 'active' : ''}" data-mode="total">TOTAL</button>
        <button class="graph-mode-btn ${mode === 'match' ? 'active' : ''}" data-mode="match">MATCH</button>
        <button class="graph-mode-btn ${mode === 'pred' ? 'active' : ''}" data-mode="pred">PREDICTIONS</button>
      </div>
    </div>
    <div class="graph-legend" id="graphLegend"></div>
    <div class="graph-canvas-wrap">
      <canvas id="graphCanvas"></canvas>
    </div>
    <div class="graph-xaxis" id="graphXAxis"></div>
  `;
  container.innerHTML = html;

  // Bind mode toggles
  container.querySelectorAll('.graph-mode-btn').forEach(btn => {
    btn.onclick = () => {
      window._graphMode = btn.dataset.mode;
      renderGraph();
    };
  });

  // Draw chart
  requestAnimationFrame(() => drawChart(players, days, mode));
}

function buildTimeSeries(players) {
  // Get completed matches sorted by date
  const completed = matchData
    .filter(m => m.isComplete && m.score1 !== null && m.score2 !== null)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.time || '') < (b.time || '') ? -1 : 1;
    });

  if (completed.length === 0) return [];

  // Build cumulative points per player at each match
  // We'll snapshot after each unique date
  const seen = new Set();
  const dates = [];
  for (const m of completed) {
    if (!seen.has(m.date)) {
      seen.add(m.date);
      dates.push(m.date);
    }
  }

  // Compute cumulative points at each date
  const series = [];
  for (const date of dates) {
    const matchesUpToDate = completed.filter(m => m.date <= date);
    const point = { date };
    for (const name of players) {
      point[name + '_match'] = calcCumulativeMatchPoints(name, matchesUpToDate);
      point[name + '_pred'] = calcCumulativePredPoints(name, matchesUpToDate);
      point[name + '_total'] = point[name + '_match'] + point[name + '_pred'];
    }
    series.push(point);
  }
  return series;
}

function calcCumulativeMatchPoints(player, matches) {
  let pts = 0;
  for (const m of matches) {
    const o1 = teamOwner[m.team1], o2 = teamOwner[m.team2];
    if (o1 === player) {
      if (m.score1 > m.score2) pts += 3;
      else if (m.score1 === m.score2) pts += 1;
    } else if (o2 === player) {
      if (m.score2 > m.score1) pts += 3;
      else if (m.score1 === m.score2) pts += 1;
    }
  }
  return pts;
}

function calcCumulativePredPoints(player, matches) {
  let pts = 0;
  for (const m of matches) {
    const mid = matchIdByTeamDate[m.team1 + '|' + m.team2 + '|' + m.date];
    if (!mid) continue;
    const pred = predLookup[mid] ? predLookup[mid][player] : null;
    if (!pred) continue;
    pts += calcPredResultPoints(pred, m);
  }
  return pts;
}

function calcPredResultPoints(pred, match) {
  if (pred.home === undefined || pred.away === undefined) return 0;
  let pts = 0;
  const isExact = pred.home === match.score1 && pred.away === match.score2;
  const predResult = pred.home > pred.away ? 'home' : pred.home < pred.away ? 'away' : 'draw';
  const actualResult = match.score1 > match.score2 ? 'home' : match.score1 < match.score2 ? 'away' : 'draw';

  if (isExact) {
    pts += 5; // exact score
  } else if (predResult === actualResult) {
    pts += 2; // correct result
  }
  if (pred.joker) pts *= 2;
  return pts;
}

function drawChart(players, days, mode) {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;

  // Size canvas
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth;
  const H = Math.max(320, Math.min(500, W * 0.6));
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = GRAPH_PADDING;
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // Compute max value
  let maxVal = 1;
  const suffix = '_' + mode;
  for (const d of days) {
    for (const p of players) {
      const v = d[p + suffix] || 0;
      if (v > maxVal) maxVal = v;
    }
  }
  maxVal = Math.ceil(maxVal / 10) * 10 + 10; // round up with padding

  // Draw lines for each player
  const n = days.length;
  players.forEach((name, pi) => {
    const color = GRAPH_COLORS[pi % GRAPH_COLORS.length];
    const key = name + suffix;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    let first = true;
    for (let i = 0; i < n; i++) {
      const d = days[i];
      const x = pad.left + (chartW / (n - 1 || 1)) * i;
      const val = d[key] || 0;
      const y = pad.top + chartH - (val / maxVal) * chartH;
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw dots
    for (let i = 0; i < n; i++) {
      const d = days[i];
      const x = pad.left + (chartW / (n - 1 || 1)) * i;
      const val = d[key] || 0;
      const y = pad.top + chartH - (val / maxVal) * chartH;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Final value label
    const last = days[n - 1];
    const lx = pad.left + chartW + 4;
    const ly = pad.top + chartH - ((last[key] || 0) / maxVal) * chartH;
    ctx.fillStyle = color;
    ctx.font = 'bold 12px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.split(' ')[0], lx, ly);
  });

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(W - pad.right, pad.top + chartH);
  ctx.stroke();

  // Y-axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px "SF Mono", Monaco, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((maxVal / 4) * i);
    const y = pad.top + chartH - (chartH / 4) * i;
    ctx.fillText(val, pad.left - 8, y);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < n; i++) {
    const x = pad.left + (chartW / (n - 1 || 1)) * i;
    const dateStr = days[i].date;
    const parts = dateStr.split('-');
    const label = parts[2] + '/' + parts[1]; // DD/MM
    ctx.fillText(label, x, pad.top + chartH + 8);
  }

  // Legend
  const legend = document.getElementById('graphLegend');
  if (legend) {
    legend.innerHTML = players.map((name, i) => {
      const color = GRAPH_COLORS[i % GRAPH_COLORS.length];
      const lastDay = days[days.length - 1];
      const val = lastDay[name + suffix] || 0;
      return `<span class="graph-legend-item">
        <span class="graph-legend-dot" style="background:${color}"></span>
        ${playerDisplayName ? playerDisplayName(name) : name} (${val} pts)
      </span>`;
    }).join('');
  }
}
