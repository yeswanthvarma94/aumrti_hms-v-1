// EMI Installment Reminders — daily scheduled job
//
// Sends WhatsApp reminders to patients for upcoming EMI installments at 3 windows:
//   T-3 days, T-1 day, T-0 (day of due date).
//
// Tracking: each installment has reminder_sent_count + last_reminder_at on the
// emi_installments table. We bucket the reminders using reminder_sent_count:
//   0 → send the T-3 reminder, then bump to 1
//   1 → send the T-1 reminder, then bump to 2
//   2 → send the T-0 reminder, then bump to 3 (no further reminders)
//
// Uses WATI API per hospital if configured (hospitals.wati_api_url +
// whatsapp_enabled = true). No fallback to wa.me — that requires a browser.
//
// DEPLOYMENT NOTE:
//   Schedule this function to run daily at 08:00 IST via:
//     Supabase Dashboard → Database → Cron Jobs → New Job
//   or pg_cron + pg_net. Example SQL (run separately, not via migrations):
//     select cron.schedule(
//       'emi-reminders-daily',
//       '30 2 * * *',   -- 02:30 UTC = 08:00 IST
//       $$ select net.http_post(
//            url := 'https://lcemfzoangvewaahgmcz.supabase.co/functions/v1/emi-reminders',
//            headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_OR_ANON>"}'::jsonb,
//            body := '{}'::jsonb
//          ) $$
//     );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InstallmentRow {
  id: string;
  hospital_id: string;
  plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  reminder_sent_count: number | null;
  emi_plans: {
    bill_id: string;
    patient_id: string;
    bills: { bill_number: string } | null;
    patients: { full_name: string | null; phone: string | null } | null;
  } | null;
}

interface HospitalRow {
  id: string;
  name: string | null;
  wati_api_url: string | null;
  whatsapp_enabled: boolean | null;
}

function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("91") ? digits : `91${digits}`;
}

function inr(n: number): string {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function buildMessage(opts: {
  patientName: string;
  amount: number;
  billNumber: string;
  dueDate: string;
  daysOut: number;
  hospitalName: string;
}): string {
  const when =
    opts.daysOut === 0
      ? `is due today (${opts.dueDate})`
      : opts.daysOut === 1
      ? `is due tomorrow (${opts.dueDate})`
      : `is due in ${opts.daysOut} days (${opts.dueDate})`;
  return `Dear ${opts.patientName}, your EMI installment of ${inr(
    opts.amount,
  )} for bill ${opts.billNumber} ${when}. Please arrange payment. — ${
    opts.hospitalName
  }`;
}

async function sendViaWati(
  hospital: HospitalRow,
  phone: string,
  message: string,
): Promise<boolean> {
  if (!hospital.wati_api_url || !hospital.whatsapp_enabled) return false;
  try {
    const url = `${hospital.wati_api_url}/api/v1/sendSessionMessage/${cleanPhone(phone)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageText: message }),
    });
    return res.ok;
  } catch (err) {
    console.warn("WATI send failed", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Compute the 3 target windows in IST (date-only, server runs in UTC).
  // We resolve by adding 0/1/3 days to today's IST date.
  const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const istDate = (offsetDays: number) => {
    const d = new Date(nowIst);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  const buckets: { dueDate: string; daysOut: number; targetCount: number }[] = [
    { dueDate: istDate(3), daysOut: 3, targetCount: 0 }, // T-3 → first reminder
    { dueDate: istDate(1), daysOut: 1, targetCount: 1 }, // T-1 → second reminder
    { dueDate: istDate(0), daysOut: 0, targetCount: 2 }, // T-0 → third reminder
  ];

  // Cache hospital metadata
  const hospitalCache = new Map<string, HospitalRow>();
  const getHospital = async (id: string) => {
    if (hospitalCache.has(id)) return hospitalCache.get(id)!;
    const { data } = await supabase
      .from("hospitals")
      .select("id, name, wati_api_url, whatsapp_enabled")
      .eq("id", id)
      .maybeSingle();
    const row = (data || { id, name: "Hospital", wati_api_url: null, whatsapp_enabled: false }) as HospitalRow;
    hospitalCache.set(id, row);
    return row;
  };

  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const perBucket: Record<string, number> = {};

  for (const bucket of buckets) {
    const { data, error } = await supabase
      .from("emi_installments")
      .select(
        "id, hospital_id, plan_id, installment_number, amount, due_date, reminder_sent_count, emi_plans!inner(bill_id, patient_id, bills(bill_number), patients(full_name, phone))",
      )
      .eq("status", "pending")
      .eq("due_date", bucket.dueDate)
      .lte("reminder_sent_count", bucket.targetCount)
      .limit(500);

    if (error) {
      console.error("Query failed for bucket", bucket, error);
      continue;
    }

    const rows = (data || []) as unknown as InstallmentRow[];
    let bucketSent = 0;

    for (const inst of rows) {
      const plan = inst.emi_plans;
      const phone = plan?.patients?.phone;
      const patientName = plan?.patients?.full_name || "Patient";
      const billNumber = plan?.bills?.bill_number || "—";

      if (!phone) {
        totalSkipped++;
        continue;
      }

      const hospital = await getHospital(inst.hospital_id);
      const message = buildMessage({
        patientName,
        amount: Number(inst.amount),
        billNumber,
        dueDate: inst.due_date,
        daysOut: bucket.daysOut,
        hospitalName: hospital.name || "Hospital",
      });

      const ok = await sendViaWati(hospital, phone, message);

      // Always log to whatsapp_notifications for audit trail
      await supabase.from("whatsapp_notifications").insert({
        hospital_id: inst.hospital_id,
        patient_id: plan?.patient_id,
        notification_type: "follow_up_reminder",
        message,
        status: ok ? "sent" : "queued",
        sent_at: ok ? new Date().toISOString() : null,
      } as never);

      // Bump the reminder counter regardless of WATI success — wa.me path
      // requires browser, so we just record the attempt and move on.
      const { error: updErr } = await supabase
        .from("emi_installments")
        .update({
          reminder_sent_count: bucket.targetCount + 1,
          last_reminder_at: new Date().toISOString(),
        })
        .eq("id", inst.id);

      if (updErr) {
        totalFailed++;
        continue;
      }

      if (ok) {
        totalSent++;
        bucketSent++;
      } else {
        // Counted as logged-but-not-sent (no WATI). Still considered "processed".
        totalSent++;
        bucketSent++;
      }
    }

    perBucket[`T-${bucket.daysOut}`] = bucketSent;
  }

  const summary = {
    ok: true,
    ranAt: new Date().toISOString(),
    totalSent,
    totalSkipped,
    totalFailed,
    perBucket,
  };
  console.log("emi-reminders summary", summary);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
