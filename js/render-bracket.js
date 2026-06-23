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

function renderBracket() {
  const section = document.getElementById('sectionBracket');
  if (!section) return;
  section.innerHTML = '<p class="bracket-empty">Bracket loading…</p>';
}
