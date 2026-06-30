// ── Globe lazy-loader: D3 + topojson + globe.js (~175 KB) are fetched only
// when the Battle Map tab is first clicked, instead of blocking every page load.
let _globeScriptsPromise = null;
function _loadScript(src) {
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
function loadGlobeScripts() {
  if (!_globeScriptsPromise) {
    _globeScriptsPromise = (function () {
      return _loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js')
        .then(function () { return _loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js'); })
        .then(function () { return _loadScript('https://cdn.jsdelivr.net/npm/topojson-server@3/dist/topojson-server.min.js'); })
        .then(function () { return _loadScript('js/globe.js'); });
    })();
  }
  return _globeScriptsPromise;
}

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
  document.getElementById('sectionBanter').classList.toggle('active', tab === 'banter');
  document.getElementById('sectionBracket').classList.toggle('active', tab === 'bracket');
  if (tab === 'teams') { renderTeamChips(); }
  if (tab === 'map') { loadGlobeScripts().then(function () { initGlobe(); renderTerritoryStandings(); }); }
  if (tab !== 'map') stopAutoRotate();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'myteams') renderMyTeams();
  if (tab === 'predictions') renderPredictions();
  if (tab === 'bracket') renderBracket();
  if (tab === 'banter') renderBanter();
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
