const { verifyToken } = require('../utils/jwtHelper');
const { unauthorized } = require('../utils/response');

// Authentication middleware
function authenticate(req, res, next) {
  let token = null;
  
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Get token from cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (!token) {
    return unauthorized(res, 'Authentication required. Please login.');
  }
  
  // Verify token
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return unauthorized(res, 'Invalid or expired token. Please login again.');
  }
  
  // Attach user info to request
  req.user = {
    userId: decoded.userId,
    username: decoded.username
  };
  
  next();
}

// Optional authentication (doesn't block if no token)
function optionalAuth(req, res, next) {
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = {
        userId: decoded.userId,
        username: decoded.username
      };
    }
  }
  
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
