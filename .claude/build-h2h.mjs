// One-off: crunch martj42/international_results into a compact H2H lookup
// for all pairs among the 48 qualified 2026 World Cup teams.
// Output: h2h-data.js defining const H2H_DATA = { "TeamA|TeamB": {...} }
// (key is the two app team names sorted alphabetically, joined with |)
import { readFileSync, writeFileSync } from 'node:fs';

const TEAMS = [
  'Mexico','South Africa','South Korea','Czech Republic',
  'Canada','Bosnia & Herzegovina','Qatar','Switzerland',
  'Brazil','Morocco','Haiti','Scotland',
  'United States','Paraguay','Australia','Turkey',
  'Germany','Curaçao','Ivory Coast','Ecuador',
  'Netherlands','Japan','Sweden','Tunisia',
  'Belgium','Egypt','Iran','New Zealand',
  'Spain','Cape Verde','Saudi Arabia','Uruguay',
  'France','Senegal','Iraq','Norway',
  'Argentina','Algeria','Austria','Jordan',
  'Portugal','DR Congo','Uzbekistan','Colombia',
  'England','Croatia','Ghana','Panama',
];

// dataset name -> our app name (where they differ)
const ALIASES = {
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Türkiye': 'Turkey',
  'Czechia': 'Czech Republic',
};

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

// Fold former names (e.g. Zaïre -> DR Congo) into current names
const formerRows = parseCsv(readFileSync(new URL('./former_names.csv', import.meta.url), 'utf8'));
const formerHeader = formerRows.shift();
const formerMap = {}; // former -> current
for (const r of formerRows) formerMap[r[1]] = r[0];

const ourName = (raw) => {
  const current = formerMap[raw] || raw;
  const mapped = ALIASES[current] || current;
  return TEAMS.includes(mapped) ? mapped : null;
};

const rows = parseCsv(readFileSync(new URL('./results.csv', import.meta.url), 'utf8'));
rows.shift(); // header: date,home_team,away_team,home_score,away_score,tournament,city,country,neutral

const h2h = {};
const teamMatchCounts = Object.fromEntries(TEAMS.map(t => [t, 0]));

for (const r of rows) {
  const [date, home, away, hsRaw, asRaw, tournament] = r;
  const a = ourName(home), b = ourName(away);
  if (!a || !b) continue;
  const hs = parseInt(hsRaw), as = parseInt(asRaw);
  if (isNaN(hs) || isNaN(as)) continue; // future fixtures have empty scores
  teamMatchCounts[a]++; teamMatchCounts[b]++;

  const [t1, t2] = [a, b].sort();
  const key = t1 + '|' + t2;
  const e = h2h[key] ??= { m: 0, w: [0, 0], d: 0, g: [0, 0], wc: [0, 0, 0, 0], f: null, l: null, b: null };
  // scores from t1's perspective
  const s1 = a === t1 ? hs : as;
  const s2 = a === t1 ? as : hs;
  e.m++;
  e.g[0] += s1; e.g[1] += s2;
  if (s1 > s2) e.w[0]++; else if (s2 > s1) e.w[1]++; else e.d++;
  const isWC = tournament === 'FIFA World Cup';
  if (isWC) { e.wc[0]++; if (s1 > s2) e.wc[1]++; else if (s1 === s2) e.wc[2]++; else e.wc[3]++; }
  const year = +date.slice(0, 4);
  if (e.f === null) e.f = year;
  e.l = { y: year, h: a, s: hs + '–' + as, t: tournament }; // rows are chronological
  const margin = Math.abs(hs - as);
  if (margin > 0 && (!e.b || margin > e.b.mg)) e.b = { y: year, h: a, s: hs + '–' + as, mg: margin };
}

// sanity: teams with suspiciously few matches indicate a name mapping problem
const suspicious = Object.entries(teamMatchCounts).filter(([, n]) => n < 5);
console.log('pairs with history:', Object.keys(h2h).length, 'of', (48 * 47) / 2);
console.log('suspicious team match counts (<5):', JSON.stringify(suspicious));
console.log('sample England|Scotland:', JSON.stringify(h2h['England|Scotland']));
console.log('sample Croatia|England:', JSON.stringify(h2h['Croatia|England']));
console.log('sample Brazil|Morocco:', JSON.stringify(h2h['Brazil|Morocco']));

const js = '// Head-to-head records between 2026 World Cup teams.\n' +
  '// Generated from github.com/martj42/international_results (1872-present).\n' +
  '// Key: the two app team names sorted alphabetically, joined with "|".\n' +
  '// m: meetings, w: [wins t1, wins t2], d: draws, g: goals [t1, t2],\n' +
  '// wc: World Cup meetings [played, w t1, draws, w t2], f: first year,\n' +
  '// l: last meeting {y, h: home team (dataset name), s: score, t: tournament},\n' +
  '// b: biggest win {y, h: home team, s: score, mg: margin}\n' +
  'const H2H_DATA = ' + JSON.stringify(h2h) + ';\n';
writeFileSync(new URL('../h2h-data.js', import.meta.url), js);
console.log('wrote h2h-data.js,', (js.length / 1024).toFixed(0) + 'KB');
