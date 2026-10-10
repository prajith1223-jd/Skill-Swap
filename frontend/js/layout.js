// Renders the sidebar + topbar into #sidebar-slot / #topbar-slot.
// Requires auth-guard.js and api.js to have run first.

const NAV_ITEMS = [
  { page: 'dashboard',    href: 'dashboard.html',    icon: '&#9638;',  label: 'Dashboard' },
  { page: 'profile',      href: 'profile.html',      icon: '&#128100;',label: 'Profile' },
  { page: 'browse-skills',href: 'browse-skills.html',icon: '&#128269;',label: 'Browse Skills' },
  { page: 'requests',     href: 'requests.html',     icon: '&#8646;',  label: 'Requests',     countKey: 'pendingRequests' },
  { page: 'sessions',     href: 'sessions.html',     icon: '&#128197;',label: 'Sessions' },
  { page: 'messages',     href: 'messages.html',     icon: '&#128172;',label: 'Messages',     countKey: 'unreadMessages' },
  { page: 'notifications',href: 'notifications.html',icon: '&#128276;',label: 'Notifications',countKey: 'unreadNotifs' },
  { page: 'reviews',      href: 'reviews.html',      icon: '&#11088;', label: 'Reviews' },
  { page: 'settings',     href: 'settings.html',     icon: '&#9881;',  label: 'Settings' },
  { page: 'buy-coins',    href: 'buy-coins.html',    icon: '🪙',       label: 'Buy Coins' },
];

// ── Restore theme + dark mode + font on every page ──────────────────────────
(function restorePrefs() {
  const THEMES = {
    purple: { accent:'#6c5ce7', dark:'#5b4bd1', light:'#ece9fd', sidebar:'#171335', sidebarL:'#201c47' },
    blue:   { accent:'#2563eb', dark:'#1d4ed8', light:'#dbeafe', sidebar:'#0f172a', sidebarL:'#1e3a5f' },
    teal:   { accent:'#0d9488', dark:'#0f766e', light:'#ccfbf1', sidebar:'#042f2e', sidebarL:'#134e4a' },
    green:  { accent:'#16a34a', dark:'#15803d', light:'#dcfce7', sidebar:'#052e16', sidebarL:'#14532d' },
    rose:   { accent:'#e11d48', dark:'#be123c', light:'#ffe4e6', sidebar:'#1f0a0f', sidebarL:'#4c0519' },
    orange: { accent:'#ea580c', dark:'#c2410c', light:'#ffedd5', sidebar:'#1c0a00', sidebarL:'#431407' },
    indigo: { accent:'#4f46e5', dark:'#4338ca', light:'#e0e7ff', sidebar:'#1e1b4b', sidebarL:'#312e81' },
    cyan:   { accent:'#0284c7', dark:'#0369a1', light:'#e0f2fe', sidebar:'#082f49', sidebarL:'#0c4a6e' },
    violet: { accent:'#7c3aed', dark:'#6d28d9', light:'#ede9fe', sidebar:'#2e1065', sidebarL:'#4c1d95' },
    slate:  { accent:'#475569', dark:'#334155', light:'#f1f5f9', sidebar:'#0f172a', sidebarL:'#1e293b' },
  };
  const r = document.documentElement;
  const t = THEMES[sessionStorage.getItem('skillswap_theme')];
  if (t) {
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--accent-dark', t.dark);
    r.style.setProperty('--accent-light', t.light);
    r.style.setProperty('--sidebar-bg', t.sidebar);
    r.style.setProperty('--sidebar-bg-light', t.sidebarL);
  }
  if (sessionStorage.getItem('skillswap_dark') === '1') {
    r.style.setProperty('--bg', '#0f1117');
    r.style.setProperty('--card', '#1a1d27');
    r.style.setProperty('--text', '#e8e8f0');
    r.style.setProperty('--text-muted', '#8b8aaa');
    r.style.setProperty('--border', '#2d2f45');
  }
  const font = sessionStorage.getItem('skillswap_font');
  if (font) r.style.fontSize = font + 'px';
  const rounded = sessionStorage.getItem('skillswap_rounded');
  if (rounded === '0') r.style.setProperty('--radius', '6px');
})();


