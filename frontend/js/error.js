// Error page script
const getQueryParam = (name) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

const message = getQueryParam('msg') || getQueryParam('message') || 'Terjadi kesalahan yang tidak terduga.';

const messageEl = document.getElementById('errorMessage');
if (messageEl) {
  messageEl.textContent = decodeURIComponent(message);
}

const retryBtn = document.getElementById('retryBtn');
if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    window.location.reload();
  });
}
