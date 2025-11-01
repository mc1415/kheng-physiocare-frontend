// js/patient-portal.js (Complete Final Version)

document.addEventListener('DOMContentLoaded', async () => {
    // Prefer Supabase Auth session
    let hasSession = false;
    try {
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            hasSession = !!session;
        }
    } catch {}
    const token = localStorage.getItem('patientToken'); // legacy fallback
    if (!hasSession && !token) { window.location.href = 'patient-login.html'; return; }

    const welcomeHeader = document.getElementById('welcome-header');
    welcomeHeader.textContent = `${t('welcome')}...`;

    document.getElementById('logout-button').addEventListener('click', async () => {
        try { if (window.supabaseClient) await window.supabaseClient.auth.signOut(); } catch {}
        localStorage.clear();
        window.location.href = 'patient-login.html';
    });
    
    // Change Password form handler (desktop)
    const changeForm = document.getElementById('change-password-form');
    if (changeForm) {
        const currentEl = document.getElementById('current-password');
        const newEl = document.getElementById('new-password');
        const confirmEl = document.getElementById('confirm-password');
        const errorEl = document.getElementById('change-password-error');
        const submitBtn = document.getElementById('change-password-btn');

        changeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';
            errorEl.textContent = '';

            const currentPassword = currentEl.value.trim();
            const newPassword = newEl.value.trim();
            const confirmPassword = confirmEl.value.trim();

            if (newPassword !== confirmPassword) {
                errorEl.textContent = 'New passwords do not match.';
                errorEl.style.display = 'block';
                return;
            }
            if (newPassword.length < 8) {
                errorEl.textContent = 'Password must be at least 8 characters.';
                errorEl.style.display = 'block';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            const result = await fetchApi('/api/patient/change-password', token, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';

            if (result && result.success) {
                alert('Password updated. Please sign in again.');
                localStorage.clear();
                window.location.href = 'patient-login.html';
            } else {
                errorEl.textContent = (result && result.message) ? result.message : 'Could not update password.';
                errorEl.style.display = 'block';
            }
        });
    }

    // Change Password form handler (mobile profile)
    const changeFormMobile = document.getElementById('change-password-form-mobile');
    if (changeFormMobile) {
        const currentEl = document.getElementById('current-password-mobile');
        const newEl = document.getElementById('new-password-mobile');
        const confirmEl = document.getElementById('confirm-password-mobile');
        const errorEl = document.getElementById('change-password-error-mobile');
        const submitBtn = document.getElementById('change-password-btn-mobile');
        changeFormMobile.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';
            errorEl.textContent = '';
            const currentPassword = currentEl.value.trim();
            const newPassword = newEl.value.trim();
            const confirmPassword = confirmEl.value.trim();
            if (newPassword !== confirmPassword) { errorEl.textContent = 'New passwords do not match.'; errorEl.style.display = 'block'; return; }
            if (newPassword.length < 8) { errorEl.textContent = 'Password must be at least 8 characters.'; errorEl.style.display = 'block'; return; }
            submitBtn.disabled = true; submitBtn.textContent = 'Updating...';
            const result = await fetchApi('/api/patient/change-password', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
            submitBtn.disabled = false; submitBtn.textContent = 'Update Password';
            if (result && result.success) { alert('Password updated. Please sign in again.'); localStorage.clear(); window.location.href = 'patient-login.html'; }
            else { errorEl.textContent = (result && result.message) ? result.message : 'Could not update password.'; errorEl.style.display = 'block'; }
        });
    }
    // Mobile bottom nav
    initMobileNav();

    fetchDashboardData(token);
});

