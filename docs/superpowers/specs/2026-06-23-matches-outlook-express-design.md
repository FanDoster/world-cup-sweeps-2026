# Matches Window — Outlook Express Design Spec

## Goal

Reskin the Matches XP window to look and feel like Microsoft Outlook Express 6 running inside the existing XP shell. Match rows become email messages; date groups become OE date separators; clicking a row loads the match detail in a reading pane. All existing data (scores, countdowns, prediction dots, probability bars, channel links) is preserved.

---

## Visual Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ ⏱️  Matches                              [_][□][×]               │ ← existing XP title bar
├──────────────────────────────────────────────────────────────────┤
│ [Explorer toolbar row — Back · Forward · Up · Search · Folders]  │ ← existing XP explorer bar
│ Address: C:\WorldCup2026\Matches                                 │
├──────────────────────────────────────────────────────────────────┤
│ File  Edit  View  Tools  Message  Help                           │ ← OE menu bar (decorative)
├──────────────────────────────────────────────────────────────────┤
│ [New] [Reply] [Reply All] [Fwd] [Print] [Delete] [Send/Recv]    │ ← OE toolbar (decorative)
├───────────────┬──────────────────────────────────────────────────┤
│ Outlook       │ !  ✉  From          Subject          Received   │ ← message list header
│  Express      ├──────────────────────────────────────────────────┤
│               │  ── Mon 23 Jun ─────────────────────────────────│
│ Local Folders │ •  ✉  Germany v Spain  0–2 FT        14:00      │
│  📥 Inbox (8) │ •  ✉  France v Brazil  2–1 FT        17:00      │
│  📤 Sent (…)  │  ── Tue 24 Jun ─────────────────────────────────│
│  🗑 Deleted   │    ✉  England v USA    Kickoff 20:00  20:00      │
│               │    ✉  Japan v Morocco  Kickoff 23:00  23:00      │
│               ├──────────────────────────────────────────────────┤
│               │  [Reading pane — selected match detail]          │
│               │  Germany  0 – 2  Spain                           │
│               │  ⚽ Prob: 38%  Draw: 26%  Spain 36%             │
│               │  A•✓  C✗  D•✓  L✗  P✓  S•✓                     │
└───────────────┴──────────────────────────────────────────────────┘
│ 104 messages, 8 unread                                           │ ← status bar
└──────────────────────────────────────────────────────────────────┘
```

---

## Chrome Layers

### 1. OE Menu Bar
Single row, `#ece9d8` background, 22px tall. Items: `File` `Edit` `View` `Tools` `Message` `Help`. All decorative — no dropdowns. Same font/size as Excel menu bar.

### 2. OE Toolbar
26px tall, `#ece9d8` background. Buttons: `New Mail` `Reply` `Reply All` `Forward` `|` `Print` `Delete` `|` `Send/Receive` `|` `Addresses` `Find`. All decorative (`.xp-tb-btn` style, no actions).

### 3. Three-pane Layout
`display: flex; flex-direction: row` filling the window content area.

**Left pane** — 160px wide, `#f5f5f5` background, 1px right border `#d4d0c8`:
- "Outlook Express" root item (bold, 12px, greyed icon)
- "Local Folders" expandable heading
  - 📥 **Inbox** — clicking sets filter to `upcoming` (bold when active)
  - 📤 **Sent Items** — clicking sets filter to `completed`
  - 🌐 **All Matches** — clicking sets filter to `all`
  - ⭐ **My Teams** — clicking sets `matchTeamFilter` to `mine`
- Unread count badge on Inbox = count of upcoming unfinished matches

**Right pane** — flex-grows, `display: flex; flex-direction: column`:
- Message list (top half) — scrollable, `overflow-y: auto`
- Horizontal resize handle (static, decorative, `4px` height, `#d4d0c8` background)
- Reading pane (bottom half, ~40% height) — shows selected match detail

