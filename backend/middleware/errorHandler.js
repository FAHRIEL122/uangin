// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message || err);
  if (err.code) console.error('Error Code:', err.code);
  if (err.stack) console.error('Stack:', err.stack);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.message,
    });
  }

  // Handle unauthorized
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  // Handle database connection errors
  if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' || 
      err.code === 'PROTOCOL_CONNECTION_LOST' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT') {
    console.error('Database connection error:', err);
    return res.status(503).json({
      success: false,
      message: 'Database connection error. Please try again.',
    });
  }

  // Handle unique constraint violations
  if (err.code === 'ER_DUP_ENTRY') {
    const field = err.message.includes('username') ? 'Username' :
                  err.message.includes('email') ? 'Email' :
                  err.message.includes('unique_user_category') ? 'Category (already exists for this type)' :
                  'Field';
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Handle foreign key constraint violations
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference. Please check the category or user exists.',
    });
  }

  // Handle check constraint violations
  if (err.code === 'ER_SIGNAL_EXCEPTION') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid data constraint',
    });
  }

  // Handle row is referenced
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete. This item is still in use.',
    });
  }

  // Handle syntax errors (likely from bad input)
  if (err.code === 'ER_PARSE_ERROR' || err.code === 'ER_SYNTAX_ERROR') {
    console.error('SQL Parse Error:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid data format',
    });
  }

  // Handle access denied
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(500).json({
      success: false,
      message: 'Database access denied',
    });
  }

  // Handle 'no database selected'
  if (err.code === 'ER_NO_DB_ERROR') {
    return res.status(500).json({
      success: false,
      message: 'Database not found',
    });
  }

  // Handle bad null error (trying to insert null into NOT NULL column)
  if (err.code === 'ER_BAD_NULL_ERROR' || err.code === 'ER_BAD_NULL_ERROR') {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: ' + (err.message || 'unknown field'),
    });
  }

  // Handle data too long
  if (err.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      success: false,
      message: 'Data too long. Please shorten the input.',
    });
  }

  // Handle out of range
  if (err.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
    return res.status(400).json({
      success: false,
      message: 'Data out of range. Please check your input.',
    });
  }

  // Handle incorrect datetime value
  if (err.code === 'ER_TRUNCATED_WRONG_VALUE' || err.code === 'ER_WRONG_VALUE') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format. Please check your input.',
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { debug: { message: err.message, code: err.code } }),
  });
};

module.exports = errorHandler;
