// ── Wii channel dressing ──
// Replaces each tab's emoji with a full-bleed Wii-style channel banner (the
// artwork and channel name fill the whole tile, like real Wii Menu channels),
// and pads the grid with empty channel slots. Purely cosmetic.

const WII_CHANNEL_BANNERS = {
  bracket: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><pattern id="wch-ko" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="22" height="22" fill="#fff"/><rect width="11" height="11" fill="#f7c04a"/><rect x="11" y="11" width="11" height="11" fill="#f7c04a"/>
    </pattern></defs>
    <rect width="160" height="90" fill="url(#wch-ko)"/>
    <rect x="0" y="24" width="160" height="42" fill="#fff" opacity="0.93"/>
    <circle cx="27" cy="45" r="11" fill="#ffd54d" stroke="#e0a92f" stroke-width="2"/>
    <path d="M27 38l2 4.1 4.5.7-3.3 3.2.8 4.5-4-2.1-4 2.1.8-4.5-3.3-3.2 4.5-.7z" fill="#fff"/>
    <text x="93" y="52" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="19" fill="#3b4650">Knockout</text>
  </svg>`,
  players: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e8edf0"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-pl)"/>
    <g><circle cx="46" cy="32" r="13" fill="#f8d5ac"/><path d="M33 31c0-9 6-14 13-14s13 5 13 14c-4-4.2-8-5.4-13-5.4s-9 1.2-13 5.4z" fill="#5b3a1e"/><circle cx="41.5" cy="34" r="1.9" fill="#333"/><circle cx="50.5" cy="34" r="1.9" fill="#333"/><ellipse cx="46" cy="39.5" rx="2.8" ry="1.2" fill="#c66"/></g>
    <g><circle cx="80" cy="28" r="14" fill="#fbe0bb"/><path d="M66 27c0-9.5 6.5-15 14-15s14 5.5 14 15c-4.3-4.5-8.6-5.8-14-5.8s-9.7 1.3-14 5.8z" fill="#2e2e2e"/><circle cx="75" cy="30" r="2" fill="#333"/><circle cx="85" cy="30" r="2" fill="#333"/><path d="M76 36c2.4 2 5.6 2 8 0" stroke="#b46a5a" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>
    <g><circle cx="114" cy="32" r="13" fill="#f2c795"/><path d="M101 31c0-9 6-14 13-14s13 5 13 14c-4-4.2-8-5.4-13-5.4s-9 1.2-13 5.4z" fill="#8a5a2e"/><circle cx="109.5" cy="34" r="1.9" fill="#333"/><circle cx="118.5" cy="34" r="1.9" fill="#333"/><ellipse cx="114" cy="39.5" rx="2.8" ry="1.2" fill="#c66"/></g>
    <text x="80" y="76" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="19" fill="#2f9fd0">Players</text>
  </svg>`,
  matches: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-ma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#74dbd8"/><stop offset="1" stop-color="#3fbdba"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-ma)"/>
    <circle cx="80" cy="30" r="16" fill="#fff" stroke="#2a9c99" stroke-width="1.5"/>
    <path d="M80 23.5l6 4.4-2.3 7h-7.4l-2.3-7z" fill="#3a4750"/>
    <path d="M80 14.5l4 3-4 3-4-3z" fill="#3a4750"/><path d="M65 26l4.6 1 .8 5-4.4-1.6z" fill="#3a4750"/><path d="M95 26l-4.6 1-.8 5 4.4-1.6z" fill="#3a4750"/><path d="M73 44.5l2.5-4h9l2.5 4a16 16 0 0 1-14 0z" fill="#3a4750"/>
    <text x="80" y="76" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="19" fill="#fff" stroke="#2a9c99" stroke-width="3" paint-order="stroke">Matches</text>
  </svg>`,
  groups: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f7"/><stop offset="0.5" stop-color="#e2e7ea"/><stop offset="1" stop-color="#d3dade"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-gr)"/>
    <rect x="52" y="12" width="56" height="34" rx="5" fill="#fff" stroke="#9aa4ab" stroke-width="2"/>
    <path d="M52 19a5 5 0 0 1 5-5h46a5 5 0 0 1 5 5v6H52z" fill="#1f9bd4"/>
    <path d="M52 33h56M75 25v21M89 25v21" stroke="#c9d2d8" stroke-width="2"/>
    <text x="80" y="76" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="19" fill="#8f9aa2">Groups</text>
  </svg>`,
  leaderboard: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5fe0"/><stop offset="1" stop-color="#2b3ba8"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-lb)"/>
    <g fill="#fff" opacity="0.55"><circle cx="18" cy="14" r="1.6"/><circle cx="42" cy="8" r="1.1"/><circle cx="140" cy="12" r="1.6"/><circle cx="122" cy="22" r="1.1"/><circle cx="16" cy="70" r="1.1"/><circle cx="148" cy="66" r="1.4"/><circle cx="66" cy="10" r="1.1"/></g>
    <rect x="46" y="26" width="9" height="12" rx="1.5" fill="#c3ccd3"/><rect x="57" y="20" width="9" height="18" rx="1.5" fill="#ffd54d"/><rect x="68" y="29" width="9" height="9" rx="1.5" fill="#d99e63"/>
    <path d="M99 20l1.7 3.4 3.8.6-2.7 2.7.6 3.8-3.4-1.8-3.4 1.8.6-3.8-2.7-2.7 3.8-.6z" fill="#ffd54d"/>
    <rect x="16" y="52" width="128" height="26" rx="13" fill="#fff" opacity="0.95"/>
    <text x="80" y="70" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="16" fill="#3b4fd8">Leaderboard</text>
  </svg>`,
  teams: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-tm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2fafe"/><stop offset="1" stop-color="#d7ecf7"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-tm)"/>
    <g stroke="#bfe0f0" stroke-width="1.5" fill="none"><path d="M-6 62c30-14 60-14 86 0M60 74c30-16 66-16 100-2"/></g>
    <g><path d="M42 14v26" stroke="#8b98a1" stroke-width="2.5" stroke-linecap="round"/><path d="M44 15c4.5-2.2 9 2.2 15 0v11c-6 2.2-10.5-2.2-15 0z" fill="#e5484d"/></g>
    <g><path d="M76 10v26" stroke="#8b98a1" stroke-width="2.5" stroke-linecap="round"/><path d="M78 11c4.5-2.2 9 2.2 15 0v11c-6 2.2-10.5-2.2-15 0z" fill="#2f80d0"/></g>
    <g><path d="M110 14v26" stroke="#8b98a1" stroke-width="2.5" stroke-linecap="round"/><path d="M112 15c4.5-2.2 9 2.2 15 0v11c-6 2.2-10.5-2.2-15 0z" fill="#3aa655"/></g>
    <text x="80" y="76" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="19" fill="#2f9fd0">Teams</text>
  </svg>`,
  map: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-mp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fc0ef"/><stop offset="1" stop-color="#cdeafd"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-mp)"/>
    <circle cx="80" cy="32" r="18" fill="#4fb7e8" stroke="#fff" stroke-width="2.5"/>
    <path d="M68.5 26c3.4-5 9.5-6.2 12.9-4 2.7 1.8 1.1 5-2.2 6.1-4.5 1.5-7.3 3.5-10.7 2.4-1.8-.7-1.1-2.7 0-4.5z" fill="#7ed17e"/>
    <path d="M84 38c5-1.4 8.6 1.1 7.2 3.6-1.4 2.5-6.1 3.6-9.5 2.2-2.5-1-1.1-4.8 2.3-5.8z" fill="#7ed17e"/>
    <ellipse cx="30" cy="14" rx="12" ry="4.5" fill="#fff" opacity="0.85"/><ellipse cx="132" cy="20" rx="14" ry="5" fill="#fff" opacity="0.75"/>
    <text x="80" y="78" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="17" fill="#fff" stroke="#4a9ccc" stroke-width="3" paint-order="stroke">Battle Map</text>
  </svg>`,
  shooter: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2222a"/><stop offset="1" stop-color="#8f0e13"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-sh)"/>
    <g opacity="0.35" stroke="#fff" stroke-width="3"><circle cx="80" cy="45" r="22" fill="none"/><path d="M80 12v14M80 64v14M47 45h14M99 45h14"/></g>
    <text x="80" y="52" text-anchor="middle" font-family="'Press Start 2P',monospace" font-size="12" fill="#fff">SHOOTER</text>
  </svg>`,
  profile: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-pr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4ecf1"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-pr)"/>
    <ellipse cx="80" cy="52" rx="34" ry="6" fill="#c9dce8" opacity="0.7"/>
    <circle cx="80" cy="30" r="15" fill="#f8d5ac"/>
    <path d="M65 29c0-10.5 7-16 15-16s15 5.5 15 16c-4.6-4.8-9.2-6.2-15-6.2s-10.4 1.4-15 6.2z" fill="#4a2f16"/>
    <circle cx="74.5" cy="32" r="2.2" fill="#333"/><circle cx="85.5" cy="32" r="2.2" fill="#333"/>
    <path d="M75.5 39c2.6 2.2 6.4 2.2 9 0" stroke="#b46a5a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <text x="80" y="78" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="18" fill="#2f9fd0">Profile</text>
  </svg>`,
  banter: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-bn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf6ec"/><stop offset="1" stop-color="#f3e3c8"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-bn)"/>
    <rect x="56" y="13" width="48" height="32" rx="4" fill="#fff" stroke="#b99b6b" stroke-width="2"/>
    <path d="M58 16l22 16 22-16" fill="none" stroke="#b99b6b" stroke-width="2" stroke-linejoin="round"/>
    <path d="M80 32.5c1.9-3.3 7.2-2 7.2 1.2 0 2.6-4.1 5-7.2 6.9-3.1-1.9-7.2-4.3-7.2-6.9 0-3.2 5.3-4.5 7.2-1.2z" fill="#e5484d"/>
    <text x="80" y="76" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="19" fill="#a9743c">Banter</text>
  </svg>`,
  myteams: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8bc63f"/><stop offset="1" stop-color="#63a12b"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-mt)"/>
    <path d="M80 8l13 4.6v11c0 8.4-5.5 14.4-13 18.6-7.5-4.2-13-10.2-13-18.6v-11z" fill="#fff" opacity="0.95"/>
    <path d="M80 16.5l2.5 5 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8z" fill="#63a12b"/>
    <text x="80" y="76" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="17" fill="#fff" stroke="#4d8020" stroke-width="3" paint-order="stroke">My Teams</text>
  </svg>`,
  predictions: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wch-pd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a77e0"/><stop offset="1" stop-color="#6b48b8"/></linearGradient></defs>
    <rect width="160" height="90" fill="url(#wch-pd)"/>
    <circle cx="80" cy="30" r="16" fill="#c9b3f0"/><ellipse cx="74" cy="23" rx="6.5" ry="3.6" fill="#fff" opacity="0.6"/>
    <circle cx="80" cy="30" r="16" fill="none" stroke="#fff" stroke-width="2" opacity="0.7"/>
    <path d="M88 30l1.3 2.6 2.6 1.3-2.6 1.3-1.3 2.6-1.3-2.6-2.6-1.3 2.6-1.3z" fill="#fff"/>
    <path d="M68 48h24l-3 5H71z" fill="#523a85"/>
    <text x="80" y="78" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="16" fill="#fff" stroke="#523a85" stroke-width="3" paint-order="stroke">Predictions</text>
  </svg>`,
};

