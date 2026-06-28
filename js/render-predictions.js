// ── PREDICTIONS ──
async function renderPredictions() {
  const el = document.getElementById('predictionsWrap');
  if (!currentSession) { el.innerHTML = '<div class="pred-empty"><div class="pe-icon">🔮</div>Sign in to make predictions.</div>'; return; }

  const now = new Date();
  const upcoming = matchData
    .filter(m => !m.isComplete && m.team1 !== null && m.team2 !== null)
    .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
    .sort((a, b) => a.kickoff - b.kickoff)
    .slice(0, 20);

  const { data: existing } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '')).eq('user_id', currentSession.user.id);
  const predMap = {};
  if (existing) existing.forEach(p => { predMap[p.match_id] = p; });

  const { data: allMatches } = await sb.from('matches').select('id,match_date,kickoff_time,home_team_id(name),away_team_id(name)').order('match_date').order('kickoff_time');
  if (!allMatches) { el.innerHTML = '<div class=\"pred-empty\">Unable to load match data. Try refreshing.</div>'; return; }
  const matchIdMap = {};
  if (allMatches) allMatches.forEach(m => {
    matchIdMap[`${m.home_team_id.name}|${m.away_team_id.name}|${m.match_date}`] = m.id;
  });

  let predicted = 0, open = 0, locked = 0;
  for (const m of upcoming) {
    const mid = matchIdMap[`${m.team1}|${m.team2}|${m.date}`];
    if (mid && predMap[mid]) predicted++;
    else if (m.kickoff - now < 5 * 60 * 1000) locked++;
    else open++;
  }

  let html = `<div class="pred-summary">
    <div class="pred-stat accent"><div class="ps-num">${predicted}</div><div class="ps-label">Predicted</div></div>
    <div class="pred-stat"><div class="ps-num">${open}</div><div class="ps-label">Open</div></div>
    <div class="pred-stat"><div class="ps-num">${locked}</div><div class="ps-label">Locked</div></div>
  </div>`;

  // Group by US venue date (day shows where the match is actually played)
  const byDate = {};
  for (const m of upcoming) {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  }

  let hasOpen = false;
  for (const [date, dayMatches] of Object.entries(byDate)) {
    const headerLabel = getUSDateLabel(date);
    // Check if any match in this day has a joker active
    const dayHasJoker = dayMatches.some(m => {
      const key = `${m.team1}|${m.team2}|${m.date}`;
      const mid = matchIdMap[key];
      const ep = mid ? predMap[mid] : null;
      return ep && ep.is_joker;
    });
    const jokerNote = dayHasJoker ? '<span class="pdh-joker-note">🃏 Joker active</span>' : '';
    html += `<div class="pred-day-header"><span>${headerLabel}</span><span class="pdh-count">${dayMatches.length} match${dayMatches.length > 1 ? 'es' : ''}</span>${jokerNote}</div>`;

    for (const m of dayMatches) {
    const key = `${m.team1}|${m.team2}|${m.date}`;
    const mid = matchIdMap[key];
    if (!mid) continue;

    const ep = mid ? predMap[mid] : null;
    const isLocked = m.kickoff - now < 5 * 60 * 1000;

    if (ep && isLocked) {
      const jokerCls = ep.is_joker ? ' joker-active' : '';
      html += `<div class="pred-match-card${jokerCls}">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock locked-out">Locked</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} <span class="pmc-group badge-mono">${m.round ? roundLabel(m.round) : 'G' + m.group}</span></div>
          <span class="pmc-status locked"><span${ep.is_joker ? ' class="joker-active-score"' : ''}>🔒 ${ep.predicted_home_score}–${ep.predicted_away_score}</span>${ep.is_joker ? '<span class="joker-locked-badge">🃏 2×</span>' : ''}</span>
        </div></div>`;
    } else if (ep) {
      const lockMs = m.kickoff - 5 * 60 * 1000;
      const lockStr = getLockCountdown(lockMs);
      hasOpen = true;
      html += `<div class="pred-match-card${ep.is_joker ? ' joker-active' : ''}" id="pred-${mid}">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock">${lockStr}</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} <span class="pmc-group badge-mono">${m.round ? roundLabel(m.round) : 'G' + m.group}</span></div>
          <span class="pmc-status predicted" id="pred-display-${mid}"><span class="${ep.is_joker ? 'joker-active-score' : ''}">${ep.predicted_home_score}–${ep.predicted_away_score}</span></span>
          ${jokersEnabled ? `<button class="joker-chip${ep.is_joker ? ' active' : ''}" onclick="toggleJoker(${mid})" title="Joker doubles this match's points — one per match day">🃏 2×</button>` : ''}
          <div class="pmc-score" id="pred-edit-${mid}" style="display:none">
            <div class="pmc-score-wrap">
              <div class="pmc-step" onclick="stepScore('ph-${mid}',1)">▴</div>
              <input type="number" id="ph-${mid}" min="0" max="20" value="${ep.predicted_home_score}">
              <div class="pmc-step" onclick="stepScore('ph-${mid}',-1)">▾</div>
            </div>
            <span class="pmc-dash">–</span>
            <div class="pmc-score-wrap">
              <div class="pmc-step" onclick="stepScore('pa-${mid}',1)">▴</div>
              <input type="number" id="pa-${mid}" min="0" max="20" value="${ep.predicted_away_score}">
              <div class="pmc-step" onclick="stepScore('pa-${mid}',-1)">▾</div>
            </div>
          </div>
          <button class="pmc-btn edit" id="pred-edit-btn-${mid}" onclick="editPrediction(${mid})">Edit</button>
          <button class="pmc-btn save" id="pred-save-btn-${mid}" onclick="submitPrediction(${mid})" style="display:none">Save</button>
        </div></div>`;
    } else if (isLocked) {
      html += `<div class="pred-match-card">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock locked-out">Locked</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} <span class="pmc-group badge-mono">${m.round ? roundLabel(m.round) : 'G' + m.group}</span></div>
          <span class="pmc-status locked">Locked</span>
        </div></div>`;
    } else {
      const lockMs = m.kickoff - 5 * 60 * 1000;
      const lockStr = getLockCountdown(lockMs);
      hasOpen = true;
      html += `<div class="pred-match-card" id="pred-${mid}">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock">${lockStr}</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} <span class="pmc-group badge-mono">${m.round ? roundLabel(m.round) : 'G' + m.group}</span></div>
          <div class="pmc-score">
            <div class="pmc-score-wrap">
              <div class="pmc-step" onclick="stepScore('ph-${mid}',1)">▴</div>
              <input type="number" id="ph-${mid}" min="0" max="20" value="0">
              <div class="pmc-step" onclick="stepScore('ph-${mid}',-1)">▾</div>
            </div>
            <span class="pmc-dash">–</span>
            <div class="pmc-score-wrap">
              <div class="pmc-step" onclick="stepScore('pa-${mid}',1)">▴</div>
              <input type="number" id="pa-${mid}" min="0" max="20" value="0">
              <div class="pmc-step" onclick="stepScore('pa-${mid}',-1)">▾</div>
            </div>
          </div>
          <button class="pmc-btn predict" onclick="submitPrediction(${mid})">Predict</button>
        </div></div>`;
    }
    }
  }
  if (!hasOpen && predicted === 0 && upcoming.length === 0) {
    html += '<div class="pred-empty"><div class="pe-icon">🏁</div>No upcoming matches to predict.</div>';
  }

  const { data: history } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '')).eq('user_id', currentSession.user.id).order('created_at', { ascending: false }).limit(30);
  if (history && history.length > 0) {
    let historyHtml = '';
    let exactCount = 0, correctCount = 0;
    for (const p of history) {
      const am = allMatches?.find(am => am.id === p.match_id);
      if (!am) continue;
      const m = matchData.find(m => m.team1 === am.home_team_id.name && m.team2 === am.away_team_id.name && m.date === am.match_date);
      if (!m || !m.isComplete) continue;

      const pts = calcPredPoints(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2);
      if (pts === 5) exactCount++; else if (pts >= 1) correctCount++;

      const badge = predResultBadge(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2, p.is_joker);
      historyHtml += `<div class="pred-history-card">
        <div class="phc-result">${badge}</div>
        <div class="phc-match">
          <div class="phc-teams">${m.team1} vs ${m.team2} <span style="color:var(--text-muted);font-weight:400;font-size:0.75rem">${m.round ? roundLabel(m.round) : 'G' + m.group}</span></div>
          <div class="phc-scores">
            Result <span class="actual">${m.score1}–${m.score2}</span> &nbsp;·&nbsp; Your pick <span class="pred">${p.predicted_home_score}–${p.predicted_away_score}</span>
          </div>
        </div>
      </div>`;
    }
    let statsHtml = '';
    if (exactCount + correctCount > 0) {
      statsHtml = `<div class="pred-summary" style="margin-top:16px">
        <div class="pred-stat gold"><div class="ps-num">${exactCount}</div><div class="ps-label">Perfect 5★</div></div>
        <div class="pred-stat accent"><div class="ps-num">${correctCount}</div><div class="ps-label">Scored</div></div>
      </div>`;
    }
    html += `<div class="pred-section-title label-sm">Your History</div>${statsHtml}${historyHtml}`;
  }

  el.innerHTML = html;
}

