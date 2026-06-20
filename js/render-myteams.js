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

function renderMyTeams() {
  const el = document.getElementById('myTeamsGrid');
  const teams = getPlayerTeams();
  if (!teams.length) { el.innerHTML = '<p style="color:var(--text-muted);padding:32px;text-align:center">No teams found — sign in first.</p>'; return; }
  el.innerHTML = teams.map(t => {
    const next = getNextMatch(t.name);
    const opponent = next ? (next.team1 === t.name ? next.team2 : next.team1) : null;
    const cd = next ? getCountdown(next.date, next.time, next.tz) : null;
    return `<div class="myteam-card card-base" onclick="selectTeam('${t.name}');switchTab('teams')">
      <div class="mt-header">
        <img class="mt-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="mt-name">${t.name}</span>
        <span class="mt-group badge-mono">G${t.group}</span>
      </div>
      ${next ? `<div class="mt-next">Next: <strong>vs ${opponent}</strong> — ${formatDateLabel(next.date, next.time, next.tz)} ${formatLocalTime(next.date, next.time, next.tz)}</div>
      <div class="mt-countdown">${cd ? cd.text : ''}</div>` : '<div class="mt-next" style="color:var(--text-muted)">No upcoming matches</div>'}
    </div>`;
  }).join('');
}
