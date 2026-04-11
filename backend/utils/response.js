// Standardized API response format

// Success response
function success(res, message, data = null, statusCode = 200) {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
}

// Error response
function error(res, message, statusCode = 500, errors = null) {
  const response = {
    success: false,
    message
  };
  
  if (errors !== null) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
}

// Validation error response
function validationError(res, errors) {
  return error(res, 'Validation failed', 400, errors);
}

// Not found response
function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

// Unauthorized response
function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

// Forbidden response
function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

// Bad request response
function badRequest(res, message = 'Bad request') {
  return error(res, message, 400);
}

module.exports = {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  badRequest
};
