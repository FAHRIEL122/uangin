// Main Server File
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const reportRoutes = require('./routes/reportRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const backupRoutes = require('./routes/backupRoutes');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Trust proxy when running behind a reverse proxy (Heroku, Nginx, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
    
    // Allow production domain if set
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true);
    
    // In production, you might want to restrict this further
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS'));
    }
    
    // For development, allow all origins
    return callback(null, true);
  },
  credentials: true,
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use(helmet());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(apiLimiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded attachments
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/backup', backupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Serve frontend pages
// Redirect root to /login to ensure consistent entry point
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});

app.get('/pendapatan', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/pendapatan.html'));
});

app.get('/pengeluaran', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/pengeluaran.html'));
});

app.get('/laporan', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/laporan.html'));
});

app.get('/kalender', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/kalender.html'));
});

app.get('/profil', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/profil.html'));
});

// Error page route
app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/error.html'));
});

// 404 handler
app.use((req, res) => {
  // Serve a simple JSON error for API routes, and redirect to error page for UI.
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found' });
  }

  res.redirect('/error');
});

// Error handler middleware
app.use(errorHandler);

// Start server (with automatic port fallback if already in use)
const startServer = (port, attempt = 0) => {
  const server = app.listen(port, () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║       UANGIN - Buku Kas Pribadi       ║`);
    console.log(`║       Server Running on Port ${port}       ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
    console.log(`➜ Frontend: http://localhost:${port}`);
    console.log(`➜ API:      http://localhost:${port}/api`);
    console.log(`➜ Health:   http://localhost:${port}/api/health\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 5) {
      const nextPort = port + 1;
      console.warn(`Port ${port} already in use, trying ${nextPort}...`);
      setTimeout(() => startServer(nextPort, attempt + 1), 500);
      return;
    }

    console.error('Server failed to start:', err);
    process.exit(1);
  });
};

startServer(PORT);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nServer shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nServer shutting down...');
  process.exit(0);
});
