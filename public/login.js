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

// Load login page settings
async function loadLoginSettings() {
  try {
    const settings = await api('/api/settings');
    if (settings.loginBg) {
      document.body.style.background = settings.loginBg;
    }
    if (settings.loginLogo) {
      const img = document.getElementById('login-page-logo');
      img.src = settings.loginLogo;
      img.style.display = 'block';
    }
  } catch (e) {
    console.error('Failed to load login settings:', e);
  }
}

loadLoginSettings();

// Menu toggle for the header menu on the login page
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('menu-btn');
  const dropdown = document.getElementById('menu-dropdown');
  if (!btn || !dropdown) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', () => { dropdown.style.display = 'none'; });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = '';

  try {
    const u = await api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    // Redirect to dashboard after login
    window.location.href = '/dashboard.html';
  } catch (err) {
    errorDiv.textContent = 'Login failed: ' + err.message;
  }
});

// Forgot password form
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const errorDiv = document.getElementById('forgot-error');
  const resultDiv = document.getElementById('forgot-result');
  errorDiv.textContent = '';
  resultDiv.textContent = '';

  try {
    const r = await api('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    resultDiv.innerHTML = '<strong>Reset Token (for testing):</strong><br>' + r.token;
  } catch (err) {
    errorDiv.textContent = 'Error: ' + err.message;
  }
});

// Reset password form
document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = document.getElementById('reset-token').value.trim();
  const newPassword = document.getElementById('reset-password').value;
  const errorDiv = document.getElementById('reset-error');
  errorDiv.textContent = '';

  if (newPassword.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters';
    return;
  }

  try {
    await api('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    alert('Password reset successfully! You can now login.');
  } catch (err) {
    errorDiv.textContent = 'Error: ' + err.message;
  }
});
