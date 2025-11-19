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

    portalSplashEl = document.getElementById('portal-splash');
    portalSplashMessageEl = document.getElementById('portal-splash-message');
    showPortalSplash();

    const welcomeHeader = document.getElementById('welcome-header');
    welcomeHeader.textContent = `${t('welcome')}...`;

    const handleLogout = async () => {
        try { if (window.supabaseClient) await window.supabaseClient.auth.signOut(); } catch {}
        localStorage.clear();
        window.location.href = 'patient-login.html';
    };
    ['logout-button', 'mobile-logout-button'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', handleLogout);
    });
    const mobilePasswordModal = document.getElementById('mobile-password-modal');
    const openPasswordBtn = document.getElementById('mobile-change-password-trigger');
    const closePasswordBtn = document.getElementById('mobile-password-modal-close');
    if (openPasswordBtn) openPasswordBtn.addEventListener('click', () => toggleMobilePasswordModal(true));
    if (closePasswordBtn) closePasswordBtn.addEventListener('click', () => toggleMobilePasswordModal(false));
    if (mobilePasswordModal) {
        mobilePasswordModal.addEventListener('click', (e) => {
            if (e.target === mobilePasswordModal) toggleMobilePasswordModal(false);
        });
    }
    
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
            if (result && result.success) {
                alert('Password updated. Please sign in again.');
                toggleMobilePasswordModal(false);
                localStorage.clear();
                window.location.href = 'patient-login.html';
            }
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

let portalSplashEl = null;
let portalSplashMessageEl = null;
let portalExercises = [];
let portalInvoices = [];
let progressChart;
let progressChartMobile;
const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#e9eef5"/><stop offset="1" stop-color="#f6f8fc"/></linearGradient></defs>
    <rect width="128" height="128" fill="url(#g)"/>
    <circle cx="64" cy="48" r="24" fill="#cbd5e1"/>
    <path d="M20 110a44 44 0 0 1 88 0" fill="#cbd5e1"/>
  </svg>`);

function showPortalSplash(message) {
    if (!portalSplashEl) return;
    const fallback = typeof t === 'function' ? t('loading') : 'Loading...';
    portalSplashEl.classList.remove('is-hidden');
    if (portalSplashMessageEl) {
        portalSplashMessageEl.textContent = message || fallback;
    }
}

function hidePortalSplash() {
    if (!portalSplashEl) return;
    portalSplashEl.classList.add('is-hidden');
}

async function fetchDashboardData(token) {
    showPortalSplash();
    const result = await fetchApi('/api/portal/dashboard', token);
    if (result && result.success) {
        renderDashboard(result.data);
        hidePortalSplash();
    } else {
        hidePortalSplash();
        document.body.innerHTML = '<h1>Error</h1><p>Could not load your portal data. Please try again later.</p>';
    }
}

function renderDashboard(data) {
    portalExercises = data.exercises || [];
    portalInvoices = data.invoices || [];
    renderNextAppointment(data.nextAppointment);
    renderExercisePlan(portalExercises);
    renderProgressChart(portalExercises);
    renderAppointmentHistory(data.appointmentHistory);
    renderInvoices(portalInvoices);
    renderClinicInfo(data.clinic);
    // Mobile mirrors
    renderNextAppointment(data.nextAppointment, true);
    renderExercisePlan(portalExercises, true);
    renderProgressChart(portalExercises, true);
    renderAppointmentHistory(data.appointmentHistory, true);
    renderInvoices(portalInvoices, true);
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
    if (!list) return;
    list.innerHTML = '';
    if (!history || history.length === 0) { list.innerHTML = `<li class="history-item empty" data-i18n="noPastAppointments"></li>`; translatePage(); return; }
    history.forEach(app => {
        const start = new Date(app.start_time);
        const end = app.end_time ? new Date(app.end_time) : null;
        const formattedDate = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const startTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const endTime = end ? end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
        const therapist = app.staff?.full_name ? `<span><i class="fas fa-user-md"></i> ${app.staff.full_name}</span>` : '';
        list.insertAdjacentHTML('beforeend', `
            <li class="history-card">
                <div class="history-card-row">
                    <div>
                        <p class="history-title">${app.title || 'Therapy Session'}</p>
                        <p class="history-date">${formattedDate}</p>
                    </div>
                    <span class="status-chip status-${(app.status || 'pending').toLowerCase()}">${formatAppointmentStatus(app.status)}</span>
                </div>
                <div class="history-meta">
                    <span><i class="fas fa-clock"></i> ${startTime}${endTime ? ` - ${endTime}` : ''}</span>
                    ${therapist}
                </div>
            </li>
        `);
    });
}

function renderInvoices(invoices, mobile = false) {
    const container = document.getElementById(mobile ? 'invoices-list-mobile' : 'invoices-list');
    if (!container) return;
    if (!invoices || invoices.length === 0) {
        container.innerHTML = `<p class="history-item empty" data-i18n="noInvoices"></p>`;
        translatePage();
        return;
    }
    container.innerHTML = invoices.map((inv) => {
        const formattedDate = inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const appointment = inv.appointment?.start_time ? new Date(inv.appointment.start_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
        const statusClass = (inv.status || 'pending').toLowerCase();
        return `
            <div class="invoice-row">
                <div class="invoice-row-header">
                    <div>
                        <p class="invoice-id">#${String(inv.id).padStart(5, '0')}</p>
                        <p class="invoice-date">${formattedDate}</p>
                    </div>
                    <div class="invoice-row-meta">
                        <span class="amount">${formatCurrency(inv.total_amount)}</span>
                        <span class="status-chip status-${statusClass}">${formatInvoiceStatus(inv.status)}</span>
                    </div>
                </div>
                ${appointment ? `<p class="invoice-date"><i class="fas fa-calendar-check"></i> ${appointment}</p>` : ''}
                <div class="invoice-actions">
                    <button type="button" class="btn btn-secondary download-invoice" data-invoice-id="${inv.id}">
                        <i class="fas fa-file-download"></i> <span data-i18n="downloadInvoice">Download PDF</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    translatePage();
}

