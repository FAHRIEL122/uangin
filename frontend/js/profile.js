// ============================================
// UANGIN - Profile Management Logic
// ============================================

requireAuth();

document.addEventListener('DOMContentLoaded', initializeProfile);

async function initializeProfile() {
  await loadProfile();
  setupEventListeners();
  updateThemeIcon();
  updateThemeSwitch();
}

async function loadProfile() {
  try {
    const response = await get('/auth/me');
    const user = response.data;

    // Set form values
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('full_name').value = user.full_name || '';
    document.getElementById('phone').value = user.phone || '';

    // Update header
    document.getElementById('profileName').textContent = user.full_name || user.username || '-';
    document.getElementById('profileEmail').textContent = user.email || '-';
    
    // Set avatar initial
    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent = initial;

    // Set joined date
    const joinedDate = new Date(user.created_at);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    document.getElementById('statJoined').textContent = `${monthNames[joinedDate.getMonth()]} ${joinedDate.getFullYear()}`;

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

    // Get transactions count
    const response = await get(`/reports/summary?month=${month}&year=${year}`);
    const total = (response.data.income_count || 0) + (response.data.expense_count || 0);
    document.getElementById('statTransactions').textContent = total;

    // Get categories count
    const catResponse = await get('/categories');
    document.getElementById('statCategories').textContent = catResponse.data.length || 0;
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
  document.getElementById('themeSwitch').addEventListener('change', () => {
    toggleTheme();
    updateThemeIcon();
    updateThemeSwitch();
  });

  // Export data
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
    updateThemeSwitch();
  });

  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const fullName = document.getElementById('full_name').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!fullName || fullName.length < 3) {
    showToast('Nama lengkap minimal 3 karakter', 'warning');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';

  try {
    await put('/auth/profile', { full_name: fullName, phone: phone || null });
    showToast('Profil berhasil diperbarui', 'success');
    
    // Update header name
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileAvatar').textContent = fullName.charAt(0).toUpperCase();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan Perubahan';
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('current_password').value;
  const newPassword = document.getElementById('new_password').value;
  const confirmPassword = document.getElementById('confirm_password').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('Lengkapi semua field', 'warning');
    return;
  }

  if (newPassword.length < 8) {
    showToast('Password minimal 8 karakter', 'warning');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('Password tidak cocok', 'danger');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Memproses...';

  try {
    await post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
    showToast('Password berhasil diubah', 'success');
    e.target.reset();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔑 Ubah Password';
  }
}

function exportData() {
  const { month, year } = getCurrentMonthYear();
  window.location.href = `/api/export/csv?month=${month}&year=${year}`;
  showToast('Mengexport data...', 'success');
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function updateThemeSwitch() {
  const theme = document.documentElement.getAttribute('data-theme');
  const checkbox = document.getElementById('themeSwitch');
  const bg = document.getElementById('themeSwitchBg');
  const thumb = document.getElementById('themeSwitchThumb');
  
  if (checkbox) checkbox.checked = theme === 'dark';
  
  if (bg && thumb) {
    if (theme === 'dark') {
      bg.style.background = 'var(--primary)';
      thumb.style.transform = 'translateX(24px)';
    } else {
      bg.style.background = 'var(--gray-300)';
      thumb.style.transform = 'translateX(0)';
    }
  }
}
