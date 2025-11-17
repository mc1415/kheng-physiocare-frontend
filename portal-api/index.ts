// deno run --allow-net --allow-env
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function cors(headers = {}) {
  return {
    ...headers,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS"
  };
}
const URL = Deno.env.get("SUPABASE_URL");
const ANON = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// RLS-scoped client using caller's JWT
function userClient(req) {
  return createClient(URL, ANON, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? ""
      }
    }
  });
}
// Admin client for privileged operations (password change)
const admin = createClient(URL, SERVICE);
async function getAuthedPatient(req) {
  const supabase = userClient(req);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: patient, error } = await supabase.from("patients").select("id, full_name, email, avatar_url, phone_number, date_of_birth, gender").eq("auth_user_id", auth.user.id).single();
  if (error) return null;
  return {
    authUser: auth.user,
    patient
  };
}
async function me(req) {
  const ctx = await getAuthedPatient(req);
  if (!ctx) return new Response(JSON.stringify({
    success: false,
    message: "Unauthorized"
  }), {
    status: 401,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  return new Response(JSON.stringify({
    success: true,
    data: ctx.patient
  }), {
    headers: cors({
      "Content-Type": "application/json"
    })
  });
}
async function dashboard(req) {
  const supabase = userClient(req);
  const ctx = await getAuthedPatient(req);
  if (!ctx) return new Response(JSON.stringify({
    success: false,
    message: "Unauthorized"
  }), {
    status: 401,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  const patientId = ctx.patient.id;
  const nowIso = new Date().toISOString();
  // Next appointment
  const { data: nextAppointment } = await supabase.from("appointments").select("id, title, status, start_time, end_time, staff_id, staff:staff_id(full_name)").eq("patient_id", patientId).gt("start_time", nowIso).neq("status", "cancelled").order("start_time", {
    ascending: true
  }).limit(1).maybeSingle();
  // Assigned exercises
  const { data: exercises } = await supabase.from("assigned_exercises").select(`
      id, notes, completed_dates,
      exercises:exercise_id ( id, title, description, video_path )
    `).eq("patient_id", patientId).order("id", {
    ascending: true
  });
  // Appointment history
  const { data: appointmentHistory } = await supabase.from("appointments").select("id, title, status, start_time, end_time, staff:staff_id(full_name)").eq("patient_id", patientId).lte("start_time", nowIso).order("start_time", {
    ascending: false
  }).limit(20);
  // Invoices
  const { data: invoicesRaw } = await supabase.from("invoices").select(`
      id,
      created_at,
      total_amount,
      status,
      diagnostic,
      appointment_id
    `).eq("patient_id", patientId).order("created_at", {
    ascending: false
  }).limit(20);
  let invoices = invoicesRaw || [];
  if (invoices.length > 0) {
    const invoiceIds = invoices.map((inv)=>inv.id);
    const { data: invoiceItems } = await supabase.from("invoice_items").select("invoice_id, id, service_name, quantity, unit_price").in("invoice_id", invoiceIds);
    const itemMap = new Map();
    (invoiceItems || []).forEach((item)=>{
      if (!itemMap.has(item.invoice_id)) itemMap.set(item.invoice_id, []);
      itemMap.get(item.invoice_id).push({
        id: item.id,
        service_name: item.service_name,
        quantity: item.quantity,
        unit_price: item.unit_price
      });
    });
    const appointmentIds = [...new Set(invoices.map((inv)=>inv.appointment_id).filter(Boolean))];
    let appointmentMap = new Map();
    if (appointmentIds.length > 0) {
      const { data: appointmentRows } = await supabase.from("appointments").select("id, title, start_time").in("id", appointmentIds);
      appointmentMap = new Map((appointmentRows || []).map((row)=>[row.id, row]));
    }
    invoices = invoices.map((invoice)=>({
      ...invoice,
      appointment: appointmentMap.get(invoice.appointment_id) || null,
      invoice_items: itemMap.get(invoice.id) || []
    }));
  }
  // Optional clinic info
  let clinic = null;
  try {
    const { data } = await supabase.from("clinic_info").select("phone_number, address").single();
    clinic = data || null;
  } catch (_) {}
  return new Response(JSON.stringify({
    success: true,
    data: {
      nextAppointment: nextAppointment || null,
      exercises: exercises || [],
      appointmentHistory: appointmentHistory || [],
      invoices: invoices || [],
      clinic
    }
  }), {
    headers: cors({
      "Content-Type": "application/json"
    })
  });
}
async function completeExercise(req, id) {
  const supabase = userClient(req);
  const ctx = await getAuthedPatient(req);
  if (!ctx) return new Response(JSON.stringify({
    success: false,
    message: "Unauthorized"
  }), {
    status: 401,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  const { data: row, error: getErr } = await supabase.from("assigned_exercises").select("id, completed_dates, patient_id").eq("id", id).single();
  if (getErr) return new Response(JSON.stringify({
    success: false,
    message: getErr.message
  }), {
    status: 404,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  const today = new Date().toISOString().split("T")[0];
  const completed = Array.isArray(row.completed_dates) ? row.completed_dates : [];
  if (!completed.includes(today)) completed.push(today);
  const { error: updErr } = await supabase.from("assigned_exercises").update({
    completed_dates: completed
  }).eq("id", id);
  if (updErr) return new Response(JSON.stringify({
    success: false,
    message: updErr.message
  }), {
    status: 400,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  return new Response(JSON.stringify({
    success: true
  }), {
    headers: cors({
      "Content-Type": "application/json"
    })
  });
}
async function changePassword(req) {
  const supabase = userClient(req);
  const ctx = await getAuthedPatient(req);
  if (!ctx) return new Response(JSON.stringify({
    success: false,
    message: "Unauthorized"
  }), {
    status: 401,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  const { currentPassword, newPassword } = await req.json();
  // Optional: verify current password
  const verifyClient = createClient(URL, ANON);
  const { error: signErr } = await verifyClient.auth.signInWithPassword({
    email: ctx.authUser.email,
    password: currentPassword
  });
  if (signErr) return new Response(JSON.stringify({
    success: false,
    message: "Current password is incorrect"
  }), {
    status: 400,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  const { error } = await admin.auth.admin.updateUserById(ctx.authUser.id, {
    password: newPassword
  });
  if (error) return new Response(JSON.stringify({
    success: false,
    message: error.message
  }), {
    status: 400,
    headers: cors({
      "Content-Type": "application/json"
    })
  });
  return new Response(JSON.stringify({
    success: true
  }), {
    headers: cors({
      "Content-Type": "application/json"
    })
  });
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors()
  });
  try {
    const { path, method = "GET" } = await req.json();
    if (path === "/api/portal/me" && method === "GET") return me(req);
    if (path === "/api/portal/dashboard" && method === "GET") return dashboard(req);
    if (path?.startsWith("/api/assigned-exercises/") && method === "PATCH") {
      const parts = path.split("/").filter(Boolean);
      let id = parts.pop();
      if (id === "complete") id = parts.pop();
      if (!id) {
        return new Response(JSON.stringify({
          message: "Assignment ID missing"
        }), {
          status: 400,
          headers: cors({
            "Content-Type": "application/json"
          })
        });
      }
      return completeExercise(req, id);
    }
    if (path === "/api/patient/change-password" && method === "POST") return changePassword(req);
    return new Response(JSON.stringify({
      message: "Route not implemented"
    }), {
      status: 404,
      headers: cors({
        "Content-Type": "application/json"
      })
    });
  } catch (e) {
    return new Response(JSON.stringify({
      message: e?.message ?? "portal-api error"
    }), {
      status: 500,
      headers: cors({
        "Content-Type": "application/json"
      })
    });
  }
});
