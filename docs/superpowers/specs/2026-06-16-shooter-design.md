# Boomer Shooter — Design Spec

**Date:** 2026-06-16  
**Status:** Approved

---

## Overview

A standalone Wolfenstein/Doom-style ray-cast first-person shooter embedded as a proper tab in the World Cup sweepstakes app. You shoot footballs at infamous football figures in an infinite wave survival mode. No connection to sweepstakes data — pure fun.

---

## Files

| File | Purpose |
|------|---------|
| `js/shooter.js` | Ray-caster engine + game logic (entire game lives here) |
| `css/shooter.css` | Canvas container, overlay screens, game-over panel |
| `sprites/rooney.png` | Wayne Rooney sprite (transparent background) |
| `sprites/gazza.png` | Paul Gascoigne sprite (white background — handled via canvas multiply) |
| `sprites/southgate.png` | Gareth Southgate sprite (to be added) |
| `sprites/infantino.png` | Gianni Infantino boss sprite (to be added) |

Existing files modified: `index.html` (new tab button + canvas container), `js/main.js` (tab switch wires up pointer lock release).

---

## Tab Integration

- New "Shooter" button added to the existing tab bar in `index.html`
- Wired into the existing `switchTab()` function in `main.js`
- Switching away from the Shooter tab: pauses the game loop, releases Pointer Lock
- Switching back: resumes the game loop, re-requests Pointer Lock on next click
- Canvas fills the full viewport below the tab bar

---

## Ray-Caster Engine

**Map:** A 2D grid of integers stored as a JS constant array. 1 = wall, 0 = open floor. Layout: a roughly square arena (~20×20) with a few internal wall clusters for cover — open enough for wave survival, interesting enough to peek around corners.

```
Example map sketch (. = open, # = wall):
####################
#..................#
#..###.......###..#
#..#...........#..#
#..#...........#..#
#......#####......#
#......#...#......#
#......#####......#
#..#...........#..#
#..#...........#..#
#..###.......###..#
#..................#
####################
```

**Render loop (each frame):**
1. Clear canvas
2. Draw ceiling half (dark grey gradient — stadium stands)
3. Draw floor half (green — pitch)
4. DDA ray-cast: for each vertical screen column, cast a ray from player position at the column's angle, find the nearest wall, compute wall height as `(screenHeight / perpWallDist) * distScale`, draw a vertical strip
5. Collect all living enemies, compute distance from player, sort farthest-first
6. For each enemy (nearest-last), project sprite onto screen: compute screen X from angle difference, scale height/width by distance, draw `drawImage` clipped by the z-buffer
7. Draw HUD overlay on top

**Z-buffer:** An array of wall distances per column, used to clip sprites that should appear behind walls.

**Performance target:** 60fps on a modern laptop. Canvas width can be halved (rendered at 320px, displayed at 640px) to keep ray count low — classic boomer-shooter resolution.

---

## Controls

| Input | Action |
|-------|--------|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A | Strafe left |
| D | Strafe right |
| Mouse move (left/right) | Turn (Pointer Lock) |
| Left click / Space | Shoot football |
| Esc | Release Pointer Lock / pause |

Mouse look via the Pointer Lock API (`canvas.requestPointerLock()`). Click the canvas to engage. Movement speed and turn speed are configurable constants.

---

## Enemies

### Regular enemies

| Enemy | Sprite | Speed | HP | Behaviour |
|-------|--------|-------|----|-----------|
| Rooney | `rooney.png` | Medium | 2 | Walks directly toward player |
| Gazza | `gazza.png` | Fast | 1 | Erratic — zigzags toward player |
| Southgate | `southgate.png` | Slow | 3 | Hesitates, then cautiously advances |

### Boss — Infantino

- Spawns alone at wave 5, 10, 15, …
- `infantino.png` sprite rendered at 1.5× normal enemy scale
- 10 HP, moves in a direct beeline at full speed
- Worth 50 pts (vs 10 pts for regular enemies)

### Pathfinding

Simple direct-line movement toward the player each frame. Wall collision: if the next position is inside a wall cell, try sliding along X or Y axis independently (standard AABB wall sliding). No A* needed — direct chase is fine for the arena layout.

### Enemy attacks

On contact (distance < 0.6 units): deal 10 damage to player, knock enemy back 0.5 units. Visual flash: briefly tint the screen red.

---

## Wave System

- Wave 1: 3 Rooneys
- Wave 2: 3 Rooneys + 2 Gazzas
- Wave 3: 2 Rooneys + 2 Gazzas + 2 Southgates
- Wave 4+: random mix, count = `6 + (wave - 4) * 2`
- Wave 5, 10, 15, …: Infantino boss (alone; next wave starts after defeat)
- Enemies spawn at random open cells at least 5 units from the player
- Next wave begins 2 seconds after last enemy dies (brief "WAVE CLEAR" text)

---

## Player

- Starting HP: 100
- Weapon: football (unlimited ammo, 0.3s fire cooldown)
- Projectile hit detection: ray-cast from player at current angle, first enemy within range whose projected screen bounds contain the screen centre gets hit
- Damage per shot: 1 HP to regular, 2 HP to Infantino (so ~2-3 shots per regular, ~5 per Infantino)
- Hit range: 10 map units (enemies further than this cannot be shot)
- No health pickups — survival gets harder every wave

---

## HUD

Drawn on canvas after the 3D scene:

- **Top-left:** `WAVE 3 · 4 LEFT` (wave number + remaining enemy count)
- **Bottom-left:** Health bar (green → red as HP drops) + `HP: 80`
- **Bottom-right:** `SCORE: 1240`
- **Centre:** Crosshair — a small ⚽ unicode glyph or a simple white cross drawn in canvas

---

## Game States

| State | Description |
|-------|-------------|
| `idle` | "Click to play" overlay shown, game loop not running |
| `playing` | Game loop active, Pointer Lock held |
| `wave-clear` | "WAVE CLEAR" text for 2s, then next wave spawns |
| `boss` | Infantino wave; same as `playing` but boss music cue (if audio added later) |
| `dead` | Game over overlay: score, wave reached, "Play Again" button |
| `paused` | Pointer Lock released (Esc); game loop pauses |

---

## Sprite Rendering Notes

- Rooney (`rooney.png`): transparent PNG — draw directly with `drawImage`
- Gazza (`gazza.png`): white background — draw with `globalCompositeOperation = 'multiply'` on a temporary off-screen canvas to knock out the white
- Future sprites (Southgate, Infantino): ideally sourced as transparent PNGs

---

## Map Constant

The full map lives as a 2D array constant at the top of `js/shooter.js`:

```js
const MAP = [
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
```

Player starts at position (1.5, 1.5) facing east (angle = 0). MAP[1][1] = 0, confirmed open.

---

## Out of Scope

- Sound effects / music (can be added later as a separate pass)
- Animated sprite frames (single standing frame per enemy is sufficient)
- Mobile / touch support
- High score persistence
- Enemy projectiles (enemies only attack on contact)