async function submitPrediction(matchId) {
  const h = parseInt(document.getElementById(`ph-${matchId}`).value) || 0;
  const a = parseInt(document.getElementById(`pa-${matchId}`).value) || 0;
  const { error } = await sb.from('predictions').upsert({
    user_id: currentSession.user.id,
    match_id: matchId,
    predicted_home_score: h,
    predicted_away_score: a
  }, { onConflict: 'user_id,match_id' });
  if (error) { alert('Error: ' + error.message); return; }
  renderPredictions();
}

async function toggleJoker(matchId) {
  if (!jokersEnabled || !currentSession) return;
  const uid = currentSession.user.id;
  const { data: cur } = await sb.from('predictions').select('is_joker').eq('user_id', uid).eq('match_id', matchId).single();
  const turningOn = !(cur && cur.is_joker);
  if (turningOn) {
    const { data: target } = await sb.from('matches').select('match_date').eq('id', matchId).single();
    if (target) {
      const { data: sameDay } = await sb.from('matches').select('id').eq('match_date', target.match_date);
      const ids = (sameDay || []).map(m => m.id).filter(id => id !== matchId);
      if (ids.length) await sb.from('predictions').update({ is_joker: false }).eq('user_id', uid).in('match_id', ids);
    }
  }
  const { error } = await sb.from('predictions').update({ is_joker: turningOn }).eq('user_id', uid).eq('match_id', matchId);
  if (error) {
    alert(error.message.includes('one joker') ? 'Your 🃏 is already locked in on another match that day.' : 'Error: ' + error.message);
    return;
  }
  if (turningOn) playJokerVideo();
  loadPredData();
  renderPredictions();
}

