/*
 * "Legacy chat widget" – stands for any third-party script (chat, A/B testing, tag manager…).
 * Requested through /slow/2500/… so it takes 2.5 s to arrive.
 */
(function () {
  function mount() {
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.style.cssText =
      'position:fixed;left:16px;bottom:16px;padding:10px 14px;border-radius:999px;' +
      'background:#2f6fde;color:#fff;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.2)';
    bubble.textContent = '💬 Chat with us';
    document.body.appendChild(bubble);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
