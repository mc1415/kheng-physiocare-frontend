document.addEventListener('DOMContentLoaded', function () {
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const header = document.querySelector('.header');

    // Safely handle the mobile navigation toggle if it exists on the page
    if (mobileNavToggle && header) {
        mobileNavToggle.addEventListener('click', function () {
            header.classList.toggle('nav-open');
        });
    }

    // Add 'active' class to current page's nav link
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });

    // Trigger hero animation once the DOM has loaded
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        // setTimeout(() => {
        heroSection.classList.add('loaded');
        // }, 100);
    }
});