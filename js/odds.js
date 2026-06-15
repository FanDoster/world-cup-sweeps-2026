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
    .filter(m => m.date >= todayStr && m.score1 === null && m.score2 === null)
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
    track.classList.add('scrolling');
  } catch (e) {
    console.warn('Polymarket ticker failed to load:', e);
  }
}

// loadOdds() is called from main.js after matchData is populated by loadData()

// ── KICKOFF COUNTDOWN TICKER ──
function buildCountdownTicker() {
  const track = document.getElementById('kickoffTrack');
  if (!track) return;

  const now = new Date();
  const upcoming = matchData
    .filter(m => {
      if (m.score1 !== null && m.score2 !== null) return false;
      const end = new Date(toDate(m.date, m.time, m.tz).getTime() + 2 * 60 * 60 * 1000);
      return end > now;
    })
    .sort((a, b) => toDate(a.date, a.time, a.tz) - toDate(b.date, b.time, b.tz))
    .slice(0, 4);

  if (!upcoming.length) {
    track.innerHTML = '<span class="kickoff-loading">NO UPCOMING MATCHES</span>';
    track.classList.remove('scrolling');
    return;
  }

  const buildItem = m => {
    const iso1 = teamIso[m.team1] || '';
    const iso2 = teamIso[m.team2] || '';
    const cd = getCountdown(m.date, m.time, m.tz);
    const cdClass = cd.cls === 'live-now' ? 'ki-cd ki-live' : 'ki-cd';
    return `<span class="kickoff-item">` +
      `<img class="ki-flag" src="${flagUrl(iso1)}" alt="">` +
      `<span class="ki-team">${escapeHtml(m.team1.toUpperCase())}</span>` +
      `<span class="ki-vs">vs</span>` +
      `<span class="ki-team">${escapeHtml(m.team2.toUpperCase())}</span>` +
      `<img class="ki-flag" src="${flagUrl(iso2)}" alt="">` +
      `<span class="ki-sep">·</span>` +
      `<span class="${cdClass}">${cd.text.toUpperCase()}</span>` +
      `</span><span class="kickoff-divider">|</span>`;
  };

  const html = upcoming.map(buildItem).join('');
  track.innerHTML = html + html;
  track.classList.add('scrolling');
}