function renderClinicInfo(clinic, mobile = false) {
    const container = document.getElementById(mobile ? 'clinic-contact-info-mobile' : 'clinic-contact-info');
    if (!container) return;
    if (!clinic) { container.innerHTML = '<p>Clinic contact info unavailable.</p>'; return; }
    container.innerHTML = `<p><i class="fas fa-phone"></i> ${clinic.phone_number}</p><p><i class="fas fa-map-marker-alt"></i> ${clinic.address.replace(/\n/g, '<br>')}</p>`;
}
async function loadProfileForMobile(prefetchedPatient) {
    const token = localStorage.getItem('patientToken');
    const patient = prefetchedPatient || await fetchPatientProfile(token);
    applyMobileProfile(patient);
    window.portalPatientProfile = patient;
}

async function fetchPatientProfile(token) {
    const result = await fetchApi('/api/portal/me', token);
    return result && result.success ? result.data : null;
}

function applyMobileProfile(patient) {
    const avatarEl = document.getElementById('mobile-profile-avatar');
    const nameEl = document.getElementById('mobile-profile-name');
    const emailEl = document.getElementById('mobile-profile-email');
    const storedName = localStorage.getItem('patientName');
    const storedEmail = localStorage.getItem('patientEmail');
    if (nameEl) {
        const hasRealName = !!(patient?.full_name || storedName);
        nameEl.textContent = hasRealName ? (patient?.full_name || storedName) : t('patientFallback');
        nameEl.dataset.hasName = hasRealName ? 'true' : 'false';
    }
    if (emailEl) emailEl.textContent = patient?.email || storedEmail || '';

    if (patient?.full_name) localStorage.setItem('patientName', patient.full_name);
    if (patient?.email) localStorage.setItem('patientEmail', patient.email);

    const welcomeHeader = document.getElementById('welcome-header');
    if (welcomeHeader && patient?.full_name) welcomeHeader.textContent = `${t('welcome')}, ${patient.full_name}!`;

    const avatarUrl = patient?.avatar_url || localStorage.getItem('patientAvatarUrl') || DEFAULT_AVATAR;
    if (avatarEl) avatarEl.src = avatarUrl;
    if (patient?.avatar_url) localStorage.setItem('patientAvatarUrl', patient.avatar_url);

    updatePatientInfoList(patient);
}

