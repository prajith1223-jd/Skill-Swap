// Requires the socket.io client CDN script to be loaded before this file.
let skillswapSocket = null;

function connectSocket() {
  const token = sessionStorage.getItem('skillswap_token');
  if (!token || typeof io === 'undefined') return null;
  if (skillswapSocket) return skillswapSocket;

  skillswapSocket = io('http://localhost:5000', { auth: { token } });

  skillswapSocket.on('new_notification', (n) => {
    showToast(n.content);
  });

  return skillswapSocket;
}
