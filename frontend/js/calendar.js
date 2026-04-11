// ============================================
// UANGIN - Calendar Logic
// ============================================

requireAuth();

let transactions = [];
let currentMonth = null;
let currentYear = null;

document.addEventListener('DOMContentLoaded', initializeCalendar);

async function initializeCalendar() {
  const { month, year } = getCurrentMonthYear();
  currentMonth = month;
  currentYear = year;
  
  await loadTransactions();
  renderCalendar();
  setupEventListeners();
  
  updateThemeIcon();
}

async function loadTransactions() {
  try {
    const response = await get('/transactions/all');
    transactions = response.data;
  } catch (error) {
    showToast('Gagal memuat data transaksi', 'danger');
    console.error('Load transactions error:', error);
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('currentMonth');
  
  monthLabel.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
  
  // Clear grid
  grid.innerHTML = '';
  
  // Day headers
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  days.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });
  
  // Get first day of month
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const today = new Date();
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }
  
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check if today
    if (today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth && today.getDate() === day) {
      dayCell.classList.add('today');
    }
    
    // Get transactions for this day
    const dayTransactions = transactions.filter(t => t.transaction_date === dateStr);
    
    if (dayTransactions.length > 0) {
      dayCell.classList.add('has-transactions');
    }
    
    // Day number
    const number = document.createElement('div');
    number.className = 'day-number';
    number.textContent = day;
    dayCell.appendChild(number);
    
    // Day indicators
    if (dayTransactions.length > 0) {
      const indicators = document.createElement('div');
      indicators.className = 'day-indicators';
      
      dayTransactions.slice(0, 6).forEach(t => {
        const dot = document.createElement('div');
        dot.className = `day-dot ${t.type}`;
        indicators.appendChild(dot);
      });
      
      dayCell.appendChild(indicators);
    }
    
    // Click handler
    dayCell.addEventListener('click', () => showDayTransactions(dateStr, dayTransactions));
    
    grid.appendChild(dayCell);
  }
}

function showDayTransactions(dateStr, dayTransactions) {
  const details = document.getElementById('transactionDetails');
  const dateLabel = document.getElementById('selectedDate');
  const container = document.getElementById('dayTransactions');
  
  dateLabel.textContent = `Transaksi tanggal ${formatDate(dateStr)}`;
  
  if (dayTransactions.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Tidak ada transaksi</p>';
  } else {
    container.innerHTML = dayTransactions.map(t => `
      <div class="day-transaction">
        <div class="transaction-info">
          <span class="transaction-icon">${t.category_icon || '📌'}</span>
          <div class="transaction-details-text">
            <div class="transaction-description">${t.description || 'Tanpa deskripsi'}</div>
            <div class="transaction-category">${t.category_name || 'Tanpa Kategori'}</div>
          </div>
        </div>
        <div class="transaction-amount ${t.type}">
          ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
        </div>
      </div>
    `).join('');
  }
  
  details.classList.remove('hidden');
  details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setupEventListeners() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    renderCalendar();
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

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
