// admin/js/exercises.js

document.addEventListener('DOMContentLoaded', function() {
    const exerciseTableBody = document.querySelector('.data-table tbody');
    const addExerciseBtn = document.getElementById('addExerciseBtn');
    const assignExerciseBtn = document.getElementById('assignExerciseBtn');
    const exerciseModal = document.getElementById('exerciseModal');
    const assignModal = document.getElementById('assignModal');
    const closeExerciseModalBtn = document.getElementById('closeExerciseModalBtn');
    const closeAssignModalBtn = document.getElementById('closeAssignModalBtn');
    const exerciseForm = document.getElementById('exercise-form');
    const assignForm = document.getElementById('assign-form');
    const assignPatientSelect = document.getElementById('assign-patient');
    const assignExerciseSelect = document.getElementById('assign-exercise');

    const toastConfig = { duration: 3000, close: true, gravity: 'top', position: 'right', stopOnFocus: true };

    async function fetchApi(url, options = {}, showToast = true) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'API Error');
            }
            return res.status === 204 ? { success: true } : res.json();
        } catch (err) {
            console.error('API Error:', err);
            if (showToast) {
                Toastify({ ...toastConfig, text: err.message, style: { background: 'var(--red-accent)' } }).showToast();
            }
            return null;
        }
    }

    async function fetchExercises() {
        if (!exerciseTableBody) return;
        exerciseTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';
        const result = await fetchApi(`${API_BASE_URL}/api/exercises`, {}, false);
        if (result && result.success) {
            renderExerciseTable(result.data);
        } else {
            // Fallback sample data when the API is unreachable
            const fallbackExercises = [
                { id: 1, name: 'Sample Stretch', video_url: '' },
                { id: 2, name: 'Sample Strengthening', video_url: '' }
            ];
            renderExerciseTable(fallbackExercises);
        }
    }

    function renderExerciseTable(exercises) {
        exerciseTableBody.innerHTML = '';
        if (!exercises || exercises.length === 0) {
            exerciseTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No exercises found.</td></tr>';
            return;
        }
        exercises.forEach(ex => {
            const row = document.createElement('tr');
            row.dataset.exerciseId = ex.id;
            row.innerHTML = `
                <td>${ex.name}</td>
                <td>${ex.video_url ? `<a href="${ex.video_url}" target="_blank">Link</a>` : ''}</td>
                <td><div class="action-buttons"><button class="btn-action assign" title="Assign"><i class="fa-solid fa-paper-plane"></i></button></div></td>
            `;
            exerciseTableBody.appendChild(row);
        });
    }

    function openExerciseModal() {
        exerciseForm.reset();
        exerciseModal.style.display = 'flex';
    }

    function closeExerciseModal() { exerciseModal.style.display = 'none'; }
    function closeAssignModal() { assignModal.style.display = 'none'; }

    function openAssignModal(selectedExerciseId) {
        assignForm.reset();
        assignModal.style.display = 'flex';
        populatePatients();
        populateExercises(selectedExerciseId);
    }

    async function populatePatients() {
        const result = await fetchApi(`${API_BASE_URL}/api/patients`);
        if (result && result.success) {
            assignPatientSelect.innerHTML = '<option value="">-- Select Patient --</option>';
            result.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.full_name;
                assignPatientSelect.appendChild(opt);
            });
        } else {
            assignPatientSelect.innerHTML = '<option value="">Failed to load patients</option>';
        }
    }

    async function populateExercises(selectedId) {
        const result = await fetchApi(`${API_BASE_URL}/api/exercises`);
        if (result && result.success) {
            assignExerciseSelect.innerHTML = '<option value="">-- Select Exercise --</option>';
            result.data.forEach(ex => {
                const opt = document.createElement('option');
                opt.value = ex.id;
                opt.textContent = ex.name;
                assignExerciseSelect.appendChild(opt);
            });
            if (selectedId) assignExerciseSelect.value = selectedId;
        } else {
            assignExerciseSelect.innerHTML = '<option value="">Failed to load exercises</option>';
        }
    }

    if (addExerciseBtn) addExerciseBtn.addEventListener('click', openExerciseModal);
    if (assignExerciseBtn) assignExerciseBtn.addEventListener('click', () => openAssignModal());
    if (closeExerciseModalBtn) closeExerciseModalBtn.addEventListener('click', closeExerciseModal);
    if (closeAssignModalBtn) closeAssignModalBtn.addEventListener('click', closeAssignModal);
    window.addEventListener('click', e => { if (e.target === exerciseModal) closeExerciseModal(); if (e.target === assignModal) closeAssignModal(); });

    if (exerciseForm) {
        exerciseForm.addEventListener('submit', async e => {
            e.preventDefault();
            const formData = new FormData(exerciseForm);
            const data = Object.fromEntries(formData.entries());
            const result = await fetchApi(`${API_BASE_URL}/api/exercises`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (result) {
                Toastify({ ...toastConfig, text: 'Exercise saved!', style: { background: 'var(--green-accent)' } }).showToast();
                closeExerciseModal();
                fetchExercises();
            }
        });
    }

    if (assignForm) {
        assignForm.addEventListener('submit', async e => {
            e.preventDefault();
            const formData = new FormData(assignForm);
            const data = Object.fromEntries(formData.entries());
            const result = await fetchApi(`${API_BASE_URL}/api/assigned-exercises`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (result) {
                Toastify({ ...toastConfig, text: 'Exercise assigned!', style: { background: 'var(--primary-accent)' } }).showToast();
                closeAssignModal();
            }
        });
    }

    if (exerciseTableBody) {
        exerciseTableBody.addEventListener('click', e => {
            const btn = e.target.closest('button.btn-action');
            if (!btn) return;
            const id = btn.closest('tr').dataset.exerciseId;
            if (btn.classList.contains('assign')) {
                openAssignModal(id);
            }
        });
    }

    fetchExercises();
});
