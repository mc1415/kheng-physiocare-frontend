document.addEventListener('DOMContentLoaded', () => {
    // If user is already logged in, redirect them to the portal
    if (localStorage.getItem('patientToken')) {
        window.location.href = 'patient-portal.html';
    }

    const loginForm = document.getElementById('patient-login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/patient/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                // Store the token and user info
                localStorage.setItem('patientToken', result.token);
                localStorage.setItem('patientName', result.user.fullName);
                // Redirect to the portal
                window.location.href = 'patient-portal.html';
            } else {
                errorMessage.textContent = result.message || 'Login failed. Please check your credentials.';
            }
        } catch (error) {
            console.error('Login request failed:', error);
            errorMessage.textContent = 'An error occurred. Please try again later.';
        }
    });
});
