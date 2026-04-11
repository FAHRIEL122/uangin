// ============================================
// UANGIN - Calendar & Todo Logic
// ============================================

requireAuth();

let currentMonth = null;
let currentYear = null;
let allTransactions = [];
let todos = [];

document.addEventListener('DOMContentLoaded', initializeCalendar);

async function initializeCalendar() {
  const now = new Date();
  currentMonth = now.getMonth() + 1;
  currentYear = now.getFullYear();

  setupTabs();
  setupEventListeners();
  setupTodoForm();
  await Promise.all([loadTransactions(), loadTodos()]);
  renderCalendar();
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
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    loadAllData();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    loadAllData();
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

  document.getElementById('navbarToggle').addEventListener('click', () => {
    document.getElementById('navbarMenu').classList.toggle('active');
  });
}

// ===== TODO LIST =====

function setupTodoForm() {
  const form = document.getElementById('addTodoForm');
  const input = document.getElementById('todoInput');
  const dateInput = document.getElementById('todoDate');
  const prioritySelect = document.getElementById('todoPriority');

  // Set default date to today
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = input.value.trim();
      const date = dateInput.value;
      const priority = prioritySelect.value;

      if (!title) return;

      try {
        await post('/todos', { title, due_date: date || null, priority });
        showToast('Tugas berhasil ditambahkan', 'success');
        input.value = '';
        hideAddTodoForm();
        await loadTodos();
      } catch (error) {
        showToast('Gagal menambahkan tugas: ' + error.message, 'danger');
      }
    });
  }
}

async function loadTodos() {
  try {
    const response = await get('/todos');
    todos = response.data || [];
    renderTodos();
  } catch (error) {
    console.error('Load todos error:', error);
  }
}

function renderTodos() {
  const container = document.getElementById('todoList');
  if (!container) return;

  if (todos.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><h3 class="empty-state-title">Belum ada tugas</h3><p class="empty-state-text">Tambahkan tugas pertama Anda</p></div>';
    return;
  }

  // Sort: incomplete first, then by priority, then by date
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
    return new Date(a.due_date || '9999') - new Date(b.due_date || '9999');
  });

  container.innerHTML = sorted.map(todo => {
    const priorityColors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
    const priorityLabels = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
    const isOverdue = todo.due_date && new Date(todo.due_date) < new Date().setHours(0,0,0,0) && !todo.completed;

    return `
      <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--border); ${todo.completed ? 'opacity: 0.6;' : ''}">
        <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})" style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;">
        <div style="flex: 1; ${todo.completed ? 'text-decoration: line-through;' : ''}">
          <div style="font-size: 0.9rem; font-weight: ${todo.completed ? '400' : '500'};">${todo.title}</div>
          <div style="display: flex; gap: var(--space-3); margin-top: var(--space-1);">
            ${todo.due_date ? `<span style="font-size: 0.75rem; color: ${isOverdue ? 'var(--danger)' : 'var(--text-muted)'};">📅 ${formatDateShort(todo.due_date)}</span>` : ''}
            <span style="font-size: 0.75rem; color: ${priorityColors[todo.priority]};">● ${priorityLabels[todo.priority]}</span>
          </div>
        </div>
        <button class="btn btn-icon btn-sm" onclick="deleteTodo(${todo.id})" title="Hapus" style="color: var(--text-muted);">🗑️</button>
      </div>
    `;
  }).join('');
}

window.showAddTodoModal = function() {
  document.getElementById('addTodoForm').style.display = 'block';
  document.getElementById('todoInput').focus();
};

window.hideAddTodoForm = function() {
  document.getElementById('addTodoForm').style.display = 'none';
};

window.toggleTodo = async function(id) {
  try {
    const todo = todos.find(t => t.id === id);
    await put(`/todos/${id}`, { completed: !todo.completed });
    showToast(todo.completed ? 'Tugas diaktifkan kembali' : 'Tugas selesai! 🎉', 'success');
    await loadTodos();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'danger');
  }
};

window.deleteTodo = async function(id) {
  try {
    await del(`/todos/${id}`);
    showToast('Tugas dihapus', 'success');
    await loadTodos();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'danger');
  }
};

// ===== CALENDAR =====

async function loadAllData() {
  await Promise.all([loadTransactions(), loadTodos()]);
  renderCalendar();
}

