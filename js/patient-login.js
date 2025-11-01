document.addEventListener('DOMContentLoaded', async () => {
    // If already signed in with Supabase, go to portal
    try {
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session) {
                window.location.href = 'patient-portal.html';
                return;
            }
        }
    } catch {}

    const loginForm = document.getElementById('patient-login-form');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        loginButton.classList.add('loading');
        loginButton.disabled = true;

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            if (!window.supabaseClient) throw new Error('Auth not initialized');
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;

            // Do not set display name from Supabase metadata.
            // The portal will fetch the real name from patients table via Edge Function.
            window.location.href = 'patient-portal.html';
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Login failed. Please check your credentials.';
        } finally {
            loginButton.classList.remove('loading');
            loginButton.disabled = false;
        }
    });
});
