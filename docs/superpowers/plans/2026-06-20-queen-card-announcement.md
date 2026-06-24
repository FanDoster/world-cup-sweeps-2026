# Queen Card Announcement Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent gold-themed announcement card between the site header and the tickers, announcing the Queen Card prediction-swap feature.

**Architecture:** Single static HTML block + scoped CSS in a `<style>` tag inside `<head>`. No JS. No new files. Everything self-contained in `index.html` so it can be stripped cleanly when the real feature ships.

**Tech Stack:** Plain HTML, CSS custom properties from `css/tokens.css`

## Global Constraints

- No JavaScript — purely static markup
- No new files — styles go in a `<style>` block added before `</head>` in `index.html`
- Use existing design tokens only (`var(--gold)`, `var(--card)`, `var(--text-secondary)`, etc.)
- No dismiss button, no animation, no CTA link
- Must not break the existing ticker layout or tab bar below it

---

### Task 1: Add CSS for the Queen Card banner

**Files:**
- Modify: `index.html` — insert `<style>` block immediately before `</head>` (currently line 26)

**Interfaces:**
- Consumes: `var(--gold)`, `var(--card)`, `var(--border-subtle)`, `var(--text)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--font-mono)`, `var(--radius)` from `css/tokens.css`
- Produces: `.qc-banner`, `.qc-icon`, `.qc-body`, `.qc-headline`, `.qc-badge`, `.qc-sub`, `.qc-rules`, `.qc-rule` — consumed by Task 2

- [ ] **Step 1: Insert the style block before `</head>`**

Open `index.html`. Find line 26 (`</head>`). Insert the following immediately before it:

```html
<style>
  .qc-banner {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    background: rgba(245,158,11,0.04);
    border: 1px solid var(--gold);
    border-radius: var(--radius);
    box-shadow: 0 0 28px rgba(245,158,11,0.10), inset 0 0 0 1px rgba(245,158,11,0.06);
    padding: 16px 20px;
    margin: 16px 0;
  }
  .qc-icon {
    font-size: 2.6rem;
    line-height: 1;
    flex-shrink: 0;
    color: var(--gold);
    filter: drop-shadow(0 0 6px rgba(245,158,11,0.45));
    margin-top: 2px;
  }
  .qc-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .qc-headline-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .qc-headline {
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--gold);
  }
  .qc-badge {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: var(--gold);
    color: #0a0a0a;
    padding: 2px 8px;
    border-radius: 99px;
  }
  .qc-sub {
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  .qc-rules {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }
  .qc-rule {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-muted);
    white-space: nowrap;
  }
  @media (max-width: 700px) {
    .qc-banner { flex-direction: column; gap: 10px; padding: 14px 16px; }
    .qc-icon { font-size: 2rem; }
    .qc-rule { white-space: normal; }
  }
</style>
```

- [ ] **Step 2: Verify the style block is in the right place**

Open `index.html` and confirm the `<style>` block appears on the line before `</head>`, and that `</head>` is still present and closes the head correctly.

---

### Task 2: Add the banner HTML

**Files:**
- Modify: `index.html` — insert banner `<div>` between `</header>` and `<div class="tickers-container">` (currently lines 79–81)

**Interfaces:**
- Consumes: `.qc-banner`, `.qc-icon`, `.qc-body`, `.qc-headline`, `.qc-badge`, `.qc-sub`, `.qc-rules`, `.qc-rule` from Task 1

- [ ] **Step 1: Insert the banner HTML**

In `index.html`, find this line (currently ~line 79):

```html
    </header>
```

Immediately after it (before `<div class="tickers-container">`), insert:

```html

    <!-- Queen Card feature announcement -->
    <div class="qc-banner">
      <div class="qc-icon">🂽</div>
      <div class="qc-body">
        <div class="qc-headline-row">
          <span class="qc-headline">Queen Card</span>
          <span class="qc-badge">New</span>
        </div>
        <p class="qc-sub">Play your Queen Card in the 48 hours after the group stage ends. Pick a rival and swap up to 3 of your predictions with theirs — jokers stay put, scores update immediately. One card. One chance. Use it wisely.</p>
        <div class="qc-rules">
          <span class="qc-rule">&gt; One card per player &lt;</span>
          <span class="qc-rule">&gt; Swap up to 3 group stage predictions with any one rival &lt;</span>
          <span class="qc-rule">&gt; Play within 48 hours of the final group stage fixture &lt;</span>
          <span class="qc-rule">&gt; Jokers are not transferable &lt;</span>
          <span class="qc-rule">&gt; Cannot swap identical predictions &lt;</span>
          <span class="qc-rule">&gt; Expires at Round of 32 kickoff &lt;</span>
        </div>
      </div>
    </div>

```

- [ ] **Step 2: Open the page and verify visually**

Open `index.html` in a browser (or the running local server). Confirm:
- The gold card appears between the CUM logo/auth bar and the odds/stats tickers
- The 🂽 queen card character renders in gold on the left
- "QUEEN CARD" headline is gold + uppercase, "New" pill is gold with dark text
- Subtitle text is readable in secondary colour
- All 6 rules appear as `> rule <` monospace chips below the subtitle
- No layout breaks in the ticker rows or tab bar below

- [ ] **Step 3: Check mobile**

Resize browser to ≤700px width. Confirm the icon and text stack vertically and rules wrap without overflow.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Queen Card announcement banner above tickers"
```
