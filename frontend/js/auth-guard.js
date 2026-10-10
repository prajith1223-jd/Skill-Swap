// Include on every protected page BEFORE other page scripts.
(function () {
  const token = sessionStorage.getItem('skillswap_token');
  const user = (() => { try { return JSON.parse(sessionStorage.getItem('skillswap_user')); } catch (e) { return null; } })();

  if (!token || !user) {
    location.href = 'index.html';
    return;
  }

  const isAdminPage = document.body.dataset.page === 'admin';
  if (isAdminPage && user.role !== 'admin') {
    location.href = 'dashboard.html';
  }
})();
