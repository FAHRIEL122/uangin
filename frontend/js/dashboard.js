// Dashboard Module
let allTransactions = [];
let filteredTransactions = [];
let confirmCallback = null;
let incomeExpenseChart = null;


function showConfirmModal({ title = 'Konfirmasi', message = 'Apakah Anda yakin?', confirmText = 'Ya', onConfirm }) {
  confirmCallback = onConfirm;

  const titleEl = document.getElementById('confirmTitle');
  const messageEl = document.getElementById('confirmMessage');
  const confirmBtn = document.getElementById('confirmBtn');

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (confirmBtn) confirmBtn.textContent = confirmText;

  const modal = document.getElementById('confirmModal');
  if (!modal) return;
  modal.classList.add('active');
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (!modal) return;
  modal.classList.remove('active');
  confirmCallback = null;
}

function confirmAction() {
  if (typeof confirmCallback === 'function') {
    confirmCallback();
  }
  closeConfirmModal();
}

// Upload attachment and return server path
const uploadAttachment = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Gagal mengunggah lampiran');
  }

  return data.data?.path;
}

const initFilters = () => {
  const searchInput = document.getElementById('searchTransactions');
  const categorySelect = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortTransactions');
  const clearBtn = document.getElementById('clearFiltersBtn');

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', applyFilters);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', applyFilters);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.value = '';
      if (sortSelect) sortSelect.value = 'date_desc';
      applyFilters();
    });
  }
};

const loadCategoryFilter = async () => {
  try {
    const response = await apiCall('/categories', { showLoading: false });
    const categories = response.data;

    const select = document.getElementById('categoryFilter');
    if (!select) return;

    // Sort categories alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name));

    const options = categories
      .map(c => `<option value="${c.id}">${c.name} (${c.type})</option>`)
      .join('');

    select.innerHTML = `<option value="">Semua Kategori</option>${options}`;
  } catch (error) {
    // ignore
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Branding validation (non-blocking)
  validateBranding();
  if (!redirectIfNotAuthenticated()) return;

  // Determine month/year from query params (if provided), otherwise use current month/year
  const urlParams = new URLSearchParams(window.location.search);
  const queryMonth = urlParams.get('month');
  const queryYear = urlParams.get('year');

  const { month: currentMonth, year: currentYear } = getCurrentMonth();
  const month = queryMonth ? parseInt(queryMonth) : currentMonth;
  const year = queryYear ? parseInt(queryYear) : currentYear;

  document.getElementById('monthSelector').value = month;
  document.getElementById('yearSelector').value = year;

  initFilters();
  loadCategoryFilter();

  // Load user info and transactions
  await loadUserInfo();
  await loadTransactions();
});

// Load current user info (for greeting)
async function loadUserInfo() {
  try {
    const response = await apiCall('/auth/me', { showLoading: false });
    const user = response.data;

    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
      welcomeName.textContent = `Halo, ${user.full_name || user.username}!`;
    }
  } catch (error) {
    // if it fails, just continue with defaults
  }
}

