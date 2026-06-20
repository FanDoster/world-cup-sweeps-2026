let matchFilter = 'upcoming';
let teamScheduleFilter = 'upcoming';
let matchTeamFilter = 'all';

function safeAttr(s) { return (s||'').replace(/'/g, "\\'").replace(/\|/g, ''); }

function setMatchFilter(filter, tab) {
  if (tab === 'matches') {
    matchFilter = filter;
    // Update button states
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

function renderMatches() {
  const now = new Date();
  const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  let all = matchData
    .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
    .sort((a, b) => a.kickoff - b.kickoff);

  // Filter by team ownership if 'My Teams' is selected
  if (matchTeamFilter === 'mine' && currentProfile) {
    const playerTeams = people[currentProfile.player_name] || [];
    const teamNames = playerTeams.map(t => t.team);
    all = all.filter(m => teamNames.includes(m.team1) || teamNames.includes(m.team2));
  }

  // Split into upcoming vs completed
  const upcomingOnly = all.filter(m => !m.isComplete);
  const completed = all.filter(m => m.isComplete);
  let visible;
  if (matchFilter === 'all') visible = all;
  else if (matchFilter === 'completed') visible = completed;
  else visible = upcomingOnly.slice(0, 36);

  const el = document.getElementById('matches');
  if (visible.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:48px 20px;text-align:center;font-size:0.95rem">All matches completed. Bring on the knockouts!</p>';
    return;
  }

  // Group by date
  const byDate = {};
  for (const m of visible) {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  }

  let html = '';
  for (const [date, matches] of Object.entries(byDate)) {
    html += `<div class="match-date-header">${formatDateHeader(date, matches[0].time, matches[0].tz)}</div>`;
    for (const m of matches) {
      const cd = getCountdown(m.date, m.time, m.tz);
      const o1 = teamOwner[m.team1];
      const o2 = teamOwner[m.team2];
      const i1 = teamIso[m.team1];
      const i2 = teamIso[m.team2];
      const dateLabel = formatDateLabel(m.date, m.time, m.tz);
      const showCountdown = m.kickoff <= twoDays;
      const localTime = formatLocalTime(m.date, m.time, m.tz);
      const isFinished = m.isComplete;
      const isLive = !isFinished && cd.rowCls === 'live';
      const hasKickedOff = m.kickoff <= now;
      const rowCls = isFinished ? 'finished' : cd.rowCls;
      const countdownText = isFinished ? (m.score1 + '–' + m.score2) : (showCountdown ? cd.text : localTime);
      const countdownCls = isFinished ? '' : cd.cls;
      const probTotal = m.prob1 + m.probD + m.prob2;
      const hasProbs = probTotal > 0 && !isFinished;

      html += `
        <div class="match-row ${rowCls}" onclick="showPredPanel('${safeAttr(m.team1)}|${safeAttr(m.team2)}|${m.date}')" style="cursor:pointer">
          <div class="flag-bg flag-bg-home" style="background-image:url('${flagUrl(i1)}')"></div>
          <div class="flag-bg flag-bg-away" style="background-image:url('${flagUrl(i2)}')"></div>
          <div class="match-countdown ${countdownCls}">
            ${countdownText}
          </div>
          <div class="match-body">
            <div class="match-date">
              <span class="time-label">${localTime}</span>
            </div>
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
                <span class="match-group-badge badge-mono">G${m.group}</span>
                ${m.channel ? `<a href="${m.channel.startsWith('BBC') ? 'https://www.bbc.co.uk/iplayer' : 'https://www.itv.com/watch'}" target="_blank" rel="noopener" class="match-channel ${m.channel.startsWith('BBC') ? 'channel-bbc' : 'channel-itv'}">${m.channel}</a>` : ''}
              </div>
            </div>
          </div>
          <div class="match-meta-mobile" style="display:none">
            <span>${dateLabel} ${localTime}</span>
            <span class="match-group-badge badge-mono" style="margin:0">G${m.group}</span>
            ${m.channel ? `<a href="${m.channel.startsWith('BBC') ? 'https://www.bbc.co.uk/iplayer' : 'https://www.itv.com/watch'}" target="_blank" rel="noopener" class="match-channel ${m.channel.startsWith('BBC') ? 'channel-bbc' : 'channel-itv'}">${m.channel}</a>` : ''}
          </div>
          ${hasProbs ? `<div class="match-prob-bar"><span class="prob-seg prob-h" style="width:${m.prob1}%" title="${m.team1} win ${m.prob1}%">${m.prob1}%</span><span class="prob-seg prob-d" style="width:${m.probD}%" title="Draw ${m.probD}%">${m.probD}%</span><span class="prob-seg prob-a" style="width:${m.prob2}%" title="${m.team2} win ${m.prob2}%">${m.prob2}%</span></div>` : ''}
          ${(() => {
            const key = `${m.team1}|${m.team2}|${m.date}`;
            const mid = matchIdByTeamDate[key];
            if (!mid) return '';
            const preds = predLookup[mid] || [];
            const predByPlayer = {};
            preds.forEach(p => { predByPlayer[p.player_name] = p; });
            const locked = m.kickoff - now < 5 * 60 * 1000;
            const showScores = locked || isFinished;
            let dots = '';
            for (const p of PLAYERS) {
              const pred = predByPlayer[p];
              if (pred && showScores) {
                let icon = '';
                if (isFinished) {
                  icon = predResultBadge(pred.home, pred.away, m.score1, m.score2, pred.j);
                }
                dots += `<span class="pred-dot has-pred" title="${p}: ${pred.home}–${pred.away}">${p[0]}${icon}</span>`;
              } else if (pred) {
                dots += `<span class="pred-dot has-pred" title="${p} predicted">${p[0]}✓</span>`;
              } else {
                dots += `<span class="pred-dot no-pred" title="${p} hasn't predicted">${p[0]}✗</span>`;
              }
            }
            return `<div class="match-pred-dots">${dots}</div>`;
          })()}
        </div>
      `;
    }
  }

  el.innerHTML = html;
}
