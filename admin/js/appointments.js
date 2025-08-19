// admin/js/appointments.js (Final Version with Custom Views)

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // --- GRAB ALL PAGE-SPECIFIC ELEMENTS ---
    const appointmentModal = document.getElementById('appointmentModal');
    const closeAppointmentModalBtn = document.getElementById('closeAppointmentModalBtn');
    const appointmentForm = document.getElementById('appointment-form');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const appointmentModalTitle = document.getElementById('modalTitle');
    const newAppointmentBtn = document.getElementById('newAppointmentBtn');
    const therapistSelect = document.getElementById('therapist');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };
    const patientSelect = document.getElementById('appointment-patient');

    // --- API HELPER (Unchanged) ---
    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let errorMsg = 'An API error occurred.';
                try { const errorResult = await response.json(); errorMsg = errorResult.message || errorMsg; } catch (e) { errorMsg = response.statusText; }
                throw new Error(errorMsg);
            }
            if (options.method === 'DELETE' || response.status === 204) return { success: true };
            return response.json();
        } catch (error) {
            console.error(`API Error on ${url}:`, error);
            Toastify({...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" }}).showToast();
            return null;
        }
    }

    
    
});

// To ensure no mistakes, here is the absolute final code for the entire file.
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    const appointmentModal = document.getElementById('appointmentModal');
    const closeAppointmentModalBtn = document.getElementById('closeAppointmentModalBtn');
    const appointmentForm = document.getElementById('appointment-form');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const appointmentModalTitle = document.getElementById('modalTitle');
    const newAppointmentBtn = document.getElementById('newAppointmentBtn');
    const therapistSelect = document.getElementById('therapist');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };
    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) { let errorMsg = 'An API error occurred.'; try { const errorResult = await response.json(); errorMsg = errorResult.message || errorMsg; } catch (e) { errorMsg = response.statusText; } throw new Error(errorMsg); }
            if (options.method === 'DELETE' || response.status === 204) return { success: true };
            return response.json();
        } catch (error) { console.error(`API Error on ${url}:`, error); Toastify({...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" }}).showToast(); return null; }
    }
    async function populatePatientDropdown() {
        if (!patientSelect) return;
        const result = await fetchApi(`${API_BASE_URL}/api/patients`);
        if (result && result.success) {
            patientSelect.innerHTML = '<option value="">-- Select Patient --</option>';
            result.data.forEach(patient => {
                const option = document.createElement('option');
                option.value = patient.raw_id; // Use the real database ID
                option.textContent = `${patient.fullName} (${patient.display_id})`;
                patientSelect.appendChild(option);
            });
        } else {
            patientSelect.innerHTML = '<option value="">Could not load patients</option>';
        }
    }
    async function populateTherapistDropdown() {
        if (!therapistSelect) return;
        const result = await fetchApi(`${API_BASE_URL}/api/staff`);
        if (result && result.success) {
            therapistSelect.innerHTML = '<option value="">-- Select Therapist --</option>';
            result.data.forEach(staff => { const option = document.createElement('option'); option.value = staff.id; option.textContent = staff.full_name; therapistSelect.appendChild(option); });
        } else { therapistSelect.innerHTML = '<option value="">Could not load therapists</option>'; }
    }
    function getEventColor(status) { switch (status) { case 'Confirmed': return '#34d399'; case 'Pending': return '#fbbF24'; case 'Cancelled': return '#f87171'; default: return '#38bdf8'; } }
    const calendar = new FullCalendar.Calendar(calendarEl, {
        timeZone: 'Asia/Bangkok',
        initialView: 'timeGridWeek',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,listWeek' },
        allDaySlot: false, // This removes the 'all-day' slot globally
        slotMinTime: '08:00:00', // Set min time globally
        slotMaxTime: '20:00:00', // Set max time globally (8 PM)
        
        events: async function(fetchInfo, successCallback, failureCallback) {
            const result = await fetchApi(`${API_BASE_URL}/api/appointments`);
            if (result && result.success) {
                const formattedEvents = result.data.map(e => ({...e, backgroundColor: getEventColor(e.extendedProps.status), borderColor: getEventColor(e.extendedProps.status)}));
                successCallback(formattedEvents);
            } else { failureCallback(new Error("Failed to fetch appointments")); }
        },
        editable: true, selectable: true,
        select: function(info) {
            if(appointmentForm) appointmentForm.reset();
            if(appointmentModalTitle) appointmentModalTitle.innerText = 'New Appointment';
            if(deleteEventBtn) deleteEventBtn.style.display = 'none';
            document.getElementById('eventId').value = '';
            document.getElementById('start-time').value = info.startStr.slice(0, 16);
            document.getElementById('end-time').value = info.endStr.slice(0, 16);
            populateTherapistDropdown();
            populatePatientDropdown();
            if(appointmentModal) appointmentModal.style.display = 'flex';
        },
        eventClick: async function(info) {
            if(appointmentForm) appointmentForm.reset();
            if(appointmentModalTitle) appointmentModalTitle.innerText = 'Edit Appointment';
            if(deleteEventBtn) deleteEventBtn.style.display = 'block';
            document.getElementById('eventId').value = info.event.id;
            document.getElementById('appointment-title').value = info.event.title;
            document.getElementById('start-time').value = info.event.startStr.slice(0, 16);
            document.getElementById('end-time').value = info.event.end ? info.event.endStr.slice(0, 16) : info.event.startStr.slice(0, 16);
            document.getElementById('status').value = info.event.extendedProps.status || 'Confirmed';
            await populateTherapistDropdown();
            document.getElementById('appointment-patient').value = info.event.extendedProps.patient_id || '';
            document.getElementById('therapist').value = info.event.extendedProps.therapist_id || '';
            if(appointmentModal) appointmentModal.style.display = 'flex';
        },
        eventDrop: async function(info) {
            const event = info.event;
            const updatedEvent = { title: event.title, start: event.start.toISOString(), end: event.end ? event.end.toISOString() : null, therapist_id: event.extendedProps.therapist_id, status: event.extendedProps.status };
            const result = await fetchApi(`${API_BASE_URL}/api/appointments/${event.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedEvent) });
            if (!result) info.revert();
            else Toastify({...toastConfig, text: "Appointment rescheduled!", style: { background: "var(--primary-accent)" }}).showToast();
        },
        eventDidMount: function(info) {
            // Check if the therapist data exists AND if we are in a view that has the title container
            const titleContainer = info.el.querySelector('.fc-event-title-container');
            
            if (info.event.extendedProps.therapist && titleContainer) {
                const therapistEl = document.createElement('div');
                therapistEl.className = 'fc-event-therapist';
                therapistEl.innerHTML = `<i class="fa-solid fa-user-doctor"></i> ${info.event.extendedProps.therapist}`;
                titleContainer.appendChild(therapistEl);
            }
        }
    });
    calendar.render();
    if (newAppointmentBtn) {
        newAppointmentBtn.addEventListener('click', () => {
            if(appointmentForm) appointmentForm.reset();
            if(appointmentModalTitle) appointmentModalTitle.innerText = 'New Appointment';
            if(deleteEventBtn) deleteEventBtn.style.display = 'none';
            document.getElementById('eventId').value = '';
            populateTherapistDropdown();
            populatePatientDropdown();
            if(appointmentModal) appointmentModal.style.display = 'flex';
        });
    }
    if (closeAppointmentModalBtn) closeAppointmentModalBtn.addEventListener('click', () => { if(appointmentModal) appointmentModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == appointmentModal) appointmentModal.style.display = 'none'; });
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const eventId = document.getElementById('eventId').value;
            const isEditing = !!eventId;
            const appointmentData = { patient_id: document.getElementById('appointment-patient').value, title: document.getElementById('appointment-title').value, start: document.getElementById('start-time').value, end: document.getElementById('end-time').value, therapist_id: document.getElementById('therapist').value, status: document.getElementById('status').value };
            const url = isEditing ? `${API_BASE_URL}/api/appointments/${eventId}` : `${API_BASE_URL}/api/appointments`;
            const method = isEditing ? 'PATCH' : 'POST';
            const result = await fetchApi(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appointmentData) });
            if (result) {
                const successMessage = isEditing ? "Appointment updated!" : "Appointment created!";
                const toastColor = isEditing ? "var(--primary-accent)" : "var(--green-accent)";
                Toastify({...toastConfig, text: successMessage, style: { background: toastColor }}).showToast();
                if(appointmentModal) appointmentModal.style.display = 'none';
                calendar.refetchEvents();
            }
        });
    }
    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', function() {
            const eventId = document.getElementById('eventId').value;
            if (!eventId) return;
            const toast = Toastify({ text: "<strong>Delete this appointment?</strong><br>This is permanent.", escapeMarkup: false, duration: -1, close: true, gravity: "center", position: "center", style: { background: "#1e293b", border: "1px solid var(--red-accent)" } }).showToast();
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
                const result = await fetchApi(`${API_BASE_URL}/api/appointments/${eventId}`, { method: 'DELETE' });
                if(result) {
                    Toastify({...toastConfig, text: "Appointment deleted.", style: { background: "var(--red-accent)" }}).showToast();
                    if(appointmentModal) appointmentModal.style.display = 'none';
                    calendar.refetchEvents();
                }
            }
            noButton.onclick = function() { toast.hideToast(); }
        });
    }
});