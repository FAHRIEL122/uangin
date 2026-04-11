/**
 * Browser Notification System
 * Integrates with Todo and Budget for reminders
 */

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Browser tidak mendukung notifikasi');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Send notification
function sendNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag || 'uangin-notification',
      requireInteraction: options.requireInteraction || false,
      ...options
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
  return null;
}

// Check for todo reminders
async function checkTodoReminders() {
  try {
    const todos = await get('/todos');
    const today = new Date().toISOString().split('T')[0];
    
    // Find todos due today or overdue
    const dueTodos = (todos.data || []).filter(todo => {
      if (todo.completed) return false;
      if (!todo.due_date) return false;
      return todo.due_date <= today;
    });

    if (dueTodos.length > 0) {
      const overdueCount = dueTodos.filter(t => t.due_date < today).length;
      const dueTodayCount = dueTodos.filter(t => t.due_date === today).length;

      let message = '';
      if (overdueCount > 0 && dueTodayCount > 0) {
        message = `${overdueCount} tugas terlambat, ${dueTodayCount} tugas hari ini`;
      } else if (overdueCount > 0) {
        message = `${overdueCount} tugas sudah terlambat!`;
      } else {
        message = `${dueTodayCount} tugas harus diselesaikan hari ini`;
      }

      sendNotification('📝 Pengingat Tugas', {
        body: message,
        tag: 'todo-reminder'
      });
    }
  } catch (error) {
    console.error('Check todo reminders error:', error);
  }
}

// Check for budget warnings
async function checkBudgetWarnings() {
  try {
    const { month, year } = getCurrentMonthYear();
    const response = await get(`/reports/budget?month=${month}&year=${year}`);
    const budgets = response.data || [];

    const warningBudgets = budgets.filter(b => {
      const percentage = parseFloat(b.percentage || 0);
      return percentage >= 80; // Warn at 80% usage
    });

    if (warningBudgets.length > 0) {
      const overBudget = warningBudgets.filter(b => parseFloat(b.percentage) > 100).length;
      const nearLimit = warningBudgets.length - overBudget;

      let message = '';
      if (overBudget > 0 && nearLimit > 0) {
        message = `${overBudget} kategori melebihi budget, ${nearLimit} hampir habis`;
      } else if (overBudget > 0) {
        message = `${overBudget} kategori sudah melebihi budget!`;
      } else {
        message = `${nearLimit} kategori budget hampir habis (80%+)`;
      }

      sendNotification('💰 Peringatan Budget', {
        body: message,
        tag: 'budget-warning'
      });
    }
  } catch (error) {
    console.error('Check budget warnings error:', error);
  }
}

// Check for upcoming goals deadlines
async function checkGoalDeadlines() {
  try {
    const goals = await get('/goals');
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    const upcomingDeadlines = (goals.data || []).filter(goal => {
      if (!goal.deadline || !goal.is_active) return false;
      const deadline = new Date(goal.deadline);
      return deadline >= today && deadline <= threeDaysFromNow;
    });

    if (upcomingDeadlines.length > 0) {
      const names = upcomingDeadlines.map(g => g.name).join(', ');
      sendNotification('🎯 Deadline Target Menabung', {
        body: `${upcomingDeadlines.length} target mendekati deadline: ${names}`,
        tag: 'goal-deadline'
      });
    }
  } catch (error) {
    console.error('Check goal deadlines error:', error);
  }
}

// Main notification checker - runs on page load and every hour
async function initializeNotifications() {
  const hasPermission = await requestNotificationPermission();
  
  if (!hasPermission) {
    console.log('Notifikasi tidak diizinkan');
    return;
  }

  // Check on page load
  await Promise.all([
    checkTodoReminders(),
    checkBudgetWarnings(),
    checkGoalDeadlines()
  ]);

  // Check every hour
  setInterval(async () => {
    await Promise.all([
      checkTodoReminders(),
      checkBudgetWarnings(),
      checkGoalDeadlines()
    ]);
  }, 60 * 60 * 1000); // 1 hour
}

// Test notification
function sendTestNotification() {
  sendNotification('🔔 Notifikasi UANGIN', {
    body: 'Sistem notifikasi berfungsi dengan baik!',
    tag: 'test-notification'
  });
}

// Expose functions globally
window.sendNotification = sendNotification;
window.sendTestNotification = sendTestNotification;
window.checkTodoReminders = checkTodoReminders;
window.checkBudgetWarnings = checkBudgetWarnings;
window.checkGoalDeadlines = checkGoalDeadlines;

// Auto-initialize on dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on dashboard pages
  const isDashboardPage = window.location.pathname.includes('dashboard');
  if (isDashboardPage) {
    initializeNotifications();
  }
});