async function renderLayout(activePage) {
  const user = getCurrentUser();
  const sidebarSlot = document.getElementById('sidebar-slot');
  const topbarSlot = document.getElementById('topbar-slot');
  if (!user || !sidebarSlot) return;

  const navHtml = NAV_ITEMS.map(item => {
    return `
      <a class="nav-item ${item.page === activePage ? 'active' : ''}" href="${item.href}">
        <span class="nav-left"><span>${item.icon}</span><span>${item.label}</span></span>
        <span class="nav-badge" id="badge-${item.countKey}" style="display:none"></span>
      </a>`;
  }).join('');

  const adminNav = user.role === 'admin' ? `
    <a class="nav-item ${activePage === 'admin' ? 'active' : ''}" href="admin.html">
      <span class="nav-left"><span>&#128737;</span><span>Admin</span></span>
    </a>` : '';

  sidebarSlot.outerHTML = `
    <aside class="sidebar" id="sidebar-slot">
      <div class="sidebar-logo"><img src="assets/logo.svg" class="icon" alt="Logo"> SkillSwap</div>
      <nav>
        ${navHtml}
        ${adminNav}
      </nav>
      <div class="sidebar-user">
        <img src="${user.avatar_url || 'https://i.pravatar.cc/150'}" alt="">
        <div>
          <div class="name">${user.name}</div>
          <div class="role">${user.role === 'admin' ? 'Administrator' : 'Member'}</div>
        </div>
        <button class="logout-btn" title="Log out" onclick="logout()">&#10148;</button>
      </div>
    </aside>`;

  if (topbarSlot) {
    topbarSlot.outerHTML = `
      <div class="topbar" id="topbar-slot">
        <div class="search">
          <span>&#128269;</span>
          <input id="global-search" placeholder="Search skills, people..." />
        </div>
        <div class="spacer"></div>
        <div id="topbar-coins" style="display:flex;align-items:center;gap:4px;font-weight:bold;color:var(--accent);margin-right:12px;display:none;cursor:pointer;" onclick="location.href='buy-coins.html'" title="Buy more coins">
          <span>🪙</span> <span id="topbar-coin-count"></span>
        </div>
        <a class="topbar-icon" href="notifications.html" title="Notifications" id="topbar-notif-icon">
          &#128276;
        </a>
        <a href="profile.html"><img class="topbar-avatar" src="${user.avatar_url || 'https://i.pravatar.cc/150'}" alt=""></a>
      </div>`;

    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
          location.href = `browse-skills.html?q=${encodeURIComponent(searchInput.value.trim())}`;
        }
      });
    }
  }

  // Fetch counts async to avoid blocking page transition
  api('/users/me/dashboard').then(counts => {
    NAV_ITEMS.forEach(item => {
      if (item.countKey && counts[item.countKey]) {
        const badge = document.getElementById(`badge-${item.countKey}`);
        if (badge) {
          badge.textContent = counts[item.countKey];
          badge.style.display = 'inline-block';
        }
      }
    });
    if (counts.unreadNotifs) {
      const topbarIcon = document.getElementById('topbar-notif-icon');
      if (topbarIcon) topbarIcon.innerHTML += '<span class="dot"></span>';
    }
    if (counts.coins !== undefined) {
      const topbarCoins = document.getElementById('topbar-coins');
      const coinCount = document.getElementById('topbar-coin-count');
      if (topbarCoins && coinCount) {
        coinCount.textContent = counts.coins;
        topbarCoins.style.display = 'flex';
      }
    }
  }).catch(() => { /* ignore */ });
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr.replace(' ', 'T')).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr.replace(' ', 'T')).toLocaleDateString();
}

