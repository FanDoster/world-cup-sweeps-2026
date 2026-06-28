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

// Subsequent round pairings — winner references (W73 = winner of match 73)
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

// ── BRACKET STATE ──
let bracketRound = 'R32';

function setBracketRound(round) {
  bracketRound = round;
  renderBracket();
}

function calcProjectedStandings(playerName) {
  // Bucket group stage matches by group letter
  const groupMatches = {};
  for (const m of matchData) {
    if (!m.group) continue;
    if (!groupMatches[m.group]) groupMatches[m.group] = [];
    groupMatches[m.group].push(m);
  }

  const result = {};

  for (const [letter, matches] of Object.entries(groupMatches)) {
    // Initialise record for each team in this group
    const rec = {};
    for (const m of matches) {
      if (!rec[m.team1]) rec[m.team1] = { team: m.team1, pts: 0, gd: 0, gf: 0, h2h: {} };
      if (!rec[m.team2]) rec[m.team2] = { team: m.team2, pts: 0, gd: 0, gf: 0, h2h: {} };
    }

    // Apply each match
    for (const m of matches) {
      let s1, s2;
      if (m.isComplete) {
        s1 = m.score1;
        s2 = m.score2;
      } else {
        // Look up this player's prediction
        const mid = matchIdByTeamDate[`${m.team1}|${m.team2}|${m.date}`];
        const preds = predLookup[mid] || [];
        const pred = preds.find(p => p.player_name === playerName);
        if (pred && pred.home !== undefined && pred.away !== undefined) {
          s1 = pred.home;
          s2 = pred.away;
        } else {
          s1 = 0; s2 = 0; // no prediction → assume 0-0
        }
      }

      const t1 = rec[m.team1];
      const t2 = rec[m.team2];

      // Overall stats
      t1.gf += s1; t1.gd += (s1 - s2);
      t2.gf += s2; t2.gd += (s2 - s1);

      // H2H tracking (each entry tracks stats vs that specific opponent)
      if (!t1.h2h[m.team2]) t1.h2h[m.team2] = { pts: 0, gd: 0, gf: 0 };
      if (!t2.h2h[m.team1]) t2.h2h[m.team1] = { pts: 0, gd: 0, gf: 0 };

      if (s1 > s2) {
        t1.pts += 3;
        t1.h2h[m.team2].pts += 3;
        t1.h2h[m.team2].gd += (s1 - s2); t1.h2h[m.team2].gf += s1;
        t2.h2h[m.team1].gd += (s2 - s1); t2.h2h[m.team1].gf += s2;
      } else if (s2 > s1) {
        t2.pts += 3;
        t2.h2h[m.team1].pts += 3;
        t2.h2h[m.team1].gd += (s2 - s1); t2.h2h[m.team1].gf += s2;
        t1.h2h[m.team2].gd += (s1 - s2); t1.h2h[m.team2].gf += s1;
      } else {
        t1.pts += 1; t2.pts += 1;
        t1.h2h[m.team2].pts += 1; t1.h2h[m.team2].gf += s1;
        t2.h2h[m.team1].pts += 1; t2.h2h[m.team1].gf += s2;
      }
    }

    // Sort: group teams by points tier, apply tiebreakers within each tier
    const teams = Object.values(rec);
    result[letter] = sortGroupStandings(teams);
  }

  return result;
}

// Sort a group's teams with full 2026 tiebreaker chain.
// Note: for 3-way+ ties the H2H step is applied across all tied teams;
// in genuinely equal 3-way ties FIFA would draw lots — FIFA_RANK used instead.
function sortGroupStandings(teams) {
  // Group by points first
  const byPts = {};
  for (const t of teams) {
    if (!byPts[t.pts]) byPts[t.pts] = [];
    byPts[t.pts].push(t);
  }

  const sorted = [];
  for (const pts of Object.keys(byPts).map(Number).sort((a, b) => b - a)) {
    const tier = byPts[pts];
    if (tier.length === 1) {
      sorted.push(tier[0]);
    } else {
      sorted.push(...sortByTiebreakers(tier));
    }
  }
  return sorted;
}

