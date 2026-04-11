// ============================================
// UANGIN - Goals/Target Menabung Logic
// ============================================

requireAuth();

let goals = [];
let currentGoalId = null;

document.addEventListener('DOMContentLoaded', initializeGoals);

async function initializeGoals() {
  await loadGoals();
  setupEventListeners();
  updateThemeIcon();
}

function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });
  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });

  // Save goal
  document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);
  
  // Save progress
  document.getElementById('saveProgressBtn').addEventListener('click', saveProgress);

  // Format amount input
  document.getElementById('goalAmount').addEventListener('input', (e) => {
    formatInputAsCurrency(e.target);
  });

  document.getElementById('progressAmount').addEventListener('input', (e) => {
    formatInputAsCurrency(e.target);
  });
}

async function loadGoals() {
  try {
    const response = await get('/goals');
    goals = response.data || [];
    renderGoals();
  } catch (error) {
    console.error('Load goals error:', error);
    showToast('Gagal memuat target', 'danger');
  }
}

function renderGoals() {
  const container = document.getElementById('goalsList');
  const emptyState = document.getElementById('emptyState');

  if (goals.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = goals.map(goal => {
    const percentage = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
    const remaining = goal.target_amount - goal.current_amount;
    const isCompleted = percentage >= 100;
    
    let deadlineText = '';
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const now = new Date();
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        deadlineText = `${daysLeft} hari lagi`;
      } else if (daysLeft === 0) {
        deadlineText = 'Hari ini!';
      } else {
        deadlineText = `${Math.abs(daysLeft)} hari lewat`;
      }
    }

    return `
      <div class="card" style="position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${goal.color};"></div>
        <div style="padding-top: var(--space-2);">
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-3);">
            <div class="flex items-center gap-2">
              <span style="font-size: 1.5rem;">${goal.icon}</span>
              <div>
                <h3 style="font-size: 1rem; font-weight: 600;">${goal.name}</h3>
                ${deadlineText ? `<p class="text-muted" style="font-size: 0.75rem;">${deadlineText}</p>` : ''}
              </div>
            </div>
            <div class="flex gap-2">
              ${!isCompleted ? `<button class="btn btn-icon btn-sm" onclick="showProgressModal(${goal.id})" title="Tambah Progres">💰</button>` : ''}
              <button class="btn btn-icon btn-sm" onclick="editGoal(${goal.id})" title="Edit">✏️</button>
              <button class="btn btn-icon btn-sm" onclick="deleteGoal(${goal.id})" title="Hapus">🗑️</button>
            </div>
          </div>
          
          <div style="margin-bottom: var(--space-3);">
            <div class="flex items-center justify-between" style="margin-bottom: var(--space-2);">
              <span style="font-size: 0.875rem; font-weight: 600; color: ${goal.color};">${formatCurrency(goal.current_amount)}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">dari ${formatCurrency(goal.target_amount)}</span>
            </div>
            <div class="progress-bar" style="height: 8px;">
              <div class="progress-bar-fill ${isCompleted ? 'success' : ''}" style="width: ${percentage}%; background: ${isCompleted ? 'var(--success)' : goal.color};"></div>
            </div>
            <div style="text-align: right; margin-top: var(--space-1);">
              <span style="font-size: 0.75rem; font-weight: 600; color: ${isCompleted ? 'var(--success)' : 'var(--text-muted)'};">${percentage.toFixed(1)}%</span>
            </div>
          </div>
          
          ${isCompleted ? `
            <div class="alert alert-success" style="padding: var(--space-2) var(--space-3); margin-top: var(--space-2);">
              <span>🎉</span>
              <div><div class="alert-message" style="font-size: 0.85rem;">Target tercapai!</div></div>
            </div>
          ` : `
            <p class="text-muted" style="font-size: 0.8rem; margin-top: var(--space-2);">
              Sisa: <strong style="color: var(--danger);">${formatCurrency(remaining)}</strong>
            </p>
          `}
        </div>
      </div>
    `;
  }).join('');
}

window.showAddGoalModal = function() {
  document.getElementById('goalModalTitle').textContent = 'Tambah Target';
  document.getElementById('goalForm').reset();
  document.getElementById('goalId').value = '';
  document.getElementById('goalIcon').value = '🎯';
  document.getElementById('goalColor').value = '#3b82f6';
  showModalById('goalModal');
};

window.closeGoalModal = function() {
  hideModalById('goalModal');
};

window.editGoal = function(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  document.getElementById('goalModalTitle').textContent = 'Edit Target';
  document.getElementById('goalId').value = goal.id;
  document.getElementById('goalName').value = goal.name;
  document.getElementById('goalIcon').value = goal.icon || '🎯';
  document.getElementById('goalColor').value = goal.color || '#3b82f6';
  document.getElementById('goalAmount').value = formatNumber(goal.target_amount);
  document.getElementById('goalDeadline').value = goal.deadline || '';
  
  showModalById('goalModal');
};

async function saveGoal() {
  const id = document.getElementById('goalId').value;
  const name = document.getElementById('goalName').value.trim();
  const icon = document.getElementById('goalIcon').value || '🎯';
  const color = document.getElementById('goalColor').value || '#3b82f6';
  const targetAmount = parseCurrency(document.getElementById('goalAmount').value);
  const deadline = document.getElementById('goalDeadline').value || null;

  if (!name || !targetAmount || targetAmount <= 0) {
    showToast('Nama dan target jumlah wajib diisi', 'warning');
    return;
  }

  const btn = document.getElementById('saveGoalBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';

  try {
    if (id) {
      await put(`/goals/${id}`, { name, icon, color, target_amount: targetAmount, deadline });
      showToast('Target berhasil diupdate', 'success');
    } else {
      await post('/goals', { name, icon, color, target_amount: targetAmount, deadline });
      showToast('Target berhasil dibuat', 'success');
    }
    
    closeGoalModal();
    await loadGoals();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan';
  }
}

window.deleteGoal = async function(id) {
  showConfirm('Hapus Target', 'Yakin ingin menghapus target ini?', async () => {
    try {
      await del(`/goals/${id}`);
      showToast('Target berhasil dihapus', 'success');
      await loadGoals();
    } catch (error) {
      showToast('Gagal: ' + error.message, 'danger');
    }
  });
};

window.showProgressModal = function(id) {
  currentGoalId = id;
  const goal = goals.find(g => g.id === id);
  document.getElementById('progressGoalName').textContent = goal.name;
  document.getElementById('progressAmount').value = '';
  showModalById('progressModal');
};

window.closeProgressModal = function() {
  hideModalById('progressModal');
  currentGoalId = null;
};

async function saveProgress() {
  const amount = parseCurrency(document.getElementById('progressAmount').value);
  
  if (!amount || amount <= 0) {
    showToast('Jumlah harus lebih dari 0', 'warning');
    return;
  }

  const btn = document.getElementById('saveProgressBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Menambah...';

  try {
    await post(`/goals/${currentGoalId}/progress`, { amount });
    
    const goal = goals.find(g => g.id === currentGoalId);
    const newTotal = goal.current_amount + amount;
    const percentage = (newTotal / goal.target_amount) * 100;
    
    if (percentage >= 100) {
      showToast('🎉 Selamat! Target tercapai!', 'success');
    } else {
      showToast(`Progres ${formatCurrency(amount)} berhasil ditambahkan`, 'success');
    }
    
    closeProgressModal();
    await loadGoals();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💰 Tambah';
  }
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
