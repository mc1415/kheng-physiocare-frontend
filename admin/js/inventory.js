// admin/js/inventory.js (Final Corrected Version)
document.addEventListener('DOMContentLoaded', function() {
    // ... all DOM element variables ...

    async function fetchApi(url, options = {}) { /* ... */ }
    async function fetchAndRenderProducts() { /* ... */ }

    function renderProductTable(products) {
        // ...
        products.forEach(prod => {
            // ...
            // This part is already correct as it uses DB names
            row.innerHTML = `
                <td>${prod.name}</td>
                <td>${prod.sku}</td>
                <td>${prod.category || 'N/A'}</td>
                <td>${prod.stock_level}</td>
                <td>$${parseFloat(prod.unit_price).toFixed(2)}</td>
                ...
            `;
            productTableBody.appendChild(row);
        });
    }

    // --- UPDATED openModalForEdit ---
    async function openModalForEdit(productId) {
        modalTitle.textContent = 'Edit Product';
        saveBtn.textContent = 'Save Changes';
        productForm.reset();
        productIdField.value = productId;
        
        const result = await fetchApi(`/api/products/${productId}`);
        if (result && result.success) {
            const product = result.data;
            // Now this works because the form 'name' attributes match the DB columns
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-sku').value = product.sku;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-stock').value = product.stock_level;
            document.getElementById('product-price').value = product.unit_price;
            addProductModal.style.display = 'flex';
        }
    }

    function openModalForAdd() { /* ... unchanged ... */ }

    // --- UPDATED form submission ---
    if(productForm) {
        productForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(productForm);
            const productData = Object.fromEntries(formData.entries());
            const productId = productData.productId;
            const isEditing = !!productId;
            delete productData.productId;

            // The 'productData' object now automatically has the correct keys
            // { name: "...", sku: "...", category: "..." }
            // because the form 'name' attributes match the DB columns.

            const url = isEditing ? `/api/products/${productId}` : '/api/products';
            const method = isEditing ? 'PATCH' : 'POST';

            // ... rest of the fetch logic is now correct
        });
    }

    // To be safe, let's use the final complete code.
});


// Final, complete, copy-paste-ready version of the entire inventory.js file
document.addEventListener('DOMContentLoaded', function() {
    const productTableBody = document.querySelector('.data-table tbody');
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductModal = document.getElementById('addProductModal');
    const closeProductModalBtn = document.getElementById('closeProductModalBtn');
    const productForm = document.getElementById('add-product-form');
    const modalTitle = document.getElementById('productModalTitle');
    const saveBtn = document.getElementById('saveProductBtn');
    const productIdField = document.getElementById('productIdField');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };
    async function fetchApi(url, options = {}) { try { const response = await fetch(url, options); if (!response.ok) { let e = 'API error.'; try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText } throw new Error(e) } return response.json(); } catch (t) { return console.error(`API Error on ${url}:`, t), Toastify({ ...toastConfig, text: `Error: ${t.message}`, style: { background: "var(--red-accent)" } }).showToast(), null } }
    async function fetchAndRenderProducts() { if (!productTableBody) return; productTableBody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`; const result = await fetchApi(`${API_BASE_URL}/api/products`); if(result && result.success) { renderProductTable(result.data); } else { productTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--red-accent);">Failed to load products.</td></tr>`; } }
    function renderProductTable(products) { if (!productTableBody) return; productTableBody.innerHTML = ''; if (products.length === 0) { productTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No products found.</td></tr>`; return; } products.forEach(prod => { let status, statusClass; if (prod.stock_level <= 0) { status = 'Out of Stock'; statusClass = 'outofstock'; } else if (prod.stock_level <= 10) { status = 'Low Stock'; statusClass = 'lowstock'; } else { status = 'In Stock'; statusClass = 'instock'; } const row = document.createElement('tr'); row.dataset.productId = prod.id; row.innerHTML = `<td>${prod.name}</td><td>${prod.sku}</td><td>${prod.category || 'N/A'}</td><td>${prod.stock_level}</td><td>$${parseFloat(prod.unit_price).toFixed(2)}</td><td><span class="status-chip ${statusClass}">${status}</span></td><td><div class="action-buttons"><button class="btn-action edit"><i class="fa-solid fa-pencil"></i></button></div></td>`; productTableBody.appendChild(row); }); }
    function openModalForAdd() { modalTitle.textContent = 'Add New Product'; saveBtn.textContent = 'Save Product'; productForm.reset(); productIdField.value = ''; addProductModal.style.display = 'flex'; }
    async function openModalForEdit(productId) { modalTitle.textContent = 'Edit Product'; saveBtn.textContent = 'Save Changes'; productForm.reset(); productIdField.value = productId; const result = await fetchApi(`${API_BASE_URL}/api/products/${productId}`); if (result && result.success) { const product = result.data; document.getElementById('product-name').value = product.name; document.getElementById('product-sku').value = product.sku; document.getElementById('product-category').value = product.category; document.getElementById('product-stock').value = product.stock_level; document.getElementById('product-price').value = product.unit_price; addProductModal.style.display = 'flex'; } }
    if (addProductBtn) addProductBtn.addEventListener('click', openModalForAdd);
    if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', () => { addProductModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == addProductModal) addProductModal.style.display = 'none'; });
    if (productTableBody) { productTableBody.addEventListener('click', (event) => { const editButton = event.target.closest('.btn-action.edit'); if (editButton) { const productId = editButton.closest('tr').dataset.productId; openModalForEdit(productId); } }); }
    if(productForm) {
        productForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(productForm);
            const productData = Object.fromEntries(formData.entries());
            const productId = productData.productId;
            const isEditing = !!productId;
            delete productData.productId;
            const url = isEditing ? `${API_BASE_URL}/api/products/${productId}` : `${API_BASE_URL}/api/products`;
            const method = isEditing ? 'PATCH' : 'POST';
            const result = await fetchApi(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(productData) });
            if(result && result.success) {
                const successMessage = isEditing ? "Product updated successfully!" : "Product added successfully!";
                Toastify({...toastConfig, text: successMessage, style: { background: "var(--primary-accent)" } }).showToast();
                addProductModal.style.display = 'none';
                productForm.reset();
                setTimeout(() => fetchAndRenderProducts(), 500);
            }
        });
    }
    fetchAndRenderProducts();
});