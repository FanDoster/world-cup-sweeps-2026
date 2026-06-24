// XP window registry: name -> { el, minimized, maximized, savedTop, savedLeft, savedWidth, savedHeight }
var xpWindows = {};
var xpZTop = 100;
var xpDragState = null;
var xpStartupPlayed = false;

var XP_WIN_LABELS = {
  home:        '⚽ World Cup 2026',
  players:     '🏆 Players',
  matches:     '⏱️ Matches',
  groups:      '📋 Groups',
  leaderboard: '🏅 Leaderboard',
  teams:       '🌍 Teams',
  map:         '🌐 Battle Map',
  shooter:     '🔫 Shooter',
  myteams:     '⭐ My Teams',
  predictions: '🔮 Predictions',
  profile:     '👤 Profile',
  match:       '📧 Match',
  msn:         '🦋 ~~gAzZa~~ - Conversation',
  limewire:    '🍋 LimeWire 4.12.3'
};

function xpWinAnimTransform(winRect, btnRect) {
  var tx = (btnRect.left + btnRect.width  / 2) - (winRect.left + winRect.width  / 2);
  var ty = (btnRect.top  + btnRect.height / 2) - (winRect.top  + winRect.height / 2);
  var sx = btnRect.width  / winRect.width;
  var sy = btnRect.height / winRect.height;
  return 'translate(' + tx + 'px,' + ty + 'px) scale(' + sx + ',' + sy + ')';
}

function openWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  if (!xpStartupPlayed) {
    xpStartupPlayed = true;
    new Audio('media/startup.mp3').play().catch(function(){});
  }

  var wasMinimized = xpWindows[name] && xpWindows[name].minimized;
  el.style.display = 'flex';

  if (!xpWindows[name]) {
    xpWindows[name] = { el: el, minimized: false, maximized: false };
  }
  xpWindows[name].minimized = false;
  focusWindow(name);
  xpSyncTaskbarBtn(name);

  /* open/restore animation: expand from taskbar button (restore) or desktop icon (fresh open) */
  var animSrc = null;
  if (wasMinimized) {
    animSrc = document.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  } else {
    animSrc = document.querySelector('.xp-icon[data-window="' + name + '"]');
  }
  if (animSrc && animSrc.offsetParent) {
    var wRect = el.getBoundingClientRect();
    var sRect = animSrc.getBoundingClientRect();
    el.style.transition = 'none';
    el.style.opacity    = '0';
    el.style.transform  = xpWinAnimTransform(wRect, sRect);
    el.getBoundingClientRect(); /* force reflow */
    el.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
    el.style.transform  = '';
    el.style.opacity    = '';
    var cleanup = function() {
      el.removeEventListener('transitionend', cleanup);
      el.style.transition = '';
    };
    el.addEventListener('transitionend', cleanup);
  }
}

function closeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  el.style.display = 'none';
  el.style.transform = '';
  el.style.opacity = '';
  el.style.transition = '';
  delete xpWindows[name];
  xpRemoveTaskbarBtn(name);
  if (name === 'shooter' && typeof pauseShooter === 'function') pauseShooter();
}

function minimizeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;

  var btn = document.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  if (!btn || !btn.offsetParent) {
    /* mobile — no visible taskbar button, hide instantly */
    el.style.display = 'none';
    if (xpWindows[name]) xpWindows[name].minimized = true;
    xpSyncTaskbarBtn(name);
    return;
  }

  var wRect = el.getBoundingClientRect();
  var bRect = btn.getBoundingClientRect();
  var finished = false;
  var done = function() {
    if (finished) return;
    finished = true;
    el.removeEventListener('transitionend', done);
    el.style.display    = 'none';
    el.style.transition = '';
    el.style.transform  = '';
    el.style.opacity    = '';
    if (xpWindows[name]) xpWindows[name].minimized = true;
    xpSyncTaskbarBtn(name);
  };

  el.style.transition = 'transform 180ms ease-in, opacity 180ms ease-in';
  el.style.transform  = xpWinAnimTransform(wRect, bRect);
  el.style.opacity    = '0';
  el.addEventListener('transitionend', done);
  setTimeout(done, 220); /* fallback if transitionend never fires */
}

function maximizeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el || !xpWindows[name]) return;
  var state = xpWindows[name];
  if (state.maximized) {
    el.style.top    = state.savedTop;
    el.style.left   = state.savedLeft;
    el.style.width  = state.savedWidth;
    el.style.height = state.savedHeight || '';
    state.maximized = false;
  } else {
    state.savedTop    = el.style.top;
    state.savedLeft   = el.style.left;
    state.savedWidth  = el.style.width;
    state.savedHeight = el.style.height;
    el.style.top    = '0';
    el.style.left   = '0';
    el.style.width  = '100vw';
    el.style.height = '100%';  /* fills #xp-desktop which already excludes taskbar */
    state.maximized = true;
  }
  focusWindow(name);
}

function focusWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  xpZTop++;
  el.style.zIndex = xpZTop;
  document.querySelectorAll('.xp-window').forEach(function(w) {
    w.classList.remove('xp-focused');
  });
  el.classList.add('xp-focused');
  document.querySelectorAll('.xp-taskbar-btn').forEach(function(b) {
    b.classList.remove('xp-tb-active');
  });
  var btn = document.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  if (btn) btn.classList.add('xp-tb-active');
}

/* ── DRAG ── */
function startDrag(e, name) {
  if (e.button !== 0) return;
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  focusWindow(name);
  if (xpWindows[name] && xpWindows[name].maximized) return;
  var rect = el.getBoundingClientRect();
  xpDragState = { name: name, el: el, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
  document.addEventListener('mousemove', xpOnDragMove);
  document.addEventListener('mouseup', xpOnDragEnd);
  e.preventDefault();
}

function xpOnDragMove(e) {
  if (!xpDragState) return;
  var dx = e.clientX - xpDragState.startX;
  var dy = e.clientY - xpDragState.startY;
  xpDragState.el.style.left = (xpDragState.origLeft + dx) + 'px';
  xpDragState.el.style.top  = Math.max(0, xpDragState.origTop + dy) + 'px';
}

function xpOnDragEnd() {
  xpDragState = null;
  document.removeEventListener('mousemove', xpOnDragMove);
  document.removeEventListener('mouseup', xpOnDragEnd);
}

/* ── TASKBAR ── */
function xpSyncTaskbarBtn(name) {
  var strip = document.getElementById('xp-taskbar-windows');
  if (!strip) return;
  var btn = strip.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'xp-taskbar-btn';
    btn.dataset.win = name;
    btn.textContent = XP_WIN_LABELS[name] || name;
    btn.addEventListener('click', function() { xpTaskbarBtnClick(name); });
    strip.appendChild(btn);
  }
  var state = xpWindows[name];
  if (state && !state.minimized) {
    btn.classList.add('xp-tb-active');
  } else {
    btn.classList.remove('xp-tb-active');
  }
}

function xpTaskbarBtnClick(name) {
  var el = document.getElementById('xp-window-' + name);
  var state = xpWindows[name];
  if (!state || state.minimized) {
    openWindow(name);
    return;
  }
  /* if already focused, minimize; otherwise focus */
  if (el && parseInt(el.style.zIndex) === xpZTop) {
    minimizeWindow(name);
  } else {
    focusWindow(name);
  }
}

function xpRemoveTaskbarBtn(name) {
  var strip = document.getElementById('xp-taskbar-windows');
  if (!strip) return;
  var btn = strip.querySelector('.xp-taskbar-btn[data-win="' + name + '"]');
  if (btn) btn.remove();
}

/* ── CLICK TO FOCUS ── */
/* ── XP WELCOME SCREEN ── */
var XP_ACCOUNT_PICS = {
  Anton:  'images/xp-accounts/anton.jpg',
  Chris:  'images/xp-accounts/chris.jpg',
  Dan:    'images/xp-accounts/dan.jpg',
  Laurie: 'images/xp-accounts/laurie.jpg',
  Pat:    'images/xp-accounts/pat.jpg',
  Steven: 'images/xp-accounts/steven.jpg'
};

function xpBuildWelcomeTiles() {
  var container = document.getElementById('xp-welcome-tiles');
  if (!container) return;
  var cachedName = localStorage.getItem('xp_player_name');
  var players = typeof PLAYERS !== 'undefined' ? PLAYERS : ['Anton','Chris','Dan','Laurie','Pat','Steven'];
  var colors  = typeof ownerHexColors !== 'undefined' ? ownerHexColors : {};

  container.innerHTML = '';
  players.forEach(function(name) {
    var color = colors[name] || '#3a7bd5';
    var pic   = XP_ACCOUNT_PICS[name];
    var avatarInner = pic
      ? '<img src="' + pic + '" alt="' + name + '" class="xp-welcome-avatar-img">'
      : name[0];
    var tile  = document.createElement('div');
    tile.className = 'xp-welcome-tile' + (cachedName === name ? ' xp-welcome-tile-me' : '');
    tile.innerHTML =
      '<div class="xp-welcome-avatar" style="' + (pic ? '' : 'background:' + color) + '">' + avatarInner + '</div>' +
      '<div class="xp-welcome-name">' + name + '</div>';
    tile.addEventListener('click', function() {
      xpHideWelcome();
      var btn = document.querySelector('.xp-tray-signin');
      if (btn) btn.click();
    });
    container.appendChild(tile);
  });

  var hint = document.getElementById('xp-welcome-hint');
  if (hint) hint.textContent = cachedName
    ? 'Welcome back, ' + cachedName
    : 'To begin, click your user name';
}

