1|function renderPeople() {
2|  const peopleEl = document.getElementById("people");
3|  peopleEl.innerHTML = '';
4|  const standings = calcLeaderboard();
5|  const matchPts = {};
6|  standings.forEach(s => { matchPts[s.name] = s.pts; });
7|  for (const [name, teams] of Object.entries(people)) {
8|    const card = document.createElement("div");
9|    card.className = "person-card card-base";
10|    card.style.cursor = 'pointer';
11|    card.onclick = () => showProfile(name);
12|    const badges = [];
13|    if (matchPts[name]) badges.push(`<span class="match-pts-badge">⚽${matchPts[name]}pts</span>`);
14|    if (predPointsByPlayer[name]) badges.push(`<span class="pred-pts-badge">🔮${predPointsByPlayer[name]}pts</span>`);
15|    const sponsorLine = name === 'Laurie' ? `<div class="person-sponsor">sponsored by <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg" alt="Coca-Cola" class="sponsor-logo"></div>` : '';
16|    card.innerHTML = `
17|      <div class="person-name">${escapeHtml(name)} <span class="count">${teams.length} teams</span>${badges.length ? ' ' + badges.join(' ') : ''}</div>${sponsorLine}
18|      <ul class="team-list">
19|        ${teams.map(t => `
20|          <li class="team-item" onclick="selectTeam('${t.team}')" title="View ${t.team} schedule">
21|            <img class="team-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
22|            <span class="team-name">${t.team}</span>
23|            <span class="team-group badge-mono">Group ${t.group}</span>
24|          </li>
25|        `).join("")}
26|      </ul>
27|    `;
28|    peopleEl.appendChild(card);
29|  }
30|}
31|
32|// ── QUALIFICATION SCENARIOS ──
33|// Enumerate every W/D/L outcome of a group's remaining matches and track
34|// each team's best/worst possible finishing position. Ties are broken
35|// with current goal difference plus ±1 per simulated result — a heuristic,
36|// so "THROUGH"/"OUT" only show when points alone can't be overturned.
37|function qualScenarios(letter, rows) {
38|  const remaining = matchData
39|    .filter(m => m.group === letter && !m.isComplete)
40|    .map(m => [m.team1, m.team2]);
41|  if (!remaining.length || remaining.length > 6) return null;
42|  const base = {};
43|  rows.forEach(r => { base[r.team] = { pts: r.pts, gd: r.gd, gf: r.gf }; });
44|  const best = {}, worst = {};
45|  rows.forEach(r => { best[r.team] = 4; worst[r.team] = 1; });
46|  const total = Math.pow(3, remaining.length);
47|  for (let s = 0; s < total; s++) {
48|    const sim = {};
49|    rows.forEach(r => { sim[r.team] = { ...base[r.team] }; });
50|    let code = s;
51|    for (const [h, a] of remaining) {
52|      const o = code % 3; code = Math.floor(code / 3);
53|      if (o === 0) { sim[h].pts += 3; sim[h].gd++; sim[h].gf++; sim[a].gd--; }
54|      else if (o === 1) { sim[a].pts += 3; sim[a].gd++; sim[a].gf++; sim[h].gd--; }
55|      else { sim[h].pts++; sim[a].pts++; }
56|    }
57|    const order = rows.map(r => r.team).sort((x, y) =>
58|      sim[y].pts - sim[x].pts || sim[y].gd - sim[x].gd || sim[y].gf - sim[x].gf || x.localeCompare(y));
59|    order.forEach((t, i) => {
60|      best[t] = Math.min(best[t], i + 1);
61|      worst[t] = Math.max(worst[t], i + 1);
62|    });
63|  }
64|  return { best, worst };
65|}
66|
67|// ── RENDER GROUPS ──
68|function renderGroups() {
69|  const groupsEl = document.getElementById("groups");
70|  groupsEl.innerHTML = '';
71|
72|  // Calculate standings per group
73|  const standings = {};
74|  for (const m of matchData) {
75|    const { score1, score2, team1, team2, group, isComplete } = m;
76|    if (!isComplete) continue; // not played yet
77|
78|    for (const tn of [team1, team2]) {
79|      if (!standings[tn]) standings[tn] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
80|    }
81|
82|    standings[team1].p++; standings[team2].p++;
83|    standings[team1].gf += score1; standings[team1].ga += score2;
84|    standings[team2].gf += score2; standings[team2].ga += score1;
85|
86|    if (score1 > score2) { standings[team1].w++; standings[team2].l++; }
87|    else if (score2 > score1) { standings[team2].w++; standings[team1].l++; }
88|    else { standings[team1].d++; standings[team2].d++; }
89|  }
90|
91|  const thirds = [];
92|  for (const [letter, teams] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
93|    // Compute standings for this group's teams, sort
94|    const rows = teams.map(t => {
95|      const s = standings[t.team] || { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
96|      return {
97|        team: t.team, iso: t.iso, owner: t.owner,
98|        p: s.p, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga,
99|        gd: s.gf - s.ga, pts: s.w * 3 + s.d
100|      };
101|    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
102|
103|    const card = document.createElement("div");
104|    card.className = "group-card card-base";
105|
106|    const rowsHtml = rows.map((r, i) => `
107|      <tr class="${i < 2 ? 'qual' : i === 2 ? 'third' : ''}">
108|        <td class="pos">${i + 1}</td>
109|        <td class="flag-cell"><img class="group-flag" src="${flagUrl(r.iso)}" alt="" loading="lazy" onerror="this.style.display='none'"></td>
110|        <td>${r.team}</td>
111|        <td class="stat-cell">${r.p}</td>
112|        <td class="stat-cell">${r.w}</td>
113|        <td class="stat-cell">${r.d}</td>
114|        <td class="stat-cell">${r.l}</td>
115|        <td class="stat-cell">${r.gf}</td>
116|        <td class="stat-cell">${r.ga}</td>
117|        <td class="stat-cell">${r.gd > 0 ? '+' + r.gd : r.gd}</td>
118|        <td class="stat-cell pts">${r.pts}</td>
119|        <td>${r.owner ? `<span class="owner-tag ${ownerColors[r.owner]}" onclick="event.stopPropagation();showProfile('${r.owner}')" style="cursor:pointer">${r.owner}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
120|      </tr>
121|    `).join("");
122|
123|    const scen = qualScenarios(letter, rows);
124|    let scenHtml = '';
125|    if (scen) {
126|      scenHtml = '<div class="qual-line" title="Possible finishing positions across all remaining results (ties broken on current goal difference)">' + rows.map(r => {
127|        const b = scen.best[r.team], w = scen.worst[r.team];
128|        let tag = '';
129|        if (w <= 2) tag = '<span class="qual-tag in">THROUGH</span>';
130|        else if (b > 3) tag = '<span class="qual-tag out">OUT</span>';
131|        else if (b === 3) tag = '<span class="qual-tag third">3RD AT BEST</span>';
132|        return `<span class="ql-team">${r.team} <span class="ql-range">${b === w ? ordinal(b) : ordinal(b) + '–' + ordinal(w)}</span>${tag}</span>`;
133|      }).join('') + '</div>';
134|    }
135|
136|    card.innerHTML = `
137|      <div class="group-title">Group ${letter}</div>
138|      <table class="group-table">
139|        <thead><tr><th>#</th><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Owner</th></tr></thead>
140|        <tbody>${rowsHtml}</tbody>
141|      </table>
142|      ${scenHtml}
143|    `;
144|    groupsEl.appendChild(card);
145|
146|    if (rows[2]) thirds.push({ ...rows[2], group: letter });
147|  }
148|
149|  // Best third-placed teams — top 8 of 12 advance in the 48-team format
150|  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
151|  const thirdsCard = document.createElement("div");
152|  thirdsCard.className = "group-card card-base";
153|  thirdsCard.innerHTML = `
154|    <div class="group-title">Best 3rd-Placed Teams <span class="thirds-note">top 8 advance</span></div>
155|    <table class="group-table">
156|      <thead><tr><th>#</th><th></th><th>Team</th><th>Grp</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th><th>Owner</th></tr></thead>
157|      <tbody>${thirds.map((r, i) => `
158|        <tr class="${i < 8 ? 'qual' : ''}">
159|          <td class="pos">${i + 1}</td>
160|          <td class="flag-cell"><img class="group-flag" src="${flagUrl(r.iso)}" alt="" loading="lazy" onerror="this.style.display='none'"></td>
161|          <td>${r.team}</td>
162|          <td class="stat-cell">${r.group}</td>
163|          <td class="stat-cell">${r.p}</td>
164|          <td class="stat-cell">${r.w}</td>
165|          <td class="stat-cell">${r.d}</td>
166|          <td class="stat-cell">${r.l}</td>
167|          <td class="stat-cell">${r.gd > 0 ? '+' + r.gd : r.gd}</td>
168|          <td class="stat-cell pts">${r.pts}</td>
169|          <td>${r.owner ? `<span class="owner-tag ${ownerColors[r.owner]}" onclick="event.stopPropagation();showProfile('${r.owner}')" style="cursor:pointer">${r.owner}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
170|        </tr>
171|      `).join('')}</tbody>
172|    </table>
173|  `;
174|  groupsEl.appendChild(thirdsCard);
175|
176|  const legend = document.createElement("p");
177|  legend.className = "qual-legend";
178|  legend.innerHTML = `<span><span class="ql-dot ql-green"></span>Top 2 advance to Round of 32</span>
179|    <span><span class="ql-dot ql-amber"></span>3rd place — best 8 of 12 advance</span>`;
180|  groupsEl.appendChild(legend);
181|}
182|