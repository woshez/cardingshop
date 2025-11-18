const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Basic session middleware (not for production without a proper store)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const DEPOSITS_FILE = path.join(__dirname, 'deposits.json');
const WALLET_FILE = path.join(__dirname, 'wallet.json');
const CATEGORIES_FILE = path.join(__dirname, 'categories.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const PURCHASES_FILE = path.join(__dirname, 'purchases.json');
const POSTS_FILE = path.join(__dirname, 'posts.json');

async function readUsers() {
  try { const data = await fs.readFile(USERS_FILE, 'utf8'); return JSON.parse(data || '[]'); } catch (e) { return []; }
}
async function writeUsers(users) { await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8'); }

async function readDeposits() {
  try { const d = await fs.readFile(DEPOSITS_FILE, 'utf8'); return JSON.parse(d || '[]'); } catch (e) { return []; }
}
async function writeDeposits(deposits) { await fs.writeFile(DEPOSITS_FILE, JSON.stringify(deposits, null, 2), 'utf8'); }

async function readProducts() {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (e) {
    return [];
  }
}

async function writeProducts(products) {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
}

async function readWallet() {
  try { const data = await fs.readFile(WALLET_FILE, 'utf8'); return JSON.parse(data || '{}'); } catch (e) { return { walletAddress: '' }; }
}
async function writeWallet(wallet) { await fs.writeFile(WALLET_FILE, JSON.stringify(wallet, null, 2), 'utf8'); }

async function readSettings() {
  try { const data = await fs.readFile(SETTINGS_FILE, 'utf8'); return JSON.parse(data || '{}'); } catch (e) { return { siteName: 'carding shop', logoPath: '', themeColor: '#1e90ff', loginBg: '#f0f0f0', loginLogo: '' }; }
}
async function writeSettings(settings) { await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8'); }

async function readCategories() {
  try { const data = await fs.readFile(CATEGORIES_FILE, 'utf8'); return JSON.parse(data || '[]'); } catch (e) { return []; }
}
async function writeCategories(categories) { await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8'); }

async function readPurchases() {
  try { const data = await fs.readFile(PURCHASES_FILE, 'utf8'); return JSON.parse(data || '[]'); } catch (e) { return []; }
}
async function writePurchases(purchases) { await fs.writeFile(PURCHASES_FILE, JSON.stringify(purchases, null, 2), 'utf8'); }

async function readPosts() { try { const data = await fs.readFile(POSTS_FILE, 'utf8'); return JSON.parse(data || '[]'); } catch (e) { return []; } }
async function writePosts(posts) { await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8'); }

function randomCryptoAddress() {
  const chars = 'abcdef0123456789';
  let addr = '0x';
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  return addr;
}

// Seed admin user on startup
async function seedAdminUser() {
  const users = await readUsers();
  if (users.length === 0) {
    const adminUser = {
      id: 1,
      name: 'Admin',
      email: 'admin@store.local',
      passwordHash: await bcrypt.hash('admin123', 10),
      balance: 0,
      isAdmin: true
    };
    users.push(adminUser);
    await writeUsers(users);
    console.log('Seeded admin user: admin@store.local / admin123');
  }
}

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const products = await readProducts();
    const { category } = req.query || {};
    if (category) {
      const filtered = products.filter(p => (p.category || 'Uncategorized') === category);
      return res.json(filtered);
    }
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'Unable to read products' });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, price, image, category, details } = req.body || {};
  if (!name || price == null) return res.status(400).json({ error: 'Missing name or price' });
  const products = await readProducts();
  const id = products.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
  const prod = { id, name, price: Number(price), image: image || '', category: category || 'Uncategorized', details: details || '' };
  products.push(prod);
  await writeProducts(products);
  res.json(prod);
});

app.put('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, price, image, category, details } = req.body || {};
  const products = await readProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  products[idx] = {
    ...products[idx],
    name: name ?? products[idx].name,
    price: price != null ? Number(price) : products[idx].price,
    image: image ?? products[idx].image,
    category: category ?? products[idx].category ?? 'Uncategorized',
    details: details ?? products[idx].details ?? ''
  };
  await writeProducts(products);
  res.json(products[idx]);
});

