let adminTab = 'users';

(async function init() {
  await renderLayout('admin');
  await loadStats();
  await loadPanel();

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      adminTab = tab.dataset.panel;
      loadPanel();
    });
  });
})();

async function loadStats() {
  try {
    const s = await api('/admin/stats');
    const cards = [
      { label: 'Total Users', value: s.userCount, icon: '&#128101;' },
      { label: 'Skills Listed', value: s.skillCount, icon: '&#127919;' },
      { label: 'Exchange Requests', value: s.requestCount, icon: '&#8646;' },
      { label: 'Completed', value: s.completedCount, icon: '&#9989;' },
      { label: 'Sessions', value: s.sessionCount, icon: '&#128197;' },
      { label: 'Reviews', value: s.reviewCount, icon: '&#11088;' }
    ];
    document.getElementById('admin-stats').innerHTML = cards.map(c => `
      <div class="card stat-card">
        <div class="icon">${c.icon}</div>
        <div class="label">${c.label}</div>
        <div class="value">${c.value}</div>
      </div>`).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadPanel() {
  const content = document.getElementById('admin-panel-content');
  content.innerHTML = `<div class="loading">Loading...</div>`;

  try {
    if (adminTab === 'users') {
      const users = await api('/admin/users');
      content.innerHTML = `
        <div class="table-responsive">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Rating</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${u.role}</td>
                <td>${u.review_count ? `${u.avg_rating} &#9733; (${u.review_count})` : '—'}</td>
                <td><span class="status-pill ${u.status === 'active' ? 'status-accepted' : 'status-rejected'}">${u.status}</span></td>
                <td>${timeAgo(u.created_at)}</td>
                <td class="flex gap-8">
                  ${u.role !== 'admin' ? `
                    <button class="btn btn-sm btn-outline" onclick="toggleStatus(${u.id}, '${u.status === 'active' ? 'suspended' : 'active'}')">
                      ${u.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        </div>`;
    } else if (adminTab === 'skills') {
      const skills = await api('/admin/skills');
      content.innerHTML = `
        <div class="table-responsive">
        <table>
          <thead><tr><th>Title</th><th>Owner</th><th>Category</th><th>Level</th><th>Posted</th><th></th></tr></thead>
          <tbody>
            ${skills.map(s => `
              <tr>
                <td>${escapeHtml(s.title)}</td>
                <td>${escapeHtml(s.owner_name)}</td>
                <td>${escapeHtml(s.category_name)}</td>
                <td>${escapeHtml(s.level)}</td>
                <td>${timeAgo(s.created_at)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteSkillAdmin(${s.id})">Remove</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        </div>`;
    } else if (adminTab === 'requests') {
      const reqs = await api('/admin/requests');
      content.innerHTML = `
        <div class="table-responsive">
        <table>
          <thead><tr><th>Skill</th><th>Requester</th><th>Provider</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${reqs.map(r => `
              <tr>
                <td>${escapeHtml(r.skill_title)}</td>
                <td>${escapeHtml(r.requester_name)}</td>
                <td>${escapeHtml(r.provider_name)}</td>
                <td><span class="status-pill status-${r.status}">${r.status}</span></td>
                <td>${timeAgo(r.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        </div>`;
    } else if (adminTab === 'sessions') {
      const sessions = await api('/admin/sessions');
      content.innerHTML = `
        <div class="table-responsive">
        <table>
          <thead><tr><th>Skill</th><th>Provider</th><th>Requester</th><th>Status</th><th>Scheduled At</th><th>Duration</th></tr></thead>
          <tbody>
            ${sessions.map(s => `
              <tr>
                <td>${escapeHtml(s.skill_title)}</td>
                <td>${escapeHtml(s.provider_name)}</td>
                <td>${escapeHtml(s.requester_name)}</td>
                <td><span class="status-pill status-${s.status}">${s.status}</span></td>
                <td>${new Date(s.scheduled_at).toLocaleString()}</td>
                <td>${s.duration_minutes} mins</td>
              </tr>`).join('')}
          </tbody>
        </table>
        </div>`;
    } else if (adminTab === 'reviews') {
      const reviews = await api('/admin/reviews');
      content.innerHTML = `
        <div class="table-responsive">
        <table>
          <thead><tr><th>Reviewer</th><th>Reviewee</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead>
          <tbody>
            ${reviews.map(r => `
              <tr>
                <td>${escapeHtml(r.reviewer_name)}</td>
                <td>${escapeHtml(r.reviewee_name)}</td>
                <td>${r.rating} &#9733;</td>
                <td>${escapeHtml(r.comment || '—')}</td>
                <td>${timeAgo(r.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        </div>`;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleStatus(id, status) {
  try {
    await api(`/admin/users/${id}/status`, { method: 'PUT', body: { status } });
    showToast(`User ${status}`, 'success');
    loadPanel();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Permanently delete this user?')) return;
  try {
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    showToast('User deleted', 'success');
    loadPanel();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteSkillAdmin(id) {
  if (!confirm('Remove this skill listing?')) return;
  try {
    await api(`/admin/skills/${id}`, { method: 'DELETE' });
    showToast('Skill removed', 'success');
    loadPanel();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
