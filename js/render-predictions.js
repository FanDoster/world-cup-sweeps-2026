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

  const { data: existing } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '') + (winnersEnabled ? ',predicted_winner' : '')).eq('user_id', currentSession.user.id);
  const predMap = {};
  if (existing) existing.forEach(p => { predMap[p.match_id] = p; });

  const { data: allMatches } = await sb.from('matches').select('id,match_date,kickoff_time,home_team_id(name),away_team_id(name)').order('match_date').order('kickoff_time');
  if (!allMatches) { el.innerHTML = '<div class=\"pred-empty\">Unable to load match data. Try refreshing.</div>'; return; }
  const matchIdMap = {};
  if (allMatches) allMatches.forEach(m => {
    if (!m.home_team_id || !m.away_team_id) return; // skip TBD knockout fixtures (teams not yet decided)
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

    const isKnockout = !!m.round;
    const roundBadge = `<span class="pmc-group badge-mono">${isKnockout ? roundLabel(m.round) : 'G' + m.group}</span>`;

    // Winner picker HTML (knockout only, editable state)
    if (ep && isLocked) {
      const jokerCls = ep.is_joker ? ' joker-active' : '';
      const winnerDisplay = isKnockout && ep.predicted_winner ? ` <span class="pmc-winner-locked">→ ${ep.predicted_winner}</span>` : '';
      html += `<div class="pred-match-card${jokerCls}">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock locked-out">Locked</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} ${roundBadge}</div>
          <span class="pmc-status locked"><span${ep.is_joker ? ' class="joker-active-score"' : ''}>🔒 ${ep.predicted_home_score}–${ep.predicted_away_score}${winnerDisplay}</span>${ep.is_joker ? '<span class="joker-locked-badge">🃏 2×</span>' : ''}</span>
        </div></div>`;
    } else if (ep) {
      const lockMs = m.kickoff - 5 * 60 * 1000;
      const lockStr = getLockCountdown(lockMs);
      hasOpen = true;
      const winnerDisplay = isKnockout && ep.predicted_winner ? ` → ${ep.predicted_winner}` : '';
      const needsWinnerCls = isKnockout && !ep.predicted_winner ? ' needs-winner' : '';
      html += `<div class="pred-match-card${ep.is_joker ? ' joker-active' : ''}${needsWinnerCls}" id="pred-${mid}">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock">${lockStr}</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} ${roundBadge}</div>
          <span class="pmc-status predicted" id="pred-display-${mid}"><span class="${ep.is_joker ? 'joker-active-score' : ''}">${ep.predicted_home_score}–${ep.predicted_away_score}${winnerDisplay}</span></span>
          ${jokersEnabled && matchesOnDate(m.date) > 1 ? `<button class="joker-chip${ep.is_joker ? ' active' : ''}" onclick="toggleJoker(${mid})" title="Joker doubles this match's points — one per match day">🃏 2×</button>` : ''}
          <div class="pmc-edit-wrap" id="pred-edit-${mid}" style="display:none">
            ${predEntryBody(mid, m.team1, m.team2, isKnockout, ep.predicted_winner, `ph-${mid}`, `pa-${mid}`, ep.predicted_home_score, ep.predicted_away_score)}
          </div>
          <button class="pmc-btn edit" id="pred-edit-btn-${mid}" onclick="editPrediction(${mid})">Edit</button>
          <button class="pmc-btn save" id="pred-save-btn-${mid}" onclick="submitPrediction(${mid})" style="display:none">Save</button>
        </div></div>`;
    } else if (isLocked) {
      html += `<div class="pred-match-card">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock locked-out">Locked</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} ${roundBadge}</div>
          <span class="pmc-status locked">Locked</span>
        </div></div>`;
    } else {
      const lockMs = m.kickoff - 5 * 60 * 1000;
      const lockStr = getLockCountdown(lockMs);
      hasOpen = true;
      const needsWinnerCls = isKnockout ? ' needs-winner' : '';
      html += `<div class="pred-match-card${needsWinnerCls}" id="pred-${mid}">
        <div class="pmc-inner">
          <div class="pmc-date"><div class="pmc-day">${formatDateLabel(m.date,m.time,m.tz)}</div><div class="pmc-time">${formatLocalTime(m.date,m.time,m.tz)}</div><div class="pmc-lock">${lockStr}</div></div>
          <div class="pmc-teams">${m.team1} vs ${m.team2} ${roundBadge}</div>
          <div>
            ${predEntryBody(mid, m.team1, m.team2, isKnockout, null, `ph-${mid}`, `pa-${mid}`, 0, 0)}
          </div>
          <button class="pmc-btn predict" onclick="submitPrediction(${mid})">Predict</button>
        </div></div>`;
    }
    }
  }
  if (!hasOpen && predicted === 0 && upcoming.length === 0) {
    html += '<div class="pred-empty"><div class="pe-icon">🏁</div>No upcoming matches to predict.</div>';
  }

  const { data: history } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '') + (winnersEnabled ? ',predicted_winner' : '')).eq('user_id', currentSession.user.id).order('created_at', { ascending: false }).limit(30);
  if (history && history.length > 0) {
    let historyHtml = '';
    let exactCount = 0, correctCount = 0;
    for (const p of history) {
      const am = allMatches?.find(am => am.id === p.match_id);
      if (!am || !am.home_team_id || !am.away_team_id) continue;
      const m = matchData.find(m => m.team1 === am.home_team_id.name && m.team2 === am.away_team_id.name && m.date === am.match_date);
      if (!m || !m.isComplete) continue;

      const actualWinner = getActualKnockoutWinner(m);
      const pts = calcPredPoints(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2, m.round ? p.predicted_winner : null, m.round ? actualWinner : null);
      // Penalty-decided knockout (FT draw) with a winner pick can reach 6; otherwise 5.
      const isPenaltyGame = m.round && m.score1 === m.score2 && actualWinner;
      const maxPts = isPenaltyGame && p.predicted_winner ? 6 : 5;
      if (pts === maxPts) exactCount++; else if (pts >= 1) correctCount++;

      const badge = predResultBadge(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2, p.is_joker, m.round ? p.predicted_winner : null, m.round ? actualWinner : null);
      // Only relevant on penalty-decided games (FT draw) — the winner pick is irrelevant
      // to scoring on decisive knockout results, so don't show it there.
      const winnerPickLine = m.round && m.score1 === m.score2 && p.predicted_winner ? ` &nbsp;·&nbsp; Winner: <span class="pred">${p.predicted_winner}</span>${actualWinner ? (p.predicted_winner === actualWinner ? ' <span class="hit-marker">✓</span>' : ' <span class="miss-marker">✗</span>') : ''}` : '';
      historyHtml += `<div class="pred-history-card">
        <div class="phc-result">${badge}</div>
        <div class="phc-match">
          <div class="phc-teams">${m.team1} vs ${m.team2} <span style="color:var(--text-muted);font-weight:400;font-size:0.75rem">${m.round ? roundLabel(m.round) : 'G' + m.group}</span></div>
          <div class="phc-scores">
            Result <span class="actual">${m.score1}–${m.score2}</span> &nbsp;·&nbsp; Your pick <span class="pred">${p.predicted_home_score}–${p.predicted_away_score}</span>${winnerPickLine}
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
  const upsertData = {
    user_id: currentSession.user.id,
    match_id: matchId,
    predicted_home_score: h,
    predicted_away_score: a
  };
  if (winnersEnabled) {
    const m = matchData.find(m => m.id === matchId);
    const isKnockout = m && m.round;
    const winnerBtn = document.querySelector(`[data-winner-mid="${matchId}"].winner-btn.active`);
    if (isKnockout && !winnerBtn) {
      const row = document.getElementById(`winner-row-${matchId}`);
      if (row) {
        row.classList.add('error-highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => row.classList.remove('error-highlight'), 1050);
      }
      return;
    }
    upsertData.predicted_winner = winnerBtn ? winnerBtn.dataset.team : null;
  }
  const { error } = await sb.from('predictions').upsert(upsertData, { onConflict: 'user_id,match_id' });
  if (error) { alert('Error: ' + error.message); return; }
  renderPredictions();
}

// Knockout-aware prediction entry body: pick who advances first, then reveal the
// FT-score picker. `token` matches the `id` / `data-winner-mid` prefix (numeric mid
// on the Predictions tab, or `pp-${mid}` in the profile panel). Group-stage matches
// (or when the winner feature is off) show the score immediately.
function predEntryBody(token, team1, team2, isKnockout, existingWinner, homeId, awayId, homeVal, awayVal) {
  const scoreBlock = `
    <div class="pmc-score">
      <div class="pmc-score-wrap">
        <div class="pmc-step" onclick="stepScore('${homeId}',1)">▴</div>
        <input type="number" id="${homeId}" min="0" max="20" value="${homeVal}">
        <div class="pmc-step" onclick="stepScore('${homeId}',-1)">▾</div>
      </div>
      <span class="pmc-dash">–</span>
      <div class="pmc-score-wrap">
        <div class="pmc-step" onclick="stepScore('${awayId}',1)">▴</div>
        <input type="number" id="${awayId}" min="0" max="20" value="${awayVal}">
        <div class="pmc-step" onclick="stepScore('${awayId}',-1)">▾</div>
      </div>
    </div>`;

  if (!(winnersEnabled && isKnockout)) return scoreBlock;

  const hasWinner = !!existingWinner;
  // Always start with the prompt-first flow — scores hidden until a winner is chosen,
  // even when editing an existing prediction. existingWinner only pre-selects the button.
  return `
    <div class="pmc-ko-entry">
      <div class="pmc-ko-prompt" id="ko-prompt-${token}">First predict who will advance:</div>
      <div class="pmc-winner-row" id="winner-row-${token}">
        <span class="pmc-winner-label">Winner:</span>
        <div class="pmc-winner-btns">
          <button class="winner-btn${existingWinner === team1 ? ' active' : ''}" data-winner-mid="${token}" data-team="${escapeHtml(team1)}" onclick="selectWinner('${token}','${escapeHtml(team1)}')">${team1}</button>
          <button class="winner-btn${existingWinner === team2 ? ' active' : ''}" data-winner-mid="${token}" data-team="${escapeHtml(team2)}" onclick="selectWinner('${token}','${escapeHtml(team2)}')">${team2}</button>
        </div>
      </div>
      <div class="pmc-score-section" id="score-section-${token}" style="display:none">${scoreBlock}</div>
    </div>`;
}

function selectWinner(matchId, team) {
  document.querySelectorAll(`[data-winner-mid="${matchId}"].winner-btn`).forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-winner-mid="${matchId}"][data-team="${team}"]`);
  if (btn) btn.classList.add('active');
  // Once a winner is chosen, reveal the FT-score picker and switch the prompt text
  const section = document.getElementById(`score-section-${matchId}`);
  if (section) section.style.display = '';
  const prompt = document.getElementById(`ko-prompt-${matchId}`);
  if (prompt) prompt.textContent = 'Now predict an FT score including ET:';
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
  const upsertData = {
    user_id: currentSession.user.id,
    match_id: matchId,
    predicted_home_score: h,
    predicted_away_score: a
  };
  if (winnersEnabled) {
    const m = matchData.find(m => m.id === matchId);
    const isKnockout = m && m.round;
    const winnerBtn = document.querySelector(`[data-winner-mid="pp-${matchId}"].winner-btn.active`);
    if (isKnockout && !winnerBtn) {
      const row = document.getElementById(`winner-row-pp-${matchId}`);
      if (row) {
        row.classList.add('error-highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => row.classList.remove('error-highlight'), 1050);
      }
      return;
    }
    upsertData.predicted_winner = winnerBtn ? winnerBtn.dataset.team : null;
  }
  const { error } = await sb.from('predictions').upsert(upsertData, { onConflict: 'user_id,match_id' });
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
