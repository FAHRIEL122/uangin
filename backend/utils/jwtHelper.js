// JWT Helper Functions
const jwt = require('jsonwebtoken');

// Use configured secret, or a dev fallback in non-production for convenience
const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret');

if (!jwtSecret && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is not set in production environment. Authentication will fail.');
}

const generateToken = (userId) => {
  if (!jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  return jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: '7d' }
  );
};

const verifyToken = (token) => {
  try {
    if (!jwtSecret) return null;
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};