function xpHideWelcome() {
  var el = document.getElementById('xp-welcome');
  if (!el || el.classList.contains('xp-welcome-out')) return;
  el.classList.add('xp-welcome-out');
  setTimeout(function() { el.style.display = 'none'; }, 600);
  setTimeout(function() {
    msnPrefetchGif();
    var gameMsg = msnLastGameMessage() || 'now then pet, how\'s it gannin?';
    msnPushNotif(gameMsg);

    /* second toast a few seconds later — a contextual follow-up */
    setTimeout(function() {
      var pool = msnContextPool();
      if (pool.length) {
        msnPushNotif(pool[Math.floor(Math.random() * pool.length)]);
      }
    }, 3500);
  }, 2500);
}

document.addEventListener('DOMContentLoaded', xpBuildWelcomeTiles);

var XP_WIN_PATHS = {
  home:        'C:\\WorldCup2026',
  matches:     'C:\\WorldCup2026\\Matches',
  players:     'C:\\WorldCup2026\\Players',
  groups:      'C:\\WorldCup2026\\Groups',
  leaderboard: 'C:\\WorldCup2026\\Leaderboard',
  teams:       'C:\\WorldCup2026\\Teams',
  map:         'C:\\WorldCup2026\\Battle Map',
  shooter:     'C:\\WorldCup2026\\Shooter',
  myteams:     'C:\\WorldCup2026\\My Teams',
  predictions: 'C:\\WorldCup2026\\Predictions',
  profile:     'C:\\WorldCup2026\\Profile',
  awards:      'C:\\WorldCup2026\\Awards',
  match:       'C:\\WorldCup2026\\Matches',
  msn:         'C:\\Program Files\\MSN Messenger',
  limewire:    'C:\\Program Files\\LimeWire'
};

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.xp-window').forEach(function(el) {
    el.addEventListener('mousedown', function() {
      var name = el.dataset.win;
      if (name) focusWindow(name);
    });

    /* inject Explorer toolbar + address bar below the title bar */
    var name = el.dataset.win;
    var titleBar = el.querySelector('.title-bar');
    if (!titleBar || el.hasAttribute('data-no-explorer')) return;

    var toolbar = document.createElement('div');
    toolbar.className = 'xp-explorer-toolbar';
    toolbar.innerHTML =
      '<button class="xp-tb-btn" disabled title="Back">&#9664; Back</button>' +
      '<button class="xp-tb-btn" disabled title="Forward">Forward &#9654;</button>' +
      '<button class="xp-tb-btn" disabled title="Up">&#9650; Up</button>' +
      '<span class="xp-tb-sep"></span>' +
      '<button class="xp-tb-btn" disabled title="Search">&#128269; Search</button>';

    var addrBar = document.createElement('div');
    addrBar.className = 'xp-explorer-addr';
    addrBar.innerHTML =
      '<span class="xp-addr-label">Address</span>' +
      '<span class="xp-addr-field">' + (XP_WIN_PATHS[name] || 'C:\\WorldCup2026') + '</span>';

    titleBar.after(toolbar);
    toolbar.after(addrBar);
  });
});

/* ── CLOCK ── */
function xpUpdateClock() {
  var el = document.getElementById('xp-clock');
  if (!el) return;
  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  el.textContent = h + ':' + m;
}
setInterval(xpUpdateClock, 1000);
/* clock initialised after DOM ready — called from main.js init */

/* ── START MENU ── */
function toggleStartMenu() {
  var menu = document.getElementById('xp-start-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeStartMenu() {
  var menu = document.getElementById('xp-start-menu');
  if (menu) menu.style.display = 'none';
}

document.addEventListener('click', function(e) {
  var startBtn = document.getElementById('xp-start-btn');
  var menu = document.getElementById('xp-start-menu');
  if (!menu || !startBtn) return;
  if (!startBtn.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display = 'none';
  }
});

/* ── ICON SINGLE-CLICK SELECT ── */
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.xp-icon').forEach(function(icon) {
    icon.addEventListener('click', function(e) {
      document.querySelectorAll('.xp-icon').forEach(function(i) { i.classList.remove('xp-selected'); });
      icon.classList.add('xp-selected');
      e.stopPropagation();
    });
  });
  document.getElementById('xp-desktop').addEventListener('click', function() {
    document.querySelectorAll('.xp-icon').forEach(function(i) { i.classList.remove('xp-selected'); });
  });
});

