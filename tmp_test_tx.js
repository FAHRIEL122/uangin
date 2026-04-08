const fetch = global.fetch || require('node-fetch');

(async () => {
  const base = 'http://localhost:3000/api';

  // Login as admin (default password assumed 'admin')
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });

  const loginData = await loginRes.json();
  console.log('login status', loginRes.status);
  console.log('login response', loginData);

  const cookie = loginRes.headers.get('set-cookie');
  console.log('cookie header:', cookie);

  // Create a transaction
  const txRes = await fetch(`${base}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      amount: 10000,
      type: 'income',
      category_id: 1,
      transaction_date: '2026-03-09',
      transaction_time: '12:00',
      description: 'Test transaction',
    }),
  });

  const txData = await txRes.json();
  console.log('create tx status', txRes.status);
  console.log('create tx response', txData);
})();