app.delete('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const products = await readProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const removed = products.splice(idx, 1)[0];
  await writeProducts(products);
  res.json(removed);
});

// User endpoints
app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Missing name or email' });
  const users = await readUsers();
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already in use' });
  const id = users.reduce((m, u) => Math.max(m, u.id || 0), 0) + 1;
  const user = { id, name, email, balance: 0, isAdmin: false };
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  users.push(user);
  await writeUsers(users);
  // Auto-login new user
  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, email: user.email, balance: user.balance, isAdmin: user.isAdmin });
});

app.get('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const users = await readUsers();
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, balance: user.balance, isAdmin: user.isAdmin });
});

// Auth endpoints
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  const users = await readUsers();
  const user = users.find(u => u.email === email);
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, email: user.email, balance: user.balance, isAdmin: user.isAdmin });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, balance: user.balance, isAdmin: user.isAdmin });
});

// Admin check endpoint
app.get('/api/admin/check', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  res.json({ isAdmin: true });
});

// Admin promote endpoint (for development)
app.post('/api/admin/promote', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  
  const users = await readUsers();
  const requestor = users.find(u => u.id === Number(req.session.userId));
  if (!requestor || !requestor.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  
  const targetUser = users.find(u => u.id === Number(userId));
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  targetUser.isAdmin = true;
  await writeUsers(users);
  res.json({ success: true, message: `${targetUser.name} is now an admin` });
});

// Wallet management endpoints
app.get('/api/admin/wallet', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  const wallet = await readWallet();
  res.json(wallet);
});

// Public settings endpoint (site name, logo, color)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: 'Unable to read settings' });
  }
});

// Public categories
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await readCategories();
    res.json(cats);
  } catch (e) {
    res.status(500).json({ error: 'Unable to read categories' });
  }
});

// Admin categories management
app.get('/api/admin/categories', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  const cats = await readCategories();
  res.json(cats);
});

app.post('/api/admin/categories', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const cats = await readCategories();
  if (cats.find(c => c.name === name)) return res.status(400).json({ error: 'Category exists' });
  const id = cats.reduce((m,c)=>Math.max(m,c.id||0),0)+1;
  const cat = { id, name };
  cats.push(cat);
  await writeCategories(cats);
  res.json(cat);
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  const id = Number(req.params.id);
  const cats = await readCategories();
  const idx = cats.findIndex(c=>c.id===id);
  if (idx===-1) return res.status(404).json({ error: 'Category not found' });
  const removed = cats.splice(idx,1)[0];
  await writeCategories(cats);
  // Update products that used this category to 'Uncategorized'
  const products = await readProducts();
  products.forEach(p => { if (p.category === removed.name) p.category = 'Uncategorized'; });
  await writeProducts(products);
  res.json({ success:true, removed });
});

// Public posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await readPosts();
    // return newest first
    posts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: 'Unable to read posts' });
  }
});

// Admin: manage posts
app.get('/api/admin/posts', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  const posts = await readPosts();
  res.json(posts);
});

app.post('/api/admin/posts', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  const { title, content } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Missing title' });
  const posts = await readPosts();
  const id = posts.reduce((m,p)=>Math.max(m,p.id||0),0)+1;
  const post = { id, title: String(title), content: String(content || ''), createdAt: new Date().toISOString() };
  posts.push(post);
  await writePosts(posts);
  res.json(post);
});

app.delete('/api/admin/posts/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  const id = Number(req.params.id);
  const posts = await readPosts();
  const idx = posts.findIndex(p=>p.id===id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  const removed = posts.splice(idx,1)[0];
  await writePosts(posts);
  res.json({ success: true, removed });
});

