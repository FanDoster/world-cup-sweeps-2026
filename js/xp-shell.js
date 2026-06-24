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
  msn:         '🦋 ~~gAzZa~~ - Conversation'
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
    var n = document.getElementById('msn-notification');
    if (!n || n.style.display === 'block') return;
    msnPrefetchGif();
    var gameMsg = msnLastGameMessage();
    if (gameMsg) {
      var statusEl = document.getElementById('msn-notif-status');
      if (statusEl) statusEl.textContent = gameMsg;
    }
    n.style.display = 'block';
    n.classList.add('msn-animating-in');
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
  msn:         'C:\\Program Files\\MSN Messenger'
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
  'why aye pal',
  'a luv yee pet',
  'are yee daft?',
  'why aye man',
  'divvent get is wrong pet but i cannae agree with that lyk'
];
var msnReplying = false;
var msnLastReply = -1;
var msnVideoSent = false;

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
      var idx;
      do { idx = Math.floor(Math.random() * msnGazzaReplies.length); } while (idx === msnLastReply);
      msnLastReply = idx;
      var reply = msnGazzaReplies[idx];
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
    return 'nowt in it between ' + t1 + ' and ' + t2 + ' man, ' + s1 + ' each - canny game mind';
  }
  var winner = diff > 0 ? t1 : t2, loser = diff > 0 ? t2 : t1;
  var ws = diff > 0 ? s1 : s2, ls = diff > 0 ? s2 : s1;
  var margin = Math.abs(diff), score = ws + '-' + ls;
  if (margin >= 3) return 'did ya see that?! ' + winner + ' absolutely mullered ' + loser + ' ' + score + ' man, what a game like';
  if (margin === 2) return 'canny game that, ' + winner + ' beat ' + loser + ' ' + score + ' like, well deserved an\' all';
  return winner + ' nicked it past ' + loser + ' ' + score + ', heart in me mouth the whole time pet';
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

function msnDismiss() {
  var n = document.getElementById('msn-notification');
  if (!n) return;
  n.classList.remove('msn-animating-in');
  n.classList.add('msn-animating-out');
  setTimeout(function() { n.style.display = 'none'; n.classList.remove('msn-animating-out'); }, 320);
}

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
    }
  }, 1500);
}

