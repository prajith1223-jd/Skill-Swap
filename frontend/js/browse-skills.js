let allCategories = [];
let activeCategory = 'All';
let selectedSkillForRequest = null;
const currentUser = getCurrentUser();

(async function init() {
  await renderLayout('browse-skills');

  const params = new URLSearchParams(location.search);
  if (params.get('q')) document.getElementById('search-input').value = params.get('q');

  await loadCategories();
  await loadSkills();

  document.getElementById('search-input').addEventListener('input', debounce(loadSkills, 350));
  document.getElementById('level-filter').addEventListener('change', loadSkills);
  document.getElementById('sort-filter').addEventListener('change', loadSkills);
  document.getElementById('offer-form').addEventListener('submit', submitOfferSkill);
  document.getElementById('request-form').addEventListener('submit', submitRequest);
})();

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function loadCategories() {
  allCategories = await api('/categories');
  const chipRow = document.getElementById('category-chips');
  chipRow.innerHTML = ['All', ...allCategories.map(c => c.name)].map(name => `
    <div class="chip ${name === activeCategory ? 'active' : ''}" data-cat="${name}">${name}</div>
  `).join('');
  chipRow.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.cat;
      chipRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadSkills();
    });
  });

  const catSelect = document.getElementById('skill-category');
  catSelect.innerHTML = allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadSkills() {
  const grid = document.getElementById('skills-grid');
  grid.innerHTML = `<div class="loading">Loading skills...</div>`;

  const q = document.getElementById('search-input').value.trim();
  const level = document.getElementById('level-filter').value;
  const sort = document.getElementById('sort-filter').value;

  const query = new URLSearchParams();
  if (activeCategory !== 'All') query.set('category', activeCategory);
  if (level && level !== 'All Levels') query.set('level', level);
  if (q) query.set('q', q);
  if (sort) query.set('sort', sort);

  try {
    const skills = await api(`/skills?${query.toString()}`);
    if (!skills.length) {
      grid.innerHTML = `<div class="empty-hint" style="grid-column:1/-1;"><div class="big">&#128269;</div>No skills matched your search.</div>`;
      return;
    }
    grid.innerHTML = skills.map(renderSkillCard).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderSkillCard(s) {
  const isMine = currentUser && currentUser.id === s.user_id;
  return `
    <div class="card skill-card">
      <div class="top-row">
        <div class="owner">
          <img src="${s.owner_avatar || 'https://i.pravatar.cc/150'}" alt="">
          <div>
            <div class="n">${escapeHtml(s.owner_name)}</div>
            <div class="c">${escapeHtml(s.category_name)}</div>
          </div>
        </div>
        <button class="bookmark-btn" title="Save">&#128278;</button>
      </div>
      <h3>${escapeHtml(s.title)}</h3>
      <div class="tag-row">${(s.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="rating-row">
        <span class="stars">${starHtml(s.rating)} <span class="text-muted">${s.rating > 0 ? s.rating.toFixed?.(1) ?? s.rating : 'New'} ${s.review_count ? `(${s.review_count} reviews)` : ''}</span></span>
        <span class="level-badge">${escapeHtml(s.level)}</span>
      </div>
      <button class="btn btn-block" ${isMine ? 'disabled title="This is your own skill"' : ''} onclick='openRequestModal("${s.id}", ${JSON.stringify(s.title)})'>
        ${isMine ? 'Your Skill' : 'Request Exchange'}
      </button>
      ${!isMine ? `<button class="btn btn-block btn-outline" style="margin-top: 8px;" onclick='location.href="messages.html?userId=${s.user_id}&name=${encodeURIComponent(s.owner_name)}&avatar=${encodeURIComponent(s.owner_avatar || "")}"'>Message User</button>` : ''}
    </div>`;
}

// ---------- Offer a Skill modal ----------
function openOfferModal() { document.getElementById('offer-modal').classList.add('open'); }
function closeOfferModal() { document.getElementById('offer-modal').classList.remove('open'); document.getElementById('offer-form').reset(); }

async function submitOfferSkill(e) {
  e.preventDefault();
  const tags = document.getElementById('skill-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  try {
    await api('/skills', {
      method: 'POST',
      body: {
        title: document.getElementById('skill-title').value.trim(),
        category_id: Number(document.getElementById('skill-category').value),
        level: document.getElementById('skill-level').value,
        description: document.getElementById('skill-description').value.trim(),
        tags
      }
    });
    showToast('Skill published!', 'success');
    closeOfferModal();
    loadSkills();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- Request Exchange modal ----------
function openRequestModal(skillId, title) {
  selectedSkillForRequest = skillId;
  document.getElementById('request-skill-name').textContent = `For: ${title}`;
  document.getElementById('request-modal').classList.add('open');
}

function closeRequestModal() {
  document.getElementById('request-modal').classList.remove('open');
  document.getElementById('request-form').reset();
  selectedSkillForRequest = null;
}

async function submitRequest(e) {
  e.preventDefault();
  try {
    const isCoin = document.querySelector('input[name="offer_type"]:checked').value === 'coin';
    const body = { 
      skill_id: selectedSkillForRequest, 
      message: document.getElementById('request-message').value.trim(),
      offered_coin: isCoin
    };
    
    await api('/requests', { method: 'POST', body });
    showToast('Exchange request sent!', 'success');
    closeRequestModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
