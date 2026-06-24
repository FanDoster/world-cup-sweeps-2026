# Groups Window — Windows Explorer Design Spec

## Goal

Reskin the Groups XP window to look and feel like Windows Explorer in Details view, running inside the existing XP shell. Each World Cup group (A–L) becomes a folder in the left navigation tree. Clicking a folder loads that group's team table in the right pane as a Details-view file listing. All existing data (standings, W/D/L/GF/GA/GD/Pts, qualification highlighting) is preserved.

---

## Visual Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ 📋 Groups                               [_][□][×]                │ ← existing XP title bar
├──────────────────────────────────────────────────────────────────┤
│ [Back ▼] [Forward] [Up]  [Search] [Folders] [Views ▼]           │ ← Explorer toolbar
│ Address: C:\WorldCup2026\Groups\Group A          [Go]            │ ← address bar (updates on select)
├──────────────────────────────────────────────────────────────────┤
│ Folders           × │ Name          Pld  W   D   L  GF  GA  GD  Pts │
│─────────────────────├──────────────────────────────────────────────-│
│ ▶ My Computer       │ 🇩🇪 Germany  ██  3   2   1   0   5   2   +3   7 │
│   ▼ WorldCup2026    │ 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland ██  3   1   1   1   3   3    0   4 │
│     ▶ Players       │ 🇨🇭 Switzerland 3   1   0   2   2   4   -2   3 │
│     ▶ Matches       │ 🇭🇺 Hungary    3   0   0   3   1   6   -5   0 │
│     ▼ Groups        │                                              │
│       📁 Group A ← │                                              │
│       📁 Group B    │ [status bar: 4 objects — 2 qualified        │
│       📁 Group C    │              1 best-third contender]        │
│       📁 Group D    │                                              │
│       ...           │                                              │
│       📁 Group L    │                                              │
└─────────────────────┴──────────────────────────────────────────────┘
│ 4 objects (Group A selected)                                      │ ← status bar
└──────────────────────────────────────────────────────────────────┘
```

---

## Chrome Layers

### 1. Explorer Toolbar (enhanced)
Replaces the plain `xp-explorer-toolbar` injected by `xp-shell.js` for this window only. Add a `Views` button showing current view mode (Details). All buttons except `Views` remain decorative.

### 2. Address Bar
Reads `C:\WorldCup2026\Groups\{groupName}`. Updates live when a folder is clicked. Inherits the existing `.xp-explorer-addr` style — only the path text changes.

### 3. Two-pane Layout
`display: flex; flex-direction: row` filling the window content area.

**Left pane (Folders panel)** — 180px wide, `#f5f5f5` background, 1px right border `#d4d0c8`:
- Header: `Folders` label + `×` (decorative close)
- Tree nodes, each 20px tall, padded, hover `#e4eeff`, active `#316ac5`
- Tree structure (static, cosmetic parent nodes not clickable):
  ```
  🖥️ My Computer
    📁 WorldCup2026
      📁 Players
      📁 Matches
    ▼ Groups          ← expanded
        📁 Group A   ← first selected by default
        📁 Group B
        …
        📁 Group L
  ```
- Active folder: blue highlight `#316ac5`, white text
- Group A is selected on initial render (first `renderGroups()` call)

**Right pane** — flex-grows, `display: flex; flex-direction: column`

### 4. Details View Column Header
30px, `#d4d0c8` background. Columns with 1px right borders, 11px font:
| Col | Width | Label |
|-----|-------|-------|
| Name | flex ~160px | Name |
| Pld | 36px | Pld |
| W | 30px | W |
| D | 30px | D |
| L | 30px | L |
| GF | 36px | GF |
| GA | 36px | GA |
| GD | 40px | GD |
| Pts | 40px | Pts |

Column labels right-aligned for numeric columns. Clicking column header: no sort (decorative — standings order is always by Pts/GD/GF as per football rules).

### 5. File Rows (Teams)
Each team is one "file" row in the detail view, 22px tall:
- `background: transparent`, hover `#e4eeff`
- Flag icon (`<img>`, 16px) + team name, left-aligned in Name column
- Numeric stats right-aligned in their columns, `font-family: monospace`, `font-size: 11px`
- **Qualified**: row gets left border `3px solid #22aa44` and faint green tint `background: rgba(0,180,60,0.06)`
- **Knocked out**: text `color: #999`
- **Best-third contender**: left border `3px solid #f59e0b`, yellow tint `rgba(245,158,11,0.06)`
- Row click: select highlight `#316ac5` + white text (cosmetic only)

### 6. Status Bar
20px, `#d4d0c8`. Left: `{n} objects`. Right: qualification summary, e.g. `2 qualified · 1 best-third contender`.

---

## Data Mapping

| Existing element | Explorer equivalent |
|-----------------|---------------------|
| Group letter header (A–L) | Folder in left tree |
| Group table | Details-view file listing |
| Team row | File row |
| Qual highlight (top-2 green) | Green left-border + tint |
| Best-thirds highlight | Amber left-border + tint |
| `renderGroups()` all-at-once output | Single group shown at a time, selected folder drives which |

---

## Behaviour Changes

Currently `renderGroups()` renders ALL 12 groups at once in `#groups`. The Explorer skin changes this:
- `renderGroups()` renders one group only: the currently selected group (`weSelectedGroup`, default `'A'`).
- A new `weSelectGroup(letter)` function updates `weSelectedGroup`, re-renders, updates address bar, and updates the active folder highlight.
- The full 12-group render is still used internally for the best-thirds calculation — only the display shows one group.

---

## Implementation Boundaries

**Files to modify:**
- `index.html` — replace `sectionGroups` content with Explorer two-pane shell (static folder tree + column header + `#we-detail-pane` target div)
- `js/render-groups.js` — add `weSelectedGroup` var; `renderGroups()` renders only the selected group into `#we-detail-pane`; new `weSelectGroup(letter)` updates address bar text and folder active state
- `css/groups.css` — add `.we-*` classes for Explorer chrome; scope existing group-table styles into `#we-detail-pane`

**No changes to:** scoring logic, `loadData`, qual scenario logic (best-thirds ranking is computed but not displayed per-group in this view — show in status bar only).

**CSS namespace:** `.we-` prefix for all new Windows Explorer chrome classes.

---

## Key Interactions

1. **Folder click** → `weSelectGroup('B')` → re-renders detail pane with Group B teams, updates address bar to `...\Groups\Group B`, highlights folder B in tree
2. **File row click** → cosmetic selection only (no team-drill-down in this view — Teams tab handles that)
3. **Data refresh** → `renderGroups()` re-renders the current group; folder tree stays static (no re-build needed)

---

## What Is NOT Shown

- Qualification scenarios (the long "if X wins…" text): omitted from this view. The status bar shows a brief qual summary only.
- Player cards (`renderPeople`): these belong to the Players tab, not shown here.
- The qual-scenarios detail cards from `renderGroups` are dropped — pure table view only.

---

## Responsive

On mobile (≤700px): hide left folder tree; show a horizontal scrollable group tab strip above the detail pane (pill buttons A–L). Column header and rows scroll horizontally. Address bar hidden.
