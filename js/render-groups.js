var weSelectedGroup = 'A';

function weSelectGroup(letter) {
  weSelectedGroup = letter;

  // Update folder active state
  document.querySelectorAll('#we-folder-list .we-folder-item').forEach(function(el) {
    el.classList.toggle('we-folder-active', el.dataset.group === letter);
  });

  // Update address bar
  var addrField = document.querySelector('#xp-window-groups .xp-addr-field');
  if (addrField) {
    addrField.textContent = letter === 'thirds'
      ? 'C:\\WorldCup2026\\Groups\\Best Thirds'
      : 'C:\\WorldCup2026\\Groups\\Group ' + letter;
  }

  // Update mobile tabs
  document.querySelectorAll('#we-mobile-tabs .we-mobile-tab').forEach(function(el) {
    el.classList.toggle('we-tab-active', el.dataset.group === letter);
  });

  renderGroups();
}

function renderPeople() {
  const peopleEl = document.getElementById("people");
  peopleEl.innerHTML = '';
  const standings = calcLeaderboard();
  const matchPts = {};
  standings.forEach(s => { matchPts[s.name] = s.pts; });
  for (const [name, teams] of Object.entries(people)) {
    const card = document.createElement("div");
    card.className = "person-card card-base";
    card.style.cursor = 'pointer';
    card.onclick = () => showUserProfile(name);
    const badges = [];
    if (matchPts[name]) badges.push(`<span class="match-pts-badge">⚽${matchPts[name]}pts</span>`);
    if (predPointsByPlayer[name]) badges.push(`<span class="pred-pts-badge">🔮${predPointsByPlayer[name]}pts</span>`);
    const sponsorLine = name === 'Laurie' ? `<div class="person-sponsor">sponsored by <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg" alt="Coca-Cola" class="sponsor-logo"></div>` : '';
    card.innerHTML = `
      <div class="person-name">${typeof avatarHtml === 'function' ? avatarHtml(name, 24) : ''} ${escapeHtml(name)} <span class="count">${teams.length} teams</span>${badges.length ? ' ' + badges.join(' ') : ''}</div>${sponsorLine}
      <ul class="team-list">
        ${teams.map(t => `
          <li class="team-item" onclick="selectTeam('${t.team}')" title="View ${t.team} schedule">
            <img class="team-flag" src="${flagUrl(t.iso)}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span class="team-name">${t.team}</span>
            <span class="team-group badge-mono">Group ${t.group}</span>
          </li>
        `).join("")}
      </ul>
    `;
    peopleEl.appendChild(card);
  }
}

// ── QUALIFICATION SCENARIOS ──
// Enumerate every W/D/L outcome of a group's remaining matches and track
// each team's best/worst possible finishing position. Ties are broken
// with current goal difference plus ±1 per simulated result — a heuristic,
// so "THROUGH"/"OUT" only show when points alone can't be overturned.
function qualScenarios(letter, rows) {
  const remaining = matchData
    .filter(m => m.group === letter && !m.isComplete)
    .map(m => [m.team1, m.team2]);
  if (!remaining.length || remaining.length > 6) return null;
  const base = {};
  rows.forEach(r => { base[r.team] = { pts: r.pts, gd: r.gd, gf: r.gf }; });
  const best = {}, worst = {};
  rows.forEach(r => { best[r.team] = 4; worst[r.team] = 1; });
  const total = Math.pow(3, remaining.length);
  for (let s = 0; s < total; s++) {
    const sim = {};
    rows.forEach(r => { sim[r.team] = { ...base[r.team] }; });
    let code = s;
    for (const [h, a] of remaining) {
      const o = code % 3; code = Math.floor(code / 3);
      if (o === 0) { sim[h].pts += 3; sim[h].gd++; sim[h].gf++; sim[a].gd--; }
      else if (o === 1) { sim[a].pts += 3; sim[a].gd++; sim[a].gf++; sim[h].gd--; }
      else { sim[h].pts++; sim[a].pts++; }
    }
    const order = rows.map(r => r.team).sort((x, y) =>
      sim[y].pts - sim[x].pts || sim[y].gd - sim[x].gd || sim[y].gf - sim[x].gf || x.localeCompare(y));
    order.forEach((t, i) => {
      best[t] = Math.min(best[t], i + 1);
      worst[t] = Math.max(worst[t], i + 1);
    });
  }
  return { best, worst };
}

