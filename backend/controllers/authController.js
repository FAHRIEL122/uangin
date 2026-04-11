const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken, getTokenExpiration } = require('../utils/jwtHelper');
const { success, error, validationError, unauthorized, badRequest } = require('../utils/response');
const { validateUsername, validateEmail, validatePassword, sanitizeString } = require('../utils/validation');

// Register new user
async function register(req, res) {
  try {
    const { username, email, password, full_name } = req.body;
    
    // Validate inputs
    const errors = [];
    errors.push(...validateUsername(username));
    errors.push(...validateEmail(email));
    errors.push(...validatePassword(password));
    
    if (errors.length > 0) {
      return validationError(res, errors);
    }
    
    // Sanitize inputs
    const cleanUsername = sanitizeString(username.trim());
    const cleanEmail = sanitizeString(email.trim().toLowerCase());
    const cleanFullName = full_name ? sanitizeString(full_name.trim()) : null;
    
    // Check if username or email already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [cleanUsername, cleanEmail]
    );
    
    if (existing.length > 0) {
      const exists = existing[0];
      const [checkUsername] = await pool.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
      if (checkUsername.length > 0) {
        return badRequest(res, 'Username sudah digunakan');
      }
      return badRequest(res, 'Email sudah digunakan');
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [cleanUsername, cleanEmail, passwordHash, cleanFullName]
    );
    
    const userId = result.insertId;
    
    // Create default categories
    const defaultCategories = [
      // Income categories
      [userId, 'Gaji', 'income', '💰', '#10b981'],
      [userId, 'Freelance', 'income', '💼', '#3b82f6'],
      [userId, 'Investasi', 'income', '📈', '#8b5cf6'],
      [userId, 'Lainnya', 'income', '💵', '#6b7280'],
      // Expense categories
      [userId, 'Makanan & Minuman', 'expense', '🍔', '#ef4444'],
      [userId, 'Transportasi', 'expense', '🚗', '#f59e0b'],
      [userId, 'Belanja', 'expense', '🛍️', '#ec4899'],
      [userId, 'Tagihan & Utilitas', 'expense', '📱', '#6366f1'],
      [userId, 'Hiburan', 'expense', '🎮', '#14b8a6'],
      [userId, 'Lainnya', 'expense', '📦', '#6b7280']
    ];
    
    await pool.query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES ?',
      [defaultCategories]
    );
    
    // Generate token
    const token = generateToken(userId, cleanUsername);
    const expiresIn = getTokenExpiration();
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn
    });
    
    // Return success
    return success(res, 'Registrasi berhasil', {
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        full_name: cleanFullName
      },
      token
    }, 201);
    
  } catch (err) {
    console.error('Register error:', err.message);
    return error(res, 'Terjadi kesalahan saat registrasi', 500);
  }
}

// Login user
async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    // Validate inputs
    if (!username || !password) {
      return badRequest(res, 'Username dan password diperlukan');
    }
    
    // Find user
    const [users] = await pool.query(
      'SELECT id, username, email, password_hash, full_name FROM users WHERE username = ?',
      [username.trim()]
    );
    
    if (users.length === 0) {
      return unauthorized(res, 'Username atau password salah');
    }
    
    const user = users[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return unauthorized(res, 'Username atau password salah');
    }
    
    // Generate token
    const token = generateToken(user.id, user.username);
    const expiresIn = getTokenExpiration();
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn
    });
    
    // Return success
    return success(res, 'Login berhasil', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      },
      token
    });
    
  } catch (err) {
    console.error('Login error:', err.message);
    return error(res, 'Terjadi kesalahan saat login', 500);
  }
}

// Get current user profile
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, phone, photo_url, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return error(res, 'User tidak ditemukan', 404);
    }
    
    return success(res, 'Profil berhasil diambil', users[0]);
    
  } catch (err) {
    console.error('Get profile error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengambil profil', 500);
  }
}

// Update user profile
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { full_name, phone, photo_url } = req.body;
    
    // Build update query
    const updates = [];
    const values = [];
    
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(sanitizeString(full_name.trim()) || null);
    }
    
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(sanitizeString(phone.trim()) || null);
    }
    
    if (photo_url !== undefined) {
      // Validate URL format
      if (photo_url && !/^https?:\/\/.+/i.test(photo_url.trim())) {
        return badRequest(res, 'Format URL foto tidak valid');
      }
      updates.push('photo_url = ?');
      values.push(photo_url.trim() || null);
    }
    
    if (updates.length === 0) {
      return badRequest(res, 'Tidak ada data yang diubah');
    }
    
    values.push(userId);
    
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Get updated profile
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, phone, photo_url FROM users WHERE id = ?',
      [userId]
    );
    
    return success(res, 'Profil berhasil diperbarui', users[0]);
    
  } catch (err) {
    console.error('Update profile error:', err.message);
    return error(res, 'Terjadi kesalahan saat memperbarui profil', 500);
  }
}

// Change password
async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return badRequest(res, 'Password saat ini dan password baru diperlukan');
    }
    
    // Validate new password
    const errors = validatePassword(new_password);
    if (errors.length > 0) {
      return validationError(res, errors);
    }
    
    // Get current password hash
    const [users] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return error(res, 'User tidak ditemukan', 404);
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(current_password, users[0].password_hash);
    
    if (!isValid) {
      return unauthorized(res, 'Password saat ini salah');
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );
    
    return success(res, 'Password berhasil diubah');
    
  } catch (err) {
    console.error('Change password error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengubah password', 500);
  }
}

// Logout
function logout(req, res) {
  res.clearCookie('token');
  return success(res, 'Logout berhasil');
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
};