function starHtml(rating) {
  const full = Math.round(rating);
  return '&#9733;'.repeat(full) + '&#9734;'.repeat(5 - full);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// -- Google Translate Support ------------------------------------------------
(function initTranslator() {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(script);

  const gtDiv = document.createElement('div');
  gtDiv.id = 'google_translate_element';
  gtDiv.style.display = 'none';
  document.body.appendChild(gtDiv);

  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      autoDisplay: false
    }, 'google_translate_element');
  };

  setTimeout(() => {
    const langSelect = document.getElementById('app-lang');
    if (langSelect) {
      const match = document.cookie.match(/googtrans=\/en\/([a-z]{2,3}(\-[A-Z]{2})?)/);
      if (match && match[1]) {
        langSelect.value = match[1];
      }

      langSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        if (lang === 'en') {
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
        } else {
          const cookieVal = '/en/' + lang;
          document.cookie = 'googtrans=' + cookieVal + '; path=/';
          document.cookie = 'googtrans=' + cookieVal + '; path=/; domain=' + window.location.hostname;
        }
        location.reload();
      });
    }
  }, 1000);
})();

// -- AI Chatbot --------------------------------------------------------------
(function initChatbot() {
  const chatHtml = `
    <div id="ai-chatbot-widget" style="position:fixed;bottom:20px;right:20px;width:320px;background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2);display:flex;flex-direction:column;overflow:hidden;z-index:9999;transition:all 0.3s ease;transform:translateY(calc(100% - 50px));">
      <div id="ai-chatbot-header" style="padding:12px 16px;background:var(--accent);color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
        <span>🤖 SkillSwap AI</span>
        <span id="ai-chatbot-toggle">▲</span>
      </div>
      <div id="ai-chatbot-body" style="height:350px;display:flex;flex-direction:column;">
        <div id="ai-chatbot-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;font-size:13.5px;color:var(--text);">
          <div style="background:var(--sidebar-bg-light);color:#fff;padding:10px;border-radius:8px;align-self:flex-start;max-width:85%;">Hello! I can help you find courses, skills, and teachers on SkillSwap. What are you looking for?</div>
        </div>
        <div style="padding:10px;border-top:1px solid var(--border);display:flex;gap:8px;">
          <input type="text" id="ai-chatbot-input" placeholder="Ask about skills..." style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;outline:none;font-size:13.5px;">
          <button id="ai-chatbot-send" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:0 12px;cursor:pointer;font-weight:bold;">▶</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', chatHtml);

  const widget = document.getElementById('ai-chatbot-widget');
  const header = document.getElementById('ai-chatbot-header');
  const toggleBtn = document.getElementById('ai-chatbot-toggle');
  const messagesDiv = document.getElementById('ai-chatbot-messages');
  const inputEl = document.getElementById('ai-chatbot-input');
  const sendBtn = document.getElementById('ai-chatbot-send');

  let isOpen = false;

  header.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      widget.style.transform = 'translateY(0)';
      toggleBtn.textContent = '▼';
      inputEl.focus();
    } else {
      widget.style.transform = 'translateY(calc(100% - 50px))';
      toggleBtn.textContent = '▲';
    }
  });

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    
    // Add user message
    messagesDiv.innerHTML += `<div style="background:var(--accent);color:#fff;padding:10px;border-radius:8px;align-self:flex-end;max-width:85%;">${escapeHtml(text)}</div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Add loading
    const loadingId = 'loading-' + Date.now();
    messagesDiv.innerHTML += `<div id="${loadingId}" style="background:var(--sidebar-bg-light);padding:10px;border-radius:8px;align-self:flex-start;max-width:85%;color:#a7a3d6;font-style:italic;">Thinking...</div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
      const res = await api('/chatbot', {
        method: 'POST',
        body: { message: text }
      });
      document.getElementById(loadingId).remove();
      messagesDiv.innerHTML += `<div style="background:var(--sidebar-bg-light);color:#fff;padding:10px;border-radius:8px;align-self:flex-start;max-width:85%;">${res.reply.replace(/\n/g, '<br>')}</div>`;
    } catch (err) {
      document.getElementById(loadingId).remove();
      messagesDiv.innerHTML += `<div style="background:#4c0519;color:#ff4d4f;padding:10px;border-radius:8px;align-self:flex-start;max-width:85%;">Failed to connect to AI.</div>`;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
})();


