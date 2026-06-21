// ── USER PROFILE PAGE ──
// Full-page profile tab rendering. Called via showUserProfile(playerName)
// or hash route #/users/:playerName.

let userProfilePlayer = null;  // currently shown player name

// Profile picture editor state (for own-profile upload widget)
var pfpPreviewFile = null;  // File selected for preview, not yet uploaded
var pfpUploading = false;   // Whether an upload is in progress

async function showUserProfile(playerName) {
  userProfilePlayer = playerName;
  switchTab('profile');
  renderUserProfile(playerName);
  window.location.hash = '#/users/' + encodeURIComponent(playerName);
}

let _profileLoading = null;  // player name currently being rendered (prevents double-render)

async function renderUserProfile(playerName) {
  const el = document.getElementById('userProfileContent');
  if (!el) return;

  // Prevent double-render from handleProfileRoute + switchTab both calling
  if (_profileLoading === playerName) return;
  _profileLoading = playerName;

  // Save player name for reloads
  userProfilePlayer = playerName;

  // Show loading state
  el.innerHTML = `<div class="up-loading"><div class="up-spinner"></div><div>Loading profile for <strong>${escapeHtml(playerName)}</strong>…</div></div>`;

  // Look up user ID
  const userId = await getUserIdByName(playerName);
  if (!userId) {
    el.innerHTML = `<div class="up-error">Could not find a user profile for <strong>${escapeHtml(playerName)}</strong>.</div>`;
    _profileLoading = null;
    return;
  }

  // Preload avatar + fetch data in parallel
  const avatarPromise = typeof getAvatarUrl === 'function'
    ? getAvatarUrl(playerName).catch(() => {})
    : Promise.resolve();

  const [predData, teamsData] = await Promise.all([
    getUserPredictions(userId),
    getUserTeams(userId),
    avatarPromise,
  ]);

  // Get client-side stats (always available)
  const lb = calcLeaderboard();
  const lbEntry = lb.find(p => p.name === playerName);
  const predStats = getPredStatsByPlayer()[playerName];
  const matchPts = lbEntry ? lbEntry.pts : 0;
  const rank = lbEntry ? lb.findIndex(p => p.name === playerName) + 1 : '–';
  const totalPts = lbEntry ? lbEntry.total : 0;

  // Profile picture editor (only for own profile)
  var isOwnProfile = currentProfile && currentProfile.player_name === playerName;

  // Build hero + stats
  const heroHtml = buildHero(playerName, rank, totalPts, matchPts, predStats, isOwnProfile);
  const statsHtml = buildStatsBar(matchPts, predStats);

  // Build sections
  let sectionsHtml = '';

  // Team Roster + Prediction Dashboard — side by side
  const hasDashboard = predStats && predStats.settled > 0;
  if (hasDashboard) sectionsHtml += '<div class="up-top-row">';

  // Team Roster — try RPC first, fall back to client-side `people` data
  sectionsHtml += '<div class="' + (hasDashboard ? 'up-top-col' : '') + '">';
  sectionsHtml += '<div class="up-sec-label">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Team Roster</div>';
  sectionsHtml += '<div class="up-section-card">';
  const rpcTeams = (teamsData && teamsData.teams && teamsData.teams.length) ? teamsData.teams : null;
  const displayTeams = rpcTeams || (buildTeamRosterFromClient(playerName) || {}).teams;
  if (displayTeams && displayTeams.length) {
    sectionsHtml += buildTeamRoster(displayTeams);
  } else {
    sectionsHtml += '<div class="up-empty">No teams assigned to this player.</div>';
  }
  sectionsHtml += '</div></div>';

  // Prediction Dashboard (accuracy gauge + stats grid)
  if (hasDashboard) {
    sectionsHtml += '<div class="up-top-col">';
    sectionsHtml += '<div class="up-sec-label">🎯 Prediction Dashboard</div>';
    sectionsHtml += '<div class="up-section-card">';
    sectionsHtml += buildPredDashboard(predStats);
    sectionsHtml += '</div></div>';
    sectionsHtml += '</div>'; // close up-top-row
  }

  // Recent Predictions — settled matches only, collapsed to 4 with expand toggle
  sectionsHtml += '<div class="up-sec-label">📋 Recent Predictions</div>';
  sectionsHtml += '<div class="up-section-card">';
  if (!predData) {
    sectionsHtml += '<div class="up-error">Could not load predictions — RPC may not be deployed yet.</div>';
  } else if (!predData.predictions || !predData.predictions.length) {
    sectionsHtml += '<div class="up-empty">No predictions made yet.</div>';
  } else {
    const settled = predData.predictions.filter(p => p.match_played);
    if (settled.length) {
      sectionsHtml += buildExpandablePredictionList(settled);
    } else {
      sectionsHtml += '<div class="up-empty">No settled predictions yet.</div>';
    }
  }
  sectionsHtml += '</div>';

  // Joker Report
  if (predStats && predStats.jokersUsed > 0) {
    sectionsHtml += '<div class="up-sec-label">🃏 Joker Report</div>';
    sectionsHtml += '<div class="up-section-card">';
    sectionsHtml += buildJokerReport(predStats);
    sectionsHtml += '</div>';
  }

  // Activity Feed — collapsed to 6 items with expand toggle
  sectionsHtml += '<div class="up-sec-label">📰 Activity Feed</div>';
  sectionsHtml += '<div class="up-section-card">';
  const feedItems = buildActivityFeedItems(playerName, predData, matchData);
  if (!feedItems.length) {
    sectionsHtml += '<div class="up-empty">No activity yet — matches and predictions will appear here.</div>';
  } else {
    sectionsHtml += buildExpandableFeed(feedItems);
  }
  sectionsHtml += '</div>';

  // Head-to-Head comparison
  sectionsHtml += '<div class="up-sec-label">⚔️ Head-to-Head</div>';
  sectionsHtml += '<div class="up-section-card">';
  sectionsHtml += buildHeadToHead(playerName, predStats);
  sectionsHtml += '</div>';

  el.innerHTML = heroHtml + statsHtml + '<div class="up-hero-separator"></div>' + (isOwnProfile ? '<input type="file" id="pfpInput" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none">' : '') + sectionsHtml;

  // Set up profile picture event listeners (only when own profile)
  if (isOwnProfile) {
    pfpSetupListeners();
  }

  _profileLoading = null;  // render complete — allow re-renders
}

