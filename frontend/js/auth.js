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

// ===== LOGIN =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  console.log('✓ Login form initialized');
  loginForm.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  // Clear errors
  clearFormErrors();
  hideElement('loginError');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  console.log('🔐 Login attempt:', { username, hasPassword: !!password });

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
    console.log('❌ Login validation failed');
    showToast('Mohon lengkapi semua field', 'warning');
    return;
  }

  // Disable button
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Memproses...';

  try {
    console.log('📡 Sending login request...');
    const response = await post('/auth/login', { username, password });
    
    console.log('✅ Login response:', response);

    // Save auth data
    saveAuthData(response.data.token, response.data.user);

    // Show success
    const displayName = response.data.user?.full_name || username;
    showToast(`Login berhasil! Selamat datang ${displayName}`, 'success');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);

  } catch (error) {
    console.error('❌ Login error:', error);
    showElement('loginError');
    document.getElementById('loginErrorMessage').textContent = error.message || 'Login gagal. Periksa username dan password Anda.';
    showToast('Login gagal: ' + (error.message || 'Periksa kredensial Anda'), 'danger');
    btn.disabled = false;
    btn.innerHTML = 'Masuk';
  }
}

// ===== REGISTRATION =====
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  console.log('✓ Register form initialized');
  registerForm.addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
  e.preventDefault();

  // Clear errors and alerts
  clearFormErrors();
  hideElement('registerError');
  hideElement('registerSuccess');

  const fullName = document.getElementById('fullName').value.trim();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  console.log('📝 Register attempt:', { fullName, username, email, hasPassword: !!password });

  // Validate
  let hasError = false;

  // Validate full name
  if (!fullName || fullName.length < 3) {
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
    console.log('❌ Register validation failed');
    showToast('Mohon periksa kembali data Anda', 'warning');
    return;
  }

  // Disable button
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Memproses...';

  try {
    console.log('📡 Sending register request...');
    const response = await post('/auth/register', { username, email, full_name: fullName, password });
    
    console.log('✅ Register response:', response);

    // Show success
    showElement('registerSuccess');
    document.getElementById('registerSuccessMessage').textContent = 
      '✅ Registrasi berhasil! Akun Anda telah dibuat. Mengalihkan ke dashboard...';
    
    // Save auth data
    saveAuthData(response.data.token, response.data.user);

    // Show success toast
    showToast(`Registrasi berhasil! Selamat datang ${fullName}`, 'success');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);

  } catch (error) {
    console.error('❌ Register error:', error);
    showElement('registerError');
    document.getElementById('registerErrorMessage').textContent = error.message || 'Registrasi gagal';
    showToast('Registrasi gagal: ' + (error.message || 'Terjadi kesalahan'), 'danger');
    btn.disabled = false;
    btn.innerHTML = 'Daftar';
  }
}

// ===== HELPERS =====

// Show element
function showElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.remove('hidden');
  }
}

// Hide element
function hideElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.add('hidden');
  }
}
