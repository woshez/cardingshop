async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

async function loadAuthNavbar() {
  const mount = document.getElementById('auth-navbar-mount');
  const res = await fetch('/auth-navbar.html');
  const html = await res.text();
  mount.innerHTML = html;
  const scripts = mount.querySelectorAll('script');
  scripts.forEach(s => { const ns = document.createElement('script'); ns.textContent = s.textContent; mount.appendChild(ns); });
}

async function loadDashboard() {
  try {
    const me = await api('/api/me');
    document.getElementById('user-info').innerHTML = `ID: <strong>${me.id}</strong> — ${me.name} — ${me.email} — Balance: $${me.balance.toFixed(2)}`;
    
    const purchases = await api('/api/purchases/my');
    const purchasesList = document.getElementById('purchases-list');
    purchasesList.innerHTML = '';
    if (purchases.length === 0) {
      purchasesList.innerHTML = '<p>No purchases yet.</p>';
    } else {
      purchases.forEach(pur => {
        const div = document.createElement('div');
        div.style.border = '1px solid #ddd';
        div.style.padding = '12px';
        div.style.borderRadius = '6px';
        div.style.marginBottom = '12px';
        let itemsHtml = '';
        pur.items.forEach(item => {
          itemsHtml += `<div style="margin:8px 0; padding:8px; background:#f5f5f5; border-radius:4px">
            <strong>${item.name}</strong> x${item.qty} — $${(item.price * item.qty).toFixed(2)}<br>
            <small style="color:#666">Details: ${item.details ? item.details.substring(0, 100) + (item.details.length > 100 ? '...' : '') : '(none)'}</small>
          </div>`;
        });
        div.innerHTML = `
          <div><strong>Purchase #${pur.id}</strong> — ${new Date(pur.purchasedAt).toLocaleString()}</div>
          ${itemsHtml}
        `;
        purchasesList.appendChild(div);
      });
    }
    
    const deposits = await api('/api/deposits/my');
    const tbody = document.getElementById('deposits-body');
    tbody.innerHTML = '';
    deposits.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.id}</td><td>${d.amount.toFixed(2)}</td><td><code>${d.address}</code></td><td>${d.status}</td><td>${new Date(d.createdAt).toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });

    // Load products for dashboard shop
    await loadProductsForDashboard();
  } catch (err) {
    console.error(err);
    window.location.href = '/login.html';
  }
}

let allProducts = [];
async function loadProductsForDashboard() {
  try {
    allProducts = await api('/api/products');
    const select = document.getElementById('category-select');
    select.innerHTML = '<option value="">All</option>';
    const cats = Array.from(new Set(allProducts.map(p => p.category || 'Uncategorized'))).sort();
    cats.forEach(c => {
      const opt = document.createElement('option'); opt.value = c; opt.textContent = c; select.appendChild(opt);
    });
    select.addEventListener('change', () => renderProducts(select.value));
    renderProducts('');
  } catch (e) { console.error('Failed to load products:', e); }
}

function renderProducts(category) {
  const list = document.getElementById('products-list');
  list.innerHTML = '';
  // When category is empty -> show grouped sections by category
  if (!category) {
    const grouped = allProducts.reduce((acc, p) => {
      const c = p.category || 'Uncategorized';
      acc[c] = acc[c] || [];
      acc[c].push(p);
      return acc;
    }, {});
    Object.keys(grouped).sort().forEach(cat => {
      const section = document.createElement('div');
      const h = document.createElement('h3');
      h.textContent = cat;
      section.appendChild(h);
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fit,minmax(220px,1fr))';
      grid.style.gap = '12px';
      grouped[cat].forEach(p => {
        const card = document.createElement('div');
        card.style.border = '1px solid #ddd';
        card.style.padding = '8px';
        card.style.borderRadius = '6px';
        card.innerHTML = `
          <div style="height:120px; display:flex; align-items:center; justify-content:center; overflow:hidden">
            ${p.image ? `<img src="${p.image}" alt="" style="max-height:100%; max-width:100%">` : ''}
          </div>
          <h4 style="margin:8px 0 4px">${p.name}</h4>
          <div style="margin-bottom:8px">Category: ${p.category || 'Uncategorized'}</div>
          <div style="font-weight:600">$${Number(p.price).toFixed(2)}</div>
          <div style="margin-top:8px"><button data-id="${p.id}">Buy</button></div>
        `;
        card.querySelector('button').addEventListener('click', () => buyProduct(p));
        grid.appendChild(card);
      });
      section.appendChild(grid);
      list.appendChild(section);
    });
    return;
  }

  const items = allProducts.filter(p => (p.category || 'Uncategorized') === category);
  items.forEach(p => {
    const card = document.createElement('div');
    card.style.border = '1px solid #ddd';
    card.style.padding = '8px';
    card.style.borderRadius = '6px';
    card.innerHTML = `
      <div style="height:120px; display:flex; align-items:center; justify-content:center; overflow:hidden">
        ${p.image ? `<img src="${p.image}" alt="" style="max-height:100%; max-width:100%">` : ''}
      </div>
      <h4 style="margin:8px 0 4px">${p.name}</h4>
      <div style="margin-bottom:8px">Category: ${p.category || 'Uncategorized'}</div>
      <div style="font-weight:600">$${Number(p.price).toFixed(2)}</div>
      <div style="margin-top:8px"><button data-id="${p.id}">Buy</button></div>
    `;
    card.querySelector('button').addEventListener('click', () => buyProduct(p));
    list.appendChild(card);
  });
}

async function buyProduct(p) {
  try {
    const res = await api('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: [{ productId: p.id, name: p.name, price: p.price, qty: 1 }] })
    });
    if (res.success) {
      alert(res.message || 'Purchase successful!');
      location.reload();
    } else {
      alert('Purchase failed: ' + (res.message || 'unknown'));
    }
  } catch (e) {
    alert('Purchase failed: ' + e.message);
  }
}

(async function() { await loadAuthNavbar(); await loadDashboard(); })();