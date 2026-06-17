// ── CONSTANTS ──────────────────────────────────────────────────────────────
const S_W = 640, S_H = 480;
const S_FOV = Math.PI / 3;                  // 60° field of view
const S_PLANE_LEN = Math.tan(S_FOV / 2);   // camera plane half-width ≈ 0.577
const S_MOVE_SPEED = 3.0;                   // map units/second
const S_ROT_SPEED = 0.002;                  // radians per pixel of mouse movement

const S_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ── SPRITES ────────────────────────────────────────────────────────────────
const S_SPRITE_DEFS = {
  rooney:         { src: 'sprites/rooney.png',        bg: 'transparent' },
  gazza:          { src: 'sprites/gazza.png',          bg: 'white' },
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
  sven:           { sprite: 'sven',          hp: 2,  speed: 1.5, scale: 1.0, damage: 10, behaviour: 'direct',   points: 10,  shotDmg: 1 },
  starmer:        { sprite: 'starmer',       hp: 2,  speed: 2.0, scale: 1.0, damage: 10, behaviour: 'direct',   points: 10,  shotDmg: 1 },
  maguire:        { sprite: 'maguire',       hp: 3,  speed: 1.2, scale: 1.0, damage: 10, behaviour: 'hesitate', points: 10,  shotDmg: 1 },
  'gazza-trophy': { sprite: 'gazza-trophy',  hp: 5,  speed: 2.8, scale: 1.2, damage: 15, behaviour: 'zigzag',   points: 25,  shotDmg: 1 },
  infantino:      { sprite: 'infantino',     hp: 10, speed: 3.5, scale: 1.5, damage: 20, behaviour: 'direct',   points: 50,  shotDmg: 2 },
  trump:          { sprite: 'trump',         hp: 20, speed: 3.5, scale: 2.0, damage: 20, behaviour: 'direct',   points: 150, shotDmg: 2 },
};

