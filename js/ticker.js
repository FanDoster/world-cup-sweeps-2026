// ── MATCH TICKER (Dispatch-integrated) ──
// Returns HTML for a scrolling ticker strip styled to match the war dispatch.
// Called from renderWarDispatch(), not standalone.

function renderTicker() {
  if (!matchData || matchData.length === 0) return '';

  const now = new Date();
  const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const roundLabels = {
    'R32': 'R32', 'R16': 'R16', 'QF': 'QF', 'SF': 'SF',
    '3P': '3rd', 'Final': 'Final'
  };

  const items = [];

  for (const m of matchData) {
    if (!m.date || !m.time) continue;
    if (!m.team1 || !m.team2) continue;

    const kickoff = toDate(m.date, m.time, m.tz || 0);
    const endWindow = new Date(kickoff.getTime() + 3 * 60 * 60 * 1000);

    if (endWindow < now) continue;
    if (kickoff > next24) continue;

    const isLive = now >= kickoff && now < endWindow;
    const isFT = endWindow < now;

    const homeIso = teamIso[m.team1] || '';
    const awayIso = teamIso[m.team2] || '';
    const hasScore = m.score1 !== null && m.score2 !== null;

    let rlbl = '';
    if (m.round) {
      rlbl = roundLabels[m.round] || m.round;
    } else if (m.group) {
      rlbl = 'G' + m.group;
    }

    let statusTag = '';
    let itemClass = 'dt-item';
    if (isLive) {
      statusTag = '<span class="dt-live">● LIVE</span>';
      itemClass += ' dt-live-item';
    } else if (isFT) {
      itemClass += ' dt-ft-item';
    }

    let timeDisplay;
    if (isLive) {
      timeDisplay = '';
    } else if (isFT) {
      timeDisplay = '<span class="dt-time">FT</span>';
    } else {
      const hh = String(kickoff.getHours()).padStart(2, '0');
      const mm = String(kickoff.getMinutes()).padStart(2, '0');
      timeDisplay = '<span class="dt-time">' + hh + ':' + mm + '</span>';
    }

    let scoreDisplay;
    if (hasScore) {
      const s1 = m.score1 !== null ? m.score1 : '?';
      const s2 = m.score2 !== null ? m.score2 : '?';
      scoreDisplay = '<span class="dt-score">' + s1 + '-' + s2 + '</span>';
    } else {
      scoreDisplay = '<span class="dt-vs">vs</span>';
    }

    const flag = function(iso) {
      return iso ? '<img src="https://flagcdn.com/' + iso.toLowerCase() + '.svg" alt="">' : '';
    };

    const html = '<span class="' + itemClass + ' dt-clickable" onclick="showPredPanel(\'' + safeAttr(m.team1) + '|' + safeAttr(m.team2) + '|' + m.date + '\')">'
      + timeDisplay
      + statusTag
      + '<span class="dt-flags">' + flag(homeIso) + '</span>'
      + '<span class="dt-team">' + escapeHtml(m.team1).toUpperCase() + '</span>'
      + scoreDisplay
      + '<span class="dt-team">' + escapeHtml(m.team2).toUpperCase() + '</span>'
      + '<span class="dt-flags">' + flag(awayIso) + '</span>'
      + (rlbl ? '<span class="dt-round">' + rlbl + '</span>' : '')
      + '</span>';

    items.push(html);
  }

  if (items.length === 0) return '';

  // Duplicate for seamless scroll loop
  const track = items.join('') + items.join('');
  return '<div class="dt-strip">'
    + '<span class="dt-label">UPCOMING</span>'
    + '<div class="dt-track-wrap"><div class="dt-track">' + track + '</div></div>'
    + '</div>';
}
