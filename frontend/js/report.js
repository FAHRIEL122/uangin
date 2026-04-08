/* =========================
   UANGIN – Report Module
   ========================= */

let currentTab = 'ringkasan';
const reportCache = {};
let budgetCategories = [];

const parseBudgetAmount = (value) => {
  if (!value) return 0;
  const cleaned = String(value)
    .trim()
    .replace(/[^\d.,-]/g, '');
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
};

const initBudgetForm = async () => {
  const saveBtn = document.getElementById('saveBudgetBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveBudget);
  }
  await loadBudgetCategories();
};

const loadBudgetCategories = async () => {
  try {
    const response = await apiCall('/categories', { showLoading: false });
    budgetCategories = response.data.filter(c => c.type === 'expense');
    const select = document.getElementById('budgetCategory');
    if (!select) return;

    const options = budgetCategories
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join('');

    select.innerHTML = `<option value="">Pilih kategori</option>${options}`;
  } catch (err) {
    // ignore
  }
};

const saveBudget = async () => {
  const categoryId = document.getElementById('budgetCategory')?.value;
  const amountRaw = document.getElementById('budgetAmount')?.value;
  const infoEl = document.getElementById('budgetFormInfo');
  if (infoEl) infoEl.textContent = '';

  const amount = parseBudgetAmount(amountRaw);
  const month = document.getElementById('reportMonth')?.value;
  const year = document.getElementById('reportYear')?.value;

  if (!categoryId) {
    showAlert('Silakan pilih kategori untuk budget', 'danger');
    return;
  }
  if (!amount || amount <= 0) {
    showAlert('Jumlah budget harus lebih dari 0', 'danger');
    return;
  }

  disableButton('saveBudgetBtn');

  try {
    await apiCall('/budgets', {
      method: 'POST',
      body: JSON.stringify({
        category_id: categoryId,
        limit_amount: amount,
        month,
        year,
      }),
    });
    showToast('Budget berhasil disimpan', 'success');
    const amountInput = document.getElementById('budgetAmount');
    if (amountInput) amountInput.value = '';
    loadReport();
  } catch (err) {
    showAlert(err.message, 'danger');
  } finally {
    enableButton('saveBudgetBtn', 'Simpan Budget');
  }
};

/* =========================
   INIT
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  if (!redirectIfNotAuthenticated()) return;

  const { month, year } = getCurrentMonth();
  document.getElementById('reportMonth').value = month;
  document.getElementById('reportYear').value = year;

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', e => {
      switchTab(e.target.dataset.tab);
      loadReport();
    });
  });

  initBudgetForm();
  loadReport();
});

/* =========================
   TAB HANDLER
   ========================= */
const switchTab = (tab) => {
  currentTab = tab;

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.querySelectorAll('.report-section').forEach(section => {
    section.classList.toggle('active', section.dataset.section === tab);
  });

  const titles = {
    ringkasan: '📈 Laporan Ringkasan',
    transaksi: '📋 Daftar Transaksi',
    kategori: '🏷️ Laporan Kategori',
    budget: '💰 Laporan Budget',
    insight: '✨ Insight Otomatis'
  };

  document.getElementById('reportTitle').textContent = titles[tab];
};

/* =========================
   CORE LOADER
   ========================= */
const loadReport = async () => {
  clearAlerts();

  const month = document.getElementById('reportMonth')?.value;
  const year = document.getElementById('reportYear')?.value;
  const cacheKey = `${currentTab}_${month}_${year}`;

  showLoading(currentTab);

  if (reportCache[cacheKey]) {
    renderCachedData(currentTab, reportCache[cacheKey]);
    hideLoading(currentTab);
    return;
  }

  try {
    let data;
    switch (currentTab) {
      case 'ringkasan':
        data = await fetchSummary(month, year);
        renderSummary(data);
        break;
      case 'transaksi':
        data = await fetchTransactions(month, year);
        renderTransactions(data);
        break;
      case 'kategori':
        data = await fetchCategories(month, year);
        renderCategories(data);
        break;
      case 'budget':
        data = await fetchBudgets(month, year);
        renderBudgets(data);
        break;
      case 'insight':
        data = await fetchInsights(month, year);
        renderInsights(data);
        break;
    }

    reportCache[cacheKey] = data;
  } catch (err) {
    showAlert(err.message, 'danger');
  } finally {
    hideLoading(currentTab);
  }
};

/* =========================
   FETCHERS
   ========================= */
const fetchSummary = async (m, y) =>
  (await apiCall(`/reports/summary?month=${m}&year=${y}`)).data;

