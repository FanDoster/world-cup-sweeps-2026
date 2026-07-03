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
let winnersEnabled = false;
let pinEnabled = false;
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
  let { data: m, error } = await sb.from('matches').select(`
    id, match_date, kickoff_time, tz_offset,
    home:home_team_id(name), away:away_team_id(name),
    group_letter, home_score, away_score, tv_channel,
    prob_home, prob_draw, prob_away, is_complete, round
  `).order('match_date').order('kickoff_time');

  // Fallback: if is_complete column doesn't exist yet, re-query without it
  let hasIsComplete = true;
  if (error || !m) {
    const retry = await sb.from('matches').select(`
      id, match_date, kickoff_time, tz_offset,
      home:home_team_id(name), away:away_team_id(name),
      group_letter, home_score, away_score, tv_channel,
      prob_home, prob_draw, prob_away, round
    `).order('match_date').order('kickoff_time');
    m = retry.data;
    hasIsComplete = false;
    // If round column doesn't exist yet, fall back without it
    if (!m) {
      const retry2 = await sb.from('matches').select(`
        id, match_date, kickoff_time, tz_offset,
        home:home_team_id(name), away:away_team_id(name),
        group_letter, home_score, away_score, tv_channel,
        prob_home, prob_draw, prob_away
      `).order('match_date').order('kickoff_time');
      m = retry2.data;
    }
  }

  if (!m) { console.error('Failed to load match data from Supabase'); return; }

  matchData = m.map(r => {
    const score1 = r.home_score;
    const score2 = r.away_score;
    // Compute isComplete server-side if column exists, else client-side fallback
    let isComplete;
    if (hasIsComplete) {
      isComplete = r.is_complete === true;
    } else {
      const now = new Date();
      const kickoff = new Date(r.match_date + 'T' + r.kickoff_time);
      kickoff.setHours(kickoff.getHours() - r.tz_offset); // convert to UTC
      isComplete = score1 !== null && score2 !== null && now >= kickoff;
    }
    return {
      id:         r.id,
      date:       r.match_date,
      time:       r.kickoff_time.substring(0, 5),
      tz:         r.tz_offset,
      team1:      r.home ? r.home.name : null,
      team2:      r.away ? r.away.name : null,
      group:      r.group_letter,
      score1,
      score2,
      channel:    r.tv_channel,
      prob1:      r.prob_home,
      probD:      r.prob_draw,
      prob2:      r.prob_away,
      isComplete,
      round:      r.round || null,
      actualWinner: null, // populated below if actual_winner column exists
    };
  });

  // Build matchIdByTeamDate from the just-loaded matchData — avoids a second
  // Supabase query in loadPredData() that previously re-fetched the same rows.
  matchIdByTeamDate = {};
  for (const m of matchData) {
    if (!m.team1 || !m.team2) continue; // skip TBD knockout fixtures
    matchIdByTeamDate[`${m.team1}|${m.team2}|${m.date}`] = m.id;
    matchIdByTeamDate[`${m.team2}|${m.team1}|${m.date}`] = m.id;
  }

  // Optional: enrich matchData with actual_winner for ET/pens knockout results
  const { data: winnerRows, error: winnerErr } = await sb.from('matches').select('id,actual_winner');
  if (!winnerErr && winnerRows) {
    const winnerById = {};
    winnerRows.forEach(r => { if (r.actual_winner) winnerById[r.id] = r.actual_winner; });
    matchData.forEach(m => { if (winnerById[m.id]) m.actualWinner = winnerById[m.id]; });
  }

  // Build matchByKey for globe venue panel
  matchByKey = {};
  for (const m of matchData) {
    matchByKey[`${m.team1}|${m.team2}|${m.date}`] = m;
  }

  // Fetch predictions before rendering — profile pages, leaderboard, etc. read predLookup
  await loadPredData().catch(e => console.error('loadPredData failed:', e));

  // Render everything
  renderMatches();
  renderPeople();
  renderGroups();
  renderLeaderboard();
  renderTeamChips();
  if (selectedTeam) renderTeamSchedule();
}

// Number of fixtures scheduled on a given venue-local date. Used to gate the joker:
// the 2× pick is only offered when a match day has more than one game to choose between
// (e.g. group stage, R32). On single-match days — typically later knockout rounds — it's hidden.
function matchesOnDate(date) {
  return matchData.reduce((n, m) => n + (m.date === date ? 1 : 0), 0);
}

async function loadPredData() {
  // Invalidate profile stats cache so stale RPC results don't persist across data refreshes
  Object.keys(_userPredCache).forEach(k => delete _userPredCache[k]);
  if (!featureProbeDone) {
    const [j, c, w, p] = await Promise.all([
      sb.from('predictions').select('is_joker').limit(1),
      sb.from('match_comments').select('id').limit(1),
      sb.from('predictions').select('predicted_winner').limit(1),
      sb.from('match_comments').select('pinned').limit(1),
    ]);
    jokersEnabled = !j.error;
    commentsEnabled = !c.error;
    winnersEnabled = !w.error;
    pinEnabled = !p.error;
    featureProbeDone = true;
  }
  // Prediction scores (once supabase-fixes.sql has run, RLS hides other
  // players' scores until kickoff) plus existence-only rows from the
  // prediction_status view so the ✓/✗ dots still work before kickoff.
  // Falls back to the scores query while the view doesn't exist yet.
  const { data: preds } = await sb.from('predictions').select('user_id,match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '') + (winnersEnabled ? ',predicted_winner' : ''));
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
        j: sc ? !!sc.is_joker : false,
        winner: sc && winnersEnabled ? (sc.predicted_winner || null) : null,
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
  if (selectedTeam) renderTeamSchedule();
}

// ── User prediction stats via RPC ──
// Replaces client-side all-predictions fetch-and-filter with a single
// server-side call. Returns null if the function isn't deployed yet
// (caller falls back to client-side calculation).
const _userPredCache = {};
async function getUserPredictions(userId) {
  if (_userPredCache[userId]) return _userPredCache[userId];
  try {
    const { data, error } = await sb.rpc('get_user_predictions', { target_user_id: userId });
    if (error || !data) return null;
    _userPredCache[userId] = data;
    return data;
  } catch (e) {
    return null;  // RPC not deployed yet — caller falls back
  }
}

// ── User teams via RPC ──
// Returns team roster with group standings, recent results, and upcoming
// fixtures. Returns null if the function isn't deployed yet.
const _userTeamsCache = {};
async function getUserTeams(userId) {
  if (_userTeamsCache[userId]) return _userTeamsCache[userId];
  try {
    const { data, error } = await sb.rpc('get_user_teams', { user_id: userId });
    if (error || !data) return null;
    _userTeamsCache[userId] = data;
    return data;
  } catch (e) {
    return null;  // RPC not deployed yet — caller falls back
  }
}

// ── User ID lookup by player name ──
const _userIdByNameCache = {};
async function getUserIdByName(playerName) {
  if (_userIdByNameCache[playerName]) return _userIdByNameCache[playerName];
  try {
    const { data } = await sb.from('player_profiles').select('id').eq('player_name', playerName).single();
    if (data) {
      _userIdByNameCache[playerName] = data.id;
      return data.id;
    }
  } catch (e) { /* fall through */ }
  return null;
}
