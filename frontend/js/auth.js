// Authentication Module
document.addEventListener('DOMContentLoaded', () => {
  // Branding validation (non-blocking)
  validateBranding();

  // Redirect if already authenticated
  redirectIfAuthenticated();

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

// Handle Login
const handleLogin = async (e) => {
  e.preventDefault();
  clearAlerts();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    showAlert('Username dan password harus diisi', 'danger');
    return;
  }

  disableButton('loginBtn');
  showLoading('Memproses login...');

  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setUser({
      userId: response.data.userId,
      username: response.data.username,
      email: response.data.email,
    });

    showAlert('Login berhasil! Mengalihkan...', 'success');
    
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  } catch (error) {
    showAlert(error.message, 'danger');
    enableButton('loginBtn', 'Masuk');
  } finally {
    hideLoading();
  }
};

// Handle Register
const handleRegister = async (e) => {
  e.preventDefault();
  clearAlerts();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const fullName = document.getElementById('fullName').value.trim();

  if (!username || !email || !password) {
    showAlert('Username, email, dan password harus diisi', 'danger');
    return;
  }

  if (username.length < 4 || username.length > 20) {
    showAlert('Username harus 4-20 karakter', 'danger');
    return;
  }

  if (password.length < 6) {
    showAlert('Password minimal 6 karakter', 'danger');
    return;
  }

  disableButton('registerBtn');
  showLoading('Memproses pendaftaran...');

  try {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        full_name: fullName || null,
      }),
    });

    setUser({
      userId: response.data.userId,
      username: response.data.username,
      email: response.data.email,
    });

    showAlert('Pendaftaran berhasil! Mengalihkan...', 'success');
    
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  } catch (error) {
    showAlert(error.message, 'danger');
    enableButton('registerBtn', 'Daftar');
  } finally {
    hideLoading();
  }
};