// Initialize chart
function initChart() {
  const ctx = document.getElementById('incomeExpenseChart');
  if (!ctx) return;

  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded. Skipping chart initialization.');
    return;
  }

  incomeExpenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pendapatan', 'Pengeluaran'],
      datasets: [{
        label: 'Ringkasan',
        data: [0, 0],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#374151',
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${formatCurrency(value)}`;
            },
          },
        },
      },
    },
  });
}

// Update chart data
function updateChart(summary) {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded. Skipping chart update.');
    return;
  }

  if (!incomeExpenseChart) {
    initChart();
  }

  if (!incomeExpenseChart) return;

  incomeExpenseChart.data.datasets[0].data = [summary.total_income, summary.total_expense];
  incomeExpenseChart.update();
}

// Load transactions
async function loadTransactions() {
  clearAlerts();
  const month = document.getElementById('monthSelector').value;
  const year = document.getElementById('yearSelector').value;

  try {
    const response = await apiCall(`/transactions?month=${month}&year=${year}`);
    
    allTransactions = response.data.transactions;

    // Update summary
    const summary = response.data.summary;
    document.getElementById('totalIncome').textContent = formatCurrency(summary.total_income);
    document.getElementById('totalExpense').textContent = formatCurrency(summary.total_expense);
    document.getElementById('netBalance').textContent = formatCurrency(summary.net_balance);

    // Update chart
    updateChart(summary);

    // Update welcome subtitle with summary
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');
    if (welcomeSubtitle) {
      welcomeSubtitle.textContent = `Ringkasan bulan ini: ${formatCurrency(summary.total_income)} pendapatan, ${formatCurrency(summary.total_expense)} pengeluaran.`;
    }

    // Apply filters and render
    applyFilters();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
};

// Sort transactions by date/time descending (default)
const sortTransactionsByDateDesc = (a, b) => {
  const aDate = new Date(`${a.transaction_date}T${a.transaction_time}`);
  const bDate = new Date(`${b.transaction_date}T${b.transaction_time}`);
  return bDate - aDate;
};

// Apply filters to current transaction list
function applyFilters() {
  const searchInput = document.getElementById('searchTransactions');
  const categorySelect = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortTransactions');

  const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const categoryId = categorySelect ? categorySelect.value : '';
  const sortValue = sortSelect ? sortSelect.value : 'date_desc';

  let list = allTransactions.filter(tx => {
    const matchesCategory = !categoryId || String(tx.category_id) === categoryId;
    const text = `${tx.category_name} ${tx.description || ''}`.toLowerCase();
    const matchesSearch = !search || text.includes(search);
    return matchesCategory && matchesSearch;
  });

  // Apply sorting
  if (sortValue === 'amount_asc') {
    list.sort((a, b) => a.amount - b.amount);
  } else if (sortValue === 'amount_desc') {
    list.sort((a, b) => b.amount - a.amount);
  } else {
    list.sort(sortTransactionsByDateDesc);
  }

  filteredTransactions = list;
  renderTransactions();
};

// Render transactions list
function renderTransactions() {
  const container = document.getElementById('transactionsList');
  const list = filteredTransactions;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>Belum ada transaksi</p>
      </div>
    `;
    return;
  }

  const html = list.map(tx => `
    <div class="transaction-item">
      <div class="transaction-info">
        <div class="transaction-category">
          <span class="transaction-category-dot" style="background-color: ${getColorByType(tx.type)}"></span>
          ${tx.category_name} ${tx.is_recurring ? '<span class="badge badge-secondary" style="margin-left:6px;">🔁</span>' : ''}
        </div>
        <div class="transaction-description">${tx.description || '—'}</div>
        <div class="transaction-date">${formatDateTime(tx.transaction_date, tx.transaction_time)}</div>
        ${tx.attachment_path ? `<div class="transaction-attachment"><a href="${tx.attachment_path}" target="_blank" rel="noreferrer">📎 Lampiran</a></div>` : ''}
      </div>
      <div class="transaction-amount ${tx.type}">
        ${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount)}
      </div>
      <div class="transaction-actions">
        <button class="btn btn-light btn-sm" onclick="editTransaction(${tx.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${tx.id})">Hapus</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
};

// Show edit modal for a transaction (default: latest)
// If an id is passed, edit that transaction; otherwise edit the most recent one.
async function showEditModal(transactionId = null) {
  if (allTransactions.length === 0) {
    showAlert('Tidak ada transaksi untuk diedit', 'warning');
    return;
  }

  const lastTx = transactionId
    ? allTransactions.find((t) => String(t.id) === String(transactionId))
    : allTransactions[0];

  if (!lastTx) {
    showAlert('Transaksi tidak ditemukan', 'warning');
    return;
  }

  try {
    const response = await apiCall(`/categories`);
    const categories = response.data;

    const categoryOptions = categories
      .filter(c => c.type === lastTx.type)
      .map(c => `<option value="${c.id}" ${c.id === lastTx.category_id ? 'selected' : ''}>${c.name}</option>`)
      .join('');

    const modalBody = document.getElementById('editModalBody');
    modalBody.innerHTML = `
      <div class="form-group">
        <label>Nominal</label>
        <input type="number" id="editAmount" value="${lastTx.amount}" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label>Kategori</label>
        <select id="editCategory">${categoryOptions}</select>
      </div>
      <div class="form-group">
        <label>Catatan</label>
        <input type="text" id="editDescription" value="${lastTx.description || ''}" placeholder="Keterangan transaksi">
      </div>
      <div class="form-group">
        <label>Tanggal</label>
        <input type="date" id="editDate" value="${lastTx.transaction_date}" required>
      </div>
      <div class="form-group">
        <label>Jam</label>
        <input type="time" id="editTime" value="${formatTime(lastTx.transaction_time)}" required>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="editIsRecurring" ${lastTx.is_recurring ? 'checked' : ''} /> Transaksi Berulang
        </label>
        <small>Centang jika transaksi ini terjadi setiap bulan</small>
      </div>
      <div class="form-group">
        <label>Lampiran (opsional)</label>
        <input type="file" id="editAttachment" accept="image/*,.pdf" />
        ${lastTx.attachment_path ? `<div class="attachment-link"><a href="${lastTx.attachment_path}" target="_blank" rel="noreferrer">Lihat Lampiran</a></div>` : ''}
        <small>Pilih file baru untuk mengganti lampiran</small>
      </div>
    `;

    document.getElementById('editModal').classList.add('active');
    document.getElementById('editModal').dataset.transactionId = lastTx.id;
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

// Close edit modal
function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (!modal) return;
  modal.classList.remove('active');
  delete modal.dataset.transactionId;
}

// Save edit
async function saveEdit() {
  const transactionId = document.getElementById('editModal').dataset.transactionId;
  const amount = document.getElementById('editAmount').value;
  const categoryId = document.getElementById('editCategory').value;
  const description = document.getElementById('editDescription').value;
  const transactionDate = document.getElementById('editDate').value;
  const transactionTime = document.getElementById('editTime').value;
  const isRecurring = document.getElementById('editIsRecurring')?.checked;
  const attachmentFile = document.getElementById('editAttachment')?.files?.[0];

  if (!amount || !categoryId) {
    showAlert('Nominal dan kategori harus diisi', 'danger');
    return;
  }

  disableButton('saveEditBtn');

  try {
    let attachmentPath = null;
    if (attachmentFile) {
      attachmentPath = await uploadAttachment(attachmentFile);
    }

    await apiCall(`/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        amount: parseFloat(amount),
        category_id: categoryId,
        description,
        transaction_date: transactionDate,
        transaction_time: transactionTime,
        is_recurring: !!isRecurring,
        attachment_path: attachmentPath || null,
      }),
    });

    closeEditModal();
    showAlert('Transaksi berhasil diperbarui', 'success');
    loadTransactions();
  } catch (error) {
    showAlert(error.message, 'danger');
    enableButton('saveEditBtn', 'Simpan');
  }
}