// ── PREDICTION DASHBOARD ──
function buildPredDashboard(stats) {
  const accuracy = stats.settled > 0
    ? Math.round((stats.scored / stats.settled) * 100)
    : 0;

  // SVG gauge ring
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (accuracy / 100) * circ;
  const gap = circ - dash;
  const gaugeColor = accuracy >= 70 ? 'var(--accent)' : accuracy >= 40 ? 'var(--gold)' : 'var(--live)';

  const gaugeHtml = `<div class="up-gauge-wrap">
    <svg class="up-gauge" viewBox="0 0 104 104" width="104" height="104">
      <circle cx="52" cy="52" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/>
      <circle cx="52" cy="52" r="${r}" fill="none" stroke="${gaugeColor}" stroke-width="7"
        stroke-dasharray="${dash} ${gap}" stroke-linecap="round"
        transform="rotate(-90 52 52)" style="transition: stroke-dasharray 0.6s ease"/>
    </svg>
    <div class="up-gauge-val">${accuracy}%</div>
    <div class="up-gauge-label">Accuracy</div>
  </div>`;

  const gridHtml = `<div class="up-pd-grid">
    <div class="up-pd-cell"><div class="up-pd-val">${stats.settled}</div><div class="up-pd-lbl">Settled</div></div>
    <div class="up-pd-cell"><div class="up-pd-val" style="color:var(--accent)">${stats.scored}</div><div class="up-pd-lbl">Scored</div></div>
    <div class="up-pd-cell"><div class="up-pd-val" style="color:var(--gold)">${stats.exact}</div><div class="up-pd-lbl">Exact ★</div></div>
    <div class="up-pd-cell"><div class="up-pd-val">${stats.upsets || 0}</div><div class="up-pd-lbl">Upsets 💣</div></div>
  </div>`;

  // Badges
  const badges = [];
  if (stats.best >= 2) badges.push(`<span class="up-pd-badge">🔥 ${stats.best} streak</span>`);
  if (stats.exact > 0) badges.push(`<span class="up-pd-badge">⭐ ${stats.exact} exact</span>`);
  if (stats.upsets > 0) badges.push(`<span class="up-pd-badge">💣 ${stats.upsets} upset${stats.upsets > 1 ? 's' : ''}</span>`);
  if (stats.jokerPts > 0) badges.push(`<span class="up-pd-badge">🃏 +${stats.jokerPts} joker</span>`);

  return `<div class="up-pd-row">${gaugeHtml}${gridHtml}</div>`
    + (badges.length ? `<div class="up-pd-badges">${badges.join('')}</div>` : '');
}

// ── JOKER REPORT ──
function buildJokerReport(stats) {
  const avgPerJoker = stats.jokersUsed > 0
    ? ((stats.jokerPts + (stats.jokersUsed * 1)) / stats.jokersUsed).toFixed(1)
    : '0';

  const parts = [
    `🃏 ${stats.jokersUsed} jokers used`,
    `+${stats.jokerPts} bonus pts`,
    `${avgPerJoker} avg/joker`,
  ];

  if (stats.jokerBestMatch) {
    parts.push(`Best: ${escapeHtml(stats.jokerBestMatch)} (${stats.jokerBest}pts)`);
  }
  if (stats.jokerWorstMatch && stats.jokerWorst < 999) {
    parts.push(`Worst: ${escapeHtml(stats.jokerWorstMatch)} (${stats.jokerWorst}pts)`);
  }

  return `<div class="up-joker-compact">${parts.join(' · ')}</div>`;
}

