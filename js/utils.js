function flagUrl(iso) {
  return `https://flagcdn.com/${iso}.svg`;
}

// Full inner markup for a player's sponsor tag (prefix + logo/emoji mark), or '' if none.
function sponsorMarkHtml(name) {
  const s = (typeof PLAYER_SPONSORS !== 'undefined') ? PLAYER_SPONSORS[name] : null;
  if (!s) return '';
  const mark = s.logo
    ? `<img src="${s.logo}" alt="${escapeHtml(s.name)}" class="sponsor-logo">`
    : `${escapeHtml(s.name)} <span class="sponsor-emoji">${s.emoji}</span>`;
  const prefix = s.prefix !== undefined ? s.prefix : 'sponsored by ';
  return `${prefix}${mark}`;
}

function playerDisplayName(name) {
  const mark = sponsorMarkHtml(name);
  if (!mark) return name;
  return `${escapeHtml(name)} <span class="sponsor-tag">${mark}</span>`;
}

function formatDateLabel(dateStr, timeStr, tz) {
  const d = toDate(dateStr, timeStr, tz);
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matchDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((matchDay - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays >= -1 && diffDays <= 6) return days[d.getDay()];
  return d.getDate() + ' ' + months[d.getMonth()];
}

function toDate(dateStr, timeStr, tz) {
  const [h, m] = timeStr.split(':');
  return new Date(Date.UTC(
    parseInt(dateStr.slice(0,4)), parseInt(dateStr.slice(5,7))-1, parseInt(dateStr.slice(8,10)),
    parseInt(h) - (tz || 0), parseInt(m)
  ));
}

function formatLocalTime(dateStr, timeStr, tz) {
  const d = toDate(dateStr, timeStr, tz);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function getCountdown(dateStr, timeStr, tz) {
  const kickoff = toDate(dateStr, timeStr, tz);
  const now = new Date();
  const diff = kickoff - now;
  const endDiff = diff + (2.5 * 60 * 60 * 1000); // 2h30 after kickoff = live window

  if (diff <= 0 && endDiff > 0) return { text: 'LIVE', cls: 'live-now', rowCls: 'live' };
  if (diff <= 0) return { text: 'FT', cls: '', rowCls: '' };
  if (diff < 15 * 60 * 1000) return { text: 'Kicking off', cls: 'soon', rowCls: 'kicking-off' };

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const text = remHours > 0 ? `in ${days}d ${remHours}h` : `in ${days}d`;
    return { text, cls: '', rowCls: '' };
  }
  if (hours > 0) return { text: `in ${hours}h ${mins}m`, cls: '', rowCls: '' };
  return { text: `in ${mins}m`, cls: 'soon', rowCls: 'kicking-off' };
}

function formatDateHeader(dateStr, timeStr, tz) {
  const d = toDate(dateStr, timeStr || '12:00', tz || 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matchDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((matchDay - today) / 86400000);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays >= -1 && diffDays <= 6) return days[d.getDay()];
  return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
}

// Day name based on the US venue date string (e.g. "2026-06-24")
// Used for predictions tab — day headers reflect where the match is actually played.
function getUSDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const matchDate = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((matchDate - today) / 86400000);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays >= -1 && diffDays <= 6) return days[matchDate.getDay()];
  return days[matchDate.getDay()] + ' ' + d + ' ' + months[matchDate.getMonth()];
}

function ordinal(n) {
  const s = n % 100;
  if (s >= 11 && s <= 13) return n + 'th';
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}

function roundLabel(code) {
  if (!code) return null;
  const map = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarterfinal', SF: 'Semifinal', '3P': '3rd Place', Final: 'Final' };
  return map[code] || code;
}

function escapeHtml(s) {
  if (s == null) return '';
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Escape HTML then convert URLs to clickable links (same page, new tab)
function linkifyHtml(s) {
  if (s == null) return '';
  // First escape HTML chars
  const escaped = s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Then convert URLs to anchor tags — greedy match to end of URL, strip trailing punctuation
  return escaped.replace(
    /https?:\/\/[^\s<"']+/gi,
    (match) => {
      const url = match.replace(/[.,;:!?)]+$/, '');
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    }
  );
}
