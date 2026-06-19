// ── TEAM RESULT NOTIFICATIONS ──

let pendingResults = [];

function checkTeamResults() {
  if (!currentProfile) return;
  if (!matchData.length) return;

  const playerTeams = people[currentProfile.player_name] || [];
  if (!playerTeams.length) return;

  const results = [];

  for (const m of matchData) {
    if (!m.isComplete) continue;
    if (!playerTeams.some(t => t.team === m.team1 || t.team === m.team2)) continue;

    const matchKey = `${m.team1}|${m.team2}|${m.date}`;
    if (localStorage.getItem(`wc2026_seen_${matchKey}`)) continue;

    const userTeam = playerTeams.find(t => t.team === m.team1 || t.team === m.team2);
    const isHome = userTeam.team === m.team1;
    const userScore = isHome ? m.score1 : m.score2;
    const oppScore = isHome ? m.score2 : m.score1;
    const oppTeam = isHome ? m.team2 : m.team1;

    results.push({
      matchKey,
      team: userTeam.team,
      oppTeam,
      userScore,
      oppScore,
      won: userScore > oppScore,
      drew: userScore === oppScore,
      date: m.date,
    });
  }

  if (!results.length) return;

  pendingResults = results;
  showTeamResultPopup(results);
}

function showTeamResultPopup(results) {
  const hasWin = results.some(r => r.won);
  const allWins = results.every(r => r.won);
  const hasLoss = results.some(r => !r.won && !r.drew);
  const single = results.length === 1;

  const emoji = document.getElementById('resultEmoji');
  const title = document.getElementById('resultTitle');
  const subtitle = document.getElementById('resultSubtitle');
  const details = document.getElementById('resultDetails');

  // Emoji
  if (hasWin && allWins) {
    emoji.textContent = '🎉';
  } else if (hasWin) {
    emoji.textContent = '⚽';
  } else if (results.every(r => r.drew)) {
    emoji.textContent = '🤝';
  } else {
    emoji.textContent = '😤';
  }

  // Title
  if (single) {
    const r = results[0];
    if (r.won) title.textContent = `${r.team} won!`;
    else if (r.drew) title.textContent = `${r.team} drew`;
    else title.textContent = `${r.team} lost`;
  } else {
    const teamNames = [...new Set(results.map(r => r.team))].join(' & ');
    const wins = results.filter(r => r.won).length;
    const losses = results.filter(r => !r.won && !r.drew).length;
    const draws = results.filter(r => r.drew).length;
    const parts = [];
    if (wins) parts.push(`${wins} win${wins > 1 ? 's' : ''}`);
    if (draws) parts.push(`${draws} draw${draws > 1 ? 's' : ''}`);
    if (losses) parts.push(`${losses} loss${losses > 1 ? 'es' : ''}`);
    title.textContent = `${teamNames} played!`;
    subtitle.textContent = parts.join(', ');
  }

  // Details
  details.innerHTML = results.map(r => {
    const resultStr = r.won ? 'W' : r.drew ? 'D' : 'L';
    const color = r.won ? 'var(--accent)' : r.drew ? 'var(--gold)' : 'var(--live)';
    const dateStr = new Date(r.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return `<div style="margin-bottom:12px;padding-left:2px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};color:#000;font-weight:800;font-size:0.72rem;flex-shrink:0">${resultStr}</span>
        <span><strong style="color:var(--text)">${r.team}</strong> <span style="color:var(--text-secondary)">${r.userScore}–${r.oppScore} ${r.oppTeam}</span></span>
      </div>
      <div style="color:var(--text-muted);font-size:0.72rem;margin-left:32px">${dateStr}</div>
    </div>`;
  }).join('');

  document.getElementById('teamResultModal').classList.add('active');

  // Confetti on any win
  if (hasWin) {
    setTimeout(() => launchConfetti(), 200);
  }
}

function dismissTeamResults() {
  // Mark all as seen
  for (const r of pendingResults) {
    localStorage.setItem(`wc2026_seen_${r.matchKey}`, '1');
  }
  pendingResults = [];
  document.getElementById('teamResultModal').classList.remove('active');
  stopConfetti();
}

// ── CONFETTI ──

let confettiParticles = [];
let confettiRaf = null;

function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d');
  const colors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

  confettiParticles = [];
  for (let i = 0; i < 120; i++) {
    confettiParticles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 8,
      opacity: 1,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    for (const p of confettiParticles) {
      p.y += p.vy;
      p.x += p.vx;
      p.rot += p.rotV;
      if (p.y > canvas.height + 50) continue;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      if (p.y > canvas.height * 0.7) {
        p.opacity -= 0.01;
      }
      if (p.opacity > 0) alive = true;
    }

    if (alive) {
      confettiRaf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiRaf = null;
    }
  }

  confettiRaf = requestAnimationFrame(frame);
}

function stopConfetti() {
  if (confettiRaf) {
    cancelAnimationFrame(confettiRaf);
    confettiRaf = null;
  }
  const canvas = document.getElementById('confettiCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  confettiParticles = [];
}
