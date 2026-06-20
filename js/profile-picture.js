// ── PROFILE PICTURES ──
// Uses Supabase Storage bucket "avatars" (public).
// Requires profile-picture-migration.sql to be run first.
// The app feature-detects the bucket so it's safe to deploy
// the JS before the SQL — it'll just skip avatar UI.

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Cache of avatar URLs by player_name
let avatarCache = {};

// Whether the avatars bucket exists (feature-detected at startup)
let avatarsEnabled = false;

async function checkAvatarsEnabled() {
  if (!currentSession) { avatarsEnabled = false; return false; }
  try {
    const { data, error } = await sb.storage.getBucket(AVATAR_BUCKET);
    avatarsEnabled = !error && !!data;
  } catch {
    avatarsEnabled = false;
  }
  return avatarsEnabled;
}

// ── UPLOAD ───────────────────────────────

async function uploadAvatar(file) {
  if (!currentSession) throw new Error('Not signed in');

  // Validate type
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed.');
  }

  // Validate size
  if (file.size > AVATAR_MAX_SIZE) {
    throw new Error('Image must be under 5 MB.');
  }

  const userId = currentSession.user.id;
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const path = userId + '/avatar.' + ext;

  // Remove any existing avatar files for this user (ignore errors)
  try {
    const { data: existing } = await sb.storage.from(AVATAR_BUCKET).list(userId);
    if (existing && existing.length > 0) {
      const oldPaths = existing.map(f => userId + '/' + f.name);
      await sb.storage.from(AVATAR_BUCKET).remove(oldPaths);
    }
  } catch (_) { /* bucket might not exist yet */ }

  // Upload new avatar
  const { error: uploadErr } = await sb.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadErr) throw new Error(uploadErr.message);

  // Get public URL
  const { data: urlData } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Update player_profiles
  const { error: updateErr } = await sb.from('player_profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateErr) throw new Error(updateErr.message);

  // Update local cache + current profile
  if (currentProfile) {
    avatarCache[currentProfile.player_name] = publicUrl;
    currentProfile.avatar_url = publicUrl;
  }

  return publicUrl;
}

// ── RETRIEVE ─────────────────────────────

async function getAvatarUrl(playerName) {
  if (playerName in avatarCache) return avatarCache[playerName];

  const { data: prof } = await sb.from('player_profiles')
    .select('avatar_url')
    .eq('player_name', playerName)
    .single();

  const url = prof?.avatar_url || null;
  avatarCache[playerName] = url;
  return url;
}

// ── REMOVE ───────────────────────────────

async function removeAvatar() {
  if (!currentSession) throw new Error('Not signed in');

  const userId = currentSession.user.id;

  // Delete from storage
  try {
    const { data: existing } = await sb.storage.from(AVATAR_BUCKET).list(userId);
    if (existing && existing.length > 0) {
      const paths = existing.map(f => userId + '/' + f.name);
      await sb.storage.from(AVATAR_BUCKET).remove(paths);
    }
  } catch (_) {}

  // Clear URL in profile
  const { error } = await sb.from('player_profiles')
    .update({ avatar_url: null })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  if (currentProfile) {
    avatarCache[currentProfile.player_name] = null;
    currentProfile.avatar_url = null;
  }
}

// ── RENDER HELPERS ───────────────────────

// Combined avatar <img> with coloured-initials fallback.
// When the avatar URL is known and loads, shows the image; on error
// or when no avatar is set, shows the initials circle.
function avatarHtml(playerName, size) {
  size = size || 32;
  var url = avatarCache[playerName];
  var initials = playerName.charAt(0).toUpperCase();
  var hex = (ownerHexColors[playerName]) || '#888';

  if (url) {
    return '<span class="avatar-wrap" style="display:inline-flex;width:' + size + 'px;height:' + size + 'px;flex-shrink:0">' +
      '<img src="' + url + '" alt="" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover"' +
      ' onerror="var s=this.nextElementSibling;this.style.display=\'none\';s.style.display=\'flex\'">' +
      '<span style="display:none;width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
      'background:' + hex + ';color:#fff;align-items:center;justify-content:center;' +
      'font-weight:700;font-size:' + Math.round(size * 0.45) + 'px">' + initials + '</span>' +
      '</span>';
  }
  return '<span style="display:inline-flex;width:' + size + 'px;height:' + size + 'px;border-radius:50%;flex-shrink:0;' +
    'background:' + hex + ';color:#fff;align-items:center;justify-content:center;' +
    'font-weight:700;font-size:' + Math.round(size * 0.45) + 'px">' + initials + '</span>';
}

// Preload avatars for a list of player names (one query, not N)
async function preloadAvatars(playerNames) {
  var toFetch = [];
  for (var i = 0; i < playerNames.length; i++) {
    if (!(playerNames[i] in avatarCache)) toFetch.push(playerNames[i]);
  }
  if (!toFetch.length) return;

  var { data: profs } = await sb.from('player_profiles')
    .select('player_name, avatar_url')
    .in('player_name', toFetch);

  if (profs) {
    for (var j = 0; j < profs.length; j++) {
      avatarCache[profs[j].player_name] = profs[j].avatar_url || null;
    }
  }
  // Fill remaining as null so we don't re-fetch
  for (var k = 0; k < toFetch.length; k++) {
    if (!(toFetch[k] in avatarCache)) avatarCache[toFetch[k]] = null;
  }
}
