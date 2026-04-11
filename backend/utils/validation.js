// Input validation helpers

// Validate username format
function validateUsername(username) {
  const errors = [];
  
  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
    return errors;
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 4 || trimmed.length > 20) {
    errors.push('Username must be 4-20 characters');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  return errors;
}

// Validate email format
function validateEmail(email) {
  const errors = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return errors;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email.trim())) {
    errors.push('Invalid email format');
  }
  
  return errors;
}

// Validate password strength
function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return errors;
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
}

// Validate amount (must be positive number)
function validateAmount(amount) {
  const errors = [];
  
  if (amount === undefined || amount === null) {
    errors.push('Amount is required');
    return errors;
  }
  
  const parsed = parseFloat(amount);
  
  if (isNaN(parsed) || parsed <= 0) {
    errors.push('Amount must be a positive number');
  }
  
  return errors;
}

// Validate date format
function validateDate(date) {
  const errors = [];
  
  if (!date) {
    errors.push('Date is required');
    return errors;
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(date)) {
    errors.push('Invalid date format (use YYYY-MM-DD)');
    return errors;
  }
  
  const parsed = new Date(date);
  
  if (isNaN(parsed.getTime())) {
    errors.push('Invalid date');
  }
  
  return errors;
}

// Validate time format
function validateTime(time) {
  const errors = [];
  
  if (!time) {
    return errors; // Time is optional
  }
  
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  
  if (!timeRegex.test(time)) {
    errors.push('Invalid time format (use HH:MM or HH:MM:SS)');
  }
  
  return errors;
}

// Sanitize string to prevent XSS
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validate transaction type
function validateTransactionType(type) {
  const errors = [];
  
  if (!type || !['income', 'expense'].includes(type)) {
    errors.push('Transaction type must be "income" or "expense"');
  }
  
  return errors;
}

// Validate month and year
function validateMonthYear(month, year) {
  const errors = [];
  
  if (month !== undefined && month !== null) {
    const m = parseInt(month);
    if (isNaN(m) || m < 1 || m > 12) {
      errors.push('Month must be between 1 and 12');
    }
  }
  
  if (year !== undefined && year !== null) {
    const y = parseInt(year);
    if (isNaN(y) || y < 2000 || y > 2100) {
      errors.push('Year must be between 2000 and 2100');
    }
  }
  
  return errors;
}

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validateAmount,
  validateDate,
  validateTime,
  sanitizeString,
  validateTransactionType,
  validateMonthYear
};
