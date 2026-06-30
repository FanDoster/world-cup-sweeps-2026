// ── BANTER FEED ──
// Live feed of match comments across all matches.
let _banterChannel = null;

async function renderBanter() {
  const el = document.getElementById('banterFeed');
  if (!el) return;

  // Fetch latest 80 comments with match context
  const { data: comments, error } = await sb.from('match_comments')
    .select('id,body,created_at,user_id,match_id')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error || !comments || !comments.length) {
    el.innerHTML = '<div class="banter-empty">No banter yet — get predicting and chatting.</div>';
    return;
  }

  // Collect match IDs and fetch match context
  const matchIds = [...new Set(comments.map(c => c.match_id))];
  const { data: matches } = await sb.from('matches')
    .select('id,match_date,home_team_id(name),away_team_id(name),group_letter,round')
    .in('id', matchIds);
  const matchById = {};
  (matches || []).forEach(m => { matchById[m.id] = m; });

  // Collect user IDs and fetch profiles
  const userIds = [...new Set(comments.map(c => c.user_id))];
  const { data: profs } = await sb.from('player_profiles')
    .select('id,player_name,avatar_url')
    .in('id', userIds);
  const nameById = {}, avatarById = {};
  (profs || []).forEach(p => {
    nameById[p.id] = p.player_name;
    avatarById[p.id] = p.avatar_url;
    if (p.player_name && p.avatar_url) avatarCache[p.player_name] = p.avatar_url;
  });

  let html = '';
  for (const c of comments) {
    const m = matchById[c.match_id];
    if (!m || !m.home_team_id || !m.away_team_id) continue;

    const t = new Date(c.created_at);
    const now = new Date();
    const diffMin = Math.floor((now - t) / 60000);
    let when;
    if (diffMin < 1) when = 'just now';
    else if (diffMin < 60) when = `${diffMin}m ago`;
    else if (diffMin < 1440) when = `${Math.floor(diffMin / 60)}h ago`;
    else when = t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

    const author = nameById[c.user_id] || 'Unknown';
    const avatar = avatarHtml(author, 28);
    const body = linkifyHtml(c.body);
    const matchLabel = m.round ? roundLabel(m.round) : 'G' + m.group_letter;
    const matchCtx = `${m.home_team_id.name} vs ${m.away_team_id.name}`;

    html += `<div class="banter-item">
      <div class="banter-match-ctx" onclick="showPredPanel('${escapeHtml(m.home_team_id.name)}|${escapeHtml(m.away_team_id.name)}|${m.match_date}')" title="Open match panel">
        <span class="banter-match-label badge-mono">${matchLabel}</span>
        <span class="banter-match-teams">${matchCtx}</span>
      </div>
      <div class="banter-body-row">
        <span class="banter-avatar" onclick="showUserProfile('${escapeHtml(author)}')" style="cursor:pointer" title="View profile">${avatar}</span>
        <span class="banter-bubble">
          <span class="banter-author">${author}</span>
          <span class="banter-text">${body}</span>
        </span>
        <span class="banter-time">${when}</span>
      </div>
    </div>`;
  }

  el.innerHTML = html || '<div class="banter-empty">No banter yet — get predicting and chatting.</div>';

  // Live subscription
  if (_banterChannel) { sb.removeChannel(_banterChannel); _banterChannel = null; }
  _banterChannel = sb.channel('banter-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_comments' },
      () => renderBanter())
    .subscribe();
}

function teardownBanter() {
  if (_banterChannel) { sb.removeChannel(_banterChannel); _banterChannel = null; }
}
