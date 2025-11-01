Supabase Auth integration: temporary passwords and patient self‑service

Overview
- New patients get an Auth account with a temporary password `KPC@2025`.
- Patients can change their password from the portal (this repo includes the UI and JS that calls your API).
- Your backend (or an Edge Function) holds the Service Role key and performs privileged Auth actions.

Create user with a temporary password (Edge Function)
File: `supabase/functions/create-patient-user/index.ts`
```ts
// deno run --allow-net --allow-env
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }
  try {
    const payload = await req.json();
    const { full_name, email, ...rest } = payload;
    if (!email) return new Response("email required", { status: 400 });

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // Create user with a temporary password (Auth only)
    const TEMP_PASSWORD = "KPC@2025"; // rotate if leaked
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "patient", full_name },
    });
    if (error) return new Response(error.message, { status: 400 });
    const userId = data.user.id;

    return new Response(JSON.stringify({ auth_user_id: userId }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(String(e?.message ?? e), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});
```

Front-end trigger (admin UI)
- This repo now invokes the function after creating a patient (admin/js/patients.js).
- Configure `admin/js/supabase-config.js`:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` — required
  - `SUPABASE_FUNCTION_CREATE_PATIENT` — name of your function
  - `SUPABASE_FUNCTION_URL` — optional direct URL, e.g. `https://<ref>.functions.supabase.co/create-patient-user`
  - `SUPABASE_FUNCTION_MODE` — `invoke` (SDK), `http` (direct), or `auto` (try SDK then HTTP)
- Make sure your function can accept browser calls:
  - If `verify_jwt = true`, the SDK path requires a Supabase-authenticated staff session in the browser.
  - If you don’t have that, either set `verify_jwt = false` for this function and rely on app auth, or proxy the call via your backend.

Deploy with or without JWT verification
- Default (verify JWT): `supabase functions deploy create-patient-user`
- No JWT (browser-only admin, ensure you trust the context):
  `supabase functions deploy create-patient-user --no-verify-jwt`
  You must keep the CORS headers above when calling from the browser.

Patient password change (backend route example)
Your patient portal now posts to `POST /api/patient/change-password` with an app token. Implement the route on your API using the Service Role key:
```ts
// Node/Express example (TypeScript)
import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

router.post("/api/patient/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const patient = req.user!; // populated by your auth middleware
    // 1) Look up the linked auth user id for this patient in your DB
    const authUserId = patient.auth_user_id; // ensure this is loaded in middleware or fetch it

    // Optional: verify currentPassword by attempting a sign-in via anon key
    // Skippable if you trust your app session and only need newPassword

    // 2) Update password using the Admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: newPassword });
    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message ?? "Server error" });
  }
});

export default router;
```

DB constraints and RLS
```sql
alter table public.patients
  add constraint patients_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

alter table public.patients enable row level security;
```

Notes
- Do not expose the Service Role key in the browser.
- Consider rotating the temporary password periodically and forcing first‑login change.
- After a successful password change, log the patient out so they re‑authenticate.

Portal API Edge Function (proxy)
Use this when you want the Patient Portal to call a Supabase Edge Function instead of your backend directly. The function receives a JSON envelope and forwards it to your backend (or you can replace the forwarding with direct DB access if you prefer).

Inputs from the portal (body):
- `path` e.g. `/api/portal/dashboard`, `/api/portal/me`, `/api/assigned-exercises/123/complete`
- `method` e.g. `GET`, `POST`, `PATCH`
- `headers` forwarded as needed (includes `Authorization: Bearer <patientToken>`)
- `body` optional; if present it is forwarded.

Edge Function code (TypeScript, Deno): `supabase/functions/portal-api/index.ts`
```ts
import { serve } from "https://deno.land/std/http/server.ts";

function cors(headers: HeadersInit = {}) {
  return {
    ...headers,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  };
}

const BACKEND_BASE_URL = Deno.env.get("BACKEND_BASE_URL")!; // e.g. https://kheng-physiocare-api.onrender.com
const ALLOWED_PREFIXES = [
  "/api/portal/",
  "/api/assigned-exercises/",
  "/api/patient/change-password",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  try {
    const { path, method = "GET", headers = {}, body } = await req.json();
    if (typeof path !== "string" || !ALLOWED_PREFIXES.some(p => path.startsWith(p))) {
      return new Response(JSON.stringify({ message: "Path not allowed" }), { status: 400, headers: cors({"Content-Type":"application/json"}) });
    }

    const fwdHeaders = new Headers();
    // Forward only safe headers
    const whitelist = ["authorization", "content-type"];
    Object.entries(headers as Record<string,string>).forEach(([k,v]) => {
      if (whitelist.includes(k.toLowerCase())) fwdHeaders.set(k, v);
    });

    const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
      method,
      headers: fwdHeaders,
      body: body ?? undefined,
    });

    const text = await res.text();
    // pass through JSON or text
    const contentType = res.headers.get("content-type") || (text.startsWith("{") ? "application/json" : "text/plain");
    return new Response(text, { status: res.status, headers: cors({"Content-Type": contentType}) });
  } catch (e) {
    return new Response(JSON.stringify({ message: e?.message ?? "proxy error" }), { status: 500, headers: cors({"Content-Type":"application/json"}) });
  }
});
```

