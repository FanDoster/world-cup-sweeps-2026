// ── BROADCAST CLOCK ──
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('tcTime').textContent = `${h}:${m}:${s}`;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('tcDate').textContent =
    `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── POLYMARKET ODDS TICKER ──

// Maps team ISO codes (from teamIso global) → Polymarket 3-letter slug codes
const ISO_TO_POLY = {
  'us': 'usa', 'ca': 'can', 'br': 'bra', 'fr': 'fra', 'de': 'ger',
  'es': 'esp', 'nl': 'nld', 'gb-eng': 'eng', 'gb-sct': 'sco',
  'jp': 'jpn', 'kr': 'kor', 'ar': 'arg', 'pt': 'por', 'uy': 'uru',
  'py': 'par', 'ec': 'ecu', 'co': 'col', 'mx': 'mex', 'ma': 'mar',
  'sn': 'sen', 'gh': 'gha', 'eg': 'egy', 'dz': 'alg', 'tn': 'tun',
  'za': 'rsa', 'cd': 'cod', 'cv': 'cvi', 'be': 'bel', 'ch': 'che',
  'at': 'aut', 'hr': 'cro', 'cz': 'cze', 'se': 'swe', 'no': 'nor',
  'tr': 'tur', 'ir': 'irn', 'iq': 'irq', 'sa': 'ksa', 'qa': 'qat',
  'jo': 'jor', 'uz': 'uzb', 'au': 'aus', 'nz': 'nzl', 'ht': 'hai',
  'pa': 'pan', 'ci': 'civ', 'cw': 'cur', 'ba': 'bih',
};

function getMatchSlugs() {
  if (!matchData.length) return [];
  const todayStr = new Date().toISOString().slice(0, 10);
  return matchData
    .filter(m => m.date >= todayStr && !m.isComplete)
    .slice(0, 9)
    .map(m => {
      const poly1 = ISO_TO_POLY[teamIso[m.team1]];
      const poly2 = ISO_TO_POLY[teamIso[m.team2]];
      return poly1 && poly2 ? `fifwc-${poly1}-${poly2}-${m.date}` : null;
    })
    .filter(Boolean);
}

function fmtPct(p) { return `${Math.round(p * 100)}%`; }

function safePrices(m) {
  try { return m.outcomePrices ? JSON.parse(m.outcomePrices) : null; } catch { return null; }
}

function oddsTeamName(question) {
  return question.replace(/will /i,'').replace(/ win.*/i,'').replace(/ vs\..*/i,'').trim().toUpperCase();
}

async function loadOdds() {
  try {
    const slugs = getMatchSlugs();
    if (!slugs.length) return;

    const [matchRes, winnerRes] = await Promise.all([
      Promise.all(slugs.map(slug =>
        fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`).then(r => r.json())
      )),
      fetch('https://gamma-api.polymarket.com/events?slug=world-cup-winner').then(r => r.json())
    ]);

    const chips = [];

    // Top 4 World Cup winner odds
    const wc = winnerRes[0];
    if (wc) {
      const topMarkets = (wc.markets || [])
        .filter(m => { const p = safePrices(m); return p && p[0] > 0.05; })
        .sort((a, b) => safePrices(b)[0] - safePrices(a)[0])
        .slice(0, 4);
      for (const m of topMarkets) {
        const name = oddsTeamName(m.question);
        chips.push(`<span class="odds-chip"><span class="oc-match">🏆</span><span class="oc-name">${escapeHtml(name)}</span><span class="oc-prob">${fmtPct(safePrices(m)[0])}</span></span>`);
      }
    }

    // Today's match odds
    for (const events of matchRes) {
      const ev = events[0];
      if (!ev || !ev.markets) continue;
      const winMarkets = ev.markets.filter(m => !m.question.toLowerCase().includes('draw') && safePrices(m));
      const drawMarket = ev.markets.find(m => m.question.toLowerCase().includes('draw') && safePrices(m));
      if (winMarkets.length < 2) continue;
      const [p1, p2] = winMarkets.map(m => safePrices(m)[0]);
      const dp = drawMarket ? safePrices(drawMarket)[0] : null;
      const [n1, n2] = winMarkets.map(m => oddsTeamName(m.question));
      const probStr = `${fmtPct(p1)}${dp ? ` · D ${fmtPct(dp)}` : ''} · ${fmtPct(p2)}`;
      chips.push(`<span class="odds-chip"><span class="oc-match">${escapeHtml(n1)} vs ${escapeHtml(n2)}</span><span class="oc-prob">${escapeHtml(probStr)}</span></span>`);
    }

    if (!chips.length) return;
    document.getElementById('oddsTrack').innerHTML = chips.join('');
  } catch (e) {
    console.warn('Polymarket chips failed to load:', e);
  }
}

// loadOdds() and loadStatsTracker() are called from main.js after matchData is populated by loadData()

// ── TOURNAMENT STATS TICKER ──

async function loadStatsTracker() {
  const track = document.getElementById('statsTrack');
  const brandEl = document.querySelector('.stats-label .sl-brand');
  if (!track) return;

  const played = matchData.filter(m => m.isComplete);
  let chips = [];
  let categoryLabel = '';

  if (typeof FOOTBALL_DATA_TOKEN === 'string' && FOOTBALL_DATA_TOKEN) {
    try {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/scorers?limit=10', {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
      });
      if (res.ok) {
        const data = await res.json();
        const topScorers = (data.scorers || []).filter(s => s.goals > 0).slice(0, 5);
        if (topScorers.length) {
          categoryLabel = 'GOLDEN BOOT';
          chips = topScorers.map((s, i) =>
            `<span class="stats-chip"><span class="sc-rank">${i + 1}</span><span class="sc-name">${escapeHtml(s.player.name.toUpperCase())}</span><span class="sc-stat">${s.goals}G</span></span>`
          );
        }
      }
    } catch (e) {
      console.warn('Stats chips: API fetch failed', e);
    }
  }

  if (!chips.length && played.length) {
    const goalsFor = {};
    for (const m of played) {
      goalsFor[m.team1] = (goalsFor[m.team1] || 0) + m.score1;
      goalsFor[m.team2] = (goalsFor[m.team2] || 0) + m.score2;
    }
    categoryLabel = 'MOST GOALS';
    chips = Object.entries(goalsFor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([teamName, n], i) => {
        const iso = teamIso[teamName];
        const flag = iso ? `<img class="sc-flag" src="${flagUrl(iso)}" alt="">` : '';
        return `<span class="stats-chip">${flag}<span class="sc-rank">${i + 1}</span><span class="sc-name">${escapeHtml(teamName.toUpperCase())}</span><span class="sc-stat">${n}G</span></span>`;
      });
  }

  if (!chips.length) {
    track.innerHTML = '<span class="stats-loading">NO MATCH DATA YET</span>';
    return;
  }

  if (brandEl) brandEl.textContent = categoryLabel;
  track.innerHTML = chips.join('');
}
