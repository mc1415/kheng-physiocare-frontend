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
    const subtotalEl = document.getElementById('invoice-subtotal');
    const discountAmountEl = document.getElementById('invoice-discount-amount');
    const totalEl = document.getElementById('invoice-total');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    let allInvoices = [];

    // Only keep a single static service and let user set price; products stay dynamic.
    const professionalServices = [
        { name: "Physiotherapy Session", price: "", isService: true }
    ];

    // --- Helpers ---
    const toNumber = (val) => {
        const num = parseFloat(val);
        return Number.isFinite(num) ? num : 0;
    };
    const roundMoney = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

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
            const invIdStr = String(inv.id || '');
            const rawId = invIdStr.replace('#INV-', '').replace(/^0+/, '');
            const derivedTotal = (inv.subtotal || inv.discount_amount) ? (toNumber(inv.subtotal) - toNumber(inv.discount_amount)) : 0;
            const rawAmount = inv.total_amount ?? inv.amount ?? inv.totalAmount ?? inv.total ?? derivedTotal;
            const amountNum = Number.isFinite(parseFloat(rawAmount)) ? parseFloat(rawAmount) : 0;
            row.innerHTML = `
                <td>${invIdStr}</td>
                <td>${inv.patientName}</td>
                <td>${inv.date}</td>
                <td>$${amountNum.toFixed(2)}</td>
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
        const qtyInput = itemRow.querySelector('[name="quantity"]');

        const syncPrice = () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const price = selectedOption?.dataset.price || '';
            const isProduct = !!selectedOption?.dataset.productId;
            if (price) priceInput.value = price;
            priceInput.readOnly = isProduct;
            if (!isProduct && !price) priceInput.removeAttribute('readonly');
            updateTotalsPreview();
        };

        serviceSelect.addEventListener('change', syncPrice);
        priceInput.addEventListener('input', updateTotalsPreview);
        qtyInput.addEventListener('input', updateTotalsPreview);

        if (item) {
            serviceSelect.value = item.service_name || item.service;
            itemRow.querySelector('[name="quantity"]').value = item.quantity;
            priceInput.value = parseFloat(item.unit_price ?? item.price ?? 0).toFixed(2);
            syncPrice();
        } else {
            syncPrice();
        }

        updateTotalsPreview();
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
            const discountType = inv.discount_type || (inv.discount_value ? 'flat' : 'none');
            discountTypeEl.value = discountType;
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
        updateTotalsPreview();
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
        updateTotalsPreview();
        createInvoiceModal.style.display = 'flex';
    }

    function buildInvoiceDraft() {
        const items = [];
        const inventoryUpdates = [];
        let subtotal = 0;

        if (invoiceItemsContainer) {
            invoiceItemsContainer.querySelectorAll('.invoice-item-row').forEach((row) => {
                const serviceSelect = row.querySelector('[name="service"]');
                const serviceName = (serviceSelect?.value || '').trim();
                const selectedOption = serviceSelect?.options?.[serviceSelect.selectedIndex];
                const productId = selectedOption?.dataset.productId;
                const quantity = toNumber(row.querySelector('[name="quantity"]')?.value);
                const price = toNumber(row.querySelector('[name="price"]')?.value);
                if (!serviceName || quantity <= 0 || price < 0) return;
                const lineTotal = roundMoney(quantity * price);
                subtotal += lineTotal;
                items.push({
                    service: serviceName,
                    service_name: serviceName,
                    quantity,
                    unit_price: price,
                    line_total: lineTotal
                });
                if (productId) {
                    inventoryUpdates.push({ id: productId, quantitySold: Math.max(1, Math.round(quantity)) });
                }
            });
        }

        const discountType = discountTypeEl?.value || 'none';
        let discountValue = toNumber(discountValueEl?.value);
        if (discountValue < 0) discountValue = 0;
        if (discountType === 'percent' && discountValue > 100) discountValue = 100;
        let discountAmount = 0;
        if (discountType === 'percent') discountAmount = subtotal * (discountValue / 100);
        else if (discountType === 'flat') discountAmount = discountValue;
        discountAmount = Math.min(discountAmount, subtotal);
        const totalAmount = Math.max(0, subtotal - discountAmount);

        return {
            items,
            inventoryUpdates,
            subtotal: roundMoney(subtotal),
            discountType,
            discountValue,
            discountAmount: roundMoney(discountAmount),
            totalAmount: roundMoney(totalAmount)
        };
    }

    function updateTotalsPreview() {
        if (!subtotalEl || !discountAmountEl || !totalEl) return;
        const draft = buildInvoiceDraft();
        if (discountValueEl) {
            const normalizedValue = draft.discountType === 'none' ? '' : draft.discountValue;
            discountValueEl.value = normalizedValue;
        }
        subtotalEl.value = draft.subtotal.toFixed(2);
        discountAmountEl.value = draft.discountAmount.toFixed(2);
        totalEl.value = draft.totalAmount.toFixed(2);
    }

    // --- Modal Triggers ---
    if (createInvoiceBtn) createInvoiceBtn.addEventListener('click', openModalForAdd);
    if (closeInvoiceModalBtn) closeInvoiceModalBtn.addEventListener('click', () => createInvoiceModal.style.display = 'none');
    window.addEventListener('click', (event) => { if(event.target == createInvoiceModal) createInvoiceModal.style.display = 'none'; });

    if (addInvoiceItemBtn) addInvoiceItemBtn.addEventListener('click', () => addInvoiceItemRow());

    if (invoiceItemsContainer) {
        invoiceItemsContainer.addEventListener('click', (event) => {
            if (event.target.closest('.btn-remove-item')) {
                event.target.closest('.invoice-item-row').remove();
                updateTotalsPreview();
            }
        });
    }

    if (discountTypeEl) discountTypeEl.addEventListener('change', updateTotalsPreview);
    if (discountValueEl) discountValueEl.addEventListener('input', updateTotalsPreview);

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
            const draft = buildInvoiceDraft();

            if (draft.items.length === 0) {
                Toastify({ ...toastConfig, text: "Add at least one billable item with a price.", style: { background: "var(--red-accent)" } }).showToast();
                return;
            }

            const patientIdNum = toNumber(formData.get('patientId'));
            const invoiceData = {
                // Minimal payload aligned to backend expectations; backend computes totals/discounts
                patient_id: patientIdNum || formData.get('patientId'),
                patientId: patientIdNum || formData.get('patientId'), // alias for backend destructuring
                status: formData.get('status'), 
                diagnostic: formData.get('diagnostic'),
                items: draft.items.map((it) => ({
                    service_name: it.service_name,
                    service: it.service_name, // legacy alias
                    quantity: Number(it.quantity),
                    unit_price: Number(it.unit_price),
                    price: Number(it.unit_price)
                })),
                inventoryUpdates: draft.inventoryUpdates || [],
                discount_type: draft.discountType,
                discount_value: draft.discountType === 'none' ? 0 : draft.discountValue,
                // Send computed totals so the backend has everything it needs (and keeps legacy APIs happy).
                subtotal: draft.subtotal,
                discount_amount: draft.discountAmount,
                total_amount: draft.totalAmount
            };

            const url = isEditing ? `${API_BASE_URL}/api/invoices/${invoiceId}` : `${API_BASE_URL}/api/invoices`;
            const method = isEditing ? 'PATCH' : 'POST';
            const result = await fetchApi(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoiceData) });
            if (result) {
                const successMessage = isEditing ? "Invoice updated successfully!" : "Invoice created successfully!";
                const toastColor = isEditing ? "var(--primary-accent)" : "var(--green-accent)";
                Toastify({...toastConfig, text: successMessage, style: { background: toastColor }}).showToast();
                // Backend computes and persists totals/discounts; no follow-up patch needed
                createInvoiceModal.style.display = 'none';
                setTimeout(() => fetchAndRenderInvoices(), 500);
                updateTotalsPreview();
            }
        });
    }

    // --- Filters & export ---
    if (filterInput) {
        filterInput.addEventListener('keyup', () => {
            const searchTerm = filterInput.value.toLowerCase();
            if (!searchTerm) { renderInvoiceTable(allInvoices); return; }
            const filteredInvoices = allInvoices.filter(inv => {
                const idStr = String(inv.id || '').toLowerCase();
                return inv.patientName.toLowerCase().includes(searchTerm) || idStr.includes(searchTerm);
            });
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
            const rows = allInvoices.map(inv => {
                const derivedTotal = (inv.subtotal || inv.discount_amount) ? (toNumber(inv.subtotal) - toNumber(inv.discount_amount)) : 0;
                const rawAmount = inv.total_amount ?? inv.amount ?? inv.totalAmount ?? inv.total ?? derivedTotal;
                const amountNum = Number.isFinite(parseFloat(rawAmount)) ? parseFloat(rawAmount) : 0;
                return [inv.id, `"${inv.patientName.replace(/"/g, '""')}"`, inv.date, amountNum, inv.status];
            });
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

    updateTotalsPreview();
    fetchAndRenderInvoices();
});
