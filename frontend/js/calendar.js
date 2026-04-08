// Calendar Module
let currentDate = new Date();
let allTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
  redirectIfNotAuthenticated();
  loadAllTransactions();
});

// Load all transactions
const loadAllTransactions = async () => {
  try {
    const response = await apiCall('/transactions/all');
    allTransactions = response.data;
    renderCalendar();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
};

// Render calendar
const renderCalendar = () => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Update title
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  document.getElementById('monthYearTitle').textContent = `${monthNames[month]} ${year}`;

  // Get first day and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const body = document.getElementById('calendarBody');
  body.innerHTML = '';

  let date = 1;
  let nextDate = 1;

  for (let i = 0; i < 6; i++) {
    const row = document.createElement('tr');

    for (let j = 0; j < 7; j++) {
      const cell = document.createElement('td');

      if (i === 0 && j < firstDay) {
        // Previous month days
        const prevDate = daysInPrevMonth - firstDay + j + 1;
        cell.innerHTML = `
          <div class="calendar-date-num other-month">${prevDate}</div>
        `;
      } else if (date > daysInMonth) {
        // Next month days
        cell.innerHTML = `
          <div class="calendar-date-num other-month">${nextDate}</div>
        `;
        nextDate++;
      } else {
        // Current month days
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

        // Check if today
        const today = new Date();
        const isToday = dateStr === today.toISOString().substring(0, 10);

        // Get transactions for this date
        const dayTransactions = allTransactions.filter(tx => tx.transaction_date === dateStr);

        let classAttr = isToday ? 'today' : '';
        let html = `
          <div class="calendar-date-num">${date}</div>
        `;

        if (dayTransactions.length > 0) {
          html += '<div class="calendar-transactions">';
          dayTransactions.slice(0, 3).forEach(tx => {
            const amountStr = `${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount)}`.substring(0, 15);
            html += `
              <div class="calendar-transaction-item ${tx.type}" title="${tx.category_name}: ${formatCurrency(tx.amount)}">
                ${tx.category_name}
              </div>
            `;
          });
          if (dayTransactions.length > 3) {
            html += `<div style="font-size: 10px; padding: 2px 4px;">+${dayTransactions.length - 3} lagi</div>`;
          }
          html += '</div>';
        }

        cell.className = classAttr;
        cell.innerHTML = html;
        date++;
      }

      row.appendChild(cell);
    }

    body.appendChild(row);

    if (date > daysInMonth) break;
  }
};

// Previous month
const previousMonth = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

// Next month
const nextMonth = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};
