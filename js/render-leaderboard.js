// ── SORT STATE (independent per leaderboard) ──
let matchSort = { col: 'pts', dir: 'desc' };
let predSort = { col: 'predPts', dir: 'desc' };

function sortMatchLeaderboard(col) {
  if (matchSort.col === col) {
    matchSort.dir = matchSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    matchSort.col = col;
    matchSort.dir = 'desc';
  }
  renderMatchLeaderboard();
}

function sortPredLeaderboard(col) {
  if (predSort.col === col) {
    predSort.dir = predSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    predSort.col = col;
    predSort.dir = 'desc';
  }
  renderPredLeaderboard();
}

// ── MATCH RESULTS LEADERBOARD ──
function calcMatchLeaderboard() {
  const scores = {};
  for (const name of Object.keys(people)) scores[name] = { pts: 0, w: 0, d: 0, l: 0 };

  for (const m of matchData) {
    const { score1, score2, team1, team2, isComplete } = m;
    if (!isComplete) continue;
    if (score1 === null || score2 === null) continue;
    const o1 = teamOwner[team1], o2 = teamOwner[team2];
    if (!o1 || !o2) continue;

    if (score1 > score2) { scores[o1].pts += 3; scores[o1].w++; scores[o2].l++; }
    else if (score2 > score1) { scores[o2].pts += 3; scores[o2].w++; scores[o1].l++; }
    else { scores[o1].pts += 1; scores[o2].pts += 1; scores[o1].d++; scores[o2].d++; }
  }

  const standings = Object.entries(scores).map(([name, s]) => ({ name, ...s }));

  const { col, dir } = matchSort;
  const m = dir === 'desc' ? 1 : -1;
  standings.sort((a, b) => {
    if (col === 'pts') return (b.pts - a.pts) * m || (b.w - a.w) * m;
    return (b.pts - a.pts) * m || (b.w - a.w) * m;
  });

  return standings;
}

function renderMatchLeaderboard() {
  const standings = calcMatchLeaderboard();
  const tbody = document.querySelector('#matchLeaderboard tbody');
  if (!tbody) return;
  tbody.innerHTML = standings.map((p, i) => `
    <tr>
      <td class="rank rank-${i+1}">${i+1}</td>
      <td class="player-cell" style="cursor:pointer" onclick="showUserProfile('${p.name}')">${typeof avatarHtml === 'function' ? avatarHtml(p.name, 22) : ''} ${playerDisplayName(p.name)}</td>
      <td class="wdl">${p.w}–${p.d}–${p.l}</td>
      <td class="pts">${p.pts}</td>
    </tr>
  `).join('');

  // Sort arrow
  const arrow = (col) => {
    if (matchSort.col !== col) return '';
    return matchSort.dir === 'desc' ? '▼' : '▲';
  };
  const el = document.getElementById('sortArrowMatchPts');
  if (el) el.textContent = arrow('pts');
}

// ── PREDICTIONS LEADERBOARD ──
function calcPredLeaderboard() {
  const stats = getPredStatsByPlayer();
  const standings = Object.entries(stats).map(([name, s]) => ({
    name,
    predPts: s.pts,
    settled: s.settled,
    exact: s.exact,
    bestStreak: s.best,
    avg: s.settled > 0 ? (s.pts / s.settled).toFixed(2) : '0.00'
  }));

  const { col, dir } = predSort;
  const m = dir === 'desc' ? 1 : -1;
  standings.sort((a, b) => {
    if (col === 'predPts') return (b.predPts - a.predPts) * m;
    return (b.predPts - a.predPts) * m;
  });

  return standings;
}

function renderPredLeaderboard() {
  const standings = calcPredLeaderboard();
  const tbody = document.querySelector('#predLeaderboard tbody');
  if (!tbody) return;
  tbody.innerHTML = standings.map((p, i) => `
    <tr>
      <td class="rank rank-${i+1}">${i+1}</td>
      <td class="player-cell" style="cursor:pointer" onclick="showUserProfile('${p.name}')">${typeof avatarHtml === 'function' ? avatarHtml(p.name, 22) : ''} ${playerDisplayName(p.name)}</td>
      <td class="pts">${p.predPts}</td>
      <td class="sub-pts">${p.avg}</td>
      <td class="sub-pts">${p.exact}</td>
      <td class="sub-pts">${p.bestStreak}</td>
    </tr>
  `).join('');

  const arrow = (col) => {
    if (predSort.col !== col) return '';
    return predSort.dir === 'desc' ? '▼' : '▲';
  };
  const el = document.getElementById('sortArrowPredPts');
  if (el) el.textContent = arrow('predPts');
}

