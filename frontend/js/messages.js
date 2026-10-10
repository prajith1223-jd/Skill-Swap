const msgUser = getCurrentUser();
let activeConversationId = null;
let activeConversationName = '';
let activeConversationAvatar = '';

(async function init() {
  await renderLayout('messages');
  const socket = connectSocket();
  await loadConversations();

  // Support deep-linking: messages.html?userId=5
  const params = new URLSearchParams(location.search);
  if (params.get('userId')) {
    openConversation(params.get('userId'), params.get('name') || 'User', params.get('avatar') || '');
  }

  if (socket) {
    socket.on('new_message', (msg) => {
      if (activeConversationId && (msg.sender_id === activeConversationId || msg.receiver_id === activeConversationId)) {
        appendMessage(msg);
      }
      loadConversations();
    });
    socket.on('typing', (data) => {
      if (activeConversationId === data.sender_id) {
        const ind = document.getElementById('typing-indicator');
        if (ind) {
          ind.style.display = data.is_typing ? 'block' : 'none';
          ind.textContent = `${activeConversationName} is typing...`;
        }
      }
    });
  }
})();

async function loadConversations() {
  const list = document.getElementById('conv-list');
  try {
    const convos = await api('/messages/conversations');
    if (!convos.length) {
      list.innerHTML = `<div class="empty-hint"><div class="big">&#128172;</div>No conversations yet.</div>`;
      return;
    }
    list.innerHTML = convos.map(c => `
      <div class="conv-item ${c.user_id === activeConversationId ? 'active' : ''}" onclick='openConversation("${c.user_id}", ${JSON.stringify(c.name)}, ${JSON.stringify(c.avatar_url || '')})'>
        <img src="${c.avatar_url || 'https://i.pravatar.cc/150'}" alt="">
        <div class="meta">
          <div class="n"><span>${escapeHtml(c.name)}</span>${c.unread ? `<span class="nav-badge">${c.unread}</span>` : ''}</div>
          <div class="last">${escapeHtml(c.last_message || '')}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openConversation(userId, name, avatar) {
  activeConversationId = userId;
  activeConversationName = name;
  activeConversationAvatar = avatar;

  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));

  const panel = document.getElementById('chat-panel');
  panel.innerHTML = `
    <div class="chat-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${avatar || 'https://i.pravatar.cc/150'}" alt="">
        <span>${escapeHtml(name)}</span>
      </div>
      <div id="chat-actions-container" style="display:flex; gap:10px;"></div>
    </div>
    <div class="chat-messages" id="chat-messages"><div class="loading">Loading...</div></div>
    <div id="typing-indicator" class="text-muted" style="display:none; padding: 0 16px; font-size: 12px; font-style: italic;">User is typing...</div>
    <form class="chat-input" id="chat-input-form">
      <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
      <button type="submit" class="btn">Send</button>
    </form>`;

  api(`/users/${userId}`).then(userProfile => {
    const email = userProfile.email || userProfile.gmail || '';
    const phone = userProfile.phone_number || '';
    const container = document.getElementById('chat-actions-container');
    if (container) {
      let html = '';
      if (email) html += `<a href="mailto:${email}?subject=Message from SkillSwap" class="btn" style="background:#ea4335; color:#fff; padding:6px 12px; text-decoration:none; font-size:12px; border-radius:4px;">Email</a>`;
      if (phone) html += `<a href="https://wa.me/${phone.replace(/\D/g, '')}?text=Hi! I found you on SkillSwap." target="_blank" class="btn" style="background:#25D366; color:#fff; padding:6px 12px; text-decoration:none; font-size:12px; border-radius:4px; display:flex; align-items:center; gap:5px;">
        <span style="font-size:14px;">💬</span> WhatsApp: ${escapeHtml(phone)}
      </a>`;
      container.innerHTML = html;
    }
  }).catch(e => console.error('Error fetching user profile for integrations:', e));

  document.getElementById('chat-input-form').addEventListener('submit', sendChatMessage);
  
  const chatInput = document.getElementById('chat-input');
  let typingTimer;
  chatInput.addEventListener('input', () => {
    if (skillswapSocket) skillswapSocket.emit('typing', { receiver_id: activeConversationId, is_typing: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      if (skillswapSocket) skillswapSocket.emit('typing', { receiver_id: activeConversationId, is_typing: false });
    }, 1500);
  });

  try {
    const thread = await api(`/messages/${userId}`);
    const container = document.getElementById('chat-messages');
    container.innerHTML = thread.length
      ? thread.map(renderBubble).join('')
      : `<div class="empty-state"><div>Say hello to start the conversation!</div></div>`;
    container.scrollTop = container.scrollHeight;
    loadConversations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderBubble(m) {
  const mine = m.sender_id === msgUser.id;
  const time = new Date(m.created_at.replace(' ', 'T')).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `
    <div class="msg-bubble ${mine ? 'msg-out' : 'msg-in'}">
      ${escapeHtml(m.content)}
      <div class="msg-time">${time}</div>
    </div>`;
}

function appendMessage(m) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', renderBubble(m));
  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content || !activeConversationId) return;
  input.value = '';

  try {
    const msg = await api('/messages', { method: 'POST', body: { receiver_id: activeConversationId, content } });
    appendMessage(msg);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
