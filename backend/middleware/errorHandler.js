const { error } = require('../utils/response');

// Global error handler
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // MySQL errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return error(res, 'Data already exists', 400);
      case 'ER_NO_REFERENCED_ROW':
        return error(res, 'Referenced data not found', 400);
      case 'ER_NO_REFERENCED_ROW_2':
        return error(res, 'Cannot delete: data is being used', 400);
      case 'ER_ROW_IS_REFERENCED':
        return error(res, 'Cannot delete: data is being used by other records', 400);
      case 'ER_BAD_NULL_ERROR':
        return error(res, 'Required field is missing', 400);
      case 'WARN_DATA_TRUNCATED':
        return error(res, 'Invalid data format', 400);
      case 'ECONNREFUSED':
        return error(res, 'Database connection failed', 500);
      default:
        return error(res, `Database error: ${err.message}`, 500);
    }
  }
  
  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, 'File size too large. Maximum size is 5MB', 400);
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return error(res, 'Too many files uploaded', 400);
  }
  
  if (err.message && err.message.includes('file type')) {
    return error(res, err.message, 400);
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token expired. Please login again', 401);
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return error(res, err.message, 400);
  }
  
  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  
  return error(res, message, statusCode);
}

// 404 handler for undefined routes
function notFoundHandler(req, res) {
  return error(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