Deploy and configure
- `supabase functions deploy portal-api --no-verify-jwt` (or omit flag and use SDK invoke with JWT verification)
- `supabase secrets set BACKEND_BASE_URL=https://kheng-physiocare-api.onrender.com`

Front-end configuration
- In `admin/js/supabase-config.js` you can set:
  - `window.PORTAL_FUNCTION_NAME = 'portal-api'` (SDK `invoke`)
  - or `window.PORTAL_FUNCTION_URL = 'https://<project-ref>.functions.supabase.co/portal-api'` (direct HTTP)
  - `window.SUPABASE_FUNCTION_MODE = 'invoke' | 'http' | 'auto'`

Security notes
- The proxy limits requests to specific prefixes. Extend `ALLOWED_PREFIXES` as needed.
- Keep your backend auth exactly as-is (verifies `Authorization: Bearer <patientToken>`). The function merely forwards requests.
- Add rate limiting in your backend if needed.

Admin API Edge Function (DB CRUD, no backend)
Use this to move Admin CRUD off your backend entirely. It performs reads/writes against your Supabase DB using the Service Role key. You should prefer `verify_jwt=true` and require staff to sign into Supabase; for a quick no‑JWT setup, you can accept an `adminKey` in the body that matches a secret (note: putting a shared key in the browser is not fully secure — migrate to verified staff auth when possible).

File: `supabase/functions/admin-api/index.ts`
```ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function cors(headers: HeadersInit = {}) {
  return {
    ...headers,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };
}

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminSecret = Deno.env.get("ADMIN_FUNCTION_KEY"); // optional

const supabase = createClient(url, serviceKey);

async function handlePatients(req: Request, path: string, method: string, body: any) {
  const id = path.match(/^\/api\/patients\/(\d+)/)?.[1];
  if (method === 'GET' && !id) {
    const { data, error } = await supabase.from('patients').select('*').order('id', { ascending: false }).limit(200);
    if (error) throw error; return { success: true, data };
  }
  if (method === 'GET' && id) {
    const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
    if (error) throw error; return { success: true, data };
  }
  if (method === 'POST') {
    const { data, error } = await supabase.from('patients').insert(body).select('*').single();
    if (error) throw error; return { success: true, data };
  }
  if (method === 'PATCH' && id) {
    const { data, error } = await supabase.from('patients').update(body).eq('id', id).select('*').single();
    if (error) throw error; return { success: true, data };
  }
  if (method === 'DELETE' && id) {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) throw error; return { success: true };
  }
  return { success: false, message: 'Unsupported patients route' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  try {
    const { path, method = 'GET', body, adminKey } = await req.json();

    // Basic auth: either verify JWT (if you deploy with verify_jwt=true) or require a shared key
    if (adminSecret && adminKey !== adminSecret) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: cors({ 'Content-Type': 'application/json' }) });
    }

    if (path.startsWith('/api/patients')) {
      const json = await handlePatients(req, path, method, body ? (typeof body === 'string' ? JSON.parse(body) : body) : null);
      return new Response(JSON.stringify(json), { headers: cors({ 'Content-Type': 'application/json' }) });
    }

    return new Response(JSON.stringify({ message: 'Route not implemented' }), { status: 404, headers: cors({ 'Content-Type': 'application/json' }) });
  } catch (e) {
    return new Response(JSON.stringify({ message: e?.message ?? 'admin-api error' }), { status: 500, headers: cors({ 'Content-Type': 'application/json' }) });
  }
});
```

Deploy
- `supabase functions deploy admin-api --no-verify-jwt` (or omit flag and use JWT verification for staff)
- Optional: `supabase secrets set ADMIN_FUNCTION_KEY=<a-strong-random-string>` and set the same value in your admin runtime config (browser includes it — not fully secure; migrate to verified staff soon).

Frontend integration (already wired)
- The admin app now calls `ADMIN_FUNCTION_NAME/URL` for `/api/patients` CRUD via `admin/js/patients.js`.
- Configure in `admin/js/supabase-config.js`:
  - `ADMIN_FUNCTION_NAME = 'admin-api'` (or set `ADMIN_FUNCTION_URL`)
  - `ADMIN_FUNCTION_MODE = 'invoke' | 'http' | 'auto'`
  - If you set `ADMIN_FUNCTION_KEY` in secrets, also set `window.ADMIN_FUNCTION_KEY` (quick setup only).
