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
  document.getElementById('sectionShooter').classList.toggle('active', tab === 'shooter');
  document.getElementById('sectionProfile').classList.toggle('active', tab === 'profile');
  document.getElementById('sectionBracket').classList.toggle('active', tab === 'bracket');
  if (tab === 'teams') { renderTeamChips(); }
  if (tab === 'map') { initGlobe(); renderTerritoryStandings(); }
  if (tab !== 'map') stopAutoRotate();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'myteams') renderMyTeams();
  if (tab === 'predictions') renderPredictions();
  if (tab === 'bracket') renderBracket();
  if (tab === 'shooter') initShooter();
  if (tab !== 'shooter') pauseShooter();
  if (tab === 'profile') {
    const playerToShow = (typeof userProfilePlayer !== 'undefined' && userProfilePlayer)
      || (currentProfile && currentProfile.player_name);
    if (playerToShow) renderUserProfile(playerToShow);
  }

  // Update hash URL for all tabs (use pushState so back/forward works between tabs)
  const tabHash = (tab === 'profile' && typeof userProfilePlayer !== 'undefined' && userProfilePlayer)
    ? '#/users/' + encodeURIComponent(userProfilePlayer)
    : '#/' + tab;
  history.pushState(null, '', tabHash);
}

// ── INIT ──
restoreSession().then(async () => {
  // Avatar feature detection — must complete before profile renders
  // Preload all avatars — public data, no auth needed
  await preloadAvatars(PLAYERS).catch(() => {});

  return loadData().then(() => {
    renderWarDispatch();
    checkTeamResults();
    renderBracket();          // default tab is now Knockout
    // Handle hash route for direct links (after data is loaded)
    handleHashRoute();
  });
});
setInterval(renderMatches, 60000);
setInterval(() => { if (selectedTeam) renderTeamSchedule(); }, 60000);
setInterval(() => loadData().then(() => { renderWarDispatch(); checkTeamResults(); }), 180000);
