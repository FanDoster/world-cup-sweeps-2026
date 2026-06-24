# Predictions Window — Excel XP Design Spec

## Goal

Reskin the Predictions XP window to look and feel like Microsoft Excel 2002/XP, consistent with the existing Leaderboard Excel skin. The score-entry inputs become editable spreadsheet cells. Joker toggles become a special cell. All existing submission logic (`submitPrediction`, joker toggle, score locking, `stepScore`) remains intact; only the presentation layer changes.

---

## Visual Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔮 Predictions                                          [_][□][×]            │ ← XP title bar
├──────────────────────────────────────────────────────────────────────────────┤
│ [Back ▼] [Forward] [Up] [Search] [Folders]                                   │ ← XP Explorer bar
│ Address: C:\WorldCup2026\Predictions                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ File   Edit   View   Insert   Format   Tools   Data   Window   Help          │ ← Excel menu bar (decorative)
├──────────────────────────────────────────────────────────────────────────────┤
│ [New][Open][Save] | [Cut][Copy][Paste] | [Bold][Italic] | [Σ AutoSum] [📊]  │ ← Standard toolbar (decorative)
│ [Calibri ▼][11 ▼][B][I][U] | [≡][≡][≡] | [%][,][.00]                      │ ← Formatting toolbar (decorative)
├──────────────────────────────────────────────────────────────────────────────┤
│ fx  │ C5                    │ =IF(locked,"—",home_pred)                      │ ← Formula bar
├──────────────────────────────────────────────────────────────────────────────┤
│    │  A          │  B         │  C    │  D    │  E    │  F       │  G       │ ← column headers
├────┼─────────────┼────────────┼───────┼───────┼───────┼──────────┼──────────┤
│  1 │ Date        │ Match      │ Home  │  vs   │ Away  │ Joker    │ Status   │ ← row 1 = header row
├────┼─────────────┼────────────┼───────┼───────┼───────┼──────────┼──────────┤
│  2 │ Mon 23 Jun  │🇩🇪 Germany │  [2]  │   –   │  [1]  │ [🃏]    │ ✓ Saved  │
│  3 │             │🇧🇷 Brazil  │  [ ]  │   –   │  [ ]  │  [ ]    │ Unsaved  │
├────┼─────────────┼─────────────────────────────────────────────────────────-│
│  4 │ ── Tue 24 Jun ─────────────────────────────────────────────────────────│ ← date separator row
├────┼─────────────┼────────────┼───────┼───────┼───────┼──────────┼──────────┤
│  5 │ Tue 24 Jun  │🏴󠁧󠁢󠁥󠁮󠁧 England│  [ ]  │   –   │  [ ]  │  [ ]    │ Open    │
│  6 │             │🇺🇸 USA     │  [–]  │   –   │  [–]  │  [–]    │ Locked   │ ← locked match
...
├──────────────────────────────────────────────────────────────────────────────┤
│ [Upcoming] [History]                               │ Sum=18  Count=12  Avg=3 │ ← sheet tabs + status
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Chrome Layers

All `.xl-*` styles re-use the same CSS namespace and visual tokens already established by the Leaderboard Excel skin in `css/excel.css`.

### 1. Menu Bar
Identical to Leaderboard: `File Edit View Insert Format Tools Data Window Help`. All decorative.

### 2. Standard Toolbar
26px, `#ece9d8` background. Decorative icons for New/Open/Save, Cut/Copy/Paste, Undo/Redo, etc. Same `.xl-toolbar` style.

### 3. Formatting Toolbar
Second 26px toolbar row. Font name dropdown + size + B/I/U + alignment + number format buttons. All decorative.

### 4. Formula Bar
30px tall. Three parts:
- **Name Box** (50px): shows selected cell address (e.g. `C5`) — updates when a score cell is focused
- **fx button** (20px, decorative)
- **Formula Field** (flex-grows): shows a static formula string matching the selected cell type:
  - Score cell: `=IF(locked,"—",home_pred)`
  - Joker cell: `=IF(joker_used_today,2,"")`
  - Status cell: `=VLOOKUP(match_id,predictions,3,0)`

Formula bar is cosmetic — it updates to show the formula for whichever cell was last clicked, but the formula string is static/pre-defined per column.

### 5. Column/Row Header Strip
**Column headers** (row at top): `A | B | C | D | E | F | G` — fixed 24px height, `#ece9d8` background, 1px borders.
**Row numbers** (column at left): sequential row numbers `1, 2, 3…` — 30px wide, same styling.

Column widths:
| Col | Width | Content |
|-----|-------|---------|
| A | 90px | Date |
| B | 180px | Match (flag + team names) |
| C | 60px | Home score input |
| D | 30px | `–` separator (decorative) |
| E | 60px | Away score input |
| F | 55px | Joker cell |
| G | 80px | Status |

### 6. Data Grid

**Header row (row 1):** `#d4d0c8` background, bold 11px text, column labels: `Date | Match | Home | vs | Away | Joker | Status`.

**Date group separator rows:** full-width, colspan 7, italic, `#ece9d8` background, `font-size: 11px`, `color: #666`. Same visual rhythm as Excel's row grouping.

**Match rows:** alternating `#fff` / `#f9f8f3` (every other row, scoped to matches within the same date group). 26px tall. `border-bottom: 1px solid #d4d0c8`.

**Selected row:** `background: #dce8ff` (Excel selection blue).

### 7. Score Input Cells

The score `[C]` and `[E]` cells contain the existing `stepScore` stepper mechanism, reskinned to look like an Excel cell in edit mode:

