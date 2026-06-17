// ── CONSTANTS ──────────────────────────────────────────────────────────────
const S_W = 640, S_H = 480;
const S_FOV = Math.PI / 3;                  // 60° field of view
const S_PLANE_LEN = Math.tan(S_FOV / 2);   // camera plane half-width ≈ 0.577
const S_MOVE_SPEED = 3.0;                   // map units/second
const S_ROT_SPEED = 0.002;                  // radians per pixel of mouse movement

// Wall types: 1=concrete, 2=goal net, 3=hoarding
const S_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,2,0,0,0,0,0,0,0,3,3,3,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1],
  [1,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,1],
  [1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,1],
  [1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,1],
  [1,0,0,3,3,3,0,0,0,0,0,0,0,2,2,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ── SPRITES ────────────────────────────────────────────────────────────────
const S_SPRITE_DEFS = {
  rooney:         { src: 'sprites/rooney.png',        bg: 'transparent' },
  gazza:          { src: 'sprites/gazza.png',          bg: 'transparent' },
  'gazza-trophy': { src: 'sprites/gazza-trophy.png',  bg: 'transparent' },
  sven:           { src: 'sprites/sven.png',           bg: 'transparent' },
  starmer:        { src: 'sprites/starmer.png',        bg: 'transparent' },
  maguire:        { src: 'sprites/maguire.png',        bg: 'transparent' },
  infantino:      { src: 'sprites/infantino.png',      bg: 'dark' },
  trump:          { src: 'sprites/trump.png',          bg: 'dark' },
};

// ── ENEMY TYPES ────────────────────────────────────────────────────────────
const S_ENEMY_TYPES = {
  rooney:         { sprite: 'rooney',        hp: 2,  speed: 2.0, scale: 1.0, damage: 10, behaviour: 'direct',   points: 10,  shotDmg: 1 },
  gazza:          { sprite: 'gazza',         hp: 1,  speed: 3.0, scale: 1.0, damage: 10, behaviour: 'zigzag',   points: 10,  shotDmg: 1 },
  sven:           { sprite: 'sven',          hp: 5,  speed: 1.5, scale: 1.0, damage: 10, behaviour: 'direct',   points: 10,  shotDmg: 1 },
  starmer:        { sprite: 'starmer',       hp: 2,  speed: 2.0, scale: 1.0, damage: 10, behaviour: 'direct',   points: 10,  shotDmg: 1 },
  maguire:        { sprite: 'maguire',       hp: 3,  speed: 1.2, scale: 1.0, damage: 10, behaviour: 'hesitate', points: 10,  shotDmg: 1 },
  'gazza-trophy': { sprite: 'gazza-trophy',  hp: 5,  speed: 2.8, scale: 1.2, damage: 15, behaviour: 'zigzag',   points: 25,  shotDmg: 1 },
  infantino:      { sprite: 'infantino',     hp: 10, speed: 3.5, scale: 1.5, damage: 20, behaviour: 'direct',   points: 50,  shotDmg: 2 },
  trump:          { sprite: 'trump',         hp: 40, speed: 3.5, scale: 2.0, damage: 20, behaviour: 'direct',   points: 150, shotDmg: 2 },
};

function sSpawnEnemy(type, x, y) {
  const def = S_ENEMY_TYPES[type];
  return {
    type, x, y,
    sprite: def.sprite, hp: def.hp, maxHp: def.hp,
    speed: def.speed, scale: def.scale, damage: def.damage,
    behaviour: def.behaviour, points: def.points, shotDmg: def.shotDmg,
    alive: true, zigzagTimer: 0, zigzagDir: 1, hesitateTimer: 0, attackCooldown: 0, hitFlash: 0, voiceTimer: 3, hitsReceived: 0, fleeTimer: 0, hideTarget: null, shootTimer: type === 'sven' ? 1 : 2,
  };
}

function sRandomSpawnPos() {
  for (let i = 0; i < 200; i++) {
    const x = 1 + Math.random() * (S_MAP[0].length - 2);
    const y = 1 + Math.random() * (S_MAP.length - 2);
    if (sIsWall(x, y)) continue;
    const dx = x - sPlayer.x, dy = y - sPlayer.y;
    if (dx * dx + dy * dy < 25) continue;  // ≥ 5 units from player
    return { x, y };
  }
  return { x: 18.5, y: 11.5 };  // fallback: far corner
}

const sSprites = {};

function sRemoveBg(img, bgType) {
  const ofc = document.createElement('canvas');
  ofc.width = img.naturalWidth;
  ofc.height = img.naturalHeight;
  const octx = ofc.getContext('2d');
  octx.drawImage(img, 0, 0);
  if (bgType === 'transparent') return ofc;
  const id = octx.getImageData(0, 0, ofc.width, ofc.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    if (bgType === 'white' && r > 230 && g > 230 && b > 230) d[i+3] = 0;
    if (bgType === 'dark'  && r < 25  && g < 25  && b < 25)  d[i+3] = 0;
  }
  octx.putImageData(id, 0, 0);
  return ofc;
}

function sLoadSprites() {
  const keys = Object.keys(S_SPRITE_DEFS);
  let loaded = 0;
  keys.forEach(key => {
    const img = new Image();
    img.onload = () => {
      sSprites[key] = sRemoveBg(img, S_SPRITE_DEFS[key].bg);
      if (++loaded === keys.length) sSpriteReady = true;
    };
    img.src = S_SPRITE_DEFS[key].src;
  });
}

function sRenderSprites() {
  if (!sSpriteReady || !sEnemies.length) return;
  const px = sPlayer.x, py = sPlayer.y, pa = sPlayer.angle;
  const dirX = Math.cos(pa), dirY = Math.sin(pa);
  const plX = -dirY * S_PLANE_LEN, plY = dirX * S_PLANE_LEN;
  const invDet = 1 / (plX * dirY - dirX * plY);

  const sorted = sEnemies
    .filter(e => e.alive)
    .map(e => ({ e, dist: (e.x - px) ** 2 + (e.y - py) ** 2 }))
    .sort((a, b) => b.dist - a.dist);

  for (const { e } of sorted) {
    const sx = e.x - px, sy = e.y - py;
    const transformX = invDet * (dirY * sx - dirX * sy);
    const transformY = invDet * (-plY * sx + plX * sy);
    if (transformY <= 0) continue;

    const screenX = Math.round((S_W / 2) * (1 + transformX / transformY));
    const sprH = Math.min(Math.abs(Math.round(S_H / transformY)) * e.scale, S_H * 2);
    const sprW = sprH;
    const drawX = screenX - sprW / 2;
    const drawY = (S_H - sprH) / 2;

    const img = sSprites[e.sprite];
    if (!img) continue;

    // Clip sprite vertically to canvas bounds, adjusting source coords to match
    let destY = drawY, destH = sprH;
    let srcY0 = 0;
    if (destY < 0) { srcY0 = (-destY / sprH) * img.height; destH += destY; destY = 0; }
    if (destY + destH > S_H) destH = S_H - destY;
    if (destH <= 0) continue;
    const srcHVisible = (destH / sprH) * img.height;

    const x0 = Math.max(0, Math.floor(drawX));
    const x1 = Math.min(S_W - 1, Math.floor(drawX + sprW));
    const centerCol = Math.max(0, Math.min(S_W - 1, screenX));
    if (transformY >= sZBuffer[centerCol]) continue;
    for (let x = x0; x <= x1; x++) {
      const srcX = Math.floor((x - drawX) / sprW * img.width);
      sCtx.drawImage(img, srcX, srcY0, 1, srcHVisible, x, destY, 1, destH);
      if (e.hitFlash > 0) {
        sCtx.fillStyle = `rgba(255,0,0,${(e.hitFlash / 8) * 0.7})`;
        sCtx.fillRect(x, destY, 1, destH);
      }
    }
    if (e.hitFlash > 0) e.hitFlash--;
  }
}

function sDrawText(ctx, text, x, y, size, color, outline = '#000', align = 'left') {
  ctx.font = `${size}px 'Press Start 2P', monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = outline;
  for (const [ox, oy] of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,2],[-2,2],[2,-2]])
    ctx.fillText(text, x + ox, y + oy);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function sRenderHud() {
  const ctx = sCtx;
  ctx.save();

  // Crosshair
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  const cx = S_W / 2, cy = S_H / 2;
  ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9); ctx.stroke();

  // Wave + enemies remaining (top-left)
  const alive = sEnemies.filter(e => e.alive).length;
  ctx.textBaseline = 'top';
  const waveLabel = `WAVE ${sWave}`;
  const enemyLabel = `${alive} REMAIN`;
  const wavesUntilBoss = 5 - (sWave % 5);
  const isBossWave = sWave % 5 === 0;
  const bossText = isBossWave ? 'BOSS WAVE!' : `${wavesUntilBoss} ${wavesUntilBoss === 1 ? 'WAVE' : 'WAVES'} UNTIL BOSS`;
  const bossColor = isBossWave ? '#f44' : wavesUntilBoss === 1 ? '#ff0' : '#aaa';
  const bossOutline = isBossWave ? '#600' : wavesUntilBoss === 1 ? '#440' : '#333';
  const bossFontSize = isBossWave ? 20 : wavesUntilBoss <= 2 ? 20 : 8 + (4 - Math.min(3, wavesUntilBoss - 1)) * 3;
  ctx.font = `${bossFontSize}px 'Press Start 2P', monospace`;
  const bossW = ctx.measureText(bossText).width;
  ctx.font = `10px 'Press Start 2P', monospace`;
  const waveW = ctx.measureText(waveLabel).width;
  ctx.font = `9px 'Press Start 2P', monospace`;
  const enemyW = ctx.measureText(enemyLabel).width;
  const topW = Math.max(waveW, enemyW, bossW) + 16;
  const boxH = bossFontSize + 52;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(6, 6, topW, boxH);
  sDrawText(ctx, waveLabel, 12, 10, 10, '#ff0', '#440');
  sDrawText(ctx, enemyLabel, 12, 28, 9, '#f80', '#420');
  sDrawText(ctx, bossText, 12, 46, bossFontSize, bossColor, bossOutline);

  // Score (top-right)
  const scoreText = `SCORE:${sPlayer.score}`;
  ctx.font = `10px 'Press Start 2P', monospace`;
  const sw = ctx.measureText(scoreText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(S_W - sw - 20, 6, sw + 14, 26);
  sDrawText(ctx, scoreText, S_W - sw - 13, 10, 10, '#ff0', '#440');

  // Health bar (bottom-left)
  const hpFrac = Math.max(0, sPlayer.hp / 100);
  const bx = 12, by = S_H - 30, bw = 150, bh = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = hpFrac > 0.5 ? '#0f0' : hpFrac > 0.25 ? '#ff0' : '#f44';
  ctx.fillRect(bx, by, bw * hpFrac, bh);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.textBaseline = 'middle';
  sDrawText(ctx, `HP:${sPlayer.hp}`, bx + bw + 8, by + bh / 2, 8, '#fff', '#333');

  // Boss health bar (full width)
  const boss = sEnemies.find(e => e.alive && (e.type === 'trump' || e.type === 'infantino'));
  if (boss) {
    const frac = Math.max(0, boss.hp / boss.maxHp);
    const margin = 12, barH = 20;
    const barW = S_W - margin * 2;
    const barY = 54;
    const isTrump = boss.type === 'trump';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(margin - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = isTrump ? '#e22' : '#a0f';
    ctx.fillRect(margin, barY, barW * frac, barH);
    ctx.strokeStyle = isTrump ? '#f55' : '#c4f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin, barY, barW, barH);
    ctx.textBaseline = 'middle';
    const bossLabel = isTrump ? `TRUMP  ${boss.hp}/${boss.maxHp}` : `INFANTINO  ${boss.hp}/${boss.maxHp}`;
    sDrawText(ctx, bossLabel, S_W / 2, barY + barH / 2, 8, '#fff', isTrump ? '#600' : '#408', 'center');
  }

  ctx.restore();
}

function sRenderOverlay() {
  const ctx = sCtx;
  ctx.save();
  ctx.textBaseline = 'middle';

  if (sGameState === 'idle') {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, S_W, S_H);
    sDrawText(ctx, '⚽ FOOTSHOOTER', S_W / 2, S_H / 2 - 70, 26, '#fff', '#333', 'center');
    sDrawText(ctx, 'survive infinite waves', S_W / 2, S_H / 2 - 10, 9, '#aaa', '#222', 'center');
    sDrawText(ctx, 'of football legends', S_W / 2, S_H / 2 + 10, 9, '#aaa', '#222', 'center');
    sDrawText(ctx, 'WASD / MOUSE / CLICK', S_W / 2, S_H / 2 + 32, 8, '#888', '#111', 'center');
    sDrawText(ctx, 'CLICK TO PLAY', S_W / 2, S_H / 2 + 76, 14, '#ff0', '#440', 'center');
  }

  if (sGameState === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, S_W, S_H);
    sDrawText(ctx, 'GAME OVER', S_W / 2, S_H / 2 - 80, 30, '#f44', '#600', 'center');
    sDrawText(ctx, `WAVE: ${sWave}`, S_W / 2, S_H / 2 - 14, 12, '#fff', '#333', 'center');
    sDrawText(ctx, `SCORE: ${sPlayer.score}`, S_W / 2, S_H / 2 + 14, 12, '#fff', '#333', 'center');
    sDrawText(ctx, 'CLICK TO PLAY AGAIN', S_W / 2, S_H / 2 + 76, 10, '#ff0', '#440', 'center');
  }

  if (sGameState === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, S_W, S_H);
    sDrawText(ctx, 'PAUSED', S_W / 2, S_H / 2 - 20, 28, '#fff', '#333', 'center');
    sDrawText(ctx, 'click to resume', S_W / 2, S_H / 2 + 24, 10, '#aaa', '#222', 'center');
  }

  ctx.restore();
}

// ── AUDIO ──────────────────────────────────────────────────────────────────
const sKickSounds = ['sounds/kick1.mp3', 'sounds/kick2.mp3', 'sounds/kick3.mp3'].map(src => {
  const a = new Audio(src); a.preload = 'auto'; return a;
});
let sKickIdx = 0;
function sPlayKick() {
  const a = sKickSounds[sKickIdx % sKickSounds.length];
  sKickIdx++;
  a.currentTime = 0;
  a.play().catch(() => {});
}

const sHitSound = new Audio('sounds/hit.mp3');
sHitSound.preload = 'auto';
const sDeathSound = new Audio('sounds/death.mp3');
sDeathSound.preload = 'auto';
const sRooneySound = new Audio('sounds/rooney.mp3');
sRooneySound.preload = 'auto';
let sRooneyLastPlayed = 0;
const sStarmerSound = new Audio('sounds/starmer.mp3');
sStarmerSound.preload = 'auto';
let sStarmerLastPlayed = 0;
const sGazzaSound = new Audio('sounds/gazza.mp3');
sGazzaSound.preload = 'auto';
let sGazzaLastPlayed = 0;
const sSvenSound = new Audio('sounds/sven.mp3');
sSvenSound.preload = 'auto';
let sSvenLastPlayed = 0;
function sPlayHit(type) {
  if (type === 'rooney') {
    const now = performance.now();
    if (!sRooneySound.paused || now - sRooneyLastPlayed < 4000) return;
    sRooneyLastPlayed = now;
    sRooneySound.currentTime = 0;
    sRooneySound.play().catch(() => {});
    return;
  }
  if (type === 'starmer') {
    const now = performance.now();
    if (!sStarmerSound.paused || now - sStarmerLastPlayed < 4000) return;
    sStarmerLastPlayed = now;
    sStarmerSound.currentTime = 0;
    sStarmerSound.play().catch(() => {});
    return;
  }
  if (type === 'gazza') {
    const now = performance.now();
    if (now - sGazzaLastPlayed < 2000) return;
    sGazzaLastPlayed = now;
    sGazzaSound.currentTime = 0;
    sGazzaSound.play().catch(() => {});
    return;
  }
  if (type === 'sven') {
    const now = performance.now();
    if (!sSvenSound.paused || now - sSvenLastPlayed < 4000) return;
    sSvenLastPlayed = now;
    sSvenSound.currentTime = 0;
    sSvenSound.play().catch(() => {});
    return;
  }
  sHitSound.currentTime = 0; sHitSound.play().catch(() => {});
}
function sPlayDeath() { sDeathSound.currentTime = 0; sDeathSound.play().catch(() => {}); }

const sWaveClearSound = new Audio('sounds/waveclear.mp3');
sWaveClearSound.preload = 'auto';
function sPlayWaveClear() { sWaveClearSound.currentTime = 0; sWaveClearSound.play().catch(() => {}); }

const sBossSound = new Audio('sounds/boss.mp3');
sBossSound.preload = 'auto';
function sPlayBoss() { sBossSound.currentTime = 0; sBossSound.play().catch(() => {}); }

const sTrumpClips = [
  'sounds/trump-maga.mp3', 'sounds/trump-fakenews.mp3', 'sounds/trump-indicted.mp3',
  'sounds/trump-dogs.mp3', 'sounds/trump-5.mp3', 'sounds/trump-6.mp3',
  'sounds/trump-7.mp3', 'sounds/trump-8.mp3',
].map(src => { const a = new Audio(src); a.preload = 'auto'; return a; });
let sTrumpClipIdx = 0;
function sPlayTrumpClip() {
  const a = sTrumpClips[sTrumpClipIdx % sTrumpClips.length];
  sTrumpClipIdx++;
  a.currentTime = 0;
  a.play().catch(() => {});
}

// ── STATE ──────────────────────────────────────────────────────────────────
let sPlayer = { x: 1.5, y: 1.5, angle: 0, hp: 100, score: 0 };
let sGameState = 'idle';   // idle | playing | wave-clear | dead | paused
let sWave = 0;
let sEnemies = [];
let sZBuffer = new Array(S_W);
let sDamageFlash = 0;
let sProjectiles = [];
let sTrumpProjectiles = [];
let sSvenProjectiles = [];
let sBossAnnounce = 0;
let sSpriteReady = false;
let sShooterInited = false;
let sPointerLocked = false;
let sLastFireTime = 0;
let sCanvas, sCtx, sAnimId, sLastTime = 0;
let sKeys = {}, sMouseDX = 0;

// ── HELPERS ────────────────────────────────────────────────────────────────
function sIsWall(x, y) {
  const mx = Math.floor(x), my = Math.floor(y);
  if (my < 0 || my >= S_MAP.length || mx < 0 || mx >= S_MAP[0].length) return true;
  return S_MAP[my][mx] > 0;
}

function sEnemyBlocked(x, y) {
  const r = 0.3, d = r * 0.707;
  return sIsWall(x + r, y) || sIsWall(x - r, y) ||
         sIsWall(x, y + r) || sIsWall(x, y - r) ||
         sIsWall(x + d, y + d) || sIsWall(x - d, y + d) ||
         sIsWall(x + d, y - d) || sIsWall(x - d, y - d);
}

function sPlayerBlocked(x, y) {
  const r = 0.25;
  return sIsWall(x + r, y) || sIsWall(x - r, y) ||
         sIsWall(x, y + r) || sIsWall(x, y - r);
}

function sHasLos(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const steps = Math.max(4, Math.ceil(Math.sqrt(dx * dx + dy * dy) * 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (sIsWall(x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

function sFindHideSpot(ex, ey, px, py) {
  // Find the nearest hidden tile that is also safely away from the player.
  // Try with a generous min-distance first, relax if nothing found.
  for (const minPlayerDist2 of [16, 9, 4, 0]) {  // 4, 3, 2, 0 units
    let best = null, bestDist = Infinity;
    for (let my = 1; my < S_MAP.length - 1; my++) {
      for (let mx = 1; mx < S_MAP[0].length - 1; mx++) {
        if (S_MAP[my][mx] !== 0) continue;
        const cx = mx + 0.5, cy = my + 0.5;
        const dPlayer = (cx - px) ** 2 + (cy - py) ** 2;
        if (dPlayer < minPlayerDist2) continue;    // too close to player
        if (sHasLos(cx, cy, px, py)) continue;    // player can see this tile
        const d = (cx - ex) ** 2 + (cy - ey) ** 2;
        if (d < bestDist) { bestDist = d; best = { x: cx, y: cy }; }
      }
    }
    if (best) return best;
  }
  return null;
}

// ── DDA RAY-CASTER ─────────────────────────────────────────────────────────
function sCastRay(px, py, rdx, rdy) {
  // rdx and rdy are already the ray direction — no cos/sin needed
  let mx = Math.floor(px), my = Math.floor(py);
  const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
  let stepX, stepY, sdx, sdy;
  if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; }
  else          { stepX =  1; sdx = (mx + 1 - px) * ddx; }
  if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; }
  else          { stepY =  1; sdy = (my + 1 - py) * ddy; }
  let side = 0;
  for (let i = 0; i < 64; i++) {
    if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; }
    else           { sdy += ddy; my += stepY; side = 1; }
    if (S_MAP[my] && S_MAP[my][mx] > 0) break;
  }
  const dist = Math.max(side === 0 ? sdx - ddx : sdy - ddy, 0.01);
  const wallType = (S_MAP[my] && S_MAP[my][mx]) || 1;
  let wallX = side === 0 ? py + dist * rdy : px + dist * rdx;
  wallX -= Math.floor(wallX);
  return { dist, side, wallX, wallType };
}

// ── PLAYER CONTROLS ────────────────────────────────────────────────────────
function sShoot() {
  if (sGameState !== 'playing') return;
  const now = performance.now();
  if (now - sLastFireTime < 300) return;
  sLastFireTime = now;
  sPlayKick();
  sProjectiles.push({ age: 0 });

  const px = sPlayer.x, py = sPlayer.y, pa = sPlayer.angle;
  const dirX = Math.cos(pa), dirY = Math.sin(pa);
  const plX = -dirY * S_PLANE_LEN, plY = dirX * S_PLANE_LEN;
  const invDet = 1 / (plX * dirY - dirX * plY);
  const HIT_RANGE = 10;

  let bestDist = Infinity, target = null;
  for (const e of sEnemies) {
    if (!e.alive) continue;
    const sx = e.x - px, sy = e.y - py;
    const transformY = invDet * (-plY * sx + plX * sy);
    if (transformY <= 0 || transformY > HIT_RANGE) continue;
    if (transformY >= sZBuffer[Math.round(S_W / 2)]) continue;
    const transformX = invDet * (dirY * sx - dirX * sy);
    const screenX = (S_W / 2) * (1 + transformX / transformY);
    const sprW = Math.abs(S_H / transformY) * e.scale;
    if (screenX < S_W / 2 - sprW / 2 || screenX > S_W / 2 + sprW / 2) continue;
    if (transformY < bestDist) { bestDist = transformY; target = e; }
  }

  if (target) {
    target.hp -= target.shotDmg;
    target.hitFlash = 8;
    if (target.type === 'trump') {
      target.hitsReceived++;
      if (target.hitsReceived % 4 === 0) { target.fleeTimer = 2 + Math.random() * 1; target.hideTarget = null; }
    }
    if (target.hp <= 0) {
      target.alive = false;
      sPlayer.score += target.points;
      sPlayHit(target.type);
      sPlayDeath();
      sCheckWaveClear();
    } else {
      sPlayHit(target.type);
    }
  }
}

const sWaveClearGifs = [
  { src: 'sprites/waveclear.mp4',  duration: 4800 },
  { src: 'sprites/waveclear2.mp4', duration: 4000 },
  { src: 'sprites/waveclear3.mp4', duration: 5460 },
  { src: 'sprites/waveclear4.mp4', duration: 4000 },
  { src: 'sprites/waveclear5.mp4', duration: 4000 },
  { src: 'sprites/waveclear6.mp4', duration: 4000 },
];
let sWaveClearGifIdx = 0;
function sShowWaveClearGif(show) {
  const gif = document.getElementById('wave-clear-gif');
  if (!gif) return 4000;
  if (show) {
    const entry = sWaveClearGifs[sWaveClearGifIdx % sWaveClearGifs.length];
    sWaveClearGifIdx++;
    gif.src = entry.src;
    gif.load();
    gif.play().catch(() => {});
    gif.style.display = 'block';
    return entry.duration;
  }
  gif.pause();
  gif.style.display = 'none';
  return 0;
}

function sSetWaveClearText(show, nextWave) {
  const top = document.getElementById('wave-clear-top');
  const bot = document.getElementById('wave-clear-bottom');
  if (!top || !bot) return;
  if (show) {
    top.textContent = 'WAVE CLEAR';
    bot.textContent = `preparing wave ${nextWave}...`;
    top.style.display = 'block';
    bot.style.display = 'block';
  } else {
    top.style.display = 'none';
    bot.style.display = 'none';
  }
}

function sCheckWaveClear() {
  if (sEnemies.some(e => e.alive)) return;
  sGameState = 'wave-clear';
  sPlayWaveClear();
  sSetWaveClearText(true, sWave + 1);
  const gifDuration = sShowWaveClearGif(true);
  setTimeout(() => { if (sGameState === 'wave-clear') sNextWave(); }, gifDuration);
}

function sUpdatePlayer(dt) {
  if (sGameState !== 'playing' && sGameState !== 'wave-clear') return;
  const p = sPlayer;
  const cos = Math.cos(p.angle), sin = Math.sin(p.angle);
  const spd = S_MOVE_SPEED * dt;

  p.angle += sMouseDX * S_ROT_SPEED;
  sMouseDX = 0;

  if (sKeys['KeyW'] || sKeys['ArrowUp']) {
    const nx = p.x + cos * spd, ny = p.y + sin * spd;
    if (!sPlayerBlocked(nx, p.y)) p.x = nx;
    if (!sPlayerBlocked(p.x, ny)) p.y = ny;
  }
  if (sKeys['KeyS'] || sKeys['ArrowDown']) {
    const nx = p.x - cos * spd, ny = p.y - sin * spd;
    if (!sPlayerBlocked(nx, p.y)) p.x = nx;
    if (!sPlayerBlocked(p.x, ny)) p.y = ny;
  }
  if (sKeys['KeyA']) {
    const nx = p.x + sin * spd, ny = p.y - cos * spd;
    if (!sPlayerBlocked(nx, p.y)) p.x = nx;
    if (!sPlayerBlocked(p.x, ny)) p.y = ny;
  }
  if (sKeys['KeyD']) {
    const nx = p.x - sin * spd, ny = p.y + cos * spd;
    if (!sPlayerBlocked(nx, p.y)) p.x = nx;
    if (!sPlayerBlocked(p.x, ny)) p.y = ny;
  }
}

function sSetupInput() {
  document.addEventListener('keydown', e => {
    sKeys[e.code] = true;
    if (e.code === 'Space') { if (sPointerLocked) e.preventDefault(); sShoot(); }
  });
  document.addEventListener('keyup', e => { sKeys[e.code] = false; });

  sCanvas.addEventListener('click', () => {
    if (sGameState === 'idle' || sGameState === 'dead') { sStartGame(); return; }
    if (sGameState === 'paused') { sCanvas.requestPointerLock(); return; }
    if (sPointerLocked) { sShoot(); return; }
    sCanvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    sPointerLocked = document.pointerLockElement === sCanvas;
    if (!sPointerLocked && sGameState === 'playing') sGameState = 'paused';
    if (sPointerLocked && sGameState === 'paused') sGameState = 'playing';
  });

  document.addEventListener('mousemove', e => {
    if (!sPointerLocked) return;
    sMouseDX += e.movementX;
  });
}

// ── ENEMY AI ───────────────────────────────────────────────────────────────
function sUpdateEnemies(dt) {
  for (const e of sEnemies) {
    if (!e.alive) continue;
    if (e.type === 'trump') {
      e.voiceTimer -= dt;
      if (e.voiceTimer <= 0) {
        sPlayTrumpClip();
        e.voiceTimer = 5 + Math.random() * 5;
      }
    }
    const dx = sPlayer.x - e.x, dy = sPlayer.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.7) {
      e.attackCooldown -= dt;
      if (e.attackCooldown <= 0) {
        sPlayer.hp -= e.damage;
        e.attackCooldown = 1.0;
        sDamageFlash = 8;
        if (sPlayer.hp <= 0) { sPlayer.hp = 0; sGameState = 'dead'; return; }
      }
      continue;
    }

    if (e.fleeTimer > 0) {
      e.fleeTimer -= dt;

      // Already hidden behind a wall — stay put until timer expires or LOS returns
      if (!sHasLos(e.x, e.y, sPlayer.x, sPlayer.y)) {
        continue;
      }

      // Find a hiding spot once per flee episode (or if we arrived and player moved)
      if (!e.hideTarget) {
        e.hideTarget = sFindHideSpot(e.x, e.y, sPlayer.x, sPlayer.y);
      }

      const fleeSpd = e.speed * 3.0 * dt;

      // Determine target direction
      let tdx, tdy;
      if (e.hideTarget) {
        tdx = e.hideTarget.x - e.x;
        tdy = e.hideTarget.y - e.y;
        const hdist = Math.sqrt(tdx * tdx + tdy * tdy);
        if (hdist < 0.4) {
          // Arrived but player followed — pick a new spot
          e.hideTarget = sFindHideSpot(e.x, e.y, sPlayer.x, sPlayer.y);
          continue;
        }
        tdx /= hdist; tdy /= hdist;
      } else {
        // No hiding spot at all — run directly away from player
        tdx = -dx / dist; tdy = -dy / dist;
      }

      const nx = e.x + tdx * fleeSpd, ny = e.y + tdy * fleeSpd;
      if (!sEnemyBlocked(nx, e.y)) e.x = nx;
      else if (!sEnemyBlocked(e.x, ny)) e.y = ny;
      else {
        // Wall in the way — try angled slides; never abort flee
        const ang = Math.atan2(tdy, tdx);
        for (const da of [0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
          const ax = e.x + Math.cos(ang + da) * fleeSpd;
          const ay = e.y + Math.sin(ang + da) * fleeSpd;
          if (!sEnemyBlocked(ax, e.y)) { e.x = ax; break; }
          if (!sEnemyBlocked(e.x, ay)) { e.y = ay; break; }
        }
        // If every angle is blocked, stay put and wait — flee timer still counts down
      }
      continue;
    }

    // Trump fires projectiles at the player
    if (e.type === 'trump' && dist > 2) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 2.5 + Math.random() * 1.5;
        sTrumpProjectiles.push({ x: e.x, y: e.y, dx: (dx / dist) * 10, dy: (dy / dist) * 10 });
      }
    }

    // Sven fires Sweden balls at the player
    if (e.type === 'sven' && dist > 2 && e.fleeTimer <= 0) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 1 + Math.random() * 1;
        sSvenProjectiles.push({ x: e.x, y: e.y, dx: (dx / dist) * 7, dy: (dy / dist) * 7 });
      }
    }

    let moveX = 0, moveY = 0;
    if (e.behaviour === 'direct') {
      moveX = (dx / dist) * e.speed * dt;
      moveY = (dy / dist) * e.speed * dt;
    } else if (e.behaviour === 'zigzag') {
      e.zigzagTimer -= dt;
      if (e.zigzagTimer <= 0) { e.zigzagDir *= -1; e.zigzagTimer = 0.35 + Math.random() * 0.3; }
      const base = Math.atan2(dy, dx);
      moveX = Math.cos(base + e.zigzagDir * Math.PI / 4) * e.speed * dt;
      moveY = Math.sin(base + e.zigzagDir * Math.PI / 4) * e.speed * dt;
    } else if (e.behaviour === 'hesitate') {
      if (dist < 5) {
        e.hesitateTimer -= dt;
        if (e.hesitateTimer > 0) continue;
      } else {
        e.hesitateTimer = 1.0;
      }
      moveX = (dx / dist) * e.speed * dt;
      moveY = (dy / dist) * e.speed * dt;
    }

    const nx = e.x + moveX, ny = e.y + moveY;
    if (!sEnemyBlocked(nx, e.y)) e.x = nx;
    else if (!sEnemyBlocked(e.x, ny)) e.y = ny;
    else {
      // both axis blocked — try angled slides to escape a corner
      const baseAngle = Math.atan2(dy, dx);
      for (const da of [0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) {
        const ax = e.x + Math.cos(baseAngle + da) * e.speed * dt;
        const ay = e.y + Math.sin(baseAngle + da) * e.speed * dt;
        if (!sEnemyBlocked(ax, e.y)) { e.x = ax; break; }
        if (!sEnemyBlocked(e.x, ay)) { e.y = ay; break; }
      }
    }

    // Safety clamp — if enemy somehow escaped the outer walls, pull back in
    const MARGIN = 1.3;
    e.x = Math.max(MARGIN, Math.min(S_MAP[0].length - MARGIN, e.x));
    e.y = Math.max(MARGIN, Math.min(S_MAP.length - MARGIN, e.y));
    // If still inside a wall after clamping (shouldn't happen normally), kill and score 0
    if (sIsWall(e.x, e.y)) { e.alive = false; sCheckWaveClear(); }
  }
}

function sUpdateTrumpProjectiles(dt) {
  for (let i = sTrumpProjectiles.length - 1; i >= 0; i--) {
    const p = sTrumpProjectiles[i];
    p.x += p.dx * dt;
    p.y += p.dy * dt;
    if (sIsWall(p.x, p.y)) { sTrumpProjectiles.splice(i, 1); continue; }
    const pdx = sPlayer.x - p.x, pdy = sPlayer.y - p.y;
    if (pdx * pdx + pdy * pdy < 0.25) {
      sPlayer.hp -= 15;
      sDamageFlash = 10;
      sTrumpProjectiles.splice(i, 1);
      if (sPlayer.hp <= 0) { sPlayer.hp = 0; sGameState = 'dead'; }
    }
  }
}

function sUpdateSvenProjectiles(dt) {
  for (let i = sSvenProjectiles.length - 1; i >= 0; i--) {
    const p = sSvenProjectiles[i];
    p.x += p.dx * dt;
    p.y += p.dy * dt;
    if (sIsWall(p.x, p.y)) { sSvenProjectiles.splice(i, 1); continue; }
    const pdx = sPlayer.x - p.x, pdy = sPlayer.y - p.y;
    if (pdx * pdx + pdy * pdy < 0.25) {
      sPlayer.hp -= 10;
      sDamageFlash = 8;
      sSvenProjectiles.splice(i, 1);
      if (sPlayer.hp <= 0) { sPlayer.hp = 0; sGameState = 'dead'; }
    }
  }
}

// ── RENDER ─────────────────────────────────────────────────────────────────
// ── WALL TEXTURES ───────────────────────────────────────────────────────────
const sTextures = {};
function sGenTextures() {
  // 1: Stadium concrete — grey brick with red/white FIFA trim
  {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#556655'; ctx.fillRect(0, 0, 64, 64);
    for (let row = 0; row < 8; row++) {
      const y = row * 8, offset = (row % 2) * 16;
      ctx.fillStyle = '#3a4a3a'; ctx.fillRect(0, y, 64, 1);
      for (let col = 0; col < 5; col++) ctx.fillRect((col * 16 + offset) % 64, y, 1, 8);
    }
    ctx.fillStyle = '#bb0022'; ctx.fillRect(0, 0, 64, 6); ctx.fillRect(0, 58, 64, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 6, 64, 1); ctx.fillRect(0, 57, 64, 1);
    sTextures[1] = c;
  }
  // 2: Goal net — dark background with white grid
  {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#080818'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 64; i += 8) { ctx.fillRect(i, 0, 1, 64); ctx.fillRect(0, i, 64, 1); }
    sTextures[2] = c;
  }
  // 3: Pitch-side hoarding — green turf over red/white ad board
  {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1d6b1d'; ctx.fillRect(0, 0, 64, 42);
    ctx.fillStyle = '#228b22';
    for (let i = 0; i < 4; i++) ctx.fillRect(i * 16, 0, 8, 42);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 40, 64, 2);
    ctx.fillStyle = '#dd0022'; ctx.fillRect(0, 42, 64, 22);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) ctx.fillRect(i * 16, 42, 8, 22);
    ctx.fillStyle = '#dd0022';
    for (let i = 0; i < 4; i++) ctx.fillRect(i * 16 + 2, 46, 4, 14);
    sTextures[3] = c;
  }
}

function sRender() {
  const ctx = sCtx;
  const px = sPlayer.x, py = sPlayer.y, pa = sPlayer.angle;
  const dirX = Math.cos(pa), dirY = Math.sin(pa);
  const plX = -dirY * S_PLANE_LEN, plY = dirX * S_PLANE_LEN;

  // Ceiling (stadium stands)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, S_W, S_H / 2);
  // Floor (pitch)
  ctx.fillStyle = '#1a4a1a';
  ctx.fillRect(0, S_H / 2, S_W, S_H / 2);

  // Walls
  for (let x = 0; x < S_W; x++) {
    const camX = 2 * x / S_W - 1;
    const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
    const { dist, side, wallX, wallType } = sCastRay(px, py, rdx, rdy);
    const wallH = Math.min(S_H / dist, S_H);
    const wallTop = (S_H - wallH) / 2;
    const tex = sTextures[wallType] || sTextures[1];
    const texX = Math.floor(wallX * 64);
    ctx.drawImage(tex, texX, 0, 1, 64, x, wallTop, 1, wallH);
    if (side === 1) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, wallTop, 1, wallH); }
    sZBuffer[x] = dist;
  }
  sRenderSprites();

  // Trump projectiles (world-space billboard)
  const invDet = 1 / (plX * dirY - dirX * plY);
  for (const p of sTrumpProjectiles) {
    const sx = p.x - px, sy = p.y - py;
    const tX = invDet * (dirY * sx - dirX * sy);
    const tY = invDet * (-plY * sx + plX * sy);
    if (tY <= 0.1) continue;
    const screenX = Math.round(S_W / 2 * (1 + tX / tY));
    if (screenX < 0 || screenX >= S_W || tY >= sZBuffer[screenX]) continue;
    const r = Math.max(3, Math.round(S_H / tY / 12));
    const sY = S_H / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, sY, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4400';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = r * 3;
    ctx.fill();
    ctx.restore();
  }

  // Sven projectiles (Sweden-coloured balls)
  for (const p of sSvenProjectiles) {
    const sx = p.x - px, sy = p.y - py;
    const tX = invDet * (dirY * sx - dirX * sy);
    const tY = invDet * (-plY * sx + plX * sy);
    if (tY <= 0.1) continue;
    const screenX2 = Math.round(S_W / 2 * (1 + tX / tY));
    if (screenX2 < 0 || screenX2 >= S_W || tY >= sZBuffer[screenX2]) continue;
    const r = Math.max(3, Math.round(S_H / tY / 14));
    const sY2 = S_H / 2;
    ctx.save();
    // Blue circle
    ctx.beginPath(); ctx.arc(screenX2, sY2, r, 0, Math.PI * 2);
    ctx.fillStyle = '#006AA7'; ctx.shadowColor = '#FECC02'; ctx.shadowBlur = r * 2; ctx.fill();
    // Yellow cross
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FECC02';
    ctx.fillRect(screenX2 - r, sY2 - Math.round(r * 0.28), r * 2, Math.round(r * 0.56));
    ctx.fillRect(screenX2 - Math.round(r * 0.28), sY2 - r, Math.round(r * 0.56), r * 2);
    ctx.restore();
  }

  // Soccer ball projectiles
  for (let i = sProjectiles.length - 1; i >= 0; i--) {
    const p = sProjectiles[i];
    p.age++;
    const t = p.age / 9;
    const size = 66 - t * 52;
    sCtx.save();
    sCtx.globalAlpha = Math.max(0.8, 1 - t * 0.1);
    sCtx.font = `${Math.round(size)}px serif`;
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('⚽', S_W / 2, S_H * 0.75 - t * (S_H * 0.75 - S_H / 2));
    sCtx.restore();
    if (p.age >= 9) sProjectiles.splice(i, 1);
  }

  if (sDamageFlash > 0) {
    sCtx.fillStyle = `rgba(255,0,0,${(sDamageFlash / 8) * 0.4})`;
    sCtx.fillRect(0, 0, S_W, S_H);
    sDamageFlash--;
  }
  if (sGameState === 'playing' || sGameState === 'wave-clear') sRenderHud();

  if (sGameState === 'wave-clear') {
    sCtx.fillStyle = 'rgba(0,0,0,0.6)';
    sCtx.fillRect(0, 0, S_W, S_H);
  }

  if (sGameState === 'playing' && sBossAnnounce > 0) {
    sBossAnnounce--;
    const isTrump = sWave % 5 === 0 && sWave % 10 !== 0;
    const alpha = sBossAnnounce > 120 ? 1 : sBossAnnounce / 120;
    const scale = sBossAnnounce > 120 ? 1 + (sBossAnnounce - 120) / 60 * 0.4 : 1;
    sCtx.save();
    sCtx.textBaseline = 'middle';
    sCtx.translate(S_W / 2, S_H / 3);
    sCtx.scale(scale, scale);
    sCtx.globalAlpha = alpha;
    sDrawText(sCtx, isTrump ? '🇺🇸 TRUMP INCOMING 🇺🇸' : 'BOSS WAVE', 0, 0, 22, '#f22', '#600', 'center');
    sDrawText(sCtx, isTrump ? 'the mega-boss has arrived' : 'eliminate the boss to advance', 0, 44, 9, '#fcc', '#400', 'center');
    sCtx.restore();
  }

  sRenderOverlay();
}

// ── GAME LOOP ──────────────────────────────────────────────────────────────
function sLoop(ts) {
  sAnimId = requestAnimationFrame(sLoop);
  const dt = Math.min((ts - sLastTime) / 1000, 0.05);
  sLastTime = ts;
  if (sGameState === 'playing' || sGameState === 'wave-clear') sUpdatePlayer(dt);
  if (sGameState === 'playing') { sUpdateEnemies(dt); sUpdateTrumpProjectiles(dt); sUpdateSvenProjectiles(dt); }
  if (sGameState === 'playing' && sWave > 0 && !sEnemies.some(e => e.alive)) sCheckWaveClear();
  sRender();
}

// ── WAVE / GAME START ──────────────────────────────────────────────────────
function sWaveEnemyList(wave) {
  if (wave % 10 === 0) return [{ type: 'infantino', count: 1 }];
  if (wave % 5 === 0)  return [{ type: 'trump',     count: 1 }];

  const isMini = wave % 3 === 0;
  const list = [];

  if (wave === 1) {
    list.push({ type: 'rooney', count: 3 });
  } else if (wave === 2) {
    list.push({ type: 'rooney', count: 3 }, { type: 'gazza', count: 2 });
  } else if (wave === 3) {
    list.push({ type: 'rooney', count: 2 }, { type: 'gazza', count: 2 });
  } else if (wave === 4) {
    list.push({ type: 'rooney', count: 2 }, { type: 'gazza', count: 2 },
               { type: 'sven', count: 1 }, { type: 'starmer', count: 1 }, { type: 'maguire', count: 1 });
  } else {
    const pool = ['rooney', 'gazza', 'sven', 'starmer', 'maguire'];
    const total = 6 + (wave - 4) * 2;
    for (let i = 0; i < total; i++) {
      list.push({ type: pool[Math.floor(Math.random() * pool.length)], count: 1 });
    }
  }

  if (isMini) list.push({ type: 'gazza-trophy', count: 1 });
  return list;
}

function sNextWave() {
  sSetWaveClearText(false);
  sShowWaveClearGif(false);
  sWave++;
  sEnemies = [];
  sGameState = 'playing';
  if (sWave % 5 === 0) { sBossAnnounce = 180; sPlayBoss(); if (sWave % 10 !== 0) sPlayTrumpClip(); }
  const entries = sWaveEnemyList(sWave);
  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) {
      const pos = sRandomSpawnPos();
      sEnemies.push(sSpawnEnemy(entry.type, pos.x, pos.y));
    }
  }
  if (sCanvas && sGameState === 'playing') sCanvas.requestPointerLock();
}

function sStartGame() {
  sPlayer = { x: 1.5, y: 1.5, angle: 0, hp: 100, score: 0 };
  sWave = 0;
  sEnemies = [];
  sDamageFlash = 0;
  sBossAnnounce = 0;
  sTrumpProjectiles = [];
  sSvenProjectiles = [];
  sNextWave();
}

function sPreloadVideos() {
  sWaveClearGifs.forEach(({ src }) => {
    const v = document.createElement('video');
    v.src = src;
    v.preload = 'auto';
    v.muted = true;
    v.load();
  });
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────
function initShooter() {
  if (sShooterInited) { resumeShooter(); return; }
  sShooterInited = true;
  sCanvas = document.getElementById('shooter-canvas');
  sCanvas.width = S_W;
  sCanvas.height = S_H;
  sCtx = sCanvas.getContext('2d');
  sGenTextures();
  sSetupInput();
  if (!sSpriteReady) sLoadSprites();
  sPreloadVideos();
  sAnimId = requestAnimationFrame(sLoop);
}

function pauseShooter() {
  if (sAnimId) { cancelAnimationFrame(sAnimId); sAnimId = null; }
  if (document.pointerLockElement === sCanvas) document.exitPointerLock();
  sKeys = {};
  sSetWaveClearText(false);
  sShowWaveClearGif(false);
  if (sGameState === 'playing' || sGameState === 'wave-clear') sGameState = 'paused';
}

function resumeShooter() {
  if (!sAnimId && sShooterInited) sAnimId = requestAnimationFrame(sLoop);
}