function applyChannelIcons() {
  document.querySelectorAll('#tabBar .tab-btn[data-tab]').forEach(btn => {
    const banner = WII_CHANNEL_BANNERS[btn.dataset.tab];
    const slot = btn.querySelector('.emoji');
    if (banner && slot && !slot.querySelector('svg')) {
      slot.innerHTML = banner;
      btn.classList.add('wii-banner');
    }
  });
}

// Pad the grid with empty channel slots so the last row is always complete —
// and when the channels fill their rows exactly, add a whole spare row of
// empties, just like the Wii Menu's blank pages.
function fillEmptyChannels() {
  const bar = document.getElementById('tabBar');
  if (!bar) return;
  bar.querySelectorAll('.tab-empty').forEach(el => el.remove());
  const cols = window.matchMedia('(max-width: 700px)').matches ? 4 : 5;
  const visible = [...bar.querySelectorAll('.tab-btn')]
    .filter(b => getComputedStyle(b).display !== 'none').length;
  const rem = visible % cols;
  const add = rem === 0 ? cols : cols - rem;
  for (let i = 0; i < add; i++) {
    const d = document.createElement('div');
    d.className = 'tab-empty';
    d.setAttribute('aria-hidden', 'true');
    bar.appendChild(d);
  }
}

(function () {
  const bar = document.getElementById('tabBar');
  if (!bar) return;
  applyChannelIcons();
  fillEmptyChannels();
  // Re-dress when the signed-in tabs get injected/removed by updateAuthBar
  new MutationObserver(muts => {
    const realChange = muts.some(m =>
      [...m.addedNodes, ...m.removedNodes].some(n =>
        n.nodeType === 1 && !n.classList.contains('tab-empty')));
    if (realChange) { applyChannelIcons(); fillEmptyChannels(); }
  }).observe(bar, { childList: true });
  // Refill when crossing the mobile/desktop breakpoint
  let cols = null;
  window.addEventListener('resize', () => {
    const c = window.matchMedia('(max-width: 700px)').matches ? 4 : 5;
    if (c !== cols) { cols = c; fillEmptyChannels(); }
  });
})();