// Admin: update settings (siteName, themeColor, optional logoBase64)
app.post('/api/admin/settings', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });

  const { siteName, themeColor, logoBase64, removeLogo, loginBg, loginLogoBase64, removeLoginLogo } = req.body || {};
  const settings = await readSettings();

  if (siteName != null) settings.siteName = String(siteName);
  if (themeColor != null) settings.themeColor = String(themeColor);
  if (loginBg != null) settings.loginBg = String(loginBg);

  if (logoBase64) {
    try {
      let matches = logoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      let buf;
      let ext = 'png';
      if (matches) {
        ext = matches[1].split('/')[1];
        buf = Buffer.from(matches[2], 'base64');
      } else {
        buf = Buffer.from(logoBase64, 'base64');
      }
      const filename = `logo_${Date.now()}.${ext}`;
      const outPath = path.join(__dirname, 'public', 'uploads', filename);
      await fs.writeFile(outPath, buf);
      settings.logoPath = `/uploads/${filename}`;
    } catch (e) {
      console.error('Failed to save logo:', e);
      return res.status(400).json({ error: 'Invalid logo data' });
    }
  }

  if (loginLogoBase64) {
    try {
      let matches = loginLogoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      let buf;
      let ext = 'png';
      if (matches) {
        ext = matches[1].split('/')[1];
        buf = Buffer.from(matches[2], 'base64');
      } else {
        buf = Buffer.from(loginLogoBase64, 'base64');
      }
      const filename = `login_logo_${Date.now()}.${ext}`;
      const outPath = path.join(__dirname, 'public', 'uploads', filename);
      await fs.writeFile(outPath, buf);
      settings.loginLogo = `/uploads/${filename}`;
    } catch (e) {
      console.error('Failed to save login logo:', e);
      return res.status(400).json({ error: 'Invalid login logo data' });
    }
  }

  if (removeLogo) {
    try {
      if (settings.logoPath) {
        const rel = settings.logoPath.replace(/^\/+/, '');
        const fp = path.join(__dirname, 'public', rel);
        await fs.unlink(fp).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to remove logo file:', e);
    }
    settings.logoPath = '';
  }

  if (removeLoginLogo) {
    try {
      if (settings.loginLogo) {
        const rel = settings.loginLogo.replace(/^\/+/, '');
        const fp = path.join(__dirname, 'public', rel);
        await fs.unlink(fp).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to remove login logo file:', e);
    }
    settings.loginLogo = '';
  }

  await writeSettings(settings);
  res.json({ success: true, settings });
});

app.post('/api/admin/wallet', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = await readUsers();
  const user = users.find(u => u.id === Number(req.session.userId));
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  
  const { walletAddress } = req.body || {};
  if (!walletAddress) return res.status(400).json({ error: 'Missing walletAddress' });
  
  const wallet = { walletAddress };
  await writeWallet(wallet);
  res.json({ success: true, walletAddress });
});

// Password reset (forgot password)
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });
  const users = await readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = require('crypto').randomBytes(20).toString('hex');
  user.resetToken = token;
  user.resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  await writeUsers(users);
  res.json({ message: 'Reset token generated (simulate email)', token });
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'Missing token or newPassword' });
  const users = await readUsers();
  const user = users.find(u => u.resetToken === token && u.resetExpiry && Date.now() < u.resetExpiry);
  if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  delete user.resetToken;
  delete user.resetExpiry;
  await writeUsers(users);
  res.json({ success: true });
});

// Checkout endpoint
app.post('/api/checkout', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
  const { cart } = req.body || {};
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }
  
  try {
    const purchases = await readPurchases();
    const products = await readProducts();
    const id = purchases.reduce((m,p)=>Math.max(m,p.id||0),0)+1;
    
    // Record purchase with full product details
    const purchase = {
      id,
      userId: Number(req.session.userId),
      items: cart.map(ci => {
        const prod = products.find(p=>p.id===ci.productId);
        return {
          productId: ci.productId,
          name: ci.name,
          price: ci.price,
          qty: ci.qty || 1,
          details: prod ? prod.details : ''
        };
      }),
      purchasedAt: new Date().toISOString()
    };
    purchases.push(purchase);
    await writePurchases(purchases);
    
    console.log('Checkout received:', cart, 'User:', req.session.userId);
    res.json({ success: true, message: 'Order placed. Check your dashboard for details.', purchaseId: id });
  } catch (e) {
    console.error('Checkout error:', e);
    res.status(500).json({ success: false, message: 'Checkout failed' });
  }
});