function editPrediction(matchId) {
  document.getElementById(`pred-display-${matchId}`).style.display = 'none';
  document.getElementById(`pred-edit-${matchId}`).style.display = 'flex';
  document.getElementById(`pred-edit-btn-${matchId}`).style.display = 'none';
  document.getElementById(`pred-save-btn-${matchId}`).style.display = 'inline-block';
}

function editPredictionFromPanel(matchId) {
  document.getElementById(`pp-pred-display-${matchId}`).style.display = 'none';
  document.getElementById(`pp-pred-edit-${matchId}`).style.display = 'flex';
  document.getElementById(`pp-pred-edit-btn-${matchId}`).style.display = 'none';
  document.getElementById(`pp-pred-save-btn-${matchId}`).style.display = 'inline-block';
  const jokerEl = document.getElementById(`pp-joker-${matchId}`);
  if (jokerEl) jokerEl.style.display = 'none';
}

async function submitPredictionFromPanel(matchId) {
  const h = parseInt(document.getElementById(`pp-ph-${matchId}`).value) || 0;
  const a = parseInt(document.getElementById(`pp-pa-${matchId}`).value) || 0;
  const { error } = await sb.from('predictions').upsert({
    user_id: currentSession.user.id,
    match_id: matchId,
    predicted_home_score: h,
    predicted_away_score: a
  }, { onConflict: 'user_id,match_id' });
  if (error) { alert('Error: ' + error.message); return; }
  await loadPredData();
  const m = matchData.find(m => {
    const key = `${m.team1}|${m.team2}|${m.date}`;
    return matchIdByTeamDate[key] === matchId;
  });
  if (m) renderPredPanel(`${m.team1}|${m.team2}|${m.date}`);
}

async function toggleJokerFromPanel(matchId) {
  if (!jokersEnabled || !currentSession) return;
  const uid = currentSession.user.id;
  const { data: cur } = await sb.from('predictions').select('is_joker').eq('user_id', uid).eq('match_id', matchId).single();
  const turningOn = !(cur && cur.is_joker);
  if (turningOn) {
    const { data: target } = await sb.from('matches').select('match_date').eq('id', matchId).single();
    if (target) {
      const { data: sameDay } = await sb.from('matches').select('id').eq('match_date', target.match_date);
      const ids = (sameDay || []).map(m => m.id).filter(id => id !== matchId);
      if (ids.length) await sb.from('predictions').update({ is_joker: false }).eq('user_id', uid).in('match_id', ids);
    }
  }
  const { error } = await sb.from('predictions').update({ is_joker: turningOn }).eq('user_id', uid).eq('match_id', matchId);
  if (error) {
    alert(error.message.includes('one joker') ? 'Your 🃏 is already locked in on another match that day.' : 'Error: ' + error.message);
    return;
  }
  if (turningOn) playJokerVideo();
  await loadPredData();
  const m = matchData.find(m => {
    const key = `${m.team1}|${m.team2}|${m.date}`;
    return matchIdByTeamDate[key] === matchId;
  });
  if (m) renderPredPanel(`${m.team1}|${m.team2}|${m.date}`);
}

function getLockCountdown(lockTime) {
  const diff = lockTime - new Date();
  if (diff <= 0) return 'Locked';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Locks in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const rm = mins % 60;
  if (hours < 24) return `Locks in ${hours}h${rm > 0 ? ' ' + rm + 'm' : ''}`;
  const days = Math.floor(hours / 24);
  return `Locks in ${days}d`;
}

function stepScore(inputId, delta) {
  const el = document.getElementById(inputId);
  if (!el) return;
  let v = parseInt(el.value) || 0;
  v = Math.max(0, Math.min(20, v + delta));
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function playJokerVideo() {
  const overlay = document.getElementById('joker-video-overlay');
  const video = document.getElementById('joker-video');
  if (!overlay || !video) return;
  video.currentTime = 0;
  overlay.classList.add('active');
  video.play().catch(() => {});
  video.onended = closeJokerVideo;
}

function closeJokerVideo() {
  const overlay = document.getElementById('joker-video-overlay');
  const video = document.getElementById('joker-video');
  if (overlay) overlay.classList.remove('active');
  if (video) { video.pause(); video.currentTime = 0; }
}
