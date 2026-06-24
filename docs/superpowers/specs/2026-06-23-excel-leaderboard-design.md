# Excel XP Leaderboard Design Spec

## Goal

Replace the current leaderboard section with a faithful recreation of a Microsoft Excel 2002/XP spreadsheet window, rendered inside the existing XP Leaderboard window. All data comes from the existing `calcMatchLeaderboard()`, `calcPredLeaderboard()`, and `getPredStatsByPlayer()` functions — no changes to scoring logic.

---

## Visual Structure (top to bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ [Excel icon] Microsoft Excel – WorldCup2026.xls             │  ← XP title bar (existing .xp-title-bar)
├─────────────────────────────────────────────────────────────┤
│ File  Edit  View  Insert  Format  Tools  Data  Window  Help  [? box] │  ← menu bar
├─────────────────────────────────────────────────────────────┤
│ [🗋][💾][🖨][✂][📋][↩][↪] … [Σ][↓A][↑A]  [100% ▾]        │  ← standard toolbar
│ Arial          ▾ │ 10 ▾ │ B  I  U │ ≡ ≡ ≡ │ % , .0 │ 🎨    │  ← formatting toolbar
├──────────┬──────────────────────────────────────────────────┤
│   A1   ▾ │ fx │ Player                                      │  ← formula bar
├──┬───────┴──────────────────────────────────────────────────┤
│  │  A        B          C          D          E             │  ← column headers (tan #d4d0c8)
├──┼───────────────────────────────────────────────────────────┤
│ 1│  #    Player     Match Pts   Pred Pts    Total           │  ← row 1: bold header, light blue fill
│ 2│  1    Anton         18         24         42             │
│ 3│  2    Chris         15         19         34             │
│ …│  …    …             …          …          …              │
├──┴───────────────────────────────────────────────────────────┤
│ ◄◄ ◄ ► ►► │ 📊 Leaderboard ╱ ⚽ Match Results ╱ 🔮 Predictions │  ← sheet tabs
├─────────────────────────────────────────────────────────────┤
│ Ready                                              NUM       │  ← status bar
└─────────────────────────────────────────────────────────────┘
```

---

## Chrome Layers

### 1. Menu Bar

Single row, white/`#f0ede4` background, 22px tall.

Items (left): `File` `Edit` `View` `Insert` `Format` `Tools` `Data` `Window` `Help`

Right side: a "Type a question for help" text input, ~160px wide, with a thin blue border (`#7b9ecc`) — decorative, no behaviour.

All items are decorative — no dropdowns. Font: `"Pixelated MS Sans Serif"`, 11px.

### 2. Standard Toolbar

26px tall, `#ece9d8` background, 1px bottom border `#b0a898`.

Icon buttons (text/unicode approximations, all disabled/decorative except as noted):
`🗋 New` `📂 Open` `💾 Save` `|` `🖨 Print` `🔍 Preview` `|` `✂ Cut` `📋 Copy` `📄 Paste` `|` `↩ Undo` `↪ Redo` `|` `Σ` `↓A ↑A` `|` `100% ▾`

Buttons use the same `.xp-tb-btn` style as the Explorer toolbar — flat, gold hover.

### 3. Formatting Toolbar

26px tall, same background as standard toolbar.

Left to right: font name dropdown (`Arial` — decorative, 100px wide), font size (`10` — decorative, 36px), separator, `B` `I` `U` buttons (bold/italic/underline text, decorative), separator, left/centre/right align icons, merge icon, separator, `%` `,` `.0` buttons, separator, border icon, fill-colour icon (paint bucket), font-colour icon (`A`).

### 4. Formula Bar

28px tall, `#ece9d8` background, 1px bottom border `#b0a898`. Three regions:

- **Name Box** — 80px wide, white background, 1px inset border `#7a7a7a / #d4d0c8 / #d4d0c8 / #7a7a7a`, shows active cell reference (`A1`, `B3`, etc.), right-side dropdown arrow (decorative)
- **Separator** — 1px vertical line `#b0a898`, 4px horizontal padding each side
- **`fx` button** — 28px wide, same style as `.xp-tb-btn`, text `fx`, decorative
- **Formula field** — flex-grows to fill remaining width, white background, same inset border as Name Box, shows cell value or fake formula (see Cell Selection below)

### 5. Column Header Row

24px tall. Leftmost cell is the row-number gutter (24px wide, blank). Then one cell per column (A, B, C…), each with:
- Background `#d4d0c8`
- 1px borders: right `#808080`, bottom `#808080`
- Text centred, 11px, `"Pixelated MS Sans Serif"`
- Selected column: background `#e8b000` (Excel orange highlight) — not implemented (static)

### 6. Data Grid

Row height: 18px. Left gutter (row numbers): 24px wide, background `#d4d0c8`, right-border `#808080`.

Grid lines: 1px `#d0cdc4`.

Row 1 (header): background `#dce6f1`, bold text.  
Even data rows (2, 4, 6…): background `#ffffff`.  
Odd data rows (3, 5, 7…): background `#f0f5ff`.  
Rank-1 row: background `#fffbe6` (faint gold).

**Selected cell**: 2px solid blue border `#0055a8`, no fill change. Clicking any cell:
1. Updates the Name Box to that cell's address (e.g. `C3`)
2. Updates the formula field (see formulas below)

**Player name cells**: styled as Excel hyperlinks — `color: #0563c1`, underlined. `onclick` calls `showUserProfile(playerName)`.

### 7. Sheet Tabs

32px tall strip at the bottom of the grid. Background `#d4d0c8`.

Left side: navigation arrows `◄◄` `◄` `►` `►►` — decorative, 14px each, separated by 1px lines.

Tab shape per sheet: white (active) or `#c8c4b8` (inactive), 1px border `#808080` on top/left/right, no bottom border on active tab (creates seamless join with grid). Slight top border-radius (3px). Padding `0 10px`. Font 11px.

Tab order: `📊 Leaderboard` | `⚽ Match Results` | `🔮 Predictions`

Clicking an inactive tab: switches grid content, makes that tab active.

### 8. Status Bar

20px tall, background `#d4d0c8`, 1px top border `#808080`.

Left: `Ready` in 11px font.  
Right: `NUM` label. When a numeric cell in the data area is selected, also shows `Sum: XX` to the right of `NUM`.

---

## Sheet Content

### Sheet 1: 📊 Leaderboard

Columns: `A=#` `B=Player` `C=Match Pts` `D=Pred Pts` `E=Total`

Column widths: A=30px, B=120px, C=80px, D=80px, E=80px

Data source: `calcMatchLeaderboard()` + `getPredStatsByPlayer()` joined by player name, sorted by Total descending.

### Sheet 2: ⚽ Match Results

Columns: `A=#` `B=Player` `C=W` `D=D` `E=L` `F=Pts`

Column widths: A=30px, B=120px, C=50px, D=50px, E=50px, F=60px

Data source: `calcMatchLeaderboard()`

### Sheet 3: 🔮 Predictions

Columns: `A=#` `B=Player` `C=Pred Pts` `D=Avg/Game` `E=Exact` `F=Best Streak`

Column widths: A=30px, B=120px, C=70px, D=70px, E=60px, F=80px

Data source: `calcPredLeaderboard()`

---

## Formula Bar Formulas (per selected cell)

| Column | Fake formula shown |
|--------|-------------------|
| # (col A) | `=RANK(E{r},$E$2:$E$7,0)` (Leaderboard) or `=RANK(F{r},$F$2:$F$7,0)` (Match/Pred) |
| Player (col B) | Raw player name — no formula prefix |
| Numeric stat | `={value}` — just the raw number |
| Total (col E, Leaderboard) | `=C{r}+D{r}` |
| Avg/Game (col D, Predictions) | `=C{r}/COUNTA($B$2:$B$7)` |

Where `{r}` is the row number of the selected cell.

---

## Implementation Boundaries

**Files to create:**
- `css/excel.css` — all Excel chrome styles (menu bar, toolbars, formula bar, grid, sheet tabs, status bar). Must not affect any styles outside `.xl-*` class namespace.

**Files to modify:**
- `js/render-leaderboard.js` — `renderLeaderboard()` generates the Excel chrome wrapper + three sheet data sets; new helpers `xlSwitchSheet(name)` and `xlSelectCell(el, addr, formula)` added to the same file
- `index.html` — add `<link rel="stylesheet" href="css/excel.css">` in `<head>`

**No changes to:**
- `calcMatchLeaderboard()`, `calcPredLeaderboard()`, `getPredStatsByPlayer()`, `calcPredPoints()` — scoring logic untouched
- Any other CSS file or window
- `.surgeignore` (no new asset types)

---

## Responsive

On mobile (≤700px): the Excel chrome (toolbars, formula bar, column headers, row numbers, sheet tab nav arrows) is hidden via `css/responsive.css`. Only the active sheet's data rows + sheet tabs are shown, using the existing mobile leaderboard layout as a fallback.
