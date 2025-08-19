// admin/js/patient-detail.js (API-driven version)

document.addEventListener('DOMContentLoaded', async function() {
    const mainContent = document.querySelector('.main-content');
    const mainContentContainer = document.querySelector('.patient-detail-layout');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) { let e = 'API error.'; try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText } throw new Error(e) }
            return options.method === 'DELETE' || response.status === 204 ? { success: true } : response.json();
        } catch (error) { Toastify({ ...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" } }).showToast(); return null; }
    }
    
    const patientId = localStorage.getItem('selectedPatientId');
    if (!patientId) { mainContent.innerHTML = `<h1>Error</h1><p>No patient ID found.</p><a href="patients.html">Back to list</a>`; return; }

    async function loadPatientData() {
        const patientResult = await fetchApi(`${API_BASE_URL}/api/patients/${patientId}`);
        if (patientResult && patientResult.success) {
            renderSummary(patientResult.data);
            
            // Fetch related data in parallel
            const [appointments, billing, exercises] = await Promise.all([
                fetchApi(`${API_BASE_URL}/api/appointments?patient_id=${patientId}`), // We'll need to adjust the API to filter by patient
                fetchApi(`${API_BASE_URL}/api/invoices?patient_id=${patientId}`), // Same here
                fetchApi(`${API_BASE_URL}/api/patients/${patientId}/exercises`)
            ]);
            
            // These render functions now need to exist
            // renderAppointments(appointments?.data || []);
            // renderBilling(billing?.data || []);
            renderAssignedExercises(exercises?.data || []);
        }
    }

    function renderSummary(patient) {
        const summaryInfo = document.getElementById('patient-summary-info');
        const summaryContact = document.getElementById('patient-summary-contact');
        if(!summaryInfo || !summaryContact) return;
        
        summaryInfo.innerHTML = `
            <img src="${patient.avatar_url || '../images/avatar-generic.png'}" alt="Patient Avatar" class="patient-avatar-large">
            <h2 class="patient-name-large">${patient.full_name}</h2>
            <p class="patient-id-large">#PT-${patient.id.toString().padStart(3, '0')}</p>
        `;
        summaryContact.innerHTML = `
            <h4>Contact Information</h4>
            <p><i class="fa-solid fa-phone"></i> ${patient.phone_number || 'N/A'}</p>
            <p><i class="fa-solid fa-envelope"></i> ${patient.email || 'N/A'}</p>
            <p><i class="fa-solid fa-location-dot"></i> ${patient.address || 'N/A'}</p>
        `;
    }
    
    function renderAssignedExercises(assigned) {
        const container = document.getElementById('assigned-exercises-list');
        container.innerHTML = '';
        if (assigned.length === 0) { container.innerHTML = '<p>No exercises assigned to this patient.</p>'; return; }
        
        assigned.forEach(item => {
            const exercise = item.exercises; // The joined data
            const el = document.createElement('div');
            el.className = 'assigned-exercise-item';
            el.innerHTML = `
                <div class="exercise-item-details">
                    <strong>${exercise.title}</strong>
                    <small>${item.notes || 'No specific notes.'}</small>
                </div>
                <button class="btn-action delete-assignment" data-assignment-id="${item.id}" title="Un-assign Exercise">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            container.appendChild(el);
        });
    }

    function initializeTabs() {
        const tabs = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(item => item.classList.remove('active'));
                tabContents.forEach(item => item.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    }
    
    const assignModal = document.getElementById('assignExerciseModal');
    const assignBtn = document.getElementById('assignExerciseBtn');
    const closeAssignModalBtn = document.getElementById('closeAssignModalBtn');
    const assignForm = document.getElementById('assign-exercise-form');

    assignBtn.addEventListener('click', async () => {
        const select = document.getElementById('exercise-select');
        const exercisesResult = await fetchApi(`${API_BASE_URL}/api/exercises`);
        if (exercisesResult && exercisesResult.success) {
            select.innerHTML = '<option value="">-- Select an exercise --</option>';
            exercisesResult.data.forEach(ex => {
                select.innerHTML += `<option value="${ex.id}">${ex.title}</option>`;
            });
        }
        assignModal.style.display = 'flex';
    });
    
    closeAssignModalBtn.addEventListener('click', () => assignModal.style.display = 'none');
    window.addEventListener('click', e => { if (e.target == assignModal) assignModal.style.display = 'none' });
    
    assignForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = {
            exercise_id: assignForm.querySelector('[name="exercise_id"]').value,
            notes: assignForm.querySelector('[name="notes"]').value,
            frequency_per_week: assignForm.querySelector('[name="frequency_per_week"]').value,
        };
        const result = await fetchApi(`${API_BASE_URL}/api/patients/${patientId}/exercises`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (result) {
            Toastify({ ...toastConfig, text: "Exercise assigned!", style: { background: "var(--green-accent)" } }).showToast();
            assignModal.style.display = 'none';
            loadPatientData(); // Reload the list
        }
    });
    
    document.getElementById('assigned-exercises-list').addEventListener('click', async function(e){
        const deleteBtn = e.target.closest('.delete-assignment');
        if(deleteBtn) {
            const assignmentId = deleteBtn.dataset.assignmentId;
            if(confirm('Are you sure you want to un-assign this exercise?')) {
                const result = await fetchApi(`${API_BASE_URL}/api/assigned-exercises/${assignmentId}`, { method: 'DELETE' });
                if(result) {
                     Toastify({ ...toastConfig, text: "Exercise unassigned.", style: { background: "var(--red-accent)" } }).showToast();
                     loadPatientData();
                }
            }
        }
    });

    loadPatientData();
    // initializeTabs(); // Make sure this is called if needed
});