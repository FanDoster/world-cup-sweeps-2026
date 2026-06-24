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

function openWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  if (!xpStartupPlayed) {
    xpStartupPlayed = true;
    new Audio('media/startup.mp3').play().catch(function(){});
  }
  el.style.display = 'flex';
  if (!xpWindows[name]) {
    xpWindows[name] = { el: el, minimized: false, maximized: false };
  }
  xpWindows[name].minimized = false;
  focusWindow(name);
  xpSyncTaskbarBtn(name);
}

function closeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  el.style.display = 'none';
  delete xpWindows[name];
  xpRemoveTaskbarBtn(name);
  if (name === 'shooter' && typeof pauseShooter === 'function') pauseShooter();
}

function minimizeWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
  el.style.display = 'none';
  if (xpWindows[name]) xpWindows[name].minimized = true;
  xpSyncTaskbarBtn(name);
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
    var reply = msnGazzaReplies[Math.floor(Math.random() * msnGazzaReplies.length)];
    var gazzaMsg = document.createElement('div');
    gazzaMsg.className = 'msn-chat-msg';
    gazzaMsg.innerHTML =
      '<span class="msn-chat-sender">~~gAzZa~~</span>' +
      '<span class="msn-chat-says"> says:</span><br>' +
      '<span class="msn-chat-text">' + escapeHtml(reply) + '</span>';
    msgs.appendChild(gazzaMsg);
    msgs.scrollTop = msgs.scrollHeight;
    new Audio('media/msn-message.mp3').play().catch(function(){});
    msnReplying = false;
  }, 1000 + Math.floor(Math.random() * 1500));
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
      msg.style.display = 'block';
      var msgs = document.getElementById('msn-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
      new Audio('media/msn-message.mp3').play().catch(function(){});
    }
  }, 1500);
}

