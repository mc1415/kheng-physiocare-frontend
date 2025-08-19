document.addEventListener('DOMContentLoaded', async function() {
    // --- DOM Elements & Config ---
    const mainContent = document.querySelector('.main-content');
    const layoutContainer = document.querySelector('.patient-detail-layout');
    const loader = document.getElementById('loader');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    // --- API Helper ---
    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) { let e = 'API error.'; try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText } throw new Error(e) }
            return options.method === 'DELETE' || response.status === 204 ? { success: true } : response.json();
        } catch (error) { Toastify({ ...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" } }).showToast(); return null; }
    }

    // --- Initialization ---
    const patientId = localStorage.getItem('selectedPatientId');
    if (!patientId) {
        loader.style.display = 'none';
        mainContent.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;"><h1>Error</h1><p>No Patient ID was found. Please return to the patient list.</p><a href="patients.html" class="btn-primary-action">Back to Patients</a></div></div>`;
        return;
    }
    await loadAllPatientData();
    
    // --- Main Data Loading Function ---
    async function loadAllPatientData() {
        loader.style.display = 'flex';
        layoutContainer.style.display = 'none';

        const patientResult = await fetchApi(`${API_BASE_URL}/api/patients/${patientId}`);
        if (!patientResult || !patientResult.success) {
            loader.style.display = 'none';
            mainContent.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;"><h1>Patient Not Found</h1><p>The requested patient could not be found.</p><a href="patients.html" class="btn-primary-action">Back to Patients</a></div></div>`;
            return;
        }
        
        renderSummary(patientResult.data);

        // Fetch all related data in parallel for speed
        const [appointments, billing, exercises, notes] = await Promise.all([
            fetchApi(`${API_BASE_URL}/api/appointments?patient_id=${patientId}`),
            fetchApi(`${API_BASE_URL}/api/invoices?patient_id=${patientId}`),
            fetchApi(`${API_BASE_URL}/api/patients/${patientId}/exercises`),
            fetchApi(`${API_BASE_URL}/api/patients/${patientId}/notes`)
        ]);

        renderAppointments(appointments?.data || []);
        renderBilling(billing?.data || []);
        renderAssignedExercises(exercises?.data || []);
        renderNotes(notes?.data || []);

        initializeTabs();
        initializeModals();

        loader.style.display = 'none';
        layoutContainer.style.display = 'grid';
    }

    // --- RENDER FUNCTIONS ---
    function renderSummary(patient) {
        document.getElementById('patient-summary-info').innerHTML = `<img src="${patient.avatar_url || '../images/avatar-generic.png'}" alt="Patient Avatar" class="patient-avatar-large"><h2 class="patient-name-large">${patient.full_name}</h2><p class="patient-id-large">#PT-${patient.id.toString().padStart(3, '0')}</p>`;
        document.getElementById('patient-summary-contact').innerHTML = `<h4>Contact Information</h4><p><i class="fa-solid fa-phone"></i> ${patient.phone_number || 'N/A'}</p><p><i class="fa-solid fa-envelope"></i> ${patient.email || 'N/A'}</p><p><i class="fa-solid fa-location-dot"></i> ${patient.address || 'N/A'}</p>`;
    }

    function renderAppointments(apps) {
        const container = document.getElementById('appointments');
        if (apps.length === 0) { container.innerHTML = '<div class="card"><div class="card-body"><p>No appointments found for this patient.</p></div></div>'; return; }
        const tableRows = apps.map(app => `<tr><td>${new Date(app.start).toLocaleDateString()}</td><td>${new Date(app.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td><td>${app.title}</td><td>${app.extendedProps.therapist}</td><td><span class="status-chip ${app.extendedProps.status.toLowerCase()}">${app.extendedProps.status}</span></td></tr>`).join('');
        container.innerHTML = `<div class="card"><div class="card-header"><h3>Appointment History</h3></div><div class="card-body"><table class="data-table"><thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Therapist</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
    }

    function renderBilling(invoices) {
        const container = document.getElementById('billing');
        if (invoices.length === 0) { container.innerHTML = '<div class="card"><div class="card-body"><p>No invoices found for this patient.</p></div></div>'; return; }
        const tableRows = invoices.map(inv => `<tr><td>${inv.id}</td><td>${inv.date}</td><td>$${inv.amount.toFixed(2)}</td><td><span class="status-chip ${inv.status.toLowerCase()}">${inv.status}</span></td><td><button class="btn-action print" data-invoice-id="${inv.raw_id}"><i class="fa-solid fa-print"></i></button></td></tr>`).join('');
        container.innerHTML = `<div class="card"><div class="card-header"><h3>Invoice History</h3></div><div class="card-body"><table class="data-table"><thead><tr><th>ID</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
    }

    function renderAssignedExercises(assigned) {
        const listHtml = assigned.length === 0 ? '<p>No exercises assigned.</p>' : assigned.map(item => `<div class="assigned-exercise-item"><div><strong>${item.exercises.title}</strong><small>${item.notes || 'No specific notes.'}</small></div><button class="btn-action delete-assignment" data-assignment-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button></div>`).join('');
        document.getElementById('exercises').innerHTML = `<div class="card"><div class="card-header"><h3>Assigned Exercises</h3><button id="assignExerciseBtn" class="btn-primary-action"><i class="fa-solid fa-plus"></i> Assign</button></div><div class="card-body" id="assigned-exercises-list">${listHtml}</div></div>`;
    }

    function renderNotes(notes) {
        const notesHtml = notes.length === 0 ? '<p>No clinical notes recorded.</p>' : notes.map(note => `<div class="note-item"><div class="note-header"><strong>${note.note_date}</strong><span>by ${note.staff?.full_name || 'N/A'}</span></div><div class="note-body"><strong>S:</strong> ${note.subjective || ''}<br><strong>O:</strong> ${note.objective || ''}<br><strong>A:</strong> ${note.assessment || ''}<br><strong>P:</strong> ${note.plan || ''}</div></div>`).join('');
        document.getElementById('notes').innerHTML = `<div class="card"><div class="card-header"><h3>Clinical Notes (SOAP)</h3><button id="addNoteBtn" class="btn-primary-action"><i class="fa-solid fa-plus"></i> Add Note</button></div><div class="card-body" id="notes-history">${notesHtml}</div></div>`;
    }

    // --- EVENT LISTENERS & MODAL INITIALIZATION ---
    function initializeTabs() {
        const tabs = document.querySelectorAll('.tab-link');
        tabs.forEach(tab => tab.addEventListener('click', () => {
            document.querySelector('.tab-link.active').classList.remove('active');
            document.querySelector('.tab-content.active').classList.remove('active');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        }));
    }
    
    function initializeModals() {
        // General modal open/close
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'assignExerciseBtn') {
                const select = document.getElementById('exercise-select');
                const exercisesResult = await fetchApi(`${API_BASE_URL}/api/exercises`);
                if (exercisesResult?.success) select.innerHTML = `<option value="">-- Select --</option>` + exercisesResult.data.map(ex => `<option value="${ex.id}">${ex.title}</option>`).join('');
                document.getElementById('assignExerciseModal').style.display = 'flex';
            }
            if (e.target.id === 'addNoteBtn') {
                document.getElementById('add-note-form').reset();
                document.getElementById('note-date').valueAsDate = new Date();
                document.getElementById('addNoteModal').style.display = 'flex';
            }
            if (e.target.classList.contains('close-button')) e.target.closest('.modal').style.display = 'none';
        });

        // Assign Exercise Form
        document.getElementById('assign-exercise-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = { exercise_id: this.exercise_id.value, notes: this.notes.value, frequency_per_week: this.frequency_per_week.value };
            const result = await fetchApi(`${API_BASE_URL}/api/patients/${patientId}/exercises`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (result) {
                Toastify({ ...toastConfig, text: "Exercise assigned!", style: { background: "var(--green-accent)" } }).showToast();
                document.getElementById('assignExerciseModal').style.display = 'none';
                loadAllPatientData();
            }
        });

        // Un-assign Exercise Button
        document.getElementById('exercises').addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-assignment');
            if (deleteBtn && confirm('Un-assign this exercise from the patient?')) {
                const result = await fetchApi(`${API_BASE_URL}/api/assigned-exercises/${deleteBtn.dataset.assignmentId}`, { method: 'DELETE' });
                if (result) { Toastify({ ...toastConfig, text: "Exercise unassigned.", style: { background: "var(--red-accent)" } }).showToast(); loadAllPatientData(); }
            }
        });

        // Add Note Form
        document.getElementById('add-note-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = { note_date: this.note_date.value, subjective: this.subjective.value, objective: this.objective.value, assessment: this.assessment.value, plan: this.plan.value };
            const result = await fetchApi(`${API_BASE_URL}/api/patients/${patientId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (result) {
                Toastify({ ...toastConfig, text: "Clinical note saved!", style: { background: "var(--green-accent)" } }).showToast();
                document.getElementById('addNoteModal').style.display = 'none';
                loadAllPatientData();
            }
        });
    }
});