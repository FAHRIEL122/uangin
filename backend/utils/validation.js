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
  // Password minimal 6 karakter
  return password && password.length >= 6;
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

const validateDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
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
  validateAmount,
  validateDate,
  validateTime,
};
