// admin/js/settings.js
document.addEventListener('DOMContentLoaded', function() {
    const clinicProfileForm = document.getElementById('clinic-profile-form');
    const accountSecurityForm = document.getElementById('account-security-form');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };

    // --- API Helper ---
    async function fetchApi(url, options = {}) { /* ... same as other files ... */ }

    // --- Load Initial Settings ---
    async function loadSettings() {
        const result = await fetchApi('/api/settings');
        if (result && result.success) {
            const settings = result.data;
            document.getElementById('clinic-name').value = settings.clinic_name;
            document.getElementById('clinic-address').value = settings.address;
            document.getElementById('clinic-phone').value = settings.phone_number;
        }
    }

    // --- Event Listeners ---
    if (clinicProfileForm) {
        clinicProfileForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(clinicProfileForm);
            // The names on the form inputs must match the database columns
            const settingsData = {
                clinic_name: formData.get('clinic_name'),
                address: formData.get('address'),
                phone_number: formData.get('phone_number')
            };
            
            const result = await fetchApi('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });

            if (result && result.success) {
                Toastify({...toastConfig, text: "Clinic profile updated!", style: { background: "var(--primary-accent)" } }).showToast();
            }
        });
    }

    if (accountSecurityForm) {
        accountSecurityForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            // This is a simulation, as direct password changes are complex
            const newPassword = document.getElementById('new-password').value;
            if (newPassword.length < 6) {
                Toastify({...toastConfig, text: "Password must be at least 6 characters.", style: { background: "var(--red-accent)" } }).showToast();
                return;
            }
            Toastify({...toastConfig, text: "Password updated successfully (simulation)!", style: { background: "var(--green-accent)" } }).showToast();
            accountSecurityForm.reset();
        });
    }
    
    // --- Initial Load ---
    loadSettings();

    // Safe-paste of fetchApi
    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) { let errorMsg = 'An API error occurred.'; try { const errorResult = await response.json(); errorMsg = errorResult.message || errorMsg; } catch (e) { errorMsg = response.statusText; } throw new Error(errorMsg); }
            if (response.status === 204 || options.method === 'DELETE') return { success: true };
            return response.json();
        } catch (error) {
            console.error(`API Error on ${url}:`, error);
            Toastify({...toastConfig, text: `Error: ${error.message}`, style: { background: "var(--red-accent)" }}).showToast();
            return null;
        }
    }
});