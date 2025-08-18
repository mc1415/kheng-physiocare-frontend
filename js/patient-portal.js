// Handles Supabase Auth sign-in and patient data retrieval for the portal
// Use deployed Supabase credentials, falling back to defaults when globals
// contain placeholders or are undefined
const DEFAULT_SUPABASE_URL = 'https://trdndjmgcfdflxmrwjwnf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRydndqbWdjZmRmbHhtcndqd25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MjQ1MTEsImV4cCI6MjA2NTEwMDUxMX0.wN261h6_DmYTEskxsk5RoNkMeecFWuGRpo6BI7rdbCc';

const AUTH_NETWORK_ERROR_MESSAGE = 'Unable to contact authentication service. Please try again later.';
function resolveSupabaseValue(value, placeholder, fallback) {
  return (typeof value === 'string' && value.trim() && !value.includes(placeholder))
    ? value
    : fallback;
}

const SUPABASE_URL = resolveSupabaseValue(window.SUPABASE_URL, 'YOUR_SUPABASE_PROJECT_URL', DEFAULT_SUPABASE_URL);
const SUPABASE_ANON_KEY = resolveSupabaseValue(window.SUPABASE_ANON_KEY, 'YOUR_SUPABASE_ANON_KEY', DEFAULT_SUPABASE_ANON_KEY);
const { createClient } = supabase;

if (SUPABASE_URL === DEFAULT_SUPABASE_URL && SUPABASE_ANON_KEY === DEFAULT_SUPABASE_ANON_KEY) {
  console.warn('Using default Supabase credentials.');
}

// Disable session persistence to avoid localStorage requirement in some browsers
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const patientNameSpan = document.getElementById('patient-name-display');

const nextAppointmentContainer = document.getElementById('next-appointment');
const appointmentHistoryContainer = document.getElementById('appointment-history');
const exerciseList = document.getElementById('exercise-list');

loginForm.addEventListener('submit', handleLogin);

// On load, check if a session exists
(async () => {
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (session) {
      await loadDashboard();
    } else {
      loginScreen.style.display = 'block';
    }
  } catch (err) {
    console.error('Session check failed:', err);
    loginScreen.style.display = 'block';
    loginError.textContent = AUTH_NETWORK_ERROR_MESSAGE;
    loginError.style.display = 'block';
  }
})();

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    loginError.style.display = 'none';
    await loadDashboard();
  } catch (err) {
    const isNetworkError = err.message && err.message.toLowerCase().includes('network');
    const message = err instanceof SyntaxError
      ? 'Received invalid response from authentication service.'
      : isNetworkError
        ? AUTH_NETWORK_ERROR_MESSAGE
        : err.message || 'Unexpected error occurred.';
    loginError.textContent = message;
    loginError.style.display = 'block';
  }
}

async function loadDashboard() {
  loginScreen.style.display = 'none';
  dashboardScreen.style.display = 'block';

  try {
    const { data: { user } } = await client.auth.getUser();
    const { data: patient, error } = await client
      .from('patients')
      .select('id, full_name')
      .eq('auth_user_id', user.id)
      .single();
    if (error) throw error;
    patientNameSpan.textContent = patient?.full_name || 'Patient';
    await loadAppointments(patient.id);
    await loadExercises(patient.id);
  } catch (err) {
    console.error('Failed to load patient profile:', err);
    patientNameSpan.textContent = 'Patient';
    await loadAppointments();
    await loadExercises();
  }
}

async function loadAppointments(patientId) {
  const query = client.from('appointments')
    .select('id, service, therapist, date, status')
    .order('date');
  if (patientId) query.eq('patient_id', patientId);
  const { data: appointments, error } = await query;
  if (error) return;

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

async function loadExercises(patientId) {
  const query = client.from('assigned_exercises')
    .select('id, exercises(name, instructions, video_url)');
  if (patientId) query.eq('patient_id', patientId);
  const { data: assigned, error } = await query;
  if (error) return;

  exerciseList.innerHTML = '';
  if (!assigned || assigned.length === 0) {
    exerciseList.innerHTML = '<p>No exercises assigned.</p>';
    return;
  }
  assigned.forEach(item => {
    const ex = item.exercises;
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

async function logout() {
  await client.auth.signOut();
  dashboardScreen.style.display = 'none';
  loginScreen.style.display = 'block';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
}

// Expose logout globally for HTML onclick
window.logout = logout;
