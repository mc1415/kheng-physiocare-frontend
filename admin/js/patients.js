// admin/js/patients.js (FINAL CORRECTED VERSION)
document.addEventListener('DOMContentLoaded', function() {
    
    const patientTableBody = document.querySelector('.data-table tbody');
    const addPatientBtn = document.getElementById('addPatientBtn');
    const patientModal = document.getElementById('patientModal');
    const closePatientModalBtn = document.getElementById('closePatientModalBtn');
    const patientForm = document.getElementById('patient-form');
    const therapistSelect = document.getElementById('assigned-therapist');
    const modalTitle = document.getElementById('patientModalTitle');
    const patientIdField = document.getElementById('patient-id-field');
    const savePatientBtn = document.getElementById('savePatientBtn');
    const deletePatientBtn = document.getElementById('deletePatientBtn');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };
    let allPatients = [];

    async function fetchApi(url, options = {}) { try { const response = await fetch(url, options); if (!response.ok) { let e = 'API error.'; try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText } throw new Error(e) } return response.status === 204 || options.method === 'DELETE' ? { success: !0 } : response.json(); } catch (t) { console.error(`API Error on ${url}:`, t); Toastify({ ...toastConfig, text: `Error: ${t.message}`, style: { background: "var(--red-accent)" } }).showToast(); return null } }
    async function fetchAndRenderPatients() { if (!patientTableBody) return; patientTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>`; const result = await fetchApi('/api/patients'); if (result && result.success) { allPatients = result.data; renderPatientTable(allPatients); } else { patientTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--red-accent);">Failed to fetch patient history.</td></tr>`; } }
    function renderPatientTable(patients) { if (!patientTableBody) return; patientTableBody.innerHTML = ''; if (patients.length === 0) { patientTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No patients found.</td></tr>`; return; } patients.forEach(patient => { const row = document.createElement('tr'); row.dataset.patientId = patient.raw_id; row.innerHTML = `<td>${patient.display_id}</td><td><div class="table-user-cell"><img src="${patient.avatarUrl}" alt="Avatar"><span>${patient.fullName}</span></div></td><td>${patient.phoneNumber || 'N/A'}</td><td>${patient.lastVisit}</td><td>${patient.assignedTherapist}</td><td><div class="action-buttons"><button class="btn-action view" title="View Details"><i class="fa-solid fa-eye"></i></button><button class="btn-action edit" title="Edit Patient"><i class="fa-solid fa-pencil"></i></button></div></td>`; patientTableBody.appendChild(row); }); }
    async function populateTherapistDropdown() { if (!therapistSelect) return; const result = await fetchApi('/api/staff'); if (result && result.success) { therapistSelect.innerHTML = '<option value="">-- Select Therapist --</option>'; result.data.forEach(staff => { const option = document.createElement('option'); option.value = staff.id; option.textContent = staff.full_name; therapistSelect.appendChild(option); }); } else { therapistSelect.innerHTML = '<option value="">Could not load therapists</option>'; } }

    async function openModalForEdit(patientId) {
        modalTitle.textContent = 'Edit Patient';
        savePatientBtn.textContent = 'Save Changes';
        if (deletePatientBtn) deletePatientBtn.style.display = 'block';
        patientForm.reset();
        patientIdField.value = patientId;
        patientModal.style.display = 'flex';
        await populateTherapistDropdown();
        const result = await fetchApi(`/api/patients/${patientId}`);
        if (result && result.success) {
            const patientData = result.data;
            patientForm.querySelector('[name="full_name"]').value = patientData.full_name;
            patientForm.querySelector('[name="date_of_birth"]').value = patientData.date_of_birth;
            patientForm.querySelector('[name="phone_number"]').value = patientData.phone_number;
            patientForm.querySelector('[name="email"]').value = patientData.email;
            patientForm.querySelector('[name="address"]').value = patientData.address;
            patientForm.querySelector('[name="assigned_therapist_id"]').value = patientData.assigned_therapist_id;
        }
    }

    function openModalForAdd() {
        modalTitle.textContent = 'Add New Patient';
        savePatientBtn.textContent = 'Save Patient';
        if (deletePatientBtn) deletePatientBtn.style.display = 'none';
        patientForm.reset();
        patientIdField.value = '';
        populateTherapistDropdown();
        patientModal.style.display = 'flex';
    }

    if (addPatientBtn) addPatientBtn.addEventListener('click', openModalForAdd);
    if (closePatientModalBtn) closePatientModalBtn.addEventListener('click', () => { patientModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == patientModal) patientModal.style.display = 'none'; });

    if (patientTableBody) {
        patientTableBody.addEventListener('click', function(event) {
            const targetButton = event.target.closest('button.btn-action'); if (!targetButton) return;
            const patientId = targetButton.closest('tr').dataset.patientId; if (!patientId) return;
            if (targetButton.classList.contains('edit')) { openModalForEdit(patientId); } 
            else if (targetButton.classList.contains('view')) { localStorage.setItem('selectedPatientId', patientId); window.location.href = 'patient-detail.html'; }
        });
    }

    if (patientForm) {
        patientForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const patientId = patientIdField.value;
            const isEditing = !!patientId;
            const formData = new FormData(patientForm);
            const patientData = Object.fromEntries(formData.entries());
            delete patientData.patientId;
            const url = isEditing ? `/api/patients/${patientId}` : '/api/patients';
            const method = isEditing ? 'PATCH' : 'POST';
            const result = await fetchApi(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patientData) });
            if (result) {
                const successMessage = isEditing ? "Patient updated!" : "Patient created!";
                const toastColor = isEditing ? "var(--primary-accent)" : "var(--green-accent)";
                Toastify({...toastConfig, text: successMessage, style: { background: toastColor }}).showToast();
                patientModal.style.display = 'none';
                setTimeout(() => fetchAndRenderPatients(), 1500);
            }
        });
    }
    
    if (deletePatientBtn) {
        deletePatientBtn.addEventListener('click', function() {
            const patientId = patientIdField.value;
            if (!patientId) return;
            const toast = Toastify({ text: "<strong>Delete this patient?</strong><br>This can't be undone.", escapeMarkup: false, duration: -1, close: true, gravity: "center", position: "center", style: { background: "#1e293b", border: "1px solid var(--red-accent)" } }).showToast();
            const toastEl = toast.toastElement;
            const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = "margin-top: 15px; text-align: right;";
            const yesButton = document.createElement('button'); yesButton.innerText = "Yes, Delete"; yesButton.className = "btn-danger"; yesButton.style.marginRight = "10px";
            const noButton = document.createElement('button'); noButton.innerText = "Cancel"; noButton.className = "btn-secondary-action";
            buttonContainer.append(noButton, yesButton);
            toastEl.appendChild(buttonContainer);
            yesButton.onclick = async function() {
                toast.hideToast();
                const result = await fetchApi(`/api/patients/${patientId}`, { method: 'DELETE' });
                if (result) {
                    Toastify({...toastConfig, text: "Patient deleted.", style: { background: "var(--red-accent)" }}).showToast();
                    patientModal.style.display = 'none';
                    fetchAndRenderPatients();
                }
            };
            noButton.onclick = function() { toast.hideToast(); };
        });
    }
    
    fetchAndRenderPatients();
});