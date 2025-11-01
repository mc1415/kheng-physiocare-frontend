// admin/js/appointments.js (Final Verified Code)

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

    // --- Dropdown Population & Helpers ---
    async function populateTherapistDropdown() { if (!therapistSelect) return; const result = await fetchApi(`${API_BASE_URL}/api/staff`); if (result && result.success) { therapistSelect.innerHTML = '<option value="">-- Select Therapist --</option>'; result.data.forEach(staff => { const option = document.createElement('option'); option.value = staff.id; option.textContent = staff.full_name; therapistSelect.appendChild(option); }); } else { therapistSelect.innerHTML = '<option value="">Could not load</option>'; } }
    async function populatePatientDropdown() { if (!patientSelect) return; const result = await fetchApi(`${API_BASE_URL}/api/patients`); if (result && result.success) { patientSelect.innerHTML = '<option value="">-- Select Patient --</option>'; result.data.forEach(patient => { const option = document.createElement('option'); option.value = patient.raw_id; option.textContent = `${patient.fullName} (${patient.display_id})`; patientSelect.appendChild(option); }); } else { patientSelect.innerHTML = '<option value="">Could not load</option>'; } }
    function getEventColor(status) { switch (status) { case 'Confirmed': return '#34d399'; case 'Pending': return '#fbbF24'; case 'Cancelled': return '#f87171'; default: return '#38bdf8'; } }
    
    // Helpers for GMT+7 UX
    const pad = (n) => n.toString().padStart(2, '0');
    // Format a Date (assumed UTC) into an input-friendly 'YYYY-MM-DDTHH:mm' as GMT+7 display
    const formatInputFromUTC = (dateUtc) => {
        if (!dateUtc) return '';
        // We display calendar in UTC but shifted events by +7h already.
        // For consistency, format using UTC fields so 17:00Z renders as '17:00'.
        return `${dateUtc.getUTCFullYear()}-${pad(dateUtc.getUTCMonth()+1)}-${pad(dateUtc.getUTCDate())}T${pad(dateUtc.getUTCHours())}:${pad(dateUtc.getUTCMinutes())}`;
    };
    // Convert a datetime-local string that represents GMT+7 into a true UTC ISO string
    const inputGmt7ToUtcIso = (str) => {
        if (!str) return null;
        const [datePart, timePart] = str.split('T');
        const [y, m, d] = datePart.split('-').map(Number);
        const [hh, mm] = (timePart || '00:00').split(':').map(Number);
        // Subtract 7 hours to convert GMT+7 local -> UTC
        const ts = Date.UTC(y, (m||1)-1, d||1, (hh||0) - 7, mm||0, 0, 0);
        return new Date(ts).toISOString();
    };

    // --- FullCalendar Initialization ---
    const calendar = new FullCalendar.Calendar(calendarEl, {
        // Use UTC display and manually shift events by +7h so times render as GMT+7 on any machine
        timeZone: 'UTC',
        eventTimeFormat: {
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
        },
        initialView: 'timeGridWeek',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,listWeek' },
        allDaySlot: false,
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00',
        
        events: async function(fetchInfo, successCallback, failureCallback) {
            const result = await fetchApi(`${API_BASE_URL}/api/appointments`);
            if (result && result.success) {
                const toUtcIso = (v) => {
                    if (!v) return null;
                    // Ensure 'Z' timezone so FullCalendar converts to Asia/Phnom_Penh for display
                    try {
                        // If already ISO with Z, keep as-is
                        if (typeof v === 'string' && /Z$/i.test(v)) return v;
                        return new Date(v).toISOString();
                    } catch { return v; }
                };
                const addHours = (iso, h) => {
                    if (!iso) return null;
                    const t = new Date(iso).getTime() + h * 3600 * 1000;
                    return new Date(t).toISOString();
                };
                const formattedEvents = result.data.map(e => {
                    const start = toUtcIso(e.start || e.start_time);
                    const end = toUtcIso(e.end || e.end_time);
                    const color = getEventColor(e.extendedProps?.status || e.status);
                    return {
                        ...e,
                        // shift by +7 hours so 10:00Z shows as 17:00 in calendar (displaying UTC)
                        start: addHours(start, 7),
                        end: addHours(end, 7),
                        backgroundColor: color,
                        borderColor: color
                    };
                });
                successCallback(formattedEvents);
            } else { failureCallback(new Error("Failed to fetch appointments")); }
        },
        editable: true, selectable: true,
        
        select: function(info) {
            appointmentForm.reset();
            appointmentModalTitle.innerText = 'New Appointment';
            deleteEventBtn.style.display = 'none';
            document.getElementById('eventId').value = '';
            // Use UTC fields (calendar shows shifted +7h) so picker matches the visible slots
            document.getElementById('start-time').value = formatInputFromUTC(info.start);
            document.getElementById('end-time').value = formatInputFromUTC(info.end || info.start);
            populateTherapistDropdown();
            populatePatientDropdown();
            appointmentModal.style.display = 'flex';
        },
        
        eventClick: async function(info) {
            appointmentForm.reset();
            appointmentModalTitle.innerText = 'Edit Appointment';
            deleteEventBtn.style.display = 'block';
            document.getElementById('eventId').value = info.event.id;
            document.getElementById('appointment-title').value = info.event.title;
            document.getElementById('start-time').value = formatInputFromUTC(info.event.start);
            document.getElementById('end-time').value = info.event.end ? formatInputFromUTC(info.event.end) : formatInputFromUTC(info.event.start);
            document.getElementById('status').value = info.event.extendedProps.status || 'Confirmed';
            await populateTherapistDropdown();
            await populatePatientDropdown();
            document.getElementById('therapist').value = info.event.extendedProps.therapist_id || '';
            document.getElementById('appointment-patient').value = info.event.extendedProps.patient_id || '';
            appointmentModal.style.display = 'flex';
        },

        eventDrop: async function(info) {
            const event = info.event;
            const shiftBack = (d) => d ? new Date(d.getTime() - 7 * 3600 * 1000).toISOString() : null;
            const updatedEvent = {
                patient_id: event.extendedProps.patient_id,
                title: event.title,
                // subtract the +7h display shift before saving
                start: shiftBack(event.start),
                end: shiftBack(event.end || event.start),
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

    // --- Modal & Form Event Listeners ---
    if (newAppointmentBtn) { newAppointmentBtn.addEventListener('click', () => { appointmentForm.reset(); appointmentModalTitle.innerText = 'New Appointment'; deleteEventBtn.style.display = 'none'; document.getElementById('eventId').value = ''; populateTherapistDropdown(); populatePatientDropdown(); appointmentModal.style.display = 'flex'; }); }
    if (closeAppointmentModalBtn) { closeAppointmentModalBtn.addEventListener('click', () => { appointmentModal.style.display = 'none'; }); }
    window.addEventListener('click', (event) => { if (event.target == appointmentModal) appointmentModal.style.display = 'none'; });
    if (appointmentForm) { appointmentForm.addEventListener('submit', async function(event) { event.preventDefault(); const eventId = document.getElementById('eventId').value; const isEditing = !!eventId; const appointmentData = { patient_id: document.getElementById('appointment-patient').value, title: document.getElementById('appointment-title').value, start: inputGmt7ToUtcIso(document.getElementById('start-time').value), end: inputGmt7ToUtcIso(document.getElementById('end-time').value), therapist_id: document.getElementById('therapist').value, status: document.getElementById('status').value }; const url = isEditing ? `${API_BASE_URL}/api/appointments/${eventId}` : `${API_BASE_URL}/api/appointments`; const method = isEditing ? 'PATCH' : 'POST'; const result = await fetchApi(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appointmentData) }); if (result) { Toastify({...toastConfig, text: isEditing ? "Appointment updated!" : "Appointment created!", style: { background: "var(--primary-accent)" }}).showToast(); appointmentModal.style.display = 'none'; calendar.refetchEvents(); } }); }
    if (deleteEventBtn) { deleteEventBtn.addEventListener('click', function() { const eventId = document.getElementById('eventId').value; if (!eventId || !confirm('Are you sure you want to delete this appointment?')) return; const deleteAppointment = async () => { const result = await fetchApi(`${API_BASE_URL}/api/appointments/${eventId}`, { method: 'DELETE' }); if(result) { Toastify({...toastConfig, text: "Appointment deleted.", style: { background: "var(--red-accent)" }}).showToast(); appointmentModal.style.display = 'none'; calendar.refetchEvents(); } }; deleteAppointment(); }); }
});