async function loadTransactions() {
  try {
    const response = await get(`/reports/transactions?month=${currentMonth}&year=${currentYear}`);
    allTransactions = response.data || [];
  } catch (error) {
    console.error('Load transactions error:', error);
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('currentMonth');
  
  if (!grid || !monthLabel) return;

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  monthLabel.textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const today = new Date();

  // Group transactions by date
  const transactionsByDate = {};
  allTransactions.forEach(t => {
    const date = t.transaction_date;
    if (!transactionsByDate[date]) transactionsByDate[date] = [];
    transactionsByDate[date].push(t);
  });

  let html = '';
  
  // Day headers
  dayNames.forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = today.getDate() === day && today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;
    const dayTransactions = transactionsByDate[dateStr] || [];
    const dayTodos = todos.filter(t => t.due_date === dateStr);
    
    const incomeTotal = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenseTotal = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const hasTransactions = dayTransactions.length > 0;
    const hasTodos = dayTodos.length > 0;

    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasTransactions ? 'has-transactions' : ''}" 
           onclick="showDayDetail('${dateStr}', ${day})">
        <div class="calendar-day-number">${day}</div>
        ${hasTransactions ? `
          <div class="calendar-day-indicators">
            ${incomeTotal > 0 ? `<span class="indicator income" title="Pendapatan: ${formatCurrency(incomeTotal)}">↓</span>` : ''}
            ${expenseTotal > 0 ? `<span class="indicator expense" title="Pengeluaran: ${formatCurrency(expenseTotal)}">↑</span>` : ''}
          </div>
        ` : ''}
        ${hasTodos ? `<span class="todo-indicator" title="${dayTodos.length} tugas">●</span>` : ''}
        ${hasTransactions ? `<div class="calendar-day-summary">${dayTransactions.length} transaksi</div>` : ''}
      </div>
    `;
  }

  grid.innerHTML = html;
}

window.showDayDetail = function(dateStr, day) {
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  
  const date = new Date(dateStr);
  const dayName = dayNames[date.getDay()];
  
  const modalTitle = document.getElementById('dayModalTitle');
  const modalContent = document.getElementById('dayModalContent');
  
  if (modalTitle) modalTitle.textContent = `${dayName}, ${day} ${monthNames[currentMonth - 1]} ${currentYear}`;
  
  const dayTransactions = allTransactions.filter(t => t.transaction_date === dateStr);
  const dayTodos = todos.filter(t => t.due_date === dateStr);
  
  let html = '';
  
  // Transactions
  if (dayTransactions.length > 0) {
    html += '<h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: var(--space-3);">💳 Transaksi</h4>';
    html += dayTransactions.map(t => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span>${t.category_icon || '📁'}</span>
          <div>
            <div style="font-size: 0.875rem; font-weight: 500;">${t.description || '-'}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${t.category_name || '-'}</div>
          </div>
        </div>
        <div style="font-weight: 600; color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}; font-size: 0.9rem;">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</div>
      </div>
    `).join('');
    
    // Summary
    const incomeTotal = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenseTotal = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    html += `
      <div style="margin-top: var(--space-4); padding: var(--space-3); background: var(--gray-50); border-radius: var(--radius); display: flex; justify-content: space-between; font-size: 0.875rem;">
        <span style="color: var(--success);">Pendapatan: ${formatCurrency(incomeTotal)}</span>
        <span style="color: var(--danger);">Pengeluaran: ${formatCurrency(expenseTotal)}</span>
      </div>
    `;
  }
  
  // Todos
  if (dayTodos.length > 0) {
    html += '<h4 style="font-size: 0.875rem; font-weight: 600; margin: var(--space-4) 0 var(--space-3);">📝 Tugas</h4>';
    html += dayTodos.map(todo => `
      <div style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0; border-bottom: 1px solid var(--border); ${todo.completed ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
        <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})" style="width: 16px; height: 16px;">
        <span style="font-size: 0.875rem;">${todo.title}</span>
      </div>
    `).join('');
  }
  
  if (!html) {
    html = '<div class="empty-state" style="padding: var(--space-8);"><div class="empty-state-icon">📭</div><p class="text-muted">Tidak ada transaksi atau tugas</p></div>';
  }
  
  if (modalContent) modalContent.innerHTML = html;
  
  showModalById('dayModal');
};

window.closeDayModal = function() {
  hideModalById('dayModal');
};

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}
