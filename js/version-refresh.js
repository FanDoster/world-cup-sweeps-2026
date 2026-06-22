// ── Auto-refresh on client-side update ──
// Fetches the deployed app version from Supabase (app_version table),
// polls every 30s, and reloads the page when the version changes.
// The deploy pipeline updates the app_version row after each Surge deploy.
(function () {
  var POLL_INTERVAL = 30000; // 30 seconds
  var currentVersion = null;
  var polling = false;

  function fetchVersion() {
    return sb.from('app_version').select('version').eq('id', 1).single()
      .then(function (res) {
        if (res.data && res.data.version) return res.data.version;
        return null;
      })
      .catch(function () {
        return null; // silently ignore transient errors
      });
  }

  function checkForUpdate() {
    fetchVersion().then(function (newVersion) {
      if (!newVersion) return; // skip if fetch failed

      if (currentVersion === null) {
        // First load — just record the current version
        currentVersion = newVersion;
        console.log('[Version] App version:', currentVersion);
        return;
      }

      if (newVersion !== currentVersion) {
        console.log('[Update] Version changed from', currentVersion, 'to', newVersion, '— reloading');
        currentVersion = newVersion;
        location.reload();
      }
    });
  }

  // Start polling after a short delay to let the app bootstrap first
  setTimeout(function () {
    checkForUpdate(); // Initial fetch to set currentVersion
    setInterval(checkForUpdate, POLL_INTERVAL);
  }, 1000);
})();
