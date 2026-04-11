/**
 * Universal Transaction Modal
 * Handles both income and expense transactions in one popup
 */

// State
let currentTransactionType = 'income';
let currentCategories = [];

// Open Transaction Modal
function openTransactionModal(type = 'income') {
  currentTransactionType = type;
  
  // Reset form
  resetTransactionForm();
  
  // Set transaction type
  selectTransactionType(type);
  
  // Load categories
  loadTransactionCategories();
  
  // Set default date/time
  setDefaultDateTime();
  
  // Show modal
  showModalById('transactionModal');
  
  // Focus amount input
  setTimeout(() => {
    document.getElementById('amount')?.focus();
  }, 300);
}

// Select Transaction Type
function selectTransactionType(type) {
  currentTransactionType = type;
  
  // Update selector buttons
  document.querySelectorAll('.transaction-type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.querySelector(`.transaction-type-btn.${type}`)?.classList.add('active');
  
  // Update modal title and icon
  const modalTitle = document.getElementById('modalTitle');
  const modalIcon = document.getElementById('modalIcon');
  
  if (type === 'income') {
    modalIcon.textContent = '📈';
    modalTitle.textContent = 'Tambah Pendapatan';
  } else {
    modalIcon.textContent = '📉';
    modalTitle.textContent = 'Tambah Pengeluaran';
  }
  
  // Reload categories for this type
  loadTransactionCategories();
  
  // Hide budget warning
  hideBudgetWarning();
}

// Load Categories
async function loadTransactionCategories() {
  try {
    const response = await get(`/categories?type=${currentTransactionType}`);
    currentCategories = response.data || [];
    
    const select = document.getElementById('category');
    select.innerHTML = '<option value="">Pilih kategori...</option>';
    
    currentCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${cat.icon || '📁'} ${cat.name}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    showToast('Gagal memuat kategori', 'danger');
  }
}

// Set Default Date/Time
function setDefaultDateTime() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);
  
  document.getElementById('transactionDate').value = dateStr;
  document.getElementById('transactionTime').value = timeStr;
}

// Reset Form
function resetTransactionForm() {
  const form = document.getElementById('transactionForm');
  form?.reset();
  
  document.getElementById('amountPreview').textContent = 'Rp 0';
  document.getElementById('filePreview').innerHTML = '';
  hideBudgetWarning();
  clearFormErrors();
}