async function fetchApi(endpoint, token, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`; // legacy backend fallback only
    const method = options.method || 'GET';
    const body = options.body ? options.body : undefined;

    // Prefer Supabase Edge Function if configured
    const fnName = (window.PORTAL_FUNCTION_NAME || '').trim();
    const fnUrl = (window.PORTAL_FUNCTION_URL || '').trim();
    const mode = (window.SUPABASE_FUNCTION_MODE || 'auto').toLowerCase();

    const payload = { path: endpoint, method, headers, body };

    const tryInvoke = async () => {
        if (!window.supabaseClient || !fnName) throw new Error('Supabase client or function name missing');
        const { data, error } = await window.supabaseClient.functions.invoke(fnName, { body: payload });
        if (error) throw error;
        return data;
    };
    const tryHttp = async () => {
        if (!fnUrl || !window.SUPABASE_ANON_KEY) throw new Error('Function URL or anon key missing');
        const res = await fetch(fnUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            let msg = 'Function call failed';
            try { const j = await res.json(); msg = j?.message || j?.error || msg; } catch {}
            throw new Error(msg);
        }
        return res.json();
    };

    try {
        if (fnName || fnUrl) {
            let data = null;
            if (mode === 'invoke') data = await tryInvoke();
            else if (mode === 'http') data = await tryHttp();
            else { try { data = await tryInvoke(); } catch (e) { data = await tryHttp(); } }
            if (data && data.status === 401) { localStorage.clear(); window.location.href = 'patient-login.html'; return null; }
            return data;
        }

        // Fallback to backend API
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (response.status === 401) { localStorage.clear(); window.location.href = 'patient-login.html'; return null; }
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
    } catch (error) { console.error(`API Error on ${endpoint}:`, error); return null; }
}

let portalExercises = [];
let progressChart;
let progressChartMobile;

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
    // Mobile mirrors
    renderNextAppointment(data.nextAppointment, true);
    renderExercisePlan(portalExercises, true);
    renderProgressChart(portalExercises, true);
    renderAppointmentHistory(data.appointmentHistory, true);
    renderClinicInfo(data.clinic, true);
}

function renderNextAppointment(appointment, mobile = false) {
    const card = document.getElementById(mobile ? 'next-appointment-card-mobile' : 'next-appointment-card');
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
function renderExercisePlan(exercises, mobile = false) {
    const container = document.getElementById(mobile ? 'exercise-plan-mobile' : 'exercise-plan');
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
                <iframe src="${embedUrl}" title="YouTube video" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
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

function renderProgressChart(exercises, mobile = false) {
    const canvas = document.getElementById(mobile ? 'exercise-progress-chart-mobile' : 'exercise-progress-chart');
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

    if (!mobile && progressChart) {
        progressChart.data.datasets[0].data = data;
        progressChart.update();
        return;
    }
    if (mobile && progressChartMobile) {
        progressChartMobile.data.datasets[0].data = data;
        progressChartMobile.update();
        return;
    }

    const chart = new Chart(canvas, {
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
    if (mobile) progressChartMobile = chart; else progressChart = chart;
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

function renderAppointmentHistory(history, mobile = false) {
    const list = document.getElementById(mobile ? 'appointment-history-mobile' : 'appointment-history');
    list.innerHTML = '';
    if (!history || history.length === 0) { list.innerHTML = `<li data-i18n="noPastAppointments"></li>`; translatePage(); return; }
    history.forEach(app => {
        const date = new Date(app.start_time);
        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        list.innerHTML += `<li class="history-item"><span class="date">${formattedDate}</span> - <span class="status">${app.status}</span></li>`;
    });
}

function renderClinicInfo(clinic, mobile = false) {
    const container = document.getElementById(mobile ? 'clinic-contact-info-mobile' : 'clinic-contact-info');
    if (!clinic) { container.innerHTML = '<p>Clinic contact info unavailable.</p>'; return; }
    container.innerHTML = `<p><i class="fas fa-phone"></i> ${clinic.phone_number}</p><p><i class="fas fa-map-marker-alt"></i> ${clinic.address.replace(/\n/g, '<br>')}</p>`;
}

// Fetch and render profile avatar/name/email for mobile
(async function loadProfileForMobile(){
    const token = localStorage.getItem('patientToken');
    const avatarEl = document.getElementById('mobile-profile-avatar');
    const nameEl = document.getElementById('mobile-profile-name');
    const emailEl = document.getElementById('mobile-profile-email');
    // Keep placeholder until real name arrives from patients table
    if (nameEl && !nameEl.textContent) nameEl.textContent = 'Patient';

    // Fallback avatar (embedded SVG data URI to avoid 404s)
    const defaultAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#e9eef5"/><stop offset="1" stop-color="#f6f8fc"/></linearGradient></defs>
        <rect width="128" height="128" fill="url(#g)"/>
        <circle cx="64" cy="48" r="24" fill="#cbd5e1"/>
        <path d="M20 110a44 44 0 0 1 88 0" fill="#cbd5e1"/>
      </svg>`);

    if (avatarEl) {
        const cached = localStorage.getItem('patientAvatarUrl');
        avatarEl.src = cached || defaultAvatar;
    }

    // Fetch profile via portal API (Supabase session is used under the hood)
    const result = await fetchApi('/api/portal/me', token);
    if (result && result.success) {
        if (result.data?.full_name) {
            if (nameEl) nameEl.textContent = result.data.full_name;
            // Also update desktop welcome header to use patients.full_name
            const header = document.getElementById('welcome-header');
            if (header) header.textContent = `${t('welcome')}, ${result.data.full_name}!`;
            localStorage.setItem('patientName', result.data.full_name);
        }
        if (result.data?.email && emailEl) {
            emailEl.textContent = result.data.email;
            localStorage.setItem('patientEmail', result.data.email);
        }
        if (result.data?.avatar_url) {
            localStorage.setItem('patientAvatarUrl', result.data.avatar_url);
            if (avatarEl) avatarEl.src = result.data.avatar_url;
        } else if (avatarEl) {
            avatarEl.src = defaultAvatar;
        }
    } else if (avatarEl) {
        avatarEl.src = avatarEl.src || defaultAvatar;
    }
})();

function initMobileNav() {
    const nav = document.getElementById('bottom-nav');
    const pages = document.querySelectorAll('.mobile-page');
    if (!nav) return;
    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (!btn) return;
        nav.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.dataset.target;
        pages.forEach(p => p.classList.toggle('active', p.id === targetId));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