- **Display state** (not focused): shows the current value or `—` (locked) or blank (no pred yet). Cell has `border: 1px solid transparent`. Click to enter edit mode.
- **Edit mode** (focused): shows an inline `<input type="number" min="0" max="20">` that fills the cell. Border changes to `1px solid #316ac5` (Excel selection blue). `↑↓` keys still call `stepScore`. `Tab` moves to the next cell. `Enter` submits.
- **Locked match**: cell shows `—`, `background: #f0f0f0`, not clickable.
- **Existing pred value**: shown as a number in the cell with `color: #0000aa` (Excel-default blue for formula results).

Score cells call the existing `stepScore` / `submitPrediction` on change — no new submission logic.

### 8. Joker Cell (Column F)

- **No joker / available**: shows empty cell with a faint 🃏 watermark. Click → calls existing joker toggle.
- **Joker active on this match**: shows `🃏` in `color: #b8860b` (dark gold), bold, `background: #fff8dc`.
- **Joker used on a different match today**: shows `·` dimmed, cell unclickable, `background: #f0f0f0`.
- **Locked**: `—`, unclickable.

### 9. Status Cell (Column G)

Maps existing prediction state to a status string:
| State | Display | Color |
|-------|---------|-------|
| Saved pred | `✓ Saved` | `#22aa44` |
| Unsaved changes | `● Unsaved` | `#cc6600` |
| No pred yet | `—` | `#999` |
| Locked, no pred | `🔒 Locked` | `#cc2222` |
| Locked, has pred | `🔒 Saved` | `#22aa44` |
| Error | `✗ Error` | `#cc2222` |

### 10. Sheet Tabs

Two tabs at the bottom, styled exactly like the Leaderboard sheet tabs:
- **Upcoming** — shows not-yet-played matches (default active tab)
- **History** — shows completed matches and their results + pred outcomes (read-only, no inputs)

Clicking `History` re-renders `#xl-pred-target` with completed-match rows. Scores show actual result. Status column shows `★★★★★` / `★★★` / `★` / `✗` (prediction score badges).

### 11. Status Bar
`background: #d4d0c8`, 20px tall. Left: `{n} matches`. Right: `Sum={total pred pts}  Count={predictions made}  Avg={avg pts per match}` — Excel-style aggregate strip.

---

## Data Mapping

| Existing element | Excel equivalent |
|-----------------|-----------------|
| `.pred-day-header` date group | Date separator row (colspan 7) |
| `.pred-card` match block | Data row in grid |
| Score stepper `+`/`−` buttons | Click cell → inline number input |
| Joker toggle button | Column F joker cell |
| Submit button | Auto-submits on `Enter` or `Tab` (no separate button) |
| Prediction history tab | `History` sheet tab |
| Lock countdown | Status cell (`🔒 Locked`) + row grayed out |

---

## Auto-Save Behaviour

The existing `submitPrediction` fires when:
- User presses `Enter` in a score cell
- User presses `Tab` (moves to next cell, triggers save on the departed cell)
- User clicks another row

The "Unsaved" status badge (column G) appears as soon as either score cell value changes; it clears to "✓ Saved" once `submitPrediction` resolves successfully. This matches the Unsaved indicator pattern in Excel (title bar asterisk analogue).

---

## Implementation Boundaries

**Files to modify:**
- `index.html` — replace `sectionPredictions` / `#predictionsWrap` with Excel chrome shell (`#xl-pred-menubar`, `#xl-pred-toolbars`, `#xl-pred-formulabar`, `#xl-pred-grid-header`, `#xl-pred-target`, sheet tabs, status bar)
- `js/render-predictions.js` — `renderPredictions()` generates row HTML targeting `#xl-pred-target`; add `xlPredSelectCell(addr, formula)` (updates formula bar); add `xlPredSwitchSheet(name)` for Upcoming/History tabs; cell click handlers call existing `stepScore` / joker toggle
- `css/excel.css` — add scoped overrides for `#xp-window-predictions .xp-window-content` (no padding, flex column) and `#sectionPredictions` (flex: 1); re-use `.xl-menubar`, `.xl-toolbar`, `.xl-formulabar`, `.xl-col-header`, `.xl-sheet-tabs` classes; add `.xl-pred-*` for prediction-specific cell styles (score input, joker cell, status badge)

**No changes to:** `submitPrediction`, `stepScore`, joker toggle logic, `getLockCountdown`, `loadPredData`, RLS / Supabase queries.

**CSS namespace:** Re-use `.xl-` prefix from `css/excel.css`. Prediction-specific overrides under `#xp-window-predictions`.

---

## Key Interactions

1. **Click score cell** → cell enters edit mode (inline `<input>`), formula bar updates to `=IF(locked,"—",home_pred)`, row highlights blue
2. **Type score + Enter** → `submitPrediction` fires, status cell flips to `✓ Saved`
3. **Tab from home cell** → jumps to away score cell
4. **Tab from away cell** → jumps to joker cell, then to next row's home cell
5. **Click joker cell** → existing joker toggle fires, cell icon updates
6. **Click History tab** → `xlPredSwitchSheet('history')` re-renders pane with completed matches (read-only rows, result + score badge in Status column)
7. **Auto-refresh** → `renderPredictions()` re-runs on a timer (same cadence as today); preserves which sheet is active

---

## History Sheet

Completed matches shown in reverse-chronological order. Columns identical except:
- **Home / Away** columns: show the actual match result scores (not inputs)
- **Joker**: `🃏` if joker was used, `—` otherwise
- **Status**: replaced by **Score** column showing `★★★★★` (5pts), `★★★` (3), `★` (1), `✗` (0) — from `calcPredPoints` / `predResultBadge`

No editable cells in History sheet.

---

## Responsive

On mobile (≤700px): hide menu bars and both toolbar rows. Formula bar collapses to a single line showing only the cell address + value. Columns B/F/G truncate to minimum widths or hide. Score input cells use native number spinner. Sheet tabs show as pills.
