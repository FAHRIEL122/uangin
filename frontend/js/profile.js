// ============================================
// UANGIN - Profile Management Logic
// ============================================

requireAuth();

document.addEventListener('DOMContentLoaded', initializeProfile);

async function initializeProfile() {
  await loadProfile();
  setupEventListeners();
  updateThemeIcon();
}

async function loadProfile() {
  try {
    const response = await get('/auth/me');
    const user = response.data;
    
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    document.getElementById('full_name').value = user.full_name || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('photo_url').value = user.photo_url || '';
    
    // Set joined date
    document.getElementById('joinedDate').textContent = formatDate(user.created_at);
    
    // Load statistics
    await loadStatistics();
  } catch (error) {
    showToast('Gagal memuat profil', 'danger');
    console.error('Load profile error:', error);
  }
}

async function loadStatistics() {
  try {
    const { month, year } = getCurrentMonthYear();
    
    // Get all transactions count
    const response = await get(`/reports/summary?month=${month}&year=${year}`);
    const total = response.data.income_count + response.data.expense_count;
    document.getElementById('totalTransactions').textContent = total;
    
    // Get categories count
    const catResponse = await get('/categories');
    document.getElementById('totalCategories').textContent = catResponse.data.length;
  } catch (error) {
    console.error('Load statistics error:', error);
  }
}

function setupEventListeners() {
  // Profile form
  document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
  
  // Password form
  document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
  
  // Theme toggle
  document.getElementById('themeSwitch').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });
  
  // Export data
  document.getElementById('exportBtn').addEventListener('click', exportData);
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });
  
  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });
  
  // Set initial theme switch state
  const theme = getSavedTheme();
  if (theme === 'dark') {
    document.getElementById('themeSwitch').classList.add('active');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const full_name = document.getElementById('full_name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const photo_url = document.getElementById('photo_url').value.trim();
  
  try {
    await put('/auth/profile', { full_name, phone, photo_url });
    showToast('Profil berhasil diperbarui', 'success');
  } catch (error) {
    showToast(error.message || 'Gagal memperbarui profil', 'danger');
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();
  
  const current_password = document.getElementById('current_password').value;
  const new_password = document.getElementById('new_password').value;
  const confirm_password = document.getElementById('confirm_password').value;
  
  if (new_password !== confirm_password) {
    showToast('Password baru dan konfirmasi tidak cocok', 'danger');
    return;
  }
  
  if (new_password.length < 8) {
    showToast('Password minimal 8 karakter', 'danger');
    return;
  }
  
  try {
    await post('/auth/change-password', { current_password, new_password });
    showToast('Password berhasil diubah', 'success');
    document.getElementById('passwordForm').reset();
  } catch (error) {
    showToast(error.message || 'Gagal mengubah password', 'danger');
  }
}

async function exportData() {
  try {
    showToast('Mengexport data...', 'info');
    const response = await get('/backup');
    
    // Download as JSON
    const dataStr = JSON.stringify(response.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uangin-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('Data berhasil diexport', 'success');
  } catch (error) {
    showToast(error.message || 'Gagal mengexport data', 'danger');
  }
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  
  const themeSwitch = document.getElementById('themeSwitch');
  if (theme === 'dark') {
    themeSwitch.classList.add('active');
  } else {
    themeSwitch.classList.remove('active');
  }
}
