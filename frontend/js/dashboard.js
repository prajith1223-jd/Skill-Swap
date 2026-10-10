(async function init() {
  const user = getCurrentUser();
  if (sessionStorage.getItem('skillswap_new_user') === 'true') {
    document.getElementById('greeting').textContent = `Welcome, ${user.name.split(' ')[0]}!`;
    sessionStorage.removeItem('skillswap_new_user');
  } else {
    document.getElementById('greeting').textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
  }

  await renderLayout('dashboard');
  connectSocket();

  try {
    const data = await api('/users/me/dashboard');

    const stats = [
      { label: 'Skills Offered', value: data.skillCount, icon: '&#127919;' },
      { label: 'Pending Requests', value: data.pendingRequests, icon: '&#8646;' },
      { label: 'Upcoming Sessions', value: data.upcomingSessions, icon: '&#128197;' },
      { label: 'Avg. Rating', value: data.reviewCount ? `${data.avgRating} &#9733;` : '—', icon: '&#11088;' }
    ];

    document.getElementById('stats-grid').innerHTML = stats.map(s => `
      <div class="card stat-card">
        <div class="icon">${s.icon}</div>
        <div class="label">${s.label}</div>
        <div class="value">${s.value}</div>
      </div>
    `).join('');

    const list = document.getElementById('recent-requests');
    if (!data.recentRequests.length) {
      list.innerHTML = `<div class="empty-hint"><div class="big">&#128172;</div>No requests yet. Browse skills to get started!</div>`;
    } else {
      list.innerHTML = `
        <div class="table-responsive">
        <table>
          <thead><tr><th>Skill</th><th>Between</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${data.recentRequests.map(r => `
              <tr>
                <td>${escapeHtml(r.skill_title)}</td>
                <td>${escapeHtml(r.requester_name)} &rarr; ${escapeHtml(r.provider_name)}</td>
                <td><span class="status-pill status-${r.status}">${r.status}</span></td>
                <td>${timeAgo(r.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>`;
    }
    
    const matchesList = document.getElementById('recommended-matches');
    if (!data.recommendedMatches || !data.recommendedMatches.length) {
      matchesList.innerHTML = `<div class="empty-hint">No matches found right now.</div>`;
    } else {
      matchesList.innerHTML = `
        <div class="flex-col gap-12">
          ${data.recommendedMatches.map(m => `
            <div class="flex items-center gap-12 p-12 border rounded-10" style="border: 1px solid var(--border);">
              <img src="${m.provider_avatar || 'https://i.pravatar.cc/150'}" style="width: 40px; height: 40px; border-radius: 50%;">
              <div class="flex-1">
                <div style="font-weight: 600; font-size: 14px;">${escapeHtml(m.title)}</div>
                <div class="text-muted" style="font-size: 12px;">By ${escapeHtml(m.provider_name)} • ${escapeHtml(m.level)}</div>
              </div>
              <button class="btn btn-sm" onclick="location.href='browse-skills.html?q=${encodeURIComponent(m.title)}'">View</button>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
})();