// Submit Transaction
async function submitTransaction() {
  clearFormErrors();
  
  // Get values
  const amountStr = document.getElementById('amount').value;
  const categoryId = document.getElementById('category').value;
  const description = document.getElementById('description').value.trim();
  const transactionDate = document.getElementById('transactionDate').value;
  const transactionTime = document.getElementById('transactionTime').value || '00:00:00';
  
  // Validation
  let hasError = false;
  
  // Validate amount
  const amount = parseCurrency(amountStr);
  if (!amount || amount <= 0) {
    showFormError('amount', 'Jumlah harus lebih dari 0');
    hasError = true;
  }
  
  // Validate category
  if (!categoryId) {
    showFormError('category', 'Silakan pilih kategori');
    hasError = true;
  }
  
  // Validate date
  if (!transactionDate) {
    showFormError('transactionDate', 'Tanggal harus diisi');
    hasError = true;
  }
  
  if (hasError) {
    showToast('Mohon lengkapi semua field yang wajib diisi', 'warning');
    return;
  }
  
  // Disable submit button
  const submitBtn = document.getElementById('submitTransactionBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';
  
  try {
    const data = {
      type: currentTransactionType,
      amount: amount,
      category_id: parseInt(categoryId),
      description: description || null,
      transaction_date: transactionDate,
      transaction_time: transactionTime
    };
    
    // Handle file attachment
    const attachmentInput = document.getElementById('attachment');
    if (attachmentInput && attachmentInput.files.length > 0) {
      // Upload file first
      const formData = new FormData();
      formData.append('file', attachmentInput.files[0]);
      
      const uploadResponse = await apiCall('/upload', {
        method: 'POST',
        body: formData
      });
      
      data.attachment_url = uploadResponse.data?.url;
    }
    
    // Submit transaction
    await post('/transactions', data);
    
    // Success
    showToast(
      currentTransactionType === 'income' 
        ? '✅ Pendapatan berhasil ditambahkan' 
        : '✅ Pengeluaran berhasil dicatat',
      'success'
    );
    
    // Close modal and refresh data
    closeTransactionModal();
    
    // Reload dashboard data
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
    
  } catch (error) {
    console.error('Error submitting transaction:', error);
    showToast(error.message || 'Gagal menyimpan transaksi', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// Check Budget Warning (for expenses)
async function checkBudgetWarning(categoryId, amount) {
  if (currentTransactionType !== 'expense') {
    hideBudgetWarning();
    return;
  }
  
  try {
    const response = await get(`/budgets/check-warning?category_id=${categoryId}&amount=${amount}`);
    
    if (response.data && response.data.warning) {
      showBudgetWarning(response.data.message);
    } else {
      hideBudgetWarning();
    }
  } catch (error) {
    // Budget check is optional, don't show error
    console.log('Budget check skipped:', error);
  }
}

// Show/Hide Budget Warning
function showBudgetWarning(message) {
  const warning = document.getElementById('budgetWarning');
  const messageEl = document.getElementById('budgetWarningMessage');
  
  if (warning && messageEl) {
    messageEl.textContent = message;
    warning.classList.remove('hidden');
  }
}

function hideBudgetWarning() {
  const warning = document.getElementById('budgetWarning');
  if (warning) {
    warning.classList.add('hidden');
  }
}

// Close Modal Functions
function closeTransactionModal() {
  hideModalById('transactionModal');
  resetTransactionForm();
}

function closeEditModal() {
  hideModalById('editModal');
}

function closeDeleteModal() {
  hideModalById('deleteModal');
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Amount input formatting
  const amountInput = document.getElementById('amount');
  if (amountInput) {
    amountInput.addEventListener('input', (e) => {
      formatInputAsCurrency(e.target);
      updateAmountPreview();
    });
  }
  
  // Category change - check budget
  const categorySelect = document.getElementById('category');
  if (categorySelect) {
    categorySelect.addEventListener('change', async (e) => {
      const categoryId = e.target.value;
      const amount = parseCurrency(document.getElementById('amount').value);
      
      if (categoryId && amount > 0) {
        await checkBudgetWarning(categoryId, amount);
      }
    });
  }
  
  // Submit button
  const submitBtn = document.getElementById('submitTransactionBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitTransaction);
  }
  
  // Form submit on Enter
  const form = document.getElementById('transactionForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitTransaction();
    });
  }
  
  // File attachment preview
  const attachmentInput = document.getElementById('attachment');
  if (attachmentInput) {
    attachmentInput.addEventListener('change', handleFilePreview);
  }
});

// Update Amount Preview
function updateAmountPreview() {
  const amountInput = document.getElementById('amount');
  const preview = document.getElementById('amountPreview');
  
  if (amountInput && preview) {
    const amount = parseCurrency(amountInput.value);
    preview.textContent = formatCurrency(amount);
    
    if (amount > 0) {
      preview.style.opacity = '1';
    } else {
      preview.style.opacity = '0.5';
    }
  }
}

// Handle File Preview
function handleFilePreview(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('filePreview');
  
  if (!file) {
    preview.innerHTML = '';
    return;
  }
  
  // Validate file size (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    preview.innerHTML = `
      <div class="alert alert-danger">
        <span class="alert-icon">❌</span>
        <div class="alert-content">
          <div class="alert-message">Ukuran file melebihi 5MB</div>
        </div>
      </div>
    `;
    e.target.value = '';
    return;
  }
  
  // Preview image
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div style="position: relative; display: inline-block;">
          <img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: var(--radius-lg); border: 2px solid var(--border-color);">
          <button onclick="clearFileAttachment()" style="position: absolute; top: -8px; right: -8px; width: 28px; height: 28px; border-radius: 50%; background: var(--color-danger-500); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">×</button>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  } else if (file.type === 'application/pdf') {
    preview.innerHTML = `
      <div class="alert alert-info">
        <span class="alert-icon">📄</span>
        <div class="alert-content">
          <div class="alert-title">${file.name}</div>
          <div class="alert-message">${(file.size / 1024).toFixed(2)} KB</div>
        </div>
      </div>
    `;
  }
}

// Clear File Attachment
function clearFileAttachment() {
  document.getElementById('attachment').value = '';
  document.getElementById('filePreview').innerHTML = '';
}

// Expose functions globally
window.openTransactionModal = openTransactionModal;
window.closeTransactionModal = closeTransactionModal;
window.selectTransactionType = selectTransactionType;
window.closeEditModal = closeEditModal;
window.closeDeleteModal = closeDeleteModal;
