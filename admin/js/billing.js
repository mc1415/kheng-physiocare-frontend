// admin/js/billing.js

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const invoiceHistoryBody = document.getElementById('invoice-history-body');
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    const createInvoiceModal = document.getElementById('createInvoiceModal');
    const closeInvoiceModalBtn = document.getElementById('closeInvoiceModalBtn');
    const invoiceForm = document.getElementById('create-invoice-form');
    const addInvoiceItemBtn = document.getElementById('addInvoiceItemBtn');
    const invoiceItemsContainer = document.getElementById('invoice-items-container');
    const exportBtn = document.getElementById('exportInvoicesBtn');
    const filterInput = document.getElementById('filterInvoicesInput');
    const discountTypeEl = document.getElementById('invoice-discount-type');
    const discountValueEl = document.getElementById('invoice-discount-value');
    const discountNoteEl = document.getElementById('invoice-discount-note');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    let allInvoices = [];

    // Only keep a single static service and let user set price; products stay dynamic.
    const professionalServices = [
        { name: "ព្យាបាលដោយចលនា", price: "", isService: true }
    ];

    // --- Helpers ---
    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let e = 'API error.';
                try { const t = await response.json(); e = t.message || e; } catch { e = response.statusText; }
                throw new Error(e);
            }
            return response.status === 204 || options.method === 'DELETE' ? { success: true } : response.json();
        } catch (err) {
            console.error(`API Error on ${url}:`, err);
            Toastify({ ...toastConfig, text: `Error: ${err.message}`, style: { background: "var(--red-accent)" } }).showToast();
            return null;
        }
    }

    async function fetchAndRenderInvoices() {
        if (!invoiceHistoryBody) return;
        invoiceHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>`;
        const result = await fetchApi(`${API_BASE_URL}/api/invoices`);
        if (result && result.success) {
            allInvoices = result.data;
            renderInvoiceTable(allInvoices);
        } else {
            invoiceHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--red-accent);">Failed to fetch invoice history.</td></tr>`;
        }
    }

    function renderInvoiceTable(invoices) {
        if (!invoiceHistoryBody) return;
        invoiceHistoryBody.innerHTML = '';
        if (invoices.length === 0) {
            invoiceHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No invoices found.</td></tr>`;
            return;
        }
        invoices.forEach(inv => {
            const row = document.createElement('tr');
            const statusClass = inv.status ? inv.status.toLowerCase() : 'unpaid';
            const rawId = inv.id.replace('#INV-', '').replace(/^0+/, '');
            row.innerHTML = `
                <td>${inv.id}</td>
                <td>${inv.patientName}</td>
                <td>${inv.date}</td>
                <td>$${parseFloat(inv.amount).toFixed(2)}</td>
                <td><span class="status-chip ${statusClass}">${inv.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action print" data-invoice-id="${rawId}" title="Print Invoice"><i class="fa-solid fa-print"></i></button>
                        ${inv.status === 'Unpaid' ? `<button class="btn-action pay" data-invoice-id="${rawId}" title="Mark as Paid"><i class="fa-solid fa-check-to-slot"></i></button>` : ''}
                        <button class="btn-action edit" data-invoice-id="${rawId}" title="Edit Invoice"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn-action delete" data-invoice-id="${rawId}" title="Delete Invoice"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            `;
            invoiceHistoryBody.appendChild(row);
        });
    }

    async function populatePatientDropdown() {
        const patientSelect = document.getElementById('invoice-patient');
        if(!patientSelect) return;
        const result = await fetchApi(`${API_BASE_URL}/api/patients`);
        if(result && result.success) {
            patientSelect.innerHTML = '<option value="">-- Select Patient --</option>';
            result.data.forEach(patient => {
                const option = document.createElement('option');
                option.value = patient.raw_id;
                option.textContent = `${patient.fullName} (${patient.display_id})`;
                patientSelect.appendChild(option);
            });
        } else {
            patientSelect.innerHTML = '<option value="">Could not load patients</option>';
        }
    }

    async function getBillableItems() {
        try {
            const result = await fetchApi(`${API_BASE_URL}/api/products`);
            const inventoryProducts = (result && result.success)
                ? result.data.map(prod => ({ id: prod.id, name: prod.name, price: parseFloat(prod.unit_price).toFixed(2), isService: false }))
                : [];
            return [...professionalServices, ...inventoryProducts];
        } catch (error) {
            console.error("Error fetching billable items:", error);
            return professionalServices;
        }
    }

    async function addInvoiceItemRow(item = null) {
        if(!invoiceItemsContainer) return;
        const allItems = await getBillableItems();
        const itemRow = document.createElement('div');
        itemRow.className = 'invoice-item-row form-grid';
        const serviceOptions = allItems.map(service => {
            const idAttribute = !service.isService ? `data-product-id="${service.id}"` : '';
            const priceAttr = service.price ? `data-price="${service.price}"` : 'data-price=""';
            return `<option value="${service.name}" ${priceAttr} ${idAttribute}>${service.name}</option>`;
        }).join('');
        itemRow.innerHTML = `
            <div class="form-group" style="grid-column: span 3;">
                <label>Service / Product</label>
                <select name="service" required>
                    <option value="">-- Choose Item --</option>
                    ${serviceOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Qty</label>
                <input type="number" name="quantity" value="1" min="1" required>
            </div>
            <div class="form-group">
                <label>Price ($)</label>
                <input type="number" name="price" step="0.01" placeholder="Set price" required>
            </div>
            <div class="form-group">
                <button type="button" class="btn-remove-item"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        invoiceItemsContainer.appendChild(itemRow);

        const serviceSelect = itemRow.querySelector('[name="service"]');
        const priceInput = itemRow.querySelector('[name="price"]');

        const syncPrice = () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const price = selectedOption?.dataset.price || '';
            const isProduct = !!selectedOption?.dataset.productId;
            if (price) priceInput.value = price;
            priceInput.readOnly = isProduct;
            if (!isProduct && !price) priceInput.removeAttribute('readonly');
        };

        serviceSelect.addEventListener('change', syncPrice);

        if (item) {
            serviceSelect.value = item.service_name || item.service;
            itemRow.querySelector('[name="quantity"]').value = item.quantity;
            priceInput.value = parseFloat(item.unit_price ?? item.price ?? 0).toFixed(2);
            syncPrice();
        } else {
            syncPrice();
        }
    }

    async function openModalForEdit(invoiceId) {
        const modalTitle = createInvoiceModal.querySelector('h2');
        const saveButton = createInvoiceModal.querySelector('button[type="submit"]');
        invoiceForm.reset();
        invoiceItemsContainer.innerHTML = '';
        modalTitle.textContent = `Edit Invoice #${invoiceId.toString().padStart(5, '0')}`;
        saveButton.textContent = 'Save Changes';
        if (!document.getElementById('invoiceIdField')) {
            invoiceForm.insertAdjacentHTML('afterbegin', `<input type="hidden" id="invoiceIdField" name="invoiceId">`);
        }
        document.getElementById('invoiceIdField').value = invoiceId;
        await populatePatientDropdown();
        const result = await fetchApi(`${API_BASE_URL}/api/invoices/${invoiceId}`);
        if(result && result.success) {
            const inv = result.data;
            document.getElementById('invoice-patient').value = inv.patient_id;
            document.getElementById('invoice-status').value = inv.status;
            document.getElementById('invoice-diagnostic').value = inv.diagnostic || '';
            if (inv.discount_type) discountTypeEl.value = inv.discount_type;
            if (typeof inv.discount_value !== 'undefined') discountValueEl.value = inv.discount_value;
            if (inv.discount_note) discountNoteEl.value = inv.discount_note;
            if (inv.items && inv.items.length > 0) {
                for (const item of inv.items) {
                    await addInvoiceItemRow(item);
                }
            } else {
                await addInvoiceItemRow();
            }
        }
        createInvoiceModal.style.display = 'flex';
    }

    function openModalForAdd() {
        const modalTitle = createInvoiceModal.querySelector('h2');
        const saveButton = createInvoiceModal.querySelector('button[type="submit"]');
        invoiceForm.reset();
        invoiceItemsContainer.innerHTML = '';
        modalTitle.textContent = 'Create New Invoice';
        saveButton.textContent = 'Generate Invoice';
        const idField = document.getElementById('invoiceIdField');
        if (idField) idField.value = '';
        discountTypeEl.value = 'none';
        discountValueEl.value = '';
        discountNoteEl.value = '';
        addInvoiceItemRow();
        populatePatientDropdown();
        createInvoiceModal.style.display = 'flex';
    }

    // --- Modal Triggers ---
    if (createInvoiceBtn) createInvoiceBtn.addEventListener('click', openModalForAdd);
    if (closeInvoiceModalBtn) closeInvoiceModalBtn.addEventListener('click', () => createInvoiceModal.style.display = 'none');
    window.addEventListener('click', (event) => { if(event.target == createInvoiceModal) createInvoiceModal.style.display = 'none'; });

    if (addInvoiceItemBtn) addInvoiceItemBtn.addEventListener('click', () => addInvoiceItemRow());

    if (invoiceItemsContainer) {
        invoiceItemsContainer.addEventListener('click', (event) => {
            if (event.target.closest('.btn-remove-item')) event.target.closest('.invoice-item-row').remove();
        });
    }

    // --- Invoice actions ---
    if(invoiceHistoryBody) {
        invoiceHistoryBody.addEventListener('click', async (event) => {
            const targetButton = event.target.closest('button.btn-action');
            if (!targetButton) return;
            
            const invoiceId = targetButton.dataset.invoiceId;
            if (!invoiceId) return;

            if (targetButton.classList.contains('print')) {
                window.open(`../kheng-physiocare-receipt.html?receipt-id=${invoiceId}`, '_blank');
            } else if (targetButton.classList.contains('pay')) {
                const toast = Toastify({ text: "<strong>Mark this invoice as paid?</strong>", escapeMarkup: false, duration: -1, close: true, gravity: "center", position: "center", style: { background: "#1e293b", border: "1px solid var(--primary-accent)" } }).showToast();
                const toastEl = toast.toastElement;
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = "margin-top: 15px; text-align: right;";
                const yesButton = document.createElement('button');
                yesButton.innerText = "Yes, Mark as Paid"; yesButton.className = "btn-primary-action"; yesButton.style.marginRight = "10px";
                const noButton = document.createElement('button');
                noButton.innerText = "Cancel"; noButton.className = "btn-secondary-action";
                buttonContainer.append(noButton, yesButton);
                toastEl.appendChild(buttonContainer);
                yesButton.onclick = async function() {
                    toast.hideToast();
                    const result = await fetchApi(`${API_BASE_URL}/api/invoices/${invoiceId}/pay`, { method: 'PATCH' });
                    if (result && result.success) {
                        Toastify({...toastConfig, text: "Invoice marked as paid!", style: { background: "var(--primary-accent)" }}).showToast();
                        fetchAndRenderInvoices();
                    }
                };
                noButton.onclick = function() { toast.hideToast(); };
            } else if (targetButton.classList.contains('edit')) {
                openModalForEdit(invoiceId);
            } else if (targetButton.classList.contains('delete')) {
                const toast = Toastify({ text: "<strong>Delete this invoice?</strong><br>This action is permanent.", escapeMarkup: false, duration: -1, close: true, gravity: "center", position: "center", style: { background: "#1e293b", border: "1px solid var(--red-accent)" } }).showToast();
                const toastEl = toast.toastElement;
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = "margin-top: 15px; text-align: right;";
                const yesButton = document.createElement('button');
                yesButton.innerText = "Yes, Delete"; yesButton.className = "btn-danger"; yesButton.style.marginRight = "10px";
                const noButton = document.createElement('button');
                noButton.innerText = "Cancel"; noButton.className = "btn-secondary-action";
                buttonContainer.append(noButton, yesButton);
                toastEl.appendChild(buttonContainer);
                yesButton.onclick = async function() {
                    toast.hideToast();
                    const result = await fetchApi(`${API_BASE_URL}/api/invoices/${invoiceId}`, { method: 'DELETE' });
                    if (result && result.success) {
                        Toastify({...toastConfig, text: "Invoice deleted.", style: { background: "var(--red-accent)" }}).showToast();
                        fetchAndRenderInvoices();
                    }
                };
                noButton.onclick = function() { toast.hideToast(); };
            }
        });
    }

    // --- Form submit ---
    if(invoiceForm) {
        invoiceForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(invoiceForm);
            const invoiceId = formData.get('invoiceId');
            const isEditing = !!invoiceId;
            const items = [];
            const inventoryUpdates = [];
            const itemRows = invoiceItemsContainer.querySelectorAll('.invoice-item-row');

            itemRows.forEach((row) => { 
                const serviceSelect = row.querySelector('[name="service"]');
                const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
                const productId = selectedOption.dataset.productId;
                const quantity = row.querySelector('[name="quantity"]').value;
                const price = row.querySelector('[name="price"]').value;
                items.push({ 
                    service: serviceSelect.value, 
                    quantity, 
                    price 
                }); 
                if (productId) { 
                    inventoryUpdates.push({ id: productId, quantitySold: parseInt(quantity, 10) }); 
                }
            });

            const discountType = discountTypeEl.value;
            const discountValue = parseFloat(discountValueEl.value || '0');

            const invoiceData = {
                patientId: formData.get('patientId'),
                status: formData.get('status'), 
                diagnostic: formData.get('diagnostic'),
                items,
                inventoryUpdates,
                discount_type: discountType,
                discount_value: isNaN(discountValue) ? 0 : discountValue,
                discount_note: discountNoteEl.value || ''
            };

            const url = isEditing ? `${API_BASE_URL}/api/invoices/${invoiceId}` : `${API_BASE_URL}/api/invoices`;
            const method = isEditing ? 'PATCH' : 'POST';
            const result = await fetchApi(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoiceData) });
            if (result) {
                const successMessage = isEditing ? "Invoice updated successfully!" : "Invoice created successfully!";
                const toastColor = isEditing ? "var(--primary-accent)" : "var(--green-accent)";
                Toastify({...toastConfig, text: successMessage, style: { background: toastColor }}).showToast();
                createInvoiceModal.style.display = 'none';
                setTimeout(() => fetchAndRenderInvoices(), 500);
            }
        });
    }

    // --- Filters & export ---
    if (filterInput) {
        filterInput.addEventListener('keyup', () => {
            const searchTerm = filterInput.value.toLowerCase();
            if (!searchTerm) { renderInvoiceTable(allInvoices); return; }
            const filteredInvoices = allInvoices.filter(inv => inv.patientName.toLowerCase().includes(searchTerm) || inv.id.toLowerCase().includes(searchTerm));
            renderInvoiceTable(filteredInvoices);
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (allInvoices.length === 0) {
                Toastify({...toastConfig, text: "No data to export."}).showToast();
                return;
            }
            const headers = ['Invoice ID', 'Patient Name', 'Date', 'Amount', 'Status'];
            const rows = allInvoices.map(inv => [inv.id, `"${inv.patientName.replace(/"/g, '""')}"`, inv.date, inv.amount, inv.status]);
            let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `kheng_physiocare_invoices_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    fetchAndRenderInvoices();
});
