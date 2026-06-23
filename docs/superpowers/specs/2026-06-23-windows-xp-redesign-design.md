# Windows XP Redesign — Design Spec

**Date:** 2026-06-23
**Approach:** Option B — rebuild `index.html` with XP desktop markup; port all existing section content into XP window panes

---

## Goal

Redesign the World Cup 2026 Sweepstakes webapp to look and feel like Windows XP (Luna theme) on desktop, and Windows Mobile / Pocket PC on small screens (≤700px). All existing render functions, Supabase logic, and section content remain untouched; the XP shell is a new wrapper around them.

---

## Architecture

### Desktop structure (HTML)

```
#xp-desktop                   ← full viewport, Bliss wallpaper CSS gradient
  #xp-icons                   ← desktop icon grid, left side
    .xp-icon × N              ← one per section + auth-gated extras
  .xp-window × N              ← one per section (hidden until opened)
    .xp-title-bar
      .xp-title-icon
      .xp-title-text
      .xp-controls (–, □, ✕)
    .xp-window-content        ← existing section divs move here
#xp-taskbar                   ← pinned bottom, 40px
  #xp-start-btn
  #xp-taskbar-windows
  #xp-system-tray
    #xp-clock
```

### Section mapping

Each existing section becomes a `.xp-window`. The existing IDs (`#sectionMatches`, `#sectionGroups`, etc.) are preserved inside their window content pane so all render functions continue to target them unchanged.

| Desktop icon label | Window title | Section ID |
|---|---|---|
| Players | Players | sectionPlayers |
| Matches | Matches | sectionMatches |
| Groups | Groups | sectionGroups |
| Leaderboard | Leaderboard | sectionLeaderboard |
| Teams | Teams | sectionTeams |
| Battle Map | Battle Map | sectionMap |
| Bracket | Bracket | sectionBracket |
| Shooter | Shooter | sectionShooter |
| Profile | Profile | sectionProfile |
| My Teams *(auth-gated)* | My Teams | sectionMyTeams |
| Predictions *(auth-gated)* | Predictions | sectionPredictions |

Auth-gated icons are hidden by default and shown/hidden by `updateAuthBar()` (renamed `updateDesktop()`).

### JS changes

- **`js/xp-shell.js`** (new): window open/close/minimize/restore/focus/drag, z-index stack, taskbar button sync, clock tick.
- **`js/main.js`**: `switchTab(name)` replaced by `openWindow(name)` and `focusWindow(name)`. Shooter start/stop hook preserved.
- **`js/auth.js`**: `updateAuthBar()` renamed `updateDesktop()` — shows/hides auth-gated desktop icons and window entries rather than injecting tab buttons.

### CSS changes

- **`css/tokens.css`**: replaced entirely with XP design tokens (see below).
- **`css/layout.css`**: replaced entirely with XP desktop + window + taskbar chrome CSS.
- **`css/xp-shell.css`** (new): all XP-specific chrome — title bars, control buttons, bevel borders, desktop icons, taskbar, Start button, system tray, clock.
- All other CSS files (`matches.css`, `groups.css`, etc.) continue to work unchanged; they inherit the new tokens via CSS variables.

---

## Desktop environment

### Bliss wallpaper

Pure CSS gradient — no external image. Deep sky blue at the top, rolling green hills at the bottom:

```css
background: linear-gradient(
  to bottom,
  #1a6aaf 0%,
  #4d9fd4 45%,
  #78c3a0 60%,
  #4a8f3a 75%,
  #3d7a2e 100%
);
```

### Desktop icons

Left-side grid (`display: grid; grid-template-columns: repeat(2, 80px); gap: 16px; padding: 16px`).

Each `.xp-icon`:
- 64×64px icon area: emoji centered in a raised-bevel square, or small PNG if available
- Label below: white text with 1px black text-shadow (for readability on the Bliss gradient)
- Hover: blue selection rectangle around icon + label (`rgba(49, 106, 197, 0.5)` background)
- Double-click: opens/focuses the corresponding window

### Taskbar

40px tall, pinned to `bottom: 0`, full width. Background: `linear-gradient(to bottom, #2d5ba8, #1f3a6e)` with a 1px highlight at the top.

**Start button**: left side. Green pill (`#3a6e18 → #5a9e2a` gradient), rounded on the left, square on the right. Windows logo emoji + "start" in Tahoma bold lowercase, white. Clicking opens the Start Menu overlay.

**Start Menu**: a panel that pops up above the Start button — lists all sections with their icons. Clicking an item opens/focuses that window and closes the menu.

**Open window buttons**: centre strip. Each open (non-minimised) window gets a button — icon + truncated title, 160px wide max. Active (focused) window button appears pressed (inset bevel). Clicking minimises if focused, restores/focuses if not.

**System tray**: right side. Shows live clock (`HH:MM`) in Tahoma 11px white.

---

## Window chrome

### Title bar

30px tall. Background: `linear-gradient(to bottom, #4a90d9 0%, #2462c9 50%, #1a52b0 100%)` (Luna blue).

Left: 16×16px section icon (emoji), then window title in Tahoma 11px bold white with 1px drop shadow.

Right: three control buttons — minimize (`–`), maximize (`□`), close (`✕`):
- **Close**: `#c94040 → #e05050` gradient, hover brightens
- **Minimize / Maximize**: `#3060b0 → #4070c0` gradient, same hover
- Buttons are 21×21px, rounded corners (3px), with a 1px bevel border