// ── ACTIVITY FEED ──
// Returns array of {ts, icon, text, detail} — caller handles rendering
function buildActivityFeedItems(playerName, predData, matchData) {
  const events = [];

  // Team match results — completed matches involving player's teams
  const playerTeams = (people[playerName] || []).map(t => t.team);
  const teamSet = new Set(playerTeams);

  if (teamSet.size > 0) {
    for (const m of matchData) {
      if (!m.isComplete) continue;
      if (!teamSet.has(m.team1) && !teamSet.has(m.team2)) continue;

      const isHome = teamSet.has(m.team1);
      const myTeam = isHome ? m.team1 : m.team2;
      const opp = isHome ? m.team2 : m.team1;
      const myScore = isHome ? m.score1 : m.score2;
      const oppScore = isHome ? m.score2 : m.score1;

      let resultIcon, resultText;
      if (myScore > oppScore) { resultIcon = '🟢'; resultText = 'won'; }
      else if (myScore < oppScore) { resultIcon = '🔴'; resultText = 'lost'; }
      else { resultIcon = '🟡'; resultText = 'drew'; }

      const pts = myScore > oppScore ? 3 : myScore === oppScore ? 1 : 0;

      events.push({
        ts: toDate(m.date, m.time, m.tz),
        icon: '⚽',
        resultType: resultText,
        text: `<strong>${escapeHtml(myTeam)}</strong> ${resultText} ${myScore}–${oppScore} vs ${escapeHtml(opp)}`,
        detail: `+${pts} match pts · ${formatDateLabel(m.date, m.time, m.tz)}`,
      });
    }
  }

  // Predictions — settled matches only, from predData (RPC) or fallback to predLookup
  if (predData && predData.predictions) {
    for (const p of predData.predictions) {
      if (!p.match_played) continue;  // skip pending — no peeking
      const predTs = p.predicted_at ? new Date(p.predicted_at) : new Date(p.match_date);
      const ptsText = p.points > 0 ? ` · +${p.points} pts` : ' · 0 pts';

      const predScore = p.predicted_score
        ? `${p.predicted_score.home}–${p.predicted_score.away}`
        : '—';

      const jokerTag = p.is_joker ? ' 🃏' : '';

      events.push({
        ts: predTs,
        icon: '🔮',
        resultType: 'prediction',
        text: `Predicted <strong>${escapeHtml(p.home_team)}</strong> vs <strong>${escapeHtml(p.away_team)}</strong> (${predScore})${jokerTag}`,
        detail: `${formatDateLabel(p.match_date, p.kickoff_time, p.tz_offset)}${ptsText}`,
      });
    }
  }

  // Sort newest first, limit to 25
  events.sort((a, b) => b.ts - a.ts);
  return events.slice(0, 25);
}

// ── EXPANDABLE FEED ──
// Shows 6 items collapsed, with a toggle to expand/collapse all.
function buildExpandableFeed(items) {
  const INITIAL = 4;
  if (items.length <= INITIAL) return renderFeedItems(items);

  const id = 'feed-' + Math.random().toString(36).slice(2, 8);
  const moreCount = items.length - INITIAL;

  return `<div id="${id}" class="up-expand-list">
    <div class="up-expand-collapsed">${renderFeedItems(items.slice(0, INITIAL))}</div>
    <div class="up-expand-full" style="display:none">${renderFeedItems(items)}</div>
    <button class="up-expand-toggle" onclick="
      var el=document.getElementById('${id}');
      var col=el.querySelector('.up-expand-collapsed');
      var full=el.querySelector('.up-expand-full');
      var btn=el.querySelector('.up-expand-toggle');
      if(full.style.display==='none'){
        col.style.display='none';
        full.style.display='';
        btn.textContent='▲ Show less';
      }else{
        col.style.display='';
        full.style.display='none';
        btn.textContent='▼ Show all (+${moreCount} more)';
      }
    ">▼ Show all (+${moreCount} more)</button>
  </div>`;
}

function renderFeedItems(items) {
  return items.map(e => `<div class="up-feed-item ${e.resultType || ''}">
    <span class="up-feed-icon">${e.icon}</span>
    <div class="up-feed-body">
      <div class="up-feed-text">${e.text}</div>
      <div class="up-feed-meta">${e.detail}</div>
    </div>
  </div>`).join('');
}

// ── HEAD-TO-HEAD ──
function buildHeadToHead(playerName, myStats) {
  const allStats = getPredStatsByPlayer();
  const myPts = myStats ? myStats.pts : 0;
  const myHex = ownerHexColors[playerName] || 'var(--accent)';
  const maxPts = Math.max(...Object.values(allStats).map(s => s.pts), myPts, 1);

  const others = PLAYERS
    .filter(p => p !== playerName)
    .sort((a, b) => ((allStats[b] && allStats[b].pts) || 0) - ((allStats[a] && allStats[a].pts) || 0));

  return others.map(opp => {
    const oppStats = allStats[opp];
    const oppPts = oppStats ? oppStats.pts : 0;
    const totalPair = myPts + oppPts;
    const myPct = totalPair > 0 ? (myPts / totalPair) * 100 : 50;

    const oppHex = ownerHexColors[opp] || '#888';
    const displayName = typeof playerDisplayName === 'function'
      ? playerDisplayName(opp)
      : escapeHtml(opp);

    return `<div class="up-h2h-row">
      <div class="up-h2h-player">
        <span class="up-h2h-dot">${typeof avatarHtml === 'function' ? avatarHtml(opp, 18) : ''}</span>
        <span class="up-h2h-name">${displayName}</span>
        <span class="up-h2h-pts">${oppPts} pts</span>
      </div>
      <div class="up-h2h-compare">
        <span class="up-h2h-mypts">${myPts}</span>
        <div class="up-h2h-bar-wrap up-h2h-bar-single">
          <div class="up-h2h-bar me" style="width:${myPct}%"></div>
        </div>
        <span class="up-h2h-oppts">${oppPts}</span>
      </div>
    </div>`;
  }).join('');
}

