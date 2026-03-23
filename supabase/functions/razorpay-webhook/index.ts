import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
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
      .single();

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

    console.log(`Auto-reconciled ₹${amountInr} for bill ${billId}`);

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
