function renderPeople() {
  const peopleEl = document.getElementById("people");
  peopleEl.innerHTML = '';
  const standings = calcLeaderboard();
  const matchPts = {};
  standings.forEach(s => { matchPts[s.name] = s.pts; });
  for (const [name, teams] of Object.entries(people)) {
    const card = document.createElement("div");
    card.className = "person-card";
    card.style.cursor = 'pointer';
    card.onclick = () => showProfile(name);
    const badges = [];
    if (matchPts[name]) badges.push(`<span class="match-pts-badge">⚽${matchPts[name]}pts</span>`);
    if (predPointsByPlayer[name]) badges.push(`<span class="pred-pts-badge">🔮${predPointsByPlayer[name]}pts</span>`);
    const sponsorLine = name === 'Laurie' ? `<div class="person-sponsor">sponsored by <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg" alt="Coca-Cola" class="sponsor-logo"></div>` : '';
    card.innerHTML = `
      <div class="person-name">${escapeHtml(name)} <span class="count">${teams.length} teams</span>${badges.length ? ' ' + badges.join(' ') : ''}</div>${sponsorLine}
      <ul class="team-list">
        ${teams.map(t => `
          <li class="team-item" onclick="selectTeam('${t.team}')" title="View ${t.team} schedule">
            <img class="team-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span class="team-name">${t.team}</span>
            <span class="team-group">Group ${t.group}</span>
          </li>
        `).join("")}
      </ul>
    `;
    peopleEl.appendChild(card);
  }
}

// ── QUALIFICATION SCENARIOS ──
// Enumerate every W/D/L outcome of a group's remaining matches and track
// each team's best/worst possible finishing position. Ties are broken
// with current goal difference plus ±1 per simulated result — a heuristic,
// so "THROUGH"/"OUT" only show when points alone can't be overturned.
function qualScenarios(letter, rows) {
  const remaining = matchData
    .filter(m => m.group === letter && (m.score1 === null || m.score2 === null))
    .map(m => [m.team1, m.team2]);
  if (!remaining.length || remaining.length > 6) return null;
  const base = {};
  rows.forEach(r => { base[r.team] = { pts: r.pts, gd: r.gd, gf: r.gf }; });
  const best = {}, worst = {};
  rows.forEach(r => { best[r.team] = 4; worst[r.team] = 1; });
  const total = Math.pow(3, remaining.length);
  for (let s = 0; s < total; s++) {
    const sim = {};
    rows.forEach(r => { sim[r.team] = { ...base[r.team] }; });
    let code = s;
    for (const [h, a] of remaining) {
      const o = code % 3; code = Math.floor(code / 3);
      if (o === 0) { sim[h].pts += 3; sim[h].gd++; sim[h].gf++; sim[a].gd--; }
      else if (o === 1) { sim[a].pts += 3; sim[a].gd++; sim[a].gf++; sim[h].gd--; }
      else { sim[h].pts++; sim[a].pts++; }
    }
    const order = rows.map(r => r.team).sort((x, y) =>
      sim[y].pts - sim[x].pts || sim[y].gd - sim[x].gd || sim[y].gf - sim[x].gf || x.localeCompare(y));
    order.forEach((t, i) => {
      best[t] = Math.min(best[t], i + 1);
      worst[t] = Math.max(worst[t], i + 1);
    });
  }
  return { best, worst };
}

