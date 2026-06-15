// ── PLAYER PROFILE ──
function showProfile(playerName) {
  document.getElementById('profileOverlay').classList.add('active');
  renderProfile(playerName);
}

function closeProfile() {
  document.getElementById('profileOverlay').classList.remove('active');
}

// ── MATCH PREDICTIONS PANEL ──
function showPredPanel(key) {
  document.getElementById('predPanelOverlay').classList.add('active');
  renderPredPanel(key);
}

function closePredPanel() {
  document.getElementById('predPanelOverlay').classList.remove('active');
  document.getElementById('predPanel').classList.remove('england-mode');
  if (commentsChannel) { sb.removeChannel(commentsChannel); commentsChannel = null; }
}

function renderPredPanel(key) {
  const el = document.getElementById('predPanel');
  const [t1, t2, date] = key.split('|');
  const mid = matchIdByTeamDate[key];
  const m = matchData.find(m => m.team1 === t1 && m.team2 === t2 && m.date === date);
  if (!m) { el.innerHTML = '<p style="padding:20px;color:var(--text-muted)">Match not found.</p>'; return; }

  const now = new Date();
  const kickoff = toDate(m.date, m.time, m.tz);
  const isLocked = kickoff - now < 5 * 60 * 1000;
  const isFinished = m.score1 !== null && m.score2 !== null;

  const isEngland = t1 === 'England' || t2 === 'England';
  const isScotland = t1 === 'Scotland' || t2 === 'Scotland';
  const showEnglandVideo = isEngland && !isFinished;
  const showScotlandVideo = isScotland && !isFinished;
  const showMatchVideo = showEnglandVideo || showScotlandVideo;
  const videoSrc = showEnglandVideo
    ? 'https://www.youtube.com/embed/va6nPu-1auE?autoplay=1&controls=0&rel=0&modestbranding=1&start=11'
    : 'https://www.youtube.com/embed/32wDFCM7iSI?autoplay=1&controls=0&rel=0&modestbranding=1&start=71';
  if (showMatchVideo) el.classList.add('england-mode'); else el.classList.remove('england-mode');
  const showScores = isLocked || isFinished;

  const preds = predLookup[mid] || [];
  const predByPlayer = {};
  preds.forEach(p => { predByPlayer[p.player_name] = p; });

  let rows = '';
  for (const p of PLAYERS) {
    const pred = predByPlayer[p];
    const isMe = currentProfile && currentProfile.player_name === p;
    let predCell, statusCell;

    if (pred && isFinished) {
      predCell = `<span class="pp-score">${pred.home}–${pred.away}</span>${pred.j ? ' <span class="joker-mini" title="Joker — double points">🃏</span>' : ''}`;
      statusCell = predResultBadge(pred.home, pred.away, m.score1, m.score2, pred.j);
    } else if (pred && showScores) {
      predCell = `<span class="pp-score">${pred.home}–${pred.away}</span>${pred.j ? ' <span class="joker-mini" title="Joker — double points">🃏</span>' : ''}`;
      statusCell = '<span class="pp-locked">🔒</span>';
    } else if (pred) {
      predCell = '<span class="pp-hidden">🔒 Hidden</span>';
      statusCell = '<span style="color:var(--accent);font-size:0.72rem">✓</span>';
    } else {
      predCell = '<span class="pp-no-pred">No prediction</span>';
      statusCell = '<span style="color:var(--live);font-size:0.72rem">✗</span>';
    }

    rows += `<tr${isMe ? ' class="me"' : ''}>
      <td>${p}</td>
      <td>${predCell}</td>
      <td>${statusCell}</td>
    </tr>`;
  }

  let yourPredHtml = '';
  const yourPred = currentProfile ? predByPlayer[currentProfile.player_name] : null;

  if (!currentSession) {
    yourPredHtml = `<div class="pp-your-pred">
      <div class="pp-your-pred-title">Your Prediction</div>
      <div class="pp-your-pred-signin">Sign in to make predictions</div>
    </div>`;
  } else if (isLocked || isFinished) {
    if (yourPred && yourPred.home !== undefined) {
      yourPredHtml = `<div class="pp-your-pred">
        <div class="pp-your-pred-title">Your Prediction</div>
        <div class="pp-your-pred-locked">🔒 ${yourPred.home}–${yourPred.away}${yourPred.j ? ' 🃏' : ''}</div>
      </div>`;
    } else {
      yourPredHtml = `<div class="pp-your-pred">
        <div class="pp-your-pred-title">Your Prediction</div>
        <div class="pp-your-pred-locked">Not predicted</div>
      </div>`;
    }
  } else if (yourPred && yourPred.home !== undefined) {
    yourPredHtml = `<div class="pp-your-pred" id="pp-your-pred-${mid}">
      <div class="pp-your-pred-title">Your Prediction</div>
      <div class="pp-pred-form">
        <span class="pp-pred-display" id="pp-pred-display-${mid}">${yourPred.home}–${yourPred.away}${yourPred.j ? ' 🃏' : ''}</span>
        ${jokersEnabled ? `<button class="joker-chip${yourPred.j ? ' active' : ''}" id="pp-joker-${mid}" onclick="toggleJokerFromPanel(${mid})">🃏 2×</button>` : ''}
        <button class="pmc-btn edit" id="pp-pred-edit-btn-${mid}" onclick="editPredictionFromPanel(${mid})">Edit</button>
        <div class="pmc-score" id="pp-pred-edit-${mid}" style="display:none">
          <div class="pmc-score-wrap">
            <div class="pmc-step" onclick="stepScore('pp-ph-${mid}',1)">▴</div>
            <input type="number" id="pp-ph-${mid}" min="0" max="20" value="${yourPred.home}">
            <div class="pmc-step" onclick="stepScore('pp-ph-${mid}',-1)">▾</div>
          </div>
          <span class="pmc-dash">–</span>
          <div class="pmc-score-wrap">
            <div class="pmc-step" onclick="stepScore('pp-pa-${mid}',1)">▴</div>
            <input type="number" id="pp-pa-${mid}" min="0" max="20" value="${yourPred.away}">
            <div class="pmc-step" onclick="stepScore('pp-pa-${mid}',-1)">▾</div>
          </div>
        </div>
        <button class="pmc-btn save" id="pp-pred-save-btn-${mid}" onclick="submitPredictionFromPanel(${mid})" style="display:none">Save</button>
      </div>
    </div>`;
  } else {
    yourPredHtml = `<div class="pp-your-pred" id="pp-your-pred-${mid}">
      <div class="pp-your-pred-title">Your Prediction</div>
      <div class="pp-pred-form">
        <div class="pmc-score">
          <div class="pmc-score-wrap">
            <div class="pmc-step" onclick="stepScore('pp-ph-${mid}',1)">▴</div>
            <input type="number" id="pp-ph-${mid}" min="0" max="20" value="0">
            <div class="pmc-step" onclick="stepScore('pp-ph-${mid}',-1)">▾</div>
          </div>
          <span class="pmc-dash">–</span>
          <div class="pmc-score-wrap">
            <div class="pmc-step" onclick="stepScore('pp-pa-${mid}',1)">▴</div>
            <input type="number" id="pp-pa-${mid}" min="0" max="20" value="0">
            <div class="pmc-step" onclick="stepScore('pp-pa-${mid}',-1)">▾</div>
          </div>
        </div>
        <button class="pmc-btn predict" onclick="submitPredictionFromPanel(${mid})">Predict</button>
      </div>
    </div>`;
  }

  const footerText = isFinished ? 'Results in — points awarded' :
    isLocked ? 'Predictions locked — kickoff imminent' :
    'Predictions hidden until 5 min before kickoff';

  el.innerHTML = `
    ${showMatchVideo ? `<div style="position:relative"><iframe src="${videoSrc}" width="100%" style="aspect-ratio:16/9;display:block;border:none" allow="autoplay; fullscreen" allowfullscreen></iframe><div style="position:absolute;inset:0"></div></div>` : ''}
    <div class="pp-header">
      <div>
        <div class="pp-match">${t1} vs ${t2}</div>
        <div class="pp-meta">${formatDateLabel(m.date,m.time,m.tz)} · ${formatLocalTime(m.date,m.time,m.tz)} · G${m.group}</div>
      </div>
      <button class="pp-close" onclick="closePredPanel()">✕</button>
    </div>
    ${h2hHtml(t1, t2)}
    ${yourPredHtml}
    <table class="pp-table">
      <thead><tr><th>Player</th><th>Prediction</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="pp-footer">${footerText}</div>
    ${commentsEnabled && mid ? `<div class="pp-comments">
      <div class="pp-comments-title">Banter</div>
      <div id="ppCommentsList"><div class="pp-comment-empty">Loading…</div></div>
      ${currentSession ? `<div class="pp-comment-form">
        <input id="ppCommentInput" maxlength="500" placeholder="Say something…" onkeydown="if(event.key==='Enter')postComment(${mid})">
        <button onclick="postComment(${mid})">Send</button>
      </div>` : '<div class="pp-comment-signin">Sign in to join the banter.</div>'}
    </div>` : ''}
  `;

  if (commentsEnabled && mid) {
    loadComments(mid);
    if (commentsChannel) sb.removeChannel(commentsChannel);
    commentsChannel = sb.channel('comments-' + mid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_comments', filter: `match_id=eq.${mid}` }, () => loadComments(mid))
      .subscribe();
  }
}

// ── H2H HISTORY ──
function h2hHtml(t1, t2) {
  if (typeof H2H_DATA === 'undefined') return '';
  const [a, b] = [t1, t2].sort();
  const e = H2H_DATA[a + '|' + b];
  if (!e) return `<div class="pp-h2h">
    <div class="pp-h2h-title">Head to Head</div>
    <div class="h2h-first">🎉 First ever meeting between these two!</div>
  </div>`;
  const pct = n => (n / e.m) * 100;
  let facts = '';
  if (e.wc[0] > 0) {
    const bits = [];
    if (e.wc[1]) bits.push(`${a} won ${e.wc[1]}`);
    if (e.wc[3]) bits.push(`${b} won ${e.wc[3]}`);
    if (e.wc[2]) bits.push(`${e.wc[2]} drawn`);
    facts += `<div class="h2h-fact"><span class="hf-icon">🏆</span><span>${e.wc[0]} World Cup meeting${e.wc[0] > 1 ? 's' : ''} — ${bits.join(', ')}</span></div>`;
  }
  if (e.l) facts += `<div class="h2h-fact"><span class="hf-icon">🕐</span><span>Last met ${e.l.y} (${e.l.t}): <strong>${e.l.h} ${e.l.s}</strong></span></div>`;
  if (e.b && e.b.mg >= 3) facts += `<div class="h2h-fact"><span class="hf-icon">💥</span><span>Biggest win: <strong>${e.b.h} ${e.b.s}</strong> (${e.b.y})</span></div>`;
  facts += `<div class="h2h-fact"><span class="hf-icon">📜</span><span>First met in <strong>${e.f}</strong> · ${e.g[0]}–${e.g[1]} goals on aggregate</span></div>`;
  return `<div class="pp-h2h">
    <div class="pp-h2h-title">Head to Head · ${e.m} meeting${e.m > 1 ? 's' : ''}</div>
    <div class="h2h-legend"><span>${a} ${e.w[0]}</span><span class="h2h-mid">${e.d} draw${e.d === 1 ? '' : 's'}</span><span>${e.w[1]} ${b}</span></div>
    <div class="h2h-bar">
      <span class="h2h-w1" style="width:${pct(e.w[0])}%"></span>
      <span class="h2h-d" style="width:${pct(e.d)}%"></span>
      <span class="h2h-w2" style="width:${pct(e.w[1])}%"></span>
    </div>
    <div class="h2h-facts">${facts}</div>
  </div>`;
}

// ── MATCH COMMENTS ──
let commentsChannel = null;

async function loadComments(mid) {
  const el = document.getElementById('ppCommentsList');
  if (!el) return;
  const { data: comments } = await sb.from('match_comments')
    .select('user_id,body,created_at').eq('match_id', mid)
    .order('created_at').limit(100);
  const { data: profs } = await sb.from('player_profiles').select('id,player_name');
  const nameById = {};
  (profs || []).forEach(p => { nameById[p.id] = p.player_name; });
  if (!comments || !comments.length) {
    el.innerHTML = '<div class="pp-comment-empty">No banter yet — get it started.</div>';
    return;
  }
  el.innerHTML = comments.map(c => {
    const t = new Date(c.created_at);
    const sameDay = t.toDateString() === new Date().toDateString();
    const when = sameDay
      ? `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`
      : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return `<div class="pp-comment"><span class="c-author">${nameById[c.user_id] || '?'}</span><span class="c-body">${escapeHtml(c.body)}</span><span class="c-time">${when}</span></div>`;
  }).join('');
}

async function postComment(mid) {
  const input = document.getElementById('ppCommentInput');
  if (!input || !currentSession) return;
  const body = input.value.trim();
  if (!body) return;
  input.value = '';
  const { error } = await sb.from('match_comments').insert({ match_id: mid, user_id: currentSession.user.id, body });
  if (error) { alert('Error: ' + error.message); return; }
  loadComments(mid);
}

async function renderProfile(playerName) {
  const el = document.getElementById('profileCard');
  const teams = people[playerName] || [];
  const owner = playerName;

  const teamStats = {};
  for (const m of matchData) {
    if (m.score1 === null || m.score2 === null) continue;
    for (const tn of [m.team1, m.team2]) {
      if (!teamStats[tn]) teamStats[tn] = { p:0,w:0,d:0,l:0,gf:0,ga:0,results:[] };
    }
    const { team1, team2, score1, score2 } = m;
    teamStats[team1].p++; teamStats[team2].p++;
    teamStats[team1].gf+=score1; teamStats[team1].ga+=score2;
    teamStats[team2].gf+=score2; teamStats[team2].ga+=score1;
    if(score1>score2){teamStats[team1].w++;teamStats[team2].l++;teamStats[team1].results.push('w');teamStats[team2].results.push('l');}
    else if(score2>score1){teamStats[team2].w++;teamStats[team1].l++;teamStats[team2].results.push('w');teamStats[team1].results.push('l');}
    else{teamStats[team1].d++;teamStats[team2].d++;teamStats[team1].results.push('d');teamStats[team2].results.push('d');}
  }

  let matchPts = 0, matchW = 0, matchD = 0, matchL = 0;
  for (const m of matchData) {
    if (m.score1 === null || m.score2 === null) continue;
    const o1 = teamOwner[m.team1], o2 = teamOwner[m.team2];
    if (o1 === owner && m.score1 > m.score2) { matchPts += 3; matchW++; }
    else if (o2 === owner && m.score2 > m.score1) { matchPts += 3; matchW++; }
    else if (o1 === owner && m.score1 === m.score2) { matchPts += 1; matchD++; }
    else if (o2 === owner && m.score2 === m.score1) { matchPts += 1; matchD++; }
    else if (o1 === owner || o2 === owner) matchL++;
  }

  let predStats = null;
  if (currentSession) {
    const { data: allPreds } = await sb.from('predictions').select('user_id,match_id,predicted_home_score,predicted_away_score');
    if (allPreds) {
      const { data: profs } = await sb.from('player_profiles').select('id').eq('player_name', playerName);
      const uid = profs && profs[0] ? profs[0].id : null;
      if (uid) {
        const userPreds = allPreds.filter(p => p.user_id === uid);
        const { data: allMatches } = await sb.from('matches').select('id,home_score,away_score,home_team_id(name),away_team_id(name)');
        let total = 0, exact = 0, correct = 0, totalPts = 0;
        for (const p of userPreds) {
          const m = allMatches?.find(am => am.id === p.match_id);
          if (!m || m.home_score === null) continue;
          total++;
          const pts = calcPredPoints(p.predicted_home_score, p.predicted_away_score, m.home_score, m.away_score);
          totalPts += pts;
          if (pts === 5) exact++;
          else if (pts >= 1) correct++;
        }
        if (total > 0) predStats = { total, exact, correct, totalPts, accuracy: Math.round(((exact + correct) / total) * 100) };
      }
    }
  }

  const recentForm = (t) => {
    const s = teamStats[t];
    if (!s || !s.results.length) return '<div class="form-dots"><div class="fd empty"></div><div class="fd empty"></div><div class="fd empty"></div></div>';
    return '<div class="form-dots">' + s.results.slice(-3).map(r => `<div class="fd ${r}"></div>`).join('') + '</div>';
  };

  let teamsHtml = teams.map(t => {
    const s = teamStats[t.team] || { p:0,w:0,d:0,l:0 };
    return `<div class="pc-team-row">
      <img class="ptr-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
      <span class="ptr-name">${t.team}</span>
      <span class="ptr-group">G${t.group}</span>
      ${recentForm(t.team)}
      <span class="ptr-record">${s.w}-${s.d}-${s.l}</span>
      <span class="ptr-pts">${s.w*3+s.d}pts</span>
    </div>`;
  }).join('');

  let badgesHtml = '';
  const pstats = getPredStatsByPlayer()[playerName];
  if (pstats && pstats.settled > 0) {
    const items = [];
    if (pstats.best >= 2) items.push(`<span class="stat-badge">🔥 <span class="sb-val">${pstats.best}</span>&nbsp;result streak</span>`);
    if (pstats.exact > 0) items.push(`<span class="stat-badge">⭐ <span class="sb-val">${pstats.exact}</span>&nbsp;exact score${pstats.exact > 1 ? 's' : ''}</span>`);
    if (pstats.upsets > 0) items.push(`<span class="stat-badge">💣 <span class="sb-val">${pstats.upsets}</span>&nbsp;upset${pstats.upsets > 1 ? 's' : ''} called</span>`);
    if (pstats.jokerPts > 0) items.push(`<span class="stat-badge">🃏 <span class="sb-val">+${pstats.jokerPts}</span>&nbsp;joker bonus</span>`);
    items.push(`<span class="stat-badge">🔮 <span class="sb-val">${pstats.pts}</span>&nbsp;pred pts</span>`);
    badgesHtml = `<div class="pc-section"><div class="pc-section-title">Badges</div><div class="badge-row">${items.join('')}</div></div>`;
  }

  let predHtml = '';
  if (predStats) {
    predHtml = `<div class="pc-section">
      <div class="pc-section-title">Prediction Accuracy</div>
      <div class="pc-stats-grid">
        <div class="pc-stat-box"><div class="pc-sv">${predStats.totalPts}</div><div class="pc-sl">Points</div></div>
        <div class="pc-stat-box"><div class="pc-sv">${predStats.total}</div><div class="pc-sl">Predictions</div></div>
        <div class="pc-stat-box"><div class="pc-sv" style="color:var(--gold)">${predStats.exact}</div><div class="pc-sl">Exact ★</div></div>
        <div class="pc-stat-box"><div class="pc-sv" style="color:var(--accent)">${predStats.accuracy}%</div><div class="pc-sl">Accuracy</div></div>
      </div>
    </div>`;
  }

  let feedHtml = '';
  const playerMatches = matchData
    .filter(m => m.score1 !== null && (teamOwner[m.team1] === owner || teamOwner[m.team2] === owner))
    .sort((a, b) => toDate(b.date, b.time, b.tz) - toDate(a.date, a.time, a.tz))
    .slice(0, 10);
  if (playerMatches.length > 0) {
    feedHtml = '<div class="pc-section"><div class="pc-section-title">Recent Results</div>';
    for (const m of playerMatches) {
      feedHtml += `<div class="pc-feed-item">
        <span class="pfi-result">${m.team1} ${m.score1}–${m.score2} ${m.team2}</span>
        <span class="pfi-date"> · ${formatDateLabel(m.date,m.time,m.tz)}</span>
      </div>`;
    }
    feedHtml += '</div>';
  }

  el.innerHTML = `
    <div class="pc-header">
      <button class="pc-close" onclick="closeProfile()">✕</button>
      <div class="pc-name">${playerDisplayName(owner)}</div>
      <div class="pc-badges">
        <span class="pc-badge points">${matchPts} match pts</span>
        ${predStats ? `<span class="pc-badge pred-pts">🔮 ${predStats.totalPts} pred pts</span>` : ''}
        ${predStats ? `<span class="pc-badge rank">${predStats.accuracy}% pred accuracy</span>` : ''}
      </div>
      <div class="pc-flags">${teams.map(t => `<img src="${flagUrl(t.iso)}" alt="${t.team}" loading="lazy" onerror="this.style.display='none'" title="${t.team}">`).join('')}</div>
    </div>
    <div class="pc-body">
      ${badgesHtml}
      <div class="pc-section">
        <div class="pc-section-title">Team Roster</div>
        ${teamsHtml}
      </div>
      ${predHtml}
      ${feedHtml}
    </div>
  `;
}