// Prompt delete last transaction (from edit modal)
function promptDeleteLastTransaction() {
  const transactionId = document.getElementById('editModal').dataset.transactionId;
  if (!transactionId) return;

  showConfirmModal({
    title: 'Hapus Transaksi',
    message: 'Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa dibatalkan.',
    confirmText: 'Hapus',
    onConfirm: async () => {
      try {
        await apiCall(`/transactions/${transactionId}`, {
          method: 'DELETE',
        });

        closeEditModal();
        showAlert('Transaksi berhasil dihapus', 'success');
        loadTransactions();
      } catch (error) {
        showAlert(error.message, 'danger');
      }
    },
  });
}

// Edit transaction (quick edit)
function editTransaction(transactionId) {
  const tx = allTransactions.find(t => t.id === transactionId);
  if (!tx) return;

  showEditModal(transactionId);
}

// Delete transaction (quick delete)
function deleteTransaction(transactionId) {
  showConfirmModal({
    title: 'Hapus Transaksi',
    message: 'Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa dibatalkan.',
    confirmText: 'Hapus',
    onConfirm: async () => {
      try {
        await apiCall(`/transactions/${transactionId}`, {
          method: 'DELETE',
        });

        showAlert('Transaksi berhasil dihapus', 'success');
        loadTransactions();
      } catch (error) {
        showAlert(error.message, 'danger');
      }
    },
  });
}

// Undo last transaction
async function undoLastTransaction() {
  showConfirmModal({
    title: 'Undo Transaksi',
    message: 'Apakah Anda ingin membatalkan transaksi terakhir?',
    confirmText: 'Undo',
    onConfirm: async () => {
      try {
        await apiCall('/transactions/undo', { method: 'POST' });
        showToast('Transaksi terakhir dibatalkan', 'success');
        loadTransactions();
      } catch (error) {
        showAlert(error.message, 'danger');
      }
    },
  });
}

