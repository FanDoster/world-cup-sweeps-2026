let currentSession = null;
let currentProfile = null;

async function restoreSession() {
  // getUser() checks stored token + validates with server
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: { session } } = await sb.auth.getSession();
    currentSession = session;
    const { data: profile } = await sb.from('player_profiles').select('player_name, avatar_url').eq('id', user.id).single();
    if (profile) { currentProfile = profile; avatarCache[profile.player_name] = profile.avatar_url || null; }
  }
  updateAuthBar();
  if (currentSession) showJokerNotification();
}

function updateAuthBar() {
  const bar = document.getElementById('authBar');
  const tabBar = document.getElementById('tabBar');
  // Remove existing auth tabs
  tabBar.querySelectorAll('.auth-tab').forEach(el => el.remove());

  if (currentSession && currentProfile) {
    bar.innerHTML = `<a class="signed-in-link" onclick="showUserProfile('${currentProfile.player_name}')"><span class="signed-in"><span class="avatar-auth">${avatarHtml(currentProfile.player_name, 24)}</span> ${currentProfile.player_name}</span></a>
      <button class="sign-out-btn" onclick="doSignOut()">Sign out</button>`;
    // Inject logged-in tabs
    tabBar.insertAdjacentHTML('beforeend', `<button class="tab-btn auth-tab" data-tab="myteams" onclick="switchTab('myteams')"><span class="emoji">⭐</span><span class="tab-label"> My Teams</span></button>`);
    tabBar.insertAdjacentHTML('beforeend', `<button class="tab-btn auth-tab" data-tab="predictions" onclick="switchTab('predictions')"><span class="emoji">🔮</span><span class="tab-label"> Predictions</span></button>`);
  } else {
    bar.innerHTML = `<button onclick="showSignIn()">Sign in</button>
      <button onclick="showSignUp()">Create account</button>`;
  }
}

function showSignIn() { closeModals(); document.getElementById('signInModal').classList.add('active'); }
function showSignUp() { closeModals(); document.getElementById('signUpModal').classList.add('active'); }
function closeModals() { document.querySelectorAll('.auth-modal-overlay').forEach(el => el.classList.remove('active')); }

function showJokerNotification() {
  if (localStorage.getItem('jokerResetDismissed')) return;
  document.getElementById('jokerResetModal').classList.add('active');
}
function dismissJokerNotification() {
  localStorage.setItem('jokerResetDismissed', '1');
  document.getElementById('jokerResetModal').classList.remove('active');
}

async function doSignIn() {
  const email = document.getElementById('signInEmail').value;
  const password = document.getElementById('signInPassword').value;
  const errEl = document.getElementById('signInError');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  currentSession = data.session;
  const { data: profile } = await sb.from('player_profiles').select('player_name, avatar_url').eq('id', data.user.id).single();
  currentProfile = profile;
  if (profile) avatarCache[profile.player_name] = profile.avatar_url || null;
  closeModals();
  updateAuthBar();
  showJokerNotification();
  loadData().then(() => { renderWarDispatch(); checkTeamResults(); });
}

async function doSignUp() {
  const playerName = document.getElementById('signUpPlayer').value;
  const email = document.getElementById('signUpEmail').value;
  const password = document.getElementById('signUpPassword').value;
  const code = document.getElementById('signUpCode').value;
  const errEl = document.getElementById('signUpError');
  errEl.style.display = 'none';

  if (!playerName) { errEl.textContent = 'Pick your sweepstakes name.'; errEl.style.display = 'block'; return; }
  if (password.length < 6) { errEl.textContent = 'Password needs 6+ characters.'; errEl.style.display = 'block'; return; }

  // Validate invite code server-side
  const { data: valid } = await sb.rpc('validate_invite_code', { code });
  if (!valid) { errEl.textContent = 'Wrong invite code.'; errEl.style.display = 'block'; return; }

  // Name already claimed? Check before creating the auth user so a
  // failed profile insert doesn't leave an orphaned account.
  const { data: taken } = await sb.from('player_profiles').select('id').eq('player_name', playerName).limit(1);
  if (taken && taken.length) { errEl.textContent = `${playerName} is already registered — try signing in instead.`; errEl.style.display = 'block'; return; }

  // Create auth user
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }

  // Create player profile
  const { error: profileErr } = await sb.from('player_profiles').insert({
    id: data.user.id, player_name: playerName
  });
  if (profileErr) {
    errEl.textContent = profileErr.code === '23505'
      ? `${playerName} is already registered — try signing in instead.`
      : profileErr.message;
    errEl.style.display = 'block';
    return;
  }

  currentSession = data.session;
  currentProfile = { player_name: playerName };
  closeModals();
  updateAuthBar();
  showJokerNotification();
  loadData().then(() => { renderWarDispatch(); checkTeamResults(); });
}

async function doSignOut() {
  await sb.auth.signOut();
  currentSession = null;
  currentProfile = null;
  updateAuthBar();
}
