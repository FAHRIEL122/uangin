// ============================================
// UANGIN - Dashboard Logic
// ============================================

// Require authentication
requireAuth();

// Global variables
let transactions = [];
let categories = [];
let chart = null;
let currentMonth = null;
let currentYear = null;
let deleteTransactionId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', initializeDashboard);

async function initializeDashboard() {
  // Set current month/year
  const { month, year } = getCurrentMonthYear();
  currentMonth = month;
  currentYear = year;
  
  // Set selectors
  document.getElementById('monthSelect').value = month;
  
  // Populate year dropdown
  const yearSelect = document.getElementById('yearSelect');
  for (let y = year - 5; y <= year + 1; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === year) option.selected = true;
    yearSelect.appendChild(option);
  }
  
  // Set current date display
  const now = new Date();
  document.getElementById('currentDate').textContent = formatDate(now, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Load user data
  loadUserData();
  
  // Load initial data
  await Promise.all([
    loadTransactions(),
    loadCategories()
  ]);
  
  // Event listeners
  setupEventListeners();
}

// Load user data
async function loadUserData() {
  try {
    const response = await get('/auth/me');
    const user = response.data;
    
    // Update welcome message
    const name = user.full_name || user.username;
    document.getElementById('welcomeMessage').textContent = `Selamat Datang, ${name}!`;
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
}

// Load transactions
async function loadTransactions() {
  try {
    const response = await get(`/transactions?month=${currentMonth}&year=${currentYear}`);
    transactions = response.data.transactions;
    const summary = response.data.summary;
    
    // Update summary cards
    updateSummaryCards(summary);
    
    // Update chart
    updateChart(summary);
    
    // Update transaction table
    renderTransactions();
    
  } catch (error) {
    showToast('Gagal memuat data transaksi', 'danger');
    console.error('Load transactions error:', error);
  }
}

// Load categories
async function loadCategories() {
  try {
    const response = await get('/categories');
    categories = response.data;
    
    // Populate category filter
    const filter = document.getElementById('categoryFilter');
    filter.innerHTML = '<option value="">Semua Kategori</option>';
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      filter.appendChild(option);
    });
    
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Update summary cards
function updateSummaryCards(summary) {
  const income = parseFloat(summary.total_income);
  const expense = parseFloat(summary.total_expense);
  const balance = income - expense;
  
  document.getElementById('totalIncome').textContent = formatCurrency(income);
  document.getElementById('totalExpense').textContent = formatCurrency(expense);
  document.getElementById('netBalance').textContent = formatCurrency(balance);
  
  // Update balance status
  const balanceStatus = document.getElementById('balanceStatus');
  if (balance > 0) {
    balanceStatus.textContent = 'Surplus ✓';
    balanceStatus.style.color = 'var(--success)';
  } else if (balance < 0) {
    balanceStatus.textContent = 'Defisit ⚠️';
    balanceStatus.style.color = 'var(--danger)';
  } else {
    balanceStatus.textContent = 'Seimbang';
    balanceStatus.style.color = 'var(--text-tertiary)';
  }
}

// Update chart
function updateChart(summary) {
  const income = parseFloat(summary.total_income);
  const expense = parseFloat(summary.total_expense);
  
  if (chart) {
    chart.destroy();
  }
  
  const ctx = document.getElementById('financeChart').getContext('2d');
  
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pendapatan', 'Pengeluaran'],
      datasets: [{
        data: [income, expense],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label;
              const value = formatCurrency(context.parsed);
              const total = income + expense;
              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Render transactions
function renderTransactions(filteredTransactions = null) {
  const tbody = document.getElementById('transactionBody');
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('transactionTable');
  
  const data = filteredTransactions || transactions;
  
  if (data.length === 0) {
    tbody.innerHTML = '';
    table.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  table.classList.remove('hidden');
  emptyState.classList.add('hidden');
  
  tbody.innerHTML = data.map(t => {
    const amount = parseFloat(t.amount);
    const typeLabel = t.type === 'income' ? 'Pendapatan' : 'Pengeluaran';
    const typeBadge = t.type === 'income' ? 'badge-income' : 'badge-expense';
    const categoryIcon = t.category_icon || '📌';
    const categoryColor = t.category_color || '#6b7280';
    
    return `
      <tr>
        <td>${formatDateShort(t.transaction_date)}</td>
        <td>${t.description || '-'}</td>
        <td>
          <span style="color: ${categoryColor}">${categoryIcon}</span>
          ${t.category_name || 'Tanpa Kategori'}
        </td>
        <td>
          <span class="badge ${typeBadge}">${typeLabel}</span>
        </td>
        <td class="text-right ${t.type === 'income' ? 'text-success' : 'text-danger'}">
          ${t.type === 'income' ? '+' : '-'} ${formatCurrencySimple(amount)}
        </td>
        <td class="text-center">
          <div class="transaction-actions">
            <button class="btn btn-light btn-sm" onclick="editTransaction('${t.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Month/Year selector
  document.getElementById('monthSelect').addEventListener('change', (e) => {
    currentMonth = parseInt(e.target.value);
    loadTransactions();
  });
  
  document.getElementById('yearSelect').addEventListener('change', (e) => {
    currentYear = parseInt(e.target.value);
    loadTransactions();
  });
  
  // Search
  document.getElementById('searchInput').addEventListener('input', debounce(filterTransactions, 300));
  
  // Category filter
  document.getElementById('categoryFilter').addEventListener('change', filterTransactions);
  
  // Sort
  document.getElementById('sortBy').addEventListener('change', filterTransactions);
  
  // Clear filters
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('sortBy').value = 'date';
    renderTransactions();
  });
  
  // Undo button
  document.getElementById('undoBtn').addEventListener('click', handleUndo);
  
  // Edit last transaction
  document.getElementById('editLastBtn').addEventListener('click', editLastTransaction);
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });
  
  // Navbar toggle (mobile)
  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });
  
  // Save edit button
  document.getElementById('saveEditBtn').addEventListener('click', saveEditTransaction);
  
  // Delete confirm button
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  
  // Update theme icon
  updateThemeIcon();
}

// Filter transactions
function filterTransactions() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;
  const sortBy = document.getElementById('sortBy').value;
  
  let filtered = transactions.filter(t => {
    const matchSearch = !search || 
      (t.description && t.description.toLowerCase().includes(search)) ||
      (t.category_name && t.category_name.toLowerCase().includes(search));
    
    const matchCategory = !categoryFilter || t.category_id == categoryFilter;
    
    return matchSearch && matchCategory;
  });
  
  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.transaction_date) - new Date(a.transaction_date);
    } else {
      return parseFloat(b.amount) - parseFloat(a.amount);
    }
  });
  
  renderTransactions(filtered);
}

// Edit transaction
window.editTransaction = function(id) {
  const transaction = transactions.find(t => t.id == id);
  if (!transaction) return;
  
  document.getElementById('editId').value = id;
  document.getElementById('editAmount').value = formatCurrencySimple(transaction.amount);
  document.getElementById('editDescription').value = transaction.description || '';
  document.getElementById('editDate').value = transaction.transaction_date;
  
  document.getElementById('editModal').classList.add('active');
};

// Edit last transaction
function editLastTransaction() {
  if (transactions.length === 0) {
    showToast('Tidak ada transaksi untuk diedit', 'warning');
    return;
  }
  
  editTransaction(transactions[0].id);
}

// Save edit
async function saveEditTransaction() {
  const id = document.getElementById('editId').value;
  const amount = parseCurrency(document.getElementById('editAmount').value);
  const description = document.getElementById('editDescription').value;
  const date = document.getElementById('editDate').value;
  
  try {
    await put(`/transactions/${id}`, { amount, description, transaction_date: date });
    showToast('Transaksi berhasil diperbarui', 'success');
    hideModal();
    await loadTransactions();
  } catch (error) {
    showToast(error.message || 'Gagal memperbarui transaksi', 'danger');
  }
}

// Delete transaction
window.deleteTransaction = function(id) {
  deleteTransactionId = id;
  document.getElementById('deleteModal').classList.add('active');
};

// Confirm delete
async function confirmDelete() {
  if (!deleteTransactionId) return;
  
  try {
    await del(`/transactions/${deleteTransactionId}`);
    showToast('Transaksi berhasil dihapus', 'success');
    hideModal();
    await loadTransactions();
  } catch (error) {
    showToast(error.message || 'Gagal menghapus transaksi', 'danger');
  }
}

// Undo last transaction
async function handleUndo() {
  if (transactions.length === 0) {
    showToast('Tidak ada transaksi untuk di-undo', 'warning');
    return;
  }
  
  showConfirm(
    'Undo Transaksi',
    'Apakah Anda yakin ingin meng-undo transaksi terakhir?',
    async () => {
      try {
        const response = await post('/transactions/undo');
        showToast(response.message, 'success');
        await loadTransactions();
      } catch (error) {
        showToast(error.message || 'Gagal meng-undo transaksi', 'danger');
      }
    }
  );
}

// Update theme icon
function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Check for modal URL parameter (from redirected income/expense pages)
function checkModalParameter() {
  const urlParams = new URLSearchParams(window.location.search);
  const modalType = urlParams.get('modal');
  
  if (modalType === 'income' || modalType === 'expense') {
    // Wait for everything to load, then open modal
    setTimeout(() => {
      if (typeof openTransactionModal === 'function') {
        openTransactionModal(modalType);
      }
    }, 500);
    
    // Clean URL
    window.history.replaceState({}, document.title, '/dashboard');
  }
}

// Call after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkModalParameter, 100);
});
