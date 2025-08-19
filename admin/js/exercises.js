document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.querySelector('.data-table tbody');
    const addBtn = document.getElementById('addExerciseBtn');
    const modal = document.getElementById('exerciseModal');
    const closeModalBtn = document.getElementById('closeExerciseModalBtn');
    const form = document.getElementById('exercise-form');
    const modalTitle = document.getElementById('exerciseModalTitle');
    const idField = document.getElementById('exerciseIdField');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) { let e = 'API error.'; try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText } throw new Error(e) }
            return options.method === 'DELETE' || response.status === 204 ? { success: true } : response.json();
        } catch (error) { Toastify({ ...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" } }).showToast(); return null; }
    }

    async function fetchAndRender() {
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;
        const result = await fetchApi(`${API_BASE_URL}/api/exercises`);
        if (result && result.success) renderTable(result.data);
    }

    function renderTable(exercises) {
        tableBody.innerHTML = '';
        if (exercises.length === 0) { tableBody.innerHTML = `<tr><td colspan="4">No exercises found.</td></tr>`; return; }
        exercises.forEach(ex => {
            const row = document.createElement('tr');
            row.dataset.exerciseId = ex.id;
            row.innerHTML = `
                <td>${ex.title}</td>
                <td>${ex.description || 'N/A'}</td>
                <td>${ex.video_path ? `<a href="${ex.video_path}" target="_blank">View Video</a>` : 'No Video'}</td>
                <td><div class="action-buttons">
                    <button class="btn-action edit"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-action delete"><i class="fa-solid fa-trash-can"></i></button>
                </div></td>
            `;
            tableBody.appendChild(row);
        });
    }

    function openModalForAdd() {
        modalTitle.textContent = 'Add New Exercise';
        form.reset();
        idField.value = '';
        modal.style.display = 'flex';
    }

    function openModalForEdit(exercise) {
        modalTitle.textContent = 'Edit Exercise';
        form.reset();
        idField.value = exercise.id;
        form.querySelector('[name="title"]').value = exercise.title;
        form.querySelector('[name="description"]').value = exercise.description;
        form.querySelector('[name="video_path"]').value = exercise.video_path;
        modal.style.display = 'flex';
    }

    addBtn.addEventListener('click', openModalForAdd);
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', e => { if (e.target == modal) modal.style.display = 'none' });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = idField.value;
        const isEditing = !!id;
        const data = {
            title: form.querySelector('[name="title"]').value,
            description: form.querySelector('[name="description"]').value,
            video_path: form.querySelector('[name="video_path"]').value,
        };
        const url = isEditing ? `${API_BASE_URL}/api/exercises/${id}` : `${API_BASE_URL}/api/exercises`;
        const method = isEditing ? 'PATCH' : 'POST';
        const result = await fetchApi(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (result) {
            Toastify({ ...toastConfig, text: `Exercise ${isEditing ? 'updated' : 'created'}!`, style: { background: "var(--green-accent)" } }).showToast();
            modal.style.display = 'none';
            fetchAndRender();
        }
    });

    tableBody.addEventListener('click', async function(e) {
        const button = e.target.closest('button.btn-action');
        if (!button) return;
        const row = button.closest('tr');
        const id = row.dataset.exerciseId;
        
        if (button.classList.contains('edit')) {
            const result = await fetchApi(`${API_BASE_URL}/api/exercises`);
            const exercise = result.data.find(ex => ex.id == id);
            if(exercise) openModalForEdit(exercise);
        } else if (button.classList.contains('delete')) {
            if (confirm('Are you sure you want to delete this exercise? This cannot be undone.')) {
                const result = await fetchApi(`${API_BASE_URL}/api/exercises/${id}`, { method: 'DELETE' });
                if (result) {
                    Toastify({ ...toastConfig, text: "Exercise deleted.", style: { background: "var(--red-accent)" } }).showToast();
                    fetchAndRender();
                }
            }
        }
    });

    fetchAndRender();
});