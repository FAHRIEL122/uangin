require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { pool, testConnection, initializeSchema } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { processRecurringTransactions } = require('./utils/recurringProcessor');
const { autoSetup } = require('../scripts/auto-setup-db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const reportRoutes = require('./routes/reportRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const backupRoutes = require('./routes/backupRoutes');
const exportRoutes = require('./routes/exportRoutes');
const tagRoutes = require('./routes/tagRoutes');
const todoRoutes = require('./routes/todoRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for now
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', globalLimiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
});

// Rate limiting for export (prevent data exfiltration)
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // limit to 10 exports per 15 minutes
  message: {
    success: false,
    message: 'Terlalu banyak export. Silakan coba lagi nanti.'
  }
});

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // limit to 20 uploads per 15 minutes
  message: {
    success: false,
    message: 'Terlalu banyak upload. Silakan coba lagi nanti.'
  }
});

// ============================================
// STATIC FILES
// ============================================

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'UANGIN API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/backup', exportLimiter, backupRoutes);
app.use('/api/export', exportLimiter, exportRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/todos', todoRoutes);

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'dashboard.html'));
});

app.get('/pendapatan', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'pendapatan.html'));
});

app.get('/pengeluaran', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'pengeluaran.html'));
});

app.get('/laporan', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'laporan.html'));
});

app.get('/kalender', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'kalender.html'));
});

app.get('/profil', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'profil.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'register.html'));
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Auto-setup database if needed
    await autoSetup();

    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize database schema
    await initializeSchema();
    
    // Process recurring transactions
    console.log('\n🔄 Checking recurring transactions...');
    const recurringResult = await processRecurringTransactions();
    if (recurringResult.processed > 0) {
      console.log(`✅ Auto-created ${recurringResult.processed} recurring transactions`);
    }
    
    // Set up daily recurring transaction check
    setInterval(async () => {
      console.log('\n🔄 Scheduled recurring transaction check...');
      await processRecurringTransactions();
    }, 24 * 60 * 60 * 1000); // Check every 24 hours
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`\n🚀 UANGIN Server is running!`);
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 API Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  try {
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  try {
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
});

// Start the server
startServer();

module.exports = app;
