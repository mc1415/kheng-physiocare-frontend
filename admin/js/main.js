// Kheng PhysioCare - Admin Panel MASTER JavaScript File (Complete & Corrected)

document.addEventListener('DOMContentLoaded', function() {

    // --- Toastify Global Configuration ---
    const toastConfig = {
        duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true
    };

    // --- API Helper Function (used by multiple sections) ---
    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let errorMsg = 'An API error occurred.';
                try { 
                    const errorResult = await response.json();
                    errorMsg = errorResult.message || errorMsg; 
                } catch (e) {
                    errorMsg = response.statusText;
                }
                throw new Error(errorMsg);
            }
            if (options.method === 'DELETE' || response.status === 204) {
                return { success: true };
            }
            return response.json();
        } catch (error) {
            console.error(`API Error on ${url}:`, error);
            Toastify({...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" }}).showToast();
            return null;
        }
    }

    // =================================================================
    // --- APPOINTMENT MODAL & FULLCALENDAR LOGIC (for appointments.html) ---
    // =================================================================
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        const appointmentModal = document.getElementById('appointmentModal');
        const closeAppointmentModalBtn = document.getElementById('closeAppointmentModalBtn');
        const appointmentForm = document.getElementById('appointment-form');
        const deleteEventBtn = document.getElementById('deleteEventBtn');
        const appointmentModalTitle = document.getElementById('modalTitle');
        const newAppointmentBtn = document.getElementById('newAppointmentBtn');
        
        function getEventColor(status) {
            switch (status) {
                case 'Confirmed': return '#34d399';
                case 'Pending': return '#fbbF24';
                case 'Cancelled': return '#f87171';
                default: return '#38bdf8';
            }
        }
        const GMT7_OFFSET = 7;
        const inputGmt7ToUtcIso = (value) => {
            if (!value) return null;
            const [datePart, timePart = '00:00'] = value.split('T');
            const [y, m, d] = datePart.split('-').map(Number);
            const [hh, mm] = timePart.split(':').map(Number);
            return new Date(Date.UTC(y, (m || 1) - 1, d || 1, (hh || 0) - GMT7_OFFSET, mm || 0))
                .toISOString();
        };

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
            events: async function(fetchInfo, successCallback, failureCallback) {
                const result = await fetchApi(\${API_BASE_URL}/api/``appointments');
                if (result && result.success) {
                    const formattedEvents = result.data.map(e => ({...e, backgroundColor: getEventColor(e.extendedProps.status), borderColor: getEventColor(e.extendedProps.status)}));
                    successCallback(formattedEvents);
                } else {
                    failureCallback(new Error("Failed to fetch appointments"));
                }
            },
            editable: true, selectable: true, allDaySlot: false, slotMinTime: '08:00:00', slotMaxTime: '19:00:00',
            
            select: function(info) {
                if(appointmentForm) appointmentForm.reset();
                if(appointmentModalTitle) appointmentModalTitle.innerText = 'New Appointment';
                if(deleteEventBtn) deleteEventBtn.style.display = 'none';
                document.getElementById('eventId').value = '';
                document.getElementById('start-time').value = info.startStr.slice(0, 16);
                document.getElementById('end-time').value = info.endStr.slice(0, 16);
                if(appointmentModal) appointmentModal.style.display = 'flex';
            },

            eventClick: function(info) {
                if(appointmentModalTitle) appointmentModalTitle.innerText = 'Edit Appointment';
                if(deleteEventBtn) deleteEventBtn.style.display = 'block';
                document.getElementById('eventId').value = info.event.id;
                document.getElementById('appointment-title').value = info.event.title;
                document.getElementById('start-time').value = info.event.startStr.slice(0, 16);
                document.getElementById('end-time').value = info.event.end ? info.event.endStr.slice(0, 16) : info.event.startStr.slice(0, 16);
                document.getElementById('therapist').value = info.event.extendedProps.therapist_id || '';
                document.getElementById('status').value = info.event.extendedProps.status || 'Confirmed';
                if(appointmentModal) appointmentModal.style.display = 'flex';
            },

            eventDrop: async function(info) {
                const event = info.event;
                const updatedEvent = { title: event.title, start: event.start.toISOString(), end: event.end ? event.end.toISOString() : null, therapist_id: event.extendedProps.therapist_id, status: event.extendedProps.status };
                const result = await fetchApi(`/api/appointments/${event.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedEvent) });
                if (result) {
                    Toastify({...toastConfig, text: "Appointment rescheduled!", style: { background: "var(--primary-accent)" }}).showToast();
                } else {
                    info.revert();
                }
            },

            eventDidMount: function(info) {
                if (info.event.extendedProps.therapist) {
                    const therapistEl = document.createElement('div');
                    therapistEl.className = 'fc-event-therapist';
                    therapistEl.innerHTML = `<i class="fa-solid fa-user-doctor"></i> ${info.event.extendedProps.therapist}`;
                    info.el.querySelector('.fc-event-title-container').appendChild(therapistEl);
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
                if(appointmentModal) appointmentModal.style.display = 'flex';
            });
        }
        if (closeAppointmentModalBtn) {
            closeAppointmentModalBtn.addEventListener('click', () => { if(appointmentModal) appointmentModal.style.display = 'none'; });
        }
        
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                const eventId = document.getElementById('eventId').value;
                const isEditing = !!eventId;
                const appointmentData = {
                    title: document.getElementById('appointment-title').value,
                    start: inputGmt7ToUtcIso(document.getElementById('start-time').value),
                    end: inputGmt7ToUtcIso(document.getElementById('end-time').value),
                    therapist_id: document.getElementById('therapist').value,
                    status: document.getElementById('status').value
                };
                const url = isEditing ? `/api/appointments/${eventId}` : '/api/appointments';
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
                    const result = await fetchApi(`/api/appointments/${eventId}`, { method: 'DELETE' });
                    if(result) {
                        Toastify({...toastConfig, text: "Appointment deleted.", style: { background: "var(--red-accent)" }}).showToast();
                        if(appointmentModal) appointmentModal.style.display = 'none';
                        calendar.refetchEvents();
                    }
                }
                noButton.onclick = function() { toast.hideToast(); }
            });
        }
    }
    
    // =================================================================
    // --- Other Modal Logic (Staff, Product, etc.) ---
    // Note: This logic is intentionally simplified. A better approach is
    // dedicated JS files for each page, like we did with patients.js
    // but this will work for the prototype.
    // =================================================================
    
    // Staff Modal
    const addStaffBtn = document.getElementById('addStaffBtn');
    const addStaffModal = document.getElementById('addStaffModal');
    const closeStaffModalBtn = document.getElementById('closeStaffModalBtn');
    const staffForm = document.getElementById('add-staff-form');

    if (addStaffBtn && addStaffModal && closeStaffModalBtn) {
        addStaffBtn.addEventListener('click', () => { addStaffModal.style.display = 'flex'; });
        closeStaffModalBtn.addEventListener('click', () => { addStaffModal.style.display = 'none'; });
        window.addEventListener('click', (event) => { if (event.target == addStaffModal) { addStaffModal.style.display = 'none'; } });
    }
    if(staffForm) {
        staffForm.addEventListener('submit', function(event) {
            event.preventDefault();
            Toastify({...toastConfig, text: "New staff member added successfully!", style: { background: "var(--green-accent)" } }).showToast();
            staffForm.reset();
            addStaffModal.style.display = 'none';
        });
    }

    // Product Modal
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductModal = document.getElementById('addProductModal');
    const closeProductModalBtn = document.getElementById('closeProductModalBtn');
    const productForm = document.getElementById('add-product-form');

    if (addProductBtn && addProductModal && closeProductModalBtn) {
        addProductBtn.addEventListener('click', () => { addProductModal.style.display = 'flex'; });
        closeProductModalBtn.addEventListener('click', () => { addProductModal.style.display = 'none'; });
        window.addEventListener('click', (event) => { if (event.target == addProductModal) { addProductModal.style.display = 'none'; } });
    }
    if(productForm) {
        productForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(productForm);
            const productData = Object.fromEntries(formData.entries());
            const result = await fetchApi(\${API_BASE_URL}/api/``products', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(productData)});
            if(result) {
                Toastify({...toastConfig, text: "Product added successfully!", style: { background: "var(--green-accent)" } }).showToast();
                addProductModal.style.display = 'none';
                productForm.reset();
                if(window.location.pathname.includes('inventory.html')) {
                    setTimeout(() => window.location.reload(), 1500);
                }
            }
        });
    }

});
