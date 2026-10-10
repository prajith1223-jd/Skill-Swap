const sesUser = getCurrentUser();
let selectedRating = 0;
let reviewTargetUserId = null;
let reviewSessionId = null;
let scheduleSessionId = null;
let allSessions = [];
let currentFilter = 'all';

(async function init() {
  await renderLayout('sessions');
  await loadSessions();

  document.querySelectorAll('#star-picker span').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = Number(star.dataset.v);
      document.querySelectorAll('#star-picker span').forEach(s => {
        s.classList.toggle('active', Number(s.dataset.v) <= selectedRating);
      });
    });
  });
  document.getElementById('review-form').addEventListener('submit', submitReview);

  // Refresh countdown every minute
  setInterval(refreshCountdowns, 60000);
})();

// ── Load sessions ──────────────────────────────────────────────────────────
async function loadSessions() {
  const grid = document.getElementById('sessions-grid');
  try {
    const sessions = await api('/sessions');
    if (!sessions.length) {
      grid.innerHTML = `<div class="empty-hint" style="grid-column:1/-1;"><div class="big">&#128197;</div>No sessions scheduled yet. Accept an exchange request to get started!</div>`;
      return;
    }
    grid.innerHTML = sessions.map(renderSessionCard).join('');
    allSessions = await api('/sessions');
    renderGrid();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderGrid() {
  const grid = document.getElementById('sessions-grid');
  const filtered = currentFilter === 'all'
    ? allSessions
    : allSessions.filter(s => s.status === currentFilter);

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-hint" style="grid-column:1/-1;">
      <div class="big">📅</div>
      ${currentFilter === 'all'
        ? 'No sessions yet. Accept an exchange request to get started!'
        : `No ${currentFilter} sessions.`}
    </div>`;
    return;
  }
  grid.innerHTML = filtered.map(renderSessionCard).join('');
}

function filterSessions(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderGrid();
}

// ── Render one session card ────────────────────────────────────────────────
function renderSessionCard(s) {
  const other = s.requester_id?.toString() === sesUser.id?.toString()
    ? { name: s.provider_name,   avatar: s.provider_avatar,   id: s.provider_id }
    : { name: s.requester_name,  avatar: s.requester_avatar,  id: s.requester_id };

  const date    = new Date(s.scheduled_at);
  const dateStr = date.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });

  // Countdown
  const countdownHtml = s.status === 'upcoming' ? buildCountdown(date, s._id) : '';

  // Meet panel
  const meetHtml = buildMeetPanel(s);

  // Action buttons
  let actions = '';
  const isRequester = s.requester_id?.toString() === sesUser.id?.toString();
  const isProvider = s.provider_id?.toString() === sesUser.id?.toString();

  if (s.status === 'upcoming') {
    if (isProvider) {
      actions = `
        <button class="btn btn-sm btn-outline" onclick="markSession('${s._id}','pending_completion')">✅ Mark Completed</button>
        <button class="btn btn-sm btn-ghost" onclick="openScheduleModal('${s._id}','${escapeHtml(other.name || '')}')">📅 Reschedule</button>
        <button class="btn btn-sm btn-ghost" onclick="markSession('${s._id}','cancelled')">Cancel</button>`;
    } else {
      actions = `
        <button class="btn btn-sm btn-outline" onclick="markSession('${s._id}','pending_completion')">✅ Mark Completed</button>
        <button class="btn btn-sm btn-ghost" onclick="openScheduleModal('${s._id}','${escapeHtml(other.name || '')}')">📅 Reschedule</button>
        <button class="btn btn-sm btn-ghost" onclick="markSession('${s._id}','cancelled')">Cancel</button>`;
    }
  } else if (s.status === 'pending_completion') {
    if (isRequester) {
      actions = `
        <div style="width: 100%; margin-bottom: 8px; font-size: 13px; color: var(--accent); font-weight:600;">The teacher marked this session as complete. Is this true?</div>
        <button class="btn btn-sm" style="background:var(--accent);color:white" onclick="markSession('${s._id}','completed')">✅ Yes, Confirm</button>
      `;
    } else {
      actions = `
        <div style="font-size: 13px; color: var(--text-muted); font-style:italic;">Waiting for learner to confirm completion...</div>
      `;
    }
  } else if (s.status === 'completed') {
    actions = `<button class="btn btn-sm" onclick='openReviewModal("${other.id}","${s._id}","${escapeHtml(other.name || '')}")'>⭐ Leave Review</button>`;
  }

  return `
    <div class="card" id="sess-${s._id}">
      <!-- Header -->
      <div class="flex items-center gap-12" style="margin-bottom:12px">
        <img src="${other.avatar || 'https://i.pravatar.cc/150'}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;">
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px">${escapeHtml(other.name || 'Unknown')}</div>
          <div class="text-muted" style="font-size:12.5px">🎯 ${escapeHtml(s.skill_title || '')}</div>
        </div>
        <span class="status-pill status-${s.status}">${s.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
      </div>

      <!-- Date / time / duration -->
      <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:10px">
        <div style="font-weight:600;font-size:14px">📆 ${dateStr}</div>
        <div class="text-muted" style="font-size:12.5px;margin-top:2px">🕐 ${timeStr} &middot; ${s.duration_minutes} min</div>
        ${s.notes ? `<div style="font-size:12.5px;color:var(--text-muted);margin-top:4px">📝 ${escapeHtml(s.notes)}</div>` : ''}
      </div>

      <!-- Countdown -->
      ${countdownHtml}

      <!-- Google Meet / Jitsi panel -->
      ${meetHtml}

      <!-- Action buttons -->
      <div class="flex gap-8 mt-16" style="flex-wrap:wrap">${actions}</div>
    </div>`;
}

// ── Countdown chip ─────────────────────────────────────────────────────────
function buildCountdown(date, sessionId) {
  const now = Date.now();
  const diff = date.getTime() - now;
  const mins = Math.floor(diff / 60000);

  let cls = 'countdown-chip', label = '';
  if (diff < 0) {
    return '';
  } else if (mins <= 10) {
    cls += ' live'; label = '🔴 Starting now!';
  } else if (mins <= 60) {
    cls += ' soon'; label = `⏰ In ${mins} minutes`;
  } else if (mins < 1440) {
    const h = Math.floor(mins/60), m = mins%60;
    label = `⏰ In ${h}h ${m > 0 ? m+'m' : ''}`.trim();
  } else {
    const d = Math.floor(mins/1440);
    label = `📅 In ${d} day${d > 1 ? 's' : ''}`;
  }
  return `<div class="${cls}" style="margin-bottom:10px" id="cd-${sessionId}">${label}</div>`;
}

// ── Jitsi Video Call panel ──────────────────────────────────────────────────────
function buildMeetPanel(s) {
  if (s.status === 'cancelled' || s.status === 'completed') return '';

  if (s.meet_link) {
    // Extract room name from meet_link: https://meet.jit.si/ROOM_NAME
    const roomName = s.meet_link.split('/').pop();
    
    const calBtn = s.calendar_link
      ? `<a class="btn-gcal" href="${s.calendar_link}" target="_blank">
           <img src="https://www.svgrepo.com/show/475658/google-calendar-color.svg" style="width:16px;height:16px"> Add to Calendar
         </a>`
      : '';
    return `
      <div class="meet-panel">
        <div class="meet-title">
          <span style="font-size:18px">📹</span> Video Call Ready
        </div>
        <div class="flex gap-8" style="flex-wrap:wrap">
          <button class="btn-meet" onclick="openJitsi('${roomName}')">
            Join Video Call
          </button>
          ${calBtn}
          <button class="btn-gen-meet" onclick="copyMeetLink('${s.meet_link}')">📋 Copy Link</button>
        </div>
      </div>`;
  }

  // No meet link yet
  return `
    <div class="meet-panel" style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-color:var(--border)">
      <div class="meet-title" style="color:var(--text-muted)">
        <span style="font-size:18px;opacity:.4">📹</span> No video link yet
      </div>
      <button class="btn-meet" style="background:var(--accent)" onclick="generateMeet('${s._id}')">
        + Generate Video Link
      </button>
    </div>`;
}

// ── Generate / Regenerate Meet link ───────────────────────────────────────
async function generateMeet(sessionId) {
  try {
    const data = await api(`/sessions/${sessionId}/generate-meet`, { method: 'POST' });
    showToast('🎉 Video call link created!', 'success');
    // Update card in-place
    const idx = allSessions.findIndex(s => s._id === sessionId);
    if (idx !== -1) {
      allSessions[idx].meet_link     = data.meet_link;
      allSessions[idx].meet_code     = data.meet_code;
      allSessions[idx].calendar_link = data.calendar_link;
    }
    renderGrid();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function regenerateMeet(sessionId) {
  if (!confirm('Generate a new video room? The old link will no longer work.')) return;
  await generateMeet(sessionId);
}

function copyMeetLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    showToast('Video link copied to clipboard! 📋', 'success');
  }).catch(() => {
    prompt('Copy this link:', link);
  });
}

// ── Mark session status ───────────────────────────────────────────────────
async function markSession(id, status) {
  try {
    await api(`/sessions/${id}`, { method: 'PUT', body: { status } });
    
    let undoCallback = null;
    if (status === 'completed' || status === 'cancelled') {
      const oldStatus = 'upcoming'; // Since actions are only shown on 'upcoming' status
      undoCallback = async () => {
        try {
          await api(`/sessions/${id}`, { method: 'PUT', body: { status: oldStatus } });
          showToast('Undo successful', 'success');
          loadSessions();
        } catch(e) {
          showToast(e.message, 'error');
        }
      };
    }

    showToast(`Session ${status}`, 'success', undoCallback);
    loadSessions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Reschedule modal ──────────────────────────────────────────────────────
function openScheduleModal(sessionId, partnerName) {
  scheduleSessionId = sessionId;
  document.getElementById('schedule-for-name').textContent = `With: ${partnerName}`;
  const s = allSessions.find(x => x._id === sessionId);
  if (s) {
    const dt = new Date(s.scheduled_at);
    // Format for datetime-local input: YYYY-MM-DDTHH:MM
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    document.getElementById('schedule-dt').value = local;
    document.getElementById('schedule-dur').value = s.duration_minutes || 60;
    document.getElementById('schedule-notes').value = s.notes || '';
  }
  document.getElementById('schedule-modal').classList.add('open');
}
function closeScheduleModal() {
  document.getElementById('schedule-modal').classList.remove('open');
}

async function saveSchedule() {
  const dt    = document.getElementById('schedule-dt').value;
  const dur   = document.getElementById('schedule-dur').value;
  const notes = document.getElementById('schedule-notes').value.trim();
  if (!dt) { showToast('Please pick a date and time', 'error'); return; }

  try {
    await api(`/sessions/${scheduleSessionId}`, {
      method: 'PUT',
      body: { scheduled_at: dt, duration_minutes: Number(dur), notes }
    });
    const sess = allSessions.find(s => s._id === scheduleSessionId);
    
    // Auto-generate meet link if not already set
    if (!sess?.meet_link) {
      await api(`/sessions/${scheduleSessionId}/generate-meet`, { method: 'POST' });
    }

    let undoCallback = null;
    if (sess) {
      const oldBody = { 
        scheduled_at: sess.scheduled_at, 
        duration_minutes: sess.duration_minutes, 
        notes: sess.notes 
      };
      undoCallback = async () => {
        try {
          await api(`/sessions/${scheduleSessionId}`, { method: 'PUT', body: oldBody });
          showToast('Undo successful', 'success');
          loadSessions();
        } catch(e) {}
      };
    }

    showToast('✅ Session scheduled!', 'success', undoCallback);
    closeScheduleModal();
    loadSessions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Review modal ──────────────────────────────────────────────────────────
function openReviewModal(userId, sessionId, name) {
  reviewTargetUserId = userId;
  reviewSessionId = sessionId;
  selectedRating = 0;
  document.querySelectorAll('#star-picker span').forEach(s => s.classList.remove('active'));
  document.getElementById('review-for-name').textContent = `For: ${name}`;
  document.getElementById('review-modal').classList.add('open');
}
function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('open');
  document.getElementById('review-form').reset();
}

async function submitReview(e) {
  e.preventDefault();
  if (!selectedRating) { showToast('Please select a star rating', 'error'); return; }
  try {
    await api('/reviews', {
      method: 'POST',
      body: {
        reviewee_id: reviewTargetUserId,
        session_id: reviewSessionId,
        rating: selectedRating,
        comment: document.getElementById('review-comment').value.trim()
      }
    });
    showToast('Review submitted! ⭐', 'success');
    closeReviewModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Refresh countdowns in-page ─────────────────────────────────────────────
function refreshCountdowns() {
  allSessions.filter(s => s.status === 'upcoming').forEach(s => {
    const el = document.getElementById(`cd-${s._id}`);
    if (el) el.outerHTML = buildCountdown(new Date(s.scheduled_at), s._id);
  });
}

// Close modals on backdrop click
['review-modal','schedule-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id === id) {
      document.getElementById(id).classList.remove('open');
    }
  });
});