/* ── MOBILE: open/close hooks ── */
var XP_IS_MOBILE = function() { return window.innerWidth <= 700; };

var _origOpenWindow = openWindow;
openWindow = function(name) {
  _origOpenWindow(name);
  if (XP_IS_MOBILE()) {
    closeStartMenu();
    document.querySelectorAll('.xp-window').forEach(function(w) {
      w.classList.remove('xp-mob-open');
    });
    var el = document.getElementById('xp-window-' + name);
    if (el) el.classList.add('xp-mob-open');
    var topbar = document.getElementById('xp-mob-topbar');
    if (topbar) topbar.textContent = (XP_WIN_LABELS[name] || name).replace(/^.+ /, '');
    var today = document.getElementById('xp-today');
    if (today) today.style.display = 'none';
  }
};

var _origCloseWindow = closeWindow;
closeWindow = function(name) {
  _origCloseWindow(name);
  if (XP_IS_MOBILE()) {
    var el = document.getElementById('xp-window-' + name);
    if (el) el.classList.remove('xp-mob-open');
    var anyOpen = document.querySelector('.xp-window.xp-mob-open');
    if (!anyOpen) {
      var today = document.getElementById('xp-today');
      if (today) today.style.display = 'block';
      var topbar = document.getElementById('xp-mob-topbar');
      if (topbar) topbar.textContent = 'World Cup 2026';
    }
  }
};

var msnGazzaReplies = [
  'wey aye man',
  'a luv yee pet',
  'are ye daft like?',
  'howay man',
  'divvent get iz wrong pet but a canna agree with that like',
  'hadaway man, stop messin aboot',
  'alreet like, canny question that pet',
  'tell ye what this tournament\'s been absolute quality man',
  'wey aye marra, proper mint that',
  'howay, ye\'re not wrong like',
  'a canna believe it man, what a tournament',
  'wey man, that\'s geet canny that like'
];
var msnReplying = false;
var msnLastReply = -1;
var msnVideoSent = false;

function msnGetNextGame() {
  if (typeof matchData === 'undefined' || !matchData.length) return null;
  var upcoming = matchData.filter(function(m) { return m.score1 === null && m.score2 === null; });
  if (!upcoming.length) return null;
  upcoming.sort(function(a, b) {
    var da = a.date + ' ' + (a.time || ''), db = b.date + ' ' + (b.time || '');
    return da < db ? -1 : da > db ? 1 : 0;
  });
  return upcoming[0];
}

function msnGetLeaderboard() {
  if (typeof calcLeaderboard !== 'function') return null;
  try { return calcLeaderboard(); } catch(e) { return null; }
}

function msnGetUserTeams() {
  if (typeof currentProfile === 'undefined' || !currentProfile) return [];
  var name = currentProfile.player_name;
  if (typeof people === 'undefined' || !people[name]) return [];
  return people[name].map(function(t) { return t.name || t; });
}

function msnOwnerOf(teamName) {
  if (typeof teamOwner === 'undefined') return null;
  return teamOwner[teamName] || null;
}

