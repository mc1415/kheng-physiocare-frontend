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

        // Fetch all related data in parallel for speed
        const [appointments, billing, exercises, notes] = await Promise.all([
            fetchApi(`${API_BASE_URL}/api/appointments?patient_id=${patientId}`),
            fetchApi(`${API_BASE_URL}/api/invoices?patient_id=${patientId}`),
            fetchApi(`${API_BASE_URL}/api/patients/${patientId}/exercises`),
            fetchApi(`${API_BASE_URL}/api/patients/${patientId}/notes`)
        ]);

        const exerciseStats = deriveExerciseStats(exercises?.data || []);
        renderSummary(patientResult.data, {
            appointments: (appointments?.data || []).length,
            invoices: (billing?.data || []).length,
            assignedExercises: exerciseStats.totalAssigned,
            completedDates: exerciseStats.completedDates,
            lastAssigned: exerciseStats.lastAssigned
        });
        renderAppointments(appointments?.data || []);
        renderBilling(billing?.data || []);
        renderAssignedExercises(exercises?.data || []);
        renderNotes(notes?.data || []);

        initializeTabs();
        initializeModals();

        loader.style.display = 'none';
        layoutContainer.style.display = 'grid';
    }

    // --- Helpers ---
    const formatDate = (value) => {
        if (!value) return 'N/A';
        try { return new Date(value).toLocaleDateString(); } catch { return value; }
    };
    const calcAge = (dob) => {
        if (!dob) return '—';
        const birth = new Date(dob);
        if (isNaN(birth)) return '—';
        const diff = Date.now() - birth.getTime();
        return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    };
    function deriveExerciseStats(list) {
        if (!Array.isArray(list) || list.length === 0) return { totalAssigned: 0, completedDates: 0, lastAssigned: null };
        const completedDates = list.reduce((sum, item) => sum + (Array.isArray(item.completed_dates) ? item.completed_dates.length : 0), 0);
        const lastAssigned = list.reduce((latest, item) => {
            const assigned = item.start_date || item.created_at;
            if (!assigned) return latest;
            return !latest || new Date(assigned) > new Date(latest) ? assigned : latest;
        }, null);
        return { totalAssigned: list.length, completedDates, lastAssigned };
    }

    // --- Initialization (after helpers so functions are defined) ---
    const patientId = localStorage.getItem('selectedPatientId');
    if (!patientId) {
        loader.style.display = 'none';
        mainContent.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;"><h1>Error</h1><p>No Patient ID was found. Please return to the patient list.</p><a href="patients.html" class="btn-primary-action">Back to Patients</a></div></div>`;
        return;
    }
    await loadAllPatientData();

    // --- RENDER FUNCTIONS ---
    function renderSummary(patient, stats = {}) {
        const safeId = patient.display_id || patient.id || patient.raw_id || 'N/A';
        const numericId = typeof safeId === 'number' ? safeId : parseInt(String(safeId).replace(/\D/g, ''), 10);
        const formattedId = !isNaN(numericId) ? `#PT-${numericId.toString().padStart(3, '0')}` : safeId;
        document.getElementById('patient-summary-info').innerHTML = `
            <div class="patient-identity">
                <img src="${patient.avatar_url || '../images/avatar-generic.png'}" alt="Patient Avatar" class="patient-avatar-large">
                <div>
                    <h2 class="patient-name-large">${patient.full_name}</h2>
                    <p class="patient-id-large">${formattedId}</p>
                    <div class="pill-row">
                        <span class="pill-badge soft">Age ${calcAge(patient.date_of_birth)}</span>
                        <span class="pill-badge soft">${patient.gender || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('patient-summary-stats').innerHTML = `
            <div class="metric-chip"><div class="chip-label">Appointments</div><div class="chip-value">${stats.appointments || 0}</div></div>
            <div class="metric-chip"><div class="chip-label">Invoices</div><div class="chip-value">${stats.invoices || 0}</div></div>
            <div class="metric-chip"><div class="chip-label">Exercises</div><div class="chip-value">${stats.assignedExercises || 0}</div></div>
            <div class="metric-chip"><div class="chip-label">Completions</div><div class="chip-value">${stats.completedDates || 0}</div></div>
        `;

        const assignedTherapist = patient.assigned_therapist || patient.assigned_therapist_id || 'N/A';
        document.getElementById('patient-summary-contact').innerHTML = `
            <div class="contact-card"><i class="fa-solid fa-phone"></i><div><p class="contact-label">Phone</p><p class="contact-value">${patient.phone_number || 'N/A'}</p></div></div>
            <div class="contact-card"><i class="fa-solid fa-envelope"></i><div><p class="contact-label">Email</p><p class="contact-value">${patient.email || 'N/A'}</p></div></div>
            <div class="contact-card"><i class="fa-solid fa-location-dot"></i><div><p class="contact-label">Address</p><p class="contact-value">${patient.address || 'N/A'}</p></div></div>
            <div class="contact-card"><i class="fa-solid fa-calendar-day"></i><div><p class="contact-label">DOB</p><p class="contact-value">${formatDate(patient.date_of_birth)}</p></div></div>
            <div class="contact-card"><i class="fa-solid fa-user-doctor"></i><div><p class="contact-label">Therapist</p><p class="contact-value">${assignedTherapist}</p></div></div>
            <div class="contact-card"><i class="fa-solid fa-clock"></i><div><p class="contact-label">Last Assigned</p><p class="contact-value">${formatDate(stats.lastAssigned)}</p></div></div>
        `;
    }

    function renderAppointments(apps) {
        const container = document.getElementById('appointments');
        if (apps.length === 0) { container.innerHTML = '<div class="card"><div class="card-body"><p>No appointments found for this patient.</p></div></div>'; return; }
        const tableRows = apps.map(app => {
            const startDate = app.start || app.start_time;
            const start = startDate ? new Date(startDate) : null;
            const therapist = app.extendedProps?.therapist || app.therapist || 'N/A';
            const status = app.extendedProps?.status || app.status || 'N/A';
            return `<tr><td>${start ? start.toLocaleDateString() : '—'}</td><td>${start ? start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</td><td>${app.title || 'N/A'}</td><td>${therapist}</td><td><span class="status-chip ${status.toLowerCase()}">${status}</span></td></tr>`;
        }).join('');
        container.innerHTML = `<div class="card"><div class="card-header"><h3>Appointment History</h3></div><div class="card-body"><table class="data-table"><thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Therapist</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
    }

    function renderBilling(invoices) {
        const container = document.getElementById('billing');
        if (invoices.length === 0) { container.innerHTML = '<div class="card"><div class="card-body"><p>No invoices found for this patient.</p></div></div>'; return; }
        const tableRows = invoices.map(inv => {
            const derivedTotal = (inv.subtotal || inv.discount_amount) ? (parseFloat(inv.subtotal || 0) - parseFloat(inv.discount_amount || 0)) : 0;
            const rawAmount = (inv.total_amount ?? inv.amount ?? derivedTotal ?? 0);
            const amount = Number.isFinite(parseFloat(rawAmount)) ? parseFloat(rawAmount) : 0;
            const status = inv.status || 'N/A';
            const rawId = inv.raw_id || inv.id;
            const cleanedId = String(rawId || '').replace('#INV-', '').replace(/[^0-9]/g, '') || rawId;
            return `<tr><td>${inv.id}</td><td>${inv.date}</td><td>$${amount.toFixed(2)}</td><td><span class="status-chip ${status.toLowerCase()}">${status}</span></td><td><button class="btn-action print" data-invoice-id="${cleanedId}"><i class="fa-solid fa-print"></i></button></td></tr>`;
        }).join('');
        container.innerHTML = `<div class="card"><div class="card-header"><h3>Invoice History</h3></div><div class="card-body"><table class="data-table"><thead><tr><th>ID</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
    }

    function renderAssignedExercises(assigned) {
        const container = document.getElementById('exercises');
        if (assigned.length === 0) {
            container.innerHTML = `<div class="card"><div class="card-header"><h3>Assigned Exercises</h3><button id="assignExerciseBtn" class="btn-primary-action"><i class="fa-solid fa-plus"></i> Assign</button></div><div class="card-body" id="assigned-exercises-list"><p>No exercises assigned.</p></div></div>`;
            return;
        }

        const listHtml = assigned.map(item => {
            const completedDates = Array.isArray(item.completed_dates) ? item.completed_dates : [];
            const completedCount = completedDates.length;
            const freq = item.frequency_per_week || 0;
            const fullyCompleted = freq ? completedCount >= freq : completedCount > 0;
            const statusLabel = fullyCompleted ? 'Completed' : 'Not completed';
            const statusClass = fullyCompleted ? 'completed' : 'not-completed';
            const statusIcon = fullyCompleted ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-regular fa-circle"></i>';
            const assignedOn = formatDate(item.start_date || item.created_at);
            const lastCompleted = completedDates.length ? formatDate(completedDates[completedDates.length - 1]) : '—';

            return `
                <div class="assigned-exercise-card">
                    <div class="assigned-exercise-main">
                        <div>
                            <div class="exercise-title">${item.exercises?.title || 'Exercise'}</div>
                            <div class="exercise-notes">${item.notes || 'No specific notes.'}</div>
                        </div>
                        <div class="exercise-status">
                            <span class="pill-badge ${statusClass}">${statusIcon} ${statusLabel}</span>
                            <small>&nbsp;</small>
                        </div>
                    </div>
                    <div class="assigned-exercise-meta">
                        <span><i class="fa-regular fa-calendar-plus"></i> Assigned: ${assignedOn}</span>
                        <span><i class="fa-regular fa-circle-check"></i> Last done: ${lastCompleted}</span>
                    </div>
                    <div class="assigned-exercise-actions">
                        <button class="btn-secondary-action delete-assignment" data-assignment-id="${item.id}"><i class="fa-solid fa-trash-can"></i> Remove</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="card"><div class="card-header"><h3>Assigned Exercises</h3><button id="assignExerciseBtn" class="btn-primary-action"><i class="fa-solid fa-plus"></i> Assign</button></div><div class="card-body exercise-list" id="assigned-exercises-list">${listHtml}</div></div>`;
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

        // Billing print actions
        document.getElementById('billing').addEventListener('click', (e) => {
            const printBtn = e.target.closest('.btn-action.print');
            if (printBtn) {
                const invoiceId = printBtn.dataset.invoiceId;
                if (invoiceId) window.open(`../kheng-physiocare-receipt.html?receipt-id=${invoiceId}`, '_blank');
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