// ==================== FLOATING TRANSACTION MODAL ====================
let currentTransactionType = 'expense';
let floatCategories = [];

// Toggle FAB menu
function toggleFabMenu() {
  const fabMain = document.getElementById('fabMain');
  const fabMenu = document.getElementById('fabMenu');
  
  fabMain.classList.toggle('active');
  fabMenu.classList.toggle('active');
}

// Open transaction modal
function openTransactionModal(type) {
  currentTransactionType = type;
  
  // Close FAB menu
  toggleFabMenu();
  
  // Set modal title and submit button color
  const title = document.getElementById('transactionModalTitle');
  const submitBtn = document.getElementById('floatSubmitBtn');
  
  if (type === 'income') {
    title.textContent = '↑ Tambah Pendapatan';
    submitBtn.className = 'btn btn-secondary btn-lg';
  } else {
    title.textContent = '↓ Tambah Pengeluaran';
    submitBtn.className = 'btn btn-danger btn-lg';
  }
  
  // Set current date and time
  const now = new Date();
  document.getElementById('floatDate').valueAsDate = now;
  document.getElementById('floatTime').value = now.toTimeString().substring(0, 5);
  
  // Load categories
  loadFloatCategories();
  
  // Clear form
  document.getElementById('floatAmount').value = '';
  document.getElementById('floatCategory').value = '';
  document.getElementById('floatDescription').value = '';
  document.getElementById('floatIsRecurring').checked = false;
  document.getElementById('floatAttachment').value = '';
  document.getElementById('floatFormattedAmount').textContent = '';
  document.getElementById('floatBudgetWarning').classList.remove('show');
  
  // Show modal
  document.getElementById('transactionModal').classList.add('active');
  
  // Focus on amount input
  setTimeout(() => {
    document.getElementById('floatAmount').focus();
  }, 300);
}

// Close transaction modal
function closeTransactionModal() {
  document.getElementById('transactionModal').classList.remove('active');
}

// Load categories for floating modal
async function loadFloatCategories() {
  try {
    const response = await apiCall('/categories', { showLoading: false });
    floatCategories = response.data.filter(c => c.type === currentTransactionType);
    
    const datalist = document.getElementById('floatCategories');
    if (!datalist) return;
    
    datalist.innerHTML = '';
    
    // Sort categories alphabetically
    floatCategories.sort((a, b) => a.name.localeCompare(b.name));
    
    floatCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      datalist.appendChild(option);
    });
  } catch (error) {
    // ignore
  }
}

// Parse amount input for floating modal
function parseFloatAmountInput(value) {
  if (!value) return NaN;
  let cleaned = String(value).trim();
  cleaned = cleaned.replace(/[^\d.,-]/g, '');
  
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if ((cleaned.match(/\./g) || []).length > 1 && !cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '');
  } else if (!cleaned.includes(',') && (cleaned.match(/\./g) || []).length === 1) {
    const [intPart, fracPart] = cleaned.split('.');
    if (fracPart && fracPart.length === 3) {
      cleaned = intPart + fracPart;
    }
  } else if ((cleaned.match(/,/g) || []).length > 1 && !cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned);
}

// Format amount input for floating modal
function formatFloatAmountInput(input) {
  if (!input) return;
  
  const raw = input.value;
  const normalized = raw.replace(/[^\d.,-]/g, '');
  
  let separator = '';
  let intPart = normalized;
  let fracPart = '';
  
  if (normalized.includes('.') && normalized.includes(',')) {
    separator = ',';
    const parts = normalized.split(',');
    intPart = parts[0].replace(/\./g, '');
    fracPart = parts[1] || '';
  } else if (normalized.includes('.') && !normalized.includes(',')) {
    const parts = normalized.split('.');
    intPart = parts[0].replace(/\./g, '');
    fracPart = parts[1] || '';
    
    if (fracPart.length <= 2) {
      separator = ',';
    } else {
      intPart = intPart + fracPart;
      fracPart = '';
    }
  } else if (normalized.includes(',') && !normalized.includes('.')) {
    const parts = normalized.split(',');
    intPart = parts[0].replace(/,/g, '');
    fracPart = parts[1] || '';
    separator = ',';
  }
  
  intPart = intPart.replace(/^0+(?!$)/, '');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  let formatted = formattedInt;
  if (separator && fracPart !== '') {
    formatted += separator + fracPart;
  }
  
  input.value = formatted;
  input.setSelectionRange(formatted.length, formatted.length);
}

