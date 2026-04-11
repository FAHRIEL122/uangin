// ============================================
// UANGIN - Reports Logic
// ============================================

requireAuth();

let currentMonth = null;
let currentYear = null;
let allTransactions = []; // Store all transactions for filtering
let categories = []; // Store categories for filter

document.addEventListener('DOMContentLoaded', initializeReport);

async function initializeReport() {
  const { month, year } = getCurrentMonthYear();
  currentMonth = month;
  currentYear = year;
  
  document.getElementById('monthSelect').value = month;
  
  const yearSelect = document.getElementById('yearSelect');
  for (let y = year - 5; y <= year + 1; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === year) option.selected = true;
    yearSelect.appendChild(option);
  }
  
  setupTabs();
  setupEventListeners();
  await loadAllData();
  
  updateThemeIcon();
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tab}-tab`).classList.add('active');
    });
  });
}

function setupEventListeners() {
  document.getElementById('monthSelect').addEventListener('change', (e) => {
    currentMonth = parseInt(e.target.value);
    loadAllData();
  });
  
  document.getElementById('yearSelect').addEventListener('change', (e) => {
    currentYear = parseInt(e.target.value);
    loadAllData();
  });
  
  // Export button - show menu
  document.getElementById('exportBtn').addEventListener('click', showExportMenu);
  
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });
  
  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });
  
  // Report search and filters
  setupFilterEventListeners();
}

// Setup filter event listeners
function setupFilterEventListeners() {
  const searchInput = document.getElementById('reportSearchInput');
  const typeFilter = document.getElementById('reportTypeFilter');
  const categoryFilter = document.getElementById('reportCategoryFilter');
  const sortBy = document.getElementById('reportSortBy');
  const clearBtn = document.getElementById('clearReportFilters');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(applyReportFilters, 300));
  }
  
  if (typeFilter) {
    typeFilter.addEventListener('change', applyReportFilters);
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', applyReportFilters);
  }
  
  if (sortBy) {
    sortBy.addEventListener('change', applyReportFilters);
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearReportFilters);
  }
}

// Apply report filters
function applyReportFilters() {
  const searchTerm = (document.getElementById('reportSearchInput')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('reportTypeFilter')?.value || '';
  const categoryFilter = document.getElementById('reportCategoryFilter')?.value || '';
  const sortBy = document.getElementById('reportSortBy')?.value || 'date-desc';
  
  // Filter transactions
  let filtered = allTransactions.filter(t => {
    // Search filter
    const matchSearch = !searchTerm || 
      (t.description && t.description.toLowerCase().includes(searchTerm)) ||
      (t.category_name && t.category_name.toLowerCase().includes(searchTerm));
    
    // Type filter
    const matchType = !typeFilter || t.type === typeFilter;
    
    // Category filter
    const matchCategory = !categoryFilter || t.category_id == categoryFilter;
    
    return matchSearch && matchType && matchCategory;
  });
  
  // Sort transactions
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.transaction_date) - new Date(a.transaction_date);
      case 'date-asc':
        return new Date(a.transaction_date) - new Date(b.transaction_date);
      case 'amount-desc':
        return parseFloat(b.amount) - parseFloat(a.amount);
      case 'amount-asc':
        return parseFloat(a.amount) - parseFloat(b.amount);
      default:
        return 0;
    }
  });
  
  // Render filtered results
  renderReportTransactions(filtered);
}

// Clear report filters
function clearReportFilters() {
  document.getElementById('reportSearchInput').value = '';
  document.getElementById('reportTypeFilter').value = '';
  document.getElementById('reportCategoryFilter').value = '';
  document.getElementById('reportSortBy').value = 'date-desc';
  
  applyReportFilters();
  showToast('Filter direset', 'success');
}

// Render report transactions
function renderReportTransactions(transactions) {
  const tbody = document.getElementById('transactionBody');
  const empty = document.getElementById('emptyTransactions');
  const countInfo = document.getElementById('transactionCount');
  
  if (transactions.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    if (countInfo) countInfo.textContent = '0 transaksi';
  } else {
    empty.classList.add('hidden');
    
    if (countInfo) {
      const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      countInfo.textContent = `${transactions.length} transaksi | Total: ${formatCurrency(total)}`;
    }
    
    tbody.innerHTML = transactions.map(t => `
      <tr>
        <td>${formatDateShort(t.transaction_date)}</td>
        <td>${t.description || '-'}</td>
        <td>${t.category_icon || '📌'} ${t.category_name || 'Tanpa Kategori'}</td>
        <td><span class="badge badge-${t.type}">${t.type === 'income' ? '💚 Pendapatan' : '❤️ Pengeluaran'}</span></td>
        <td class="text-right ${t.type === 'income' ? 'text-success' : 'text-danger'}">
          ${t.type === 'income' ? '+' : '-'} ${formatCurrencySimple(t.amount)}
        </td>
      </tr>
    `).join('');
  }
}

// Show export menu
function showExportMenu() {
  showModal('📥 Export Data', `
    <p style="margin-bottom: 1rem; color: var(--text-secondary);">Pilih format export:</p>
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <button onclick="exportCSV()" class="btn btn-success btn-block">
        📊 Export ke CSV (Excel)
      </button>
      <button onclick="exportExcel()" class="btn btn-primary btn-block">
        📄 Export ke Excel (.xls)
      </button>
      <button onclick="exportJSON()" class="btn btn-light btn-block">
        💾 Export ke JSON
      </button>
    </div>
  `, [
    { text: 'Batal', class: 'btn-light', action: () => {} }
  ]);
}

// Export to CSV
function exportCSV() {
  hideModal();
  const url = `/api/export/csv?month=${currentMonth}&year=${currentYear}`;
  window.open(url, '_blank');
  showToast('Mengexport data ke CSV...', 'success');
}

// Export to Excel
function exportExcel() {
  hideModal();
  const url = `/api/export/excel?month=${currentMonth}&year=${currentYear}`;
  window.open(url, '_blank');
  showToast('Mengexport data ke Excel...', 'success');
}

// Export to JSON
async function exportJSON() {
  try {
    hideModal();
    showToast('Mengexport data...', 'info');
    const response = await get('/backup');
    
    const dataStr = JSON.stringify(response.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uangin-backup-${currentYear}-${String(currentMonth).padStart(2, '0')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('Data berhasil diexport', 'success');
  } catch (error) {
    showToast(error.message || 'Gagal mengexport data', 'danger');
  }
}

async function loadAllData() {
  await Promise.all([
    loadSummary(),
    loadTransactions(),
    loadCategories(),
    loadBudget(),
    loadInsights()
  ]);
}

async function loadSummary() {
  try {
    const response = await get(`/reports/summary?month=${currentMonth}&year=${currentYear}`);
    const data = response.data;
    
    document.getElementById('totalIncome').textContent = formatCurrency(data.total_income);
    document.getElementById('totalExpense').textContent = formatCurrency(data.total_expense);
    document.getElementById('netBalance').textContent = formatCurrency(data.balance);
    
    // Top expenses
    const container = document.getElementById('topExpenses');
    if (data.top_expense_categories.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">Belum ada pengeluaran</p>';
    } else {
      container.innerHTML = data.top_expense_categories.map(cat => `
        <div class="top-expense-item">
          <div class="top-expense-info">
            <span class="top-expense-icon">${cat.icon}</span>
            <div>
              <div>${cat.name}</div>
              <div class="text-muted" style="font-size: 0.875rem;">${cat.transaction_count} transaksi</div>
            </div>
          </div>
          <div class="top-expense-amount">${formatCurrency(cat.total_amount)}</div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Load summary error:', error);
  }
}

