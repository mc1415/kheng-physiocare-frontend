// admin/js/patient-detail.js (API-driven version)

document.addEventListener('DOMContentLoaded', async function() {
    
    // --- Add a loader element dynamically ---
    const mainContent = document.querySelector('.main-content');
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'full-page-loader';
    loader.innerHTML = '<div class="spinner"></div>';
    if(mainContent) mainContent.prepend(loader);

    // --- DOM Elements ---
    const mainContentContainer = document.querySelector('.patient-detail-layout');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    // --- API Call to Fetch Patient Details ---
    async function fetchPatientDetails(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/patients/${id}`);
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ message: 'Patient data not found.' }));
                throw new Error(errorResult.message);
            }
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching patient details:', error);
            showError(error.message);
            return null;
        }
    }

    // --- Main Page Logic ---
    const patientId = localStorage.getItem('selectedPatientId');
    if (!patientId) {
        showError('No patient ID provided. Please return to the patient list and select a patient.');
        return;
    }

    // Show loader and hide content initially
    if(loader) loader.style.display = 'flex';
    if(mainContentContainer) mainContentContainer.style.display = 'none';

    const patient = await fetchPatientDetails(patientId);
    
    // Hide loader
    if(loader) loader.style.display = 'none';
    
    if (patient) {
        if(mainContentContainer) mainContentContainer.style.display = 'grid';
        renderPage(patient);
    } // The showError function is called inside fetchPatientDetails if it fails

    // --- Helper Function to show errors ---
    function showError(message) {
        if(mainContent) {
            mainContent.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;"><h1>Patient Not Found</h1><p>${message}</p><a href="patients.html" class="btn-primary-action" style="margin-top: 20px; display: inline-block;">Back to Patient List</a></div></div>`;
        }
    }

    // --- Main Render Function ---
    function renderPage(patient) {
        renderSummary(patient);
        // For now, these will use mock data or be empty until we build their APIs
        renderAppointments(patient.appointments || []);
        renderBilling(patient.invoices || []);
        renderNotes(patient.notes || []);
        initializeTabs();
        initializeNoteModal(patient);
    }
    
    // --- Component Render Functions ---
    function renderSummary(patient) {
        const summaryInfo = document.getElementById('patient-summary-info');
        const summaryContact = document.getElementById('patient-summary-contact');
        if(!summaryInfo || !summaryContact) return;
        
        summaryInfo.innerHTML = `
            <img src="${patient.avatar_url || '../images/avatar-generic.png'}" alt="Patient Avatar" class="patient-avatar-large">
            <h2 class="patient-name-large">${patient.full_name}</h2>
            <p class="patient-id-large">#PT-${patient.id.toString().padStart(3, '0')}</p>
            <ul class="patient-meta-list">
                <li><strong>DOB:</strong> ${patient.date_of_birth || 'N/A'}</li>
                <li><strong>Gender:</strong> ${patient.gender || 'N/A'}</li>
                <li><strong>Therapist:</strong> ${patient.assigned_therapist_name || 'Unassigned'}</li>
            </ul>
        `;
        summaryContact.innerHTML = `
            <h4>Contact Information</h4>
            <p><i class="fa-solid fa-phone"></i> ${patient.phone_number || 'N/A'}</p>
            <p><i class="fa-solid fa-envelope"></i> ${patient.email || 'N/A'}</p>
            <p><i class="fa-solid fa-location-dot"></i> ${patient.address || 'N/A'}</p>
        `;
    }

    function renderAppointments(appointments) {
        const container = document.getElementById('appointments-history');
        if(!container) return;
        if (appointments.length === 0) { container.innerHTML = '<p>No appointment history found for this patient.</p>'; return; }
        container.innerHTML = `<table class="data-table"><thead><tr><th>Date</th><th>Service</th><th>Status</th></tr></thead><tbody>${appointments.map(app => `<tr><td>${app.date}</td><td>${app.service}</td><td>${app.status}</td></tr>`).join('')}</tbody></table>`;
    }

    function renderBilling(invoices) {
        const container = document.getElementById('billing-history');
        if(!container) return;
        if (invoices.length === 0) { container.innerHTML = '<p>No billing history found for this patient.</p>'; return; }
        container.innerHTML = `<table class="data-table"><thead><tr><th>Invoice ID</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>${invoices.map(inv => `<tr><td>${inv.id}</td><td>${inv.date}</td><td>${inv.amount}</td><td><span class="status-chip ${inv.status.toLowerCase()}">${inv.status}</span></td><td><button class="btn-action view"><i class="fa-solid fa-print"></i></button></td></tr>`).join('')}</tbody></table>`;
    }
    
    function renderNotes(notes) {
        const container = document.getElementById('notes-history');
        if(!container) return;
        container.innerHTML = '';
        if (notes.length === 0) { container.innerHTML = '<p>No clinical notes recorded for this patient.</p>'; return; }
        [...notes].reverse().forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item';
            noteEl.innerHTML = `<div class="note-header"><strong>${note.date}</strong> - <span>by ${note.therapist}</span></div><div class="note-body">${note.note}</div>`;
            container.appendChild(noteEl);
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
    
    function initializeNoteModal(patient) {
        // This function will need to be updated later to save notes to the DB
        const addNoteBtn = document.getElementById('addNoteBtn');
        const addNoteModal = document.getElementById('addNoteModal');
        const closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
        const addNoteForm = document.getElementById('add-note-form');
        
        if (addNoteBtn && addNoteModal && closeNoteModalBtn) {
            addNoteBtn.addEventListener('click', () => { addNoteForm.reset(); document.getElementById('note-date').valueAsDate = new Date(); addNoteModal.style.display = 'flex'; });
            closeNoteModalBtn.addEventListener('click', () => { addNoteModal.style.display = 'none'; });
            window.addEventListener('click', (event) => { if (event.target == addNoteModal) { addNoteModal.style.display = 'none'; } });
        }
        
        if (addNoteForm) {
            addNoteForm.addEventListener('submit', function(event) {
                event.preventDefault();
                // This logic is temporary and only updates the local display
                const newNoteText = `<strong>S:</strong> ${document.getElementById('note-subjective').value} <br><strong>O:</strong> ${document.getElementById('note-objective').value} <br><strong>A:</strong> ${document.getElementById('note-assessment').value} <br><strong>P:</strong> ${document.getElementById('note-plan').value}`;
                const newNote = { date: document.getElementById('note-date').value, therapist: 'Admin User', note: newNoteText.trim() };
                patient.notes.push(newNote); // Add to the local copy
                renderNotes(patient.notes); // Re-render the notes list
                addNoteModal.style.display = 'none';
                Toastify({text: "Clinical note added (local view only).", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "var(--green-accent)" }}).showToast();
            });
        }
    }
});