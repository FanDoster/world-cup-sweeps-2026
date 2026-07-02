// ── Wii Menu ambience ──
// Soft looping menu music (an original Wii-Menu-inspired tune, synthesised
// with WebAudio — no Nintendo audio is shipped) plus a gentle "channel click"
// sound on tab presses. Starts after the first user gesture (browsers block
// audio before one). Mute state persists in localStorage.

let _wiiAudioCtx = null;
let _wiiMusicMaster = null;
let _wiiMusicTimer = null;

function wiiAudioCtx() {
  if (!_wiiAudioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _wiiAudioCtx = new Ctx();
  }
  if (_wiiAudioCtx.state === 'suspended') _wiiAudioCtx.resume().catch(() => {});
  return _wiiAudioCtx;
}

function wiiMusicMuted() {
  try { return localStorage.getItem('wiiMusicMuted') === '1'; } catch (e) { return true; }
}

// One 16-beat loop, ~76 BPM. Sparse marimba-ish plucks over a slow bass,
// run through a feedback delay for that floaty Wii Menu space.
const WII_LOOP_BEAT = 60 / 76;
const WII_LOOP_BEATS = 16;
const WII_BASS = [
  { t: 0, f: 130.81 }, { t: 4, f: 196.0 }, { t: 8, f: 110.0 }, { t: 12, f: 174.61 },
];
const WII_MELODY = [
  { t: 0,    f: 659.25 }, { t: 1,   f: 783.99 }, { t: 2.5, f: 1046.5 },
  { t: 4,    f: 587.33 }, { t: 5,   f: 783.99 }, { t: 6.5, f: 987.77 },
  { t: 7.5,  f: 2093.0, g: 0.35 },
  { t: 8,    f: 523.25 }, { t: 9,   f: 659.25 }, { t: 10.5, f: 880.0 },
  { t: 12,   f: 880.0 }, { t: 13,  f: 783.99 }, { t: 14,  f: 659.25 },
];

function _wiiPluck(ctx, dest, freq, when, gain) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 1.1);
  osc.connect(g); g.connect(dest);
  osc.start(when);
  osc.stop(when + 1.2);
}

function _wiiScheduleLoop(startTime) {
  const ctx = _wiiAudioCtx;
  if (!ctx || !_wiiMusicMaster) return;
  const m = _wiiMusicMaster;
  WII_BASS.forEach(n => _wiiPluck(ctx, m.dry, n.f, startTime + n.t * WII_LOOP_BEAT, 0.5));
  WII_MELODY.forEach(n => _wiiPluck(ctx, m.wet, n.f, startTime + n.t * WII_LOOP_BEAT, n.g || 0.6));
  const loopDur = WII_LOOP_BEATS * WII_LOOP_BEAT;
  const nextStart = startTime + loopDur;
  _wiiMusicTimer = setTimeout(() => _wiiScheduleLoop(nextStart),
    Math.max(200, (nextStart - ctx.currentTime - 0.6) * 1000));
}

function wiiStartMusic() {
  if (wiiMusicMuted() || _wiiMusicTimer) return;
  const ctx = wiiAudioCtx();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = 0.05;
  master.connect(ctx.destination);
  // dry bus + echo bus for the melody
  const dry = ctx.createGain(); dry.connect(master);
  const wet = ctx.createGain(); wet.connect(master);
  const delay = ctx.createDelay(1.0); delay.delayTime.value = WII_LOOP_BEAT / 2;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const echoLevel = ctx.createGain(); echoLevel.gain.value = 0.3;
  wet.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(echoLevel); echoLevel.connect(master);
  _wiiMusicMaster = { master, dry, wet };
  _wiiScheduleLoop(ctx.currentTime + 0.15);
  _wiiUpdateMusicToggle();
}

function wiiStopMusic() {
  if (_wiiMusicTimer) { clearTimeout(_wiiMusicTimer); _wiiMusicTimer = null; }
  if (_wiiMusicMaster) {
    const m = _wiiMusicMaster;
    // fade out anything already scheduled
    try {
      m.master.gain.setTargetAtTime(0.0001, _wiiAudioCtx.currentTime, 0.2);
      setTimeout(() => m.master.disconnect(), 1500);
    } catch (e) {}
    _wiiMusicMaster = null;
  }
  _wiiUpdateMusicToggle();
}

function wiiToggleMusic() {
  try { localStorage.setItem('wiiMusicMuted', wiiMusicMuted() ? '0' : '1'); } catch (e) {}
  if (wiiMusicMuted()) wiiStopMusic(); else wiiStartMusic();
}

function _wiiUpdateMusicToggle() {
  const muted = wiiMusicMuted();
  ['wiiMusicToggle', 'wiiSoundToggle'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('muted', muted);
  });
}

// Soft "channel open" click — quick two-tone plip.
function wiiChannelClick() {
  if (wiiMusicMuted()) return;
  const ctx = wiiAudioCtx();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = 0.09;
  master.connect(ctx.destination);
  [[880, 0], [1174.66, 0.055]].forEach(([f, dt]) => {
    const t = ctx.currentTime + dt;
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.2);
  });
}

(function () {
  _wiiUpdateMusicToggle();
  // Channel click on any tab press (delegated so injected tabs count too)
  const bar = document.getElementById('tabBar');
  if (bar) bar.addEventListener('click', e => {
    if (e.target.closest('.tab-btn')) { try { wiiChannelClick(); } catch (err) {} }
  });
  // If the boot screen was skipped this session, start the music on the
  // first interaction instead (the gesture unlocks audio).
  document.addEventListener('pointerdown', () => { try { wiiStartMusic(); } catch (e) {} }, { once: true });
})();
