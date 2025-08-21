// js/patient-portal.js (Complete Final Version)

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('patientToken');
    if (!token) {
        window.location.href = 'patient-login.html';
        return;
    }

    const welcomeHeader = document.getElementById('welcome-header');
    welcomeHeader.textContent = `${t('welcome')}, ${localStorage.getItem('patientName')}!`;

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
        if (response.status === 401) { localStorage.clear(); window.location.href = 'patient-login.html'; return null; }
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
    } catch (error) { console.error(`API Error on ${endpoint}:`, error); return null; }
}

let portalExercises = [];
let progressChart;

async function fetchDashboardData(token) {
    const result = await fetchApi('/api/portal/dashboard', token);
    if (result && result.success) { renderDashboard(result.data); } 
    else { document.body.innerHTML = '<h1>Error</h1><p>Could not load your portal data. Please try again later.</p>'; }
}

function renderDashboard(data) {
    portalExercises = data.exercises || [];
    renderNextAppointment(data.nextAppointment);
    renderExercisePlan(portalExercises);
    renderProgressChart(portalExercises);
    renderAppointmentHistory(data.appointmentHistory);
    renderClinicInfo(data.clinic);
}

function renderNextAppointment(appointment) {
    const card = document.getElementById('next-appointment-card');
    if (!appointment) { card.innerHTML = `<h2 data-i18n="nextAppointment"></h2><p class="no-appointment-message" data-i18n="noAppointments"></p>`; translatePage(); return; }

    const date = new Date(appointment.start_time);
    const formattedDate = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    card.innerHTML = `
        <h2 data-i18n="nextAppointment"></h2>
        <div class="appointment-details">
            <i class="fas fa-calendar-check icon"></i>
            <div class="appointment-info">
                <h3>${formattedDate}</h3>
                <p>${t('at')} <strong>${formattedTime}</strong> ${t('with')} ${appointment.staff.full_name || 'your therapist'}</p>
            </div>
        </div>
    `;
    translatePage();
}

// --- NEW HELPER FUNCTION TO GET YOUTUBE EMBED URL ---
function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    let videoId = '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        }
    } catch (error) {
        console.error("Invalid video URL:", url);
        return null;
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}


// --- REVISED FUNCTION TO RENDER THE EXERCISE PLAN WITH VIDEO ---
function renderExercisePlan(exercises) {
    const container = document.getElementById('exercise-plan');
    container.innerHTML = '';
    if (!exercises || exercises.length === 0) {
        container.innerHTML = `<p data-i18n="noExercises"></p>`;
        translatePage();
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    exercises.forEach(assignedEx => {
        const exercise = assignedEx.exercises;
        const isCompletedToday = assignedEx.completed_dates && assignedEx.completed_dates.includes(today);
        const embedUrl = getYoutubeEmbedUrl(exercise.video_path);

        const exerciseEl = document.createElement('div');
        exerciseEl.className = 'exercise-item';
        
        let buttonHtml = `<button class="btn-exercise complete" data-assignment-id="${assignedEx.id}"><i class="fas fa-check-circle"></i> ${t('markAsDone')}</button>`;
        if (isCompletedToday) {
            buttonHtml = `<button class="btn-exercise completed" disabled><i class="fas fa-check-circle"></i> ${t('completedToday')}</button>`;
        }

        // Conditionally add the video wrapper if an embed URL exists
        const videoHtml = embedUrl ? `
            <div class="exercise-video-wrapper">
                <iframe src="${embedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        ` : '';

        exerciseEl.innerHTML = `
            <h4>${exercise.title}</h4>
            ${videoHtml}
            <p class="notes">${assignedEx.notes || exercise.description || 'Follow standard procedure.'}</p>
            <div class="exercise-actions">
                ${buttonHtml}
            </div>
        `;
        container.appendChild(exerciseEl);
    });

    container.querySelectorAll('.btn-exercise.complete').forEach(button => {
        button.addEventListener('click', handleCompleteExercise);
    });
}

function renderProgressChart(exercises) {
    const canvas = document.getElementById('exercise-progress-chart');
    if (!canvas) return;

    if (!exercises || exercises.length === 0) {
        canvas.style.display = 'none';
        canvas.parentElement.innerHTML += `<p data-i18n="noExercises"></p>`;
        translatePage();
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    let completed = 0;
    exercises.forEach(ex => {
        if (ex.completed_dates && ex.completed_dates.includes(today)) completed++;
    });
    const pending = exercises.length - completed;
    const data = [completed, pending];

    if (progressChart) {
        progressChart.data.datasets[0].data = data;
        progressChart.update();
        return;
    }

    progressChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: [t('completedExercises'), t('pendingExercises')],
            datasets: [{
                data,
                backgroundColor: ['#4caf50', '#e0e0e0'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function handleCompleteExercise(event) {
    const button = event.target.closest('button');
    const assignmentId = button.dataset.assignmentId;
    const token = localStorage.getItem('patientToken');

    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('saving')}`;

    const result = await fetchApi(`/api/assigned-exercises/${assignmentId}/complete`, token, { method: 'PATCH' });

    if (result && result.success) {
        button.classList.remove('complete');
        button.classList.add('completed');
        button.innerHTML = `<i class="fas fa-check-circle"></i> ${t('completedToday')}`;
        const today = new Date().toISOString().split('T')[0];
        const ex = portalExercises.find(e => e.id === parseInt(assignmentId));
        if (ex) {
            if (!ex.completed_dates) ex.completed_dates = [];
            if (!ex.completed_dates.includes(today)) ex.completed_dates.push(today);
        }
        renderProgressChart(portalExercises);
    } else {
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-check-circle"></i> ${t('markAsDone')}`;
        alert('Could not save progress. Please try again.');
    }
}

function renderAppointmentHistory(history) {
    const list = document.getElementById('appointment-history');
    list.innerHTML = '';
    if (!history || history.length === 0) { list.innerHTML = `<li data-i18n="noPastAppointments"></li>`; translatePage(); return; }
    history.forEach(app => {
        const date = new Date(app.start_time);
        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        list.innerHTML += `<li class="history-item"><span class="date">${formattedDate}</span> - <span class="status">${app.status}</span></li>`;
    });
}

function renderClinicInfo(clinic) {
    const container = document.getElementById('clinic-contact-info');
    if (!clinic) { container.innerHTML = '<p>Clinic contact info unavailable.</p>'; return; }
    container.innerHTML = `<p><i class="fas fa-phone"></i> ${clinic.phone_number}</p><p><i class="fas fa-map-marker-alt"></i> ${clinic.address.replace(/\n/g, '<br>')}</p>`;
}