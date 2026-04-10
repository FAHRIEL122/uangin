// Utility Functions
const API_URL = '/api';

// Set current user
const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

// Get current user
const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Remove current user
const removeUser = () => localStorage.removeItem('user');

// Check if user is authenticated (based on stored user data)
const isAuthenticated = () => {
  return !!getUser();
};

// Logout user
const logout = async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    // ignore; we still clear local user state
  }

  removeUser();
  window.location.href = '/login';
};

// API Call with Authorization (uses secure cookie by default)
// Options:
//  - showLoading: bool (default true)
//  - loadingMessage: string
//  - redirectOnError: bool (default true)
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const showLoadingFlag = options.showLoading ?? true;
  const redirectOnError = options.redirectOnError ?? true;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  if (showLoadingFlag) {
    showLoading(options.loadingMessage || 'Memuat...');
  }

  try {
    const response = await fetch(url, config);

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        logout();
      }

      const message = data?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);

    // On network failure / unreachable API, redirect to a shared error page
    if (redirectOnError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('ECONNREFUSED'))) {
      const encoded = encodeURIComponent(error.message);
      window.location.href = `/error?msg=${encoded}`;
      return;
    }

    throw error;
  } finally {
    if (showLoadingFlag) {
      hideLoading();
    }
  }
};

// Show inline alert message (used within pages)
const showAlert = (message, type = 'info', containerId = 'alertContainer') => {
  const container = document.getElementById(containerId);
  if (!container) {
    showToast(message, type);
    return;
  }

  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type}`;
  alertEl.textContent = message;

  container.appendChild(alertEl);

  // Auto remove after 5 seconds
  setTimeout(() => {
    alertEl.remove();
  }, 5000);
};

// Validate that branding (logo + text) exists on the page
const validateBranding = () => {
  const logo = document.getElementById('appLogo');
  if (!logo) {
    showAlert('Logo UANGIN tidak ditemukan. Silakan refresh halaman.', 'danger');
    console.warn('Branding validation failed: #appLogo tidak ditemukan');
    return false;
  }

  const text = logo.textContent || '';
  if (!/uangin/i.test(text)) {
    showAlert('Tulisan UANGIN tidak ditemukan. Silakan refresh halaman.', 'danger');
    console.warn('Branding validation failed: teks logo tidak berisi UANGIN', text);
    return false;
  }

  return true;
};

// Toast notification (global)
const showToast = (message, type = 'info', duration = 4000) => {
  const containerId = 'toastContainer';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.className = 'toast-close';
  closeBtn.onclick = () => toast.remove();

  toast.appendChild(closeBtn);
  container.appendChild(toast);

  setTimeout(() => toast.remove(), duration);
};

// Show loading overlay
const showLoading = (message = 'Memuat...') => {
  if (document.getElementById('loadingOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="spinner"></div>
    <div>${message}</div>
  `;

  document.body.appendChild(overlay);
};

// Hide loading overlay
const hideLoading = () => {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.remove();
  }
};

// Clear all alerts
const clearAlerts = (containerId = 'alertContainer') => {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
};

// Format currency
const formatCurrency = (value) => {
  const num = parseFloat(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
};

// Format date
const formatDate = (date) => {
  const d = new Date(date);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('id-ID', options);
};

// Format datetime
const formatDateTime = (date, time) => {
  const dateStr = formatDate(date);
  return `${dateStr} ${time}`;
};

// Get current month and year
const getCurrentMonth = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

// Get month/year from a date string (YYYY-MM-DD) or Date object
const getMonthYearFromDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return {
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
};

// Format time (HH:MM)
const formatTime = (time) => {
  if (!time) return '';
  return time.substring(0, 5);
};

// Get color by type
const getColorByType = (type) => {
  return type === 'income' ? '#10b981' : '#ef4444';
};

// Get badge class by type
const getBadgeClassByType = (type) => {
  return type === 'income' ? 'badge-success' : 'badge-danger';
};

// Validate form fields
const validateFormField = (fieldId, fieldName) => {
  const field = document.getElementById(fieldId);
  if (!field || !field.value.trim()) {
    showAlert(`${fieldName} harus diisi`, 'danger');
    field?.focus();
    return false;
  }
  return true;
};

// Disable button
const disableButton = (buttonId) => {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Loading...';
  }
};

// Enable button
const enableButton = (buttonId, text = 'Submit') => {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.disabled = false;
    btn.textContent = text;
  }
};

// Redirect to dashboard if authenticated
const redirectIfAuthenticated = () => {
  if (isAuthenticated()) {
    window.location.href = '/dashboard';
  }
};

// Redirect to login if not authenticated
// Returns true when the user is authenticated.
const redirectIfNotAuthenticated = () => {
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return false;
  }
  return true;
};

// Theme helper
const THEME_KEY = 'uangin_theme';

const getTheme = () => localStorage.getItem(THEME_KEY) || 'light';

const setTheme = (theme) => {
  document.body.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);
};

const toggleTheme = () => {
  const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
};

const initTheme = () => {
  setTheme(getTheme());
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
};

// Initialize navigation menu (active link + mobile toggle)
const initNavigation = () => {
  const header = document.querySelector('header');
  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('navToggle');

  if (!header || !nav || !toggle) return;

  const closeNav = () => header.classList.remove('nav-open');

  toggle.addEventListener('click', () => {
    header.classList.toggle('nav-open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  // Highlight active link
  const currentPath = window.location.pathname;
  nav.querySelectorAll('a').forEach((link) => {
    const linkPath = new URL(link.href, window.location.origin).pathname;
    if (linkPath === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
};

// Init navigation + theme on page load
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTheme();
});
