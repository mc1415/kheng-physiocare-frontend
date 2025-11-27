// admin/js/staff.js

document.addEventListener('DOMContentLoaded', function() {
    const staffTableBody = document.querySelector('.data-table tbody');
    const addStaffBtn = document.getElementById('addStaffBtn');
    const addStaffModal = document.getElementById('addStaffModal');
    const closeStaffModalBtn = document.getElementById('closeStaffModalBtn');
    const staffForm = document.getElementById('add-staff-form');
    const staffModalTitle = document.getElementById('staffModalTitle');
    const staffIdField = document.getElementById('staff-id-field');
    const submitBtn = staffForm?.querySelector('button[type="submit"]');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            if (!response.ok) { throw new Error(result.message || 'An API error occurred.'); }
            return result;
        } catch (error) {
            console.error(`API Error on ${url}:`, error);
            Toastify({...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" }}).showToast();
            return null;
        }
    }

    async function fetchAndRenderStaff() {
        if (!staffTableBody) return;
        staffTableBody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
        const result = await fetchApi(`${API_BASE_URL}/api/staff`);
        if (result && result.success) {
            renderStaffTable(result.data);
        } else {
            staffTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--red-accent);">Failed to load staff.</td></tr>`;
        }
    }

    function renderStaffTable(staffList) {
        staffTableBody.innerHTML = '';
        if (staffList.length === 0) {
            staffTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No staff members found.</td></tr>`;
            return;
        }
        staffList.forEach(staff => {
            const row = document.createElement('tr');
            row.dataset.staffId = staff.id;
            const roleClass = (staff.role || 'default').toLowerCase().replace(/\s+/g, '-');
            const avatarSrc = staff.avatar_url || '../images/avatar-generic.png';
            row.innerHTML = `
                <td><div class="table-user-cell"><img src="${avatarSrc}" alt="Avatar"><span>${staff.full_name || 'N/A'}</span></div></td>
                <td><span class="role-chip ${roleClass}">${staff.role || 'N/A'}</span></td>
                <td>${staff.email || 'N/A'}</td>
                <td>${staff.phone_number || 'N/A'}</td>
                <td><span class="status-chip active">Active</span></td>
                <td><div class="action-buttons"><button class="btn-action edit" title="Edit"><i class="fa-solid fa-pencil"></i></button></div></td>
            `;
            staffTableBody.appendChild(row);
        });
    }

    function openModalForAdd() {
        if (!staffForm || !addStaffModal) return;
        staffForm.reset();
        staffIdField.value = '';
        staffModalTitle.textContent = 'Add New Staff Member';
        submitBtn.textContent = 'Save Staff Member';
        const passwordField = staffForm.querySelector('#staff-password');
        if (passwordField) {
            passwordField.required = true;
            passwordField.placeholder = 'Min. 6 characters';
        }
        addStaffModal.style.display = 'flex';
    }

    async function openModalForEdit(staffId) {
        if (!staffForm || !addStaffModal) return;
        staffForm.reset();
        staffIdField.value = staffId;
        staffModalTitle.textContent = 'Edit Staff Member';
        submitBtn.textContent = 'Save Changes';
        const passwordField = staffForm.querySelector('#staff-password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.required = false; // optional on edit
            passwordField.placeholder = 'Leave blank to keep current password';
        }
        const result = await fetchApi(`${API_BASE_URL}/api/staff/${staffId}`);
        if (result && result.success) {
            const staff = result.data;
            document.getElementById('staff-name').value = staff.full_name || '';
            document.getElementById('staff-role').value = staff.role || '';
            document.getElementById('staff-email').value = staff.email || '';
            document.getElementById('staff-phone').value = staff.phone_number || '';
        }
        addStaffModal.style.display = 'flex';
    }

    // --- MODAL EVENT LISTENERS ---
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', openModalForAdd);
    }
    if (closeStaffModalBtn) {
        closeStaffModalBtn.addEventListener('click', () => {
            if (addStaffModal) addStaffModal.style.display = 'none';
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target == addStaffModal) {
            addStaffModal.style.display = 'none';
        }
    });

    if (staffTableBody) {
        staffTableBody.addEventListener('click', (event) => {
            const editButton = event.target.closest('.btn-action.edit');
            if (editButton) {
                const staffId = editButton.closest('tr').dataset.staffId;
                openModalForEdit(staffId);
            }
        });
    }

    // --- FORM SUBMISSION ---
    if (staffForm) {
        staffForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(staffForm);
            const staffData = Object.fromEntries(formData.entries());
            const staffId = staffData.staffId;
            const isEditing = !!staffId;

            if (!isEditing && staffData.staffPassword.length < 6) {
                Toastify({...toastConfig, text: "Password must be at least 6 characters.", style: { background: "var(--red-accent)" }}).showToast();
                return;
            }

            if (isEditing && !staffData.staffPassword) {
                delete staffData.staffPassword;
            }

            const url = isEditing ? `${API_BASE_URL}/api/staff/${staffId}` : `${API_BASE_URL}/api/staff`;
            const method = isEditing ? 'PATCH' : 'POST';

            const result = await fetchApi(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(staffData)
            });

            if (result && result.success) {
                const message = isEditing ? "Staff member updated!" : "Staff member created successfully!";
                Toastify({...toastConfig, text: message, style: { background: "var(--green-accent)" }}).showToast();
                if (addStaffModal) addStaffModal.style.display = 'none';
                setTimeout(() => fetchAndRenderStaff(), 500);
            }
        });
    }

    // --- INITIAL LOAD ---
    fetchAndRenderStaff();
});
