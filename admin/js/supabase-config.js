// admin/js/supabase-config.js
// Fill these with your Supabase project values.
// NOTE: These are safe to expose in the browser (anon key only).

// Example: 'https://abcdxyz.supabase.co'
const SUPABASE_URL = 'https://trvwjmgcfdflxmrwjwnf.supabase.co';
// Example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRydndqbWdjZmRmbHhtcndqd25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MjQ1MTEsImV4cCI6MjA2NTEwMDUxMX0.wN261h6_DmYTEskxsk5RoNkMeecFWuGRpo6BI7rdbCc';

// Edge Function name that creates an Auth user (and optionally inserts/updates patient)
const SUPABASE_FUNCTION_CREATE_PATIENT = 'create-patient-user';

// Optional: call your Edge Function directly by URL (useful if verify_jwt=false)
// Example: 'https://<project-ref>.functions.supabase.co/create-patient-user'
const SUPABASE_FUNCTION_URL = 'https://trvwjmgcfdflxmrwjwnf.supabase.co/functions/v1/create-patient-user';

// Mode: 'invoke' (supabase-js), 'http' (direct fetch using anon key), or 'auto' to try invoke then http
const SUPABASE_FUNCTION_MODE = 'invoke';

// Expose to window so other scripts can read them reliably
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.SUPABASE_FUNCTION_CREATE_PATIENT = SUPABASE_FUNCTION_CREATE_PATIENT;
window.SUPABASE_FUNCTION_URL = SUPABASE_FUNCTION_URL;
window.SUPABASE_FUNCTION_MODE = SUPABASE_FUNCTION_MODE;

// Edge Function to delete an Auth user when a patient is deleted (name/url optional but recommended)
const SUPABASE_FUNCTION_DELETE_PATIENT = 'delete-patient-user';
const SUPABASE_FUNCTION_DELETE_URL = 'https://trvwjmgcfdflxmrwjwnf.supabase.co/functions/v1/delete-patient-user';
window.SUPABASE_FUNCTION_DELETE_PATIENT = SUPABASE_FUNCTION_DELETE_PATIENT;
window.SUPABASE_FUNCTION_DELETE_URL = SUPABASE_FUNCTION_DELETE_URL;

// Temporary password used for new patient accounts (must match Edge Function)
window.TEMP_PATIENT_PASSWORD = 'KPC@2025';

// Supabase Storage bucket to store patient avatars
window.AVATARS_BUCKET = 'avatars';

// Portal API Edge Function (for patient-portal.js)
// The function should accept a JSON body: { path, method, headers, body }
// and respond with your API JSON. Set URL if calling via HTTP.
window.PORTAL_FUNCTION_NAME = 'portal-api';
window.PORTAL_FUNCTION_URL = window.PORTAL_FUNCTION_URL || '';

// Note: Admin pages use your backend for CRUD.
// Only keep Supabase client for Auth user creation + avatar upload.
