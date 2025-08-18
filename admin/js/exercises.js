document.addEventListener('DOMContentLoaded', function () {
  const tableBody = document.querySelector('.data-table tbody');
  const addBtn = document.getElementById('addExerciseBtn');
  const toastConfig = { duration: 3000, close: true, gravity: 'top', position: 'right', stopOnFocus: true };

  const storedMsg = localStorage.getItem('exerciseMsg');
  if (storedMsg) {
    Toastify({ ...toastConfig, text: storedMsg, style: { background: 'var(--green-accent)' } }).showToast();
    localStorage.removeItem('exerciseMsg');
  }

  async function loadExercises() {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';
    try {
      const res = await listExercises();
      const exercises = res.data ? res.data : res;
      exercises.sort((a, b) => a.id - b.id);
      render(exercises);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--red-accent);">${err.message}</td></tr>`;
    }
  }

  function render(exercises) {
    tableBody.innerHTML = '';
    if (!exercises || exercises.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No exercises found.</td></tr>';
      return;
    }
    exercises.forEach(ex => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ex.id}</td>
        <td>${ex.title}</td>
        <td>${ex.duration_seconds ?? ''}</td>
        <td><button class="btn-action edit" data-id="${ex.id}" title="Edit"><i class="fa-solid fa-pen"></i></button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      window.location.href = 'exercise-form.html';
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', e => {
      const btn = e.target.closest('button.edit');
      if (!btn) return;
      const id = btn.dataset.id;
      window.location.href = `exercise-form.html?id=${id}`;
    });
  }

  loadExercises();
});
