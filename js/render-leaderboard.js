function calcLeaderboard() {
  const scores = {};
  for (const name of Object.keys(people)) scores[name] = { pts: 0, w: 0, d: 0, l: 0 };

  for (const m of matchData) {
    const { score1, score2, team1, team2 } = m;
    if (score1 === null || score2 === null) continue;
    const o1 = teamOwner[team1], o2 = teamOwner[team2];
    if (!o1 || !o2) continue;

    if (score1 > score2) { scores[o1].pts += 3; scores[o1].w++; scores[o2].l++; }
    else if (score2 > score1) { scores[o2].pts += 3; scores[o2].w++; scores[o1].l++; }
    else { scores[o1].pts += 1; scores[o2].pts += 1; scores[o1].d++; scores[o2].d++; }
  }

  return Object.entries(scores)
    .map(([name, s]) => {
      const predPts = predPointsByPlayer[name] || 0;
      return { name, ...s, predPts, total: s.pts + predPts };
    })
    .sort((a, b) => b.total - a.total || b.pts - a.pts || b.w - a.w);
}

function renderLeaderboard() {
  const standings = calcLeaderboard();
  const tbody = document.querySelector('#leaderboard tbody');
  tbody.innerHTML = standings.map((p, i) => `
    <tr>
      <td class="rank rank-${i+1}">${i+1}</td>
      <td class="player-cell">${p.name}</td>
      <td class="wdl">${p.w}–${p.d}–${p.l}</td>
      <td class="sub-pts">${p.pts}</td>
      <td class="sub-pts">${p.predPts}</td>
      <td class="pts">${p.total}</td>
    </tr>
  `).join('');
  renderAwards(standings);
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
  if (bottom && standings.length > 1 && bottom.total < standings[0].total) {
    awards.push(['🥄', 'Wooden Spoon', bottom.name, `${bottom.total} total pts… so far`]);
  }

  el.innerHTML = awards.length ? `<div class="awards-title">🏆 Tournament Awards</div><div class="awards-grid">${awards.map(([icon, name, holder, detail]) => `
    <div class="award-card"><span class="aw-icon">${icon}</span><div><div class="aw-name">${name}</div><div class="aw-holder">${holder}</div><div class="aw-detail">${detail}</div></div></div>`).join('')}</div>` : '';
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
    .filter(m => m.score1 !== null && m.score2 !== null)
    .sort((a, b) => toDate(a.date, a.time, a.tz) - toDate(b.date, b.time, b.tz));
  for (const m of finished) {
    const mid = matchIdByTeamDate[`${m.team1}|${m.team2}|${m.date}`];
    if (!mid) continue;
    for (const p of (predLookup[mid] || [])) {
      if (p.home === undefined || p.home === null) continue;
      if (!stats[p.player_name]) stats[p.player_name] = { settled: 0, pts: 0, exact: 0, scored: 0, cur: 0, best: 0, upsets: 0, jokerPts: 0 };
      const st = stats[p.player_name];
      const base = calcPredPoints(p.home, p.away, m.score1, m.score2);
      st.settled++;
      st.pts += p.j ? base * 2 : base;
      if (p.j) st.jokerPts += base;
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
        if (!m || m.score1 === null || m.score2 === null) continue;
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
      champion.innerHTML = `<div class="ts-champion"><div class="tc-icon">🏆</div><div><div class="tc-label">Territory Champion</div><div class="tc-name">${winners[0]}</div><div class="tc-detail">Controls ${maxScore} of 6 territories</div></div></div>`;
    } else {
      champion.innerHTML = `<div class="ts-champion"><div class="tc-icon">⚔️</div><div><div class="tc-label">Tied for Territory Champion</div><div class="tc-name">${winners.join(' · ')}</div><div class="tc-detail">${maxScore} territories each</div></div></div>`;
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
