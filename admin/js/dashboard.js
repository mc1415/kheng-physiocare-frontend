// admin/js/dashboard.js (Final Version with Dynamic Trends)

document.addEventListener('DOMContentLoaded', function() {

    // --- Helper function to update a single stat card with its trend ---
    function updateStatCard(elementId, value, trendData, isCurrency = false, isPercentage = false) {
        const el = document.getElementById(elementId);
        if (el) {
            // Update the main value
            if (isCurrency) {
                el.textContent = `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else {
                el.textContent = value;
            }

            // Find the sibling trend element and update it
            const trendEl = el.nextElementSibling;
            if (trendEl && trendEl.classList.contains('report-trend')) {
                trendEl.classList.remove('positive', 'negative', 'neutral');
                
                if (trendData > 0) {
                    trendEl.textContent = `+${trendData}${isPercentage ? '%' : ''}`;
                    trendEl.classList.add('positive');
                } else if (trendData < 0) {
                    // No need for a '-' sign as the number is already negative
                    trendEl.textContent = `${trendData}${isPercentage ? '%' : ''}`;
                    trendEl.classList.add('negative');
                } else {
                    trendEl.textContent = `-`;
                    trendEl.classList.add('neutral');
                }
            }
        } else {
            console.warn(`Dashboard JS: Element with ID "${elementId}" not found.`);
        }
    }

    // --- Helper function to render the schedule table ---
    function renderTodaysSchedule(schedule) {
        const scheduleBody = document.querySelector('.schedule-table tbody');
        if (!scheduleBody) return;

        scheduleBody.innerHTML = '';
        if (schedule.length === 0) {
            scheduleBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No appointments scheduled for today.</td></tr>';
            return;
        }

        schedule.forEach(app => {
            const row = document.createElement('tr');
            const startTime = new Date(app.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
            const statusClass = (app.status || '').toLowerCase();
            const [patientName, service] = (app.title || '').split(' - ');

            row.innerHTML = `
                <td>${startTime}</td>
                <td>${patientName || app.title || 'N/A'}</td>
                <td>${app.staff ? app.staff.full_name : 'Unassigned'}</td>
                <td>${service || 'N/A'}</td>
                <td><span class="status-chip ${statusClass}">${app.status}</span></td>
            `;
            scheduleBody.appendChild(row);
        });
    }

    // --- Chart.js Initialization ---
    function initializeCharts(ageDataFromApi = [0, 0, 0, 0], weeklyAppointments = []) {
        const weeklyLabels = weeklyAppointments.map(d => new Date(d.appointment_date).toLocaleDateString('en-US', { weekday: 'short' }));
        const weeklyCounts = weeklyAppointments.map(d => d.appointment_count);

        const appointmentsChartData = {
            labels: weeklyLabels,
            datasets: [{
                label: 'Appointments',
                data: weeklyCounts,
                backgroundColor: 'rgba(56, 189, 248, 0.5)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        };

        const ctxAppointments = document.getElementById('consultationsChart')?.getContext('2d');
        if (ctxAppointments) {
            new Chart(ctxAppointments, {
                type: 'bar',
                data: appointmentsChartData,
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'var(--border-color)' }, ticks: { color: 'var(--text-secondary)', stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: 'var(--text-secondary)' } } } }
            });
        }
        
        const ageData = {
            labels: ['< 18', '18-30', '31-50', '50+'],
            datasets: [{
                label: 'Patients by Age',
                data: ageDataFromApi,
                backgroundColor: ['rgba(52, 211, 153, 0.8)', 'rgba(56, 189, 248, 0.8)', 'rgba(248, 113, 113, 0.8)', 'rgba(168, 85, 247, 0.8)'],
                borderColor: 'var(--card-bg)', borderWidth: 2
            }]
        };
        
        const ctxAge = document.getElementById('ageChart')?.getContext('2d');
        if (ctxAge) {
            new Chart(ctxAge, {
                type: 'doughnut',
                data: ageData,
                options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-secondary)' } } } }
            });
        }
    }

    // --- Main function to fetch all data and update the page ---
    async function loadDashboard() {
        try {
            const response = await fetch('/api/dashboard/advanced-stats');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Failed to load dashboard data' }));
                throw new Error(errData.message);
            }
            const result = await response.json();

            if (result.success && result.data) {
                const stats = result.data;
                updateStatCard('stat-total-revenue', stats.todaysRevenue, stats.trends.revenue, true, true); // isCurrency=true, isPercentage=true
                updateStatCard('stat-appointments-today', `${stats.appointmentsToday} / 20`, stats.trends.appointments);
                updateStatCard('stat-new-patients', stats.newPatientsToday, stats.trends.newPatients);
                updateStatCard('stat-cancellations', stats.cancellationsToday, 0); // No trend for cancellations
                renderTodaysSchedule(stats.todaysSchedule);
                initializeCharts(stats.ageDemographics, stats.weeklyAppointments);
            } else {
                throw new Error(result.message || 'API returned success:false');
            }
        } catch (error) {
            console.error("Error loading dashboard:", error);
            updateStatCard('stat-total-revenue', 'Error', 0, true);
            updateStatCard('stat-appointments-today', 'Error', 0);
            updateStatCard('stat-new-patients', 'Error', 0);
            updateStatCard('stat-cancellations', 'Error', 0);
        }
    }

    // --- Initial Page Load ---
    loadDashboard();
});