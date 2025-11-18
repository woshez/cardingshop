async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

// Load auth navbar
async function loadAuthNavbar() {
  const mount = document.getElementById('auth-navbar-mount') || document.body.insertBefore(document.createElement('div'), document.body.firstChild);
  if (!mount.id) mount.id = 'auth-navbar-mount';
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

// Check admin access
async function checkAdminAccess() {
  try {
    await api('/api/admin/check');
  } catch (err) {
    alert('Access denied. Admin only.');
    window.location.href = '/';
  }
}

// Load wallet configuration
async function loadWalletConfig() {
  try {
    const wallet = await api('/api/admin/wallet');
    document.getElementById('wallet-address').value = wallet.walletAddress || '';
  } catch (err) {
    console.error('Failed to load wallet:', err);
  }
}

// Load site settings (public)
async function loadSettings() {
  try {
    const settings = await api('/api/settings');
    document.getElementById('site-name').value = settings.siteName || '';
    document.getElementById('theme-color').value = settings.themeColor || '#1e90ff';
    document.getElementById('login-bg').value = settings.loginBg || '#f0f0f0';
    if (settings.logoPath) {
      const img = document.getElementById('logo-preview');
      img.src = settings.logoPath;
      img.style.display = 'block';
    }
    if (settings.loginLogo) {
      const img = document.getElementById('login-logo-preview');
      img.src = settings.loginLogo;
      img.style.display = 'block';
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

let logoDataUrl = null;
let loginLogoDataUrl = null;
async function loadCategories() {
  try {
    const cats = await api('/api/admin/categories');
    const list = document.getElementById('categories-list');
    list.innerHTML = '';
    cats.forEach(c => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '6px 0';
      div.innerHTML = `<span>${c.name}</span><button data-id="${c.id}">Delete</button>`;
      div.querySelector('button').addEventListener('click', async () => {
        if (!confirm('Delete category "' + c.name + '"? Products will become "Uncategorized".')) return;
        await api('/api/admin/categories/' + c.id, { method: 'DELETE' });
        loadCategories();
        loadProducts();
      });
      list.appendChild(div);
    });
  } catch (e) { console.error('Failed to load categories', e); }
}

document.getElementById('add-category').addEventListener('click', async () => {
  const name = document.getElementById('new-category-name').value.trim();
  if (!name) return alert('Enter category name');
  try {
    await api('/api/admin/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
    });
    document.getElementById('new-category-name').value = '';
    loadCategories();
    loadProducts();
  } catch (e) { alert('Failed to add category: ' + e.message); }
});

// Posts management
async function loadPosts() {
  try {
    const posts = await api('/api/admin/posts');
    const container = document.getElementById('posts-list');
    container.innerHTML = '';
    posts.forEach(p => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '6px 0';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${p.title}</strong><div style="font-size:12px; color:#666">${new Date(p.createdAt).toLocaleString()}</div>`;
      const right = document.createElement('div');
      right.innerHTML = `<button data-id="${p.id}">Delete</button>`;
      right.querySelector('button').addEventListener('click', async () => {
        if (!confirm('Delete post "' + p.title + '"?')) return;
        await api('/api/admin/posts/' + p.id, { method: 'DELETE' });
        loadPosts();
      });
      div.appendChild(left);
      div.appendChild(right);
      container.appendChild(div);
    });
  } catch (e) { console.error('Failed to load posts', e); }
}

document.getElementById('create-post').addEventListener('click', async () => {
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  if (!title) return alert('Enter post title');
  try {
    await api('/api/admin/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content }) });
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    loadPosts();
  } catch (e) { alert('Failed to create post: ' + e.message); }
});
document.getElementById('logo-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    logoDataUrl = reader.result;
    const img = document.getElementById('logo-preview');
    img.src = logoDataUrl;
    img.style.display = 'block';
  };
  reader.readAsDataURL(f);
});

document.getElementById('login-logo-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    loginLogoDataUrl = reader.result;
    const img = document.getElementById('login-logo-preview');
    img.src = loginLogoDataUrl;
    img.style.display = 'block';
  };
  reader.readAsDataURL(f);
});

document.getElementById('save-settings').addEventListener('click', async () => {
  const siteName = document.getElementById('site-name').value.trim();
  const themeColor = document.getElementById('theme-color').value;
  try {
    const res = await api('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteName, themeColor, logoBase64: logoDataUrl })
    });
    document.getElementById('settings-result').textContent = 'Settings saved';
    setTimeout(() => { document.getElementById('settings-result').textContent = ''; }, 3000);
  } catch (err) {
    alert('Error saving settings: ' + err.message);
  }
});

document.getElementById('reset-logo').addEventListener('click', async () => {
  if (!confirm('Remove the current logo?')) return;
  try {
    const res = await api('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLogo: true })
    });
    logoDataUrl = null;
    const img = document.getElementById('logo-preview');
    img.src = '';
    img.style.display = 'none';
    document.getElementById('settings-result').textContent = 'Logo removed';
    setTimeout(() => { document.getElementById('settings-result').textContent = ''; }, 3000);
  } catch (err) {
    alert('Error removing logo: ' + err.message);
  }
});

document.getElementById('save-login-settings').addEventListener('click', async () => {
  const loginBg = document.getElementById('login-bg').value;
  try {
    const res = await api('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginBg, loginLogoBase64: loginLogoDataUrl })
    });
    document.getElementById('login-settings-result').textContent = 'Login settings saved';
    setTimeout(() => { document.getElementById('login-settings-result').textContent = ''; }, 3000);
  } catch (err) {
    alert('Error saving login settings: ' + err.message);
  }
});

document.getElementById('reset-login-logo').addEventListener('click', async () => {
  if (!confirm('Remove the current login logo?')) return;
  try {
    const res = await api('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLoginLogo: true })
    });
    loginLogoDataUrl = null;
    const img = document.getElementById('login-logo-preview');
    img.src = '';
    img.style.display = 'none';
    document.getElementById('login-settings-result').textContent = 'Login logo removed';
    setTimeout(() => { document.getElementById('login-settings-result').textContent = ''; }, 3000);
  } catch (err) {
    alert('Error removing login logo: ' + err.message);
  }
});

async function loadProducts() {
  const products = await api('/api/products');
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '';
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.price.toFixed(2)}</td>
      <td>${(p.category || 'Uncategorized')}</td>
      <td><img src="${p.image}" alt="" style="height:40px"></td>
      <td>
        <button class="edit">Edit</button>
        <button class="del">Delete</button>
      </td>
    `;
    tr.querySelector('.edit').addEventListener('click', () => editProduct(p));
    tr.querySelector('.del').addEventListener('click', async () => {
      if (!confirm('Delete product?')) return;
      await api(`/api/products/${p.id}`, { method: 'DELETE' });
      loadProducts();
    });
    tbody.appendChild(tr);
  });
}

function resetForm() {
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-image').value = '';
  document.getElementById('prod-category').value = '';
  document.getElementById('prod-details').value = '';
  document.getElementById('form-title').textContent = 'Add Product';
}

function editProduct(p) {
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-image').value = p.image || '';
  document.getElementById('prod-category').value = p.category || '';
  document.getElementById('prod-details').value = p.details || '';
  document.getElementById('form-title').textContent = 'Edit Product';
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const image = document.getElementById('prod-image').value.trim();
  const category = document.getElementById('prod-category').value.trim() || 'Uncategorized';
  const details = document.getElementById('prod-details').value.trim();
  try {
    if (id) {
      await api(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, image, category, details })
      });
    } else {
      await api('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, image, category, details })
      });
    }
    resetForm();
    loadProducts();
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

document.getElementById('cancel').addEventListener('click', (e) => {
  e.preventDefault();
  resetForm();
});

// Admin user promotion
document.getElementById('promote-btn').addEventListener('click', async () => {
  const userId = document.getElementById('promote-user-id').value.trim();
  if (!userId) return alert('Enter user ID');
  try {
    const res = await api('/api/admin/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: Number(userId) })
    });
    document.getElementById('promote-result').textContent = res.message;
    setTimeout(() => {
      document.getElementById('promote-result').textContent = '';
      document.getElementById('promote-user-id').value = '';
    }, 3000);
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

// Wallet configuration
document.getElementById('save-wallet').addEventListener('click', async () => {
  const walletAddress = document.getElementById('wallet-address').value.trim();
  if (!walletAddress) return alert('Enter wallet address');
  try {
    const res = await api('/api/admin/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });
    document.getElementById('wallet-result').textContent = 'Wallet saved: ' + walletAddress;
    setTimeout(() => {
      document.getElementById('wallet-result').textContent = '';
    }, 3000);
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

async function init() {
  await loadAuthNavbar();
  await checkAdminAccess();
  await loadPosts();
  await loadWalletConfig();
  await loadSettings();
  await loadProducts();
}

init().catch(err => console.error(err));
