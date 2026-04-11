const jwt = require('jsonwebtoken');

// Generate JWT token
function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Get expiration date
function getTokenExpiration() {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const match = expiresIn.match(/(\d+)([dhs])/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // 7 days default
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 's': return value * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  getTokenExpiration
};
