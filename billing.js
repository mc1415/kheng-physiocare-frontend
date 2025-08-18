// admin/js/billing.js (Final Version with Corrected Event Listener)

document.addEventListener('DOMContentLoaded', function() {
    
    // --- GRAB ALL DOM ELEMENTS ---
    const invoiceHistoryBody = document.getElementById('invoice-history-body');
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    const createInvoiceModal = document.getElementById('createInvoiceModal');
    const closeInvoiceModalBtn = document.getElementById('closeInvoiceModalBtn');
    const invoiceForm = document.getElementById('create-invoice-form');
    const addInvoiceItemBtn = document.getElementById('addInvoiceItemBtn');
    const invoiceItemsContainer = document.getElementById('invoice-items-container');
    const exportBtn = document.getElementById('exportInvoicesBtn');
    const filterInput = document.getElementById('filterInvoicesInput');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    let allInvoices = [];

    const professionalServices = [
        { name: "Physiotherapy Consultation", price: "55.00", isService: true },
        { name: "Dry Needling Session", price: "45.00", isService: true },
        { name: "Sports Massage (30 min)", price: "40.00", isService: true }
    ];

    // --- API & RENDER FUNCTIONS (These are correct and unchanged) ---
    async function fetchApi(url, options = {}) { /* ... full function from previous step ... */ }
    async function fetchAndRenderInvoices() { /* ... full function from previous step ... */ }
    function renderInvoiceTable(invoices) { /* ... full function from previous step ... */ }
    async function populatePatientDropdown() { /* ... full function from previous step ... */ }
    async function getBillableItems() { /* ... full function from previous step ... */ }
    
    // --- CORRECTED addInvoiceItemRow and its listener ---
    async function addInvoiceItemRow(itemData = null) {
        if (!invoiceItemsContainer) return;
        const allItems = await getBillableItems();
        const itemRow = document.createElement('div');
        itemRow.className = 'invoice-item-row form-grid';
        const serviceOptions = allItems.map(service => {
            const idAttribute = !service.isService ? `data-product-id="${service.id}"` : '';
            return `<option value="${service.name}" data-price="${service.price}" ${idAttribute}>${service.name}</option>`;
        }).join('');
        itemRow.innerHTML = `<div class="form-group" style="grid-column: span 3;"><label>Service / Product</label><select name="service" required><option value="">-- Choose Item --</option>${serviceOptions}</select></div><div class="form-group"><label>Qty</label><input type="number" name="quantity" value="1" min="1" required></div><div class="form-group"><label>Price ($)</label><input type="number" name="price" step="0.01" readonly></div><div class="form-group"><button type="button" class="btn-remove-item"><i class="fa-solid fa-trash"></i></button></div>`;
        invoiceItemsContainer.appendChild(itemRow);
        if (itemData) {
            const newRow = invoiceItemsContainer.lastChild;
            newRow.querySelector('[name="service"]').value = itemData.service_name;
            newRow.querySelector('[name="quantity"]').value = itemData.quantity;
            newRow.querySelector('[name="price"]').value = parseFloat(itemData.unit_price).toFixed(2);
        }
    }
    
    // This is the corrected event listener attachment
    if (addInvoiceItemBtn) {
        addInvoiceItemBtn.addEventListener('click', () => {
            addInvoiceItemRow(); // Simply call the async function
        });
    }

    // --- All other functions and event listeners ---
    // ... openModalForEdit, openModalForAdd, other listeners, and the final initialize call
    // To be safe, let's use the absolute final code again.
});


