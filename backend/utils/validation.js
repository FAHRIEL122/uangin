// Validation Helper Functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  // Username: 4-20 chars, alphanumeric + underscore
  const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
  return usernameRegex.test(username);
};

const validatePassword = (password) => {
  // Password must be at least 8 characters with at least one uppercase, one lowercase, and one digit
  if (!password || password.length < 8) {
    return false;
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  
  return hasUpperCase && hasLowerCase && hasDigit;
};

const getPasswordValidationMessage = () => {
  return 'Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka';
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

const validateDate = (dateString) => {
  // Validate YYYY-MM-DD format strictly
  if (!dateString || typeof dateString !== 'string') return false;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  // Check if date is valid and the string matches the parsed date
  return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
};

const validateTime = (timeString) => {
  // Format HH:MM atau HH:MM:SS
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(timeString);
};

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
  getPasswordValidationMessage,
  validateAmount,
  validateDate,
  validateTime,
};
