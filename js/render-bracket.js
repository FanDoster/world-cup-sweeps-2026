// ── R32 BRACKET STRUCTURE (FIFA 2026) ──
const R32_SLOTS = [
  { match: 73, date: '2026-06-28', home: '2A', away: '2B' },
  { match: 74, date: '2026-06-29', home: '1E', away: '3rd', thirdPool: ['A','B','C','D','F'] },
  { match: 75, date: '2026-06-29', home: '1F', away: '2C' },
  { match: 76, date: '2026-06-29', home: '1C', away: '2F' },
  { match: 77, date: '2026-06-30', home: '1I', away: '3rd', thirdPool: ['C','D','F','G','H'] },
  { match: 78, date: '2026-06-30', home: '2E', away: '2I' },
  { match: 79, date: '2026-06-30', home: '1A', away: '3rd', thirdPool: ['C','E','F','H','I'] },
  { match: 80, date: '2026-07-01', home: '1L', away: '3rd', thirdPool: ['E','H','I','J','K'] },
  { match: 81, date: '2026-07-01', home: '1D', away: '3rd', thirdPool: ['B','E','F','I','J'] },
  { match: 82, date: '2026-07-01', home: '1G', away: '3rd', thirdPool: ['A','E','H','I','J'] },
  { match: 83, date: '2026-07-02', home: '2K', away: '2L' },
  { match: 84, date: '2026-07-02', home: '1H', away: '2J' },
  { match: 85, date: '2026-07-02', home: '1B', away: '3rd', thirdPool: ['E','F','G','I','J'] },
  { match: 86, date: '2026-07-03', home: '1K', away: '3rd', thirdPool: ['D','E','I','J','L'] },
  { match: 87, date: '2026-07-03', home: '1J', away: '2H' },
  { match: 88, date: '2026-07-03', home: '2D', away: '2G' },
];

const KNOCKOUT_BRACKET = [
  { match: 89,  round: 'R16',   home: 'W73', away: 'W75' },
  { match: 90,  round: 'R16',   home: 'W74', away: 'W77' },
  { match: 91,  round: 'R16',   home: 'W76', away: 'W78' },
  { match: 92,  round: 'R16',   home: 'W79', away: 'W80' },
  { match: 93,  round: 'R16',   home: 'W83', away: 'W84' },
  { match: 94,  round: 'R16',   home: 'W81', away: 'W82' },
  { match: 95,  round: 'R16',   home: 'W86', away: 'W88' },
  { match: 96,  round: 'R16',   home: 'W85', away: 'W87' },
  { match: 97,  round: 'QF',    home: 'W89', away: 'W90' },
  { match: 98,  round: 'QF',    home: 'W93', away: 'W94' },
  { match: 99,  round: 'QF',    home: 'W91', away: 'W92' },
  { match: 100, round: 'QF',    home: 'W95', away: 'W96' },
  { match: 101, round: 'SF',    home: 'W97', away: 'W98' },
  { match: 102, round: 'SF',    home: 'W99', away: 'W100' },
  { match: 103, round: '3P',    home: 'L101', away: 'L102' },
  { match: 104, round: 'Final', home: 'W101', away: 'W102' },
];