/* builds a live pool of contextual one-liners Gazza can drop */
function msnContextPool() {
  var pool = [];

  /* leaderboard context */
  var lb = msnGetLeaderboard();
  if (lb && lb.length >= 2) {
    var first = lb[0], second = lb[1];
    var gap = first.total - second.total;
    pool.push(first.name + ' is absolutely flying up the table man, proper running away with it like');
    pool.push('wey aye, ' + first.name + '\'s on fire this tournament - ' + first.total + ' points an\' all');
    if (gap <= 2) {
      pool.push('it\'s dead tight at the top mind - ' + first.name + ' and ' + second.name + ' only ' + gap + ' point' + (gap === 1 ? '' : 's') + ' in it like');
    } else {
      pool.push(first.name + '\'s got a right cushion on ' + second.name + ' now, ' + gap + ' points clear like');
    }
    if (lb.length >= 3) {
      var last = lb[lb.length - 1];
      pool.push('divvent tell ' + last.name + ' but they\'re rooted to the bottom man, like');
    }
  }

  /* next game context */
  var next = msnGetNextGame();
  if (next) {
    var o1 = msnOwnerOf(next.team1), o2 = msnOwnerOf(next.team2);
    var tag1 = o1 ? ' (' + o1 + '\'s)' : '';
    var tag2 = o2 ? ' (' + o2 + '\'s)' : '';
    pool.push('big game comin up like - ' + next.team1 + tag1 + ' vs ' + next.team2 + tag2 + ' - should be a cracker man');
    pool.push('keep ya eye on ' + next.team1 + ' vs ' + next.team2 + ' pet, could be tasty that');
    if (o1 && o2) {
      pool.push(o1 + ' vs ' + o2 + ' next - gets personal now like, heh heh');
    }
  }

  /* last game owner context */
  var last = msnGetLastGame();
  if (last) {
    var diff = last.score1 - last.score2;
    if (diff !== 0) {
      var winner = diff > 0 ? last.team1 : last.team2;
      var loser  = diff > 0 ? last.team2 : last.team1;
      var ow = msnOwnerOf(winner), ol = msnOwnerOf(loser);
      if (ow) pool.push(ow + ' must be doin\'  backflips after that ' + winner + ' result man, fair play like');
      if (ol) pool.push('gutted for ' + ol + ' mind, ' + loser + ' had nowt in that game like');
    }
  }

  /* logged-in user's teams */
  var myTeams = msnGetUserTeams();
  if (myTeams.length) {
    var pick = myTeams[Math.floor(Math.random() * myTeams.length)];
    pool.push('how\'s ' + pick + ' gettin on for ya like, still got a chance?');
    pool.push('ya still got ' + pick + ' in it? canny team that, could gan all the way');
    if (myTeams.length > 1) {
      pool.push('nice havin a few teams in it like - ya got ' + myTeams[0] + ' an\'  ' + myTeams[1] + ' still gannin?');
    }
  }

  return pool;
}

function msnAppendGazzaVideo(msgs) {
  var gazzaMsg = document.createElement('div');
  gazzaMsg.className = 'msn-chat-msg';
  gazzaMsg.innerHTML =
    '<span class="msn-chat-sender">~~gAzZa~~</span>' +
    '<span class="msn-chat-says"> has sent you a file:</span><br>' +
    '<div class="msn-file-transfer">' +
      '<div class="msn-file-name">&#128249; happening again.mp4</div>' +
      '<video src="media/happening-again.mp4" controls playsinline class="msn-inline-video"></video>' +
    '</div>';
  msgs.appendChild(gazzaMsg);
  msgs.scrollTop = msgs.scrollHeight;
  new Audio('media/msn-message.mp3').play().catch(function(){});
}

function msnSendMessage() {
  var field = document.getElementById('msn-input-field');
  var msgs = document.getElementById('msn-messages');
  if (!field || !msgs) return;
  var text = field.value.trim();
  if (!text || msnReplying) return;

  var name = (typeof currentProfile !== 'undefined' && currentProfile) ? currentProfile.player_name : 'You';

  var userMsg = document.createElement('div');
  userMsg.className = 'msn-chat-msg';
  userMsg.innerHTML =
    '<span class="msn-chat-sender msn-chat-sender-user">' + escapeHtml(name) + '</span>' +
    '<span class="msn-chat-says"> says:</span><br>' +
    '<span class="msn-chat-text">' + escapeHtml(text) + '</span>';
  msgs.appendChild(userMsg);
  msgs.scrollTop = msgs.scrollHeight;
  field.value = '';
  msnReplying = true;

  setTimeout(function() {
    if (!msnVideoSent && Math.random() < 0.3) {
      msnVideoSent = true;
      msnAppendGazzaVideo(msgs);
    } else {
      /* blend static geordie phrases with live contextual lines */
      var pool = msnGazzaReplies.concat(msnContextPool());
      var idx;
      do { idx = Math.floor(Math.random() * pool.length); } while (idx === msnLastReply && pool.length > 1);
      msnLastReply = idx;
      var reply = pool[idx];
      var gazzaMsg = document.createElement('div');
      gazzaMsg.className = 'msn-chat-msg';
      gazzaMsg.innerHTML =
        '<span class="msn-chat-sender">~~gAzZa~~</span>' +
        '<span class="msn-chat-says"> says:</span><br>' +
        '<span class="msn-chat-text">' + escapeHtml(reply) + '</span>';
      msgs.appendChild(gazzaMsg);
      msgs.scrollTop = msgs.scrollHeight;
      new Audio('media/msn-message.mp3').play().catch(function(){});
    }
    msnReplying = false;
  }, 1000 + Math.floor(Math.random() * 1500));
}