// Update formatted amount display for floating modal
function updateFloatFormattedAmount() {
  const amount = parseFloatAmountInput(document.getElementById('floatAmount').value);
  const preview = document.getElementById('floatFormattedAmount');
  if (!preview) return;
  
  if (!amount || isNaN(amount)) {
    preview.textContent = '';
    return;
  }
  
  preview.textContent = `Rupiah: ${formatCurrency(amount)}`;
}

// Find category by name
function findFloatCategoryByName(name) {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return floatCategories.find(c => c.name.toLowerCase() === normalized) || null;
}

// Initialize floating form on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const floatAmountInput = document.getElementById('floatAmount');
  if (floatAmountInput) {
    floatAmountInput.addEventListener('input', (e) => {
      formatFloatAmountInput(e.target);
      updateFloatFormattedAmount();
    });
  }
  
  const floatForm = document.getElementById('floatingTransactionForm');
  if (floatForm) {
    floatForm.addEventListener('submit', handleFloatFormSubmit);
  }
});

// Handle floating form submission
async function handleFloatFormSubmit(e) {
  e.preventDefault();
  clearAlerts();
  
  const amount = parseFloatAmountInput(document.getElementById('floatAmount').value);
  const categoryName = document.getElementById('floatCategory').value.trim();
  const description = document.getElementById('floatDescription').value.trim();
  const transactionDate = document.getElementById('floatDate').value;
  const transactionTime = document.getElementById('floatTime').value;
  const isRecurring = document.getElementById('floatIsRecurring')?.checked;
  const attachmentFile = document.getElementById('floatAttachment')?.files?.[0];
  
  // Validation
  if (!amount || amount <= 0 || isNaN(amount)) {
    showAlert('Nominal harus diisi dan lebih dari 0', 'danger');
    return;
  }
  
  if (!categoryName) {
    showAlert('Kategori harus diisi', 'danger');
    return;
  }
  
  if (!transactionDate) {
    showAlert('Tanggal harus diisi', 'danger');
    return;
  }
  
  if (!transactionTime) {
    showAlert('Jam harus diisi', 'danger');
    return;
  }
  
  // Disable submit button
  const submitBtn = document.getElementById('floatSubmitBtn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Loading...';
  
  try {
    // Find or create category
    let categoryId;
    const existingCategory = findFloatCategoryByName(categoryName);
    
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      // Create new category
      const createResponse = await apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: categoryName,
          type: currentTransactionType,
        }),
      });
      
      if (createResponse && createResponse.data && createResponse.data.id) {
        categoryId = createResponse.data.id;
        floatCategories.push({ id: categoryId, name: categoryName, type: currentTransactionType });
      }
    }
    
    if (!categoryId) {
      showAlert('Kategori tidak dapat diproses. Silakan coba lagi.', 'danger');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
    
    // Upload attachment if exists
    let attachmentPath = null;
    if (attachmentFile) {
      const formData = new FormData();
      formData.append('file', attachmentFile);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData?.message || 'Gagal mengunggah lampiran');
      }
      
      attachmentPath = uploadData.data?.path;
    }
    
    // Submit transaction
    const payload = {
      amount,
      type: currentTransactionType,
      category_id: categoryId,
      description: description || null,
      transaction_date: transactionDate,
      transaction_time: transactionTime,
      is_recurring: !!isRecurring,
      attachment_path: attachmentPath || null,
    };
    
    await apiCall('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    // Show success message
    const typeLabel = currentTransactionType === 'income' ? 'Pendapatan' : 'Pengeluaran';
    showToast(`✓ ${typeLabel} sebesar ${formatCurrency(amount)} berhasil disimpan!`, 'success');
    
    // Close modal
    closeTransactionModal();
    
    // Reload transactions
    loadTransactions();
    
  } catch (error) {
    showAlert(error.message || 'Terjadi kesalahan saat menyimpan transaksi', 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}
