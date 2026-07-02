// ── Wii power-on intro ──
// Health & safety screen shown once per browser session; clicking (or any key,
// i.e. "pressing A") plays a synthesised Wii-style startup sparkle and fades
// into the menu. The click doubles as the user gesture browsers require
// before audio may play. Purely cosmetic — no data or backend involvement.
(function () {
  const overlay = document.getElementById('wiiBoot');
  if (!overlay || overlay.classList.contains('wb-hidden')) return;

  let done = false;

  // Wii-ish startup sound: a soft low swell plus a rising sine sparkle.
  // Synthesised so we don't ship any copyrighted Nintendo audio.
  function playBootChime() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);
    const now = ctx.currentTime;

    // low airy swell
    const swellDur = 1.8;
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * swellDur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180, now);
    lp.frequency.exponentialRampToValueAtTime(1100, now + 0.9);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.4, now + 0.5);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + swellDur);
    noise.connect(lp); lp.connect(ng); ng.connect(master);
    noise.start(now);

    // sparkle arpeggio (E5 · A5 · C#6 · E6)
    [659.25, 880, 1108.73, 1318.5].forEach((freq, i) => {
      const t = now + 0.3 + i * 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc.connect(g); g.connect(master);
      osc.start(t);
      osc.stop(t + 1.3);
    });

    setTimeout(() => ctx.close().catch(() => {}), (swellDur + 1) * 1000);
  }

  function finishBoot() {
    if (done) return;
    done = true;
    try { sessionStorage.setItem('wiiBooted', '1'); } catch (e) {}
    try { if (typeof wiiMusicMuted !== 'function' || !wiiMusicMuted()) playBootChime(); } catch (e) {}
    // the press doubles as the gesture that unlocks audio — start the menu music
    if (typeof wiiStartMusic === 'function') setTimeout(() => { try { wiiStartMusic(); } catch (e) {} }, 1200);
    overlay.classList.add('wb-fade');
    const bar = document.querySelector('.tab-bar');
    if (bar) bar.classList.add('wii-boot-pop');
    window.removeEventListener('keydown', onKeyDown);
    setTimeout(() => overlay.remove(), 1100);
  }

  // "Press A" — accept A, Enter or Space (not any key, so stray
  // modifier/navigation keys can't skip the boot screen)
  function onKeyDown(e) {
    if (e.key === 'a' || e.key === 'A' || e.key === 'Enter' || e.key === ' ') finishBoot();
  }

  overlay.addEventListener('click', finishBoot);
  window.addEventListener('keydown', onKeyDown);
})();
