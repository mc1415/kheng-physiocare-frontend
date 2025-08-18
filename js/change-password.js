document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('change-password-form');
  const responseMsg = document.getElementById('responseMsg');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    responseMsg.style.color = '';
    responseMsg.textContent = 'Processing...';
    try {
      const res = await changePassword(
        document.getElementById('email').value.trim(),
        document.getElementById('newPassword').value.trim()
      );
      const msg = res && res.message ? res.message : 'Password changed successfully.';
      responseMsg.style.color = 'green';
      responseMsg.textContent = msg;
    } catch (err) {
      responseMsg.style.color = 'red';
      responseMsg.textContent = err.message;
    }
  });
});
