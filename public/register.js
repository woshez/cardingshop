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

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-password-confirm').value;
  const errorDiv = document.getElementById('register-error');
  errorDiv.textContent = '';

  if (!name || !email || !password) {
    errorDiv.textContent = 'All fields are required';
    return;
  }

  if (password.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters';
    return;
  }

  if (password !== confirm) {
    errorDiv.textContent = 'Passwords do not match';
    return;
  }

  try {
    const u = await api('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    // Redirect to dashboard (auto-logged-in)
    window.location.href = '/dashboard.html';
  } catch (err) {
    errorDiv.textContent = 'Error: ' + err.message;
  }
});