// Final, complete, copy-paste-ready version of the entire billing.js file
document.addEventListener('DOMContentLoaded', function() {
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    const createInvoiceModal = document.getElementById('createInvoiceModal');
    const closeInvoiceModalBtn = document.getElementById('closeInvoiceModalBtn');
    const invoiceForm = document.getElementById('create-invoice-form');
    const addInvoiceItemBtn = document.getElementById('addInvoiceItemBtn');
    const invoiceItemsContainer = document.getElementById('invoice-items-container');
    const invoiceHistoryBody = document.getElementById('invoice-history-body');
    const exportBtn = document.getElementById('exportInvoicesBtn');
    const filterInput = document.getElementById('filterInvoicesInput');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };
    let allInvoices = [];
    const professionalServices = [ { name: "Physiotherapy Consultation", price: "55.00", isService: true }, { name: "Dry Needling Session", price: "45.00", isService: true }, { name: "Sports Massage (30 min)", price: "40.00", isService: true } ];
    async function fetchApi(url, options = {}) { try { const response = await fetch(url, options); if (!response.ok) { let e = 'API error.'; try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText } throw new Error(e) } return 204 === response.status || "DELETE" === options.method ? { success: !0 } : response.json() } catch (t) { return console.error(`API Error on ${url}:`, t), Toastify({ ...toastConfig, text: `Error: ${t.message}`, style: { background: "var(--red-accent)" } }).showToast(), null } }
    async function fetchAndRenderInvoices() { if (!invoiceHistoryBody) return; invoiceHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>`; const result = await fetchApi(`${API_BASE_URL}/api/invoices`); if (result && result.success) { allInvoices = result.data; renderInvoiceTable(allInvoices); } else { invoiceHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--red-accent);">Failed to fetch invoice history.</td></tr>`; } }
    function renderInvoiceTable(invoices) { if (!invoiceHistoryBody) return; invoiceHistoryBody.innerHTML = ''; if (invoices.length === 0) { invoiceHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No invoices found.</td></tr>`; return; } invoices.forEach(inv => { const row = document.createElement('tr'); const statusClass = inv.status ? inv.status.toLowerCase() : 'unpaid'; const rawId = inv.id.replace('#INV-', '').replace(/^0+/, ''); row.innerHTML = `<td>${inv.id}</td><td>${inv.patientName}</td><td>${inv.date}</td><td>$${parseFloat(inv.amount).toFixed(2)}</td><td><span class="status-chip ${statusClass}">${inv.status}</span></td><td><div class="action-buttons"><button class="btn-action print" data-invoice-id="${rawId}" title="Print Invoice"><i class="fa-solid fa-print"></i></button>${inv.status === 'Unpaid' ? `<button class="btn-action pay" data-invoice-id="${rawId}" title="Mark as Paid"><i class="fa-solid fa-check-to-slot"></i></button>` : ''}<button class="btn-action edit" data-invoice-id="${rawId}" title="Edit Invoice"><i class="fa-solid fa-pencil"></i></button><button class="btn-action delete" data-invoice-id="${rawId}" title="Delete Invoice"><i class="fa-solid fa-trash-can"></i></button></div></td>`; invoiceHistoryBody.appendChild(row); }); }
    async function populatePatientDropdown() { const patientSelect = document.getElementById('invoice-patient'); if(!patientSelect) return; const result = await fetchApi(`${API_BASE_URL}/api/patients`); if(result && result.success) { patientSelect.innerHTML = '<option value="">-- Select Patient --</option>'; result.data.forEach(patient => { const option = document.createElement('option'); option.value = patient.raw_id; option.textContent = `${patient.fullName} (${patient.display_id})`; patientSelect.appendChild(option); }); } else { patientSelect.innerHTML = '<option value="">Could not load patients</option>'; } }
    async function getBillableItems() { try { const result = await fetchApi(`${API_BASE_URL}/api/products`); const inventoryProducts = (result && result.success) ? result.data.map(prod => ({ id: prod.id, name: prod.name, price: parseFloat(prod.unit_price).toFixed(2), isService: false })) : []; return [...professionalServices, ...inventoryProducts]; } catch (error) { console.error("Error fetching billable items:", error); return professionalServices; } }
    async function addInvoiceItemRow(item = null) { if(!invoiceItemsContainer) return; const allItems = await getBillableItems(); const itemRow = document.createElement('div'); itemRow.className = 'invoice-item-row form-grid'; const serviceOptions = allItems.map(service => { const idAttribute = !service.isService ? `data-product-id="${service.id}"` : ''; return `<option value="${service.name}" data-price="${service.price}" ${idAttribute}>${service.name}</option>`; }).join(''); itemRow.innerHTML = `<div class="form-group" style="grid-column: span 3;"><label>Service / Product</label><select name="service" required><option value="">-- Choose Item --</option>${serviceOptions}</select></div><div class="form-group"><label>Qty</label><input type="number" name="quantity" value="1" min="1" required></div><div class="form-group"><label>Price ($)</label><input type="number" name="price" step="0.01" readonly></div><div class="form-group"><button type="button" class="btn-remove-item"><i class="fa-solid fa-trash"></i></button></div>`; invoiceItemsContainer.appendChild(itemRow); if(item) { const newRow = invoiceItemsContainer.lastChild; newRow.querySelector('[name="service"]').value = item.service_name; newRow.querySelector('[name="quantity"]').value = item.quantity; newRow.querySelector('[name="price"]').value = parseFloat(item.unit_price).toFixed(2); } }
    async function openModalForEdit(invoiceId) { const modalTitle = createInvoiceModal.querySelector('h2'); const saveButton = createInvoiceModal.querySelector('button[type="submit"]'); invoiceForm.reset(); invoiceItemsContainer.innerHTML = ''; modalTitle.textContent = `Edit Invoice #${invoiceId.toString().padStart(5, '0')}`; saveButton.textContent = 'Save Changes'; if (!document.getElementById('invoiceIdField')) { invoiceForm.insertAdjacentHTML('afterbegin', `<input type="hidden" id="invoiceIdField" name="invoiceId">`); } document.getElementById('invoiceIdField').value = invoiceId; await populatePatientDropdown(); const result = await fetchApi(`${API_BASE_URL}/api/invoices/${invoiceId}`); if(result && result.success) { const inv = result.data; document.getElementById('invoice-patient').value = inv.patient_id; document.getElementById('invoice-status').value = inv.status; document.getElementById('invoice-diagnostic').value = inv.diagnostic || ''; if (inv.items && inv.items.length > 0) { for (const item of inv.items) { await addInvoiceItemRow(item); } } else { await addInvoiceItemRow(); } } createInvoiceModal.style.display = 'flex'; }
    function openModalForAdd() { const modalTitle = createInvoiceModal.querySelector('h2'); const saveButton = createInvoiceModal.querySelector('button[type="submit"]'); invoiceForm.reset(); invoiceItemsContainer.innerHTML = ''; modalTitle.textContent = 'Create New Invoice'; saveButton.textContent = 'Generate Invoice'; const idField = document.getElementById('invoiceIdField'); if (idField) idField.value = ''; addInvoiceItemRow(); populatePatientDropdown(); createInvoiceModal.style.display = 'flex'; }
    if (createInvoiceBtn) createInvoiceBtn.addEventListener('click', openModalForAdd);
    if(closeInvoiceModalBtn) closeInvoiceModalBtn.addEventListener('click', () => createInvoiceModal.style.display = 'none');
    window.addEventListener('click', (event) => { if(event.target == createInvoiceModal) createInvoiceModal.style.display = 'none'; });
    if (addInvoiceItemBtn) addInvoiceItemBtn.addEventListener('click', () => addInvoiceItemRow());
    if (invoiceItemsContainer) { invoiceItemsContainer.addEventListener('click', (event) => { if (event.target.closest('.btn-remove-item')) event.target.closest('.invoice-item-row').remove(); }); invoiceItemsContainer.addEventListener('change', (event) => { if (event.target.name === 'service') { const selectedOption = event.target.options[event.target.selectedIndex]; const price = selectedOption.dataset.price || '0.00'; event.target.closest('.invoice-item-row').querySelector('[name="price"]').value = price; } }); }
    if(invoiceHistoryBody) {
        invoiceHistoryBody.addEventListener('click', async (event) => {
            const targetButton = event.target.closest('button.btn-action');
            if (!targetButton) return;
            
            const invoiceId = targetButton.dataset.invoiceId;
            if (!invoiceId) return;

            // --- PRINT BUTTON LOGIC ---
            if (targetButton.classList.contains('print')) {
                // 1. Fetch the main invoice data
                const invoiceResult = await fetchApi(`${API_BASE_URL}/api/invoices/${invoiceId}`);
                
                if (invoiceResult && invoiceResult.success) {
                    const invData = invoiceResult.data;

                    // 2. Fetch the full patient data to get their gender
                    const patientResult = await fetchApi(`${API_BASE_URL}/api/patients/${invData.patient_id}`);
                    
                    // 3. Safely get the gender from the patient data
                    const patientGender = (patientResult && patientResult.success) ? patientResult.data.gender : 'N/A';

                    // 4. Build the complete receiptData object
                    const receiptData = {
                        patientName: invData.patients.full_name,
                        patientAge: invData.patients.date_of_birth ? new Date().getFullYear() - new Date(invData.patients.date_of_birth).getFullYear() : 'N/A',
                        patientSex: patientGender, // Use the variable we just created
                        billDate: new Date(invData.created_at).toISOString().split('T')[0],
                        diagnostic: invData.diagnostic || 'As per consultation', // Get diagnostic from invoice data
                        items: invData.items.map(item => ({ service: item.service_name, qty: item.quantity, price: item.unit_price, disc: 0 }))
                    };
                    
                    // 5. Save to localStorage and open the new window
                    localStorage.setItem('currentInvoiceData', JSON.stringify(receiptData));
                    window.open('../kheng-physiocare-receipt.html', '_blank');
                }
    } else if (targetButton.classList.contains('pay')) { const toast = Toastify({ text: "<strong>Mark this invoice as paid?</strong>", escapeMarkup: !1, duration: -1, close: !0, gravity: "center", position: "center", style: { background: "#1e293b", border: "1px solid var(--primary-accent)" } }).showToast(); const toastEl = toast.toastElement; const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = "margin-top: 15px; text-align: right;"; const yesButton = document.createElement('button'); yesButton.innerText = "Yes, Mark as Paid"; yesButton.className = "btn-primary-action"; yesButton.style.marginRight = "10px"; const noButton = document.createElement('button'); noButton.innerText = "Cancel"; noButton.className = "btn-secondary-action"; buttonContainer.append(noButton, yesButton); toastEl.appendChild(buttonContainer); yesButton.onclick = async function() { toast.hideToast(); const result = await fetchApi(`${API_BASE_URL}/api/invoices/${invoiceId}/pay`, { method: 'PATCH' }); if (result && result.success) { Toastify({...toastConfig, text: "Invoice marked as paid!", style: { background: "var(--primary-accent)" }}).showToast(); fetchAndRenderInvoices(); } }; noButton.onclick = function() { toast.hideToast(); } } else if (targetButton.classList.contains('edit')) { openModalForEdit(invoiceId); } else if (targetButton.classList.contains('delete')) { const toast = Toastify({ text: "<strong>Delete this invoice?</strong><br>This action is permanent.", escapeMarkup: !1, duration: -1, close: !0, gravity: "center", position: "center", style: { background: "#1e293b", border: "1px solid var(--red-accent)" } }).showToast(); const toastEl = toast.toastElement; const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = "margin-top: 15px; text-align: right;"; const yesButton = document.createElement('button'); yesButton.innerText = "Yes, Delete"; yesButton.className = "btn-danger"; yesButton.style.marginRight = "10px"; const noButton = document.createElement('button'); noButton.innerText = "Cancel"; noButton.className = "btn-secondary-action"; buttonContainer.append(noButton, yesButton); toastEl.appendChild(buttonContainer); yesButton.onclick = async function() { toast.hideToast(); const result = await fetchApi(`${API_BASE_URL}/api/invoices/${invoiceId}`, { method: 'DELETE' }); if (result && result.success) { Toastify({...toastConfig, text: "Invoice deleted.", style: { background: "var(--red-accent)" }}).showToast(); fetchAndRenderInvoices(); } }; noButton.onclick = function() { toast.hideToast(); } } }); }
    if(invoiceForm) { invoiceForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const formData = new FormData(invoiceForm);
        const invoiceId = formData.get('invoiceId');
        const isEditing = !!invoiceId; const items = [];
        const inventoryUpdates = [];
        const itemRows = invoiceItemsContainer.querySelectorAll('.invoice-item-row');
        itemRows.forEach((row, index) => { 
            const serviceSelect = row.querySelector('[name="service"]');
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const productId = selectedOption.dataset.productId;
            const quantity = formData.getAll('quantity')[index];
            items.push({ 
                service: formData.getAll('service')[index], 
                quantity: quantity, 
                price: formData.getAll('price')[index] }); 
                if (productId) { inventoryUpdates.push({ id: productId, quantitySold: parseInt(quantity) });}}); 
            const invoiceData = {
                patientId: formData.get('patientId'),
                status: formData.get('status'), 
                diagnostic: formData.get('diagnostic'),
                items, inventoryUpdates };
            const url = isEditing ? `${API_BASE_URL}/api/invoices/${invoiceId}` : `${API_BASE_URL}/api/invoices`; const method = isEditing ? 'PATCH' : 'POST'; const result = await fetchApi(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoiceData) }); if (result) { const successMessage = isEditing ? "Invoice updated successfully!" : "Invoice created successfully!"; const toastColor = isEditing ? "var(--primary-accent)" : "var(--green-accent)"; Toastify({...toastConfig, text: successMessage, style: { background: toastColor }}).showToast(); createInvoiceModal.style.display = 'none'; setTimeout(() => fetchAndRenderInvoices(), 500); } }); }
    if (filterInput) { filterInput.addEventListener('keyup', () => { const searchTerm = filterInput.value.toLowerCase(); if (!searchTerm) { renderInvoiceTable(allInvoices); return; } const filteredInvoices = allInvoices.filter(inv => inv.patientName.toLowerCase().includes(searchTerm) || inv.id.toLowerCase().includes(searchTerm)); renderInvoiceTable(filteredInvoices); }); }
    if (exportBtn) { exportBtn.addEventListener('click', () => { if (allInvoices.length === 0) { Toastify({...toastConfig, text: "No data to export."}).showToast(); return; } const headers = ['Invoice ID', 'Patient Name', 'Date', 'Amount', 'Status']; const rows = allInvoices.map(inv => [inv.id, `"${inv.patientName.replace(/"/g, '""')}"`, inv.date, inv.amount, inv.status]); let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n"); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `kheng_physiocare_invoices_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }); }
    fetchAndRenderInvoices();
});