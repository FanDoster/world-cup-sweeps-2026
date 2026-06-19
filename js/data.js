// ── GLOBE STATE (used by globe.js) ──
let territoryFeatures = [];
let territoryControl  = [];
let matchByKey = {};
let globeInitialised = false;
let worldGeoData = null;
let usStatesTopoData = null;
let globeRotation = [96.3, -35.1, 0];
let autoRotateRaf = null;
let isDragging = false;
let venuePanelOpen = false;
let globeIntroPlaying = false;
let driftBase = [96.3, -35.1, 0];

// ── DATA STATE ──
let people = {};
let groups = {};
let teamOwner = {};
let teamIso = {};
let teamWinPct = {};
let matchData = [];

let predLookup = {};
let matchIdByTeamDate = {};
let predPointsByPlayer = {};
let jokersEnabled = false;
let commentsEnabled = false;
let featureProbeDone = false;

async function loadData() {
  // Fetch all teams
  const { data: teams } = await sb.from('teams').select('*');
  if (!teams) return;

  // Rebuild lookups from scratch — loadData re-runs on the refresh timer
  people = {}; groups = {}; teamOwner = {}; teamIso = {}; teamWinPct = {};

  // Build lookups
  for (const t of teams) {
    teamOwner[t.name] = t.owner;
    teamIso[t.name] = t.iso;
    teamWinPct[t.name] = t.win_pct;

    // Groups
    const g = t.group_letter;
    if (!groups[g]) groups[g] = [];
    groups[g].push({ team: t.name, iso: t.iso, owner: t.owner });

    // People
    if (t.owner) {
      if (!people[t.owner]) people[t.owner] = [];
      people[t.owner].push({ team: t.name, group: t.group_letter, iso: t.iso });
    }
  }

  // Fetch matches
  const { data: m } = await sb.from('matches').select(`
    match_date, kickoff_time, tz_offset,
    home:home_team_id(name), away:away_team_id(name),
    group_letter, home_score, away_score, tv_channel,
    prob_home, prob_draw, prob_away, is_complete
  `).order('match_date').order('kickoff_time');

  matchData = m.map(r => ({
    date:       r.match_date,
    time:       r.kickoff_time.substring(0, 5),
    tz:         r.tz_offset,
    team1:      r.home.name,
    team2:      r.away.name,
    group:      r.group_letter,
    score1:     r.home_score,
    score2:     r.away_score,
    channel:    r.tv_channel,
    prob1:      r.prob_home,
    probD:      r.prob_draw,
    prob2:      r.prob_away,
    isComplete: r.is_complete === true,
  }));

  // Build matchByKey for globe venue panel
  matchByKey = {};
  for (const m of matchData) {
    matchByKey[`${m.team1}|${m.team2}|${m.date}`] = m;
  }

  // Render everything
  renderMatches();
  renderPeople();
  renderGroups();
  renderLeaderboard();
  renderTeamChips();
  if (selectedTeam) renderTeamSchedule();
  // Fetch predictions for match card status dots
  loadPredData();
}

async function loadPredData() {
  if (!featureProbeDone) {
    const [j, c] = await Promise.all([
      sb.from('predictions').select('is_joker').limit(1),
      sb.from('match_comments').select('id').limit(1),
    ]);
    jokersEnabled = !j.error;
    commentsEnabled = !c.error;
    featureProbeDone = true;
  }
  // Get match IDs
  const { data: allM } = await sb.from('matches').select('id,match_date,home_team_id(name),away_team_id(name)');
  if (allM) {
    matchIdByTeamDate = {};
    allM.forEach(m => {
      matchIdByTeamDate[`${m.home_team_id.name}|${m.away_team_id.name}|${m.match_date}`] = m.id;
    });
  }

  // Prediction scores (once supabase-fixes.sql has run, RLS hides other
  // players' scores until kickoff) plus existence-only rows from the
  // prediction_status view so the ✓/✗ dots still work before kickoff.
  // Falls back to the scores query while the view doesn't exist yet.
  const { data: preds } = await sb.from('predictions').select('user_id,match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : ''));
  const { data: status } = await sb.from('prediction_status').select('user_id,match_id');
  const { data: profs } = await sb.from('player_profiles').select('id,player_name');
  if (profs) {
    const nameById = {};
    profs.forEach(p => { nameById[p.id] = p.player_name; });
    const scoreByKey = {};
    (preds || []).forEach(p => { scoreByKey[p.user_id + '|' + p.match_id] = p; });
    predLookup = {};
    const rows = (status && status.length) ? status : (preds || []);
    rows.forEach(p => {
      if (!predLookup[p.match_id]) predLookup[p.match_id] = [];
      const sc = scoreByKey[p.user_id + '|' + p.match_id];
      predLookup[p.match_id].push({
        user_id: p.user_id,
        player_name: nameById[p.user_id] || 'Unknown',
        home: sc ? sc.predicted_home_score : undefined,
        away: sc ? sc.predicted_away_score : undefined,
        j: sc ? !!sc.is_joker : false
      });
    });
  }
  // Re-render views that depend on prediction data
  renderMatches();
  calcPredPointsForAll();
  calcTerritoryControl();
  renderTerritoryStandings();
  if (globeInitialised) updateTerritoryFills();
  renderPeople();
  renderLeaderboard();
}
