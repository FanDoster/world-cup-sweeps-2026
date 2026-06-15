function getAllTeams() {
  const teams = new Map();
  for (const m of matchData) {
    for (const t of [m.team1, m.team2]) {
      if (!teams.has(t)) teams.set(t, teamIso[t] || 'xx');
    }
  }
  return [...teams.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

let selectedTeam = null;

function renderTeamChips() {
  const el = document.getElementById('teamChips');
  const all = getAllTeams();
  el.innerHTML = all.map(([team, iso]) => {
    const owner = teamOwner[team];
    const active = team === selectedTeam ? ' active' : '';
    return `<button class="team-chip${active}" data-team="${team}">
      <img class="chip-flag" src="${flagUrl(iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
      <span>${team}</span>
      ${owner ? `<span class="match-owner ${ownerColors[owner]}" style="margin-left:2px">${owner}</span>` : ''}
    </button>`;
  }).join('');

  el.querySelectorAll('.team-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const t = chip.dataset.team;
      selectedTeam = (selectedTeam === t) ? null : t;
      renderTeamChips();
      renderTeamSchedule();
    });
  });
}

function renderTeamSchedule() {
  const el = document.getElementById('teamSchedule');
  if (!selectedTeam) {
    el.innerHTML = '<div class="team-schedule-empty">Select a team to see their schedule</div>';
    return;
  }

  const teamMatches = matchData
    .filter(m => m.team1 === selectedTeam || m.team2 === selectedTeam)
    .map(m => ({ ...m, kickoff: toDate(m.date, m.time, m.tz) }))
    .sort((a, b) => a.kickoff - b.kickoff);

  let filtered = teamMatches;
  if (teamScheduleFilter === 'upcoming') filtered = teamMatches.filter(m => m.score1 === null);
  else if (teamScheduleFilter === 'completed') filtered = teamMatches.filter(m => m.score1 !== null);

  const now = new Date();
  const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const byDate = {};
  for (const m of filtered) {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  }

  let html = '';
  for (const [date, matches] of Object.entries(byDate)) {
    html += `<div class="match-date-header">${formatDateHeader(date, matches[0].time, matches[0].tz)}</div>`;
    for (const m of matches) {
      const cd = getCountdown(m.date, m.time, m.tz);
      const i1 = teamIso[m.team1];
      const i2 = teamIso[m.team2];
      const isFinished = m.score1 !== null && m.score2 !== null;
      const rowCls = isFinished ? 'finished' : cd.rowCls;
      const countdownText = isFinished ? (m.score1 + '–' + m.score2) : (m.kickoff <= twoDays ? cd.text : formatLocalTime(m.date, m.time, m.tz));
      const countdownCls = isFinished ? '' : cd.cls;
      const opponent = m.team1 === selectedTeam ? m.team2 : m.team1;
      const oppOwner = teamOwner[opponent];
      const oppIso = teamIso[opponent];
      const probTotal = m.prob1 + m.probD + m.prob2;
      const hasProbs = probTotal > 0 && !isFinished;

      html += `
        <div class="match-row ${rowCls}" onclick="showPredPanel('${m.team1}|${m.team2}|${m.date}')" style="cursor:pointer">
          <div class="flag-bg flag-bg-home" style="background-image:url('${flagUrl(i1)}')"></div>
          <div class="flag-bg flag-bg-away" style="background-image:url('${flagUrl(i2)}')"></div>
          <div class="match-countdown ${countdownCls}">
            ${countdownText}
          </div>
          <div class="match-body">
            <div class="match-date">
              <div class="date-label">${formatDateLabel(m.date, m.time, m.tz)}</div>
              <div>${formatLocalTime(m.date, m.time, m.tz)}</div>
            </div>
            <div class="match-teams">
              <div class="match-team-top">
                <div class="team-col"><span style="color:var(--text-secondary);font-size:0.75rem">vs</span></div>
                <div class="team-col"><span class="team-name-label">${opponent}</span></div>
              </div>
              <div class="match-team-line">
                <div class="team-col"></div>
                <div class="team-col"></div>
                <div class="team-col">
                  <span style="display:flex;align-items:center;gap:5px">
                    <img class="match-flag" src="${flagUrl(oppIso)}" alt="" loading="lazy" onerror="this.style.display='none'">
                    ${oppOwner ? `<span class="match-owner ${ownerColors[oppOwner]}">${oppOwner}</span>` : ''}
                  </span>
                </div>
              </div>
            </div>
            <span class="match-group-badge">G${m.group}</span>${m.channel ? `<a href="${m.channel.startsWith('BBC') ? 'https://www.bbc.co.uk/iplayer' : 'https://www.itv.com/watch'}" target="_blank" rel="noopener" class="match-channel ${m.channel.startsWith('BBC') ? 'channel-bbc' : 'channel-itv'}">${m.channel}</a>` : ''}
          </div>
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

function selectTeam(teamName) {
  selectedTeam = teamName;
  switchTab('teams');
  renderTeamChips();
  renderTeamSchedule();
}