// ── COMBINED RENDER (called from switchTab) ──
function renderLeaderboard() {
  renderMatchLeaderboard();
  renderPredLeaderboard();
  renderAwards(calcMatchLeaderboard());
  renderJokerStats();
}

// ── TOURNAMENT AWARDS ──
function renderAwards(standings) {
  const el = document.getElementById('awardsWrap');
  if (!el) return;
  const stats = getPredStatsByPlayer();
  const entries = Object.entries(stats);
  const awards = [];

  const pick = (metric, min, icon, name, fmt) => {
    const eligible = entries.filter(([, s]) => s[metric] >= min)
      .sort((x, y) => y[1][metric] - x[1][metric]);
    if (!eligible.length) return;
    const top = eligible[0][1][metric];
    const holders = eligible.filter(([, s]) => s[metric] === top).map(([n]) => n);
    awards.push([icon, name, holders.join(' & '), fmt(eligible[0][1])]);
  };

  const acc = entries.filter(([, s]) => s.settled >= 3)
    .map(([n, s]) => [n, Math.round((s.scored / s.settled) * 100), s.settled])
    .sort((x, y) => y[1] - x[1]);
  if (acc.length) awards.push(['🎯', 'Sharpshooter', acc[0][0], `${acc[0][1]}% results called right`]);
  pick('exact', 1, '⭐', 'Star Gazer', s => `${s.exact} exact score${s.exact > 1 ? 's' : ''}`);
  pick('best', 2, '🔥', 'Hot Streak', s => `${s.best} correct results in a row`);
  pick('upsets', 1, '💣', 'Upset Oracle', s => `${s.upsets} underdog win${s.upsets > 1 ? 's' : ''} called`);
  pick('jokerPts', 1, '🃏', 'Joker Master', s => `+${s.jokerPts} bonus pts from jokers`);
  const bottom = standings[standings.length - 1];
  if (bottom && standings.length > 1 && bottom.pts < standings[0].pts) {
    awards.push(['🥄', 'Wooden Spoon', bottom.name, `${bottom.pts} match pts… so far`]);
  }

  el.innerHTML = awards.length ? `<div class="awards-title label-sm">🏆 Tournament Awards</div><div class="awards-grid">${awards.map(([icon, name, holder, detail]) => `
    <div class="award-card"><span class="aw-icon">${icon}</span><div><div class="aw-name">${name}</div><div class="aw-holder">${holder === 'Laurie' ? playerDisplayName('Laurie') : holder}</div><div class="aw-detail">${detail}</div></div></div>`).join('')}</div>` : '';
}

function calcPredPoints(homePred, awayPred, homeActual, awayActual) {
  let pts = 0;
  if (Math.sign(homePred - awayPred) === Math.sign(homeActual - awayActual)) pts += 1;
  if (homePred === homeActual) pts += 2;
  if (awayPred === awayActual) pts += 2;
  return pts;
}

