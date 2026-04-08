// Profile Module
let selectedProfilePhotoFile = null;

document.addEventListener('DOMContentLoaded', () => {
  redirectIfNotAuthenticated();
  loadProfile();

  document.getElementById('editProfileForm').addEventListener('submit', handleProfileUpdate);
  document.getElementById('profilePhotoInput').addEventListener('change', handleProfilePhotoChange);
});

const setProfileAvatar = (photoUrl) => {
  const avatarImg = document.getElementById('profileAvatarImg');
  const fallback = document.querySelector('#profileAvatar .avatar-fallback');

  if (photoUrl) {
    avatarImg.src = photoUrl;
    avatarImg.classList.add('visible');
    if (fallback) fallback.style.display = 'none';
  } else {
    avatarImg.classList.remove('visible');
    if (fallback) fallback.style.display = 'flex';
  }
};

const handleProfilePhotoChange = (event) => {
  selectedProfilePhotoFile = event.target.files[0] || null;

  if (!selectedProfilePhotoFile) {
    setProfileAvatar(null);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const avatarImg = document.getElementById('profileAvatarImg');
    const fallback = document.querySelector('#profileAvatar .avatar-fallback');
    avatarImg.src = reader.result;
    avatarImg.classList.add('visible');
    if (fallback) fallback.style.display = 'none';
  };
  reader.readAsDataURL(selectedProfilePhotoFile);
};

const uploadProfilePhoto = async () => {
  if (!selectedProfilePhotoFile) return null;

  const formData = new FormData();
  formData.append('file', selectedProfilePhotoFile);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Gagal mengunggah foto profil');
  }

  return data.data?.path;
};

// Load profile
const loadProfile = async () => {
  try {
    const response = await apiCall('/auth/me');
    const user = response.data;

    // Update header info
    document.getElementById('userFullName').textContent = user.full_name || user.username;
    document.getElementById('userUsername').textContent = `@${user.username}`;

    // Update profile info
    document.getElementById('infoUsername').textContent = user.username;
    document.getElementById('infoEmail').textContent = user.email;
    document.getElementById('infoFullName').textContent = user.full_name || '—';
    document.getElementById('infoPhone').textContent = user.phone || '—';
    document.getElementById('infoCreatedAt').textContent = formatDate(user.created_at);

    // Set profile avatar
    setProfileAvatar(user.photo_url);

    // Pre-fill edit form
    document.getElementById('editFullName').value = user.full_name || '';
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('profilePhotoInput').value = '';
    selectedProfilePhotoFile = null;

    // Load stats
    await loadStats();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
};

// Load statistics
const loadStats = async () => {
  try {
    const response = await apiCall('/transactions/all');
    const transactions = response.data;

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += parseFloat(tx.amount);
      } else {
        totalExpense += parseFloat(tx.amount);
      }
    });

    document.getElementById('totalTransactions').textContent = transactions.length;
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
};

// Handle profile update
const handleProfileUpdate = async (e) => {
  e.preventDefault();
  clearAlerts();

  const fullName = document.getElementById('editFullName').value.trim();
  const phone = document.getElementById('editPhone').value.trim();

  try {
    let photoUrl = null;
    if (selectedProfilePhotoFile) {
      photoUrl = await uploadProfilePhoto();
    }

    const body = {
      full_name: fullName || null,
      phone: phone || null,
    };

    if (photoUrl) {
      body.photo_url = photoUrl;
    }

    await apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    showAlert('Profil berhasil diperbarui', 'success');
    
    // Update user data in localStorage
    const user = getUser() || {};
    user.fullName = fullName;
    setUser(user);

    // Clear file input and local selected file state
    document.getElementById('profilePhotoInput').value = '';
    selectedProfilePhotoFile = null;

    // Reload profile
    setTimeout(() => {
      loadProfile();
    }, 1000);
  } catch (error) {
    showAlert(error.message, 'danger');
  }
};

// Download backup data as JSON
const downloadBackup = async () => {
  try {
    const response = await apiCall('/backup', { showLoading: true });
    const data = response.data;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `uangin-backup-${now}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast('Backup berhasil dibuat. File akan diunduh otomatis.', 'success');
  } catch (error) {
    showAlert(error.message, 'danger');
  }
};