async function loadTransactions() {
  try {
    const response = await get(`/reports/transactions?month=${currentMonth}&year=${currentYear}`);
    allTransactions = response.data;
    
    // Load categories for filter
    await loadReportCategories();
    
    // Render with current filters
    applyReportFilters();
  } catch (error) {
    console.error('Load transactions error:', error);
  }
}

// Load categories for filter dropdown
async function loadReportCategories() {
  try {
    const response = await get('/categories');
    categories = response.data;
    
    const filter = document.getElementById('reportCategoryFilter');
    filter.innerHTML = '<option value="">Semua Kategori</option>';
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${cat.icon || '📌'} ${cat.name}`;
      filter.appendChild(option);
    });
  } catch (error) {
    console.error('Load categories error:', error);
  }
}

async function loadCategories() {
  try {
    const response = await get(`/reports/categories?month=${currentMonth}&year=${currentYear}`);
    const cats = response.data;

    const incomeContainer = document.getElementById('incomeCategories');
    const expenseContainer = document.getElementById('expenseCategories');

    const incomeCats = cats.filter(c => c.type === 'income');
    const expenseCats = cats.filter(c => c.type === 'expense');

    // Render income categories
    if (incomeContainer) {
      if (incomeCats.length === 0) {
        incomeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">Tidak ada data</p>';
      } else {
        incomeContainer.innerHTML = incomeCats.map(cat => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span>${cat.icon}</span>
              <span style="font-size: 0.875rem;">${cat.name}</span>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600; color: var(--success); font-size: 0.9rem;">${formatCurrency(cat.total_amount)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${cat.transaction_count} transaksi</div>
            </div>
          </div>
        `).join('');
      }
    }

    // Render expense categories
    if (expenseContainer) {
      if (expenseCats.length === 0) {
        expenseContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">Tidak ada data</p>';
      } else {
        expenseContainer.innerHTML = expenseCats.map(cat => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span>${cat.icon}</span>
              <span style="font-size: 0.875rem;">${cat.name}</span>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600; color: var(--danger); font-size: 0.9rem;">${formatCurrency(cat.total_amount)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${cat.transaction_count} transaksi</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Load categories error:', error);
  }
}

async function loadBudget() {
  try {
    const response = await get(`/reports/budget?month=${currentMonth}&year=${currentYear}`);
    const budgets = response.data;
    
    const container = document.getElementById('budgetStatus');
    
    if (budgets.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">💰</div><p>Belum ada budget yang ditetapkan</p></div>';
    } else {
      container.innerHTML = budgets.map(b => {
        const pct = parseFloat(b.percentage);
        let barClass = 'safe';
        if (pct > 100) barClass = 'danger';
        else if (pct > 80) barClass = 'warning';
        
        return `
          <div class="budget-item">
            <div class="budget-header">
              <div class="budget-info">
                <span class="budget-icon">${b.category_icon}</span>
                <span class="budget-name">${b.category_name}</span>
              </div>
              <div class="budget-amounts">
                <span class="budget-spent">Terpakai: ${formatCurrency(b.spent_amount)}</span>
                <span class="budget-limit">Budget: ${formatCurrency(b.limit_amount)}</span>
                <span class="budget-remaining">Sisa: ${formatCurrency(b.remaining)}</span>
              </div>
            </div>
            <div class="budget-progress">
              <div class="budget-progress-bar ${barClass}" style="width: ${Math.min(pct, 100)}%"></div>
            </div>
            <div class="budget-percentage ${pct > 100 ? 'text-danger' : pct > 80 ? 'text-warning' : 'text-success'}">
              ${pct.toFixed(1)}%
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Load budget error:', error);
  }
}

async function loadInsights() {
  try {
    const response = await get(`/reports/insights?month=${currentMonth}&year=${currentYear}`);
    const { insights } = response.data;
    
    const container = document.getElementById('insightsList');
    
    if (insights.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">💡</div><p>Belum ada insight bulan ini</p></div>';
    } else {
      container.innerHTML = insights.map(insight => `
        <div class="insight-card" style="--insight-color: ${
          insight.type === 'success' ? 'var(--success)' :
          insight.type === 'danger' ? 'var(--danger)' :
          insight.type === 'warning' ? 'var(--warning)' : 'var(--info)'
        }">
          <span class="insight-icon">${insight.icon}</span>
          <div class="insight-message">
            <p>${insight.message}</p>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Load insights error:', error);
  }
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