function buildHero(playerName, rank, totalPts, matchPts, predStats, isOwnProfile) {
  const hex = ownerHexColors[playerName] || '#888';
  const teams = people[playerName] || [];
  const MAX_FLAGS = 4;
  const flagsHtml = teams.slice(0, MAX_FLAGS).map(t =>
    `<img src="${flagUrl(t.iso)}" alt="${escapeHtml(t.team)}" loading="lazy" title="${escapeHtml(t.team)} (G${t.group})" onerror="this.style.display='none'">`
  ).join('');
  const moreFlagsHtml = teams.length > MAX_FLAGS
    ? `<span class="up-flags-more">+${teams.length - MAX_FLAGS} more</span>`
    : '';

  const predPts = predStats ? predStats.pts : 0;

  // Avatar — use the consistent avatarHtml helper with fallback support
  const avatarHtml_str = typeof avatarHtml === 'function'
    ? avatarHtml(playerName, 72)
    : `<span style="display:inline-flex;width:72px;height:72px;border-radius:50%;align-items:center;justify-content:center;font-weight:700;font-size:32px;color:#000">${playerName[0].toUpperCase()}</span>`;

  // playerDisplayName returns HTML for Laurie (sponsored)
  const displayName = typeof playerDisplayName === 'function'
    ? playerDisplayName(playerName)
    : escapeHtml(playerName);

  const avatarClass = isOwnProfile ? 'up-hero-avatar own-profile' : 'up-hero-avatar';
  const avatarOnClick = isOwnProfile ? ' onclick="pfpTriggerChange()"' : '';
  const cameraOverlay = isOwnProfile ? '<div class="up-hero-camera-overlay">📷</div>' : '';

  return `
    <div class="up-hero">
      <div class="${avatarClass}" style="background:${hex}"${avatarOnClick}>${avatarHtml_str}${cameraOverlay}</div>
      <div class="up-hero-info">
        <div class="up-hero-name">${displayName}</div>
        <div class="up-hero-meta">
          <span class="up-hero-badge rank">#${rank} Leaderboard</span>
          <span class="up-hero-badge total">${totalPts} Total Pts</span>
          ${predStats ? `<span class="up-hero-badge pred">🔮 ${predPts} Pred Pts</span>` : ''}
        </div>
        <div class="up-hero-flags">${flagsHtml}${moreFlagsHtml}</div>
      </div>
    </div>`;
}

function buildStatsBar(matchPts, predStats) {
  const accuracy = predStats && predStats.settled > 0
    ? Math.round((predStats.scored / predStats.settled) * 100)
    : 0;

  const gaugeColor = accuracy >= 70 ? 'var(--accent)' : accuracy >= 40 ? 'var(--gold)' : 'var(--live)';
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (accuracy / 100) * circ;
  const gap = circ - dash;

  const gaugeHtml = `<div class="up-stats-gauge">
    <svg class="up-stats-gauge-svg" viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--border)" stroke-width="5"/>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${gaugeColor}" stroke-width="5"
        stroke-dasharray="${dash} ${gap}" stroke-linecap="round"
        transform="rotate(-90 40 40)" style="transition: stroke-dasharray 0.6s ease"/>
    </svg>
    <div class="up-stats-gauge-val">${accuracy}%</div>
  </div>`;

  return `<div class="up-stats-bar">
    <div class="up-stats-left">
      <div class="up-stat-box"><div class="up-stat-val" style="color:var(--accent)">${matchPts}</div><div class="up-stat-label">Match Pts</div></div>
      <div class="up-stat-box"><div class="up-stat-val" style="color:#c084fc">${predStats ? predStats.pts : '—'}</div><div class="up-stat-label">Pred Pts</div></div>
      <div class="up-stat-box"><div class="up-stat-val" style="color:${gaugeColor}">${predStats ? accuracy + '%' : '—'}</div><div class="up-stat-label">Accuracy</div></div>
    </div>
    ${gaugeHtml}
  </div>`;
}

function buildTeamRoster(teams) {
  return teams.map(t => {
    // Group standing
    const gs = t.group_standing;
    const w = gs ? gs.wins : 0;
    const d = gs ? gs.draws : 0;
    const l = gs ? gs.losses : 0;
    const gf = gs ? gs.gf : 0;
    const ga = gs ? gs.ga : 0;
    const pts = gs ? gs.pts : 0;

    // Form dots from recent results
    const results = t.recent_results || [];
    const formDots = results.slice(0, 5).map(r => {
      const cls = r.result === 'W' ? 'w' : r.result === 'D' ? 'd' : 'l';
      return `<div class="up-fd ${cls}" title="${r.opponent} ${r.score}"></div>`;
    }).join('');
    const emptyDots = 5 - results.length;
    const emptyHtml = emptyDots > 0
      ? Array(emptyDots).fill('<div class="up-fd empty"></div>').join('')
      : '';

    return `<div class="up-team-row" onclick="selectTeam('${escapeHtml(t.name)}');switchTab('teams')">
      <img class="up-team-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
      <span class="up-team-name">${escapeHtml(t.name)}</span>
      <span class="up-team-group">G${t.group_letter}</span>
      <div class="up-team-form">${formDots}${emptyHtml}</div>
      <span class="up-team-record">${w}–${d}–${l}</span>
      <span class="up-team-gd">${gf}:${ga}</span>
      <span class="up-team-pts">${pts}pts</span>
      <span class="up-team-chevron">→</span>
    </div>`;
  }).join('');
}