function updatePatientInfoList(patient) {
    const list = document.getElementById('patient-info-mobile');
    if (!list) return;
    const age = patient?.date_of_birth ? calculateAge(patient.date_of_birth) : null;
    const lang = localStorage.getItem('lang') || document.documentElement.getAttribute('lang') || 'en';
    const ageSuffix = lang === 'km' ? 'ឆ្នាំ' : 'yrs';
    const dash = '—';
    const fields = [
        { key: 'ageLabel', raw: age, isAge: true },
        { key: 'genderLabel', raw: patient?.gender || dash },
        { key: 'phoneLabel', raw: patient?.phone_number || dash },
        { key: 'emailLabel', raw: patient?.email || dash }
    ];
    list.innerHTML = fields.map(field => {
        const value = field.isAge
            ? (field.raw != null ? `${field.raw} ${ageSuffix}` : dash)
            : (field.raw || dash);
        const attr = field.isAge ? ` data-age-value="${field.raw ?? ''}"` : '';
        return `<li><span data-i18n="${field.key}">${t(field.key)}</span><strong${attr}>${value}</strong></li>`;
    }).join('');
    refreshPatientInfoLanguage();
}

function calculateAge(dateString) {
    const birthday = new Date(dateString);
    if (Number.isNaN(birthday.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) age--;
    return age;
}

loadProfileForMobile();

function formatAppointmentStatus(status = '') {
    const normalized = status.replace(/_/g, ' ').trim().toLowerCase();
    if (!normalized) return 'Pending';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatInvoiceStatus(status = '') {
    const normalized = (status || '').replace(/_/g, ' ').trim().toLowerCase();
    if (!normalized) return 'Pending';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatCurrency(amount) {
    const num = Number(amount ?? 0);
    return `$${num.toFixed(2)}`;
}

document.addEventListener('click', (event) => {
    const downloadBtn = event.target.closest('.download-invoice');
    if (!downloadBtn) return;
    const invoiceId = downloadBtn.dataset.invoiceId;
    const invoice = portalInvoices.find((inv) => String(inv.id) === String(invoiceId));
    if (invoice) downloadInvoice(invoice);
});

function downloadInvoice(invoice) {
    const patient = window.portalPatientProfile || {};
    const patientName = patient.full_name || localStorage.getItem('patientName') || t('patientFallback');
    const patientAge = patient.date_of_birth ? calculateAge(patient.date_of_birth) : null;
    const patientSex = patient.gender || 'N/A';
    const items = (invoice.invoice_items || []).map((item) => ({
        service: item.service_name || item.service || 'Service',
        qty: item.quantity || 1,
        price: Number(item.unit_price ?? item.price ?? 0),
        disc: 0
    }));
    if (!items.length) {
        items.push({
            service: invoice.diagnostic || 'Consultation',
            qty: 1,
            price: Number(invoice.total_amount ?? 0),
            disc: 0
        });
    }
    const receiptData = {
        patientName,
        patientAge: patientAge ?? 'N/A',
        patientSex,
        billDate: invoice.created_at ? new Date(invoice.created_at).toISOString().split('T')[0] : '',
        diagnostic: invoice.diagnostic || 'As per consultation',
        items
    };
    localStorage.setItem('currentInvoiceData', JSON.stringify(receiptData));
    window.open('kheng-physiocare-receipt.html', '_blank');
}

function toggleMobilePasswordModal(show) {
    const modal = document.getElementById('mobile-password-modal');
    if (!modal) return;
    modal.classList.toggle('open', show);
    modal.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function initMobileNav() {
    const nav = document.getElementById('bottom-nav');
    const pages = document.querySelectorAll('.mobile-page');
    const welcomeHeader = document.getElementById('welcome-header');
    const toggleWelcome = (isHome) => {
        if (welcomeHeader) welcomeHeader.classList.toggle('welcome-hidden', !isHome);
    };
    toggleWelcome(true);
    if (!nav) return;
    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (!btn) return;
        nav.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.dataset.target;
        toggleWelcome(targetId === 'page-home');
        pages.forEach(p => p.classList.toggle('active', p.id === targetId));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function refreshPatientInfoLanguage() {
    const lang = localStorage.getItem('lang') || document.documentElement.getAttribute('lang') || 'en';
    const ageSuffix = lang === 'km' ? 'ឆ្នាំ' : 'yrs';
    document.querySelectorAll('#patient-info-mobile strong[data-age-value]').forEach((node) => {
        const value = node.getAttribute('data-age-value');
        node.textContent = value ? `${value} ${ageSuffix}` : '—';
    });
}

window.refreshPatientInfoLanguage = refreshPatientInfoLanguage;