// Deposit endpoints (crypto only, minimum $20)
app.post('/api/deposits', async (req, res) => {
  const { userId, amount, method } = req.body || {};
  if (!userId || amount == null) return res.status(400).json({ error: 'Missing userId or amount' });
  const amt = Number(amount);
  if (isNaN(amt) || amt < 20) return res.status(400).json({ error: 'Minimum deposit is $20' });
  if (method && method !== 'crypto') return res.status(400).json({ error: 'Only crypto payments supported' });

  const users = await readUsers();
  const user = users.find(u => u.id === Number(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const wallet = await readWallet();
  if (!wallet.walletAddress) return res.status(400).json({ error: 'Wallet not configured by admin' });

  const deposits = await readDeposits();
  const id = deposits.reduce((m, d) => Math.max(m, d.id || 0), 0) + 1;
  const deposit = { id, userId: user.id, amount: amt, method: 'crypto', address: wallet.walletAddress, status: 'pending', createdAt: new Date().toISOString() };
  deposits.push(deposit);
  await writeDeposits(deposits);
  // schedule automatic confirmation to simulate on-chain arrival
  autoConfirmDeposit(id, 20 * 1000).catch(e => console.error('autoConfirmDeposit error:', e));

  res.json({ depositId: id, address: wallet.walletAddress, amount: amt, message: 'Deposit initiated. Payment will be auto-confirmed shortly.' });
});

// helper: auto-confirm deposit after delay (ms)
async function autoConfirmDeposit(depositId, delayMs = 20000) {
  // run after a timeout without blocking
  setTimeout(async () => {
    try {
      const deposits = await readDeposits();
      const dep = deposits.find(d => d.id === Number(depositId));
      if (!dep) return;
      if (dep.status === 'complete') return;
      dep.status = 'complete';
      dep.completedAt = new Date().toISOString();
      await writeDeposits(deposits);

      const users = await readUsers();
      const user = users.find(u => u.id === dep.userId);
      if (!user) return console.error('autoConfirm: user not found for deposit', dep);
      user.balance = Number((user.balance + dep.amount).toFixed(2));
      await writeUsers(users);
      console.log(`Auto-confirmed deposit ${dep.id} for user ${user.id}, amount ${dep.amount}`);
    } catch (e) {
      console.error('autoConfirmDeposit failed:', e);
    }
  }, delayMs);
}

app.post('/api/deposits/:id/confirm', async (req, res) => {
  const id = Number(req.params.id);
  const deposits = await readDeposits();
  const dep = deposits.find(d => d.id === id);
  if (!dep) return res.status(404).json({ error: 'Deposit not found' });
  if (dep.status === 'complete') return res.status(400).json({ error: 'Deposit already completed' });
  dep.status = 'complete';
  dep.completedAt = new Date().toISOString();
  await writeDeposits(deposits);

  const users = await readUsers();
  const user = users.find(u => u.id === dep.userId);
  if (!user) return res.status(500).json({ error: 'Associated user not found' });
  user.balance = Number((user.balance + dep.amount).toFixed(2));
  await writeUsers(users);

  res.json({ success: true, userId: user.id, newBalance: user.balance });
});

// Get deposits for authenticated user
app.get('/api/deposits/my', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const deposits = await readDeposits();
  const my = deposits.filter(d => d.userId === Number(req.session.userId));
  res.json(my);
});

// Get purchases for authenticated user
app.get('/api/purchases/my', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const purchases = await readPurchases();
  const my = purchases.filter(p => p.userId === Number(req.session.userId));
  res.json(my);
});

seedAdminUser().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