### Window borders

3px border: top/left edges `#ffffff` (highlight), bottom/right edges `#848284` (shadow). Outer edge: 1px `#0a246a` (the XP dark blue outer frame). This recreates the classic XP raised-bevel window border.

### Content area

Background: `#ece9d8` (the iconic XP tan/silver). Window content (section div) sits inside a 1px inset border (`#ffffff` top/left, `#848284` bottom/right) to give the recessed-panel look.

### Positioning and dragging

Windows are `position: absolute` on `#xp-desktop`. Default position: cascade from top-left (offset by 30px per window). Title bar drag moves the window (mousedown → mousemove → mouseup). `z-index` stack managed by `xp-shell.js` — clicking any part of a window brings it to the front.

Minimize hides the window content and title bar; a minimised "ghost" is represented only by the taskbar button. Restore brings it back to its last position/size. Maximize fills the desktop area (above the taskbar).

Close removes the window from view and removes its taskbar button; the desktop icon can re-open it.

---

## XP design tokens (`css/tokens.css` replacement)

```css
:root {
  /* desktop */
  --xp-desktop-bg:     #1a6aaf;        /* Bliss sky */

  /* window chrome */
  --xp-titlebar:       #2462c9;
  --xp-titlebar-end:   #1a52b0;
  --xp-surface:        #ece9d8;        /* window / dialog background */
  --xp-card:           #ffffff;        /* content panel background */
  --xp-border-hi:      #ffffff;        /* bevel highlight */
  --xp-border-sh:      #848284;        /* bevel shadow */
  --xp-border-outer:   #0a246a;        /* outer window frame */

  /* text */
  --text:              #000000;
  --text-secondary:    #444444;
  --text-muted:        #808080;

  /* accent / interactive */
  --accent:            #2462c9;        /* Luna blue */
  --accent-dim:        #1a52b0;
  --accent-glow:       rgba(36,98,201,0.15);
  --live:              #cc0000;
  --gold:              #cc8800;
  --silver:            #808080;
  --bronze:            #8b5a00;

  /* layout */
  --radius:            0px;            /* XP is boxy */
  --radius-sm:         0px;
  --radius-xs:         0px;

  /* typography */
  --font:              Tahoma, 'MS Sans Serif', Arial, sans-serif;
  --font-mono:         'Courier New', Courier, monospace;

  /* re-map dark-theme surface tokens so existing CSS still compiles */
  --bg:                var(--xp-surface);
  --surface:           var(--xp-surface);
  --card:              var(--xp-card);
  --border:            var(--xp-border-sh);
  --border-subtle:     #c8c4b8;
}
```

---

## Modals and dialogs

Existing auth modals (Sign In, Sign Up, Joker Reset, Team Result) are restyled as XP dialog boxes:
- White background, `#ece9d8` button area strip at the bottom separated by a 1px border
- Title bar with Luna blue gradient, dialog icon (ℹ️ or ⚠️), title text
- Buttons (`OK`, `Cancel`) styled as XP pushbuttons — raised bevel, Tahoma 11px
- No backdrop blur; semi-transparent `rgba(0,0,0,0.5)` overlay behind

The profile overlay and pred-panel overlay get the same XP window chrome treatment.

---

## Windows Mobile skin (≤700px)

No desktop or draggable windows. The layout switches to a Pocket PC paradigm:

```
[  Title bar (top, 26px, blue)  ]
[                               ]
[     Active section content    ]
[                               ]
[  Bottom bar (bottom, 40px)    ]
   Start  |  Section name  |  Clock
```

**Title bar (top)**: Luna blue gradient, 26px. Left: Back arrow (`‹`) that returns to the Today screen. Centre: current section name. Right: close icon.

**Today screen**: the home state (no section open). Shows all icons as a vertical list with name and arrow, styled like the Windows Mobile Today program list.

**Bottom bar**: `#1a3a6e` background. Left: "Start" button (green pill, same XP style but compact). Centre: current section name. Right: live clock.

**Start menu**: tapping Start slides up a full-width panel listing all sections.

**No drag/resize**: windows are fullscreen only between the two bars.

---

## Files changed

| File | Change |
|---|---|
| `index.html` | Full rebuild with XP desktop/window/taskbar structure |
| `css/tokens.css` | Replaced with XP design tokens |
| `css/layout.css` | Replaced with XP desktop + window layout CSS |
| `css/xp-shell.css` | **New** — XP chrome (title bars, buttons, icons, taskbar, Start) |
| `js/xp-shell.js` | **New** — window manager (open/close/drag/minimize/z-index/clock) |
| `js/main.js` | `switchTab()` → `openWindow()` / `focusWindow()`; shooter hook preserved |
| `js/auth.js` | `updateAuthBar()` → `updateDesktop()` for icon show/hide; all call sites updated (`restoreSession`, sign-in/out callbacks) |
| All other CSS | No structural changes; tokens flow through CSS variables |
| All other JS | No changes |

---

## Out of scope

- Resizable windows (drag-to-resize border handles)
- Window snapping / Aero Snap behaviour
- Multiple monitor simulation
- Right-click context menus on the desktop
- Animated window open/close (the XP "zoom" effect)
- Actual Bliss.jpg (CSS gradient approximation only)
