async function fetchProducts() {
  const res = await fetch('/api/products');
  return res.json();
}

function formatPrice(n) {
  return '$' + n.toFixed(2);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const cart = loadCart();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-count').textContent = `Cart: ${cartCount}`;

  const list = document.getElementById('cart-items');
  list.innerHTML = '';
  let total = 0;
  cart.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} x ${item.qty} — ${formatPrice(item.price * item.qty)}`;
    list.appendChild(li);
    total += item.price * item.qty;
  });
  document.getElementById('cart-total').textContent = `Total: ${formatPrice(total)}`;
}

function addToCart(product) {
  const cart = loadCart();
  const found = cart.find(i => i.id === product.id);
  if (found) found.qty += 1; else cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  saveCart(cart);
}

async function checkout() {
  const cart = loadCart();
  if (!cart.length) return alert('Cart is empty');
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart })
  });
  const data = await res.json();
  if (data.success) {
    alert(data.message || 'Order placed!');
    localStorage.removeItem('cart');
    updateCartUI();
    window.location.href = '/dashboard.html';
  } else {
    alert('Checkout failed: ' + (data.message || 'unknown'));
  }
}

function showDetailsModal(product) {
  document.getElementById('modal-title').textContent = product.name;
  document.getElementById('modal-details').textContent = product.details || '(No details available)';
  document.getElementById('details-modal').style.display = 'block';
}

document.getElementById('close-modal').addEventListener('click', () => {
  document.getElementById('details-modal').style.display = 'none';
});

document.getElementById('details-modal').addEventListener('click', (e) => {
  if (e.target.id === 'details-modal') document.getElementById('details-modal').style.display = 'none';
});

document.getElementById('checkout').addEventListener('click', checkout);

// Load auth navbar
async function loadAuthNavbar() {
  const mount = document.getElementById('auth-navbar-mount');
  const res = await fetch('/auth-navbar.html');
  const html = await res.text();
  mount.innerHTML = html;
  // Re-run any scripts in the navbar
  const scripts = mount.querySelectorAll('script');
  scripts.forEach(s => {
    const newScript = document.createElement('script');
    newScript.textContent = s.textContent;
    mount.appendChild(newScript);
  });
}

async function init() {
  await loadAuthNavbar();
  const products = await fetchProducts();
  const categoriesRes = await fetch('/api/categories');
  const categories = await categoriesRes.json();
  const container = document.getElementById('products');

  // Group products by category
  const byCat = products.reduce((acc,p)=>{ const c = p.category||'Uncategorized'; acc[c]=acc[c]||[]; acc[c].push(p); return acc; },{});
  const ordered = categories.length ? categories.map(c=>c.name).concat(Object.keys(byCat).filter(k=>!categories.map(c=>c.name).includes(k))) : Object.keys(byCat);

  ordered.forEach(cat => {
    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-header';
    const title = document.createElement('div');
    title.className = 'category-title';
    title.textContent = cat;
    const chevron = document.createElement('div');
    chevron.textContent = '▾';
    header.appendChild(title);
    header.appendChild(chevron);

    const body = document.createElement('div');
    body.className = 'category-body';
    const grid = document.createElement('div');
    grid.className = 'category-grid';

      (byCat[cat]||[]).forEach(p=>{
        const card = document.createElement('div');
        card.className = 'card fade-in';
        card.innerHTML = `
          <div style="height:120px; display:flex; align-items:center; justify-content:center; overflow:hidden">
            ${p.image?`<img src="${p.image}" alt="">`:''}
          </div>
          <h4 style="margin:8px 0 4px">${p.name}</h4>
          <div style="font-weight:600">${formatPrice(p.price)}</div>
          <div style="margin-top:8px; display:flex; gap:4px">
            <button class="add-btn" style="flex:1">Add to cart</button>
            <button class="view-details" style="flex:0.8">Details</button>
          </div>
        `;
        card.querySelector('.add-btn').addEventListener('click', ()=> addToCart(p));
        card.querySelector('.view-details').addEventListener('click', ()=> showDetailsModal(p));
        grid.appendChild(card);
      });    body.appendChild(grid);
    // initial collapsed state: expanded
    body.style.maxHeight = grid.scrollHeight + 'px';
    body.style.opacity = '1';

    header.addEventListener('click', ()=>{
      const isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
      if (isOpen) {
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        chevron.textContent = '▸';
      } else {
        body.style.maxHeight = grid.scrollHeight + 'px';
        body.style.opacity = '1';
        chevron.textContent = '▾';
      }
    });

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);
  });

  updateCartUI();
}

init().catch(err => console.error(err));
