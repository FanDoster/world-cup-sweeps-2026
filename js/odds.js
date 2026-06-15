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
const POLYMARKET_SLUGS = [
  'fifwc-can-bih-2026-06-12',
  'fifwc-usa-par-2026-06-12',
  'fifwc-qat-che-2026-06-13',
  'fifwc-bra-mar-2026-06-13',
  'fifwc-hai-sco-2026-06-13',
  'fifwc-ger-kor-2026-06-14',
  'fifwc-nld-jpn-2026-06-14',
  'fifwc-esp-cvi-2026-06-15',
  'fifwc-fra-sen-2026-06-16',
];

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
    const [matchRes, winnerRes] = await Promise.all([
      Promise.all(POLYMARKET_SLUGS.map(slug =>
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

loadOdds();
