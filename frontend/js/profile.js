const profUser = getCurrentUser();

(async function init() {
  await renderLayout('profile');
  await loadProfile();

  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  document.getElementById('password-form').addEventListener('submit', savePassword);
  
  // Live preview for avatar upload
  document.getElementById('edit-avatar-file').addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        document.getElementById('profile-avatar').src = evt.target.result;
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });
})();

async function loadProfile() {
  try {
    const data = await api(`/users/${profUser.id}`);

    document.getElementById('profile-avatar').src = data.avatar_url || 'https://i.pravatar.cc/150';
    document.getElementById('profile-name').textContent = data.name;
    document.getElementById('profile-email').textContent = data.email;
    document.getElementById('profile-rating').innerHTML = data.review_count
      ? `<span class="stars">${starHtml(data.avg_rating)}</span> <span class="text-muted">${data.avg_rating} (${data.review_count} reviews)</span>`
      : `<span class="text-muted">No reviews yet</span>`;
    const socialsDiv = document.getElementById('profile-socials');
    let socialsHtml = '';
    if (data.gmail) socialsHtml += `<a href="mailto:${escapeHtml(data.gmail)}" title="Gmail" style="color:var(--text);text-decoration:none;">📧</a>`;
    if (data.github_url) socialsHtml += `<a href="${escapeHtml(data.github_url)}" target="_blank" title="GitHub" style="color:var(--text);text-decoration:none;">💻</a>`;
    if (data.linkedin_url) socialsHtml += `<a href="${escapeHtml(data.linkedin_url)}" target="_blank" title="LinkedIn" style="color:var(--text);text-decoration:none;">💼</a>`;
    socialsDiv.innerHTML = socialsHtml;

    document.getElementById('profile-badges').innerHTML = data.badges.length
      ? data.badges.map(b => `<span class="tag" title="${escapeHtml(b.description || '')}">${b.icon} ${escapeHtml(b.name)}</span>`).join('')
      : `<span class="text-muted" style="font-size:13px;">No badges yet</span>`;

    document.getElementById('edit-name').value = data.name;
    document.getElementById('edit-bio').value = data.bio || '';
    document.getElementById('edit-gmail').value = data.gmail || '';
    document.getElementById('edit-github').value = data.github_url || '';
    document.getElementById('edit-linkedin').value = data.linkedin_url || '';

    const skillsGrid = document.getElementById('my-skills');
    skillsGrid.innerHTML = data.skills.length
      ? data.skills.map(s => `
          <div class="card skill-card">
            <div class="top-row">
              <h3 style="margin:0;">${escapeHtml(s.title)}</h3>
              <button class="bookmark-btn" title="Remove" onclick="removeSkill(${s.id})">&#128465;</button>
            </div>
            <p class="text-muted" style="margin:0; font-size:13.5px;">${escapeHtml(s.description || '')}</p>
            <span class="level-badge" style="align-self:flex-start;">${escapeHtml(s.level)}</span>
          </div>`).join('')
      : `<div class="empty-hint" style="grid-column:1/-1;">You haven't offered any skills yet. <a href="browse-skills.html" style="color:var(--accent); font-weight:700;">Offer one now</a>.</div>`;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveProfile(e) {
  e.preventDefault();
  try {
    let oldProfile = null;
    try { oldProfile = await api('/users/me'); } catch(e){}

    const updateBody = {
      name: document.getElementById('edit-name').value.trim(),
      bio: document.getElementById('edit-bio').value.trim(),
      gmail: document.getElementById('edit-gmail').value.trim(),
      github_url: document.getElementById('edit-github').value.trim(),
      linkedin_url: document.getElementById('edit-linkedin').value.trim()
    };

    // If file is selected, upload it first
    const avatarFile = document.getElementById('edit-avatar-file').files[0];
    let newAvatarUrl = null;
    if (avatarFile) {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await api('/users/me/avatar', { method: 'POST', body: formData });
      newAvatarUrl = res.avatar_url;
      updateBody.avatar_url = newAvatarUrl;
    }

    await api('/users/me', {
      method: 'PUT',
      body: updateBody
    });

    const stored = getCurrentUser();
    stored.name = updateBody.name;
    if (newAvatarUrl) stored.avatar_url = newAvatarUrl;
    sessionStorage.setItem('skillswap_user', JSON.stringify(stored));

    // Clear file input
    document.getElementById('edit-avatar-file').value = '';

    let undoCallback = null;
    if (oldProfile) {
      undoCallback = async () => {
        try {
          await api('/users/me', { method: 'PUT', body: oldProfile });
          stored.name = oldProfile.name;
          stored.avatar_url = oldProfile.avatar_url;
          sessionStorage.setItem('skillswap_user', JSON.stringify(stored));
          showToast('Profile restored', 'success');
          loadProfile();
          renderLayout('profile');
        } catch (e) {}
      };
    }

    showToast('Profile updated!', 'success', undoCallback);
    loadProfile();
    renderLayout('profile');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function savePassword(e) {
  e.preventDefault();
  try {
    await api('/users/me/password', {
      method: 'PUT',
      body: {
        currentPassword: document.getElementById('current-password').value,
        newPassword: document.getElementById('new-password').value
      }
    });
    showToast('Password updated!', 'success');
    document.getElementById('password-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeSkill(id) {
  if (!confirm('Remove this skill from your profile?')) return;
  try {
    await api(`/skills/${id}`, { method: 'DELETE' });
    showToast('Skill removed', 'success');
    loadProfile();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