function msnGetLastGame() {
  if (typeof matchData === 'undefined' || !matchData.length) return null;
  var done = matchData.filter(function(m) { return m.score1 !== null && m.score2 !== null; });
  if (!done.length) return null;
  done.sort(function(a, b) {
    var da = a.date + ' ' + (a.time || ''), db = b.date + ' ' + (b.time || '');
    return da < db ? 1 : da > db ? -1 : 0;
  });
  return done[0];
}

function msnLastGameMessage() {
  var m = msnGetLastGame();
  if (!m) return null;
  var s1 = m.score1, s2 = m.score2, t1 = m.team1, t2 = m.team2;
  var diff = s1 - s2;
  if (diff === 0) {
    var o1 = msnOwnerOf(t1), o2 = msnOwnerOf(t2);
    var ownerBit = (o1 && o2 && o1 !== o2) ? ' - both ' + o1 + ' an\' ' + o2 + ' get a point each like' : '';
    return 'nowt in it between ' + t1 + ' and ' + t2 + ' man, ' + s1 + ' each - canny game mind' + ownerBit;
  }
  var winner = diff > 0 ? t1 : t2, loser = diff > 0 ? t2 : t1;
  var ws = diff > 0 ? s1 : s2, ls = diff > 0 ? s2 : s1;
  var margin = Math.abs(diff), score = ws + '-' + ls;
  var ow = msnOwnerOf(winner), ol = msnOwnerOf(loser);
  var ownerBit = ow ? ' - that\'s ' + ow + '\'s team man!' : (ol ? ' - proper gutted for ' + ol + ' that like' : '');
  if (margin >= 3) return 'did ya see that?! ' + winner + ' absolutely mullered ' + loser + ' ' + score + ' man, what a game like' + ownerBit;
  if (margin === 2) return 'canny game that, ' + winner + ' beat ' + loser + ' ' + score + ' like, well deserved an\' all' + ownerBit;
  return winner + ' nicked it past ' + loser + ' ' + score + ', heart in me mouth the whole time pet' + ownerBit;
}

var msnGifPromise = null;

function msnFetchGifUrl(query) {
  return fetch('https://api.tenor.com/v1/search?q=' + encodeURIComponent(query) + '&key=LIVDSRZULELA&limit=8&media_filter=minimal&contentfilter=medium')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.results && data.results.length) {
        var item = data.results[Math.floor(Math.random() * Math.min(6, data.results.length))];
        var m = item.media[0];
        return (m.tinygif || m.gif).url;
      }
      return null;
    })
    .catch(function() { return null; });
}

function msnPrefetchGif() {
  var game = msnGetLastGame();
  if (!game || game.score1 === game.score2) return;
  var winner = game.score1 > game.score2 ? game.team1 : game.team2;
  msnGifPromise = msnFetchGifUrl(winner + ' football');
}

function msnSendWinnerGif(msgs, winnerName) {
  var iso = (typeof teamIso !== 'undefined' && teamIso[winnerName]) ? teamIso[winnerName] : '';
  var done = function(gifUrl) { msnAppendGifMsg(msgs, gifUrl, winnerName, iso); };
  (msnGifPromise || msnFetchGifUrl(winnerName + ' football')).then(done).catch(function() { done(null); });
}

function msnAppendGifMsg(msgs, gifUrl, winnerName, iso) {
  var gazzaMsg = document.createElement('div');
  gazzaMsg.className = 'msn-chat-msg';
  var media;
  if (gifUrl) {
    media = '<img src="' + gifUrl + '" class="msn-inline-gif" alt="' + escapeHtml(winnerName) + '">';
  } else {
    media = '<div class="msn-flag-sticker">' +
      (iso ? '<img class="msn-sticker-flag" src="https://flagcdn.com/w160/' + iso + '.png" alt="' + escapeHtml(winnerName) + '">' : '') +
      '<div class="msn-sticker-text">&#127942; GET IN!! &#9917;</div>' +
      '</div>';
  }
  gazzaMsg.innerHTML = '<span class="msn-chat-sender">~~gAzZa~~</span><span class="msn-chat-says"> sends:</span><br>' + media;
  msgs.appendChild(gazzaMsg);
  msgs.scrollTop = msgs.scrollHeight;
  new Audio('media/msn-message.mp3').play().catch(function(){});
}

/* ── STACKING TOAST MANAGER ── */
var msnNotifStack = [];
var MSN_TOAST_GAP = 4;
var MSN_TASKBAR_H = 40;

