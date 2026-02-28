document.addEventListener('DOMContentLoaded', function () {
    const productGrid = document.getElementById('posProductGrid');
    const productCount = document.getElementById('posProductCount');
    const searchInput = document.getElementById('posSearchInput');
    const cartBody = document.getElementById('posCartBody');
    const patientSelect = document.getElementById('posPatient');
    const statusSelect = document.getElementById('posStatus');
    const diagnosticInput = document.getElementById('posDiagnostic');
    const discountTypeInput = document.getElementById('posDiscountType');
    const discountValueInput = document.getElementById('posDiscountValue');
    const subtotalEl = document.getElementById('posSubtotal');
    const discountAmountEl = document.getElementById('posDiscountAmount');
    const totalEl = document.getElementById('posTotal');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const fullscreenBtn = document.getElementById('posFullscreenBtn');
    const addCustomItemBtn = document.getElementById('addCustomItemBtn');
    const customItemName = document.getElementById('customItemName');
    const customItemPrice = document.getElementById('customItemPrice');
    const customItemQty = document.getElementById('customItemQty');
    const langPills = Array.from(document.querySelectorAll('.lang-pill[data-lang]'));
    const toastConfig = { duration: 3000, close: true, gravity: 'top', position: 'right', stopOnFocus: true };

    let allProducts = [];
    const cart = [];

    const tr = (key, fallback) => (typeof window.t === 'function' ? window.t(key) : (fallback || key));
    const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
    const toNum = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
    };

    async function fetchApi(url, options = {}) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                let msg = 'API error.';
                try {
                    const err = await res.json();
                    msg = err.message || msg;
                } catch (_) {
                    msg = res.statusText || msg;
                }
                throw new Error(msg);
            }
            return res.status === 204 || options.method === 'DELETE' ? { success: true } : res.json();
        } catch (err) {
            Toastify({ ...toastConfig, text: `Error: ${err.message}`, style: { background: 'var(--red-accent)' } }).showToast();
            return null;
        }
    }

    function cartTotals() {
        const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const discountType = discountTypeInput.value || 'none';
        let discountValue = toNum(discountValueInput.value);
        if (discountType === 'percent' && discountValue > 100) discountValue = 100;
        if (discountValue < 0) discountValue = 0;

        let discountAmount = 0;
        if (discountType === 'flat') discountAmount = discountValue;
        if (discountType === 'percent') discountAmount = subtotal * (discountValue / 100);
        if (discountAmount > subtotal) discountAmount = subtotal;

        const total = Math.max(0, subtotal - discountAmount);
        return {
            subtotal: Number(subtotal.toFixed(2)),
            discountType,
            discountValue,
            discountAmount: Number(discountAmount.toFixed(2)),
            total: Number(total.toFixed(2))
        };
    }

    function renderTotals() {
        const t = cartTotals();
        subtotalEl.textContent = money(t.subtotal);
        discountAmountEl.textContent = money(t.discountAmount);
        totalEl.textContent = money(t.total);
    }

    function renderCart() {
        cartBody.innerHTML = '';
        if (cart.length === 0) {
            cartBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">${tr('cartEmpty', 'Cart is empty')}</td></tr>`;
            renderTotals();
            return;
        }

        cart.forEach((item, i) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.service_name}</td>
                <td>
                    <div class="pos-qty-controls">
                        <button type="button" data-action="dec" data-index="${i}">-</button>
                        <span>${item.quantity}</span>
                        <button type="button" data-action="inc" data-index="${i}">+</button>
                    </div>
                </td>
                <td>${money(item.unit_price)}</td>
                <td>${money(item.quantity * item.unit_price)}</td>
                <td><button class="btn-action delete" type="button" data-action="remove" data-index="${i}" title="Remove"><i class="fa-solid fa-trash"></i></button></td>
            `;
            cartBody.appendChild(row);
        });
        renderTotals();
    }

    function addToCart(product, quantity = 1) {
        const idx = cart.findIndex((i) => i.product_id === product.product_id && i.service_name === product.service_name);
        if (idx >= 0) cart[idx].quantity += quantity;
        else cart.push({ ...product, quantity });
        renderCart();
    }

    function renderProducts(list) {
        productGrid.innerHTML = '';
        productCount.textContent = `${list.length} ${tr('item', 'Item').toLowerCase()}${list.length === 1 ? '' : 's'}`;
        if (list.length === 0) {
            productGrid.innerHTML = `<p style="color:var(--text-secondary);">${tr('noProductsFound', 'No products found.')}</p>`;
            return;
        }

        list.forEach((p) => {
            const stock = Number(p.stock_level || 0);
            const card = document.createElement('article');
            card.className = 'pos-product-card';
            card.innerHTML = `
                <h4>${p.name || 'Unnamed Product'}</h4>
                <p class="meta">${p.category || 'General'} - SKU: ${p.sku || '-'}</p>
                <div class="pos-product-footer">
                    <strong>${money(p.unit_price)}</strong>
                    <span class="status-chip ${stock > 0 ? 'in-stock' : 'out-of-stock'}">${stock > 0 ? `Stock: ${stock}` : 'Out of stock'}</span>
                </div>
                <button class="btn-primary-action pos-add-btn" type="button" ${stock <= 0 ? 'disabled' : ''}>
                    <i class="fa-solid fa-plus"></i> ${tr('add', 'Add')}
                </button>
            `;
            card.querySelector('.pos-add-btn').addEventListener('click', () => {
                addToCart({
                    product_id: p.id,
                    service_name: p.name,
                    unit_price: toNum(p.unit_price),
                    is_product: true
                });
            });
            productGrid.appendChild(card);
        });
    }

    async function loadPatients() {
        const result = await fetchApi(`${API_BASE_URL}/api/patients`);
        if (!result || !result.success) return;

        result.data.forEach((p) => {
            const option = document.createElement('option');
            option.value = p.raw_id;
            option.textContent = `${p.fullName} (${p.display_id})`;
            patientSelect.appendChild(option);
        });
    }

    async function loadProducts() {
        const result = await fetchApi(`${API_BASE_URL}/api/products`);
        if (!result || !result.success) return;
        allProducts = result.data || [];
        renderProducts(allProducts);
    }

    async function checkout() {
        if (cart.length === 0) {
            Toastify({ ...toastConfig, text: tr('addAtLeastOneItem', 'Add at least one item.'), style: { background: 'var(--red-accent)' } }).showToast();
            return;
        }

        const totals = cartTotals();
        const patientValue = patientSelect.value ? Number(patientSelect.value) : null;
        const payload = {
            patientId: patientValue,
            status: statusSelect.value || 'Paid',
            diagnostic: diagnosticInput.value || tr('posSaleDefaultDiagnostic', 'POS Sale'),
            items: cart.map((item) => ({
                service_name: item.service_name,
                quantity: item.quantity,
                unit_price: item.unit_price
            })),
            inventoryUpdates: cart
                .filter((item) => item.product_id)
                .map((item) => ({ id: item.product_id, quantitySold: item.quantity })),
            discount_type: totals.discountType,
            discount_value: totals.discountType === 'none' ? 0 : totals.discountValue,
            subtotal: totals.subtotal,
            discount_amount: totals.discountAmount,
            total_amount: totals.total
        };

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = tr('loading', 'Loading...');
        const result = await fetchApi(`${API_BASE_URL}/api/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = `<i class="fa-solid fa-receipt"></i> ${tr('checkout', 'Checkout')}`;

        if (!result || !result.success) return;

        Toastify({ ...toastConfig, text: tr('saleCompleted', 'Sale completed and invoice created.'), style: { background: 'var(--green-accent)' } }).showToast();
        const invoiceId = result?.data?.invoiceId;
        cart.length = 0;
        renderCart();
        if (invoiceId) window.open(`../kheng-physiocare-receipt.html?receipt-id=${invoiceId}`, '_blank');
    }

    async function toggleFullscreen() {
        try {
            if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
            else await document.exitFullscreen();
        } catch (err) {
            Toastify({ ...toastConfig, text: `Fullscreen failed: ${err.message}`, style: { background: 'var(--red-accent)' } }).showToast();
        }
    }

    function syncFullscreenUi() {
        const inFullscreen = !!document.fullscreenElement;
        document.body.classList.toggle('pos-fullscreen-active', inFullscreen);
        if (!fullscreenBtn) return;
        fullscreenBtn.innerHTML = inFullscreen
            ? `<i class="fa-solid fa-compress"></i> ${tr('exitFullscreen', 'Exit Fullscreen')}`
            : `<i class="fa-solid fa-expand"></i> ${tr('fullscreen', 'Fullscreen')}`;
    }

    function syncLanguagePills() {
        const lang = localStorage.getItem('lang') || 'en';
        langPills.forEach((btn) => btn.classList.toggle('active', btn.dataset.lang === lang));
    }

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) return renderProducts(allProducts);
        renderProducts(allProducts.filter((p) =>
            String(p.name || '').toLowerCase().includes(q) ||
            String(p.sku || '').toLowerCase().includes(q) ||
            String(p.category || '').toLowerCase().includes(q)
        ));
    });

    cartBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const index = Number(btn.dataset.index);
        if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
        const action = btn.dataset.action;
        if (action === 'inc') cart[index].quantity += 1;
        if (action === 'dec') cart[index].quantity = Math.max(1, cart[index].quantity - 1);
        if (action === 'remove') cart.splice(index, 1);
        renderCart();
    });

    addCustomItemBtn.addEventListener('click', () => {
        const name = (customItemName.value || '').trim();
        const price = toNum(customItemPrice.value);
        const qty = Math.max(1, Math.floor(toNum(customItemQty.value)));
        if (!name || price <= 0) {
            Toastify({ ...toastConfig, text: tr('customItemValidation', 'Enter custom item name and price.'), style: { background: 'var(--red-accent)' } }).showToast();
            return;
        }
        addToCart({ product_id: null, service_name: name, unit_price: price, is_product: false }, qty);
        customItemName.value = '';
        customItemPrice.value = '';
        customItemQty.value = '1';
    });

    discountTypeInput.addEventListener('change', renderTotals);
    discountValueInput.addEventListener('input', renderTotals);

    clearCartBtn.addEventListener('click', () => {
        cart.length = 0;
        renderCart();
    });

    checkoutBtn.addEventListener('click', checkout);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenUi);
    document.addEventListener('languagechange', () => {
        renderProducts(allProducts);
        renderCart();
        syncFullscreenUi();
        syncLanguagePills();
    });
    langPills.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (typeof window.setLanguage === 'function') window.setLanguage(btn.dataset.lang);
            syncLanguagePills();
        });
    });

    renderCart();
    syncFullscreenUi();
    syncLanguagePills();
    loadPatients();
    loadProducts();
});
