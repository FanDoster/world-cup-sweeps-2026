function getPlayerTeams() {
  if (!currentProfile) return [];
  const owner = currentProfile.player_name;
  return (people[owner] || []).map(t => ({ name: t.team, iso: t.iso, group: t.group }));
}

function getNextMatch(teamName) {
  return matchData
    .filter(m => (m.team1 === teamName || m.team2 === teamName) && !m.isComplete)
    .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
    .sort((a, b) => a.kickoff - b.kickoff)[0] || null;
}

// Build a set of teams still alive (not eliminated in knockout)
function getAliveTeams() {
  const alive = new Set();
  const dead = new Set();
  for (const m of matchData) {
    if (!m.round) continue;
    // Teams appearing in knockout matches start as alive
    if (m.team1) alive.add(m.team1);
    if (m.team2) alive.add(m.team2);
    // Knockout loser is eliminated (only if match is complete)
    if (m.isComplete && m.score1 !== null && m.score2 !== null && m.score1 !== m.score2) {
      const loser = m.score1 > m.score2 ? m.team2 : m.team1;
      dead.add(loser);
    }
  }
  // Remove dead teams from alive set
  for (const d of dead) alive.delete(d);
  return alive;
}

function getEliminationInfo(teamName) {
  for (const m of matchData) {
    if (!m.round || !m.isComplete || m.score1 === null || m.score2 === null) continue;
    if (m.score1 === m.score2) continue;
    const loser = m.score1 > m.score2 ? m.team2 : m.team1;
    const winner = m.score1 > m.score2 ? m.team1 : m.team2;
    if (loser === teamName) {
      return { by: winner, round: roundLabel(m.round) };
    }
  }
  return null;
}

function renderMyTeams() {
  const el = document.getElementById('myTeamsGrid');
  const teams = getPlayerTeams();
  if (!teams.length) { el.innerHTML = '<p style="color:var(--text-muted);padding:32px;text-align:center">No teams found — sign in first.</p>'; return; }

  const aliveTeams = getAliveTeams();

  el.innerHTML = teams.map(t => {
    const next = getNextMatch(t.name);
    const opponent = next ? (next.team1 === t.name ? next.team2 : next.team1) : null;
    const cd = next ? getCountdown(next.date, next.time, next.tz) : null;
    const isAlive = aliveTeams.has(t.name);
    const statusBadge = isAlive
      ? (next ? `<span class="mt-alive-badge">🟢 R32</span>` : `<span class="mt-alive-badge">🟢 Qualified</span>`)
      : `<span class="mt-elim-badge">🔴 Eliminated</span>`;
    const elimInfo = !isAlive ? getEliminationInfo(t.name) : null;
    const elimText = elimInfo
      ? `Eliminated by ${elimInfo.by} in ${elimInfo.round}`
      : 'Eliminated in Group Stage';
    return `<div class="myteam-card card-base${isAlive ? '' : ' mt-eliminated'}" onclick="selectTeam('${t.name}');switchTab('teams')">
      <div class="mt-header">
        <img class="mt-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="mt-name">${t.name}</span>
        <span class="mt-group badge-mono">G${t.group}</span>
        ${statusBadge}
      </div>
      ${next ? `<div class="mt-next">Next: <strong>vs ${opponent}</strong> — ${formatDateLabel(next.date, next.time, next.tz)} ${formatLocalTime(next.date, next.time, next.tz)}</div>
      <div class="mt-countdown">${cd ? cd.text : ''}</div>` : ''}
      ${!next && isAlive ? '<div class="mt-next" style="color:var(--text-muted)">Awaiting R32 fixture</div>' : ''}
      ${!isAlive ? `<div class="mt-next" style="color:var(--gold-dim)">${elimText}</div>` : ''}
    </div>`;
  }).join('');
}
