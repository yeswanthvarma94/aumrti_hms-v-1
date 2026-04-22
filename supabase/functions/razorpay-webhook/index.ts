import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read raw body FIRST (required for signature verification)
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // Hospital ID can come from query string (preferred) or be resolved from bill
    const url = new URL(req.url);
    let hospitalId = url.searchParams.get("hospital_id");

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = payload.event;
    if (event !== "payment.captured" && event !== "payment_link.paid") {
      return new Response(JSON.stringify({ status: "ignored", event }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = payload.payload?.payment?.entity;
    if (!payment) {
      return new Response(JSON.stringify({ error: "No payment entity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountInr = payment.amount / 100;
    const paymentId = payment.id;
    const notes = payment.notes || {};
    const billId = notes.bill_id;

    // If hospital_id wasn't in query string, try to resolve via bill
    if (!hospitalId && billId) {
      const { data: billLookup } = await supabase
        .from("bills")
        .select("hospital_id")
        .eq("id", billId)
        .maybeSingle();
      hospitalId = billLookup?.hospital_id ?? null;
    }

    if (!hospitalId) {
      console.error("Cannot resolve hospital_id for webhook");
      return new Response(JSON.stringify({ error: "hospital_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load this hospital's Razorpay config
    const { data: cfg } = await supabase
      .from("api_configurations")
      .select("config")
      .eq("hospital_id", hospitalId)
      .eq("service_key", "razorpay")
      .maybeSingle();

    const webhookSecret =
      (cfg?.config as any)?.webhook_secret ||
      Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ||
      "";

    // Verify signature
    if (!webhookSecret) {
      console.error(`No webhook secret configured for hospital ${hospitalId}`);
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (expected !== signature) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!billId) {
      console.log("No bill_id in payment notes, skipping auto-reconciliation");
      return new Response(JSON.stringify({ status: "no_bill_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the bill
    const { data: bill, error: billError } = await supabase
      .from("bills")
      .select("id, hospital_id, paid_amount, balance_due, total_amount")
      .eq("id", billId)
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    if (billError || !bill) {
      console.error("Bill not found:", billId);
      return new Response(JSON.stringify({ error: "Bill not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate payment
    const { data: existing } = await supabase
      .from("bill_payments")
      .select("id")
      .eq("transaction_id", paymentId)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ status: "duplicate" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert payment
    await supabase.from("bill_payments").insert({
      hospital_id: bill.hospital_id,
      bill_id: bill.id,
      payment_mode: "upi",
      amount: amountInr,
      transaction_id: paymentId,
      gateway_reference: paymentId,
      notes: "Razorpay auto-payment",
    });

    // Update bill
    const newPaid = (bill.paid_amount || 0) + amountInr;
    const newBalance = Math.max(0, (bill.balance_due || 0) - amountInr);
    const newStatus = newBalance <= 0 ? "paid" : "partial";

    await supabase.from("bills").update({
      paid_amount: newPaid,
      balance_due: newBalance,
      payment_status: newStatus,
    }).eq("id", bill.id);

    console.log(`Auto-reconciled ₹${amountInr} for bill ${billId} (hospital ${hospitalId})`);

    return new Response(
      JSON.stringify({ status: "reconciled", amount: amountInr, bill_id: billId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
