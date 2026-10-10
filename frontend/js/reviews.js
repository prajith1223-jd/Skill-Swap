const revUser = getCurrentUser();
let reviewsTab = 'received';

(async function init() {
  await renderLayout('reviews');
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      reviewsTab = tab.dataset.type;
      loadReviews();
    });
  });
  loadReviews();
})();

async function loadReviews() {
  const list = document.getElementById('reviews-list');
  list.innerHTML = `<div class="loading">Loading reviews...</div>`;
  try {
    const rows = reviewsTab === 'received'
      ? await api(`/reviews/${revUser.id}`)
      : await api('/reviews/me');

    if (!rows.length) {
      list.innerHTML = `<div class="empty-hint" style="grid-column:1/-1;"><div class="big">&#11088;</div>No reviews ${reviewsTab === 'received' ? 'received' : 'given'} yet.</div>`;
      return;
    }

    list.innerHTML = rows.map(r => `
      <div class="card">
        <div class="flex items-center gap-12">
          ${reviewsTab === 'received'
            ? `<img src="${r.reviewer_avatar || 'https://i.pravatar.cc/150'}" style="width:40px;height:40px;border-radius:50%;">`
            : `<div class="notif-icon">&#11088;</div>`}
          <div>
            <div style="font-weight:700;">${escapeHtml(reviewsTab === 'received' ? r.reviewer_name : r.reviewee_name)}</div>
            <div class="stars">${starHtml(r.rating)}</div>
          </div>
        </div>
        <p class="text-muted mt-16" style="font-size:14px;">${escapeHtml(r.comment || 'No comment left.')}</p>
        <div class="text-muted" style="font-size:12px;">${timeAgo(r.created_at)}</div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
