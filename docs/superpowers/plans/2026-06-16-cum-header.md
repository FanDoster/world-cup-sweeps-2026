# CUM Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text `<header>` with a collegiate varsity SVG lockup — arched "★ WORLD CUP 2026 ★" over flag-filled block letters C U M, with "CANADA · USA · MEXICO" below.

**Architecture:** Inline SVG directly in `index.html` replaces the `<h1>` and subtitle `<p>`. Flag images from `flagcdn.com` (already used for team flags in this project) are clipped to each letter shape via SVG `<clipPath>`. No JS or build step required.

**Tech Stack:** Inline SVG, Impact system font, flagcdn.com PNG images

---

### Task 1: Replace header markup in `index.html`

**Files:**
- Modify: `index.html:27-28`

- [ ] **Step 1: Replace the `<h1>` and `<p class="subtitle">` with the SVG lockup**

In `index.html`, replace lines 27–28:

```html
      <h1><span class="trophy">⚽</span> World Cup 2026 Sweepstakes</h1>
      <p class="subtitle"><span class="host">Canada</span> &middot; <span class="host">Mexico</span> &middot; <span class="host">United States</span> &mdash; June 11 to July 19, 2026</p>
```

With:

```html
      <svg width="100%" viewBox="0 0 320 255" style="max-width:420px;display:block;margin:0 auto;" aria-label="World Cup 2026 — Canada, USA, Mexico">
        <defs>
          <clipPath id="cC"><text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif">C</text></clipPath>
          <clipPath id="cU"><text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif">U</text></clipPath>
          <clipPath id="cM"><text x="0" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif">M</text></clipPath>
        </defs>

        <!-- Arched title -->
        <path id="archPath" d="M 10,75 Q 160,10 310,75" fill="none"/>
        <text font-size="13" font-weight="800" letter-spacing="5" fill="#888" font-family="system-ui,sans-serif">
          <textPath href="#archPath" startOffset="50%" text-anchor="middle">&#9733;  WORLD CUP 2026  &#9733;</textPath>
        </text>

        <!-- C — Canada -->
        <g transform="translate(0,72)">
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round">C</text>
          <g clip-path="url(#cC)">
            <image href="https://flagcdn.com/w320/ca.png" x="-55" y="0" width="200" height="155" preserveAspectRatio="xMidYMid slice"/>
          </g>
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4.5">C</text>
        </g>

        <!-- U — USA -->
        <g transform="translate(102,72)">
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round">U</text>
          <g clip-path="url(#cU)">
            <image href="https://flagcdn.com/w320/us.png" x="10" y="0" width="115" height="155" preserveAspectRatio="xMidYMid slice"/>
          </g>
          <text x="2" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4.5">U</text>
        </g>

        <!-- M — Mexico -->
        <g transform="translate(205,72)">
          <text x="0" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round">M</text>
          <g clip-path="url(#cM)">
            <image href="https://flagcdn.com/w320/mx.png" x="-40" y="0" width="185" height="155" preserveAspectRatio="xMidYMid slice"/>
          </g>
          <text x="0" y="148" font-size="145" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4.5">M</text>
        </g>

        <!-- CANADA · USA · MEXICO strip -->
        <line x1="10" y1="242" x2="82" y2="242" stroke="#555" stroke-width="1"/>
        <text x="160" y="246" font-size="11" font-weight="700" letter-spacing="5" fill="#999" font-family="system-ui,sans-serif" text-anchor="middle">CANADA · USA · MEXICO</text>
        <line x1="238" y1="242" x2="310" y2="242" stroke="#555" stroke-width="1"/>
      </svg>
```

- [ ] **Step 2: Open `index.html` in a browser and verify the header renders correctly**

Check:
- Arched "★ WORLD CUP 2026 ★" text curves above the letters
- C shows Canadian flag (red bands + maple leaf)
- U shows US flag (stripes + stars)
- M shows Mexican flag (green/white/red + eagle)
- "CANADA · USA · MEXICO" strip with ruled lines appears below
- No black bars inside any letter
- Auth bar (Sign in / Create account) still present and functional below the SVG

---

### Task 2: Clean up unused CSS in `css/layout.css`

**Files:**
- Modify: `css/layout.css:7-33`

- [ ] **Step 1: Remove `header::after`, `header h1`, `header h1 .trophy`, `header .subtitle`, and `header .subtitle .host` rules**

In `css/layout.css`, replace lines 7–33:

```css
header::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), var(--gold));
  margin: 20px auto 0;
  border-radius: 2px;
}
header h1 {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1.15;
}
header h1 .trophy { color: var(--gold); }
header .subtitle {
  color: var(--text-secondary);
  margin-top: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}
header .subtitle .host {
  color: var(--accent);
}
```

With nothing — delete those lines entirely. The `header { … }` block on lines 2–6 stays.

- [ ] **Step 2: Verify in browser — no visual regressions**

Check:
- Header area still has padding above the SVG
- No stray divider line appearing below the SVG
- Tab bar sits comfortably below the header

---

### Task 3: Commit

- [ ] **Commit both changes together**

```bash
git add index.html css/layout.css
git commit -m "feat: replace header with varsity CUM flag lockup"
```
