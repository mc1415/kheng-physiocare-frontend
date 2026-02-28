(function () {
  const stateEl = document.getElementById('menuState');
  const gridEl = document.getElementById('menuGrid');
  const tabsEl = document.getElementById('menuCategoryTabs');
  const searchEl = document.getElementById('menuSearch');
  const countEl = document.getElementById('menuCount');
  const sortEl = document.getElementById('menuSort');

  if (!stateEl || !gridEl || !tabsEl || !searchEl || !countEl || !sortEl) {
    return;
  }

  let allItems = [];
  let activeCategory = 'all';
  let searchTerm = '';
  let sortMode = 'featured';

  function showState(message, visible, type) {
    const kind = type || 'info';
    const icon = kind === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    stateEl.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${message}</span>`;
    stateEl.classList.remove('error');
    if (kind === 'error') stateEl.classList.add('error');
    stateEl.classList.toggle('hidden', !visible);
  }

  function showSkeleton(count) {
    const n = count || 6;
    gridEl.innerHTML = Array.from({ length: n })
      .map(
        () => `
          <article class="menu-card-skeleton" aria-hidden="true">
            <div class="skel-media"></div>
            <div class="skel-body">
              <div class="skel-line"></div>
              <div class="skel-line"></div>
              <div class="skel-line short"></div>
            </div>
          </article>
        `
      )
      .join('');
  }

  function usd(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `$${n.toFixed(2)}` : 'Contact';
  }

  function normalizeSupabaseImageUrl(url) {
    if (!url) return '';
    const value = String(url).trim();
    if (!value) return '';
    if (value.includes('/storage/v1/object/public/')) return value;

    const marker = '/storage/v1/object/';
    const idx = value.indexOf(marker);
    if (idx >= 0) {
      const tail = value.slice(idx + marker.length);
      if (!tail.startsWith('public/')) {
        return `${value.slice(0, idx)}${marker}public/${tail}`;
      }
    }
    return value;
  }

  function normalizeProducts(list) {
    return (list || []).map((p) => ({
      id: p.id,
      code: p.sku || `P-${p.id}`,
      name: p.name || 'Unnamed Product',
      description: p.category ? `Category: ${p.category}` : 'Physical therapy product',
      price: p.unit_price,
      imageUrl: normalizeSupabaseImageUrl(p.image_url),
      category: p.category || 'Products',
      kind: 'product'
    }));
  }

  function normalizeServices(list) {
    return (list || []).map((s) => ({
      id: s.id,
      code: `S-${s.id}`,
      name: s.title || 'Unnamed Service',
      description: s.description || 'Physiotherapy service',
      price: null,
      category: 'Services',
      duration: s.duration_seconds,
      kind: 'service'
    }));
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function durationLabel(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n) || n <= 0) return '';
    const mins = Math.round(n / 60);
    return `${mins} min`;
  }

  function buildTabs(items) {
    const categories = ['all', ...new Set(items.map((x) => x.category.toLowerCase()))];
    tabsEl.innerHTML = categories
      .map((cat) => {
        const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
        const active = cat === activeCategory ? ' active' : '';
        return `<button type="button" class="menu-cat-btn${active}" data-category="${cat}">${escapeHtml(label)}</button>`;
      })
      .join('');

    tabsEl.querySelectorAll('.menu-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category || 'all';
        render();
      });
    });
  }

  function filterItems() {
    const term = searchTerm.trim().toLowerCase();
    const filtered = allItems.filter((item) => {
      const categoryOk = activeCategory === 'all' || item.category.toLowerCase() === activeCategory;
      if (!categoryOk) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        (item.description || '').toLowerCase().includes(term) ||
        (item.code || '').toLowerCase().includes(term)
      );
    });

    if (sortMode === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'name-desc') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortMode === 'price-asc') {
      filtered.sort((a, b) => {
        const pa = Number.isFinite(Number(a.price)) ? Number(a.price) : Number.POSITIVE_INFINITY;
        const pb = Number.isFinite(Number(b.price)) ? Number(b.price) : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sortMode === 'price-desc') {
      filtered.sort((a, b) => {
        const pa = Number.isFinite(Number(a.price)) ? Number(a.price) : Number.NEGATIVE_INFINITY;
        const pb = Number.isFinite(Number(b.price)) ? Number(b.price) : Number.NEGATIVE_INFINITY;
        return pb - pa;
      });
    }

    return filtered;
  }

  function render() {
    buildTabs(allItems);
    const filtered = filterItems();
    countEl.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;

    if (!filtered.length) {
      gridEl.innerHTML = '';
      showState('No matching products or services found.', true, 'info');
      return;
    }

    showState('', false);
    gridEl.innerHTML = filtered
      .map((item, index) => {
        const price = item.kind === 'service' ? (item.duration ? durationLabel(item.duration) : 'By consultation') : usd(item.price);
        const typeLabel = item.kind === 'service' ? 'Service' : 'Product';
        const icon = item.kind === 'service' ? 'fa-hand-holding-medical' : 'fa-box-open';
        const media = item.kind === 'product' && item.imageUrl
          ? `<img class="menu-card-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">`
          : `<i class="fa-solid ${icon}"></i>`;
        return `
          <article class="menu-card" style="animation-delay:${Math.min(index * 24, 260)}ms">
            <div class="menu-card-top type-${item.kind}">${media}</div>
            <div class="menu-card-body">
              <div class="menu-card-meta">
                <span class="menu-chip">${escapeHtml(typeLabel)}</span>
                <span class="menu-id">${escapeHtml(item.code)}</span>
              </div>
              <h3>${escapeHtml(item.name)}</h3>
              <p class="menu-desc">${escapeHtml(item.description || '')}</p>
              <p class="menu-price">${escapeHtml(price)}</p>
            </div>
          </article>
        `;
      })
      .join('');
  }

  async function loadMenu() {
    showState('Loading store items...', true, 'info');
    showSkeleton(8);

    try {
      const [productsRes, servicesRes] = await Promise.all([
        fetch(`${window.API_BASE_URL}/api/products`),
        fetch(`${window.API_BASE_URL}/api/exercises`)
      ]);

      const productsJson = await productsRes.json();
      const servicesJson = await servicesRes.json();

      const products = productsRes.ok && productsJson.success ? normalizeProducts(productsJson.data) : [];
      const services = servicesRes.ok && servicesJson.success ? normalizeServices(servicesJson.data) : [];

      allItems = [...products, ...services];

      if (!allItems.length) {
        showState('No products or services are available yet.', true, 'info');
        countEl.textContent = '0 items';
        tabsEl.innerHTML = '';
        gridEl.innerHTML = '';
        return;
      }

      render();
    } catch (error) {
      console.error('Failed to load menu:', error);
      showState('Could not load store items. Please try again shortly.', true, 'error');
      countEl.textContent = '0 items';
      tabsEl.innerHTML = '';
      gridEl.innerHTML = '';
    }
  }

  searchEl.addEventListener('input', (e) => {
    searchTerm = e.target.value || '';
    render();
  });

  sortEl.addEventListener('change', (e) => {
    sortMode = e.target.value || 'featured';
    render();
  });

  loadMenu();
})();
