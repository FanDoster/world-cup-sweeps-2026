let matchFilter = 'upcoming';
let teamScheduleFilter = 'upcoming';
let matchTeamFilter = 'all';
let matchRound = 'R32';

function safeAttr(s) { return (s||'').replace(/'/g, "\\\\'").replace(/\\|/g, ''); }

function setMatchFilter(filter, tab) {
  if (tab === 'matches') {
    matchFilter = filter;
    document.querySelectorAll('#matchFilterBar .filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === filter);
    });
    renderMatches();
  } else if (tab === 'teams') {
    teamScheduleFilter = filter;
    document.querySelectorAll('#teamFilterBar .filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === filter);
    });
    renderTeamSchedule();
  }
}

function setMatchTeamFilter(filter) {
  matchTeamFilter = filter;
  document.querySelectorAll('#matchTeamFilterBar .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  renderMatches();
}

function setMatchRound(round) {
  matchRound = round;
  renderMatches();
}

function renderMatches() {
  const now = new Date();
  const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  let all = matchData
    .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
    .sort((a, b) => a.kickoff - b.kickoff)
    .filter(m => m.team1 !== null && m.team2 !== null);

  if (matchTeamFilter === 'mine' && currentProfile) {
    const playerTeams = people[currentProfile.player_name] || [];
    const teamNames = playerTeams.map(t => t.team);
    all = all.filter(m => teamNames.includes(m.team1) || teamNames.includes(m.team2));
  }

  // Split: knockout matches (have round) vs group stage
  const knockout = all.filter(m => m.round);
  const groupStage = all.filter(m => !m.round);

  // Knockout split
  const koUpcoming = knockout.filter(m => !m.isComplete);
  const koComplete = knockout.filter(m => m.isComplete);
  let koVisible;
  if (matchFilter === 'completed') koVisible = koComplete;
  else if (matchFilter === 'all') koVisible = knockout;
  else koVisible = koUpcoming;

  // Group stage split (all complete now, but keep filter logic)
  const gsUpcoming = groupStage.filter(m => !m.isComplete);
  const gsComplete = groupStage.filter(m => m.isComplete);
  let gsVisible;
  if (matchFilter === 'completed') gsVisible = gsComplete;
  else if (matchFilter === 'all') gsVisible = groupStage;
  else gsVisible = gsUpcoming;

  const el = document.getElementById('matches');
  if (koVisible.length === 0 && gsVisible.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:48px 20px;text-align:center;font-size:0.95rem">No matches to show.</p>';
    return;
  }

  // ── Render knockout matches in bracket card format ──
  let html = '';

  if (koVisible.length > 0) {
    const rounds = ['R32', 'R16', 'QF', 'SF', 'Final'];
    const allKoRounds = [...new Set(koVisible.map(m => m.round).filter(Boolean))].sort();
    const koByRound = {};
    for (const m of koVisible) {
      if (!koByRound[m.round]) koByRound[m.round] = [];
      koByRound[m.round].push(m);
    }

    // If viewing a single round
    const targetRound = (allKoRounds.includes(matchRound) ? matchRound : allKoRounds[0]) || 'R32';
    const roundMatches = (koByRound[targetRound] || []).sort((a, b) => a.kickoff - b.kickoff);

    // Round selector
    html += `<div class="bracket-round-selector" style="padding:8px 0 14px">`;
    for (const r of rounds) {
      if (!koByRound[r] || koByRound[r].length === 0) continue;
      html += `<button class="bracket-round-btn${r === targetRound ? ' active' : ''}" onclick="setMatchRound('${r}')">${roundLabel(r)}</button>`;
    }
    html += `</div>`;

    // Match cards
    html += `<div class="bracket-cards">`;
    for (const m of roundMatches) {
      const o1 = teamOwner[m.team1];
      const o2 = teamOwner[m.team2];
      const i1 = teamIso[m.team1];
      const i2 = teamIso[m.team2];
      const localTime = formatLocalTime(m.date, m.time, m.tz);
      const dateStr = new Date(m.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const inLiveWindow = m.kickoff <= now && (m.kickoff.getTime() + 2.5*60*60*1000) > now.getTime();
      const isLive = inLiveWindow && !m.isComplete;
      const isFinished = m.isComplete && !inLiveWindow;
      const cardCls = isFinished ? ' bc-complete' : (isLive ? ' bc-live' : '');

      // Winner highlight
      let homeWinner = false, awayWinner = false;
      let homeLoser = false, awayLoser = false;
      if (isFinished && m.score1 !== null && m.score2 !== null) {
        if (m.score1 > m.score2) { homeWinner = true; awayLoser = true; }
        else if (m.score2 > m.score1) { awayWinner = true; homeLoser = true; }
        else if (m.actualWinner) {
          if (m.actualWinner === m.team1) { homeWinner = true; awayLoser = true; }
          else if (m.actualWinner === m.team2) { awayWinner = true; homeLoser = true; }
        }
      }

      // Badge
      let badgeHtml = '';
      if (isFinished) badgeHtml = '<span class="bracket-completed-badge">Played</span>';
      else if (isLive) badgeHtml = '<span class="bracket-live-badge">LIVE</span>';
      else badgeHtml = '<span class="bracket-projected-badge">Upcoming</span>';

      // Score
      let scoreHtml = '';
      if (isFinished) {
        scoreHtml = `<span class="match-score-pill">${m.score1}–${m.score2}</span><span class="bracket-fixture-status">FT</span>`;
      } else if (isLive) {
        scoreHtml = `<span class="match-score-pill live-score">${m.score1 ?? 0}–${m.score2 ?? 0}</span><span class="bracket-fixture-status live">LIVE</span>`;
      } else {
        scoreHtml = `<span class="bracket-fixture-time">${localTime}</span>`;
      }

      // Prediction consensus
      const key = `${m.team1}|${m.team2}|${m.date}`;
      const mid = matchIdByTeamDate[key];
      let consensusHtml = '';
      if (mid) {
        const preds = predLookup[mid] || [];
        const predByPlayer = {};
        preds.forEach(p => { predByPlayer[p.player_name] = p; });
        const locked = m.kickoff - now < 5 * 60 * 1000;
        const showScores = locked || isFinished;
        let dots = '';
        for (const p of PLAYERS) {
          const pred = predByPlayer[p];
          if (pred && showScores) {
            const icon = isFinished ? predResultBadge(pred.home, pred.away, m.score1, m.score2, pred.j, m.round ? pred.winner : null, m.round ? getActualKnockoutWinner(m) : null) : '';
            dots += `<span class="bc-dot has-pred" title="${p}: ${pred.home}–${pred.away}">${p[0]}${icon}</span>`;
          } else if (pred) {
            dots += `<span class="bc-dot has-pred" title="${p} predicted">${p[0]}✓</span>`;
          } else if (locked) {
            dots += `<span class="bc-dot no-pred" title="${p} didn't predict">${p[0]}✗</span>`;
          } else {
            dots += `<span class="bc-dot no-pred" title="${p} not yet">${p[0]}</span>`;
          }
        }
        if (dots) consensusHtml = `<div class="bracket-consensus">${dots}</div>`;
      }

      html += `
        <div class="bracket-match-card card-base${cardCls}">
          <div class="bracket-card-header">
            <span class="bracket-card-match">${roundLabel(m.round)} · ${dateStr}</span>
            <span class="bracket-card-badges">
              ${m.channel ? `<a href="${m.channel.startsWith('BBC') ? 'https://www.bbc.co.uk/iplayer' : 'https://www.itv.com/watch'}" target="_blank" rel="noopener" class="match-channel ${m.channel.startsWith('BBC') ? 'channel-bbc' : 'channel-itv'}">${m.channel}</a>` : ''}
              ${badgeHtml}
            </span>
          </div>
          <div class="bracket-fixture" onclick="showPredPanel('${safeAttr(m.team1)}|${safeAttr(m.team2)}|${m.date}')" style="cursor:pointer">
            <div class="bf-team${homeWinner ? ' bf-winner' : (homeLoser ? ' bf-eliminated' : '')}">
              <img class="bracket-flag" src="${flagUrl(i1)}" alt="" loading="lazy" onerror="this.style.display='none'">
              <span class="bf-name">${m.team1}</span>
              ${o1 ? `<span class="match-owner ${ownerColors[o1]}">${o1}</span>` : ''}
            </div>
            <div class="bf-centre">${scoreHtml}</div>
            <div class="bf-team${awayWinner ? ' bf-winner' : (awayLoser ? ' bf-eliminated' : '')}">
              <img class="bracket-flag" src="${flagUrl(i2)}" alt="" loading="lazy" onerror="this.style.display='none'">
              <span class="bf-name">${m.team2}</span>
              ${o2 ? `<span class="match-owner ${ownerColors[o2]}">${o2}</span>` : ''}
            </div>
          </div>
          ${consensusHtml}
        </div>`;
    }
    html += `</div>`;
  }

  // ── Render group stage matches in existing format ──
  if (gsVisible.length > 0) {
    if (koVisible.length > 0) {
      html += `<div class="match-date-header" style="margin-top:20px;opacity:0.6;font-size:0.7rem;letter-spacing:0.06em">Group Stage</div>`;
    }

    const byDate = {};
    for (const m of gsVisible) {
      if (!byDate[m.date]) byDate[m.date] = [];
      byDate[m.date].push(m);
    }

    for (const [date, dayMatches] of Object.entries(byDate)) {
      html += `<div class="match-date-header">${formatDateHeader(date, dayMatches[0].time, dayMatches[0].tz)}</div>`;
      for (const m of dayMatches) {
        const cd = getCountdown(m.date, m.time, m.tz);
        const o1 = teamOwner[m.team1];
        const o2 = teamOwner[m.team2];
        const i1 = teamIso[m.team1];
        const i2 = teamIso[m.team2];
        const dateLabel = formatDateLabel(m.date, m.time, m.tz);
        const showCountdown = m.kickoff <= twoDays;
        const localTime = formatLocalTime(m.date, m.time, m.tz);
        const inLiveWindow = cd.rowCls === 'live';
        const isLive = inLiveWindow;
        const isFinished = m.isComplete && !inLiveWindow;
        const hasKickedOff = m.kickoff <= now;
        const rowCls = isFinished ? 'finished' : cd.rowCls;
        const countdownText = isFinished ? (m.score1 + '–' + m.score2) : (showCountdown ? cd.text : localTime);
        const countdownCls = isFinished ? '' : cd.cls;

        html += `
          <div class="match-row ${rowCls}" onclick="showPredPanel('${safeAttr(m.team1)}|${safeAttr(m.team2)}|${m.date}')" style="cursor:pointer">
            <div class="flag-bg flag-bg-home" style="background-image:url('${flagUrl(i1)}')"></div>
            <div class="flag-bg flag-bg-away" style="background-image:url('${flagUrl(i2)}')"></div>
            <div class="match-countdown ${countdownCls}">${countdownText}</div>
            <div class="match-body">
              <div class="match-date"><span class="time-label">${localTime}</span></div>
              <div class="match-teams">
                <div class="match-team-row">
                  <div class="match-team-home">
                    <img class="match-flag" src="${flagUrl(i1)}" alt="" loading="lazy" onerror="this.style.display='none'">
                    <div class="team-info">
                      <span class="team-name-label">${m.team1}</span>
                      ${o1 ? `<span class="match-owner ${ownerColors[o1]}">${o1}</span>` : ''}
                    </div>
                  </div>
                  <div class="match-centre">
                    ${isFinished ? `<span class="match-score-pill">${m.score1}–${m.score2}</span>` : isLive ? `<span class="match-score-pill live-score">${m.score1 ?? 0}–${m.score2 ?? 0}</span>` : (hasKickedOff && m.score1 !== null) ? `<span class="match-score-pill">${m.score1}–${m.score2}</span>` : '<span class="match-vs">vs</span>'}
                  </div>
                  <div class="match-team-away">
                    <img class="match-flag" src="${flagUrl(i2)}" alt="" loading="lazy" onerror="this.style.display='none'">
                    <div class="team-info">
                      <span class="team-name-label">${m.team2}</span>
                      ${o2 ? `<span class="match-owner ${ownerColors[o2]}">${o2}</span>` : ''}
                    </div>
                  </div>
                </div>
                <div class="match-meta-row">
                  <span class="match-group-badge badge-mono">${m.round ? roundLabel(m.round) : 'G' + m.group}</span>
                  ${m.channel ? `<a href="${m.channel.startsWith('BBC') ? 'https://www.bbc.co.uk/iplayer' : 'https://www.itv.com/watch'}" target="_blank" rel="noopener" class="match-channel ${m.channel.startsWith('BBC') ? 'channel-bbc' : 'channel-itv'}">${m.channel}</a>` : ''}
                </div>
              </div>
            </div>
          </div>`;
      }
    }
  }

  el.innerHTML = html;
}
