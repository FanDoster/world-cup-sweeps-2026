// ── BANTER FEED ──
// Live feed of match comments across all matches.
let _banterChannel = null;

async function renderBanter() {
  const el = document.getElementById('banterFeed');
  if (!el) return;

  const fields = 'id,body,created_at,user_id,match_id' + (pinEnabled ? ',pinned,pinned_at,pinned_by' : '');

  // Fetch latest 80 comments, plus every pinned comment (which may be older
  // than the 80-comment window) so pins stay at the top regardless of age.
  const queries = [
    sb.from('match_comments').select(fields).order('created_at', { ascending: false }).limit(80),
  ];
  if (pinEnabled) {
    queries.push(sb.from('match_comments').select(fields).eq('pinned', true).order('pinned_at', { ascending: false }));
  }
  const [recentResult, pinnedResult] = await Promise.all(queries);
  const recent = recentResult.data;
  const pinned = pinnedResult ? (pinnedResult.data || []) : [];

  if (recentResult.error || !recent || !recent.length) {
    el.innerHTML = '<div class="banter-empty">No banter yet — get predicting and chatting.</div>';
    return;
  }

  const pinnedIds = new Set(pinned.map(c => c.id));
  const comments = [...pinned, ...recent.filter(c => !pinnedIds.has(c.id))];

  // Collect match IDs and fetch match context
  const matchIds = [...new Set(comments.map(c => c.match_id))];
  const { data: matches } = await sb.from('matches')
    .select('id,match_date,home_team_id(name),away_team_id(name),group_letter,round')
    .in('id', matchIds);
  const matchById = {};
  (matches || []).forEach(m => { matchById[m.id] = m; });

  // Collect user IDs (authors + pinners) and fetch profiles
  const userIds = [...new Set(comments.flatMap(c => [c.user_id, c.pinned_by]).filter(Boolean))];
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

    const isPinned = pinEnabled && c.pinned;
    const pinnedByName = isPinned && c.pinned_by ? (nameById[c.pinned_by] || 'someone') : '';
    const pinBtn = (pinEnabled && currentSession)
      ? `<button type="button" class="banter-pin-btn${isPinned ? ' active' : ''}" onclick="toggleBanterPin(${c.id}, ${isPinned})" title="${isPinned ? 'Unpin' : 'Pin to top'}">📌</button>`
      : '';

    html += `<div class="banter-item${isPinned ? ' banter-pinned' : ''}">
      ${isPinned ? `<div class="banter-pinned-label">📌 Pinned${pinnedByName ? ' by ' + pinnedByName : ''}</div>` : ''}
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
        ${pinBtn}
      </div>
    </div>`;
  }

  el.innerHTML = html || '<div class="banter-empty">No banter yet — get predicting and chatting.</div>';

  // Live subscription — refresh on new comments and on pin/unpin toggles
  if (_banterChannel) { sb.removeChannel(_banterChannel); _banterChannel = null; }
  _banterChannel = sb.channel('banter-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_comments' },
      () => renderBanter())
    .subscribe();
}

async function toggleBanterPin(id, isPinned) {
  if (!currentSession) return;
  const patch = isPinned
    ? { pinned: false, pinned_at: null, pinned_by: null }
    : { pinned: true, pinned_at: new Date().toISOString(), pinned_by: currentSession.user.id };
  const { error } = await sb.from('match_comments').update(patch).eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  renderBanter();
}

function teardownBanter() {
  if (_banterChannel) { sb.removeChannel(_banterChannel); _banterChannel = null; }
}
