let matchFilter = 'upcoming';
let teamScheduleFilter = 'upcoming';
let matchTeamFilter = 'all';
var oeSelectedKey = null;

function oeSetFolder(folder) {
  // Determine which matchFilter and matchTeamFilter to apply
  if (folder === 'mine') {
    matchTeamFilter = 'mine';
  } else {
    matchTeamFilter = 'all';
    if (folder === 'upcoming' || folder === 'completed' || folder === 'all') {
      matchFilter = folder;
    }
  }
  // Update folder active state
  ['upcoming', 'completed', 'all', 'mine'].forEach(function(f) {
    var el = document.getElementById('oe-folder-' + f);
    if (el) el.classList.toggle('oe-folder-active', f === folder);
  });
  renderMatches();
}

function safeAttr(s) { return (s||'').replace(/'/g, "\\'").replace(/\|/g, ''); }

function setMatchFilter(filter, tab) {
  if (tab === 'matches') {
    matchFilter = filter;
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
  renderMatches();
}

function renderMatches() {
  var el = document.getElementById('oe-message-list');
  if (!el) return;
  var now = new Date();

  var all = matchData
    .map(function(m) { return Object.assign({}, m, { kickoff: toDate(m.date, m.time, m.tz) }); })
    .sort(function(a, b) { return a.kickoff - b.kickoff; });

  if (matchTeamFilter === 'mine' && currentProfile) {
    var playerTeams = people[currentProfile.player_name] || [];
    var teamNames = playerTeams.map(function(t) { return t.team; });
    all = all.filter(function(m) { return teamNames.includes(m.team1) || teamNames.includes(m.team2); });
  }

  var upcomingOnly = all.filter(function(m) { return !m.isComplete; });
  var completed = all.filter(function(m) { return m.isComplete; });
  var visible;
  if (matchFilter === 'all') visible = all;
  else if (matchFilter === 'completed') visible = completed;
  else visible = upcomingOnly.slice(0, 36);

  // Update unread badge (upcoming count)
  var unreadEl = document.getElementById('oe-unread-count');
  if (unreadEl) unreadEl.textContent = upcomingOnly.length || '';

  // Update status bar
  var statusLeft = document.getElementById('oe-status-left');
  if (statusLeft) statusLeft.textContent = visible.length + ' message' + (visible.length !== 1 ? 's' : '');
  var statusRight = document.getElementById('oe-status-right');
  if (statusRight) {
    var label = matchFilter === 'upcoming' ? 'Inbox' : matchFilter === 'completed' ? 'Sent Items' : 'All Matches';
    if (matchTeamFilter === 'mine') label = 'My Teams';
    statusRight.textContent = label;
  }

  if (visible.length === 0) {
    el.innerHTML = '<div style="padding:20px;color:#666;font-style:italic;font-size:11px">No messages.</div>';
    return;
  }

  var byDate = {};
  var byDateOrder = [];
  for (var i = 0; i < visible.length; i++) {
    var m = visible[i];
    if (!byDate[m.date]) { byDate[m.date] = []; byDateOrder.push(m.date); }
    byDate[m.date].push(m);
  }

  var html = '';
  for (var di = 0; di < byDateOrder.length; di++) {
    var date = byDateOrder[di];
    var dayMatches = byDate[date];
    html += '<div class="oe-date-sep">' + formatDateHeader(date, dayMatches[0].time, dayMatches[0].tz) + '</div>';

    for (var mi = 0; mi < dayMatches.length; mi++) {
      var m = dayMatches[mi];
      var key = m.team1 + '|' + m.team2 + '|' + m.date;
      var cd = getCountdown(m.date, m.time, m.tz);
      var inLiveWindow = cd.rowCls === 'live';
      var isFinished = m.isComplete && !inLiveWindow;
      var localTime = formatLocalTime(m.date, m.time, m.tz);
      var i1 = teamIso[m.team1];
      var i2 = teamIso[m.team2];

      // Pred dot: does current user have a prediction?
      var mid = matchIdByTeamDate[key];
      var hasPred = false;
      if (mid && predLookup[mid]) {
        var preds = predLookup[mid];
        if (currentProfile) {
          hasPred = preds.some(function(p) { return p.player_name === currentProfile.player_name; });
        }
      }

      var isUnread = !m.isComplete && !hasPred;
      var isSelected = key === oeSelectedKey;

      // Subject: score if finished, live score if live, otherwise kick-off time
      var subject;
      if (isFinished) subject = m.score1 + '&#8211;' + m.score2 + ' FT';
      else if (inLiveWindow && m.score1 !== null) subject = '&#128308; LIVE ' + m.score1 + '&#8211;' + (m.score2 || 0);
      else subject = 'Kick-off ' + localTime;

      var fromText = m.team1 + ' v ' + m.team2;

      html += '<div class="oe-msg-row' +
        (isSelected ? ' oe-msg-selected' : '') +
        (isUnread ? ' oe-msg-unread' : '') +
        '" onclick="oeSelectMessage(\'' + safeAttr(m.team1) + '|' + safeAttr(m.team2) + '|' + m.date + '\')">' +
        '<div class="oe-msg-cell" style="width:20px">' + (hasPred ? '&#8226;' : '') + '</div>' +
        '<div class="oe-msg-cell" style="width:20px"><img src="' + flagUrl(i1) + '" style="width:16px;height:11px;object-fit:cover" alt=""></div>' +
        '<div class="oe-msg-cell oe-msg-from" style="width:200px">' + escapeHtml(fromText) + '</div>' +
        '<div class="oe-msg-cell oe-msg-subject" style="flex:1">' + subject + '</div>' +
        '<div class="oe-msg-cell" style="width:72px">' + localTime + '</div>' +
        '</div>';
    }
  }

  el.innerHTML = html;

  // Restore selected-row highlight (no need to re-open the match window)
  if (oeSelectedKey) {
    var keyParts = oeSelectedKey.split('|');
    var escapedKey = (keyParts[0] ? safeAttr(keyParts[0]) : '') + '|' + (keyParts[1] ? safeAttr(keyParts[1]) : '') + '|' + (keyParts[2] || '');
    document.querySelectorAll('#oe-message-list .oe-msg-row').forEach(function(row) {
      row.classList.toggle('oe-msg-selected', row.getAttribute('onclick') === 'oeSelectMessage(\'' + escapedKey + '\')');
    });
  }
}

function oeSelectMessage(key) {
  // On mobile the reading pane is hidden; route to the modal instead
  if (window.innerWidth <= 700) {
    showPredPanel(key);
    return;
  }

  oeSelectedKey = key;

  // Update selected row highlight
  var keyParts = key.split('|');
  var escapedKey = (keyParts[0] ? safeAttr(keyParts[0]) : '') + '|' + (keyParts[1] ? safeAttr(keyParts[1]) : '') + '|' + (keyParts[2] || '');
  document.querySelectorAll('#oe-message-list .oe-msg-row').forEach(function(row) {
    row.classList.toggle('oe-msg-selected', row.getAttribute('onclick') === 'oeSelectMessage(\'' + escapedKey + '\')');
  });

  var titleEl  = document.getElementById('match-win-title');
  var headerEl = document.getElementById('match-win-header');
  var bodyEl   = document.getElementById('match-win-body');
  if (!bodyEl) return;

  // Find the match
  var m = null;
  for (var i = 0; i < matchData.length; i++) {
    var mk = matchData[i].team1 + '|' + matchData[i].team2 + '|' + matchData[i].date;
    if (mk === key) { m = matchData[i]; break; }
  }
  if (!m) { bodyEl.innerHTML = '<div style="padding:20px;color:#888;font-style:italic">Match not found.</div>'; openWindow('match'); return; }

  var i1 = teamIso[m.team1];
  var i2 = teamIso[m.team2];
  var o1 = teamOwner[m.team1];
  var o2 = teamOwner[m.team2];
  var localTime = formatLocalTime(m.date, m.time, m.tz);
  var dateLabel = formatDateLabel(m.date, m.time, m.tz);
  var now = new Date();
  var kickoff = toDate(m.date, m.time, m.tz);
  var cd = getCountdown(m.date, m.time, m.tz);
  var inLiveWindow = cd.rowCls === 'live';
  var isFinished = m.isComplete && !inLiveWindow;
  var isLocked = kickoff - now < 5 * 60 * 1000;

  // Score display
  var scoreHtml;
  if (isFinished) scoreHtml = '<span style="font-size:20px;font-weight:bold">' + m.score1 + ' &#8211; ' + m.score2 + '</span> <span style="font-size:11px;color:#555">FT</span>';
  else if (inLiveWindow && m.score1 !== null) scoreHtml = '<span style="font-size:20px;font-weight:bold;color:#cc0000">' + m.score1 + ' &#8211; ' + (m.score2 || 0) + '</span> <span style="font-size:11px;color:#cc0000">&#128308; LIVE</span>';
  else scoreHtml = '<span style="font-size:14px;color:#888">vs</span>';

  // Prob bar
  var probHtml = '';
  var probTotal = m.prob1 + m.probD + m.prob2;
  if (probTotal > 0 && !isFinished) {
    probHtml = '<div class="oe-reading-prob"><div class="match-prob-bar" style="margin:0">' +
      '<span class="prob-seg prob-h" style="width:' + m.prob1 + '%" title="' + m.team1 + ' ' + m.prob1 + '%">' + m.prob1 + '%</span>' +
      '<span class="prob-seg prob-d" style="width:' + m.probD + '%" title="Draw ' + m.probD + '%">' + m.probD + '%</span>' +
      '<span class="prob-seg prob-a" style="width:' + m.prob2 + '%" title="' + m.team2 + ' ' + m.prob2 + '%">' + m.prob2 + '%</span>' +
      '</div></div>';
  }

  // Prediction panel
  var mid = matchIdByTeamDate[key];
  var dotsHtml = '';
  if (mid) {
    var preds = predLookup[mid] || [];
    var predByPlayer = {};
    preds.forEach(function(p) { predByPlayer[p.player_name] = p; });
    var showScores = isLocked || isFinished;

    if (showScores) {
      // Full prediction table — show everyone's predicted score and result badge
      var rows = '';
      for (var pi = 0; pi < PLAYERS.length; pi++) {
        var p = PLAYERS[pi];
        var pred = predByPlayer[p];
        var dot = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' +
          ((typeof ownerHexColors !== 'undefined' && ownerHexColors[p]) || '#888') +
          ';margin-right:4px;vertical-align:middle"></span>';
        if (pred && pred.home !== undefined) {
          var scoreStr = pred.home + ' &#8211; ' + pred.away;
          var jokerMark = pred.j ? ' &#127183;' : '';
          var badge = isFinished ? predResultBadge(pred.home, pred.away, m.score1, m.score2, pred.j) : '';
          rows += '<tr>' +
            '<td style="padding:2px 6px 2px 2px;white-space:nowrap">' + dot + escapeHtml(p) + '</td>' +
            '<td style="padding:2px 8px 2px 2px;text-align:center;font-weight:700">' + scoreStr + jokerMark + '</td>' +
            '<td style="padding:2px 0">' + badge + '</td>' +
            '</tr>';
        } else if (pred) {
          rows += '<tr style="opacity:0.55">' +
            '<td style="padding:2px 6px 2px 2px;white-space:nowrap">' + dot + escapeHtml(p) + '</td>' +
            '<td style="padding:2px 8px 2px 2px;text-align:center;color:#888">&#10003;</td>' +
            '<td></td>' +
            '</tr>';
        } else {
          rows += '<tr style="opacity:0.35">' +
            '<td style="padding:2px 6px 2px 2px;white-space:nowrap">' + dot + escapeHtml(p) + '</td>' +
            '<td style="padding:2px 8px 2px 2px;text-align:center;color:#aaa">&#8212;</td>' +
            '<td></td>' +
            '</tr>';
        }
      }
      dotsHtml = '<div class="oe-reading-pred-table"><table style="border-collapse:collapse;font-size:11px;width:100%">' +
        rows + '</table></div>';
    } else {
      // Pre-lock: just show has/hasn't predicted dots
      var dots = '';
      for (var pi = 0; pi < PLAYERS.length; pi++) {
        var p = PLAYERS[pi];
        var pred = predByPlayer[p];
        if (pred) {
          dots += '<span class="pred-dot has-pred" title="' + p + ' predicted">' + p[0] + '&#10003;</span>';
        } else {
          dots += '<span class="pred-dot no-pred" title="' + p + ' hasn\'t predicted">' + p[0] + '&#10007;</span>';
        }
      }
      dotsHtml = '<div class="oe-reading-dots"><div class="match-pred-dots">' + dots + '</div></div>';
    }
  }

  // Channel
  var channelHtml = '';
  if (m.channel) {
    var href = m.channel.startsWith('BBC') ? 'https://www.bbc.co.uk/iplayer' : 'https://www.itv.com/watch';
    var cls = m.channel.startsWith('BBC') ? 'channel-bbc' : 'channel-itv';
    channelHtml = '<div style="margin-top:6px"><a href="' + href + '" target="_blank" rel="noopener" class="match-channel ' + cls + '">' + escapeHtml(m.channel) + '</a></div>';
  }

  // Predict button
  var predictBtn = '';
  if (!isLocked && !isFinished && typeof currentSession !== 'undefined' && currentSession) {
    predictBtn = '<div style="margin-top:10px"><button class="oe-predict-btn" onclick="showPredPanel(\'' + escapedKey + '\')">&#128270; Predict</button></div>';
  }

  // Owner / team line
  var fromLine = '<img class="oe-reading-flag" src="' + flagUrl(i1) + '" alt=""> ' + escapeHtml(m.team1) +
    (o1 ? ' <span class="match-owner ' + ownerColors[o1] + '">' + o1 + '</span>' : '') +
    ' <span style="color:#888;font-size:16px">&#8211;</span> ' +
    '<img class="oe-reading-flag" src="' + flagUrl(i2) + '" alt=""> ' + escapeHtml(m.team2) +
    (o2 ? ' <span class="match-owner ' + ownerColors[o2] + '">' + o2 + '</span>' : '');

  // Title bar
  if (titleEl) titleEl.innerHTML = '<span class="xp-title-icon">📧</span> ' +
    escapeHtml(m.team1) + ' v ' + escapeHtml(m.team2) + ' - Microsoft Outlook Express';

  // Header fields
  if (headerEl) headerEl.innerHTML =
    '<div class="oe-reading-field"><span class="oe-reading-lbl">From:</span><span class="oe-reading-val">' + escapeHtml(m.team1) + ' v ' + escapeHtml(m.team2) + '</span></div>' +
    '<div class="oe-reading-field"><span class="oe-reading-lbl">Subject:</span><span class="oe-reading-val">' + (m.round ? m.round + ' Round' : 'Group ' + m.group + ' Match') + '</span></div>' +
    '<div class="oe-reading-field"><span class="oe-reading-lbl">Date:</span><span class="oe-reading-val">' + dateLabel + ' ' + localTime + '</span></div>';

  // Body
  bodyEl.innerHTML =
    '<div class="oe-reading-teams">' + fromLine + '</div>' +
    '<div style="margin-bottom:8px">' + scoreHtml + '</div>' +
    probHtml +
    dotsHtml +
    channelHtml +
    predictBtn;

  openWindow('match');
}