// ── Client-side team roster fallback (when RPC not deployed) ──
// Builds team data from people[] + matchData — same approach as the
// old modal profile (render-profile.js). Returns {teams:[...]} or null.
function buildTeamRosterFromClient(playerName) {
  const teams = people[playerName];
  if (!teams || !teams.length) return null;

  // Compute per-team stats from completed matches
  const teamStats = {};
  for (const m of matchData) {
    if (!m.isComplete) continue;
    for (const tn of [m.team1, m.team2]) {
      if (!teamStats[tn]) teamStats[tn] = { p:0, w:0, d:0, l:0, gf:0, ga:0, results:[] };
    }
    const { team1, team2, score1, score2 } = m;
    teamStats[team1].p++; teamStats[team2].p++;
    teamStats[team1].gf += score1; teamStats[team1].ga += score2;
    teamStats[team2].gf += score2; teamStats[team2].ga += score1;
    if (score1 > score2) {
      teamStats[team1].w++; teamStats[team2].l++;
      teamStats[team1].results.push({ result:'W', opponent:team2, score:score1+'-'+score2 });
      teamStats[team2].results.push({ result:'L', opponent:team1, score:score2+'-'+score1 });
    } else if (score2 > score1) {
      teamStats[team2].w++; teamStats[team1].l++;
      teamStats[team2].results.push({ result:'W', opponent:team1, score:score2+'-'+score1 });
      teamStats[team1].results.push({ result:'L', opponent:team2, score:score1+'-'+score2 });
    } else {
      teamStats[team1].d++; teamStats[team2].d++;
      teamStats[team1].results.push({ result:'D', opponent:team2, score:score1+'-'+score2 });
      teamStats[team2].results.push({ result:'D', opponent:team1, score:score2+'-'+score1 });
    }
  }

  return {
    teams: teams.map(t => {
      const s = teamStats[t.team] || { w:0, d:0, l:0, gf:0, ga:0, results:[] };
      return {
        name: t.team,
        iso: t.iso,
        group_letter: t.group,
        group_standing: {
          wins: s.w,
          draws: s.d,
          losses: s.l,
          gf: s.gf,
          ga: s.ga,
          pts: s.w * 3 + s.d,
        },
        recent_results: s.results.slice(-5).reverse(),
      };
    }),
  };
}

// ── EXPANDABLE PREDICTION LIST ──
// Shows 4 items collapsed, with a toggle to expand/collapse.
// Clicking "+ N more" or "show less" switches between states.
function buildExpandablePredictionList(predictions) {
  const INITIAL = 4;
  const id = 'predlist-' + Math.random().toString(36).slice(2, 8);
  const hasMore = predictions.length > INITIAL;

  const listHtml = buildPredictionList(predictions);

  if (!hasMore) return listHtml;

  const visibleHtml = buildPredictionList(predictions.slice(0, INITIAL));
  const moreCount = predictions.length - INITIAL;

  return `<div id="${id}" class="up-expand-list">
    <div class="up-expand-collapsed">${visibleHtml}</div>
    <div class="up-expand-full" style="display:none">${listHtml}</div>
    <button class="up-expand-toggle" onclick="
      var el=document.getElementById('${id}');
      var col=el.querySelector('.up-expand-collapsed');
      var full=el.querySelector('.up-expand-full');
      var btn=el.querySelector('.up-expand-toggle');
      if(full.style.display==='none'){
        col.style.display='none';
        full.style.display='';
        btn.textContent='▲ Show less';
      }else{
        col.style.display='';
        full.style.display='none';
        btn.textContent='▼ Show all (+${moreCount} more)';
      }
    ">▼ Show all (+${moreCount} more)</button>
  </div>`;
}

function buildPredictionList(predictions) {
  return predictions.map(p => {
    const predScore = p.predicted_score
      ? `${p.predicted_score.home}–${p.predicted_score.away}`
      : '—';

    let scoreHtml;
    if (!p.match_played) {
      scoreHtml = '<span class="up-pred-score" style="color:var(--text-muted)">🔒</span>';
    } else if (p.points === 0) {
      scoreHtml = '<span class="up-pred-score miss">✗</span>';
    } else if (p.base_points === 5) {
      scoreHtml = `<span class="up-pred-score perfect">${p.points}★</span>`;
    } else {
      scoreHtml = `<span class="up-pred-score hit">+${p.points}</span>`;
    }

    const jokerChip = p.is_joker
      ? '<span class="up-pred-joker" title="Joker — doubled">🃏</span>'
      : '';

    const dateStr = formatDateLabel(p.match_date, p.kickoff_time, p.tz_offset);

    return `<div class="up-pred-item">
      <span class="up-pred-match">
        <span class="up-pm-teams">${escapeHtml(p.home_team)} vs ${escapeHtml(p.away_team)}</span>
        <span class="up-pm-date">${formatDateLabel(p.match_date, p.kickoff_time, p.tz_offset)} · G${p.group}</span>
      </span>
      ${jokerChip}
      <span class="up-pred-guess">${predScore}</span>
      ${scoreHtml}
    </div>`;
  }).join('');
}

