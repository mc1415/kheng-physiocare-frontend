const API_BASE_URL = 'http://localhost:3000';

// admin/js/global.js
document.addEventListener('DOMContentLoaded', function() {
    const userProfile = document.getElementById('user-profile-container');
    if (!userProfile) return; // Only run if the element exists

    // Try to get user data from localStorage
    const userJSON = localStorage.getItem('currentUser');
    if (userJSON) {
        const user = JSON.parse(userJSON);

        // Update the avatar and add a dropdown
        userProfile.innerHTML = `
            <img src="../images/srinleangkheng.jpg" alt="${user.fullName}" id="user-avatar">
            <div class="profile-dropdown" id="profile-dropdown">
                <div class="dropdown-header">
                    <strong>${user.fullName}</strong>
                    <span>${user.role}</span>
                </div>
                <a href="settings.html" class="dropdown-item">
                    <i class="fa-solid fa-gear"></i> Settings
                </a>
                <a href="#" class="dropdown-item" id="logout-btn">
                    <i class="fa-solid fa-right-from-bracket"></i> Logout
                </a>
            </div>
        `;

        // Add event listeners for the new elements
        const avatar = document.getElementById('user-avatar');
        const dropdown = document.getElementById('profile-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        avatar.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the window click from closing it immediately
            dropdown.classList.toggle('active');
        });

        // Close dropdown if clicked outside
        window.addEventListener('click', () => {
            if (dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        });

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser'); // Clear user data
            window.location.href = 'index.html'; // Redirect to login
        });

    } else {
        // If no user is logged in, maybe show a default or hide it
        userProfile.innerHTML = `<a href="index.html">Login</a>`;
    }
});