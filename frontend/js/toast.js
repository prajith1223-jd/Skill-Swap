function ensureToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = '', undoCallback = null) {
  const c = ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  el.appendChild(textSpan);

  if (undoCallback) {
    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'Undo';
    undoBtn.style.cssText = 'margin-left:12px; background:none; border:none; color:inherit; text-decoration:underline; font-weight:bold; cursor:pointer; font-size:12.5px;';
    undoBtn.onclick = () => {
      undoCallback();
      el.remove();
    };
    el.appendChild(undoBtn);
  }

  c.appendChild(el);
  setTimeout(() => el.remove(), 4500); // Give them slightly more time if there's an undo
}
