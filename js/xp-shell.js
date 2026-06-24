// XP window registry: name -> { el, minimized, maximized, savedTop, savedLeft, savedWidth, savedHeight }
var xpWindows = {};
var xpZTop = 100;
var xpDragState = null;

var XP_WIN_LABELS = {
  home:        '⚽ World Cup 2026',
  players:     '🏆 Players',
  matches:     '⏱️ Matches',
  groups:      '📋 Groups',
  leaderboard: '🏅 Leaderboard',
  teams:       '🌍 Teams',
  map:         '🌐 Battle Map',
  bracket:     '📊 Bracket',
  shooter:     '🔫 Shooter',
  myteams:     '⭐ My Teams',
  predictions: '🔮 Predictions',
  profile:     '👤 Profile'
};

function openWindow(name) {
  var el = document.getElementById('xp-window-' + name);
  if (!el) return;
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
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.xp-window').forEach(function(el) {
    el.addEventListener('mousedown', function() {
      var name = el.dataset.win;
      if (name) focusWindow(name);
    });
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