function sortByTiebreakers(teams) {
  // Compute H2H totals among just these teams
  const h2h = {};
  for (const t of teams) {
    h2h[t.team] = { pts: 0, gd: 0, gf: 0 };
    for (const opp of teams) {
      if (opp.team === t.team) continue;
      const r = t.h2h[opp.team] || { pts: 0, gd: 0, gf: 0 };
      h2h[t.team].pts += r.pts;
      h2h[t.team].gd  += r.gd;
      h2h[t.team].gf  += r.gf;
    }
  }

  return [...teams].sort((a, b) => {
    // Steps 1-3: H2H among tied teams
    if (h2h[b.team].pts !== h2h[a.team].pts) return h2h[b.team].pts - h2h[a.team].pts;
    if (h2h[b.team].gd  !== h2h[a.team].gd)  return h2h[b.team].gd  - h2h[a.team].gd;
    if (h2h[b.team].gf  !== h2h[a.team].gf)  return h2h[b.team].gf  - h2h[a.team].gf;
    // Steps 4-5: overall group stats
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // Step 6-7 proxy: FIFA rank (lower = better)
    return (FIFA_RANK[a.team] || 999) - (FIFA_RANK[b.team] || 999);
  });
}

function calcProjectedQualifiers(playerName) {
  const standings = calcProjectedStandings(playerName);
  const winners = {}, runners = {}, allThirds = [];

  for (const [letter, teams] of Object.entries(standings)) {
    winners[letter] = teams[0].team;
    runners[letter] = teams[1].team;
    // Third-placed team with their group for slot assignment
    allThirds.push({ ...teams[2], group: letter });
  }

  // Rank all 12 third-placed teams: pts → GD → GF → FIFA_RANK
  allThirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd  !== a.gd)  return b.gd  - a.gd;
    if (b.gf  !== a.gf)  return b.gf  - a.gf;
    return (FIFA_RANK[a.team] || 999) - (FIFA_RANK[b.team] || 999);
  });

  return {
    winners,
    runners,
    qualifyingThirds: allThirds.slice(0, 8),
  };
}

function calcProjectedBracket(playerName) {
  const { winners, runners, qualifyingThirds } = calcProjectedQualifiers(playerName);
  const bracket = {};

  // Greedy third-place slot assignment: iterate slots in match order,
  // assign the best-ranked unassigned qualifying third whose group is eligible.
  const thirdsLeft = [...qualifyingThirds]; // already sorted best-to-worst

  function resolvePos(pos, thirdPool) {
    if (pos === '3rd') {
      const idx = thirdsLeft.findIndex(t => thirdPool.includes(t.group));
      if (idx === -1) return null;
      const t = thirdsLeft.splice(idx, 1)[0];
      return t.team;
    }
    const placement = pos[0]; // '1' or '2'
    const group = pos[1];     // 'A'-'L'
    return placement === '1' ? (winners[group] || null)
                             : (runners[group]  || null);
  }

  for (const slot of R32_SLOTS) {
    bracket[slot.match] = {
      home: resolvePos(slot.home, slot.thirdPool),
      away: resolvePos(slot.away, slot.thirdPool),
    };
  }

  return bracket;
}

