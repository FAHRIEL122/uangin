// JWT Helper Functions
const jwt = require('jsonwebtoken');

// JWT secret must be configured - no fallbacks for security
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set in production environment');
  }
  console.warn('WARNING: JWT_SECRET is not set. Using insecure dev-only secret. SET THIS IN PRODUCTION!');
  // In development only, generate a random secret if not provided
  // This is ONLY for local development convenience
  const crypto = require('crypto');
  module.exports._devSecret = crypto.randomBytes(64).toString('hex');
}

const getJwtSecret = () => {
  return jwtSecret || module.exports._devSecret;
};

const generateToken = (userId) => {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: '7d' }
  );
};

const verifyToken = (token) => {
  try {
    const secret = getJwtSecret();
    if (!secret) return null;
    return jwt.verify(token, secret);
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
