// ── BRACKET STATE ──
let bracketRound = 'R32';

function setBracketRound(round) {
  bracketRound = round;
  renderBracket();
}

function renderBracket() {
  const section = document.getElementById('sectionBracket');
  if (!section) return;
  section.innerHTML = '<p class="bracket-empty">Bracket loading…</p>';
}
