const translations = {
  en: {
    adminPortal: 'Admin Portal',
    signInPrompt: 'Please sign in to continue',
    emailAddress: 'Email Address',
    password: 'Password',
    signIn: 'Sign In',
    invalidCredentials: 'Invalid credentials. Please try again.',
    dashboard: 'Dashboard',
    appointments: 'Appointments',
    patients: 'Patients',
    billing: 'Billing',
    exercises: 'Exercises',
    inventory: 'Inventory',
    staff: 'Staff',
    settings: 'Settings',
    logout: 'Logout',
    searchPlaceholder: 'Search...',
    generalReport: 'General Report',
    consultations: 'Consultations',
    last30Days: 'Last 30 Days',
    todaysRevenue: "TODAY'S REVENUE",
    appointmentsToday: 'APPOINTMENTS TODAY',
    newPatientsToday: 'NEW PATIENTS TODAY',
    cancellationsToday: 'CANCELLATIONS TODAY',
    welcome: 'Welcome',
    yourExercisePlan: 'Your Exercise Plan',
    appointmentHistory: 'Appointment History',
    clinicInformation: 'Clinic Information',
    noAppointments: 'You have no upcoming appointments.',
    nextAppointment: 'Next Appointment',
    at: 'at',
    with: 'with',
    noExercises: 'You have no exercises assigned at the moment.',
    markAsDone: 'Mark as Done',
    completedToday: 'Completed Today!',
    saving: 'Saving...',
    noPastAppointments: 'No past appointments found.',
    loading: 'Loading...',
    newAppointment: 'New Appointment',
    saveAppointment: 'Save Appointment',
    delete: 'Delete',
    createInvoice: 'Create New Invoice',
    addExercise: 'Add New Exercise',
    allExercises: 'All Exercises',
    addProduct: 'Add New Product',
    allProducts: 'All Products',
    addStaff: 'Add New Staff',
    allStaff: 'All Staff Members',
    addPatient: 'Add New Patient',
    allPatients: 'All Patients',
    backToPatients: 'Back to All Patients',
    clinicalNotes: 'Clinical Notes'
  },
  km: {
    adminPortal: 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល',
    signInPrompt: 'សូមចូលគណនីដើម្បីបន្ត',
    emailAddress: 'អាសយដ្ឋាន​អ៊ីម៉ែល',
    password: 'ពាក្យសម្ងាត់',
    signIn: 'ចូល',
    invalidCredentials: 'ព័ត៌មានសម្គាល់ខ្លួនមិនត្រឹមត្រូវ សូមព្យាយាមម្តងទៀត',
    dashboard: 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល',
    appointments: 'ការណាត់ជួប',
    patients: 'អ្នកជំងឺ',
    billing: 'វិក្កយបត្រ',
    exercises: 'លំហាត់ប្រាណ',
    inventory: 'ស្តុកទំនិញ',
    staff: 'បុគ្គលិក',
    settings: 'ការកំណត់',
    logout: 'ចាកចេញ',
    searchPlaceholder: 'ស្វែងរក...',
    generalReport: 'របាយការណ៍ទូទៅ',
    consultations: 'ការពិគ្រោះយោបល់',
    last30Days: '៣០ ថ្ងៃចុងក្រោយ',
    todaysRevenue: 'ចំណូលថ្ងៃនេះ',
    appointmentsToday: 'ការណាត់ជួបថ្ងៃនេះ',
    newPatientsToday: 'អ្នកជំងឺថ្មីថ្ងៃនេះ',
    cancellationsToday: 'ការលុបចោលថ្ងៃនេះ',
    welcome: 'សូមស្វាគមន៍',
    yourExercisePlan: 'ផែនការហាត់ប្រាណ​របស់អ្នក',
    appointmentHistory: 'ប្រវត្តិនៃការណាត់ជួប',
    clinicInformation: 'ព័ត៌មានគ្លីនិក',
    noAppointments: 'អ្នកមិនមានការណាត់ជួបពេលខាងមុខទេ',
    nextAppointment: 'ការណាត់ជួបបន្ទាប់',
    at: 'នៅ',
    with: 'ជាមួយ',
    noExercises: 'អ្នកមិនមានលំហាត់ប្រាណដែលបានកំណត់ទេ',
    markAsDone: 'សម្គាល់ថាបានធ្វើរួច',
    completedToday: 'បានបញ្ចប់ថ្ងៃនេះ',
    saving: 'កំពុងរក្សាទុក...',
    noPastAppointments: 'ប្រវត្តិណាត់ជួបមិនមានទេ',
    loading: 'កំពុងដំណើរការ',
    newAppointment: 'ការណាត់ជួបថ្មី',
    saveAppointment: 'រក្សាទុកការណាត់ជួប',
    delete: 'លុប',
    createInvoice: 'បង្កើតវិក្កយបត្រថ្មី',
    addExercise: 'បន្ថែមលំហាត់ប្រាណថ្មី',
    allExercises: 'លំហាត់ប្រាណទាំងអស់',
    addProduct: 'បន្ថែមផលិតផលថ្មី',
    allProducts: 'ផលិតផលទាំងអស់',
    addStaff: 'បន្ថែមបុគ្គលិកថ្មី',
    allStaff: 'បុគ្គលិកទាំងអស់',
    addPatient: 'បន្ថែមអ្នកជំងឺថ្មី',
    allPatients: 'អ្នកជំងឺទាំងអស់',
    backToPatients: 'ត្រឡប់ទៅអ្នកជំងឺទាំងអស់',
    clinicalNotes: 'កំណត់ត្រាគ្លីនិក'
  }
};

function t(key) {
  const lang = localStorage.getItem('lang') || 'en';
  return translations[lang][key] || translations['en'][key] || key;
}

function translatePage() {
  const lang = localStorage.getItem('lang') || 'en';
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea') {
      el.value = translation;
    } else {
      el.textContent = translation;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  const selector = document.getElementById('language-select');
  if (selector) selector.value = lang;
}

function setLanguage(lang) {
  localStorage.setItem('lang', lang);
  translatePage();
}

document.addEventListener('DOMContentLoaded', translatePage);

window.setLanguage = setLanguage;
window.translatePage = translatePage;
window.t = t;