### 4. Message List Header Row
28px, `#d4d0c8` background. Columns with 1px right borders:
| Col | Width | Content |
|-----|-------|---------|
| Flag | 20px | `!` (decorative) |
| Paperclip | 20px | `🔗` decorative |
| From | 200px | team1 v team2 |
| Subject | flex | score or kickoff time |
| Received | 80px | local kick-off time |

Headers are plain text, `font-size: 11px`, non-sortable (decorative).

### 5. Message List Rows
Each `match-row` maps to an OE message row, 22px tall:
- Unread (upcoming, not predicted): **bold** text, `font-weight: bold`
- Read (completed or predicted): normal weight
- Selected: `background: #316ac5; color: #fff`
- Hover: `background: #e4eeff`
- Date group separator: full-width, `background: #ece9d8`, italic date label, `font-size: 11px`

Row columns map:
- `!` col: prediction dot `•` if current user has predicted, empty otherwise
- `✉` col: flag emoji of team1 (16px)
- From: `{team1} v {team2}` — with owner colour tags as small badges
- Subject: if finished → `{score1}–{score2} FT` (bold); if live → `🔴 LIVE {score1}–{score2}`; else → `Kick-off {localTime}`
- Received: `{localTime}`

### 6. Reading Pane
Shows the clicked match. Blank with "Select a message to read it" until a row is clicked.

Content when match is selected:
- **From / To row**: `{team1}` flag+name → arrow → `{team2}` flag+name, with owner badges
- **Sent row**: full kick-off date/time
- **Score/Status**: large score pill (FT / LIVE / vs), probability bar below
- **Prediction dots row**: same `.match-pred-dots` as current but slightly larger
- **Channel link**: BBC/ITV badge if present
- **Predict button**: if match is not locked and user is signed in, a `[Predict]` button that calls `showPredPanel(key)` (same as clicking the match today)

The reading pane header uses the OE "message header" aesthetic:
- `background: #ece9d8`
- Border-bottom `1px solid #d4d0c8`
- Fields laid out as `From:` `To:` `Subject:` `Date:` labels in dark gray + values

### 7. Status Bar
20px, `#d4d0c8`. Left: `{total} messages, {upcoming} unread`. Right: filter state.

---

## Data Mapping

| Existing element | OE equivalent |
|-----------------|---------------|
| Filter bar (Upcoming/Completed/All) | Folder click in left pane |
| "My Teams" filter toggle | ⭐ My Teams folder |
| match-date-header | OE date-group separator row |
| match-row | Message row |
| showPredPanel() call | [Predict] button in reading pane |
| Prediction dots | Inline in reading pane + small `•` in `!` column |
| Prob bar | In reading pane only |

---

## Implementation Boundaries

**Files to modify:**
- `index.html` — replace `sectionMatches` content with OE three-pane shell (static chrome + target divs)
- `js/render-matches.js` — `renderMatches()` targets `#oe-message-list` instead of `#matches`; new `oeSelectMessage(key)` function fills `#oe-reading-pane`; `setMatchFilter` updates folder active state
- `css/matches.css` — add `.oe-*` classes; existing `.match-row` etc. get scoped overrides under `#oe-message-list`

**No changes to:** scoring logic, `loadData`, prediction submission, `showPredPanel`.

**CSS namespace:** `.oe-` prefix for all new Outlook Express chrome classes.

---

## Key Interactions

1. **Folder click** → calls `setMatchFilter(filter, 'matches')` + marks folder as active
2. **Message row click** → calls `oeSelectMessage(key)`, populates reading pane, marks row selected (blue highlight)
3. **[Predict] button in reading pane** → calls `showPredPanel(key)` (existing behaviour, opens the prediction modal)
4. **60s auto-refresh** → re-renders message list, preserves selected row

---

## Responsive

On mobile (≤700px): hide left folder pane and OE menu/toolbar rows. Message list + reading pane stack vertically (reading pane collapses to hidden until a row is tapped).
