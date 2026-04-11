// ============================================
// UANGIN - Reports Logic
// ============================================

requireAuth();

let currentMonth = null;
let currentYear = null;
let allTransactions = [];
let categories = [];
let financeChart = null;
let trendChart = null;

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

  document.getElementById('exportBtn').addEventListener('click', showExportMenu);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });

  setupFilterEventListeners();
}

function setupFilterEventListeners() {
  const searchInput = document.getElementById('reportSearchInput');
  const typeFilter = document.getElementById('reportTypeFilter');
  const categoryFilter = document.getElementById('reportCategoryFilter');
  const sortBy = document.getElementById('reportSortBy');
  const clearBtn = document.getElementById('clearReportFilters');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => filterTransactions(), 300));
  }
  if (typeFilter) typeFilter.addEventListener('change', filterTransactions);
  if (categoryFilter) categoryFilter.addEventListener('change', filterTransactions);
  if (sortBy) sortBy.addEventListener('change', filterTransactions);
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      typeFilter.value = '';
      categoryFilter.value = '';
      sortBy.value = 'date-desc';
      filterTransactions();
    });
  }
}

async function loadAllData() {
  try {
    await Promise.all([
      loadSummary(),
      loadTransactions(),
      loadCategories(),
      loadBudget(),
      loadChart()
    ]);
  } catch (error) {
    console.error('Load data error:', error);
  }
}

async function loadSummary() {
  try {
    const response = await get(`/reports/summary?month=${currentMonth}&year=${currentYear}`);
    const data = response.data;

    document.getElementById('totalIncome').textContent = formatCurrency(data.total_income || 0);
    document.getElementById('totalExpense').textContent = formatCurrency(data.total_expense || 0);
    document.getElementById('netBalance').textContent = formatCurrency(data.balance || 0);
    document.getElementById('incomeCount').textContent = `${data.income_count || 0} transaksi`;
    document.getElementById('expenseCount').textContent = `${data.expense_count || 0} transaksi`;

    const balanceEl = document.getElementById('balanceStatus');
    if (data.balance > 0) {
      balanceEl.textContent = 'Surplus';
      balanceEl.className = 'stat-card-trend positive';
    } else if (data.balance < 0) {
      balanceEl.textContent = 'Defisit';
      balanceEl.className = 'stat-card-trend negative';
    } else {
      balanceEl.textContent = 'Seimbang';
      balanceEl.className = 'stat-card-trend';
    }
  } catch (error) {
    console.error('Load summary error:', error);
  }
}

async function loadTransactions() {
  try {
    const response = await get(`/reports/transactions?month=${currentMonth}&year=${currentYear}`);
    allTransactions = response.data || [];

    // Populate category filter
    const categoryFilter = document.getElementById('reportCategoryFilter');
    const uniqueCats = [...new Map(allTransactions.map(t => [t.category_id, { id: t.category_id, name: t.category_name, icon: t.category_icon }])).values()];
    
    categoryFilter.innerHTML = '<option value="">Semua Kategori</option>' +
      uniqueCats.map(c => `<option value="${c.id}">${c.icon || '📁'} ${c.name}</option>`).join('');

    filterTransactions();
  } catch (error) {
    console.error('Load transactions error:', error);
  }
}

function filterTransactions() {
  const search = (document.getElementById('reportSearchInput')?.value || '').toLowerCase();
  const type = document.getElementById('reportTypeFilter')?.value || '';
  const categoryId = document.getElementById('reportCategoryFilter')?.value || '';
  const sortBy = document.getElementById('reportSortBy')?.value || 'date-desc';

  let filtered = allTransactions.filter(t => {
    const matchSearch = !search || 
      (t.description && t.description.toLowerCase().includes(search)) ||
      (t.category_name && t.category_name.toLowerCase().includes(search));
    const matchType = !type || t.type === type;
    const matchCategory = !categoryId || t.category_id == categoryId;
    return matchSearch && matchType && matchCategory;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc': return new Date(b.transaction_date) - new Date(a.transaction_date);
      case 'date-asc': return new Date(a.transaction_date) - new Date(b.transaction_date);
      case 'amount-desc': return parseFloat(b.amount) - parseFloat(a.amount);
      default: return 0;
    }
  });

  renderTransactions(filtered);
}

