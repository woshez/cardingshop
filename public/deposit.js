async function api(path, opts) {
  const res = await fetch(path, opts);
  const text = await res.text();
  try { 
    const json = JSON.parse(text || '{}'); 
    if (!res.ok) throw new Error(json.error || res.status); 
    return json; 
  } catch (e) { 
    if (!res.ok) throw new Error('API error: ' + res.status); 
    return JSON.parse(text || '{}'); 
  }
}

// Load auth navbar
async function loadAuthNavbar() {
  const mount = document.getElementById('auth-navbar-mount');
  const res = await fetch('/auth-navbar.html');
  const html = await res.text();
  mount.innerHTML = html;
  const scripts = mount.querySelectorAll('script');
  scripts.forEach(s => {
    const newScript = document.createElement('script');
    newScript.textContent = s.textContent;
    mount.appendChild(newScript);
  });
}

// Check if user is logged in and display status
async function checkAuthStatus() {
  try {
    const user = await api('/api/me');
    document.getElementById('auth-status').innerHTML = `<strong>Logged in as:</strong> ${user.name} (${user.email})<br><strong>Balance:</strong> $${user.balance.toFixed(2)}`;
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name').disabled = true;
    document.getElementById('user-email').disabled = true;
    document.getElementById('user-password').disabled = true;
    document.getElementById('create-user').disabled = true;
  } catch (e) {
    document.getElementById('auth-status').innerHTML = '<strong>Not logged in.</strong> Create an account or <a href="/login.html">login</a>.';
  }
}

document.getElementById('create-user').addEventListener('click', async () => {
  const name = document.getElementById('user-name').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const password = document.getElementById('user-password').value;
  if (!name || !email) return alert('Enter name and email');
  try {
    const payload = { name, email };
    if (password) payload.password = password;
    const u = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    showUser(u);
  } catch (err) { alert('Error: ' + (err.message || err)); }
});

document.getElementById('load-user').addEventListener('click', async () => {
  const id = document.getElementById('user-id').value.trim();
  if (!id) return alert('Enter user id');
  try { const u = await api(`/api/users/${id}`); showUser(u); } catch (err) { alert('Error: ' + err.message); }
});

function showUser(u) {
  document.getElementById('user-info').innerHTML = `User ID: <strong>${u.id}</strong> — ${u.name} — Balance: $${u.balance.toFixed(2)}`;
  document.getElementById('user-id').value = u.id;
}

document.getElementById('start-deposit').addEventListener('click', async () => {
  const userId = document.getElementById('user-id').value.trim();
  const amount = parseFloat(document.getElementById('deposit-amount').value);
  const method = document.getElementById('payment-method').value;
  if (!userId) return alert('Load or create user first');
  if (isNaN(amount)) return alert('Enter amount');
  if (amount < 20) return alert('Minimum deposit is $20');
  try {
    const res = await api('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: Number(userId), amount, method }) });
    document.getElementById('deposit-result').innerHTML = `
      <div>Deposit initiated: <strong>$${res.amount.toFixed(2)}</strong></div>
      <div>Send crypto to: <code>${res.address}</code></div>
      <div>Deposit ID: <strong>${res.depositId}</strong></div>
      <div style="margin-top:8px">This deposit will be auto-confirmed (simulated) within ~20 seconds.</div>
    `;
    // auto-confirm will update balance on server; user can refresh dashboard to see updated balance
  } catch (err) { alert('Error: ' + err.message); }
});

async function init() {
  await loadAuthNavbar();
  await checkAuthStatus();
}

init().catch(err => console.error(err));
