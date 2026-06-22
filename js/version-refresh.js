// ── Auto-refresh on client-side update ──
// Fetches the deployed app version from Supabase (app_version table),
// polls every 30s. When the version changes, shows a World Cup broadcast
// HUD-style notification ("UPDATE AVAILABLE") that slides in, holds,
// slides out, then reloads the page.
//
// Testing:
//   Ctrl+Shift+U       — simulate a version update notification
//   testVersionUpdate() — call from console to trigger the same flow
(function () {
  var POLL_INTERVAL = 30000; // 30 seconds
  var currentVersion = null;

  // ── DOM setup ──
  var overlay, band, labelEl, subEl;

  function createDOM() {
    overlay = document.createElement('div');
    overlay.className = 'update-overlay';
    overlay.id = 'updateOverlay';

    band = document.createElement('div');
    band.className = 'update-band';

    var emoji = document.createElement('span');
    emoji.className = 'update-emoji';
    emoji.textContent = '⚽';

    labelEl = document.createElement('div');
    labelEl.className = 'update-label';
    labelEl.textContent = 'UPDATE AVAILABLE';

    subEl = document.createElement('div');
    subEl.className = 'update-sub';
    subEl.textContent = 'Reloading with latest changes…';

    band.appendChild(emoji);
    band.appendChild(labelEl);
    band.appendChild(subEl);
    overlay.appendChild(band);
    document.body.appendChild(overlay);
  }

  // ── Show notification, then reload ──
  // visible for 3s — 0.5s slide-in + 2s hold + 0.5s slide-out
  function showUpdateNotification() {
    if (!overlay) createDOM();

    // Get the latest version text for the sub label
    var ver = window.APP_VERSION || '';
    subEl.textContent = ver ? 'v' + ver + ' — Reloading with latest changes…' : 'Reloading with latest changes…';

    // Slide in
    overlay.classList.add('show');

    // After 2.5s, fade out then reload
    setTimeout(function () {
      overlay.classList.remove('show');
      // Wait for transition to complete, then reload
      setTimeout(function () {
        location.reload();
      }, 500);
    }, 2500);
  }

  // ── Version polling ──
  function fetchVersion() {
    return sb.from('app_version').select('version').eq('id', 1).single()
      .then(function (res) {
        if (res.data && res.data.version) return res.data.version;
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function checkForUpdate() {
    fetchVersion().then(function (newVersion) {
      if (!newVersion) return;

      if (currentVersion === null) {
        currentVersion = newVersion;
        console.log('[Version] App version:', currentVersion);
        return;
      }

      if (newVersion !== currentVersion) {
        console.log('[Update] Version changed from', currentVersion, 'to', newVersion);
        currentVersion = newVersion;
        showUpdateNotification();
      }
    });
  }

  // ── Testing helpers ──
  // Ctrl+Shift+U to simulate a version update
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'U') {
      e.preventDefault();
      console.log('[Version] Simulating update notification (Ctrl+Shift+U)');
      showUpdateNotification();
    }
  });

  // Expose for console testing
  window.testVersionUpdate = showUpdateNotification;

  // ── Start polling ──
  setTimeout(function () {
    createDOM();
    checkForUpdate();
    setInterval(checkForUpdate, POLL_INTERVAL);
  }, 1000);
})();
