function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('sectionPlayers').classList.toggle('active', tab === 'players');
  document.getElementById('sectionMatches').classList.toggle('active', tab === 'matches');
  document.getElementById('sectionGroups').classList.toggle('active', tab === 'groups');
  document.getElementById('sectionLeaderboard').classList.toggle('active', tab === 'leaderboard');
  document.getElementById('sectionTeams').classList.toggle('active', tab === 'teams');
  document.getElementById('sectionMyTeams').classList.toggle('active', tab === 'myteams');
  document.getElementById('sectionPredictions').classList.toggle('active', tab === 'predictions');
  document.getElementById('sectionMap').classList.toggle('active', tab === 'map');
  if (tab === 'teams') { renderTeamChips(); }
  if (tab === 'map') { initGlobe(); renderTerritoryStandings(); }
  if (tab !== 'map') stopAutoRotate();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'myteams') renderMyTeams();
  if (tab === 'predictions') renderPredictions();
}

// ── INIT ──
restoreSession().then(() => loadData().then(() => { loadOdds(); buildCountdownTicker(); loadStatsTracker(); }));
setInterval(renderMatches, 60000);
setInterval(loadData, 180000);
setInterval(loadOdds, 600000);
setInterval(buildCountdownTicker, 30000);
setInterval(loadStatsTracker, 300000);
