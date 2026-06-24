function switchTab(tab) {
  openWindow(tab);
  if (tab === 'teams') renderTeamChips();
  if (tab === 'map') { initGlobe(); renderTerritoryStandings(); }
  if (tab !== 'map') stopAutoRotate();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'awards') { renderAwards(calcMatchLeaderboard()); renderJokerStats(); }
  if (tab === 'myteams') renderMyTeams();
  if (tab === 'predictions') renderPredictions();
  if (tab === 'bracket') renderBracket();
  if (tab === 'shooter') initShooter();
  if (tab !== 'shooter') pauseShooter();
  if (tab === 'profile') {
    var player = userProfilePlayer || (typeof currentProfile !== 'undefined' && currentProfile ? currentProfile.player_name : null);
    if (player) renderUserProfile(player);
  }
  var tabHash = (tab === 'profile' && typeof userProfilePlayer !== 'undefined' && userProfilePlayer)
    ? '#/users/' + encodeURIComponent(userProfilePlayer)
    : '#/' + tab;
  history.pushState(null, '', tabHash);
}

// ── INIT ──
restoreSession().then(async function() {
  await preloadAvatars(PLAYERS).catch(function() {});
  return loadData().then(function() {
    renderWarDispatch();
    checkTeamResults();
    xpUpdateClock();
    xpHideWelcome();
    handleHashRoute();
    // Open Matches by default if no hash navigates elsewhere.
    // Suppress startup sound for this automatic (non-user-gesture) open,
    // then reset so the first deliberate click plays it.
    if (!location.hash || location.hash === '#/' || location.hash === '#/matches') {
      xpStartupPlayed = true;
      openWindow('matches');
      xpStartupPlayed = false;
    }
  });
});
setInterval(renderMatches, 60000);
setInterval(function() { if (typeof selectedTeam !== 'undefined' && selectedTeam) renderTeamSchedule(); }, 60000);
setInterval(function() { loadData().then(function() { renderWarDispatch(); checkTeamResults(); }); }, 180000);
