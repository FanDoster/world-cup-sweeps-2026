// ── Wii pointer overlay ──
// Replaces the native cursor (fine pointers only) with a JS-driven Wii Remote
// hand: it tilts with mouse movement like a rolled wrist, wobbles gently when
// idle, pulses with an expanding ring on click, turns into a grabbing fist
// while dragging the Battle Map globe, spins a loading ring while loadData is
// in flight, and glows in the signed-in player's colour with their player
// number on the glove. Hover tick + A-press pop sounds ride the wii-audio
// context and respect the global mute. Coarse/touch pointers keep the plain
// CSS cursor from css/wii-cursor.css.

(function () {
  if (!window.matchMedia || !matchMedia('(pointer: fine)').matches) return;

  const SIZE = 38; // px; hotspot scales from the 32-unit viewBox
  const HOT_X = 11 / 32 * SIZE;
  const HOT_Y = 4 / 32 * SIZE;

  // Same glove paths as .claude/gen-wii-cursor.mjs (keep in sync)
  const HAND_PATH =
    'M14 2.8C12.9 2.8 12 3.7 12 4.8V16.2L9.9 14.1C8.4 12.6 5.9 13.6 5.9 15.7' +
    'C5.9 16.4 6.2 17 6.6 17.5L12.2 24.6C13.4 26.1 15.2 27 17.1 27H20.5' +
    'C23.5 27 26 24.5 26 21.5V14.5C26 13.4 25.1 12.5 24 12.5' +
    'C23.4 12.5 22.9 12.7 22.5 13.1C22.2 12.2 21.4 11.6 20.4 11.6' +
    'C19.8 11.6 19.2 11.9 18.8 12.3C18.4 11.5 17.7 11 16.8 11' +
    'C16.5 11 16.2 11.1 16 11.2V4.8C16 3.7 15.1 2.8 14 2.8Z';
  // Fist: pointing finger curled into a fourth knuckle
  const FIST_PATH =
    'M9 17V21.5C9 24.5 11.5 27 14.5 27H20.5C23.5 27 26 24.5 26 21.5V14.5' +
    'C26 13.4 25.1 12.5 24 12.5C23.4 12.5 22.9 12.7 22.5 13.1' +
    'C22.2 12.2 21.4 11.6 20.4 11.6C19.8 11.6 19.2 11.9 18.8 12.3' +
    'C18.4 11.5 17.7 11 16.8 11C16.2 11 15.6 11.3 15.2 11.8' +
    'C14.8 11.3 14.2 11 13.5 11C12.4 11 11.5 11.9 11.5 13V13.6' +
    'C10 14 9 15.1 9 17Z';
  const HAND_GROOVES = 'M18.9 13.6V16.6M22.3 13.9V16.6';
  const FIST_GROOVES = 'M15.4 13.5V16.4M18.9 13.6V16.6M22.3 13.9V16.6';

  const CLICKABLE = 'a, button, select, label, summary, [onclick], [role="button"]';
  // Places the native cursor should win: typing fields and the shooter's own crosshair
  function inHideZone(el) {
    if (!el || !el.closest) return false;
    if (el.closest('#shooter-canvas, textarea')) return true;
    const inp = el.closest('input');
    return !!(inp && !['button', 'submit', 'checkbox', 'radio', 'range', 'file'].includes(inp.type));
  }

  function lighten(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const mix = c => Math.round(c + (255 - c) * f);
    return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255]
      .map(c => mix(c).toString(16).padStart(2, '0')).join('');
  }

  function buildSvg(variant, glow, badgeNum) {
    const path = variant === 'fist' ? FIST_PATH : HAND_PATH;
    const grooves = variant === 'fist' ? FIST_GROOVES : HAND_GROOVES;
    const spin = variant === 'loading'
      ? `<g class='wc-spin'><circle cx='16' cy='16' r='14.5' fill='none' stroke='${glow}' ` +
        `stroke-width='2.4' stroke-dasharray='68 23' stroke-linecap='round' opacity='0.75'/></g>`
      : '';
    const badge = badgeNum
      ? `<g><rect x='20' y='22.5' width='8.5' height='8.5' rx='2.6' fill='${glow}' stroke='#223a70' stroke-width='1'/>` +
        `<text x='24.25' y='29.1' font-size='7' font-weight='800' font-family='Nunito,system-ui,sans-serif' ` +
        `text-anchor='middle' fill='#fff'>${badgeNum}</text></g>`
      : '';
    const glowPath = (cls, color, w, op) =>
      `<path class='${cls}' d='${path}' fill='none' stroke='${color}' stroke-width='${w}' stroke-linejoin='round' opacity='${op}'/>`;
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>${spin}<g transform='rotate(-14 16 16)'>` +
      glowPath('wc-glow-idle', glow, 5, 0.85) +
      glowPath('wc-glow-hover', lighten(glow, 0.45), 5.6, 0.95) +
      `<path d='${path}' fill='#fff' stroke='#223a70' stroke-width='1.4' stroke-linejoin='round'/>` +
      `<path d='${grooves}' fill='none' stroke='#223a70' stroke-width='0.9' stroke-linecap='round' opacity='0.45'/>` +
      badge + `</g></svg>`;
  }

  // ── Sounds (piggyback on wii-audio's context + mute) ──
  let lastTick = 0;
  function hoverTick() {
    if (typeof wiiAudioCtx !== 'function' || wiiMusicMuted()) return;
    const now = performance.now();
    if (now - lastTick < 70) return;
    lastTick = now;
    const ctx = wiiAudioCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 1318.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.08);
  }
  function pressPop() {
    if (typeof wiiAudioCtx !== 'function' || wiiMusicMuted()) return;
    const ctx = wiiAudioCtx();
    if (!ctx) return;
    [[392, 0, 0.12, 'triangle'], [784, 0.02, 0.07, 'sine']].forEach(([f, dt, vol, type]) => {
      const t = ctx.currentTime + dt;
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.15);
    });
  }

  // ── DOM ──
  const cursor = document.createElement('div');
  cursor.id = 'wiiCursor';
  const hand = document.createElement('div');
  hand.className = 'wc-hand';
  cursor.appendChild(hand);
  document.body.appendChild(cursor);
  document.documentElement.classList.add('wii-pointer');

  // ── State ──
  let px = -100, py = -100;      // pointer position
  let angle = 0, angleTarget = 0; // extra tilt on top of the baked-in -14°
  let scale = 1, scaleTarget = 1;
  let vx = 0, lastX = null, lastT = 0, lastMove = 0;
  let variant = 'hand', hoverEl = null, seen = false, hidden = false;
  let glowColor = '', badgeNum = null, loading = false, grabbing = false;

  function rebuild() {
    hand.innerHTML = buildSvg(variant, glowColor, badgeNum);
  }

  function setVariant(v) {
    if (variant === v) return;
    variant = v;
    rebuild();
  }

  function refreshPlayer() {
    const name = (typeof currentProfile === 'object' && currentProfile && currentProfile.player_name) || null;
    const glow = (name && typeof ownerHexColors === 'object' && ownerHexColors[name]) || '#9cc8ff';
    const badge = name && typeof PLAYERS !== 'undefined' ? PLAYERS.indexOf(name) + 1 || null : null;
    if (glow === glowColor && badge === badgeNum) return;
    glowColor = glow;
    badgeNum = badge;
    rebuild();
  }
  refreshPlayer();
  setInterval(refreshPlayer, 3000);

  // Loading ring while loadData is in flight (only if it takes a beat)
  if (typeof loadData === 'function') {
    const orig = loadData;
    let pending = 0;
    loadData = function () {
      pending++;
      const slow = setTimeout(() => { loading = true; }, 400);
      const done = () => {
        clearTimeout(slow);
        if (--pending === 0) loading = false;
      };
      return orig.apply(this, arguments).then(r => { done(); return r; }, e => { done(); throw e; });
    };
  }

  // ── Events ──
  document.addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    px = e.clientX; py = e.clientY;
    const now = performance.now();
    if (lastX !== null && now > lastT) {
      const inst = (e.clientX - lastX) / (now - lastT); // px per ms
      vx = vx * 0.75 + inst * 0.25;
    }
    lastX = e.clientX; lastT = now; lastMove = now;
    seen = true;
  }, { passive: true });

  document.addEventListener('mouseover', e => {
    hidden = inHideZone(e.target);
    const el = e.target.closest ? e.target.closest(CLICKABLE) : null;
    if (el && el !== hoverEl) hoverTick();
    hoverEl = el;
    cursor.classList.toggle('wc-hover', !!el);
  }, true);

  document.addEventListener('pointerdown', e => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    scaleTarget = 0.82;
    if (e.target.closest && e.target.closest('#globeWrap')) grabbing = true;
    if (!hidden) {
      pressPop();
      const blip = document.createElement('div');
      blip.className = 'wc-blip';
      blip.style.left = e.clientX + 'px';
      blip.style.top = e.clientY + 'px';
      blip.style.color = glowColor;
      document.body.appendChild(blip);
      setTimeout(() => blip.remove(), 500);
    }
  }, true);

  document.addEventListener('pointerup', () => { scaleTarget = 1; grabbing = false; }, true);
  document.addEventListener('mouseleave', () => { seen = false; });
  window.addEventListener('blur', () => { seen = false; grabbing = false; scaleTarget = 1; });

  // ── Render loop ──
  function frame(t) {
    setVariant(grabbing ? 'fist' : (loading ? 'loading' : 'hand'));
    const idleFor = performance.now() - lastMove;
    if (idleFor > 250) {
      vx *= 0.9;
      angleTarget = Math.sin(t / 480) * 1.4; // hand-held IR wobble, dialed way down
    } else {
      angleTarget = Math.max(-11, Math.min(11, vx * 14));
    }
    angle += (angleTarget - angle) * 0.16;
    scale += (scaleTarget - scale) * 0.35;
    const show = seen && !hidden;
    cursor.classList.toggle('wc-on', show);
    if (show) {
      const bob = idleFor > 250 ? Math.sin(t / 620) * 0.8 : 0;
      cursor.style.transform = `translate3d(${px - HOT_X}px, ${py - HOT_Y + bob}px, 0)`;
      hand.style.transform = `rotate(${angle}deg) scale(${scale})`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
