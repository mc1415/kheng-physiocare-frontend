// admin/js/supabase-init.js
(function () {
  try {
    if (typeof window.supabase === 'undefined') {
      console.warn('Supabase SDK not loaded. Edge Functions will not be invoked.');
      window.supabaseClient = null;
      return;
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      console.warn('Supabase URL/Anon key missing. Set them in admin/js/supabase-config.js');
      window.supabaseClient = null;
      return;
    }
    // Use a fresh, non-persisted client so we don't pick up patient portal sessions
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (e) {
    console.error('Failed to init Supabase client:', e);
    window.supabaseClient = null;
  }
})();