function msnPushNotif(preview) {
  var el = document.createElement('div');
  el.className = 'msn-toast';
  el.innerHTML =
    '<div class="msn-toast-titlebar">' +
      '<span>🦋</span><span>MSN Messenger</span>' +
      '<button class="msn-toast-close" title="Dismiss">&#215;</button>' +
    '</div>' +
    '<div class="msn-toast-body">' +
      '<img class="msn-toast-avatar" src="img/gazza-crying.jpg" alt="Gazza">' +
      '<div>' +
        '<div class="msn-toast-name">~~gAzZa~~</div>' +
        '<div class="msn-toast-preview">' + escapeHtml(preview) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="msn-toast-footer">Click here to view your messages</div>';

  var entry = { el: el, timer: null };

  /* start off-screen and invisible so the layout is computed before animating */
  el.style.bottom = '-110px';
  el.style.opacity = '0';
  document.body.appendChild(el);

  el.querySelector('.msn-toast-close').addEventListener('click', function(e) {
    e.stopPropagation();
    msnDismissToast(entry);
  });
  el.addEventListener('click', function() {
    msnDismissAll();
    msnOpenChat();
  });

  /* force layout at initial position, then slide into place */
  el.offsetHeight;
  msnNotifStack.push(entry);
  el.style.opacity = '1';
  msnRestack();

  entry.timer = setTimeout(function() { msnDismissToast(entry); }, 8000);
  new Audio('media/msn-message.mp3').play().catch(function(){});
  return entry;
}

function msnRestack() {
  var bottom = MSN_TASKBAR_H + MSN_TOAST_GAP;
  for (var i = msnNotifStack.length - 1; i >= 0; i--) {
    msnNotifStack[i].el.style.bottom = bottom + 'px';
    bottom += msnNotifStack[i].el.offsetHeight + MSN_TOAST_GAP;
  }
}

function msnDismissToast(entry) {
  if (!entry || !entry.el || entry.dismissing) return;
  entry.dismissing = true;
  clearTimeout(entry.timer);
  entry.el.style.opacity = '0';
  entry.el.style.bottom = '-110px';
  var el = entry.el;
  setTimeout(function() {
    if (el.parentNode) el.parentNode.removeChild(el);
    msnNotifStack = msnNotifStack.filter(function(e) { return e !== entry; });
    msnRestack();
  }, 300);
}

function msnDismissAll() {
  msnNotifStack.slice().forEach(msnDismissToast);
}

/* legacy shim */
function msnDismiss() { msnDismissAll(); }

