document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('patientToken');
    const patientName = localStorage.getItem('patientName');

    // --- 1. Auth Guard: If no token, redirect to login ---
    if (!token) {
        window.location.href = 'patient-login.html';
        return; // Stop executing the rest of the script
    }

    // --- 2. Setup UI Elements ---
    document.getElementById('patient-name').textContent = patientName || 'Patient';
    
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientName');
        window.location.href = 'patient-login.html';
    });
    
    // --- 3. Fetch and Render Dashboard Data ---
    fetchDashboardData(token);
});

async function fetchDashboardData(token) {
    try {
        const response = await fetch('http://localhost:3000/api/portal/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            // Token is invalid or expired, force logout
            localStorage.removeItem('patientToken');
            localStorage.removeItem('patientName');
            window.location.href = 'patient-login.html';
            return;
        }

        const result = await response.json();

        if (result.success) {
            renderDashboard(result.data);
        } else {
            console.error('Failed to load dashboard data:', result.message);
            // You could display an error message on the page here
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

function renderDashboard(data) {
    renderNextAppointment(data.nextAppointment);
    renderAppointmentHistory(data.appointmentHistory);
    renderExercises(data.exercises);
}

function renderNextAppointment(appointment) {
    const card = document.getElementById('next-appointment-card');
    if (!appointment) {
        card.innerHTML = `<p>You have no upcoming appointments scheduled.</p>`;
        return;
    }
    const date = new Date(appointment.start_time);
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
        <h3>${formattedDate}</h3>
        <p><i class="fas fa-clock"></i> at <strong>${formattedTime}</strong></p>
        ${appointment.notes ? `<p class="notes">Notes: ${appointment.notes}</p>` : ''}
        <p class="status status-${appointment.status.toLowerCase()}">${appointment.status}</p>
    `;
}

function renderAppointmentHistory(history) {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = ''; // Clear previous content
    if (!history || history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">No past appointments found.</td></tr>`;
        return;
    }
    history.forEach(app => {
        const date = new Date(app.start_time);
        const formattedDate = date.toISOString().split('T')[0];
        const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const row = `
            <tr>
                <td>${formattedDate}</td>
                <td>${formattedTime}</td>
                <td><span class="status status-${app.status.toLowerCase()}">${app.status}</span></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function renderExercises(exercises) {
    const container = document.getElementById('exercise-list');
    container.innerHTML = '';
    if (!exercises || exercises.length === 0) {
        container.innerHTML = `<p>You have no exercises assigned at the moment.</p>`;
        return;
    }
    exercises.forEach(ex => {
        const exercise = ex.exercises; // The joined exercise details
        const card = `
            <div class="exercise-card card">
                <h4>${exercise.title}</h4>
                <p>${exercise.description || 'No description available.'}</p>
                ${exercise.video_path ? `<a href="${exercise.video_path}" target="_blank" class="btn btn-secondary"><i class="fas fa-video"></i> Watch Video</a>` : ''}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}