// Per-player prediction stats over settled matches, in kickoff order.
// Shared by the leaderboard, profile badges, and tournament awards.
function getPredStatsByPlayer() {
  const stats = {};
  const finished = matchData
    .filter(m => m.isComplete)
    .sort((a, b) => toDate(a.date, a.time, a.tz) - toDate(b.date, b.time, b.tz));
  for (const m of finished) {
    const mid = matchIdByTeamDate[`${m.team1}|${m.team2}|${m.date}`];
    if (!mid) continue;
    for (const p of (predLookup[mid] || [])) {
      if (p.home === undefined || p.home === null) continue;
    if (m.score1 === null || m.score2 === null) continue;
if (!stats[p.player_name]) stats[p.player_name] = { settled: 0, pts: 0, exact: 0, scored: 0, cur: 0, best: 0, upsets: 0, jokerPts: 0, jokersUsed: 0, jokerBest: 0, jokerBestMatch: '', jokerWorst: 999, jokerWorstMatch: '' };
const st = stats[p.player_name];
const base = calcPredPoints(p.home, p.away, m.score1, m.score2);
st.settled++;
st.pts += p.j ? base * 2 : base;
if (p.j) {
  st.jokerPts += base;
  st.jokersUsed++;
  const doubled = base * 2;
  if (doubled > st.jokerBest) { st.jokerBest = doubled; st.jokerBestMatch = `${m.team1} ${m.score1}-${m.score2} ${m.team2}`; }
  if (doubled < st.jokerWorst) { st.jokerWorst = doubled; st.jokerWorstMatch = `${m.team1} ${m.score1}-${m.score2} ${m.team2}`; }
}
      if (base === 5) st.exact++;
      const resultRight = Math.sign(p.home - p.away) === Math.sign(m.score1 - m.score2);
      if (resultRight) { st.scored++; st.cur++; st.best = Math.max(st.best, st.cur); }
      else st.cur = 0;
      const predWinner = p.home > p.away ? 1 : p.away > p.home ? 2 : 0;
      const actualWinner = m.score1 > m.score2 ? 1 : m.score2 > m.score1 ? 2 : 0;
      if (predWinner !== 0 && predWinner === actualWinner) {
        const prob = predWinner === 1 ? m.prob1 : m.prob2;
        if (prob != null && prob < 35) st.upsets++;
      }
    }
  }
  return stats;
}

function calcTerritoryControl() {
  territoryControl = TERRITORY_DATA.map(territory => {
    const totalMatches = territory.venues.reduce((n, v) => n + (VENUE_DATA[v]?.matches.length || 0), 0);
    let matchesPlayed = 0;
    const totals = Object.fromEntries(PLAYERS.map(p => [p, 0]));

    for (const venueName of territory.venues) {
      const venue = VENUE_DATA[venueName];
      if (!venue) continue;
      for (const key of venue.matches) {
        const m = matchByKey[key];
        if (!m || !m.isComplete) continue;
        matchesPlayed++;
        const matchId = matchIdByTeamDate[key];
        if (!matchId) continue;
        const preds = predLookup[matchId] || [];
        for (const player of PLAYERS) {
          const pred = preds.find(p => p.player_name === player);
          if (pred && pred.home !== null && pred.home !== undefined) {
            totals[player] += calcPredPoints(pred.home, pred.away, m.score1, m.score2);
          }
        }
      }
    }

    if (matchesPlayed === 0) {
      return { name: territory.name, controller: null, contested: false, contestedPlayers: [], totalPts: {}, matchesPlayed: 0, totalMatches };
    }

    const maxPts = Math.max(...Object.values(totals));
    const leaders = PLAYERS.filter(p => totals[p] === maxPts);

    return {
      name: territory.name,
      controller: leaders.length === 1 ? leaders[0] : null,
      contested: leaders.length > 1,
      contestedPlayers: leaders.length > 1 ? leaders : [],
      totalPts: { ...totals },
      matchesPlayed,
      totalMatches,
    };
  });
}

function calcTerritoryControlForTerritory(territory, excludeKeys) {
  const totalMatches = territory.venues.reduce((n, v) => n + (VENUE_DATA[v]?.matches.length || 0), 0);
  let matchesPlayed = 0;
  const totals = Object.fromEntries(PLAYERS.map(p => [p, 0]));

  for (const venueName of territory.venues) {
    const venue = VENUE_DATA[venueName];
    if (!venue) continue;
    for (const key of venue.matches) {
      if (excludeKeys && excludeKeys.has(key)) continue;
      const m = matchByKey[key];
      if (!m || !m.isComplete) continue;
      matchesPlayed++;
      const matchId = matchIdByTeamDate[key];
      if (!matchId) continue;
      const preds = predLookup[matchId] || [];
      for (const player of PLAYERS) {
        const pred = preds.find(p => p.player_name === player);
        if (pred && pred.home !== null && pred.home !== undefined) {
          totals[player] += calcPredPoints(pred.home, pred.away, m.score1, m.score2);
        }
      }
    }
  }

  if (matchesPlayed === 0) {
    return { controller: null, contested: false, contestedPlayers: [], totalPts: {}, matchesPlayed: 0, totalMatches };
  }

  const maxPts = Math.max(...Object.values(totals));
  const leaders = PLAYERS.filter(p => totals[p] === maxPts);

  return {
    controller: leaders.length === 1 ? leaders[0] : null,
    contested: leaders.length > 1,
    contestedPlayers: leaders.length > 1 ? leaders : [],
    totalPts: { ...totals },
    matchesPlayed,
    totalMatches,
  };
}

