// ============================================
// UANGIN - Shared Utilities
// ============================================

// API base URL
const API_URL = window.location.origin + '/api';

// ===== API CALLS =====

// Generic API call
async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  };
  
  if (options.body && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  } else if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
    config.body = options.body;
  }
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Terjadi kesalahan');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
}

// GET request
async function get(endpoint) {
  return apiCall(endpoint, { method: 'GET' });
}

// POST request
async function post(endpoint, body) {
  return apiCall(endpoint, { method: 'POST', body });
}

// PUT request
async function put(endpoint, body) {
  return apiCall(endpoint, { method: 'PUT', body });
}

// DELETE request
async function del(endpoint) {
  return apiCall(endpoint, { method: 'DELETE' });
}

// ===== AUTHENTICATION =====

// Check if user is logged in
function isAuthenticated() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!(token && user);
}

// Get current user
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Save auth data
function saveAuthData(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Clear auth data
function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login';
  }
}

// Redirect to dashboard if authenticated
function redirectIfAuth() {
  if (isAuthenticated()) {
    window.location.href = '/dashboard';
  }
}

// Logout
async function logout() {
  try {
    await post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthData();
    window.location.href = '/login';
  }
}

// ===== FORMATTING =====

// Format currency (Indonesian Rupiah)
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format currency without symbol
function formatCurrencySimple(amount) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// Format date to Indonesian
function formatDate(date, options = {}) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return dateObj.toLocaleDateString('id-ID', { ...defaultOptions, ...options });
}

// Format date short
function formatDateShort(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format time
function formatTime(time) {
  if (!time) return '';
  return time.substring(0, 5); // HH:MM
}

// Format number with Indonesian locale
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

// Parse currency string to number
function parseCurrency(str) {
  if (!str) return 0;
  const cleaned = str.toString().replace(/[^0-9]/g, '');
  return parseFloat(cleaned) || 0;
}

// ===== TOAST NOTIFICATIONS =====

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
  const container = document.querySelector('.toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = getToastIcon(type);
  toast.innerHTML = `
    <span style="font-size: 1.25rem;">${icon}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function getToastIcon(type) {
  const icons = {
    success: '✅',
    danger: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

// ===== MODAL =====

// Show modal
function showModal(title, content, buttons = []) {
  let backdrop = document.querySelector('.modal-backdrop');
  
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title"></h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer"></div>
      </div>
    `;
    document.body.appendChild(backdrop);
    
    backdrop.querySelector('.modal-close').addEventListener('click', () => hideModal());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) hideModal();
    });
  }
  
  backdrop.querySelector('.modal-title').textContent = title;
  backdrop.querySelector('.modal-body').innerHTML = content;
  
  const footer = backdrop.querySelector('.modal-footer');
  footer.innerHTML = '';
  
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.className = `btn ${btn.class || 'btn-primary'}`;
    button.textContent = btn.text;
    button.addEventListener('click', () => {
      if (btn.action) btn.action();
      if (btn.close !== false) hideModal();
    });
    footer.appendChild(button);
  });
  
  backdrop.classList.add('active');
}

// Hide modal
function hideModal() {
  const backdrop = document.querySelector('.modal-backdrop.active');
  if (backdrop) {
    backdrop.classList.remove('active');
  }
}

// Show modal by ID
function showModalById(modalId) {
  const backdrop = document.getElementById(modalId);
  if (backdrop) {
    backdrop.classList.add('active');
    
    // Close on backdrop click
    backdrop.addEventListener('click', function handler(e) {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
        backdrop.removeEventListener('click', handler);
      }
    });
  }
}

// Hide modal by ID
function hideModalById(modalId) {
  const backdrop = document.getElementById(modalId);
  if (backdrop) {
    backdrop.classList.remove('active');
  }
}

// Show confirmation modal
function showConfirm(title, message, onConfirm) {
  showModal(title, `<p>${message}</p>`, [
    { text: 'Batal', class: 'btn-light', action: () => {} },
    { text: 'Ya, Lanjut', class: 'btn-danger', action: onConfirm }
  ]);
}

// ===== DATE HELPERS =====

// Get current month and year
function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
}

// Get month name in Indonesian
function getMonthName(month) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || '';
}

// Get days in month
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// ===== LOCAL STORAGE =====

// Set item with expiration
function setStorageItem(key, value, ttlMinutes = null) {
  const item = {
    value: value,
    expiry: ttlMinutes ? Date.now() + (ttlMinutes * 60 * 1000) : null
  };
  localStorage.setItem(key, JSON.stringify(item));
}

// Get item with expiration check
function getStorageItem(key) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  
  const item = JSON.parse(itemStr);
  
  if (item.expiry && Date.now() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  
  return item.value;
}

// ===== THEME =====

// Toggle dark mode
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Set theme
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// Get saved theme
function getSavedTheme() {
  return localStorage.getItem('theme') || 'light';
}

// ===== INPUT FORMATTING =====

// Format input as currency
function formatInputAsCurrency(input) {
  let value = input.value.replace(/[^0-9]/g, '');
  if (value) {
    value = new Intl.NumberFormat('id-ID').format(value);
    input.value = value;
  }
}

// ===== FORM VALIDATION =====

// Show form error
function showFormError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.add('error');
    
    // Remove existing error message
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Add error message
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.textContent = message;
    field.parentElement.appendChild(errorEl);
  }
}

// Clear all form errors
function clearFormErrors() {
  document.querySelectorAll('.form-input.error, .form-select.error, .form-textarea.error').forEach(field => {
    field.classList.remove('error');
  });
  
  document.querySelectorAll('.form-error').forEach(error => {
    error.remove();
  });
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===== INITIALIZATION =====

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = getSavedTheme();
  setTheme(savedTheme);

  // Check auth if not on auth pages
  const isAuthPage = window.location.pathname.includes('login') ||
                     window.location.pathname.includes('register');

  if (!isAuthPage && !isAuthenticated()) {
    // Don't redirect on landing page
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
});

// Expose modal functions globally
window.showModal = showModal;
window.hideModal = hideModal;
window.showModalById = showModalById;
window.hideModalById = hideModalById;
window.showConfirm = showConfirm;

// Expose form validation functions globally
window.showFormError = showFormError;
window.clearFormErrors = clearFormErrors;
