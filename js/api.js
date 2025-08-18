const BASE_URL = 'https://kheng-physiocare-api.onrender.com';

async function apiRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // ignore json parse errors
  }
  if (!res.ok) {
    const msg = data && (data.message || data.error) ? (data.message || data.error) : 'Request failed';
    throw new Error(msg);
  }
  return data;
}

async function listExercises() {
  return apiRequest('/api/exercises');
}

async function getExercise(id) {
  return apiRequest(`/api/exercises/${id}`);
}

async function createExercise(payload) {
  return apiRequest('/api/exercises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function updateExercise(id, payload) {
  return apiRequest(`/api/exercises/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function changePassword(email, newPassword) {
  return apiRequest('/api/user/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword })
  });
}

