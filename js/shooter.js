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
  // Hit detection added in Task 6
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
    if (e.code === 'Space') { e.preventDefault(); sShoot(); }
  });
  document.addEventListener('keyup', e => { sKeys[e.code] = false; });

  sCanvas.addEventListener('click', () => {
    if (sGameState === 'idle' || sGameState === 'dead') { sStartGame(); return; }
    if (sGameState === 'paused') { sCanvas.requestPointerLock(); return; }
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
}

// ── GAME LOOP ──────────────────────────────────────────────────────────────
function sLoop(ts) {
  sAnimId = requestAnimationFrame(sLoop);
  const dt = Math.min((ts - sLastTime) / 1000, 0.05);
  sLastTime = ts;
  if (sGameState === 'playing' || sGameState === 'wave-clear') sUpdatePlayer(dt);
  sRender();
}

// ── WAVE / GAME START ──────────────────────────────────────────────────────
function sNextWave() {
  sWave++;
  sEnemies = [];
  sGameState = 'playing';
  if (sCanvas) sCanvas.requestPointerLock();
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
  sAnimId = requestAnimationFrame(sLoop);
}

function pauseShooter() {
  if (sAnimId) { cancelAnimationFrame(sAnimId); sAnimId = null; }
  if (document.pointerLockElement === sCanvas) document.exitPointerLock();
}

function resumeShooter() {
  if (!sAnimId && sShooterInited) sAnimId = requestAnimationFrame(sLoop);
}