// ── RENDER GROUPS ──
function renderGroups() {
  var detailPane = document.getElementById('we-detail-pane');
  if (!detailPane) return;

  // ── Compute standings for ALL groups (needed for best-thirds) ──
  var standings = {};
  for (var i = 0; i < matchData.length; i++) {
    var m = matchData[i];
    if (!m.isComplete) continue;
    var score1 = m.score1, score2 = m.score2, team1 = m.team1, team2 = m.team2;
    if (!standings[team1]) standings[team1] = { p:0, w:0, d:0, l:0, gf:0, ga:0 };
    if (!standings[team2]) standings[team2] = { p:0, w:0, d:0, l:0, gf:0, ga:0 };
    standings[team1].p++; standings[team2].p++;
    standings[team1].gf += score1; standings[team1].ga += score2;
    standings[team2].gf += score2; standings[team2].ga += score1;
    if (score1 > score2) { standings[team1].w++; standings[team2].l++; }
    else if (score2 > score1) { standings[team2].w++; standings[team1].l++; }
    else { standings[team1].d++; standings[team2].d++; }
  }

  // ── Build per-group sorted rows ──
  var allGroupLetters = Object.keys(groups).sort();
  var allGroupRows = {};
  var thirds = [];
  for (var gi = 0; gi < allGroupLetters.length; gi++) {
    var letter = allGroupLetters[gi];
    var teams = groups[letter];
    var rows = teams.map(function(t) {
      var s = standings[t.team] || { p:0, w:0, d:0, l:0, gf:0, ga:0 };
      return { team: t.team, iso: t.iso, owner: t.owner,
        p: s.p, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga,
        gd: s.gf - s.ga, pts: s.w * 3 + s.d };
    }).sort(function(a, b) {
      return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team);
    });
    allGroupRows[letter] = rows;
    if (rows[2]) thirds.push(Object.assign({}, rows[2], { group: letter }));
  }
  thirds.sort(function(a, b) {
    return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team);
  });

  // ── Build folder list (A–L + Best Thirds) ──
  var folderList = document.getElementById('we-folder-list');
  if (folderList && folderList.children.length === 0) {
    var folderHtml = '';
    for (var fi = 0; fi < allGroupLetters.length; fi++) {
      var fl = allGroupLetters[fi];
      folderHtml += '<div class="we-folder-item' + (fl === weSelectedGroup ? ' we-folder-active' : '') +
        '" data-group="' + fl + '" onclick="weSelectGroup(\'' + fl + '\')">&#128193; Group ' + fl + '</div>';
    }
    folderHtml += '<div class="we-folder-item' + (weSelectedGroup === 'thirds' ? ' we-folder-active' : '') +
      '" data-group="thirds" onclick="weSelectGroup(\'thirds\')">&#128202; Best Thirds</div>';
    folderList.innerHTML = folderHtml;
  } else if (folderList) {
    // Just update active state
    folderList.querySelectorAll('.we-folder-item').forEach(function(el) {
      el.classList.toggle('we-folder-active', el.dataset.group === weSelectedGroup);
    });
  }

  // ── Build mobile tab strip ──
  var mobileTabs = document.getElementById('we-mobile-tabs');
  if (mobileTabs && mobileTabs.children.length === 0) {
    var tabHtml = '';
    for (var ti = 0; ti < allGroupLetters.length; ti++) {
      var tl = allGroupLetters[ti];
      tabHtml += '<button class="we-mobile-tab' + (tl === weSelectedGroup ? ' we-tab-active' : '') +
        '" data-group="' + tl + '" onclick="weSelectGroup(\'' + tl + '\')">' + tl + '</button>';
    }
    tabHtml += '<button class="we-mobile-tab' + (weSelectedGroup === 'thirds' ? ' we-tab-active' : '') +
      '" data-group="thirds" onclick="weSelectGroup(\'thirds\')">3rds</button>';
    mobileTabs.innerHTML = tabHtml;
  } else if (mobileTabs) {
    mobileTabs.querySelectorAll('.we-mobile-tab').forEach(function(el) {
      el.classList.toggle('we-tab-active', el.dataset.group === weSelectedGroup);
    });
  }

  // ── Render selected group into detail pane ──
  if (weSelectedGroup === 'thirds') {
    // Best-thirds table
    var thirdsHtml = thirds.map(function(r, i) {
      var qualCls = i < 8 ? 'we-row-qual' : '';
      var ownerHtml = r.owner
        ? '<span class="owner-tag ' + ownerColors[r.owner] + '" onclick="event.stopPropagation();showUserProfile(\'' + r.owner + '\')" style="cursor:pointer">' + r.owner + '</span>'
        : '<span style="color:#999">—</span>';
      var gdStr = r.gd > 0 ? '+' + r.gd : String(r.gd);
      return '<div class="we-file-row ' + qualCls + '">' +
        '<div class="we-file-cell" style="flex:1;min-width:140px">' +
          '<img class="we-file-flag" src="' + flagUrl(r.iso) + '" alt="">' +
          escapeHtml(r.team) + ' <span style="color:#888;font-size:10px">G' + r.group + '</span>' +
        '</div>' +
        '<div class="we-file-cell we-num" style="width:32px">' + r.p + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.w + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.d + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.l + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.gf + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.ga + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + gdStr + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + r.pts + '</div>' +
        '<div class="we-file-cell" style="width:80px">' + ownerHtml + '</div>' +
        '</div>';
    }).join('');
    detailPane.innerHTML = thirdsHtml || '<div style="padding:20px;color:#888;font-size:11px;font-style:italic">No data yet.</div>';

    // Status bar
    var statusLeft = document.getElementById('we-status-left');
    if (statusLeft) statusLeft.textContent = thirds.length + ' objects';
    var statusRight = document.getElementById('we-status-right');
    if (statusRight) {
      var q = thirds.filter(function(r, i) { return i < 8; }).length;
      statusRight.textContent = q > 0 ? q + ' advancing' : '';
    }

  } else {
    // Single group table
    var rows = allGroupRows[weSelectedGroup];
    if (!rows) { detailPane.innerHTML = ''; return; }

    var scen = qualScenarios(weSelectedGroup, rows);
    var rowsHtml = rows.map(function(r, i) {
      var isSure2 = scen && scen.worst[r.team] <= 2;
      var isOut = scen && scen.best[r.team] > 3;
      var qualCls = i < 2 ? 'we-row-qual' : (i === 2 ? 'we-row-third' : 'we-row-out');
      if (isSure2) qualCls = 'we-row-qual';
      if (isOut) qualCls = 'we-row-out';
      var ownerHtml = r.owner
        ? '<span class="owner-tag ' + ownerColors[r.owner] + '" onclick="event.stopPropagation();showUserProfile(\'' + r.owner + '\')" style="cursor:pointer">' + r.owner + '</span>'
        : '<span style="color:#999">—</span>';
      var gdStr = r.gd > 0 ? '+' + r.gd : String(r.gd);
      return '<div class="we-file-row ' + qualCls + '">' +
        '<div class="we-file-cell" style="flex:1;min-width:140px">' +
          '<img class="we-file-flag" src="' + flagUrl(r.iso) + '" alt="">' +
          escapeHtml(r.team) +
        '</div>' +
        '<div class="we-file-cell we-num" style="width:32px">' + r.p + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.w + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.d + '</div>' +
        '<div class="we-file-cell we-num" style="width:28px">' + r.l + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.gf + '</div>' +
        '<div class="we-file-cell we-num" style="width:34px">' + r.ga + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + gdStr + '</div>' +
        '<div class="we-file-cell we-num" style="width:38px">' + r.pts + '</div>' +
        '<div class="we-file-cell" style="width:80px">' + ownerHtml + '</div>' +
        '</div>';
    }).join('');

    detailPane.innerHTML = rowsHtml || '<div style="padding:20px;color:#888;font-size:11px;font-style:italic">No matches played yet.</div>';

    // Status bar
    var statusLeft2 = document.getElementById('we-status-left');
    if (statusLeft2) statusLeft2.textContent = rows.length + ' objects';
    var statusRight2 = document.getElementById('we-status-right');
    if (statusRight2) {
      var qualified = rows.filter(function(r, i) { return i < 2; }).length;
      var thirdText = '';
      if (scen) {
        var sureThird = rows.filter(function(r) { return scen.best[r.team] <= 3 && scen.worst[r.team] > 2; }).length;
        if (sureThird) thirdText = '  ·  ' + sureThird + ' third-place contender' + (sureThird !== 1 ? 's' : '');
      }
      statusRight2.textContent = (qualified === 2 ? '2 qualified' : '') + thirdText;
    }
  }
}
