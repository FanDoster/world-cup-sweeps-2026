1|// ── LEADERBOARD SORT STATE ──
2|let leaderboardSort = { col: 'total', dir: 'desc' };
3|
4|function sortLeaderboard(col) {
5|  if (leaderboardSort.col === col) {
6|    leaderboardSort.dir = leaderboardSort.dir === 'desc' ? 'asc' : 'desc';
7|  } else {
8|    leaderboardSort.col = col;
9|    leaderboardSort.dir = 'desc';
10|  }
11|  renderLeaderboard();
12|}
13|
14|function calcLeaderboard() {
15|  const scores = {};
16|  for (const name of Object.keys(people)) scores[name] = { pts: 0, w: 0, d: 0, l: 0 };
17|
18|  for (const m of matchData) {
const { score1, score2, team1, team2, isComplete } = m;
if (!isComplete) continue;
21|    const o1 = teamOwner[team1], o2 = teamOwner[team2];
22|    if (!o1 || !o2) continue;
23|
24|    if (score1 > score2) { scores[o1].pts += 3; scores[o1].w++; scores[o2].l++; }
25|    else if (score2 > score1) { scores[o2].pts += 3; scores[o2].w++; scores[o1].l++; }
26|    else { scores[o1].pts += 1; scores[o2].pts += 1; scores[o1].d++; scores[o2].d++; }
27|  }
28|
29|  const standings = Object.entries(scores)
30|    .map(([name, s]) => {
31|      const predPts = predPointsByPlayer[name] || 0;
32|      return { name, ...s, predPts, total: s.pts + predPts };
33|    });
34|
35|  const { col, dir } = leaderboardSort;
36|  const m = dir === 'desc' ? -1 : 1;
37|  standings.sort((a, b) => {
38|    if (col === 'pts') return (b.pts - a.pts) * m || (b.w - a.w) * m;
39|    if (col === 'predPts') return (b.predPts - a.predPts) * m || (b.pts - a.pts) * m;
40|    return (b.total - a.total) * m || (b.pts - a.pts) * m || (b.w - a.w) * m;
41|  });
42|
43|  return standings;
44|}
45|
46|function renderLeaderboard() {
47|  const standings = calcLeaderboard();
48|  const tbody = document.querySelector('#leaderboard tbody');
49|  tbody.innerHTML = standings.map((p, i) => `
50|    <tr>
51|      <td class="rank rank-${i+1}">${i+1}</td>
52|      <td class="player-cell">${playerDisplayName(p.name)}</td>
53|      <td class="wdl">${p.w}–${p.d}–${p.l}</td>
54|      <td class="sub-pts">${p.pts}</td>
55|      <td class="sub-pts">${p.predPts}</td>
56|      <td class="pts">${p.total}</td>
57|    </tr>
58|  `).join('');
59|
60|  // Update sort arrows
61|  const arrow = (col) => {
62|    if (leaderboardSort.col !== col) return '';
63|    return leaderboardSort.dir === 'desc' ? '▼' : '▲';
64|  };
65|  document.getElementById('sortArrowPts').textContent = arrow('pts');
66|  document.getElementById('sortArrowPredPts').textContent = arrow('predPts');
67|  document.getElementById('sortArrowTotal').textContent = arrow('total');
68|
69|  renderAwards(standings);
70|}
71|
72|// ── TOURNAMENT AWARDS ──
73|function renderAwards(standings) {
74|  const el = document.getElementById('awardsWrap');
75|  if (!el) return;
76|  const stats = getPredStatsByPlayer();
77|  const entries = Object.entries(stats);
78|  const awards = [];
79|
80|  const pick = (metric, min, icon, name, fmt) => {
81|    const eligible = entries.filter(([, s]) => s[metric] >= min)
82|      .sort((x, y) => y[1][metric] - x[1][metric]);
83|    if (!eligible.length) return;
84|    const top = eligible[0][1][metric];
85|    const holders = eligible.filter(([, s]) => s[metric] === top).map(([n]) => n);
86|    awards.push([icon, name, holders.join(' & '), fmt(eligible[0][1])]);
87|  };
88|
89|  const acc = entries.filter(([, s]) => s.settled >= 3)
90|    .map(([n, s]) => [n, Math.round((s.scored / s.settled) * 100), s.settled])
91|    .sort((x, y) => y[1] - x[1]);
92|  if (acc.length) awards.push(['🎯', 'Sharpshooter', acc[0][0], `${acc[0][1]}% results called right`]);
93|  pick('exact', 1, '⭐', 'Star Gazer', s => `${s.exact} exact score${s.exact > 1 ? 's' : ''}`);
94|  pick('best', 2, '🔥', 'Hot Streak', s => `${s.best} correct results in a row`);
95|  pick('upsets', 1, '💣', 'Upset Oracle', s => `${s.upsets} underdog win${s.upsets > 1 ? 's' : ''} called`);
96|  pick('jokerPts', 1, '🃏', 'Joker Master', s => `+${s.jokerPts} bonus pts from jokers`);
97|  const bottom = standings[standings.length - 1];
98|  if (bottom && standings.length > 1 && bottom.total < standings[0].total) {
99|    awards.push(['🥄', 'Wooden Spoon', bottom.name, `${bottom.total} total pts… so far`]);
100|  }
101|
102|  el.innerHTML = awards.length ? `<div class="awards-title label-sm">🏆 Tournament Awards</div><div class="awards-grid">${awards.map(([icon, name, holder, detail]) => `
103|    <div class="award-card"><span class="aw-icon">${icon}</span><div><div class="aw-name">${name}</div><div class="aw-holder">${holder === 'Laurie' ? playerDisplayName('Laurie') : holder}</div><div class="aw-detail">${detail}</div></div></div>`).join('')}</div>` : '';
104|}
105|
106|function calcPredPoints(homePred, awayPred, homeActual, awayActual) {
107|  let pts = 0;
108|  if (Math.sign(homePred - awayPred) === Math.sign(homeActual - awayActual)) pts += 1;
109|  if (homePred === homeActual) pts += 2;
110|  if (awayPred === awayActual) pts += 2;
111|  return pts;
112|}
113|
114|// Per-player prediction stats over settled matches, in kickoff order.
115|// Shared by the leaderboard, profile badges, and tournament awards.
116|function getPredStatsByPlayer() {
117|  const stats = {};
118|  const finished = matchData
119|    .filter(m => m.isComplete)
120|    .sort((a, b) => toDate(a.date, a.time, a.tz) - toDate(b.date, b.time, b.tz));
121|  for (const m of finished) {
122|    const mid = matchIdByTeamDate[`${m.team1}|${m.team2}|${m.date}`];
123|    if (!mid) continue;
124|    for (const p of (predLookup[mid] || [])) {
125|      if (p.home === undefined || p.home === null) continue;
126|      if (!stats[p.player_name]) stats[p.player_name] = { settled: 0, pts: 0, exact: 0, scored: 0, cur: 0, best: 0, upsets: 0, jokerPts: 0 };
127|      const st = stats[p.player_name];
128|      const base = calcPredPoints(p.home, p.away, m.score1, m.score2);
129|      st.settled++;
130|      st.pts += p.j ? base * 2 : base;
131|      if (p.j) st.jokerPts += base;
132|      if (base === 5) st.exact++;
133|      const resultRight = Math.sign(p.home - p.away) === Math.sign(m.score1 - m.score2);
134|      if (resultRight) { st.scored++; st.cur++; st.best = Math.max(st.best, st.cur); }
135|      else st.cur = 0;
136|      const predWinner = p.home > p.away ? 1 : p.away > p.home ? 2 : 0;
137|      const actualWinner = m.score1 > m.score2 ? 1 : m.score2 > m.score1 ? 2 : 0;
138|      if (predWinner !== 0 && predWinner === actualWinner) {
139|        const prob = predWinner === 1 ? m.prob1 : m.prob2;
140|        if (prob != null && prob < 35) st.upsets++;
141|      }
142|    }
143|  }
144|  return stats;
145|}
146|
147|function calcTerritoryControl() {
148|  territoryControl = TERRITORY_DATA.map(territory => {
149|    const totalMatches = territory.venues.reduce((n, v) => n + (VENUE_DATA[v]?.matches.length || 0), 0);
150|    let matchesPlayed = 0;
151|    const totals = Object.fromEntries(PLAYERS.map(p => [p, 0]));
152|
153|    for (const venueName of territory.venues) {
154|      const venue = VENUE_DATA[venueName];
155|      if (!venue) continue;
156|      for (const key of venue.matches) {
157|        const m = matchByKey[key];
158|        if (!m || !m.isComplete) continue;
159|        matchesPlayed++;
160|        const matchId = matchIdByTeamDate[key];
161|        if (!matchId) continue;
162|        const preds = predLookup[matchId] || [];
163|        for (const player of PLAYERS) {
164|          const pred = preds.find(p => p.player_name === player);
165|          if (pred && pred.home !== null && pred.home !== undefined) {
166|            totals[player] += calcPredPoints(pred.home, pred.away, m.score1, m.score2);
167|          }
168|        }
169|      }
170|    }
171|
172|    if (matchesPlayed === 0) {
173|      return { name: territory.name, controller: null, contested: false, contestedPlayers: [], totalPts: {}, matchesPlayed: 0, totalMatches };
174|    }
175|
176|    const maxPts = Math.max(...Object.values(totals));
177|    const leaders = PLAYERS.filter(p => totals[p] === maxPts);
178|
179|    return {
180|      name: territory.name,
181|      controller: leaders.length === 1 ? leaders[0] : null,
182|      contested: leaders.length > 1,
183|      contestedPlayers: leaders.length > 1 ? leaders : [],
184|      totalPts: { ...totals },
185|      matchesPlayed,
186|      totalMatches,
187|    };
188|  });
189|}
190|
191|function calcPredPointsForAll() {
192|  predPointsByPlayer = {};
193|  for (const [name, st] of Object.entries(getPredStatsByPlayer())) predPointsByPlayer[name] = st.pts;
194|}
195|
196|function predResultBadge(homePred, awayPred, homeActual, awayActual, joker) {
197|  const base = calcPredPoints(homePred, awayPred, homeActual, awayActual);
198|  const pts = joker ? base * 2 : base;
199|  const j = joker ? '<span class="joker-mini" title="Joker — points doubled">🃏</span>' : '';
200|  if (base === 5) return `<span style="color:var(--gold);font-weight:700">${pts}★</span>${j}`;
201|  if (base >= 2) return `<span style="color:var(--accent);font-weight:700">${pts}</span>${j}`;
202|  if (base === 1) return `<span style="color:var(--text-secondary);font-weight:700">${pts}</span>${j}`;
203|  return `<span style="color:var(--live)">✗</span>${j}`;
204|}
205|
206|function renderTerritoryStandings() {
207|  if (!territoryControl.length) return;
208|  const panel = document.getElementById('territoryStandings');
209|  if (!panel) return;
210|  panel.style.display = 'block';
211|
212|  const allDone = territoryControl.every(t => t.matchesPlayed > 0 && t.matchesPlayed === t.totalMatches);
213|
214|  const scores = Object.fromEntries(PLAYERS.map(p => [p, 0]));
215|  for (const t of territoryControl) {
216|    if (t.controller) scores[t.controller]++;
217|  }
218|
219|  const champion = document.getElementById('tsChampion');
220|  if (allDone) {
221|    const maxScore = Math.max(...Object.values(scores));
222|    const winners = PLAYERS.filter(p => scores[p] === maxScore);
223|    if (winners.length === 1) {
224|      champion.innerHTML = `<div class="ts-champion"><div class="tc-icon">🏆</div><div><div class="tc-label">Territory Champion</div><div class="tc-name">${winners[0]}</div><div class="tc-detail">Controls ${maxScore} of 6 territories</div></div></div>`;
225|    } else {
226|      champion.innerHTML = `<div class="ts-champion"><div class="tc-icon">⚔️</div><div><div class="tc-label">Tied for Territory Champion</div><div class="tc-name">${winners.join(' · ')}</div><div class="tc-detail">${maxScore} territories each</div></div></div>`;
227|    }
228|  } else {
229|    champion.innerHTML = '';
230|  }
231|
232|  document.getElementById('tsScores').innerHTML = PLAYERS.map(p =>
233|    `<div class="ts-score-badge"><span class="tsb-dot" style="background:${ownerHexColors[p]}"></span>${p} <span style="color:var(--text-muted);font-weight:400">${scores[p]}</span></div>`
234|  ).join('');
235|
236|  document.getElementById('tsGrid').innerHTML = territoryControl.map(t => {
237|    const pct = t.totalMatches > 0 ? Math.round((t.matchesPlayed / t.totalMatches) * 100) : 0;
238|    if (t.matchesPlayed === 0) {
239|      return `<div class="ts-card uncontested"><div class="ts-name">${t.name}</div><div class="ts-controller" style="color:var(--text-muted)">Uncontested</div><div class="ts-progress"><div class="ts-progress-bar" style="width:0%"></div></div><div class="ts-avg" style="margin-top:4px">0/${t.totalMatches} matches</div></div>`;
240|    }
241|    if (t.contested) {
242|      const dots = t.contestedPlayers.map(p => `<span class="ts-dot" style="background:${ownerHexColors[p]}"></span>`).join('');
243|      return `<div class="ts-card contested"><div class="ts-name">${t.name}</div><div class="ts-controller">${dots}<span style="color:var(--text-muted)">Contested</span></div><div class="ts-progress"><div class="ts-progress-bar" style="width:${pct}%"></div></div><div class="ts-avg" style="margin-top:4px">${t.matchesPlayed}/${t.totalMatches} matches</div></div>`;
244|    }
245|    const pts = t.totalPts[t.controller] ?? 0;
246|    return `<div class="ts-card controlled" style="border-left-color:${ownerHexColors[t.controller]}"><div class="ts-name">${t.name}</div><div class="ts-controller"><span class="ts-dot" style="background:${ownerHexColors[t.controller]}"></span><span style="color:${ownerHexColors[t.controller]}">${t.controller}</span></div><div class="ts-avg">${pts} pts</div><div class="ts-progress"><div class="ts-progress-bar" style="width:${pct}%"></div></div><div class="ts-avg" style="margin-top:4px">${t.matchesPlayed}/${t.totalMatches} matches</div></div>`;
247|  }).join('');
248|}
249|