function sSpawnEnemy(type, x, y) {
  const def = S_ENEMY_TYPES[type];
  return {
    type, x, y,
    sprite: def.sprite, hp: def.hp, maxHp: def.hp,
    speed: def.speed, scale: def.scale, damage: def.damage,
    behaviour: def.behaviour, points: def.points, shotDmg: def.shotDmg,
    alive: true, zigzagTimer: 0, zigzagDir: 1, hesitateTimer: 0, attackCooldown: 0, hitFlash: 0,
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

    const x0 = Math.max(0, Math.floor(drawX));
    const x1 = Math.min(S_W - 1, Math.floor(drawX + sprW));
    for (let x = x0; x <= x1; x++) {
      if (transformY >= sZBuffer[x]) continue;
      const srcX = Math.floor((x - drawX) / sprW * img.width);
      sCtx.drawImage(img, srcX, 0, 1, img.height, x, drawY, 1, sprH);
      if (e.hitFlash > 0) {
        sCtx.fillStyle = `rgba(255,0,0,${(e.hitFlash / 8) * 0.7})`;
        sCtx.fillRect(x, drawY, 1, sprH);
      }
    }
    if (e.hitFlash > 0) e.hitFlash--;
  }
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
  ctx.font = 'bold 14px monospace';
  ctx.textBaseline = 'top';
  const waveText = `WAVE ${sWave}  ·  ${alive} LEFT`;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(6, 6, ctx.measureText(waveText).width + 12, 24);
  ctx.fillStyle = '#fff';
  ctx.fillText(waveText, 12, 10);

  // Score (top-right)
  const scoreText = `SCORE: ${sPlayer.score}`;
  const sw = ctx.measureText(scoreText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(S_W - sw - 18, 6, sw + 12, 24);
  ctx.fillStyle = '#ff0';
  ctx.fillText(scoreText, S_W - sw - 12, 10);

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
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(`HP: ${sPlayer.hp}`, bx + bw + 6, by + bh / 2);

  ctx.restore();
}

function sRenderOverlay() {
  const ctx = sCtx;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (sGameState === 'idle') {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, S_W, S_H);
    ctx.font = 'bold 50px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('⚽ FOOTSHOOTER', S_W / 2, S_H / 2 - 70);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('survive infinite waves of football legends', S_W / 2, S_H / 2 - 16);
    ctx.fillText('WASD · mouse to aim · click/space to shoot', S_W / 2, S_H / 2 + 16);
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#ff0';
    ctx.fillText('CLICK TO PLAY', S_W / 2, S_H / 2 + 76);
  }

  if (sGameState === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, S_W, S_H);
    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = '#f44';
    ctx.fillText('GAME OVER', S_W / 2, S_H / 2 - 80);
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Wave reached: ${sWave}`, S_W / 2, S_H / 2 - 16);
    ctx.fillText(`Final score: ${sPlayer.score}`, S_W / 2, S_H / 2 + 20);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ff0';
    ctx.fillText('CLICK TO PLAY AGAIN', S_W / 2, S_H / 2 + 80);
  }

  if (sGameState === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, S_W, S_H);
    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('PAUSED', S_W / 2, S_H / 2 - 20);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('click to resume', S_W / 2, S_H / 2 + 20);
  }

  ctx.restore();
}

// ── STATE ──────────────────────────────────────────────────────────────────
let sPlayer = { x: 1.5, y: 1.5, angle: 0, hp: 100, score: 0 };
let sGameState = 'idle';   // idle | playing | wave-clear | dead | paused
let sWave = 0;
let sEnemies = [];
let sZBuffer = new Array(S_W);
let sDamageFlash = 0;
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
  return S_MAP[my][mx] === 1;
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
    if (S_MAP[my] && S_MAP[my][mx] === 1) break;
  }
  return { dist: Math.max(side === 0 ? sdx - ddx : sdy - ddy, 0.01), side };
}

// ── PLAYER CONTROLS ────────────────────────────────────────────────────────
function sShoot() {
  if (sGameState !== 'playing') return;
  const now = performance.now();
  if (now - sLastFireTime < 300) return;
  sLastFireTime = now;

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
    if (target.hp <= 0) {
      target.alive = false;
      sPlayer.score += target.points;
      sCheckWaveClear();
    }
  }
}

function sCheckWaveClear() {
  if (sEnemies.some(e => e.alive)) return;
  sGameState = 'wave-clear';
  setTimeout(() => { if (sGameState === 'wave-clear') sNextWave(); }, 2000);
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
    if (!sIsWall(nx, p.y)) p.x = nx;
    if (!sIsWall(p.x, ny)) p.y = ny;
  }
  if (sKeys['KeyS'] || sKeys['ArrowDown']) {
    const nx = p.x - cos * spd, ny = p.y - sin * spd;
    if (!sIsWall(nx, p.y)) p.x = nx;
    if (!sIsWall(p.x, ny)) p.y = ny;
  }
  if (sKeys['KeyA']) {
    const nx = p.x + sin * spd, ny = p.y - cos * spd;
    if (!sIsWall(nx, p.y)) p.x = nx;
    if (!sIsWall(p.x, ny)) p.y = ny;
  }
  if (sKeys['KeyD']) {
    const nx = p.x - sin * spd, ny = p.y + cos * spd;
    if (!sIsWall(nx, p.y)) p.x = nx;
    if (!sIsWall(p.x, ny)) p.y = ny;
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
    if (!sIsWall(nx, e.y)) e.x = nx;
    else if (!sIsWall(e.x, ny)) e.y = ny;
  }
}

// ── RENDER ─────────────────────────────────────────────────────────────────
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
    const { dist, side } = sCastRay(px, py, rdx, rdy);
    const wallH = Math.min(S_H / dist, S_H);
    ctx.fillStyle = side === 0 ? '#5a5a5a' : '#3a3a3a';
    ctx.fillRect(x, (S_H - wallH) / 2, 1, wallH);
    sZBuffer[x] = dist;
  }
  sRenderSprites();

  if (sDamageFlash > 0) {
    sCtx.fillStyle = `rgba(255,0,0,${(sDamageFlash / 8) * 0.4})`;
    sCtx.fillRect(0, 0, S_W, S_H);
    sDamageFlash--;
  }
  if (sGameState === 'playing' || sGameState === 'wave-clear') sRenderHud();

  if (sGameState === 'wave-clear') {
    sCtx.save();
    sCtx.fillStyle = 'rgba(0,0,0,0.45)';
    sCtx.fillRect(0, 0, S_W, S_H);
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.font = 'bold 48px monospace';
    sCtx.fillStyle = '#0f0';
    sCtx.fillText('WAVE CLEAR', S_W / 2, S_H / 2);
    sCtx.font = 'bold 18px monospace';
    sCtx.fillStyle = '#aaa';
    sCtx.fillText(`preparing wave ${sWave + 1}…`, S_W / 2, S_H / 2 + 52);
    sCtx.restore();
  }

  if (sGameState === 'playing' && sBossAnnounce > 0) {
    sBossAnnounce--;
    sCtx.save();
    sCtx.font = 'bold 32px monospace';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillStyle = `rgba(255,50,50,${sBossAnnounce / 120})`;
    sCtx.fillText(sWave % 10 === 0 ? '🇺🇸  TRUMP INCOMING  🇺🇸' : '⚠  BOSS WAVE  ⚠', S_W / 2, S_H / 4);
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
  if (sGameState === 'playing') sUpdateEnemies(dt);
  if (sGameState === 'playing' && sWave > 0 && !sEnemies.some(e => e.alive)) sCheckWaveClear();
  sRender();
}

// ── WAVE / GAME START ──────────────────────────────────────────────────────
function sWaveEnemyList(wave) {
  if (wave % 10 === 0) return [{ type: 'trump',     count: 1 }];
  if (wave % 5 === 0)  return [{ type: 'infantino', count: 1 }];

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
  sWave++;
  sEnemies = [];
  sGameState = 'playing';
  if (sWave % 5 === 0) sBossAnnounce = 120;
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
  sNextWave();
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────
function initShooter() {
  if (sShooterInited) { resumeShooter(); return; }
  sShooterInited = true;
  sCanvas = document.getElementById('shooter-canvas');
  sCanvas.width = S_W;
  sCanvas.height = S_H;
  sCtx = sCanvas.getContext('2d');
  sSetupInput();
  if (!sSpriteReady) sLoadSprites();
  sAnimId = requestAnimationFrame(sLoop);
}

function pauseShooter() {
  if (sAnimId) { cancelAnimationFrame(sAnimId); sAnimId = null; }
  if (document.pointerLockElement === sCanvas) document.exitPointerLock();
  sKeys = {};
  if (sGameState === 'playing' || sGameState === 'wave-clear') sGameState = 'paused';
}

function resumeShooter() {
  if (!sAnimId && sShooterInited) sAnimId = requestAnimationFrame(sLoop);
}
