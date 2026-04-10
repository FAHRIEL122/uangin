// Authentication Controller
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../utils/jwtHelper');
const { sendSuccess, sendError } = require('../utils/response');
const { validateEmail, validateUsername, validatePassword, getPasswordValidationMessage } = require('../utils/validation');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    // Validation
    if (!username || !email || !password) {
      return sendError(res, 'Username, email, and password are required', 400);
    }

    if (!validateUsername(username)) {
      return sendError(res, 'Username harus 4-20 karakter alphanumeric', 400);
    }

    if (!validateEmail(email)) {
      return sendError(res, 'Format email tidak valid', 400);
    }

    if (!validatePassword(password)) {
      return sendError(res, getPasswordValidationMessage(), 400);
    }

    const connection = await db.getConnection();

    try {
      // Check if username or email already exists
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser.length > 0) {
        return sendError(res, 'Username atau email sudah terdaftar', 400);
      }

      // Hash password with stronger salt factor (12 instead of 10)
      const hashedPassword = await bcrypt.hash(password, 12);

      // Insert user
      const [result] = await connection.execute(
        'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, full_name || null]
      );

      const userId = result.insertId;

      // Insert default categories
      const defaultCategories = [
        { name: 'Gaji', type: 'income', is_default: true, color: '#10b981' },
        { name: 'Bonus', type: 'income', is_default: true, color: '#059669' },
        { name: 'Investasi', type: 'income', is_default: true, color: '#0891b2' },
        { name: 'Makanan', type: 'expense', is_default: true, color: '#ef4444' },
        { name: 'Transport', type: 'expense', is_default: true, color: '#f97316' },
        { name: 'Utilitas', type: 'expense', is_default: true, color: '#eab308' },
        { name: 'Hiburan', type: 'expense', is_default: true, color: '#8b5cf6' },
        { name: 'Kesehatan', type: 'expense', is_default: true, color: '#06b6d4' },
        { name: 'Lainnya (Pemasukan)', type: 'income', is_default: true, color: '#6b7280' },
        { name: 'Lainnya (Pengeluaran)', type: 'expense', is_default: true, color: '#6b7280' },
      ];

      for (const category of defaultCategories) {
        await connection.execute(
          'INSERT INTO categories (user_id, name, type, color, is_default) VALUES (?, ?, ?, ?, ?)',
          [userId, category.name, category.type, category.color, category.is_default]
        );
      }

      // Generate token
      const token = generateToken(userId);

      // Set secure cookie for session (helps protect against XSS)
      res.cookie('token', token, cookieOptions);

      sendSuccess(res, {
        userId,
        username,
        email,
        token
      }, 'Registrasi berhasil', 201);

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 'Registrasi gagal', 500);
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return sendError(res, 'Username dan password harus diisi', 400);
    }

    const connection = await db.getConnection();

    try {
      // Get user by username
      const [users] = await connection.execute(
        'SELECT id, username, email, password_hash FROM users WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        return sendError(res, 'Username atau password salah', 401);
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return sendError(res, 'Username atau password salah', 401);
      }

      // Generate token
      const token = generateToken(user.id);

      // Set secure cookie for session (helps protect against XSS)
      res.cookie('token', token, cookieOptions);

      sendSuccess(res, {
        userId: user.id,
        username: user.username,
        email: user.email,
        token
      }, 'Login berhasil');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Login gagal', 500);
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const connection = await db.getConnection();

    try {
      const [users] = await connection.execute(
        'SELECT id, username, email, full_name, phone, photo_url, created_at FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, users[0], 'User found');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get current user error:', error);
    sendError(res, 'Failed to fetch user', 500);
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { full_name, phone, photo_url } = req.body;

    const connection = await db.getConnection();

    try {
      // Whitelist approach - only allow specific columns
      const allowedFields = {
        full_name: full_name !== undefined ? (full_name || null) : undefined,
        phone: phone !== undefined ? (phone || null) : undefined,
        photo_url: photo_url !== undefined ? (photo_url || null) : undefined,
      };

      const updates = [];
      const values = [];

      Object.entries(allowedFields).forEach(([field, value]) => {
        if (value !== undefined) {
          updates.push(`${field} = ?`);
          values.push(value);
        }
      });

      if (updates.length === 0) {
        return sendSuccess(res, { userId }, 'Tidak ada perubahan profile');
      }

      values.push(userId);

      await connection.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      sendSuccess(res, { userId, full_name, phone, photo_url }, 'Profile berhasil diperbarui');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Gagal memperbarui profile', 500);
  }
};

// Logout user (clear token cookie)
exports.logout = (req, res) => {
  res.clearCookie('token', cookieOptions);
  sendSuccess(res, null, 'Logout successful');
};