// ── RENDER GROUPS ──
function renderGroups() {
  const groupsEl = document.getElementById("groups");
  groupsEl.innerHTML = '';

  // Calculate standings per group
  const standings = {};
  for (const m of matchData) {
    const { score1, score2, team1, team2, group } = m;
    if (score1 === null || score2 === null) continue; // not played yet

    for (const tn of [team1, team2]) {
      if (!standings[tn]) standings[tn] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    }

    standings[team1].p++; standings[team2].p++;
    standings[team1].gf += score1; standings[team1].ga += score2;
    standings[team2].gf += score2; standings[team2].ga += score1;

    if (score1 > score2) { standings[team1].w++; standings[team2].l++; }
    else if (score2 > score1) { standings[team2].w++; standings[team1].l++; }
    else { standings[team1].d++; standings[team2].d++; }
  }

  const thirds = [];
  for (const [letter, teams] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
    // Compute standings for this group's teams, sort
    const rows = teams.map(t => {
      const s = standings[t.team] || { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      return {
        team: t.team, iso: t.iso, owner: t.owner,
        p: s.p, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga,
        gd: s.gf - s.ga, pts: s.w * 3 + s.d
      };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));

    const card = document.createElement("div");
    card.className = "group-card";

    const rowsHtml = rows.map((r, i) => `
      <tr class="${i < 2 ? 'qual' : i === 2 ? 'third' : ''}">
        <td class="pos">${i + 1}</td>
        <td class="flag-cell"><img class="group-flag" src="${flagUrl(r.iso)}" alt="" loading="lazy" onerror="this.style.display='none'"></td>
        <td>${r.team}</td>
        <td class="stat-cell">${r.p}</td>
        <td class="stat-cell">${r.w}</td>
        <td class="stat-cell">${r.d}</td>
        <td class="stat-cell">${r.l}</td>
        <td class="stat-cell">${r.gf}</td>
        <td class="stat-cell">${r.ga}</td>
        <td class="stat-cell">${r.gd > 0 ? '+' + r.gd : r.gd}</td>
        <td class="stat-cell pts">${r.pts}</td>
        <td>${r.owner ? `<span class="owner-tag ${ownerColors[r.owner]}" onclick="event.stopPropagation();showProfile('${r.owner}')" style="cursor:pointer">${r.owner}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      </tr>
    `).join("");

    const scen = qualScenarios(letter, rows);
    let scenHtml = '';
    if (scen) {
      scenHtml = '<div class="qual-line" title="Possible finishing positions across all remaining results (ties broken on current goal difference)">' + rows.map(r => {
        const b = scen.best[r.team], w = scen.worst[r.team];
        let tag = '';
        if (w <= 2) tag = '<span class="qual-tag in">THROUGH</span>';
        else if (b > 3) tag = '<span class="qual-tag out">OUT</span>';
        else if (b === 3) tag = '<span class="qual-tag third">3RD AT BEST</span>';
        return `<span class="ql-team">${r.team} <span class="ql-range">${b === w ? ordinal(b) : ordinal(b) + '–' + ordinal(w)}</span>${tag}</span>`;
      }).join('') + '</div>';
    }

    card.innerHTML = `
      <div class="group-title">Group ${letter}</div>
      <table class="group-table">
        <thead><tr><th>#</th><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Owner</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${scenHtml}
    `;
    groupsEl.appendChild(card);

    if (rows[2]) thirds.push({ ...rows[2], group: letter });
  }

  // Best third-placed teams — top 8 of 12 advance in the 48-team format
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  const thirdsCard = document.createElement("div");
  thirdsCard.className = "group-card";
  thirdsCard.innerHTML = `
    <div class="group-title">Best 3rd-Placed Teams <span class="thirds-note">top 8 advance</span></div>
    <table class="group-table">
      <thead><tr><th>#</th><th></th><th>Team</th><th>Grp</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th><th>Owner</th></tr></thead>
      <tbody>${thirds.map((r, i) => `
        <tr class="${i < 8 ? 'qual' : ''}">
          <td class="pos">${i + 1}</td>
          <td class="flag-cell"><img class="group-flag" src="${flagUrl(r.iso)}" alt="" loading="lazy" onerror="this.style.display='none'"></td>
          <td>${r.team}</td>
          <td class="stat-cell">${r.group}</td>
          <td class="stat-cell">${r.p}</td>
          <td class="stat-cell">${r.w}</td>
          <td class="stat-cell">${r.d}</td>
          <td class="stat-cell">${r.l}</td>
          <td class="stat-cell">${r.gd > 0 ? '+' + r.gd : r.gd}</td>
          <td class="stat-cell pts">${r.pts}</td>
          <td>${r.owner ? `<span class="owner-tag ${ownerColors[r.owner]}" onclick="event.stopPropagation();showProfile('${r.owner}')" style="cursor:pointer">${r.owner}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
  groupsEl.appendChild(thirdsCard);

  const legend = document.createElement("p");
  legend.className = "qual-legend";
  legend.innerHTML = `<span><span class="ql-dot ql-green"></span>Top 2 advance to Round of 32</span>
    <span><span class="ql-dot ql-amber"></span>3rd place — best 8 of 12 advance</span>`;
  groupsEl.appendChild(legend);
}
