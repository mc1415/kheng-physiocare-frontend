document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('patientToken');
    if (!token) {
        window.location.href = 'patient-login.html';
        return;
    }

    const welcomeHeader = document.getElementById('welcome-header');
    welcomeHeader.textContent = `Welcome, ${localStorage.getItem('patientName')}!`;

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'patient-login.html';
    });
    
    fetchDashboardData(token);
});

async function fetchApi(endpoint, token, options = {}) {
    const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'patient-login.html';
            return null;
        }
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        return null;
    }
}

async function fetchDashboardData(token) {
    const result = await fetchApi('/api/portal/dashboard', token);
    if (result && result.success) {
        renderDashboard(result.data);
    } else {
        // Handle error display
        document.body.innerHTML = '<h1>Error</h1><p>Could not load your portal data. Please try again later.</p>';
    }
}

function renderDashboard(data) {
    renderNextAppointment(data.nextAppointment);
    renderExercisePlan(data.exercises);
    renderAppointmentHistory(data.appointmentHistory);
    renderClinicInfo(data.clinic);
}

function renderNextAppointment(appointment) {
    const card = document.getElementById('next-appointment-card');
    if (!appointment) {
        card.innerHTML = `<h2>Next Appointment</h2><p class="no-appointment-message">You have no upcoming appointments.</p>`;
        return;
    }
    const date = new Date(appointment.start_time);
    const formattedDate = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    card.innerHTML = `
        <h2>Next Appointment</h2>
        <div class="appointment-details">
            <i class="fas fa-calendar-check icon"></i>
            <div class="appointment-info">
                <h3>${formattedDate}</h3>
                <p>at <strong>${formattedTime}</strong> with ${appointment.staff.full_name || 'your therapist'}</p>
            </div>
        </div>
    `;
}

function renderExercisePlan(exercises) {
    const container = document.getElementById('exercise-plan');
    container.innerHTML = ''; // Clear skeleton loaders
    if (!exercises || exercises.length === 0) {
        container.innerHTML = `<p>You have no exercises assigned at the moment.</p>`;
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    exercises.forEach(assignedEx => {
        const exercise = assignedEx.exercises; // The joined exercise details
        const isCompletedToday = assignedEx.completed_dates && assignedEx.completed_dates.includes(today);

        const exerciseEl = document.createElement('div');
        exerciseEl.className = 'exercise-item';
        
        let buttonHtml = `<button class="btn-exercise complete" data-assignment-id="${assignedEx.id}"><i class="fas fa-check-circle"></i> Mark as Done</button>`;
        if (isCompletedToday) {
            buttonHtml = `<button class="btn-exercise completed" disabled><i class="fas fa-check-circle"></i> Completed Today!</button>`;
        }

        exerciseEl.innerHTML = `
            <h4>${exercise.title}</h4>
            <p class="notes">${assignedEx.notes || exercise.description || 'Follow standard procedure.'}</p>
            <div class="exercise-actions">
                ${exercise.video_path ? `<a href="${exercise.video_path}" target="_blank" rel="noopener noreferrer" class="btn-exercise video"><i class="fas fa-video"></i> Watch Video</a>` : ''}
                ${buttonHtml}
            </div>
        `;
        container.appendChild(exerciseEl);
    });

    // Add event listeners after rendering
    container.querySelectorAll('.btn-exercise.complete').forEach(button => {
        button.addEventListener('click', handleCompleteExercise);
    });
}

async function handleCompleteExercise(event) {
    const button = event.target;
    const assignmentId = button.dataset.assignmentId;
    const token = localStorage.getItem('patientToken');

    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

    const result = await fetchApi(`/api/assigned-exercises/${assignmentId}/complete`, token, { method: 'PATCH' });

    if (result && result.success) {
        button.classList.remove('complete');
        button.classList.add('completed');
        button.innerHTML = `<i class="fas fa-check-circle"></i> Completed Today!`;
    } else {
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-check-circle"></i> Mark as Done`;
        alert('Could not save progress. Please try again.');
    }
}

function renderAppointmentHistory(history) {
    const list = document.getElementById('appointment-history');
    list.innerHTML = '';
    if (!history || history.length === 0) {
        list.innerHTML = `<li>No past appointments found.</li>`;
        return;
    }
    history.forEach(app => {
        const date = new Date(app.start_time);
        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        list.innerHTML += `<li class="history-item"><span class="date">${formattedDate}</span> - <span class="status">${app.status}</span></li>`;
    });
}

function renderClinicInfo(clinic) {
    const container = document.getElementById('clinic-contact-info');
    if (!clinic) { container.innerHTML = '<p>Clinic contact info unavailable.</p>'; return; }
    container.innerHTML = `
        <p><i class="fas fa-phone"></i> ${clinic.phone_number}</p>
        <p><i class="fas fa-map-marker-alt"></i> ${clinic.address.replace(/\n/g, '<br>')}</p>
    `;
}