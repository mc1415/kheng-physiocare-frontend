document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('exercise-form');
  const titleEl = document.getElementById('title');
  const descriptionEl = document.getElementById('description');
  const videoEl = document.getElementById('video_path');
  const durationEl = document.getElementById('duration_seconds');
  const formTitle = document.getElementById('form-title');
  const toastConfig = { duration: 3000, close: true, gravity: 'top', position: 'right', stopOnFocus: true };

  const params = new URLSearchParams(window.location.search);
  const exerciseId = params.get('id');

  if (exerciseId) {
    formTitle.textContent = 'Edit Exercise';
    loadExercise(exerciseId);
  }

  async function loadExercise(id) {
    try {
      const res = await getExercise(id);
      const ex = res.data ? res.data : res;
      titleEl.value = ex.title || '';
      descriptionEl.value = ex.description || '';
      videoEl.value = ex.video_path || '';
      durationEl.value = ex.duration_seconds || '';
    } catch (err) {
      Toastify({ ...toastConfig, text: err.message, style: { background: 'var(--red-accent)' } }).showToast();
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      title: titleEl.value.trim(),
      description: descriptionEl.value.trim(),
      video_path: videoEl.value.trim(),
      duration_seconds: parseInt(durationEl.value, 10)
    };
    try {
      if (exerciseId) {
        await updateExercise(exerciseId, payload);
        localStorage.setItem('exerciseMsg', 'Exercise updated successfully');
      } else {
        await createExercise(payload);
        localStorage.setItem('exerciseMsg', 'Exercise created successfully');
      }
      window.location.href = 'exercises.html';
    } catch (err) {
      Toastify({ ...toastConfig, text: err.message, style: { background: 'var(--red-accent)' } }).showToast();
    }
  });
});