// ── HELPERS ──
function bracketTeam(teamName) {
  const iso = teamIso[teamName];
  const flag = iso ? `<img src="${flagUrl(iso)}" class="bracket-flag" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  return `<span class="bracket-team">${flag}${escapeHtml(teamName)}</span>`;
}

function ownerColour(playerName) {
  return ownerColors[playerName] || '';
}

// ── BUILD BRACKET NODE TREE ──
let bracketTreeCache = {};

function buildBracketTree() {
  const tree = {};

  // Build team resolution from group stage results
  // '1A' = Group A winner, '2A' = Group A runner-up
  const groupResult = {};
  for (const m of matchData) {
    if (!m.group || !m.isComplete) continue;
    const g = m.group;
    if (!groupResult[g]) groupResult[g] = {};
    groupResult[g][m.team1] = (groupResult[g][m.team1] || 0) + (m.score1 > m.score2 ? 3 : m.score1 === m.score2 ? 1 : 0);
    groupResult[g][m.team2] = (groupResult[g][m.team2] || 0) + (m.score2 > m.score1 ? 3 : m.score1 === m.score2 ? 1 : 0);
  }

  const groupWinners = {}, groupRunners = {};
  for (const [g, teams] of Object.entries(groupResult)) {
    const sorted = Object.entries(teams).sort((a, b) => b[1] - a[1]);
    groupWinners[g] = sorted[0] ? sorted[0][0] : null;
    groupRunners[g] = sorted[1] ? sorted[1][0] : null;
  }

  function resolveSlotTeam(ref, thirdPool) {
    if (!ref) return null;
    if (ref === '3rd') return null; // can't determine 3rd place without full table
    if (ref.startsWith('1')) return groupWinners[ref.substring(1)] || null;
    if (ref.startsWith('2')) return groupRunners[ref.substring(1)] || null;
    return ref; // literal team name
  }

  // Build lookup: for each R32 slot, find matchData by resolved team names
  const slotToMatch = {};
  for (const slot of R32_SLOTS) {
    const homeTeam = resolveSlotTeam(slot.home, slot.thirdPool);
    const awayTeam = resolveSlotTeam(slot.away, slot.thirdPool);
    if (homeTeam && awayTeam) {
      const m = matchData.find(m => m.round === 'R32' && m.team1 === homeTeam && m.team2 === awayTeam);
      if (m) slotToMatch[slot.match] = m;
    } else if (homeTeam || awayTeam) {
      // Partial match (one side is 3rd place) — find by date and known team
      const known = homeTeam || awayTeam;
      const m = matchData.find(m => m.round === 'R32' && m.date === slot.date && (m.team1 === known || m.team2 === known));
      if (m) slotToMatch[slot.match] = m;
    } else {
      // Both unknown — groups not yet complete; will be filled by second pass below
    }
  }

  // Second pass: any R32 match in matchData not yet assigned gets matched to the
  // remaining unmatched slot on the same date (handles the case where both group
  // tables are still incomplete so resolveSlotTeam returned null for both sides).
  const assignedKeys = new Set(Object.values(slotToMatch).map(m => `${m.team1}|${m.team2}|${m.date}`));
  const unmatchedR32 = matchData.filter(m => m.round === 'R32' && !assignedKeys.has(`${m.team1}|${m.team2}|${m.date}`));
  for (const slot of R32_SLOTS) {
    if (slotToMatch[slot.match]) continue;
    const idx = unmatchedR32.findIndex(m => m.date === slot.date);
    if (idx !== -1) {
      slotToMatch[slot.match] = unmatchedR32[idx];
      unmatchedR32.splice(idx, 1);
    }
  }

  // R32 nodes
  for (const slot of R32_SLOTS) {
    const m = slotToMatch[slot.match];
    tree[slot.match] = {
      num: slot.match, round: 'R32',
      home: m ? m.team1 : null, away: m ? m.team2 : null,
      score1: m ? m.score1 : null, score2: m ? m.score2 : null,
      isComplete: m ? m.isComplete : false,
      date: m ? m.date : null, time: m ? m.time : null, tz: m ? m.tz : null,
      channel: m ? m.channel : null,
      actualWinner: m ? m.actualWinner : null,
      feederHome: null, feederAway: null,
    };
  }

  // Later rounds
  for (const kb of KNOCKOUT_BRACKET) {
    // Look up by DB id — same row carries date/time (always), teams and
    // scores (once the match has been played and populated in Supabase).
    const byId = matchData.find(m => m.id === kb.match);
    const homeRef = parseInt(kb.home.substring(1));
    const awayRef = parseInt(kb.away.substring(1));

    let homeTeam = byId && byId.team1 ? byId.team1 : null;
    let awayTeam = byId && byId.team2 ? byId.team2 : null;
    let score1 = byId ? byId.score1 : null;
    let score2 = byId ? byId.score2 : null;
    let isComplete = byId ? byId.isComplete : false;
    let date = byId ? byId.date : null;
    let time = byId ? byId.time : null;
    let tz = byId ? byId.tz : null;
    let channel = byId ? byId.channel : null;

    let actualWinner = byId ? byId.actualWinner : null;

    // Resolve from completed feeder matches if still unknown
    if (!homeTeam && tree[homeRef] && tree[homeRef].isComplete) {
      const f = tree[homeRef];
      homeTeam = (f.score1 > f.score2) ? f.home : f.away;
    }
    if (!awayTeam && tree[awayRef] && tree[awayRef].isComplete) {
      const f = tree[awayRef];
      awayTeam = (f.score1 > f.score2) ? f.home : f.away;
    }

    tree[kb.match] = {
      num: kb.match, round: kb.round,
      home: homeTeam, away: awayTeam,
      score1, score2, isComplete,
      date, time, tz, channel,
      actualWinner,
      feederHome: homeRef, feederAway: awayRef,
    };
  }

  bracketTreeCache = tree;
  return tree;
}

// ── RENDER NODE HTML ──
function renderBracketNode(node, opts) {
  opts = opts || {};
  const isComplete = node.isComplete && node.score1 !== null && node.score2 !== null;
  const now = new Date();
  const kickoff = node.date ? toDate(node.date, node.time, node.tz) : null;
  const inLiveWindow = kickoff && kickoff <= now && (kickoff.getTime() + 2.5*60*60*1000) > now.getTime();
  const isLive = inLiveWindow && !isComplete;
  const hasTeams = node.home || node.away;

  let cls = '';
  if (isComplete) cls = ' bt-winner';
  else if (isLive) cls = ' bt-live';
  else if (hasTeams) cls = ' bt-upcoming';

  // Determine advancing team
  let homeCls = '', awayCls = '';
  if (isComplete) {
    if (node.score1 > node.score2) { homeCls = ' bt-advanced'; awayCls = ' bt-eliminated'; }
    else if (node.score2 > node.score1) { awayCls = ' bt-advanced'; homeCls = ' bt-eliminated'; }
    else if (node.actualWinner) {
      // Draw after 90/120 min — use actual_winner (e.g. pens)
      if (node.actualWinner === node.home) { homeCls = ' bt-advanced'; awayCls = ' bt-eliminated'; }
      else if (node.actualWinner === node.away) { awayCls = ' bt-advanced'; homeCls = ' bt-eliminated'; }
    }
  }

  const homeIso = node.home ? teamIso[node.home] : null;
  const awayIso = node.away ? teamIso[node.away] : null;
  const homeOwner = node.home ? teamOwner[node.home] : null;
  const awayOwner = node.away ? teamOwner[node.away] : null;

  const homeFlag = homeIso ? `<img class="bracket-flag" src="${flagUrl(homeIso)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  const awayFlag = awayIso ? `<img class="bracket-flag" src="${flagUrl(awayIso)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';

  const key = node.home && node.away ? `${node.home}|${node.away}|${node.date}` : '';

  // Prediction status indicator for current user
  let predBadge = '';
  if (currentSession && key && !isComplete) {
    const mid = matchIdByTeamDate[key];
    if (mid) {
      const myPred = (predLookup[mid] || []).find(p => p.user_id === currentSession.user.id);
      if (!myPred) {
        predBadge = '<span class="bt-pred-badge bt-pred-none">—</span>';
      } else if (node.round && !myPred.winner) {
        predBadge = '<span class="bt-pred-badge bt-pred-needs-winner">⚠</span>';
      } else {
        predBadge = '<span class="bt-pred-badge bt-pred-ok">✓</span>';
      }
    }
  }

  // Feed info for TBD slots — show what feeds into this match.
  // Compact (tree): "W75". Verbose (cards): resolve to the feeder matchup if known.
  function feederLabel(ref) {
    if (!ref) return 'TBD';
    if (opts.verbose) {
      const fn = bracketTreeCache[ref];
      if (fn && fn.home && fn.away) return `Winner: ${fn.home} v ${fn.away}`;
      return `Winner of Match ${ref}`;
    }
    return `W${ref}`;
  }

  const homeLabel = node.home || feederLabel(node.feederHome);
  const awayLabel = node.away || feederLabel(node.feederAway);
  const homeTbd = node.home ? '' : ' bt-team-tbd';
  const awayTbd = node.away ? '' : ' bt-team-tbd';

  let html = `<div class="bt-node${cls}"${key ? ` onclick="showPredPanel('${safeAttr(node.home)}|${safeAttr(node.away)}|${node.date}')" style="cursor:pointer"` : ''}>`;
  html += `<div class="bt-team-row${homeCls}">${homeFlag}<span class="bt-team-name${homeTbd}">${homeLabel}</span>${isComplete ? `<span class="bt-team-score">${node.score1}</span>` : ''}</div>`;
  html += `<div class="bt-team-row${awayCls}">${awayFlag}<span class="bt-team-name${awayTbd}">${awayLabel}</span>${isComplete ? `<span class="bt-team-score">${node.score2}</span>` : ''}</div>`;

  // Meta line: date/time or live indicator
  if (isLive) {
    html += `<div class="bt-node-meta"><span class="bt-live-text">● LIVE</span></div>`;
  } else if (isComplete) {
    html += `<div class="bt-node-meta">FT</div>`;
  } else if (node.date) {
    const localTime = formatLocalTime(node.date, node.time, node.tz);
    html += `<div class="bt-node-meta">${localTime}</div>`;
  }

  // Owner chips
  if (homeOwner || awayOwner) {
    html += `<div class="bt-node-meta" style="gap:4px">`;
    if (homeOwner) html += `<span class="match-owner ${ownerColors[homeOwner]}">${homeOwner}</span>`;
    if (awayOwner) html += `<span class="match-owner ${ownerColors[awayOwner]}">${awayOwner}</span>`;
    html += `</div>`;
  }
  if (predBadge) html += `<div class="bt-node-meta">${predBadge}</div>`;

  html += `</div>`;
  return html;
}

// ── MOBILE HELPERS ──
const BRACKET_ROUND_MATCHES = {
  'R32': R32_SLOTS.map(s => s.match),
  'R16': [89, 90, 91, 92, 93, 94, 95, 96],
  'QF':  [97, 98, 99, 100],
  'SF':  [101, 102],
  'Final': [104],
};

function bracketIsMobile() {
  return typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(max-width: 700px)').matches;
}

function roundShortLabel(code) {
  return { R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF', Final: 'Final' }[code] || code;
}

// The "current" round to focus on mobile: earliest round still containing an
// incomplete match (i.e. the round being played / next up), else the Final.
function bracketActiveRound(tree) {
  const order = ['R32', 'R16', 'QF', 'SF', 'Final'];
  for (const r of order) {
    if (BRACKET_ROUND_MATCHES[r].some(n => tree[n] && !tree[n].isComplete)) return r;
  }
  return 'Final';
}

// ── RENDER BRACKET TREE ──
function renderBracket() {
  const section = document.getElementById('sectionBracket');
  if (!section) return;

  const tree = buildBracketTree();

  // Rounds to display
  const rounds = ['R32', 'R16', 'QF', 'SF', 'Final'];

  const mobile = bracketIsMobile();
  // On mobile the horizontal tree doesn't fit, so "All Rounds" is replaced by a
  // single-round paginated view focused on the current round.
  const effectiveRound = (mobile && bracketRound === 'all') ? bracketActiveRound(tree) : bracketRound;

  // Build the round selector. Mobile = compact segmented control (no tree button).
  const _ovIcon = `<svg class="ko-ov-icon" width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><line x1="0" y1="1" x2="4" y2="1"/><line x1="0" y1="4" x2="4" y2="4"/><line x1="0" y1="10" x2="4" y2="10"/><line x1="0" y1="13" x2="4" y2="13"/><path d="M4 1L5 1L5 2.5L8 2.5"/><path d="M4 4L5 4L5 2.5"/><path d="M4 10L5 10L5 11.5L8 11.5"/><path d="M4 13L5 13L5 11.5"/><line x1="8" y1="2.5" x2="12" y2="2.5"/><line x1="8" y1="11.5" x2="12" y2="11.5"/><path d="M12 2.5L13 2.5L13 7L16 7"/><path d="M12 11.5L13 11.5L13 7"/><line x1="16" y1="7" x2="20" y2="7"/></svg>`;
  const selectorHtml = `
    <button class="ko-overview-btn" onclick="openKnockoutOverview()">${_ovIcon} Overview</button>
    <div class="bracket-round-selector${mobile ? ' bracket-round-seg' : ''}">
      ${rounds.map(r => {
        return `<button class="bracket-round-btn${r === effectiveRound ? ' active' : ''}"
          onclick="setBracketRound('${r}')">${mobile ? roundShortLabel(r) : roundLabel(r)}</button>`;
      }).join('')}
      ${mobile ? '' : `<button class="bracket-round-btn${bracketRound === 'all' ? ' active' : ''}"
        onclick="setBracketRound('all')">All Rounds</button>`}
    </div>`;

  // Single-round list view (always on mobile; on desktop when a round is picked).
  if (mobile || bracketRound !== 'all') {
    section.innerHTML = selectorHtml + renderSingleRound(effectiveRound, tree, mobile);
    return;
  }

  // Build the full tree
  // Each round is an array of match numbers in bracket order
  const roundMatches = {
    'R32': R32_SLOTS.map(s => s.match),
    'R16': [89,90,91,92,93,94,95,96],
    'QF':  [97,98,99,100],
    'SF':  [101,102],
    'Final': [104],
  };

  // Compute center Y (px) for each match node — R32 evenly spaced, later rounds at midpoint of feeders
  const SLOT_H = 140; // px per R32 slot
  const TOTAL_H = R32_SLOTS.length * SLOT_H;
  const LABEL_H = 24; // px for the round label row (must match .bt-round-label height)

  const allSlots2 = [
    ...R32_SLOTS.map(s => ({ match: s.match, home: s.home, away: s.away })),
    ...KNOCKOUT_BRACKET,
  ];
  const slotByMatch2 = {};
  allSlots2.forEach(s => { slotByMatch2[s.match] = s; });
  function parseRef2(ref) {
    if (!ref) return null;
    const m = ref.match(/^[WL](\d+)$/);
    return m ? parseInt(m[1]) : null;
  }
  function feedersOf(num) {
    const s = slotByMatch2[num];
    if (!s) return [];
    return [parseRef2(s.home), parseRef2(s.away)].filter(f => f != null);
  }

  // Derive the bracket-tree display order: DFS from the Final down to R32 so that
  // each match's two feeders are physically adjacent (no crossing connector lines).
  const r32Order = [];
  (function dfs(num) {
    const feeders = feedersOf(num);
    if (feeders.length === 0) { r32Order.push(num); return; }
    feeders.forEach(dfs);
  })(roundMatches['Final'][0]);

  // Assign vertical centers: R32 leaves evenly spaced in tree order, parents at feeder midpoint.
  const centerY = {};
  r32Order.forEach((num, i) => { centerY[num] = (i + 0.5) * SLOT_H; });
  ['R16', 'QF', 'SF', 'Final'].forEach(r => {
    (roundMatches[r] || []).forEach(num => {
      const ys = feedersOf(num).map(f => centerY[f]).filter(y => y != null);
      if (ys.length) centerY[num] = ys.reduce((a, b) => a + b, 0) / ys.length;
    });
  });

  let colsHtml = '';
  for (let ri = 0; ri < rounds.length; ri++) {
    const round = rounds[ri];
    // Render each column in tree order (by vertical position), not match-number order.
    const matchNums = [...roundMatches[round]].sort((a, b) => (centerY[a] ?? 0) - (centerY[b] ?? 0));
    const isActive = round === bracketRound;

    colsHtml += `<div class="bt-round-wrap">`;
    colsHtml += `<div class="bt-round-label${isActive ? ' active' : ''}">${roundLabel(round)}</div>`;
    colsHtml += `<div class="bt-round" style="position:relative;height:${TOTAL_H}px">`;
    for (const num of matchNums) {
      const node = tree[num];
      if (node) {
        const cy = centerY[num] ?? 0;
        colsHtml += `<div style="position:absolute;left:0;right:0;top:${cy}px;transform:translateY(-50%)">`;
        colsHtml += renderBracketNode(node);
        colsHtml += `</div>`;
      }
    }
    colsHtml += `</div></div>`;

    // Add connector column between rounds (except after last)
    if (ri < rounds.length - 1) {
      colsHtml += renderConnector(rounds[ri + 1], roundMatches, centerY, TOTAL_H, LABEL_H);
    }
  }

  section.innerHTML = selectorHtml + `<div class="bracket-tree-wrap"><div class="bracket-tree">${colsHtml}</div></div>`;
}

function renderConnector(toRound, roundMatches, centerY, totalH, labelH) {
  const toMatches = roundMatches[toRound];

  const allSlots = [
    ...R32_SLOTS.map(s => ({ match: s.match, home: s.home, away: s.away })),
    ...KNOCKOUT_BRACKET,
  ];
  const slotByMatch = {};
  allSlots.forEach(s => { slotByMatch[s.match] = s; });

  function parseMatchRef(ref) {
    if (!ref) return null;
    const m = ref.match(/^[WL](\d+)$/);
    return m ? parseInt(m[1]) : null;
  }

  let svgLines = '';
  for (const toMatchNum of toMatches) {
    const slot = slotByMatch[toMatchNum];
    if (!slot) continue;
    const f1 = parseMatchRef(slot.home);
    const f2 = parseMatchRef(slot.away);
    const cy1 = f1 != null ? centerY[f1] : null;
    const cy2 = f2 != null ? centerY[f2] : null;
    const tc = centerY[toMatchNum];
    if (cy1 == null || cy2 == null || tc == null) continue;

    const top = Math.min(cy1, cy2);
    const bot = Math.max(cy1, cy2);
    const mid = (top + bot) / 2;

    // Horizontal stubs from each feeder node into the connector
    svgLines += `<line x1="0" y1="${cy1}" x2="10" y2="${cy1}" stroke="var(--text-muted)" stroke-width="1.5" stroke-opacity="0.5"/>`;
    svgLines += `<line x1="0" y1="${cy2}" x2="10" y2="${cy2}" stroke="var(--text-muted)" stroke-width="1.5" stroke-opacity="0.5"/>`;
    // Vertical stem connecting the two stubs
    svgLines += `<line x1="10" y1="${top}" x2="10" y2="${bot}" stroke="var(--text-muted)" stroke-width="1.5" stroke-opacity="0.5"/>`;
    // Horizontal line from midpoint to right edge (towards next round)
    svgLines += `<line x1="10" y1="${mid}" x2="36" y2="${tc}" stroke="var(--text-muted)" stroke-width="1.5" stroke-opacity="0.5"/>`;
  }

  return `<div class="bt-conn-wrap">
    <div style="height:${labelH}px;flex-shrink:0"></div>
    <div class="bt-conn" style="height:${totalH}px">
      <svg class="bt-conn-svg" width="36" height="${totalH}" viewBox="0 0 36 ${totalH}" style="position:absolute;inset:0">
        ${svgLines}
      </svg>
    </div>
  </div>`;
}

function renderSingleRound(round, tree, mobile) {
  const order = ['R32', 'R16', 'QF', 'SF', 'Final'];
  const matchNums = BRACKET_ROUND_MATCHES[round];
  if (!matchNums) return `<p class="bracket-empty">Unknown round: ${round}</p>`;

  let html = '';

  // Mobile: prev/next round pager so you can thumb through the bracket.
  if (mobile) {
    const idx = order.indexOf(round);
    const prev = idx > 0 ? order[idx - 1] : null;
    const next = idx < order.length - 1 ? order[idx + 1] : null;
    const played = matchNums.filter(n => tree[n] && tree[n].isComplete).length;
    const countLabel = round === 'Final'
      ? '1 match'
      : `${played}/${matchNums.length} played`;
    html += `<div class="bt-mobile-nav">
      <button class="bt-nav-btn" ${prev ? `onclick="setBracketRound('${prev}')"` : 'disabled'} aria-label="Previous round">‹</button>
      <div class="bt-nav-title">${roundLabel(round)}<span class="bt-nav-count">${countLabel}</span></div>
      <button class="bt-nav-btn" ${next ? `onclick="setBracketRound('${next}')"` : 'disabled'} aria-label="Next round">›</button>
    </div>`;
  }

  html += `<div class="bracket-cards">`;
  for (const num of matchNums) {
    const node = tree[num];
    if (!node) continue;
    const dateStr = node.date ? new Date(node.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

    html += `<div class="bracket-match-card card-base">
      <div class="bracket-card-header">
        <span class="bracket-card-match">${dateStr || 'Date TBD'}</span>
      </div>
      ${renderBracketNode(node, { verbose: true })}
    </div>`;
  }
  html += `</div>`;
  return html;
}

// ── BRACKET STATE ──
let bracketRound = 'all';

function setBracketRound(round) {
  bracketRound = round;
  renderBracket();
}

// Re-render when crossing the mobile breakpoint so the layout adapts on rotate/resize.
let _bracketWasMobile = bracketIsMobile();
window.addEventListener('resize', () => {
  const nowMobile = bracketIsMobile();
  if (nowMobile === _bracketWasMobile) return;
  _bracketWasMobile = nowMobile;
  const section = document.getElementById('sectionBracket');
  if (section && section.classList.contains('active')) renderBracket();
});

// Keep old projection functions for reference (unused in tree view but called by other files)
function calcProjectedStandings(playerName) {
  const groupMatches = {};
  for (const m of matchData) {
    if (!m.group) continue;
    if (!groupMatches[m.group]) groupMatches[m.group] = [];
    groupMatches[m.group].push(m);
  }
  const result = {};
  for (const [letter, matches] of Object.entries(groupMatches)) {
    const rec = {};
    for (const m of matches) {
      if (!rec[m.team1]) rec[m.team1] = { team: m.team1, pts: 0, gd: 0, gf: 0, h2h: {} };
      if (!rec[m.team2]) rec[m.team2] = { team: m.team2, pts: 0, gd: 0, gf: 0, h2h: {} };
    }
    for (const m of matches) {
      let s1, s2;
      if (m.isComplete) { s1 = m.score1; s2 = m.score2; }
      else {
        const mid = matchIdByTeamDate[`${m.team1}|${m.team2}|${m.date}`];
        const preds = predLookup[mid] || [];
        const pred = preds.find(p => p.player_name === playerName);
        if (pred && pred.home !== undefined && pred.away !== undefined) { s1 = pred.home; s2 = pred.away; }
        else { s1 = 0; s2 = 0; }
      }
      const t1 = rec[m.team1]; const t2 = rec[m.team2];
      t1.gf += s1; t1.gd += (s1 - s2); t2.gf += s2; t2.gd += (s2 - s1);
      if (!t1.h2h[m.team2]) t1.h2h[m.team2] = { pts: 0, gd: 0, gf: 0 };
      if (!t2.h2h[m.team1]) t2.h2h[m.team1] = { pts: 0, gd: 0, gf: 0 };
      if (s1 > s2) { t1.pts += 3; t1.h2h[m.team2].pts += 3; t1.h2h[m.team2].gd += (s1 - s2); t1.h2h[m.team2].gf += s1; t2.h2h[m.team1].gd += (s2 - s1); t2.h2h[m.team1].gf += s2; }
      else if (s2 > s1) { t2.pts += 3; t2.h2h[m.team1].pts += 3; t2.h2h[m.team1].gd += (s2 - s1); t2.h2h[m.team1].gf += s2; t1.h2h[m.team2].gd += (s1 - s2); t1.h2h[m.team2].gf += s1; }
      else { t1.pts += 1; t2.pts += 1; t1.h2h[m.team2].pts += 1; t1.h2h[m.team2].gf += s1; t2.h2h[m.team1].pts += 1; t2.h2h[m.team1].gf += s2; }
    }
    result[letter] = sortGroupStandings(Object.values(rec));
  }
  return result;
}

function sortGroupStandings(teams) {
  const byPts = {};
  for (const t of teams) { if (!byPts[t.pts]) byPts[t.pts] = []; byPts[t.pts].push(t); }
  const sorted = [];
  for (const pts of Object.keys(byPts).map(Number).sort((a, b) => b - a)) {
    const tier = byPts[pts];
    sorted.push(...(tier.length === 1 ? tier : sortByTiebreakers(tier)));
  }
  return sorted;
}

function sortByTiebreakers(teams) {
  const h2h = {};
  for (const t of teams) {
    h2h[t.team] = { pts: 0, gd: 0, gf: 0 };
    for (const opp of teams) {
      if (opp.team === t.team) continue;
      const r = t.h2h[opp.team] || { pts: 0, gd: 0, gf: 0 };
      h2h[t.team].pts += r.pts; h2h[t.team].gd += r.gd; h2h[t.team].gf += r.gf;
    }
  }
  return [...teams].sort((a, b) => {
    if (h2h[b.team].pts !== h2h[a.team].pts) return h2h[b.team].pts - h2h[a.team].pts;
    if (h2h[b.team].gd !== h2h[a.team].gd) return h2h[b.team].gd - h2h[a.team].gd;
    if (h2h[b.team].gf !== h2h[a.team].gf) return h2h[b.team].gf - h2h[a.team].gf;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return (FIFA_RANK[a.team] || 999) - (FIFA_RANK[b.team] || 999);
  });
}

function calcProjectedQualifiers(playerName) {
  const standings = calcProjectedStandings(playerName);
  const winners = {}, runners = {}, allThirds = [];
  for (const [letter, teams] of Object.entries(standings)) {
    winners[letter] = teams[0].team; runners[letter] = teams[1].team;
    allThirds.push({ ...teams[2], group: letter });
  }
  allThirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || (FIFA_RANK[a.team] || 999) - (FIFA_RANK[b.team] || 999));
  return { winners, runners, qualifyingThirds: allThirds.slice(0, 8) };
}

// ── KNOCKOUT OVERVIEW PANEL ──
const _koZoom = { scale: 1, tx: 0, ty: 0 };

function openKnockoutOverview() {
  let overlay = document.getElementById('koOverlay');
  const isNew = !overlay;
  if (isNew) {
    overlay = document.createElement('div');
    overlay.id = 'koOverlay';
    overlay.className = 'ko-overview-overlay';
    overlay.innerHTML = `
      <div class="ko-ov-header">
        <span class="ko-ov-title">Knockout Bracket</span>
        <button class="ko-ov-close" onclick="closeKnockoutOverview()">✕</button>
      </div>
      <div class="ko-ov-viewport" id="koViewport">
        <div class="ko-ov-inner" id="koInner">
          <div class="ko-bracket-tree" id="koTree"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    _setupKoZoomPan();
  }
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _renderKoBracket();
  setTimeout(_koFitToScreen, 80);
}

function closeKnockoutOverview() {
  const overlay = document.getElementById('koOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function _renderKoBracket() {
  const tree = buildBracketTree();
  const treeEl = document.getElementById('koTree');
  if (!treeEl) return;

  const SLOT_H = 84;
  const TOTAL_H = R32_SLOTS.length * SLOT_H;
  const LABEL_H = 20;
  const CONN_W = 22;

  const roundMatches = {
    R32: R32_SLOTS.map(s => s.match),
    R16: [89, 90, 91, 92, 93, 94, 95, 96],
    QF:  [97, 98, 99, 100],
    SF:  [101, 102],
    Final: [104],
  };
  const rounds = ['R32', 'R16', 'QF', 'SF', 'Final'];

  const allSlots = [
    ...R32_SLOTS.map(s => ({ match: s.match, home: s.home, away: s.away })),
    ...KNOCKOUT_BRACKET,
  ];
  const slotByMatch = {};
  allSlots.forEach(s => { slotByMatch[s.match] = s; });

  function parseRef(ref) {
    if (!ref) return null;
    const m = ref.match(/^[WL](\d+)$/);
    return m ? parseInt(m[1]) : null;
  }
  function feedersOf(num) {
    const s = slotByMatch[num];
    if (!s) return [];
    return [parseRef(s.home), parseRef(s.away)].filter(f => f != null);
  }

  const r32Order = [];
  (function dfs(num) {
    const feeders = feedersOf(num);
    if (!feeders.length) { r32Order.push(num); return; }
    feeders.forEach(dfs);
  })(104);

  const centerY = {};
  r32Order.forEach((num, i) => { centerY[num] = (i + 0.5) * SLOT_H; });
  ['R16', 'QF', 'SF', 'Final'].forEach(r => {
    (roundMatches[r] || []).forEach(num => {
      const ys = feedersOf(num).map(f => centerY[f]).filter(y => y != null);
      if (ys.length) centerY[num] = ys.reduce((a, b) => a + b, 0) / ys.length;
    });
  });

  let html = '';
  for (let ri = 0; ri < rounds.length; ri++) {
    const round = rounds[ri];
    const matchNums = [...roundMatches[round]].sort((a, b) => (centerY[a] ?? 0) - (centerY[b] ?? 0));

    html += `<div class="ko-col-wrap">`;
    html += `<div class="ko-col-label">${roundShortLabel(round)}</div>`;
    html += `<div class="ko-col" style="height:${TOTAL_H}px">`;
    for (const num of matchNums) {
      const node = tree[num];
      if (!node) continue;
      const cy = centerY[num] ?? 0;
      html += `<div style="position:absolute;left:0;right:0;top:${cy}px;transform:translateY(-50%)">`;
      html += _renderKoNode(node);
      html += `</div>`;
    }
    html += `</div></div>`;

    if (ri < rounds.length - 1) {
      const nextRound = rounds[ri + 1];
      let svgLines = '';
      for (const toNum of roundMatches[nextRound]) {
        const s = slotByMatch[toNum];
        if (!s) continue;
        const f1 = parseRef(s.home), f2 = parseRef(s.away);
        const cy1 = f1 != null ? centerY[f1] : null;
        const cy2 = f2 != null ? centerY[f2] : null;
        const tc = centerY[toNum];
        if (cy1 == null || cy2 == null || tc == null) continue;
        const top = Math.min(cy1, cy2), bot = Math.max(cy1, cy2), mid = (top + bot) / 2;
        svgLines += `<line x1="0" y1="${top}" x2="0" y2="${bot}" stroke="var(--text-muted)" stroke-width="1" stroke-opacity="0.4"/>`;
        svgLines += `<line x1="0" y1="${mid}" x2="${CONN_W}" y2="${tc}" stroke="var(--text-muted)" stroke-width="1" stroke-opacity="0.4"/>`;
      }
      html += `<div class="ko-conn-col">`;
      html += `<div style="height:${LABEL_H}px;flex-shrink:0"></div>`;
      html += `<div style="position:relative;height:${TOTAL_H}px;width:${CONN_W}px;flex-shrink:0">`;
      html += `<svg width="${CONN_W}" height="${TOTAL_H}" viewBox="0 0 ${CONN_W} ${TOTAL_H}" style="position:absolute;inset:0">${svgLines}</svg>`;
      html += `</div></div>`;
    }
  }
  treeEl.innerHTML = html;
}

function _renderKoNode(node) {
  const done = node.isComplete && node.score1 !== null && node.score2 !== null;
  const homeWon = done && node.score1 > node.score2;
  const awayWon = done && node.score2 > node.score1;
  const hIso = node.home ? teamIso[node.home] : null;
  const aIso = node.away ? teamIso[node.away] : null;
  const hFlag = hIso
    ? `<img src="${flagUrl(hIso)}" class="ko-f" alt="" onerror="this.style.display='none'">`
    : '<span class="ko-f-ph"></span>';
  const aFlag = aIso
    ? `<img src="${flagUrl(aIso)}" class="ko-f" alt="" onerror="this.style.display='none'">`
    : '<span class="ko-f-ph"></span>';
  const hCls = homeWon ? ' ko-w' : awayWon ? ' ko-l' : '';
  const aCls = awayWon ? ' ko-w' : homeWon ? ' ko-l' : '';
  const nodeCls = done ? ' ko-done' : (node.home || node.away) ? ' ko-up' : '';
  let dateLine = '';
  if (node.date) {
    const d = new Date(node.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeStr = node.time ? formatLocalTime(node.date, node.time, node.tz) : '';
    dateLine = `<div class="ko-dt">${dateStr}${timeStr ? ' · ' + timeStr : ''}</div>`;
  }
  return `<div class="ko-node${nodeCls}">` +
    dateLine +
    `<div class="ko-tr${hCls}">${hFlag}<span class="ko-nm">${escapeHtml(node.home || '?')}</span>${done ? `<span class="ko-sc">${node.score1}</span>` : ''}</div>` +
    `<div class="ko-tr${aCls}">${aFlag}<span class="ko-nm">${escapeHtml(node.away || '?')}</span>${done ? `<span class="ko-sc">${node.score2}</span>` : ''}</div>` +
    `</div>`;
}

function _applyKoTransform() {
  const inner = document.getElementById('koInner');
  if (inner) inner.style.transform = `translate(${_koZoom.tx}px,${_koZoom.ty}px) scale(${_koZoom.scale})`;
}

function _koFitToScreen() {
  const vp = document.getElementById('koViewport');
  const inner = document.getElementById('koInner');
  if (!vp || !inner) return;
  const vw = vp.clientWidth, vh = vp.clientHeight;
  const cw = inner.offsetWidth, ch = inner.offsetHeight;
  if (!cw || !ch) return;
  const s = Math.min(vw / cw, vh / ch) * 0.88;
  _koZoom.scale = s;
  _koZoom.tx = (vw - cw * s) / 2;
  _koZoom.ty = (vh - ch * s) / 2;
  _applyKoTransform();
}

function _setupKoZoomPan() {
  const vp = document.getElementById('koViewport');
  if (!vp) return;

  let panning = false, panStart = null, pinchStart = null;

  vp.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      panning = false;
      const t1 = e.touches[0], t2 = e.touches[1];
      pinchStart = {
        dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
        scale: _koZoom.scale, tx: _koZoom.tx, ty: _koZoom.ty,
      };
    } else if (e.touches.length === 1) {
      pinchStart = null; panning = true;
      panStart = { x: e.touches[0].clientX - _koZoom.tx, y: e.touches[0].clientY - _koZoom.ty };
    }
  }, { passive: false });

  vp.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchStart) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const ratio = dist / pinchStart.dist;
      const ns = Math.max(0.15, Math.min(8, pinchStart.scale * ratio));
      const sr = ns / pinchStart.scale;
      _koZoom.scale = ns;
      _koZoom.tx = midX - (pinchStart.midX - pinchStart.tx) * sr;
      _koZoom.ty = midY - (pinchStart.midY - pinchStart.ty) * sr;
      _applyKoTransform();
    } else if (e.touches.length === 1 && panning && panStart) {
      _koZoom.tx = e.touches[0].clientX - panStart.x;
      _koZoom.ty = e.touches[0].clientY - panStart.y;
      _applyKoTransform();
    }
  }, { passive: false });

  vp.addEventListener('touchend', e => {
    if (e.touches.length < 2) pinchStart = null;
    if (e.touches.length === 0) { panning = false; panStart = null; }
  });

  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    const ns = Math.max(0.15, Math.min(8, _koZoom.scale * factor));
    const ratio = ns / _koZoom.scale;
    _koZoom.tx = mx - (mx - _koZoom.tx) * ratio;
    _koZoom.ty = my - (my - _koZoom.ty) * ratio;
    _koZoom.scale = ns;
    _applyKoTransform();
  }, { passive: false });
}