function calcBattleMapUpdates() {
  const completed = matchData
    .filter(m => m.isComplete)
    .sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || '00:00'}`);
      const db = new Date(`${b.date}T${b.time || '00:00'}`);
      return db - da;
    });
  const recent5 = completed.slice(0, 5);
  if (!recent5.length) return [];

  const recentKeys = new Set(recent5.map(m => `${m.team1}|${m.team2}|${m.date}`));

  const stories = [];

  for (const territory of TERRITORY_DATA) {
    const allTerritoryKeys = territory.venues.flatMap(v => VENUE_DATA[v]?.matches || []);
    const hasRecentMatch = allTerritoryKeys.some(k => recentKeys.has(k));
    if (!hasRecentMatch) continue;

    const territoryRecentKeys = new Set(allTerritoryKeys.filter(k => recentKeys.has(k)));

    const after = calcTerritoryControlForTerritory(territory, new Set());
    const before = calcTerritoryControlForTerritory(territory, territoryRecentKeys);

    const triggerKey = allTerritoryKeys.find(k => recentKeys.has(k));
    const triggerMatch = triggerKey ? triggerKey.split('|').slice(0, 2).join(' vs ') : '';

    const afterController = after.controller;
    const beforeController = before.controller;
    const afterContested = after.contested;
    const beforeContested = before.contested;

    const sortedAfter = Object.entries(after.totalPts).sort((a, b) => b[1] - a[1]);
    const afterMargin = sortedAfter[0] ? sortedAfter[0][1] - (sortedAfter[1]?.[1] ?? 0) : 0;

    let type, player, displaced, contestedPlayers, margin;

    if (afterController && !beforeController && !beforeContested) {
      type = 'seized';
      player = afterController;
      displaced = null;
      margin = afterMargin;
    } else if (afterController && !beforeController && beforeContested) {
      type = 'broke-deadlock';
      player = afterController;
      displaced = null;
      margin = afterMargin;
    } else if (afterController && beforeController && afterController !== beforeController) {
      type = 'wrested';
      player = afterController;
      displaced = beforeController;
      margin = afterMargin;
    } else if (afterContested && beforeController) {
      type = 'contested';
      player = null;
      displaced = beforeController;
      contestedPlayers = after.contestedPlayers;
      margin = 0;
    } else if (afterController && beforeController && afterController === beforeController) {
      const sortedBefore = Object.entries(before.totalPts).sort((a, b) => b[1] - a[1]);
      const beforeMargin = sortedBefore[0] ? sortedBefore[0][1] - (sortedBefore[1]?.[1] ?? 0) : 0;
      if (afterMargin <= beforeMargin) continue;
      type = 'extended';
      player = afterController;
      displaced = null;
      margin = afterMargin;
    } else {
      continue;
    }

    const matchesRemaining = after.totalMatches - after.matchesPlayed;

    stories.push({
      type,
      territory: territory.name,
      player,
      displaced,
      contestedPlayers: contestedPlayers || [],
      margin,
      triggerMatch,
      matchesRemaining,
    });
  }

  const order = { wrested: 0, seized: 1, 'broke-deadlock': 2, contested: 3, extended: 4 };
  stories.sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5));

  return stories;
}

function renderWarDispatch() {
  const el = document.getElementById('warDispatch');
  if (!el) return;

  const stories = calcBattleMapUpdates();

  const playerSpan = (name) =>
    `<span style="color:${ownerHexColors[name]}">${escapeHtml(name.toUpperCase())}</span>`;
  const territorySpan = (name) =>
    `<span class="wd-territory">${escapeHtml(name.toUpperCase())}</span>`;

  const masthead = `
    <div class="wd-masthead">
      <span class="wd-masthead-title">THE WAR DISPATCH</span>
      <span class="wd-masthead-sub">after last 5 results</span>
    </div>`;

  if (!stories.length) {
    el.innerHTML = masthead +
      `<div class="wd-stories"><div class="wd-empty">No territory changes from last 5 results</div></div>`;
    return;
  }

  const storyHtml = stories.map(s => {
    let headline, subline;
    const pts = s.margin;
    const ptStr = `${pts} pt${pts !== 1 ? 's' : ''}`;

    if (s.type === 'seized') {
      headline = `${playerSpan(s.player)} SEIZES ${territorySpan(s.territory)}`;
      subline = `Leads by ${ptStr} · ${escapeHtml(s.triggerMatch)}`;
    } else if (s.type === 'broke-deadlock') {
      headline = `${playerSpan(s.player)} BREAKS DEADLOCK IN ${territorySpan(s.territory)}`;
      subline = `${ptStr} clear · ${escapeHtml(s.triggerMatch)}`;
    } else if (s.type === 'wrested') {
      headline = `${playerSpan(s.player)} WRESTS ${territorySpan(s.territory)} FROM ${playerSpan(s.displaced)}`;
      subline = `Overtook by ${ptStr} · ${escapeHtml(s.triggerMatch)}`;
    } else if (s.type === 'contested') {
      const names = s.contestedPlayers.map(playerSpan).join(' and ');
      headline = `${territorySpan(s.territory)} NOW CONTESTED`;
      subline = `${names} level · ${s.matchesRemaining} match${s.matchesRemaining !== 1 ? 'es' : ''} remaining`;
    } else {
      headline = `${playerSpan(s.player)} EXTENDS GRIP ON ${territorySpan(s.territory)}`;
      subline = `${ptStr} clear · ${escapeHtml(s.triggerMatch)}`;
    }

    return `<div class="wd-story">
      <div class="wd-headline">${headline}</div>
      <div class="wd-subline">${subline}</div>
    </div>`;
  }).join('');

  el.innerHTML = masthead + `<div class="wd-stories">${storyHtml}</div>`;
}

function calcPredPointsForAll() {
  predPointsByPlayer = {};
  for (const [name, st] of Object.entries(getPredStatsByPlayer())) predPointsByPlayer[name] = st.pts;
}

function predResultBadge(homePred, awayPred, homeActual, awayActual, joker) {
  const base = calcPredPoints(homePred, awayPred, homeActual, awayActual);
  const pts = joker ? base * 2 : base;
  const j = joker ? '<span class="joker-mini" title="Joker — points doubled">🃏</span>' : '';
  if (base === 5) return `<span style="color:var(--gold);font-weight:700">${pts}★</span>${j}`;
  if (base >= 2) return `<span style="color:var(--accent);font-weight:700">${pts}</span>${j}`;
  if (base === 1) return `<span style="color:var(--text-secondary);font-weight:700">${pts}</span>${j}`;
  return `<span style="color:var(--live)">✗</span>${j}`;
}

function renderTerritoryStandings() {
  if (!territoryControl.length) return;
  const panel = document.getElementById('territoryStandings');
  if (!panel) return;
  panel.style.display = 'block';

  const allDone = territoryControl.every(t => t.matchesPlayed > 0 && t.matchesPlayed === t.totalMatches);

  const scores = Object.fromEntries(PLAYERS.map(p => [p, 0]));
  for (const t of territoryControl) {
    if (t.controller) scores[t.controller]++;
  }

  const champion = document.getElementById('tsChampion');
  if (allDone) {
    const maxScore = Math.max(...Object.values(scores));
    const winners = PLAYERS.filter(p => scores[p] === maxScore);
    if (winners.length === 1) {
      champion.innerHTML = `<div class="ts-champion"><div class="tc-icon">🏆</div><div><div class="tc-label">Territory Champion</div><div class="tc-name">${playerDisplayName(winners[0])}</div><div class="tc-detail">Controls ${maxScore} of 6 territories</div></div></div>`;
    } else {
      champion.innerHTML = `<div class="ts-champion"><div class="tc-icon">⚔️</div><div><div class="tc-label">Tied for Territory Champion</div><div class="tc-name">${winners.map(playerDisplayName).join(' · ')}</div><div class="tc-detail">${maxScore} territories each</div></div></div>`;
    }
  } else {
    champion.innerHTML = '';
  }

  document.getElementById('tsScores').innerHTML = PLAYERS.map(p =>
    `<div class="ts-score-badge"><span class="tsb-dot" style="background:${ownerHexColors[p]}"></span>${p} <span style="color:var(--text-muted);font-weight:400">${scores[p]}</span></div>`
  ).join('');

  document.getElementById('tsGrid').innerHTML = territoryControl.map(t => {
    const pct = t.totalMatches > 0 ? Math.round((t.matchesPlayed / t.totalMatches) * 100) : 0;
    if (t.matchesPlayed === 0) {
      return `<div class="ts-card uncontested"><div class="ts-name">${t.name}</div><div class="ts-controller" style="color:var(--text-muted)">Uncontested</div><div class="ts-progress"><div class="ts-progress-bar" style="width:0%"></div></div><div class="ts-avg" style="margin-top:4px">0/${t.totalMatches} matches</div></div>`;
    }
    if (t.contested) {
      const dots = t.contestedPlayers.map(p => `<span class="ts-dot" style="background:${ownerHexColors[p]}"></span>`).join('');
      return `<div class="ts-card contested"><div class="ts-name">${t.name}</div><div class="ts-controller">${dots}<span style="color:var(--text-muted)">Contested</span></div><div class="ts-progress"><div class="ts-progress-bar" style="width:${pct}%"></div></div><div class="ts-avg" style="margin-top:4px">${t.matchesPlayed}/${t.totalMatches} matches</div></div>`;
    }
    const pts = t.totalPts[t.controller] ?? 0;
return `<div class="ts-card controlled" style="border-left-color:${ownerHexColors[t.controller]}"><div class="ts-name">${t.name}</div><div class="ts-controller"><span class="ts-dot" style="background:${ownerHexColors[t.controller]}"></span><span style="color:${ownerHexColors[t.controller]}">${t.controller}</span></div><div class="ts-avg">${pts} pts</div><div class="ts-progress"><div class="ts-progress-bar" style="width:${pct}%"></div></div><div class="ts-avg" style="margin-top:4px">${t.matchesPlayed}/${t.totalMatches} matches</div></div>`;
}).join('');
}

// ── JOKER EFFICIENCY STATS ──
function renderJokerStats() {
const el = document.getElementById('jokerStatsWrap');
if (!el) return;
const stats = getPredStatsByPlayer();
const rows = Object.entries(stats)
.filter(([, s]) => s.jokersUsed > 0)
.sort((a, b) => {
  const avgA = a[1].jokerPts / a[1].jokersUsed;
  const avgB = b[1].jokerPts / b[1].jokersUsed;
  return avgB - avgA || b[1].jokerPts - a[1].jokerPts;
});

if (!rows.length) { el.innerHTML = ''; return; }

el.innerHTML = `
<div class="awards-title label-sm">🃏 Joker Efficiency</div>
<div class="joker-table-wrap">
  <table class="joker-table">
    <thead><tr><th></th><th>Used</th><th>Pts</th><th>Avg</th><th>Best</th><th>Worst</th></tr></thead>
    <tbody>${rows.map(([name, s], i) => {
      const avg = (s.jokerPts / s.jokersUsed).toFixed(1);
      const badge = avg >= 3 ? '⭐' : avg >= 2 ? '👍' : '👎';
      const worstShow = s.jokerWorst < 999 ? `${s.jokerWorst}★` : '—';
      return `<tr>
        <td><span class="joker-rank">${badge}</span> ${playerDisplayName(name)}</td>
        <td class="joker-num">${s.jokersUsed}</td>
        <td class="joker-num">+${s.jokerPts}</td>
        <td class="joker-num" style="color:${avg >= 3 ? 'var(--accent)' : avg >= 2 ? 'var(--gold)' : 'var(--live)'}">${avg}</td>
        <td class="joker-detail"><span style="color:var(--gold)">${s.jokerBest}★</span> <span class="joker-match">${s.jokerBestMatch}</span></td>
        <td class="joker-detail"><span style="color:${s.jokerWorst === 0 ? 'var(--live)' : 'var(--text-muted)'}">${worstShow}</span> <span class="joker-match">${s.jokerWorst < 999 ? s.jokerWorstMatch : ''}</span></td>
      </tr>`;
    }).join('')}</tbody>
  </table>
</div>`;
}

// ── LEGACY: used by render-groups.js and render-user-profile.js ──
function calcLeaderboard() {
  const matchLb = calcMatchLeaderboard();
  return matchLb.map(s => ({
    ...s,
    predPts: predPointsByPlayer[s.name] || 0,
    total: s.pts + (predPointsByPlayer[s.name] || 0),
  }));
}