function renderBracket() {
  const section = document.getElementById('sectionBracket');
  if (!section) return;

  // Detect which rounds have real knockout matches in the DB
  const realRounds = new Set(matchData.filter(m => m.round).map(m => m.round));

  // Round selector
  const rounds = [
    { id: 'R32',   label: 'R32' },
    { id: 'R16',   label: 'R16' },
    { id: 'QF',    label: 'QF' },
    { id: 'SF',    label: 'SF' },
    { id: 'Final', label: 'Final' },
  ];

  const selectorHtml = `
    <div class="bracket-round-selector">
      ${rounds.map(r => {
        const available = realRounds.has(r.id);
        return `<button class="bracket-round-btn${r.id === bracketRound ? ' active' : ''}${!available ? ' disabled' : ''}"
          onclick="${available ? `setBracketRound('${r.id}')` : ''}">${r.label}</button>`;
      }).join('')}
    </div>`;

  // Calculate all players' projected brackets (used for projection rows)
  const allBrackets = {};
  for (const player of PLAYERS) {
    allBrackets[player] = calcProjectedBracket(player);
  }

  let cardsHtml = '';

  if (bracketRound === 'R32') {
    // Show real R32 fixtures with projections
    const realR32 = matchData.filter(m => m.round === 'R32').sort((a, b) => a.date.localeCompare(b.date));
    
    // Build a lookup: "team1|team2|date" → R32 slot (to match projections)
    const slotByMatch = {};
    for (const slot of R32_SLOTS) {
      // Match real data against slots by looking at which teams fill each slot
      const projHome = allBrackets['Dan']?.[slot.match]?.home;
      const projAway = allBrackets['Dan']?.[slot.match]?.away;
      if (projHome && projAway) {
        slotByMatch[`${projHome}|${projAway}`] = slot;
        slotByMatch[`${projAway}|${projHome}`] = slot;
      }
    }

    cardsHtml = realR32.map(m => {
      const date = new Date(m.date + 'T12:00:00');
      const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const localTime = formatLocalTime(m.date, m.time, m.tz);
      const isComplete = m.isComplete && m.score1 !== null && m.score2 !== null;
      
      // Find matching slot for projections and match number
      const key = `${m.team1}|${m.team2}|${m.date}`;
      const slotKey = `${m.team1}|${m.team2}`;
      const slotKeyRev = `${m.team2}|${m.team1}`;
      const slot = slotByMatch[slotKey] || slotByMatch[slotKeyRev];
      const matchNum = slot ? slot.match : '?';

      // Team owners
      const o1 = teamOwner[m.team1];
      const o2 = teamOwner[m.team2];

      // Player projections for this match
      const homeTeams = PLAYERS.map(p => allBrackets[p][matchNum]?.home);
      const awayTeams = PLAYERS.map(p => allBrackets[p][matchNum]?.away);

      // Score display
      let scoreHtml = '';
      if (isComplete) {
        scoreHtml = `<div class="bracket-score-line">
          <span class="bracket-score">${m.score1} – ${m.score2}</span>
          <span class="bracket-status">FT</span>
        </div>`;
      } else {
        const cd = getCountdown(m.date, m.time, m.tz);
        scoreHtml = `<div class="bracket-kickoff-line">
          <span class="bracket-local-time">${localTime}</span>
          <span class="bracket-countdown">${cd.text || ''}</span>
        </div>`;
      }

      // Player projection rows
      let rowsHtml = PLAYERS.map(p => {
        const home = allBrackets[p][matchNum]?.home;
        const away = allBrackets[p][matchNum]?.away;
        const ownsHome = home && teamOwner[home] === p;
        const ownsAway = away && teamOwner[away] === p;
        const correctCall = isComplete && home === m.team1 && away === m.team2 ? ' bracket-correct-call' : '';
        return `<div class="bracket-player-row${correctCall}">
          <span class="bracket-player-name ${ownerColour(p)}">${p}</span>
          <span class="bracket-team${ownsHome ? ' bracket-team-owned' : ''}">${home ? bracketTeam(home) : '?'}</span>
          <span class="bracket-vs">vs</span>
          <span class="bracket-team${ownsAway ? ' bracket-team-owned' : ''}">${away ? bracketTeam(away) : '?'}</span>
        </div>`;
      }).join('');

      // Badge
      const badgeHtml = isComplete ? '<span class="bracket-completed-badge">Played</span>' : '<span class="bracket-projected-badge">Upcoming</span>';

      return `<div class="bracket-match-card card-base">
        <div class="bracket-match-header">
          <span class="bracket-match-num">Match ${matchNum} · ${dateStr}</span>
          ${badgeHtml}
        </div>
        <div class="bracket-real-fixture">
          <div class="bracket-real-teams">
            ${bracketTeam(m.team1)}${o1 ? `<span class="match-owner ${ownerColors[o1]}" style="margin-left:6px">${o1}</span>` : ''}
            <span class="bracket-real-vs">vs</span>
            ${bracketTeam(m.team2)}${o2 ? `<span class="match-owner ${ownerColors[o2]}" style="margin-left:6px">${o2}</span>` : ''}
          </div>
          ${scoreHtml}
        </div>
        <div class="bracket-player-rows">${rowsHtml}</div>
      </div>`;
    }).join('');
  } else {
    // R16 and beyond: show progression from previous round results
    const roundMatches = matchData.filter(m => m.round === bracketRound).sort((a, b) => a.date.localeCompare(b.date));
    
    if (roundMatches.length > 0) {
      // Build a winner lookup: matchId → winning team
      const winnerByMatch = {};
      for (const m of matchData) {
        if (m.isComplete && m.score1 !== null && m.score2 !== null) {
          // Find match ID from matchIdByTeamDate
          const key = `${m.team1}|${m.team2}|${m.date}`;
          const mid = matchIdByTeamDate[key];
          if (mid) {
            winnerByMatch[mid] = m.score1 > m.score2 ? m.team1 : m.team2;
          }
        }
      }

      // Find the bracket entries for this round
      const bracketEntries = KNOCKOUT_BRACKET.filter(k => k.round === bracketRound);
      
      cardsHtml = roundMatches.map(m => {
        const date = new Date(m.date + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const localTime = formatLocalTime(m.date, m.time, m.tz);

        // Resolve the Wxx / Lxx references
        const entry = bracketEntries.find(e => {
          const bkKey = `${m.team1}|${m.team2}|${m.date}`;
          // match by date and time since teams are NULL
          return e.match && m.date;
        });
        
        // Try to resolve winners from previous round
        let homeTeam = m.team1 || 'TBD';
        let awayTeam = m.team2 || 'TBD';
        
        // If teams are NULL, try to resolve from KNOCKOUT_BRACKET references
        if (!m.team1 || !m.team2) {
          // Find bracket entry by date matching
          for (const kb of KNOCKOUT_BRACKET) {
            if (kb.round !== bracketRound) continue;
            // Match by position (index within round)
            const idx = roundMatches.indexOf(m);
            const kbIdx = KNOCKOUT_BRACKET.filter(k => k.round === bracketRound).indexOf(kb);
            if (idx === kbIdx) {
              // Resolve winner references
              if (kb.home.startsWith('W')) {
                const prevMatchId = parseInt(kb.home.substring(1));
                const key = Object.keys(matchIdByTeamDate).find(k => matchIdByTeamDate[k] === prevMatchId);
                if (key && winnerByMatch[prevMatchId]) homeTeam = winnerByMatch[prevMatchId];
              }
              if (kb.away.startsWith('W')) {
                const prevMatchId = parseInt(kb.away.substring(1));
                const key = Object.keys(matchIdByTeamDate).find(k => matchIdByTeamDate[k] === prevMatchId);
                if (key && winnerByMatch[prevMatchId]) awayTeam = winnerByMatch[prevMatchId];
              }
              break;
            }
          }
        }

        return `<div class="bracket-match-card card-base">
          <div class="bracket-match-header">
            <span class="bracket-match-num">${dateStr} · ${localTime}</span>
          </div>
          <div class="bracket-real-fixture">
            <div class="bracket-real-teams">
              ${homeTeam !== 'TBD' ? bracketTeam(homeTeam) : '<span class="bracket-tbd">TBD</span>'}
              <span class="bracket-real-vs">vs</span>
              ${awayTeam !== 'TBD' ? bracketTeam(awayTeam) : '<span class="bracket-tbd">TBD</span>'}
            </div>
          </div>
        </div>`;
      }).join('');
    } else {
      cardsHtml = `<p class="bracket-empty">${roundLabel(bracketRound)} fixtures will appear here once confirmed.</p>`;
    }
  }

  section.innerHTML = selectorHtml + `<div class="bracket-cards">${cardsHtml}</div>`;
}

// Render a team name with its flag
function bracketTeam(teamName) {
  const iso = teamIso[teamName];
  const flag = iso ? `<img src="${flagUrl(iso)}" class="bracket-flag" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  return `<span class="bracket-team">${flag}${escapeHtml(teamName)}</span>`;
}

// Map player name to owner CSS colour class
function ownerColour(playerName) {
  return ownerColors[playerName] || '';
}