// ── Handle hash-based routing ──
function handleProfileRoute() {
  const hash = window.location.hash;
  const m = hash.match(/^#\/users\/(.+)$/);
  if (m) {
    const playerName = decodeURIComponent(m[1]);
    if (PLAYERS.includes(playerName)) {
      userProfilePlayer = playerName;
      switchTab('profile');
      renderUserProfile(playerName);  // belt and suspenders — don't rely on switchTab internals
      return true;
    }
  }
  return false;
}

// ── PROFILE PICTURE EDITOR (own profile) ──

function buildProfilePictureSection(playerName, currentUrl) {
  var initials = playerName.charAt(0).toUpperCase();
  var hex = ownerHexColors[playerName] || '#888';
  var hasPhoto = !!currentUrl;

  return '<div class="pfp-section card-base">' +
    '<div class="pfp-section-label">📷 Profile Picture</div>' +
    '<div class="pfp-editor">' +
      // Avatar circle (clickable — opens file picker)
      '<div class="pfp-avatar' + (hasPhoto ? ' pfp-has-photo' : ' pfp-no-photo') + '" id="pfpAvatar" onclick="pfpTriggerChange()">' +
        (hasPhoto
          ? '<img class="pfp-img" src="' + escapeHtml(currentUrl) + '" alt="Your profile photo" id="pfpImg" onerror="var i=document.getElementById(\'pfpImg\');var n=document.getElementById(\'pfpInitials\');if(i)i.style.display=\'none\';if(n)n.style.display=\'\'">'
          : '<span class="pfp-initials" id="pfpInitials" style="background:' + hex + '">' + initials + '</span>') +
        '<div class="pfp-hover-overlay"><span>' + (hasPhoto ? 'Change<br>photo' : '📷<br>Add photo') + '</span></div>' +
        (hasPhoto ? '<div class="pfp-success-badge" id="pfpBadge" style="display:none">✓</div>' : '') +
      '</div>' +
      // Drop zone
      '<div class="pfp-drop' + (hasPhoto ? ' pfp-drop-hidden' : '') + '" id="pfpDrop" tabindex="0" role="button" aria-label="Upload a profile photo">' +
        '<div class="pfp-drop-icon">📷</div>' +
        '<div class="pfp-drop-text"><strong>Add a profile photo</strong></div>' +
        '<div class="pfp-drop-hint">Click or drag an image here</div>' +
        '<input type="file" class="pfp-input" id="pfpInput" accept="image/jpeg,image/png,image/gif,image/webp">' +
      '</div>' +
      // Progress
      '<div class="pfp-progress" id="pfpProgress" style="display:none">' +
        '<div class="pfp-progress-label"><span>Uploading…</span></div>' +
        '<div class="pfp-progress-track"><div class="pfp-progress-fill"></div></div>' +
        '<button class="pfp-btn pfp-btn-secondary" onclick="pfpCancelUpload()" style="margin-top:10px">Cancel</button>' +
      '</div>' +
      // Error
      '<div class="pfp-error" id="pfpError" style="display:none" role="alert"></div>' +
      // Success toast
      '<div class="pfp-toast" id="pfpToast" style="display:none">Photo uploaded!</div>' +
      // Actions (preview mode)
      '<div class="pfp-actions" id="pfpActions" style="display:none">' +
        '<button class="pfp-btn pfp-btn-primary" onclick="pfpDoUpload()">Upload</button>' +
        '<button class="pfp-btn pfp-btn-secondary" onclick="pfpCancelPreview()">Cancel</button>' +
      '</div>' +
      // Change/Remove buttons (when photo exists)
      (hasPhoto
        ? '<div class="pfp-actions" id="pfpManageActions">' +
            '<button class="pfp-btn pfp-btn-secondary" onclick="pfpTriggerChange()">Change</button>' +
            '<button class="pfp-btn pfp-btn-danger" onclick="pfpRemovePhoto()">Remove</button>' +
          '</div>'
        : '<div class="pfp-actions" id="pfpManageActions" style="display:none">' +
            '<button class="pfp-btn pfp-btn-secondary" onclick="pfpTriggerChange()">Change</button>' +
            '<button class="pfp-btn pfp-btn-danger" onclick="pfpRemovePhoto()">Remove</button>' +
          '</div>') +
    '</div>' +
  '</div>';
}

// ── PROFILE PICTURE EVENT HANDLERS ──

function pfpSetupListeners() {
  var drop = document.getElementById('pfpDrop');
  var input = document.getElementById('pfpInput');
  if (!input) return;

  // File selected via native picker
  input.addEventListener('change', function() {
    if (input.files && input.files.length) pfpHandleFile(input.files[0]);
  });

  if (!drop) return;

  // Click drop zone → open file picker
  drop.addEventListener('click', function() { input.click(); });

  // File selected via native picker
  input.addEventListener('change', function() {
    if (input.files && input.files.length) pfpHandleFile(input.files[0]);
  });

  // Drag and drop
  drop.addEventListener('dragover', function(e) {
    e.preventDefault();
    drop.classList.add('pfp-drag-over');
    var icon = drop.querySelector('.pfp-drop-icon');
    var text = drop.querySelector('.pfp-drop-text');
    if (icon) icon.textContent = '📥';
    if (text) text.innerHTML = '<strong>Drop your photo here</strong>';
  });
  drop.addEventListener('dragleave', function() {
    drop.classList.remove('pfp-drag-over');
    var icon = drop.querySelector('.pfp-drop-icon');
    var text = drop.querySelector('.pfp-drop-text');
    if (icon) icon.textContent = '📷';
    if (text) text.innerHTML = '<strong>Add a profile photo</strong>';
  });
  drop.addEventListener('drop', function(e) {
    e.preventDefault();
    drop.classList.remove('pfp-drag-over');
    var icon = drop.querySelector('.pfp-drop-icon');
    var text = drop.querySelector('.pfp-drop-text');
    if (icon) icon.textContent = '📷';
    if (text) text.innerHTML = '<strong>Add a profile photo</strong>';
    if (e.dataTransfer.files && e.dataTransfer.files.length) pfpHandleFile(e.dataTransfer.files[0]);
  });

  // Keyboard activation
  drop.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
}

function pfpHandleFile(file) {
  // Validate type
  var allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.indexOf(file.type) === -1) {
    pfpShowError('Only JPG, PNG, GIF, and WebP images are supported (max 5 MB).');
    return;
  }
  // Validate size
  if (file.size > 5 * 1024 * 1024) {
    pfpShowError('Image is too large — max 5 MB.');
    return;
  }

  pfpPreviewFile = file;
  pfpHideError();

  var reader = new FileReader();
  reader.onload = function(e) {
    var avatar = document.getElementById('pfpAvatar');
    var heroAvatar = document.querySelector('.up-hero-avatar');

    // If standalone pfp section exists, use it; otherwise update hero avatar
    if (avatar) {
      var img = document.getElementById('pfpImg');
      var initials = document.getElementById('pfpInitials');
      var drop = document.getElementById('pfpDrop');
      var actions = document.getElementById('pfpActions');

      // Show preview in avatar circle
      if (img) {
        img.src = e.target.result;
        img.style.display = 'block';
      } else if (avatar) {
        var newImg = document.createElement('img');
        newImg.className = 'pfp-img';
        newImg.id = 'pfpImg';
        newImg.src = e.target.result;
        newImg.alt = 'Profile photo preview';
        avatar.insertBefore(newImg, avatar.firstChild);
      }
      if (initials) initials.style.display = 'none';
      if (avatar) avatar.classList.add('pfp-has-photo');
      if (drop) pfpSetDisplay(drop, 'none');
      if (actions) pfpSetDisplay(actions, 'flex');
    } else if (heroAvatar) {
      // Update hero avatar with preview
      var existingImg = heroAvatar.querySelector('img');
      if (existingImg) {
        existingImg.src = e.target.result;
        existingImg.style.display = '';
      } else {
        var heroImg = document.createElement('img');
        heroImg.src = e.target.result;
        heroImg.alt = 'Profile photo preview';
        heroImg.style.width = '100%';
        heroImg.style.height = '100%';
        heroImg.style.borderRadius = '50%';
        heroImg.style.objectFit = 'cover';
        // Remove text/initials node, insert img
        heroAvatar.innerHTML = '';
        heroAvatar.appendChild(heroImg);
        // Re-add camera overlay if own profile
        if (heroAvatar.classList.contains('own-profile')) {
          var overlay = document.createElement('div');
          overlay.className = 'up-hero-camera-overlay';
          overlay.textContent = '📷';
          heroAvatar.appendChild(overlay);
        }
      }
    }
  };
  reader.readAsDataURL(file);
}

