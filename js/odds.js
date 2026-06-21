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

function fmtVol(v) {
  if (v >= 1e9) return `$${(v/1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v/1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
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

    const items = [];

    const wc = winnerRes[0];
    if (wc) {
      const topMarkets = (wc.markets || [])
        .filter(m => { const p = safePrices(m); return p && p[0] > 0.05; })
        .sort((a,b) => safePrices(b)[0] - safePrices(a)[0])
        .slice(0,4);
      const oddsStr = topMarkets.map(m => `${oddsTeamName(m.question)} ${fmtPct(safePrices(m)[0])}`).join(' · ');
      items.push({ type:'winner', oddsStr, vol: wc.volume || 0 });
    }

    for (const events of matchRes) {
      const ev = events[0];
      if (!ev || !ev.markets) continue;
      const winMarkets = ev.markets.filter(m => !m.question.toLowerCase().includes('draw') && safePrices(m));
      const drawMarket = ev.markets.find(m => m.question.toLowerCase().includes('draw') && safePrices(m));
      if (winMarkets.length < 2) continue;
      const [p1, p2] = winMarkets.map(m => safePrices(m)[0]);
      const dp = drawMarket ? safePrices(drawMarket)[0] : null;
      const [n1, n2] = winMarkets.map(m => oddsTeamName(m.question));
      const line = `${n1} ${fmtPct(p1)} · ${dp ? `DRAW ${fmtPct(dp)} · ` : ''}${n2} ${fmtPct(p2)}`;
      items.push({ type:'match', match: `${n1} vs ${n2}`, line, vol: parseFloat(ev.volume || 0) });
    }

    if (!items.length) return;

    const buildItems = () => items.map(item => {
      if (item.type === 'winner') {
        return `<span class="odds-item"><span class="oi-match">🏆 WORLD CUP WINNER</span><span>—</span><span class="oi-prob">${item.oddsStr}</span><span class="oi-vol">${fmtVol(item.vol)} WAGERED</span></span><span class="odds-divider">|</span>`;
      }
      return `<span class="odds-item"><span class="oi-match">${item.match}</span><span>·</span><span class="oi-prob">${item.line}</span><span class="oi-vol">${fmtVol(item.vol)} WAGERED</span></span><span class="odds-divider">|</span>`;
    }).join('');

    const track = document.getElementById('oddsTrack');
    track.innerHTML = buildItems() + buildItems();
    void track.offsetWidth;
    const oddsSingleWidth = track.scrollWidth / 2;
    const oddsDur = Math.max(10, oddsSingleWidth / 90).toFixed(1);
    track.style.animation = `odds-scroll ${oddsDur}s linear infinite`;
    track.style.animationPlayState = '';
    track.classList.add('scrolling');
  } catch (e) {
    console.warn('Polymarket ticker failed to load:', e);
  }
}

// loadOdds() and loadStatsTracker() are called from main.js after matchData is populated by loadData()

// ── TOURNAMENT STATS TICKER ──
let _statsCategories = [];
let _statsCatIndex = 0;
let _statsGeneration = 0;

function showStatsCategory(index, gen) {
  const track = document.getElementById('statsTrack');
  const brandEl = document.querySelector('.stats-label .sl-brand');
  if (!track || !brandEl || !_statsCategories.length) return;

  const cat = _statsCategories[index % _statsCategories.length];

  brandEl.style.opacity = '0';
  track.style.opacity = '0';

  setTimeout(() => {
    if (gen !== _statsGeneration) return;

    brandEl.textContent = cat.label;
    track.style.animation = 'none';
    track.innerHTML = cat.html + cat.html;
    void track.offsetWidth;

    const singleWidth = track.scrollWidth / 2;
    const dur = Math.max(8, singleWidth / 90).toFixed(1);
    track.style.animation = `stats-scroll ${dur}s linear infinite`;
    track.style.animationPlayState = '';

    brandEl.style.opacity = '1';
    track.style.opacity = '1';

    // Show for ~2 full passes (min 8s, max 20s) then advance
    const displayMs = Math.min(20000, Math.max(8000, (singleWidth / 90) * 2000));
    setTimeout(() => {
      if (gen !== _statsGeneration) return;
      _statsCatIndex = (_statsCatIndex + 1) % _statsCategories.length;
      showStatsCategory(_statsCatIndex, gen);
    }, displayMs);
  }, 350);
}

async function loadStatsTracker() {
  const track = document.getElementById('statsTrack');
  if (!track) return;

  const played = matchData.filter(m => m.isComplete);

  // Clean sheets (goals conceded = 0)
  const cleanSheets = {};
  for (const m of played) {
    if (m.score2 === 0) cleanSheets[m.team1] = (cleanSheets[m.team1] || 0) + 1;
    if (m.score1 === 0) cleanSheets[m.team2] = (cleanSheets[m.team2] || 0) + 1;
  }
  const topCleanSheets = Object.entries(cleanSheets)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Most goals scored
  const goalsFor = {};
  for (const m of played) {
    goalsFor[m.team1] = (goalsFor[m.team1] || 0) + m.score1;
    goalsFor[m.team2] = (goalsFor[m.team2] || 0) + m.score2;
  }
  const topGoals = Object.entries(goalsFor)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Biggest wins (show winner first)
  const biggestWins = played
    .map(m => {
      const diff = m.score1 - m.score2;
      if (diff > 0) return { label: `${m.team1.toUpperCase()} ${m.score1}–${m.score2} ${m.team2.toUpperCase()}`, diff };
      if (diff < 0) return { label: `${m.team2.toUpperCase()} ${m.score2}–${m.score1} ${m.team1.toUpperCase()}`, diff: -diff };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  // Tournament totals
  const totalGoals = played.reduce((s, m) => s + m.score1 + m.score2, 0);
  const avgGoals = played.length ? (totalGoals / played.length).toFixed(1) : '0.0';

  // Optional API: scorers from football-data.org
  let topScorers = [];
  let topAssisters = [];
  if (typeof FOOTBALL_DATA_TOKEN === 'string' && FOOTBALL_DATA_TOKEN) {
    try {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/scorers?limit=10', {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
      });
      if (res.ok) {
        const data = await res.json();
        const scorers = data.scorers || [];
        topScorers = scorers
          .filter(s => s.goals > 0)
          .slice(0, 5)
          .map(s => ({ name: s.player.name.toUpperCase(), stat: `${s.goals}G` }));
        topAssisters = scorers
          .filter(s => (s.assists || 0) > 0)
          .sort((a, b) => (b.assists || 0) - (a.assists || 0))
          .slice(0, 5)
          .map(s => ({ name: s.player.name.toUpperCase(), stat: `${s.assists}A` }));
      }
    } catch (e) {
      console.warn('Stats ticker: API fetch failed', e);
    }
  }

  // Build per-category HTML
  const dot = '<span class="st-divider">\xB7</span>';
  const itm = (name, stat) =>
    `<span class="st-item"><span class="si-name">${escapeHtml(name)}</span><span class="si-stat">${escapeHtml(stat)}</span></span>`;
  const teamItm = (rank, teamName, stat) => {
    const iso = teamIso[teamName];
    const flag = iso ? `<img class="si-flag" src="${flagUrl(iso)}" alt="">` : '';
    return `<span class="st-item">${flag}<span class="si-rank">${rank}</span><span class="si-name">${escapeHtml(teamName.toUpperCase())}</span><span class="si-stat">${escapeHtml(stat)}</span></span>`;
  };

  const categories = [];

  if (topScorers.length)
    categories.push({ label: 'GOLDEN BOOT', html: topScorers.map((s, i) => itm(`${i + 1}. ${s.name}`, s.stat)).join(dot) });

  if (topAssisters.length)
    categories.push({ label: 'TOP ASSISTS', html: topAssisters.map((s, i) => itm(`${i + 1}. ${s.name}`, s.stat)).join(dot) });

  if (topCleanSheets.length)
    categories.push({ label: 'CLEAN SHEETS', html: topCleanSheets.map(([t, n], i) => teamItm(i + 1, t, `${n} CS`)).join(dot) });

  if (topGoals.length)
    categories.push({ label: 'MOST GOALS', html: topGoals.map(([t, n], i) => teamItm(i + 1, t, `${n}G`)).join(dot) });

  if (biggestWins.length)
    categories.push({ label: 'BIGGEST WIN', html: biggestWins.map(w =>
      `<span class="st-item"><span class="si-name">${escapeHtml(w.label)}</span></span>`
    ).join(dot) });

  if (played.length)
    categories.push({ label: 'TOURNAMENT', html:
      itm(`${totalGoals} GOALS`, `IN ${played.length} GAMES`) + dot + itm(avgGoals, 'PER GAME')
    });

  if (!categories.length) {
    track.innerHTML = '<span class="stats-loading">NO MATCH DATA YET</span>';
    track.classList.remove('scrolling');
    return;
  }

  _statsCategories = categories;
  _statsCatIndex = 0;
  _statsGeneration++;
  showStatsCategory(0, _statsGeneration);
}