const fetchTransactions = async (m, y) => {
  const type = document.getElementById('transactionFilter')?.value;
  const url = `/reports/transactions?month=${m}&year=${y}${type ? `&type=${type}` : ''}`;
  return (await apiCall(url)).data;
};

const fetchCategories = async (m, y) =>
  (await apiCall(`/reports/categories?month=${m}&year=${y}`)).data;

const fetchBudgets = async (m, y) =>
  (await apiCall(`/reports/budget?month=${m}&year=${y}`)).data;

const fetchInsights = async (m, y) =>
  (await apiCall(`/reports/insights?month=${m}&year=${y}`)).data?.insights || [];

/* =========================
   RENDERERS
   ========================= */
const renderSummary = (d) => {
  summaryCards.innerHTML = `
    ${summaryCard('Total Pendapatan', formatCurrency(d.total_income), 'income')}
    ${summaryCard('Total Pengeluaran', formatCurrency(d.total_expense), 'expense')}
    ${summaryCard('Saldo Bersih', formatCurrency(d.net_balance))}
    ${summaryCard('Total Transaksi', d.transaction_count)}
  `;

  summaryTable.innerHTML = `
    ${summaryRow('Total Pendapatan', d.total_income, 'income')}
    ${summaryRow('Total Pengeluaran', d.total_expense, 'expense')}
    ${summaryRow('Saldo Bersih', d.net_balance, 'bold')}
    ${summaryRow(
      'Rata-rata Pengeluaran',
      d.expense_count ? d.total_expense / d.expense_count : 0
    )}
  `;
};

const renderTransactions = (list) => {
  if (!list.length) {
    transactionTable.innerHTML = emptyRow(5, 'Tidak ada transaksi');
    return;
  }

  transactionTable.innerHTML = list.map(tx => `
    <tr>
      <td>${formatDate(tx.transaction_date)}</td>
      <td>${tx.category_name}</td>
      <td>${tx.description || '—'}</td>
      <td class="${tx.type}">
        ${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount)}
      </td>
      <td><span class="badge ${getBadgeClassByType(tx.type)}">
        ${tx.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}
      </span></td>
    </tr>
  `).join('');
};

const renderCategories = (list) => {
  if (!list.length) {
    categoryTable.innerHTML = emptyRow(4, 'Tidak ada data kategori');
    return;
  }

  categoryTable.innerHTML = list.map(c => `
    <tr>
      <td><strong>${c.category_name}</strong></td>
      <td><span class="badge ${getBadgeClassByType(c.type)}">
        ${c.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}
      </span></td>
      <td class="text-right">${c.transaction_count}</td>
      <td class="${c.type}">${formatCurrency(c.total_amount)}</td>
    </tr>
  `).join('');
};

const renderBudgets = (data) => {
  budgetSummary.innerHTML = `
    ${summaryCard('Total Budget', data.budgets.length)}
    ${summaryCard('Terlampaui', data.summary.exceeded_count, 'expense')}
    ${summaryCard('Peringatan', data.summary.warning_count)}
    ${summaryCard('OK', data.summary.ok_count)}
  `;

  if (!data.budgets.length) {
    budgetList.innerHTML = emptyText('Belum ada budget');
    return;
  }

  budgetList.innerHTML = data.budgets.map(renderBudgetItem).join('');
};

const renderInsights = (list) => {
  if (!list.length) {
    insightCards.innerHTML = emptyText('Belum ada insight');
    return;
  }

  insightCards.innerHTML = list.map(i => `
    <div class="insight-card">
      <div class="insight-type">${i.type.replace(/_/g, ' ').toUpperCase()}</div>
      <div class="insight-message">${i.message}</div>
    </div>
  `).join('');
};

/* =========================
   UI HELPERS
   ========================= */
const summaryCard = (label, value, cls = '') => `
  <div class="summary-item ${cls}">
    <div class="summary-label">${label}</div>
    <div class="summary-value">${value}</div>
  </div>
`;

const summaryRow = (label, value, cls = '') => `
  <tr>
    <td>${label}</td>
    <td class="${cls}">${formatCurrency(value)}</td>
  </tr>
`;

const emptyRow = (col, text) =>
  `<tr><td colspan="${col}" class="text-center">${text}</td></tr>`;

const emptyText = (text) =>
  `<p class="text-center text-muted">${text}</p>`;

const renderCachedData = (tab, data) => {
  ({
    ringkasan: () => renderSummary(data),
    transaksi: () => renderTransactions(data),
    kategori: () => renderCategories(data),
    budget: () => renderBudgets(data),
    insight: () => renderInsights(data)
  })[tab]();
};
