const reqUser = getCurrentUser();
let activeTab = 'incoming';

(async function init() {
  await renderLayout('requests');
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.type;
      loadRequests();
    });
  });
  loadRequests();
})();

async function loadRequests() {
  const list = document.getElementById('requests-list');
  list.innerHTML = `<div class="loading">Loading requests...</div>`;
  try {
    const rows = await api(`/requests?type=${activeTab}`);
    if (!rows.length) {
      list.innerHTML = `<div class="empty-hint"><div class="big">&#8646;</div>No ${activeTab} requests yet.</div>`;
      return;
    }
    list.innerHTML = `
      <div class="table-responsive">
      <table>
        <thead><tr><th>Skill</th><th>${activeTab === 'incoming' ? 'From' : 'To'}</th><th>Message</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>${rows.map(r => renderRow(r)).join('')}</tbody>
      </table>
      </div>`;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderRow(r) {
  const otherName = activeTab === 'incoming' ? r.requester_name : r.provider_name;
  const otherAvatar = activeTab === 'incoming' ? r.requester_avatar : r.provider_avatar;
  let actions = '';

  if (activeTab === 'incoming' && r.status === 'pending') {
    if (!r.offered_coin && r.requester_skills && r.requester_skills.length > 0) {
      const options = r.requester_skills.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('');
      actions = `
        <div style="margin-bottom: 8px;">
          <select id="accept-skill-${r.id}" style="width:100%; padding:4px; font-size:12px; border-radius:4px;">
            <option value="" disabled selected>Select skill to learn...</option>
            ${options}
          </select>
        </div>
        <button class="btn btn-sm" onclick="acceptTrade('${r.id}')">Accept</button>
        <button class="btn btn-sm btn-danger" onclick="setStatus('${r.id}', 'rejected')">Reject</button>`;
    } else {
      actions = `
        <button class="btn btn-sm" onclick="setStatus('${r.id}', 'accepted')">Accept</button>
        <button class="btn btn-sm btn-danger" onclick="setStatus('${r.id}', 'rejected')">Reject</button>`;
    }
  } else if (r.status === 'accepted' && activeTab === 'incoming') {
    actions = `<button class="btn btn-sm btn-outline" onclick="setStatus('${r.id}', 'completed')">Mark Completed</button>`;
  } else if (r.status === 'pending' && activeTab === 'outgoing') {
    actions = `<button class="btn btn-sm btn-ghost" onclick="setStatus('${r.id}', 'cancelled')">Cancel</button>`;
  }
  
  const otherUserId = activeTab === 'incoming' ? (r.requester_id._id || r.requester_id) : (r.provider_id._id || r.provider_id);
  actions += `<button class="btn btn-sm btn-outline" style="margin-top:4px;" onclick="location.href='messages.html?userId=${otherUserId}&name=${encodeURIComponent(otherName)}&avatar=${encodeURIComponent(otherAvatar || '')}'">Message</button>`;

  return `
    <tr>
      <td><strong>${escapeHtml(r.skill_title)}</strong><br><span class="text-muted" style="font-size:12px;">${escapeHtml(r.level)}</span></td>
      <td class="flex items-center gap-8"><img src="${otherAvatar || 'https://i.pravatar.cc/150'}" style="width:28px;height:28px;border-radius:50%;"> ${escapeHtml(otherName)}</td>
      <td style="max-width:220px;">
        ${r.offered_coin ? '<span class="tag" style="background:#fff3cd;color:#856404;border-color:#ffeeba;display:inline-block;margin-bottom:4px;">🪙 1 Coin</span><br>' : ''}
        ${r.offered_skill_title ? `<span class="tag" style="background:#e0e7ff;color:#3730a3;border-color:#c7d2fe;display:inline-block;margin-bottom:4px;">🔄 Trade: ${escapeHtml(r.offered_skill_title)}</span><br>` : ''}
        ${escapeHtml(r.message || '—')}
      </td>
      <td><span class="status-pill status-${r.status}">${r.status}</span></td>
      <td>${timeAgo(r.created_at)}</td>
      <td class="flex flex-col gap-4">${actions}</td>
    </tr>`;
}

async function acceptTrade(id) {
  const select = document.getElementById(`accept-skill-${id}`);
  if (!select.value) {
    showToast('Please select a skill to learn from this user.', 'error');
    return;
  }
  await setStatus(id, 'accepted', select.value);
}

async function setStatus(id, status, offered_skill_id = null) {
  let body = { status };
  if (offered_skill_id) {
    body.offered_skill_id = offered_skill_id;
  }
  
  if (status === 'accepted') {
    const rawDate = prompt('Enter meeting date/time (YYYY-MM-DD HH:MM), or leave blank for +24 hours:');
    if (rawDate === null) return; // User cancelled
    
    if (rawDate.trim()) {
      const dt = new Date(rawDate);
      if (!isNaN(dt.getTime())) {
        body.scheduled_at = dt.toISOString();
      } else {
        alert('Invalid date format. Using default +24 hours.');
      }
    }
  }

  try {
    await api(`/requests/${id}/status`, { method: 'PUT', body });
    
    let undoCallback = null;
    let oldStatus = 'pending';
    if (status === 'completed') oldStatus = 'accepted';
    else if (status === 'cancelled' || status === 'accepted' || status === 'rejected') oldStatus = 'pending';

    undoCallback = async () => {
      try {
        await api(`/requests/${id}/status`, { method: 'PUT', body: { status: oldStatus } });
        showToast(`Undo successful`, 'success');
        loadRequests();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };

    showToast(`Request ${status}`, 'success', undoCallback);
    loadRequests();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