function msnOpenChat() {
  msnDismiss();
  var inner = document.getElementById('msn-dp-user-inner');
  if (inner) {
    var name = (typeof currentProfile !== 'undefined' && currentProfile) ? currentProfile.player_name : null;
    var pic = name ? (XP_ACCOUNT_PICS[name] || null) : null;
    if (pic) {
      inner.outerHTML = '<img id="msn-dp-user-inner" src="' + pic + '" class="msn-dp-img" alt="You">';
    }
  }
  openWindow('msn');
  new Audio('media/msn-message.mp3').play().catch(function(){});
  setTimeout(function() {
    var msg = document.getElementById('msn-msg-2');
    if (msg) {
      var gameMsg = msnLastGameMessage();
      if (gameMsg) {
        var textEl = msg.querySelector('.msn-chat-text');
        if (textEl) textEl.textContent = gameMsg;
      }
      msg.style.display = 'block';
      var msgs = document.getElementById('msn-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
      new Audio('media/msn-message.mp3').play().catch(function(){});

      // third message: winner GIF
      setTimeout(function() {
        var game = msnGetLastGame();
        if (!game || game.score1 === game.score2) return;
        var winner = game.score1 > game.score2 ? game.team1 : game.team2;
        var m2 = document.getElementById('msn-messages');
        if (m2) msnSendWinnerGif(m2, winner);
      }, 800);

      // fourth message: contextual follow-up (leaderboard / next game / user teams)
      setTimeout(function() {
        var pool = msnContextPool();
        if (!pool.length) return;
        var line = pool[Math.floor(Math.random() * pool.length)];
        var m3 = document.getElementById('msn-messages');
        if (!m3) return;
        var follow = document.createElement('div');
        follow.className = 'msn-chat-msg';
        follow.innerHTML =
          '<span class="msn-chat-sender">~~gAzZa~~</span>' +
          '<span class="msn-chat-says"> says:</span><br>' +
          '<span class="msn-chat-text">' + escapeHtml(line) + '</span>';
        m3.appendChild(follow);
        m3.scrollTop = m3.scrollHeight;
        new Audio('media/msn-message.mp3').play().catch(function(){});
      }, 2600);
    }
  }, 1500);
}

/* ═══════════════════════════════════════════════
   LIMEWIRE DOWNLOAD SIMULATOR
═══════════════════════════════════════════════ */
var lwDownloads = [
  { name: 'Three Lions (Footballs Coming Home) - Baddiel & Skinner.mp3', size: 3407872, done: 0,       speed: 3900, status: 'downloading' },
  { name: 'World In Motion - New Order.mp3',                              size: 3981312, done: 0,       speed: 0,    status: 'queued' },
  { name: 'Nessun Dorma - Pavarotti (Italia 90 Opening Ceremony).mp3',   size: 4403200, done: 0,       speed: 0,    status: 'queued' },
  { name: 'Vindaloo - Fat Les (Official).mp3',                            size: 3041280, done: 3041280, speed: 0,    status: 'complete' },
  { name: 'Hand of God 1986 - Maradona vs England Highlights.avi',        size: 9437184, done: 0,       speed: 0,    status: 'queued' },
  { name: 'Gazza Tears Euro 96 (Paul Gascoigne).mp3',                     size: 1179648, done: 360448,  speed: 4700, status: 'downloading' }
];
var lwTickId = null;

function lwActivateNext() {
  for (var i = 0; i < lwDownloads.length; i++) {
    if (lwDownloads[i].status === 'queued') {
      lwDownloads[i].status = 'downloading';
      lwDownloads[i].speed = 2800 + Math.floor(Math.random() * 2200);
      break;
    }
  }
}

function lwTick() {
  var active = 0;
  var completed = false;
  for (var i = 0; i < lwDownloads.length; i++) {
    var d = lwDownloads[i];
    if (d.status !== 'downloading') continue;
    active++;
    var fluctuate = 0.82 + Math.random() * 0.36;
    d.done = Math.min(d.done + Math.floor(d.speed * fluctuate * 0.5), d.size);
    if (d.done >= d.size) {
      d.done = d.size;
      d.status = 'complete';
      d.speed = 0;
      completed = true;
      active--;
    }
  }
  if (completed) setTimeout(lwActivateNext, 1200);
  lwRender();
}

function lwRender() {
  var tbody = document.getElementById('lw-downloads-tbody');
  if (!tbody) return;
  var html = '';
  var activeCount = 0;
  for (var i = 0; i < lwDownloads.length; i++) {
    var d = lwDownloads[i];
    var pct = d.size > 0 ? Math.round(d.done / d.size * 100) : 0;
    var sizeStr = (d.size / 1048576).toFixed(1) + ' MB';
    var speedStr = d.status === 'downloading' ? (d.speed / 1024).toFixed(1) + ' KB/s' : '-';
    var statusLabel, statusCls;
    if (d.status === 'complete')     { statusLabel = '&#10003; Complete';  statusCls = 'lw-status-done'; }
    else if (d.status === 'downloading') { statusLabel = 'Downloading'; statusCls = 'lw-status-dl'; activeCount++; }
    else                             { statusLabel = 'Queued';       statusCls = 'lw-status-q'; }
    var fillCls = d.status === 'complete' ? 'lw-progress-fill lw-fill-done' : 'lw-progress-fill';
    html += '<tr class="lw-dl-row">';
    html += '<td class="lw-dl-name"><img src="img/limewire-tray.ico" width="12" height="12" style="image-rendering:pixelated" alt="">' + (typeof escapeHtml === 'function' ? escapeHtml(d.name) : d.name) + '</td>';
    html += '<td class="lw-dl-size">' + sizeStr + '</td>';
    html += '<td class="lw-dl-prog"><div class="lw-progress"><div class="' + fillCls + '" style="width:' + pct + '%"></div><span class="lw-prog-pct">' + pct + '%</span></div></td>';
    html += '<td class="lw-dl-speed">' + speedStr + '</td>';
    html += '<td class="lw-dl-status-col ' + statusCls + '">' + statusLabel + '</td>';
    html += '</tr>';
  }
  tbody.innerHTML = html;
  var countEl = document.getElementById('lw-active-count');
  if (countEl) countEl.textContent = activeCount + ' active download' + (activeCount === 1 ? '' : 's');
}

document.addEventListener('DOMContentLoaded', function() {
  /* start download simulation */
  lwRender();
  lwTickId = setInterval(lwTick, 500);

  /* pre-register as minimized so it appears in the taskbar from the start */
  var lwEl = document.getElementById('xp-window-limewire');
  if (lwEl) {
    xpWindows['limewire'] = { el: lwEl, minimized: true, maximized: false };
    xpSyncTaskbarBtn('limewire');
  }
});