function renderTransactions(transactions) {
  const tbody = document.getElementById('transactionBody');
  const emptyState = document.getElementById('emptyTransactions');
  const countEl = document.getElementById('transactionCount');

  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (countEl) countEl.textContent = '';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${formatDateShort(t.transaction_date)}</td>
      <td>${t.description || '-'}</td>
      <td>${t.category_icon || '📁'} ${t.category_name || '-'}</td>
      <td><span class="badge badge-${t.type}">${t.type === 'income' ? 'Masuk' : 'Keluar'}</span></td>
      <td class="text-right ${t.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(t.amount)}</td>
    </tr>
  `).join('');

  if (countEl) {
    countEl.textContent = `Menampilkan ${transactions.length} transaksi`;
  }
}

async function loadChart() {
  try {
    const response = await get(`/reports/summary?month=${currentMonth}&year=${currentYear}`);
    const data = response.data;

    // Finance distribution chart
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    if (financeChart) financeChart.destroy();

    financeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pendapatan', 'Pengeluaran'],
        datasets: [{
          data: [data.total_income || 0, data.total_expense || 0],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
        }
      }
    });

    // Load monthly trend chart
    await loadTrendChart();
  } catch (error) {
    console.error('Load chart error:', error);
  }
}

// Get chart theme colors
function getChartThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#d1d5db' : '#6b7280',
    grid: isDark ? '#374151' : '#e5e7eb',
    background: isDark ? '#1f2937' : '#ffffff'
  };
}

async function loadTrendChart() {
  try {
    const response = await get(`/reports/monthly-trend?year=${currentYear}`);
    const data = response.data || [];

    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const theme = getChartThemeColors();

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month_name),
        datasets: [
          {
            label: 'Pendapatan',
            data: data.map(d => d.income),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Pengeluaran',
            data: data.map(d => d.expense),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { color: theme.text, padding: 20, usePointStyle: true } 
          }
        },
        scales: {
          x: {
            ticks: { color: theme.text },
            grid: { color: theme.grid }
          },
          y: { 
            beginAtZero: true, 
            ticks: { color: theme.text, callback: v => formatCurrencySimple(v) },
            grid: { color: theme.grid }
          }
        }
      }
    });
  } catch (error) {
    console.error('Load trend error:', error);
  }
}

async function loadCategories() {
  try {
    const response = await get(`/reports/categories?month=${currentMonth}&year=${currentYear}`);
    const cats = response.data || [];

    const incomeContainer = document.getElementById('incomeCategories');
    const expenseContainer = document.getElementById('expenseCategories');

    const incomeCats = cats.filter(c => c.type === 'income');
    const expenseCats = cats.filter(c => c.type === 'expense');

    // Render income
    if (incomeContainer) {
      if (incomeCats.length === 0) {
        incomeContainer.innerHTML = '<p class="text-muted" style="font-size: 0.875rem;">Tidak ada data</p>';
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

    // Render expense
    if (expenseContainer) {
      if (expenseCats.length === 0) {
        expenseContainer.innerHTML = '<p class="text-muted" style="font-size: 0.875rem;">Tidak ada data</p>';
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
    const budgets = response.data || [];

    const container = document.getElementById('budgetStatus');
    if (!container) return;

    if (budgets.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><h3 class="empty-state-title">Belum ada budget</h3><p class="empty-state-text">Tetapkan budget di halaman dashboard</p></div>';
      return;
    }

    container.innerHTML = budgets.map(b => {
      const pct = parseFloat(b.percentage || 0);
      let barClass = '';
      if (pct > 100) barClass = 'danger';
      else if (pct > 80) barClass = 'warning';
      else barClass = 'success';

      return `
        <div style="padding: var(--space-4) 0; border-bottom: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
            <span style="display: flex; align-items: center; gap: var(--space-2);">
              <span>${b.category_icon}</span>
              <span style="font-weight: 600; font-size: 0.9rem;">${b.category_name}</span>
            </span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${pct.toFixed(0)}%</span>
          </div>
          <div class="progress-bar" style="height: 6px; margin-bottom: var(--space-2);">
            <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(pct, 100)}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
            <span>Terpakai: ${formatCurrency(b.spent_amount)}</span>
            <span>Budget: ${formatCurrency(b.limit_amount)}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Load budget error:', error);
  }
}

async function loadTopExpenses() {
  try {
    const response = await get(`/reports/top-expenses?month=${currentMonth}&year=${currentYear}&limit=5`);
    const expenses = response.data || [];

    const container = document.getElementById('topExpenses');
    if (!container) return;

    if (expenses.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size: 0.875rem;">Tidak ada pengeluaran</p>';
      return;
    }

    container.innerHTML = expenses.map((t, i) => `
      <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--border);">
        <span style="width: 24px; height: 24px; background: var(--danger-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--danger);">${i + 1}</span>
        <div style="flex: 1;">
          <div style="font-size: 0.875rem; font-weight: 500;">${t.description || '-'}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDateShort(t.transaction_date)}</div>
        </div>
        <div style="font-weight: 600; color: var(--danger); font-size: 0.9rem;">${formatCurrency(t.amount)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load top expenses error:', error);
  }
}

// Export menu
function showExportMenu() {
  showModal('📥 Export Data', `
    <p style="margin-bottom: 1rem; color: var(--text-secondary);">Pilih format export:</p>
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <button onclick="exportCSV()" class="btn btn-success btn-block">
        📊 Export ke CSV (Google Sheets)
      </button>
      <button onclick="exportExcel()" class="btn btn-primary btn-block">
        📄 Export ke Excel (.xls)
      </button>
    </div>
    <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
      💡 CSV bisa dibuka di Google Sheets atau Excel
    </p>
  `, [{ text: 'Batal', class: 'btn-ghost', action: () => {} }]);
}

function exportCSV() {
  hideModal();
  const url = `/api/export/csv?month=${currentMonth}&year=${currentYear}`;
  window.location.href = url;
  showToast('Mengexport data ke CSV...', 'success');
}

function exportExcel() {
  hideModal();
  const url = `/api/export/excel?month=${currentMonth}&year=${currentYear}`;
  window.location.href = url;
  showToast('Mengexport data ke Excel...', 'success');
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Load top expenses after summary
const originalLoadSummary = loadSummary;
loadSummary = async function() {
  await originalLoadSummary();
  await loadTopExpenses();
};
