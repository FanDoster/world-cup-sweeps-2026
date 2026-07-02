// ── Wii Menu bottom-bar clock ──
// Purely cosmetic: keeps the footer's segmented clock ticking like the Wii Menu.
const WII_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function updateWiiClock() {
  const timeEl = document.getElementById('wiiTime');
  const dateEl = document.getElementById('wiiDate');
  if (!timeEl || !dateEl) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  timeEl.innerHTML = `${hh}<span class="wii-colon">:</span>${mm}`;
  dateEl.textContent = `${WII_DAYS[now.getDay()]} ${now.getDate()}/${now.getMonth() + 1}`;
}

updateWiiClock();
setInterval(updateWiiClock, 5000);
