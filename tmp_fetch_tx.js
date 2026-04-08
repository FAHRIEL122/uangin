const fetch = global.fetch || require('node-fetch');

(async () => {
  const base = 'http://localhost:3000/api';

  // Login
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  const cookie = loginRes.headers.get('set-cookie');

  const res = await fetch(`${base}/transactions?month=3&year=2026`, {
    headers: { Cookie: cookie },
  });
  const data = await res.json();
  console.log('status', res.status);
  console.log(JSON.stringify(data, null, 2));
})();
