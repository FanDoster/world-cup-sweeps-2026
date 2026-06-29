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
      // Both unknown (3rd vs 3rd or similar) — fallback to date grouping
      // This shouldn't happen in R32 but just in case
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
      feederHome: null, feederAway: null,
    };
  }

  // Later rounds
  for (const kb of KNOCKOUT_BRACKET) {
    // Look for existing match data by round + date
    const existing = matchData.find(m => m.round === kb.round && m.team1 && m.team2);
    const homeRef = parseInt(kb.home.substring(1));
    const awayRef = parseInt(kb.away.substring(1));

    let homeTeam = existing ? existing.team1 : null;
    let awayTeam = existing ? existing.team2 : null;
    let score1 = existing ? existing.score1 : null;
    let score2 = existing ? existing.score2 : null;
    let isComplete = existing ? existing.isComplete : false;
    let date = existing ? existing.date : null;
    let time = existing ? existing.time : null;
    let tz = existing ? existing.tz : null;
    let channel = existing ? existing.channel : null;

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
      feederHome: homeRef, feederAway: awayRef,
    };
  }

  bracketTreeCache = tree;
  return tree;
}

// ── RENDER NODE HTML ──
function renderBracketNode(node) {
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
  }

  const homeIso = node.home ? teamIso[node.home] : null;
  const awayIso = node.away ? teamIso[node.away] : null;
  const homeOwner = node.home ? teamOwner[node.home] : null;
  const awayOwner = node.away ? teamOwner[node.away] : null;

  const homeFlag = homeIso ? `<img class="bracket-flag" src="${flagUrl(homeIso)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  const awayFlag = awayIso ? `<img class="bracket-flag" src="${flagUrl(awayIso)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';

  const key = node.home && node.away ? `${node.home}|${node.away}|${node.date}` : '';

  // Feed info for TBD slots — show what feeds into this match
  function feederLabel(ref) {
    if (!ref) return 'TBD';
    return `W${ref}`;
  }
  function feederHint(ref) {
    // Show abbreviated team name from feeder match if resolved
    if (!ref) return '';
    const fn = bracketTreeCache[ref];
    if (!fn || !fn.home || !fn.away) return '';
    return `${fn.home.substring(0,3)}/${fn.away.substring(0,3)}`;
  }

  const homeLabel = node.home || feederLabel(node.feederHome);
  const awayLabel = node.away || feederLabel(node.feederAway);
  const homeHint = !node.home && node.feederHome ? feederHint(node.feederHome) : '';
  const awayHint = !node.away && node.feederAway ? feederHint(node.feederAway) : '';

  let html = `<div class="bt-node${cls}"${key ? ` onclick="showPredPanel('${safeAttr(node.home)}|${safeAttr(node.away)}|${node.date}')" style="cursor:pointer"` : ''}>`;
  html += `<div class="bt-team-row${homeCls}">${homeFlag}<span class="bt-team-name">${homeLabel}</span>${isComplete ? `<span class="bt-team-score">${node.score1}</span>` : ''}</div>`;
  html += `<div class="bt-team-row${awayCls}">${awayFlag}<span class="bt-team-name">${awayLabel}</span>${isComplete ? `<span class="bt-team-score">${node.score2}</span>` : ''}</div>`;

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

  html += `</div>`;
  return html;
}

// ── RENDER BRACKET TREE ──
function renderBracket() {
  const section = document.getElementById('sectionBracket');
  if (!section) return;

  const tree = buildBracketTree();

  // Rounds to display
  const rounds = ['R32', 'R16', 'QF', 'SF', 'Final'];

  // Build the round selector
  const selectorHtml = `
    <div class="bracket-round-selector">
      ${rounds.map(r => {
        return `<button class="bracket-round-btn${r === bracketRound ? ' active' : ''}"
          onclick="setBracketRound('${r}')">${roundLabel(r)}</button>`;
      }).join('')}
      <button class="bracket-round-btn${bracketRound === 'all' ? ' active' : ''}"
        onclick="setBracketRound('all')">All Rounds</button>
    </div>`;

  // If viewing a single round, show the list view
  if (bracketRound !== 'all') {
    section.innerHTML = selectorHtml + renderSingleRound(bracketRound, tree);
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
  const SLOT_H = 110; // px per R32 slot
  const TOTAL_H = R32_SLOTS.length * SLOT_H;
  const LABEL_H = 34; // approx px for the round label row

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

  const centerY = {};
  roundMatches['R32'].forEach((num, i) => { centerY[num] = (i + 0.5) * SLOT_H; });
  ['R16', 'QF', 'SF', 'Final'].forEach(r => {
    (roundMatches[r] || []).forEach(num => {
      const s = slotByMatch2[num];
      if (!s) return;
      const f1 = parseRef2(s.home), f2 = parseRef2(s.away);
      const y1 = f1 != null ? centerY[f1] : null;
      const y2 = f2 != null ? centerY[f2] : null;
      if (y1 != null && y2 != null) centerY[num] = (y1 + y2) / 2;
      else if (y1 != null) centerY[num] = y1;
      else if (y2 != null) centerY[num] = y2;
    });
  });

  let colsHtml = '';
  for (let ri = 0; ri < rounds.length; ri++) {
    const round = rounds[ri];
    const matchNums = roundMatches[round];
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

    // Vertical stem on left connecting the two feeder nodes
    svgLines += `<line x1="0" y1="${top}" x2="0" y2="${bot}" stroke="var(--text-muted)" stroke-width="1.5" stroke-opacity="0.5"/>`;
    // Horizontal line from midpoint to right edge (tc === mid since target is positioned at midpoint)
    svgLines += `<line x1="0" y1="${mid}" x2="36" y2="${tc}" stroke="var(--text-muted)" stroke-width="1.5" stroke-opacity="0.5"/>`;
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

function renderSingleRound(round, tree) {
  const roundMatches = {
    'R32': R32_SLOTS.map(s => s.match),
    'R16': [89,90,91,92,93,94,95,96],
    'QF':  [97,98,99,100],
    'SF':  [101,102],
    'Final': [104],
  };
  const matchNums = roundMatches[round];
  if (!matchNums) return `<p class="bracket-empty">Unknown round: ${round}</p>`;

  let html = `<div class="bracket-cards">`;
  for (const num of matchNums) {
    const node = tree[num];
    if (!node) continue;
    const dateStr = node.date ? new Date(node.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

    html += `<div class="bracket-match-card card-base">
      <div class="bracket-card-header">
        <span class="bracket-card-match">${dateStr}</span>
      </div>
      ${renderBracketNode(node)}
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
