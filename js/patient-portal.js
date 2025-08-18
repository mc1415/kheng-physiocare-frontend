// Authentication and dashboard logic for the patient portal
// Mirrors the admin portal's API-based auth flow

const API_BASE_URL = 'https://kheng-physiocare-api.onrender.com';

const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const patientNameSpan = document.getElementById('patient-name-display');

const nextAppointmentContainer = document.getElementById('next-appointment');
const appointmentHistoryContainer = document.getElementById('appointment-history');
const exerciseList = document.getElementById('exercise-list');

loginForm.addEventListener('submit', handleLogin);

// If a patient is already stored, go straight to the dashboard
const storedPatient = localStorage.getItem('currentPatient');
if (storedPatient) {
  try {
    const parsed = JSON.parse(storedPatient);
    loadDashboard(parsed);
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
  } catch (e) {
    console.warn('Failed to parse stored patient data, clearing it.', e);
    localStorage.removeItem('currentPatient');
    loginScreen.style.display = 'block';
  }
} else {
  loginScreen.style.display = 'block';
}

async function handleLogin(event) {
  event.preventDefault();
  loginError.style.display = 'none';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE_URL}/api/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Login failed');
    }

    const patient = result.patient || result.user || result.data;
    localStorage.setItem('currentPatient', JSON.stringify(patient));
    await loadDashboard(patient);
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
  } catch (err) {
    loginError.textContent = err.message;
    loginError.style.display = 'block';
  }
}

async function loadDashboard(patient) {
  patientNameSpan.textContent = patient.fullName || patient.full_name || 'Patient';

  try {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patient.id}`);
    const result = await response.json();
    if (response.ok && result && result.success) {
      const data = result.data;
      renderAppointments(data.appointments || []);
      renderExercises(data.exercises || data.assigned_exercises || []);
    } else {
      renderAppointments([]);
      renderExercises([]);
    }
  } catch (err) {
    console.error('Failed to load patient details:', err);
    renderAppointments([]);
    renderExercises([]);
  }
}

function renderAppointments(appointments) {
  const now = new Date();
  const upcoming = appointments.filter(a => new Date(a.date) >= now);
  const past = appointments.filter(a => new Date(a.date) < now);

  if (upcoming.length > 0) {
    const nextApp = upcoming[0];
    nextAppointmentContainer.innerHTML = `
      <div class="appointment-item-detailed">
        <p><strong>Service:</strong> ${nextApp.service || ''}</p>
        <p><strong>With:</strong> ${nextApp.therapist || ''}</p>
        <p><strong>On:</strong> ${new Date(nextApp.date).toLocaleString()}</p>
      </div>
    `;
  } else {
    nextAppointmentContainer.innerHTML = '<p>You have no upcoming appointments.</p>';
  }

  appointmentHistoryContainer.innerHTML = '';
  if (past.length === 0) {
    appointmentHistoryContainer.innerHTML = '<p>No past appointments.</p>';
    return;
  }

  past.forEach(app => {
    const div = document.createElement('div');
    div.className = 'appointment-item-detailed';
    div.innerHTML = `
      <p><strong>Service:</strong> ${app.service || ''}</p>
      <p><strong>With:</strong> ${app.therapist || ''}</p>
      <p><strong>On:</strong> ${new Date(app.date).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${app.status || ''}</p>
    `;
    appointmentHistoryContainer.appendChild(div);
  });
}

function renderExercises(exercises) {
  exerciseList.innerHTML = '';
  if (!exercises || exercises.length === 0) {
    exerciseList.innerHTML = '<p>No exercises assigned.</p>';
    return;
  }

  exercises.forEach(item => {
    const ex = item.exercises || item;
    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.innerHTML = `
      <h4>${ex.name}</h4>
      <p>${ex.instructions || ''}</p>
      ${ex.video_url ? `<iframe width="100%" height="215" src="${ex.video_url}" title="${ex.name}" frameborder="0" allowfullscreen></iframe>` : ''}
    `;
    exerciseList.appendChild(card);
  });
}

function logout() {
  localStorage.removeItem('currentPatient');
  dashboardScreen.style.display = 'none';
  loginScreen.style.display = 'block';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
}

// Expose logout globally for HTML onclick
window.logout = logout;

