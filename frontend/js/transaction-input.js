// ============================================
// UANGIN - Transaction Input Logic
// ============================================

// Require authentication
requireAuth();

// Global variables
let categories = [];
let selectedCategoryId = null;
let uploadedFileUrl = null;

// Determine transaction type from page
const isIncome = window.location.pathname.includes('pendapatan');
const transactionType = isIncome ? 'income' : 'expense';

// Initialize form
document.addEventListener('DOMContentLoaded', initializeForm);

async function initializeForm() {
  // Load categories
  await loadCategories();
  
  // Set default date and time
  const now = new Date();
  document.getElementById('date').value = now.toISOString().split('T')[0];
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
  
  // Setup event listeners
  setupEventListeners();
  
  // Update theme icon
  updateThemeIcon();
}

// Load categories
async function loadCategories() {
  try {
    const response = await get(`/categories?type=${transactionType}`);
    categories = response.data;
    
    // Populate datalist
    const datalist = document.getElementById('categoryList');
    datalist.innerHTML = '';
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      option.dataset.id = cat.id;
      datalist.appendChild(option);
    });
    
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  const form = isIncome ? document.getElementById('incomeForm') : document.getElementById('expenseForm');
  
  // Amount formatting
  document.getElementById('amount').addEventListener('input', handleAmountInput);
  
  // Category selection
  document.getElementById('category').addEventListener('change', handleCategoryChange);
  document.getElementById('category').addEventListener('blur', handleCategoryBlur);
  
  // File upload preview
  document.getElementById('attachment').addEventListener('change', handleFileSelect);
  
  // Form submission
  form.addEventListener('submit', handleSubmit);
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });
  
  // Navbar toggle
  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });
}

// Handle amount input with formatting
function handleAmountInput(e) {
  const input = e.target;
  let value = input.value.replace(/[^0-9]/g, '');
  
  if (value) {
    const formatted = new Intl.NumberFormat('id-ID').format(value);
    input.value = formatted;
    
    // Show preview
    const preview = document.getElementById('amountPreview');
    preview.textContent = `Rp ${formatted}`;
  } else {
    document.getElementById('amountPreview').textContent = '';
  }
}

// Handle category selection
function handleCategoryChange(e) {
  const value = e.target.value;
  const category = categories.find(c => c.name === value);
  
  if (category) {
    selectedCategoryId = category.id;
    
    // Check budget warning for expenses
    if (transactionType === 'expense') {
      checkBudgetWarning(category.id);
    }
  } else {
    selectedCategoryId = null;
  }
}

function handleCategoryBlur(e) {
  const value = e.target.value;
  const category = categories.find(c => c.name === value);
  
  if (!category && value) {
    // Invalid category, clear selection
    selectedCategoryId = null;
  }
}

// Check budget warning
async function checkBudgetWarning(categoryId) {
  const amountInput = document.getElementById('amount');
  const amount = parseCurrency(amountInput.value);
  
  if (!amount || !categoryId) {
    document.getElementById('budgetWarning').classList.add('hidden');
    return;
  }
  
  try {
    const response = await get(`/budgets/check-warning?category_id=${categoryId}&amount=${amount}`);
    const data = response.data;
    
    if (data.hasBudget && data.warning) {
      const warningEl = document.getElementById('budgetWarning');
      warningEl.textContent = `${data.warning.message} - Sisa: Rp ${formatCurrencySimple(data.remaining)}`;
      warningEl.classList.remove('hidden');
    } else {
      document.getElementById('budgetWarning').classList.add('hidden');
    }
  } catch (error) {
    console.error('Budget check error:', error);
  }
}

// Handle file selection
async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const preview = document.getElementById('filePreview');
  
  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran file terlalu besar. Maksimal 5MB', 'danger');
    e.target.value = '';
    return;
  }
  
  // Show preview
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <div class="file-info">
          <span>📎</span>
          <span>${file.name}</span>
          <span>(${(file.size / 1024).toFixed(2)} KB)</span>
        </div>
      `;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = `
      <div class="file-info">
        <span>📄</span>
        <span>${file.name}</span>
        <span>(${(file.size / 1024).toFixed(2)} KB)</span>
      </div>
    `;
    preview.classList.remove('hidden');
  }
  
  // Upload file
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiCall('/upload', {
      method: 'POST',
      body: formData
    });
    
    uploadedFileUrl = response.data.url;
    showToast('File berhasil diupload', 'success');
    
  } catch (error) {
    showToast(error.message || 'Gagal mengupload file', 'danger');
    uploadedFileUrl = null;
  }
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  
  // Clear errors
  clearErrors();
  
  const amountStr = document.getElementById('amount').value;
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value;
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const recurring = document.getElementById('recurring').checked;
  
  // Validate
  let hasError = false;
  
  const amount = parseCurrency(amountStr);
  if (!amount || amount <= 0) {
    showError('amountError', 'Jumlah harus lebih dari 0');
    hasError = true;
  }
  
  if (category && !selectedCategoryId) {
    showError('categoryError', 'Kategori tidak valid. Pilih dari daftar yang tersedia.');
    hasError = true;
  }
  
  if (!date) {
    hasError = true;
  }
  
  if (hasError) return;
  
  // Disable button
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  
  // Build request body
  const body = {
    type: transactionType,
    amount: amount,
    description: description.trim() || null,
    transaction_date: date,
    transaction_time: time || null,
    category_id: selectedCategoryId || null,
    attachment_url: uploadedFileUrl || null
  };
  
  try {
    const response = await post('/transactions', body);
    
    const typeLabel = transactionType === 'income' ? 'Pendapatan' : 'Pengeluaran';
    showToast(`${typeLabel} sebesar Rp ${formatCurrencySimple(amount)} berhasil disimpan!`, 'success');
    
    // Redirect to dashboard after delay
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
    
  } catch (error) {
    showError('generalError', error.message || 'Gagal menyimpan transaksi');
    btn.disabled = false;
    btn.innerHTML = isIncome ? 'Simpan Pendapatan' : 'Simpan Pengeluaran';
  }
}

// Helper: Show error
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
  }
}

// Helper: Clear errors
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
  });
  document.getElementById('budgetWarning').classList.add('hidden');
}

// Update theme icon
function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
