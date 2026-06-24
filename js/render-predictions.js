// ── PREDICTIONS ──
var xlPredSheet = 'upcoming';

function xlPredSelectCell(addr, formula) {
  var nb = document.getElementById('xl-pred-namebox');
  var ff = document.getElementById('xl-pred-formulafield');
  if (nb) nb.textContent = addr;
  if (ff) ff.textContent = formula;
}

function xlPredSwitchSheet(name) {
  xlPredSheet = name;
  var tabUp = document.getElementById('xl-pred-tab-upcoming');
  var tabHist = document.getElementById('xl-pred-tab-history');
  if (tabUp) tabUp.classList.toggle('xl-tab-active', name === 'upcoming');
  if (tabHist) tabHist.classList.toggle('xl-tab-active', name === 'history');
  renderPredictions();
}

async function renderPredictions() {
  var el = document.getElementById('xl-pred-target');
  if (!el) return;

  if (!currentSession) {
    el.innerHTML = '<div class="xl-pred-signin">Sign in to make predictions.</div>';
    var statusLeft = document.getElementById('xl-pred-status-left');
    if (statusLeft) statusLeft.textContent = 'Not signed in';
    return;
  }

  var now = new Date();
  var upcoming = matchData
    .filter(function(m) { return !m.isComplete; })
    .map(function(m) { return Object.assign({}, m, { kickoff: toDate(m.date, m.time, m.tz) }); })
    .sort(function(a, b) { return a.kickoff - b.kickoff; })
    .slice(0, 20);

  var { data: existing } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '')).eq('user_id', currentSession.user.id);
  var predMap = {};
  if (existing) existing.forEach(function(p) { predMap[p.match_id] = p; });

  var { data: allMatches } = await sb.from('matches').select('id,match_date,kickoff_time,home_team_id(name),away_team_id(name)').order('match_date').order('kickoff_time');
  if (!allMatches) { el.innerHTML = '<div class="xl-pred-signin">Unable to load match data.</div>'; return; }
  var matchIdMap = {};
  allMatches.forEach(function(m) {
    matchIdMap[m.home_team_id.name + '|' + m.away_team_id.name + '|' + m.match_date] = m.id;
  });

  // ── UPCOMING SHEET ──
  if (xlPredSheet === 'upcoming') {
    var predicted = 0, open = 0, locked = 0;
    upcoming.forEach(function(m) {
      var mid = matchIdMap[m.team1 + '|' + m.team2 + '|' + m.date];
      if (mid && predMap[mid]) predicted++;
      else if (m.kickoff - now < 5 * 60 * 1000) locked++;
      else open++;
    });

    // Update status bar
    var statusLeft = document.getElementById('xl-pred-status-left');
    if (statusLeft) statusLeft.textContent = upcoming.length + ' matches';
    var statusRight = document.getElementById('xl-pred-status-right');
    if (statusRight) statusRight.textContent = 'Predicted: ' + predicted + '  |  Open: ' + open + '  |  Locked: ' + locked;

    if (upcoming.length === 0) {
      el.innerHTML = '<div class="xl-pred-signin">No upcoming matches to predict.</div>';
      return;
    }

    // Group by date
    var byDate = {}, byDateOrder = [];
    upcoming.forEach(function(m) {
      if (!byDate[m.date]) { byDate[m.date] = []; byDateOrder.push(m.date); }
      byDate[m.date].push(m);
    });

    var html = '';
    // Header row (row 1)
    html += '<div class="xl-row xl-row-pred-header">' +
      '<div class="xl-row-num">1</div>' +
      '<div class="xl-cell" style="width:90px" onclick="xlPredSelectCell(\'A1\',\'=Date\')">Date</div>' +
      '<div class="xl-cell" style="flex:1;min-width:150px" onclick="xlPredSelectCell(\'B1\',\'=Match\')">Match</div>' +
      '<div class="xl-cell xl-num" style="width:60px" onclick="xlPredSelectCell(\'C1\',\'=Home\')">Home</div>' +
      '<div class="xl-cell xl-num" style="width:30px"></div>' +
      '<div class="xl-cell xl-num" style="width:60px" onclick="xlPredSelectCell(\'E1\',\'=Away\')">Away</div>' +
      '<div class="xl-cell xl-num" style="width:55px" onclick="xlPredSelectCell(\'F1\',\'=Joker\')">Joker</div>' +
      '<div class="xl-cell" style="width:80px" onclick="xlPredSelectCell(\'G1\',\'=Status\')">Status</div>' +
      '</div>';

    var rowNum = 2;
    // Count joker usage per day for current user
    var jokersByDate = {};
    upcoming.forEach(function(m) {
      var mid = matchIdMap[m.team1 + '|' + m.team2 + '|' + m.date];
      var ep = mid ? predMap[mid] : null;
      if (ep && ep.is_joker) jokersByDate[m.date] = mid;
    });

    for (var di = 0; di < byDateOrder.length; di++) {
      var date = byDateOrder[di];
      var dayMatches = byDate[date];
      var dayHasJoker = !!jokersByDate[date];

      // Date separator row
      html += '<div class="xl-row xl-date-sep-row">' +
        '<div class="xl-row-num">' + rowNum + '</div>' +
        '<div class="xl-cell" style="width:90px;font-style:italic;color:#555">' + formatDateLabel(dayMatches[0].date, dayMatches[0].time, dayMatches[0].tz) + '</div>' +
        '<div class="xl-cell" style="flex:1;min-width:150px;color:#555">' + dayMatches.length + ' match' + (dayMatches.length !== 1 ? 'es' : '') + (dayHasJoker ? ' — &#127183; Joker active' : '') + '</div>' +
        '<div class="xl-cell" style="width:60px"></div>' +
        '<div class="xl-cell" style="width:30px"></div>' +
        '<div class="xl-cell" style="width:60px"></div>' +
        '<div class="xl-cell" style="width:55px"></div>' +
        '<div class="xl-cell" style="width:80px"></div>' +
        '</div>';
      rowNum++;

      for (var mi = 0; mi < dayMatches.length; mi++) {
        var m = dayMatches[mi];
        var key = m.team1 + '|' + m.team2 + '|' + m.date;
        var mid = matchIdMap[key];
        if (!mid) { rowNum++; continue; }
        var ep = predMap[mid];
        var isLocked = m.kickoff - now < 5 * 60 * 1000;
        var lockMs = m.kickoff - 5 * 60 * 1000;
        var lockStr = getLockCountdown(lockMs);
        var rowCls = mi % 2 === 0 ? 'xl-row-pred-even' : 'xl-row-pred-odd';
        var rowAddr = 'C' + rowNum;

        // Home score cell
        var homeCellContent, awayCellContent;
        if (isLocked) {
          homeCellContent = '<div class="xl-cell xl-num xl-cell-locked" style="width:60px" onclick="xlPredSelectCell(\'' + rowAddr + '\',\'=IF(locked,&quot;—&quot;,home_pred)\')">' + (ep ? ep.predicted_home_score : '—') + '</div>';
          awayCellContent = '<div class="xl-cell xl-num xl-cell-locked" style="width:60px" onclick="xlPredSelectCell(\'E' + rowNum + '\',\'=IF(locked,&quot;—&quot;,away_pred)\')">' + (ep ? ep.predicted_away_score : '—') + '</div>';
        } else if (ep) {
          homeCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'' + rowAddr + '\',\'=IF(locked,&quot;—&quot;,home_pred)\')">' +
            '<input class="xl-score-input" type="number" id="ph-' + mid + '" min="0" max="20" value="' + ep.predicted_home_score + '" onfocus="this.select()" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
          awayCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'E' + rowNum + '\',\'=IF(locked,&quot;—&quot;,away_pred)\')">' +
            '<input class="xl-score-input" type="number" id="pa-' + mid + '" min="0" max="20" value="' + ep.predicted_away_score + '" onfocus="this.select()" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
        } else {
          homeCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'' + rowAddr + '\',\'=IF(locked,&quot;—&quot;,home_pred)\')">' +
            '<input class="xl-score-input" type="number" id="ph-' + mid + '" min="0" max="20" value="0" onfocus="this.select()" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
          awayCellContent = '<div class="xl-cell xl-num xl-cell-score" style="width:60px" onclick="xlPredSelectCell(\'E' + rowNum + '\',\'=IF(locked,&quot;—&quot;,away_pred)\')">' +
            '<input class="xl-score-input" type="number" id="pa-' + mid + '" min="0" max="20" value="0" onfocus="this.select()" onchange="submitPrediction(' + mid + ')" onkeydown="if(event.key===\'Enter\'||event.key===\'Tab\'){event.preventDefault();submitPrediction(' + mid + ')}">' +
            '</div>';
        }

        // Joker cell
        var jokerCell;
        if (!jokersEnabled || isLocked) {
          jokerCell = '<div class="xl-cell xl-num xl-cell-locked" style="width:55px" onclick="xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,&quot;&quot;)\')">—</div>';
        } else if (ep && ep.is_joker) {
          jokerCell = '<div class="xl-cell xl-num xl-cell-joker-on" style="width:55px" onclick="toggleJoker(' + mid + ');xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,&quot;&quot;)\')">&#127183; 2&#215;</div>';
        } else if (dayHasJoker) {
          jokerCell = '<div class="xl-cell xl-num xl-cell-joker-unavail" style="width:55px" onclick="xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,&quot;&quot;)\')">·</div>';
        } else {
          jokerCell = '<div class="xl-cell xl-num xl-cell-joker-off" style="width:55px" onclick="toggleJoker(' + mid + ');xlPredSelectCell(\'F' + rowNum + '\',\'=IF(joker_used,2,&quot;&quot;)\')">&#127183;</div>';
        }

        // Status cell
        var statusCell;
        if (isLocked && ep) {
          statusCell = '<div class="xl-cell xl-status-locked" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">&#128274; Saved</div>';
        } else if (isLocked) {
          statusCell = '<div class="xl-cell xl-status-locked" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">&#128274; Locked</div>';
        } else if (ep) {
          statusCell = '<div class="xl-cell xl-status-saved" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">&#10003; <span style="color:#888;font-size:10px">' + lockStr + '</span></div>';
        } else {
          statusCell = '<div class="xl-cell xl-status-empty" style="width:80px" onclick="xlPredSelectCell(\'G' + rowNum + '\',\'=VLOOKUP(match_id,preds,3,0)\')">' + lockStr + '</div>';
        }

        // Match cell content
        var matchCell = '<div class="xl-cell" style="flex:1;min-width:150px" onclick="xlPredSelectCell(\'B' + rowNum + '\',\'=&quot;' + m.team1.replace(/'/g, "\\'") + ' vs ' + m.team2.replace(/'/g, "\\'") + '&quot;\')">' +
          escapeHtml(m.team1) + ' <span style="color:#888">vs</span> ' + escapeHtml(m.team2) +
          ' <span class="badge-mono" style="font-size:9px;color:#888">G' + m.group + '</span>' +
          '</div>';

        html += '<div class="xl-row ' + rowCls + '">' +
          '<div class="xl-row-num">' + rowNum + '</div>' +
          '<div class="xl-cell" style="width:90px" onclick="xlPredSelectCell(\'A' + rowNum + '\',\'=&quot;' + formatLocalTime(m.date, m.time, m.tz) + '&quot;\')">' + formatLocalTime(m.date, m.time, m.tz) + '</div>' +
          matchCell +
          homeCellContent +
          '<div class="xl-cell xl-num" style="width:30px;color:#888">&#8211;</div>' +
          awayCellContent +
          jokerCell +
          statusCell +
          '</div>';
        rowNum++;
      }
    }
    el.innerHTML = html;
  }

  // ── HISTORY SHEET ──
  else if (xlPredSheet === 'history') {
    var { data: history } = await sb.from('predictions').select('match_id,predicted_home_score,predicted_away_score' + (jokersEnabled ? ',is_joker' : '')).eq('user_id', currentSession.user.id).order('created_at', { ascending: false }).limit(50);

    var completedPreds = [];
    if (history) {
      for (var hi = 0; hi < history.length; hi++) {
        var p = history[hi];
        var am = allMatches.find(function(am) { return am.id === p.match_id; });
        if (!am) continue;
        var m = matchData.find(function(md) { return md.team1 === am.home_team_id.name && md.team2 === am.away_team_id.name && md.date === am.match_date; });
        if (!m || !m.isComplete) continue;
        completedPreds.push({ p: p, m: m });
      }
    }

    var statusLeft2 = document.getElementById('xl-pred-status-left');
    if (statusLeft2) statusLeft2.textContent = completedPreds.length + ' records';
    var statusRight2 = document.getElementById('xl-pred-status-right');
    if (statusRight2) {
      var exact = completedPreds.filter(function(cp) { return calcPredPoints(cp.p.predicted_home_score, cp.p.predicted_away_score, cp.m.score1, cp.m.score2) === 5; }).length;
      var scored = completedPreds.filter(function(cp) { var pts = calcPredPoints(cp.p.predicted_home_score, cp.p.predicted_away_score, cp.m.score1, cp.m.score2); return pts >= 1 && pts < 5; }).length;
      statusRight2.innerHTML = 'Perfect 5&#9733;: ' + exact + '  |  Scored: ' + scored;
    }

    if (completedPreds.length === 0) {
      el.innerHTML = '<div class="xl-pred-signin">No completed predictions yet.</div>';
      return;
    }

    var histHtml = '';
    // Header row
    histHtml += '<div class="xl-row xl-row-pred-header">' +
      '<div class="xl-row-num">1</div>' +
      '<div class="xl-cell" style="width:90px">Date</div>' +
      '<div class="xl-cell" style="flex:1;min-width:150px">Match</div>' +
      '<div class="xl-cell xl-num" style="width:60px">Result</div>' +
      '<div class="xl-cell xl-num" style="width:30px"></div>' +
      '<div class="xl-cell xl-num" style="width:60px">Your Pick</div>' +
      '<div class="xl-cell xl-num" style="width:55px">Joker</div>' +
      '<div class="xl-cell xl-num" style="width:80px">Score</div>' +
      '</div>';

    for (var ci = 0; ci < completedPreds.length; ci++) {
      var cp = completedPreds[ci];
      var p = cp.p, m = cp.m;
      var pts = calcPredPoints(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2);
      if (p.is_joker) pts *= 2;
      // Recompute without joker for display
      var basePts = calcPredPoints(p.predicted_home_score, p.predicted_away_score, m.score1, m.score2);
      var scoreCls = basePts === 5 ? 'xl-badge-exact' : (pts >= 1 ? 'xl-badge-scored' : 'xl-badge-zero');
      var scoreStr;
      if (basePts === 5) scoreStr = '&#9733;&#9733;&#9733;&#9733;&#9733;' + (p.is_joker ? ' (10)' : '');
      else if (basePts === 3) scoreStr = '&#9733;&#9733;&#9733;' + (p.is_joker ? ' (6)' : '');
      else if (basePts === 1) scoreStr = '&#9733;' + (p.is_joker ? ' (2)' : '');
      else scoreStr = '&#10007;';

      var rowCls2 = ci % 2 === 0 ? 'xl-row-pred-even' : 'xl-row-pred-odd';
      var rn = ci + 2;
      histHtml += '<div class="xl-row ' + rowCls2 + '">' +
        '<div class="xl-row-num">' + rn + '</div>' +
        '<div class="xl-cell" style="width:90px">' + formatDateLabel(m.date, m.time, m.tz) + '</div>' +
        '<div class="xl-cell" style="flex:1;min-width:150px">' + escapeHtml(m.team1) + ' <span style="color:#888">vs</span> ' + escapeHtml(m.team2) + '</div>' +
        '<div class="xl-cell xl-num" style="width:60px;font-weight:bold">' + m.score1 + '&#8211;' + m.score2 + '</div>' +
        '<div class="xl-cell xl-num" style="width:30px;color:#888">&#8594;</div>' +
        '<div class="xl-cell xl-num" style="width:60px;color:#555">' + p.predicted_home_score + '&#8211;' + p.predicted_away_score + '</div>' +
        '<div class="xl-cell xl-num" style="width:55px">' + (p.is_joker ? '&#127183;' : '—') + '</div>' +
        '<div class="xl-cell xl-num ' + scoreCls + '" style="width:80px">' + scoreStr + '</div>' +
        '</div>';
    }
    el.innerHTML = histHtml;
  }
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
