const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
  const password = 'admin';
  const hash = await bcrypt.hash(password, 10);
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'buku_kas' });
  await conn.execute('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
  console.log('Updated admin password to:', password);
  await conn.end();
})();
