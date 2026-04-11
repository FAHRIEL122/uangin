// ============================================
// UANGIN - Error Page Logic
// ============================================

document.addEventListener('DOMContentLoaded', initializeErrorPage);

function initializeErrorPage() {
  // Get error code from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code') || '404';
  
  const errorCode = document.getElementById('errorCode');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  
  const errors = {
    '400': {
      title: 'Permintaan Tidak Valid',
      message: 'Permintaan yang Anda kirim tidak valid. Silakan periksa kembali data yang Anda masukkan.'
    },
    '401': {
      title: 'Tidak Terotorisasi',
      message: 'Anda harus login terlebih dahulu untuk mengakses halaman ini.'
    },
    '403': {
      title: 'Akses Ditolak',
      message: 'Anda tidak memiliki izin untuk mengakses halaman ini.'
    },
    '404': {
      title: 'Halaman Tidak Ditemukan',
      message: 'Maaf, halaman yang Anda cari tidak ditemukan atau telah dipindahkan.'
    },
    '500': {
      title: 'Kesalahan Server',
      message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
    }
  };
  
  const error = errors[code] || errors['404'];
  
  if (errorCode) errorCode.textContent = code;
  if (errorTitle) errorTitle.textContent = error.title;
  if (errorMessage) errorMessage.textContent = error.message;
}
