# Database Migration Guide

## Cara Menjalankan Migration

### Opsi 1: Via phpMyAdmin (Paling Mudah) ✅

1. Buka **phpMyAdmin** (biasanya di http://localhost/phpmyadmin)
2. Pilih database **`buku_kas`** di sidebar kiri
3. Klik tab **"SQL"** di bagian atas
4. Copy-paste query di bawah ini:

```sql
-- Tambah kolom deleted_at untuk soft delete
ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL COMMENT 'Soft delete timestamp';
ALTER TABLE transactions ADD INDEX idx_deleted (deleted_at);

-- Tambah tabel savings_goals untuk target menabung
CREATE TABLE IF NOT EXISTS savings_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '🎯',
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0.00,
  deadline DATE DEFAULT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

5. Klik tombol **"Go"** atau **"Kirim"**
6. Kalau muncul pesan "Query executed successfully", berarti berhasil! ✅

---

### Opsi 2: Via Command Line

Jalankan perintah ini di terminal:

```bash
npm run migrate
```

Ini akan menjalankan semua migration sekaligus:
- ✅ Soft delete (deleted_at column)
- ✅ Savings goals table

---

### Opsi 3: Via MySQL CLI

```bash
mysql -u root -p buku_kas < database/schema.sql
```

Atau jalankan migration script satu per satu:

```bash
npm run migrate:soft-delete
npm run migrate:goals
```

---

## Verifikasi Migration Berhasil

Setelah menjalankan migration, cek di phpMyAdmin:

1. Klik tabel **`transactions`** → tab **Structure**
   - Harus ada kolom **`deleted_at`**

2. Cek apakah tabel **`savings_goals`** sudah ada di sidebar
   - Klik tabel → tab **Structure**
   - Harus ada kolom: id, user_id, name, icon, target_amount, current_amount, deadline, color, is_active

---

## Troubleshooting

### Error: "Column 'deleted_at' already exists"
✅ Berarti migration sudah dijalankan sebelumnya. Tidak perlu melakukan apa-apa.

### Error: "Access denied for user 'root'@'localhost'"
🔧 Pastikan password MySQL di file `.env` benar:
- Untuk XAMPP: `DB_PASSWORD=` (kosong)
- Untuk Laragon: `DB_PASSWORD=` (kosong)  
- Untuk MySQL default: `DB_PASSWORD=root`

### Error: "Table doesn't exist"
🔧 Pastikan database `buku_kas` sudah dibuat:
```sql
CREATE DATABASE buku_kas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Setelah Migration Berhasil

1. Restart server: `npm run dev`
2. Refresh browser
3. Semua fitur baru akan berfungsi normal ✅
