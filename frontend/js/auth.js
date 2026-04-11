// ============================================
// UANGIN - Authentication Logic
// ============================================

// Toggle password visibility
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const toggle = input?.parentElement.querySelector('.password-toggle');
  
  if (input && toggle) {
    if (input.type === 'password') {
      input.type = 'text';
      toggle.textContent = '🙈';
    } else {
      input.type = 'password';
      toggle.textContent = '👁️';
    }
  }
}

// Expose globally
window.togglePasswordVisibility = togglePasswordVisibility;

// Redirect if already logged in
redirectIfAuth();

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  // Clear errors and alerts
  clearFormErrors();
  hideElement('loginError');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  // Validate
  let hasError = false;

  if (!username) {
    showFormError('username', 'Username atau email harus diisi');
    hasError = true;
  }

  if (!password) {
    showFormError('password', 'Password harus diisi');
    hasError = true;
  }

  if (hasError) {
    showToast('Mohon lengkapi semua field', 'warning');
    return;
  }

  // Disable button
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Masuk...';

  try {
    const response = await post('/auth/login', { username, password });

    // Save auth data
    saveAuthData(response.data.token, response.data.user);

    // Show success
    showToast('Login berhasil! Selamat datang ' + (response.data.user.full_name || username), 'success');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);

  } catch (error) {
    showElement('loginError');
    document.getElementById('loginErrorMessage').textContent = error.message || 'Login gagal';
    btn.disabled = false;
    btn.innerHTML = '<span>🔐</span> Masuk';
  }
}

// Register form handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
  e.preventDefault();

  // Clear errors and alerts
  clearFormErrors();
  hideElement('registerError');
  hideElement('registerSuccess');

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const full_name = document.getElementById('fullName').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validate
  let hasError = false;

  // Validate full name
  if (!full_name || full_name.length < 3) {
    showFormError('fullName', 'Nama lengkap minimal 3 karakter');
    hasError = true;
  }

  // Validate username
  if (!username || username.length < 4 || username.length > 20) {
    showFormError('username', 'Username harus 4-20 karakter');
    hasError = true;
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showFormError('username', 'Username hanya boleh berisi huruf, angka, dan underscore');
    hasError = true;
  }

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFormError('email', 'Format email tidak valid');
    hasError = true;
  }

  // Validate password
  if (!password || password.length < 8) {
    showFormError('password', 'Password minimal 8 karakter');
    hasError = true;
  } else if (!/[A-Z]/.test(password)) {
    showFormError('password', 'Password harus mengandung huruf besar');
    hasError = true;
  } else if (!/[a-z]/.test(password)) {
    showFormError('password', 'Password harus mengandung huruf kecil');
    hasError = true;
  } else if (!/[0-9]/.test(password)) {
    showFormError('password', 'Password harus mengandung angka');
    hasError = true;
  }

  // Validate confirm password
  if (password !== confirmPassword) {
    showFormError('confirmPassword', 'Password tidak cocok');
    hasError = true;
  }

  if (hasError) {
    showToast('Mohon periksa kembali data Anda', 'warning');
    return;
  }
  
  // Disable button
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Mendaftar...';

  try {
    const response = await post('/auth/register', { username, email, full_name, password });

    // Show success
    showElement('registerSuccess');
    document.getElementById('registerSuccessMessage').textContent = 
      '✅ Registrasi berhasil! Mengalihkan ke dashboard...';
    
    // Save auth data
    saveAuthData(response.data.token, response.data.user);

    // Show success toast
    showToast('Registrasi berhasil! Selamat datang ' + full_name, 'success');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);

  } catch (error) {
    showElement('registerError');
    document.getElementById('registerErrorMessage').textContent = error.message || 'Registrasi gagal';
    btn.disabled = false;
    btn.innerHTML = '<span>🚀</span> Daftar Sekarang';
  }
}

// Helper: Show element
function showElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.remove('hidden');
  }
}

// Helper: Hide element
function hideElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.add('hidden');
  }
}