function pfpShowError(msg) {
  var el = document.getElementById('pfpError');
  var input = document.getElementById('pfpInput');
  if (el) {
    el.textContent = msg;
    pfpSetDisplay(el, 'block');
  }
  if (input) input.value = '';
  // Auto-dismiss after 5s
  setTimeout(function() {
    var err = document.getElementById('pfpError');
    if (err && err.textContent === msg) pfpSetDisplay(err, 'none');
  }, 5000);
}

function pfpHideError() {
  var el = document.getElementById('pfpError');
  if (el) pfpSetDisplay(el, 'none');
}

// Upload the selected file via Supabase
function pfpDoUpload() {
  if (!pfpPreviewFile) return;
  pfpUploading = true;

  var actions = document.getElementById('pfpActions');
  var progress = document.getElementById('pfpProgress');
  var error = document.getElementById('pfpError');

  if (actions) pfpSetDisplay(actions, 'none');
  if (progress) pfpSetDisplay(progress, 'block');
  if (error) pfpSetDisplay(error, 'none');

  // Upload via profile-picture.js
  uploadAvatar(pfpPreviewFile).then(function(url) {
    pfpUploading = false;
    pfpPreviewFile = null;

    // Hide progress
    if (progress) pfpSetDisplay(progress, 'none');

    // Show success
    var toast = document.getElementById('pfpToast');
    var avatar = document.getElementById('pfpAvatar');
    var badge = document.getElementById('pfpBadge');
    var drop = document.getElementById('pfpDrop');
    var manageActions = document.getElementById('pfpManageActions');

    if (toast) pfpSetDisplay(toast, 'block');
    if (avatar) avatar.style.borderColor = 'var(--accent)';

    // Update avatar image with real URL
    var img = document.getElementById('pfpImg');
    if (img) {
      img.src = url + '?t=' + Date.now(); // cache bust
      img.style.display = 'block';
    }

    // Show success badge
    if (badge) pfpSetDisplay(badge, 'flex');
    if (!badge && avatar) {
      var newBadge = document.createElement('div');
      newBadge.className = 'pfp-success-badge';
      newBadge.id = 'pfpBadge';
      newBadge.textContent = '✓';
      avatar.appendChild(newBadge);
    }

    // Hide drop zone, show manage buttons
    if (drop) drop.classList.add('pfp-drop-hidden');
    if (manageActions) pfpSetDisplay(manageActions, 'flex');

    // Fade toast after 4s
    setTimeout(function() {
      var t = document.getElementById('pfpToast');
      if (t) pfpSetDisplay(t, 'none');
      var a = document.getElementById('pfpAvatar');
      if (a) a.style.borderColor = '';
    }, 4000);

    // Update auth bar avatar
    updateAuthBar();
    
    // Update hero avatar on the same page
    var heroAvatar = document.querySelector('.up-hero-avatar');
    if (heroAvatar && typeof avatarHtml === 'function') {
      heroAvatar.innerHTML = avatarHtml(userProfilePlayer, 72);
    }
  }).catch(function(err) {
    pfpUploading = false;
    pfpPreviewFile = null;
    if (progress) pfpSetDisplay(progress, 'none');
    // Show drop zone again
    var d = document.getElementById('pfpDrop');
    if (d) d.classList.remove('pfp-drop-hidden');
    pfpShowError(err.message || 'Upload failed. Please try again.');
  });
}

