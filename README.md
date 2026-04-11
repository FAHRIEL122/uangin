# 💰 UANGIN - Aplikasi Buku Kas Pribadi Modern

> Kelola keuangan Anda dengan mudah, aman, dan modern!

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-production%20ready-success.svg)

## 📋 Tentang UANGIN

UANGIN adalah aplikasi web modern untuk mengelola keuangan pribadi (uang kas) dengan fitur lengkap yang memungkinkan Anda untuk:

- ✅ Mencatat pendapatan dan pengeluaran secara real-time
- ✅ Mengelola kategori transaksi dengan custom categories
- ✅ Tracking budget bulanan per kategori dengan warning system
- ✅ Melihat riwayat transaksi dengan filter, search, dan sorting
- ✅ Visualisasi data keuangan dengan chart interaktif
- ✅ Kalender transaksi untuk melihat transaksi berdasarkan tanggal
- ✅ Laporan dan insight otomatis (spending trends, category analysis)
- ✅ Manajemen profile dan pengaturan akun
- ✅ Sistem undo untuk membatalkan transaksi terakhir
- ✅ Upload lampiran/bukti transaksi
- ✅ Dark mode support
- ✅ Fully responsive design (mobile-friendly)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- MySQL >= 8.0
- npm atau yarn

### Installation

1. **Clone repository**
```bash
git clone https://github.com/FAHRIEL122/uangin.git
cd uangin
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi database Anda:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=buku_kas
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

4. **Initialize database**
```bash
# Using MySQL CLI (recommended)
mysql -u root -p < database/schema.sql
```

5. **Start server**
```bash
npm start
```

6. **Open browser**
```
http://localhost:3000
```

### Demo Data

Untuk mengisi data demo (user + sample transactions):

```bash
npm run seed
```

Demo credentials:
- Username: `demo`
- Password: `Demo1234`

## 📁 Project Structure

```
UANGIN/
├── backend/
│   ├── server.js                 # Main application
│   ├── config/
│   │   └── database.js           # Database connection
│   ├── controllers/              # Route controllers
│   ├── middleware/               # Auth & error handling
│   ├── routes/                   # API routes
│   └── utils/                    # Helper functions
│
├── frontend/
│   ├── pages/                    # HTML pages
│   ├── css/                      # Stylesheets
│   └── js/                       # JavaScript logic
│
├── database/
│   └── schema.sql              # Complete database schema (v2.0.0)
│
├── scripts/                      # Utility scripts
├── uploads/                      # File uploads
├── docs/                         # Documentation
├── .env.example                  # Environment template
└── package.json                  # Dependencies
```

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js 4.x** - Web framework
- **MySQL 8.0+** - Relational database
- **bcryptjs** - Password hashing (salt factor 12)
- **jsonwebtoken** - JWT authentication (7-day expiry)
- **multer** - File upload handling (images & PDF, max 5MB)
- **helmet** - Security headers
- **express-rate-limit** - API rate limiting

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Grid, Flexbox, custom properties
- **Vanilla JavaScript (ES6+)** - No frameworks, lightweight
- **Chart.js 4.4.0** - Interactive data visualization
- **Fetch API** - Modern HTTP requests
- **LocalStorage** - Session management

## 🔐 Security Features

- ✅ JWT authentication with secure cookies (httpOnly, sameSite: lax)
- ✅ Password hashing with bcrypt (salt factor 12)
- ✅ Strong password validation (min 8 chars, uppercase, lowercase, digit)
- ✅ File upload restrictions (whitelist types + size limit)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (Helmet headers)
- ✅ Rate limiting (100 req/15min global, stricter for auth)
- ✅ Input validation (backend & frontend)
- ✅ Database CHECK constraints (data integrity)
- ✅ Foreign key constraints (referential integrity)

## 📊 Database Schema

### Tables
- **users** - User accounts and profiles
- **categories** - Transaction categories (income/expense)
- **transactions** - All financial transactions
- **recurring_transactions** - Recurring transaction templates
- **budgets** - Monthly budget tracking per category
- **undo_log** - Audit trail for undo operations

### Views
- **v_monthly_summary** - Aggregated monthly income/expense/balance
- **v_category_summary** - Transaction counts and totals per category

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register        # Register new user
POST   /api/auth/login           # Login user
GET    /api/auth/me              # Get current user profile
PUT    /api/auth/profile         # Update user profile
POST   /api/auth/change-password # Change password
POST   /api/auth/logout          # Logout user
```

### Transactions
```
GET    /api/transactions?month=X&year=Y    # Get monthly transactions
GET    /api/transactions/all                # Get all transactions
POST   /api/transactions                    # Create transaction
PUT    /api/transactions/:id                # Update transaction
DELETE /api/transactions/:id                # Delete transaction
POST   /api/transactions/undo               # Undo last transaction
```

