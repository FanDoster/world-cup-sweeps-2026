function getPlayerTeams() {
  if (!currentProfile) return [];
  const owner = currentProfile.player_name;
  return matchData.reduce((acc, m) => {
    if (m.team1 && teamOwner[m.team1] === owner && !acc.find(t => t.name === m.team1))
      acc.push({ name: m.team1, iso: teamIso[m.team1], group: m.group });
    if (m.team2 && teamOwner[m.team2] === owner && !acc.find(t => t.name === m.team2))
      acc.push({ name: m.team2, iso: teamIso[m.team2], group: m.group });
    return acc;
  }, []);
}

function getNextMatch(teamName) {
  return matchData
    .filter(m => (m.team1 === teamName || m.team2 === teamName) && m.score1 === null)
    .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
    .sort((a, b) => a.kickoff - b.kickoff)[0] || null;
}

function renderMyTeams() {
  const el = document.getElementById('myTeamsGrid');
  const teams = getPlayerTeams();
  if (!teams.length) { el.innerHTML = '<p style="color:var(--text-muted);padding:32px;text-align:center">No teams found — sign in first.</p>'; return; }
  el.innerHTML = teams.map(t => {
    const next = getNextMatch(t.name);
    const opponent = next ? (next.team1 === t.name ? next.team2 : next.team1) : null;
    const cd = next ? getCountdown(next.date, next.time, next.tz) : null;
    return `<div class="myteam-card" onclick="selectTeam('${t.name}');switchTab('teams')">
      <div class="mt-header">
        <img class="mt-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="mt-name">${t.name}</span>
        <span class="mt-group">G${t.group}</span>
      </div>
      ${next ? `<div class="mt-next">Next: <strong>vs ${opponent}</strong> — ${formatDateLabel(next.date, next.time, next.tz)} ${formatLocalTime(next.date, next.time, next.tz)}</div>
      <div class="mt-countdown">${cd ? cd.text : ''}</div>` : '<div class="mt-next" style="color:var(--text-muted)">No upcoming matches</div>'}
    </div>`;
  }).join('');
}