function pfpCancelUpload() {
  pfpUploading = false;
  pfpPreviewFile = null;
  var progress = document.getElementById('pfpProgress');
  var drop = document.getElementById('pfpDrop');
  var input = document.getElementById('pfpInput');
  if (progress) pfpSetDisplay(progress, 'none');
  if (drop) {
    drop.classList.remove('pfp-drop-hidden');
    pfpSetDisplay(drop, '');
  }
  if (input) input.value = '';
}

function pfpCancelPreview() {
  pfpPreviewFile = null;
  var input = document.getElementById('pfpInput');
  var drop = document.getElementById('pfpDrop');
  var actions = document.getElementById('pfpActions');
  var img = document.getElementById('pfpImg');
  var initials = document.getElementById('pfpInitials');
  var avatar = document.getElementById('pfpAvatar');
  var error = document.getElementById('pfpError');

  if (input) input.value = '';
  if (actions) pfpSetDisplay(actions, 'none');
  if (error) pfpSetDisplay(error, 'none');

  // If there's an existing photo, show it again; otherwise show initials
  var currentUrl = avatarCache[userProfilePlayer] || null;
  if (currentUrl && img) {
    img.src = currentUrl;
    img.style.display = 'block';
    if (initials) initials.style.display = 'none';
    if (drop) drop.classList.add('pfp-drop-hidden');
    var ma = document.getElementById('pfpManageActions');
    if (ma) pfpSetDisplay(ma, 'flex');
  } else {
    if (img) img.style.display = 'none';
    if (initials) initials.style.display = '';
    if (avatar) avatar.classList.remove('pfp-has-photo');
    if (drop) {
      drop.classList.remove('pfp-drop-hidden');
      pfpSetDisplay(drop, '');
    }
    var ma2 = document.getElementById('pfpManageActions');
    if (ma2) pfpSetDisplay(ma2, 'none');
  }
}

function pfpTriggerChange() {
  var input = document.getElementById('pfpInput');
  if (input) input.click();
}

function pfpRemovePhoto() {
  if (!confirm('Remove your profile photo?')) return;
  removeAvatar().then(function() {
    var img = document.getElementById('pfpImg');
    var initials = document.getElementById('pfpInitials');
    var avatar = document.getElementById('pfpAvatar');
    var drop = document.getElementById('pfpDrop');
    var manageActions = document.getElementById('pfpManageActions');
    var badge = document.getElementById('pfpBadge');
    var toast = document.getElementById('pfpToast');

    if (img) img.style.display = 'none';
    if (initials) initials.style.display = '';
    if (avatar) avatar.classList.remove('pfp-has-photo');
    if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    if (drop) {
      drop.classList.remove('pfp-drop-hidden');
      pfpSetDisplay(drop, '');
    }
    if (manageActions) pfpSetDisplay(manageActions, 'none');
    if (toast) pfpSetDisplay(toast, 'none');

    // Update auth bar
    updateAuthBar();
    
    // Update hero avatar on the same page
    var heroAvatar = document.querySelector('.up-hero-avatar');
    if (heroAvatar && typeof avatarHtml === 'function') {
      heroAvatar.innerHTML = avatarHtml(userProfilePlayer, 72);
    }
  }).catch(function(err) {
    pfpShowError(err.message || 'Failed to remove photo.');
  });
}

// Helper: remove inline display to let CSS take over, or set to 'none' to hide
function pfpSetDisplay(el, value) {
  if (!el) return;
  el.style.display = value;
}
window.addEventListener('hashchange', () => {
  if (userProfilePlayer) {
    // Only re-render if hash changed to a different player
    const hash = window.location.hash;
    const m = hash.match(/^#\/users\/(.+)$/);
    if (m) {
      const playerName = decodeURIComponent(m[1]);
      if (playerName !== userProfilePlayer && PLAYERS.includes(playerName)) {
        renderUserProfile(playerName);
      }
    }
  }
});