### Categories
```
GET    /api/categories                      # Get all categories
POST   /api/categories                      # Create category
PUT    /api/categories/:id                  # Update category
DELETE /api/categories/:id                  # Delete category
```

### Budgets
```
GET    /api/budgets?month=X&year=Y          # Get monthly budgets
POST   /api/budgets                         # Set/update budget
DELETE /api/budgets/:id                     # Delete budget
GET    /api/budgets/check-warning           # Check budget warning
```

### Reports
```
GET    /api/reports/summary                  # Monthly summary
GET    /api/reports/transactions             # Transaction list
GET    /api/reports/categories               # Category breakdown
GET    /api/reports/budget                   # Budget status
GET    /api/reports/insights                 # Auto-generated insights
```

### Other
```
POST   /api/upload                           # Upload file
GET    /api/backup                           # Export all data
GET    /api/health                           # Server status
```

## 🎨 Features

### Dashboard
- Welcome greeting with user name
- Summary cards: Total Income, Total Expense, Net Balance
- Interactive doughnut chart (Income vs Expense)
- Transaction list with search, filter, and sort
- Month/Year selector
- Quick actions: Add Income, Add Expense, Edit Last, Undo Last

### Transaction Management
- Add income and expense with category selection
- Budget warning system (>80% warning, >100% danger)
- File upload for receipts/attachments
- Recurring transaction support
- Edit and delete transactions
- Undo last transaction

### Reports & Insights
- Monthly summary with top expense categories
- Detailed transaction list
- Category breakdown with totals and averages
- Budget status with progress indicators
- Auto-generated insights (spending trends, comparisons)

### Calendar View
- Full calendar with transaction indicators
- Navigate by month
- Click on days to see transactions
- Color-coded income (green) and expense (red)

### Profile Management
- View/edit profile information
- Change password
- Account statistics
- Export all data (JSON)
- Dark mode toggle

## 🚦 Scripts

```bash
# Start server
npm start

# Development with auto-reload
npm run dev

# Initialize database
npm run init-db

# Seed sample data
npm run seed

# Clear all data (use with --force)
npm run clear -- --force
```

## 🌐 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=buku_kas
DB_PORT=3306

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
```

## 📱 Responsive Design

UANGIN works perfectly on:
- 📱 Mobile devices
- 📲 Tablets
- 💻 Desktops

## 🎯 User Flows

### New User Onboarding
1. Visit `/register`
2. Fill form (username, email, password)
3. Submit → Validation → Success
4. Auto-redirect to `/dashboard`
5. 10 default categories auto-created

### Add Transaction
1. Click "+ Pendapatan" or "- Pengeluaran"
2. Fill form (amount, category, description, date)
3. Submit → Validation → API Call
4. Success toast notification
5. Auto-redirect to dashboard

### Budget Tracking
1. Add expense transaction
2. If >80% budget: Warning shown
3. If >100% budget: Danger alert
4. Dashboard shows budget status
5. Insights alert overspending

## 🏆 Unique Selling Points

1. **Zero Learning Curve** - Intuitive interface, ready to use
2. **Lightning Fast** - Vanilla JS loads instantly
3. **Privacy First** - Self-hosted, data stays on your server
4. **Complete Features** - Budget, insights, calendar, reports
5. **Beautiful Design** - Modern UI with dark mode
6. **Indonesian Localized** - Rupiah formatting, Bahasa Indonesia
7. **Mobile Friendly** - Responsive design
8. **Secure** - Enterprise-grade security
9. **Open Source** - Free to use and modify
10. **Production Ready** - Comprehensive architecture

## 🐛 Known Issues & Future Enhancements

### Planned Features
- 📱 Mobile app (React Native)
- 📧 Email notifications (budget alerts)
- 📊 Export to CSV/PDF
- 🔄 Recurring transaction auto-generation
- 💳 Multi-currency support
- 📸 OCR receipt scanning
- 🔐 Two-factor authentication
- 📈 Advanced analytics & predictions

## 📄 License

MIT License - Free to use, modify, and distribute

## 👥 Author

**Fahriel**
- GitHub: [@FAHRIEL122](https://github.com/FAHRIEL122)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

- 📧 Email: Support
- 🐛 Issues: [GitHub Issues](https://github.com/FAHRIEL122/uangin/issues)
- 📖 Documentation: `/docs` folder

---

**Last Updated:** April 10, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production-Ready

> **UANGIN** - Kelola keuangan Anda dengan mudah, aman, dan modern! 💰📊
