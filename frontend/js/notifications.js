const NOTIF_ICONS = {
  request: '&#8646;',
  request_update: '&#9989;',
  message: '&#128172;',
  review: '&#11088;',
  default: '&#128276;'
};

(async function init() {
  await renderLayout('notifications');
  const socket = connectSocket();
  await loadNotifications();

  if (socket) socket.on('new_notification', loadNotifications);
})();

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  try {
    const notifs = await api('/notifications');
    if (!notifs.length) {
      list.innerHTML = `<div class="empty-hint"><div class="big">&#128276;</div>You're all caught up!</div>`;
      return;
    }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="openNotif(${n.id}, ${JSON.stringify(n.link || '')})">
        <div class="notif-icon">${NOTIF_ICONS[n.type] || NOTIF_ICONS.default}</div>
        <div class="content">
          <div>${escapeHtml(n.content)}</div>
          <div class="time">${timeAgo(n.created_at)}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openNotif(id, link) {
  try { await api(`/notifications/${id}/read`, { method: 'PUT' }); } catch (e) { /* ignore */ }
  if (link) location.href = link.split('/').pop();
  else loadNotifications();
}

async function markAllRead() {
  try {
    await api('/notifications/read-all', { method: 'PUT' });
    loadNotifications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
