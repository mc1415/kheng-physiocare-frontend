// admin/js/appointments.js (Complete Final Version with Timezone Fix)

document.addEventListener('DOMContentLoaded', function() {
    // --- Page Elements ---
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    const appointmentModal = document.getElementById('appointmentModal');
    const closeAppointmentModalBtn = document.getElementById('closeAppointmentModalBtn');
    const appointmentForm = document.getElementById('appointment-form');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const appointmentModalTitle = document.getElementById('modalTitle');
    const newAppointmentBtn = document.getElementById('newAppointmentBtn');
    const therapistSelect = document.getElementById('therapist');
    const patientSelect = document.getElementById('appointment-patient');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    // --- API Helper ---
    async function fetchApi(url, options = {}) {
        try { const response = await fetch(url, options); if (!response.ok) { let e = 'API error.'; try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText } throw new Error(e) } return 204 === response.status || "DELETE" === options.method ? { success: !0 } : response.json() } catch (t) { return console.error(`API Error on ${url}:`, t), Toastify({ ...toastConfig, text: `Error: ${t.message}`, style: { background: "var(--red-accent)" } }).showToast(), null }
    }

    // --- Dropdown Population ---
    async function populateTherapistDropdown() {
        if (!therapistSelect) return;
        const result = await fetchApi(`${API_BASE_URL}/api/staff`);
        if (result && result.success) { therapistSelect.innerHTML = '<option value="">-- Select Therapist --</option>'; result.data.forEach(staff => { const option = document.createElement('option'); option.value = staff.id; option.textContent = staff.full_name; therapistSelect.appendChild(option); }); } else { therapistSelect.innerHTML = '<option value="">Could not load</option>'; }
    }
    async function populatePatientDropdown() {
        if (!patientSelect) return;
        const result = await fetchApi(`${API_BASE_URL}/api/patients`);
        if (result && result.success) { patientSelect.innerHTML = '<option value="">-- Select Patient --</option>'; result.data.forEach(patient => { const option = document.createElement('option'); option.value = patient.raw_id; option.textContent = `${patient.fullName} (${patient.display_id})`; patientSelect.appendChild(option); }); } else { patientSelect.innerHTML = '<option value="">Could not load</option>'; }
    }
    function getEventColor(status) { switch (status) { case 'Confirmed': return '#34d399'; case 'Pending': return '#fbbF24'; case 'Cancelled': return '#f87171'; default: return '#38bdf8'; } }
    
    // --- FullCalendar Initialization ---
    const calendar = new FullCalendar.Calendar(calendarEl, {
        // =================================================================
        // --- THE FIX IS HERE ---
        // Force the calendar to display all times in the Cambodia timezone
        timeZone: 'Asia/Phnom_Penh',
        // =================================================================
        
        initialView: 'timeGridWeek',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,listWeek' },
        allDaySlot: false,
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00', // 8 PM
        
        events: async function(fetchInfo, successCallback, failureCallback) {
            const result = await fetchApi(`${API_BASE_URL}/api/appointments`);
            if (result && result.success) {
                const formattedEvents = result.data.map(e => ({...e, backgroundColor: getEventColor(e.extendedProps.status), borderColor: getEventColor(e.extendedProps.status)}));
                successCallback(formattedEvents);
            } else { failureCallback(new Error("Failed to fetch appointments")); }
        },
        editable: true, selectable: true,
        
        // When you select a time slot to create a new appointment
        select: function(info) {
            appointmentForm.reset();
            appointmentModalTitle.innerText = 'New Appointment';
            deleteEventBtn.style.display = 'none';
            document.getElementById('eventId').value = '';
            // Use info.startStr which is already in the correct timezone because of the setting above
            document.getElementById('start-time').value = info.startStr.slice(0, 16);
            document.getElementById('end-time').value = info.endStr.slice(0, 16);
            populateTherapistDropdown();
            populatePatientDropdown();
            appointmentModal.style.display = 'flex';
        },
        
        // When you click an existing event to edit it
        eventClick: async function(info) {
            appointmentForm.reset();
            appointmentModalTitle.innerText = 'Edit Appointment';
            deleteEventBtn.style.display = 'block';
            document.getElementById('eventId').value = info.event.id;
            document.getElementById('appointment-title').value = info.event.title;
            // FullCalendar's event objects have start/end properties that are Date objects.
            // We need to format them into YYYY-MM-DDTHH:mm for the datetime-local input.
            const toLocalISOString = (date) => {
                const pad = (num) => num.toString().padStart(2, '0');
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
            }
            document.getElementById('start-time').value = toLocalISOString(info.event.start);
            document.getElementById('end-time').value = info.event.end ? toLocalISOString(info.event.end) : toLocalISOString(info.event.start);

            document.getElementById('status').value = info.event.extendedProps.status || 'Confirmed';
            await populateTherapistDropdown();
            await populatePatientDropdown();
            document.getElementById('therapist').value = info.event.extendedProps.therapist_id || '';
            document.getElementById('appointment-patient').value = info.event.extendedProps.patient_id || '';
            appointmentModal.style.display = 'flex';
        },

        // Drag-and-drop handler
        eventDrop: async function(info) {
            const event = info.event;
            const updatedEvent = {
                patient_id: event.extendedProps.patient_id,
                title: event.title,
                // event.start/end are now correctly in the target timezone
                start: event.start.toISOString(),
                end: event.end ? event.end.toISOString() : null,
                therapist_id: event.extendedProps.therapist_id,
                status: event.extendedProps.status
            };
            const result = await fetchApi(`${API_BASE_URL}/api/appointments/${event.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedEvent) });
            if (!result) info.revert();
            else Toastify({...toastConfig, text: "Appointment rescheduled!", style: { background: "var(--primary-accent)" }}).showToast();
        },
        
        eventDidMount: function(info) {
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

    // --- Modal & Form Event Listeners (No changes needed here) ---
    if (newAppointmentBtn) {
        newAppointmentBtn.addEventListener('click', () => {
            appointmentForm.reset();
            appointmentModalTitle.innerText = 'New Appointment';
            deleteEventBtn.style.display = 'none';
            document.getElementById('eventId').value = '';
            populateTherapistDropdown();
            populatePatientDropdown();
            appointmentModal.style.display = 'flex';
        });
    }
    if (closeAppointmentModalBtn) closeAppointmentModalBtn.addEventListener('click', () => { appointmentModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == appointmentModal) appointmentModal.style.display = 'none'; });
    
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const eventId = document.getElementById('eventId').value;
            const isEditing = !!eventId;
            const appointmentData = {
                patient_id: document.getElementById('appointment-patient').value,
                title: document.getElementById('appointment-title').value,
                start: document.getElementById('start-time').value,
                end: document.getElementById('end-time').value,
                therapist_id: document.getElementById('therapist').value,
                status: document.getElementById('status').value
            };
            const url = isEditing ? `${API_BASE_URL}/api/appointments/${eventId}` : `${API_BASE_URL}/api/appointments`;
            const method = isEditing ? 'PATCH' : 'POST';
            const result = await fetchApi(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appointmentData) });
            if (result) {
                Toastify({...toastConfig, text: isEditing ? "Appointment updated!" : "Appointment created!", style: { background: "var(--primary-accent)" }}).showToast();
                appointmentModal.style.display = 'none';
                calendar.refetchEvents();
            }
        });
    }

    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', function() {
            const eventId = document.getElementById('eventId').value;
            if (!eventId || !confirm('Are you sure you want to delete this appointment?')) return;
            
            const deleteAppointment = async () => {
                const result = await fetchApi(`${API_BASE_URL}/api/appointments/${eventId}`, { method: 'DELETE' });
                if(result) {
                    Toastify({...toastConfig, text: "Appointment deleted.", style: { background: "var(--red-accent)" }}).showToast();
                    appointmentModal.style.display = 'none';
                    calendar.refetchEvents();
                }
            };
            deleteAppointment();
        });
    }
});