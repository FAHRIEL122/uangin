// ============================================
// UANGIN - Authentication Logic
// ============================================

// Redirect if already logged in
redirectIfAuth();

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  
  // Clear errors
  clearErrors();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  // Validate
  let hasError = false;
  
  if (!username) {
    showError('usernameError', 'Username diperlukan');
    hasError = true;
  }
  
  if (!password) {
    showError('passwordError', 'Password diperlukan');
    hasError = true;
  }
  
  if (hasError) return;
  
  // Disable button
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Loading...';
  
  try {
    const response = await post('/auth/login', { username, password });
    
    // Save auth data
    saveAuthData(response.data.token, response.data.user);
    
    // Show success
    showToast('Login berhasil! Mengalihkan...', 'success');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
    
  } catch (error) {
    showError('generalError', error.message || 'Login gagal');
    btn.disabled = false;
    btn.innerHTML = 'Login';
  }
}

// Register form handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
  e.preventDefault();
  
  // Clear errors
  clearErrors();
  
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const full_name = document.getElementById('full_name').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Validate
  let hasError = false;
  
  if (!username || username.length < 4 || username.length > 20) {
    showError('usernameError', 'Username harus 4-20 karakter');
    hasError = true;
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showError('usernameError', 'Username hanya boleh berisi huruf, angka, dan underscore');
    hasError = true;
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('emailError', 'Format email tidak valid');
    hasError = true;
  }
  
  if (!password || password.length < 8) {
    showError('passwordError', 'Password minimal 8 karakter');
    hasError = true;
  } else if (!/[A-Z]/.test(password)) {
    showError('passwordError', 'Password harus mengandung huruf besar');
    hasError = true;
  } else if (!/[a-z]/.test(password)) {
    showError('passwordError', 'Password harus mengandung huruf kecil');
    hasError = true;
  } else if (!/[0-9]/.test(password)) {
    showError('passwordError', 'Password harus mengandung angka');
    hasError = true;
  }
  
  if (password !== confirmPassword) {
    showError('confirmPasswordError', 'Password tidak cocok');
    hasError = true;
  }
  
  if (hasError) return;
  
  // Disable button
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Loading...';
  
  try {
    const response = await post('/auth/register', { username, email, password, full_name });
    
    // Save auth data
    saveAuthData(response.data.token, response.data.user);
    
    // Show success
    showToast('Registrasi berhasil! Mengalihkan...', 'success');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
    
  } catch (error) {
    showError('generalError', error.message || 'Registrasi gagal');
    btn.disabled = false;
    btn.innerHTML = 'Daftar';
  }
}

// Helper: Show error
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
  }
}

// Helper: Clear all errors
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
  });
}
