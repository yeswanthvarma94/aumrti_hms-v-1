import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function resolveHospitalApiKey(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return null;

    // Service-role lookup of hospital
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userRow } = await admin
      .from("users")
      .select("hospital_id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (!userRow?.hospital_id) return null;

    const { data: cfg } = await admin
      .from("api_configurations")
      .select("config")
      .eq("hospital_id", userRow.hospital_id)
      .eq("service_key", "sarvam")
      .maybeSingle();

    const apiKey = (cfg?.config as any)?.api_key;
    return apiKey || null;
  } catch (err) {
    console.error("resolveHospitalApiKey error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Per-hospital key first, env fallback for backward compat
    const hospitalKey = await resolveHospitalApiKey(req);
    const sarvamApiKey = hospitalKey || Deno.env.get("SARVAM_API_KEY");

    if (!sarvamApiKey) {
      return new Response(
        JSON.stringify({
          error: "Sarvam API key not configured for your hospital. Go to Settings → API Configuration Hub → Sarvam to add your key.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { audio_base64, language_code, model } = await req.json();

    if (!audio_base64 || !language_code) {
      return new Response(
        JSON.stringify({ error: "audio_base64 and language_code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBytes = decode(audio_base64);
    const audioFile = new File([audioBytes], "audio.wav", { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", model || "saaras:v3");
    formData.append("language_code", language_code === "auto" ? "unknown" : language_code);
    formData.append("with_timestamps", "false");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": sarvamApiKey },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Sarvam API error: ${response.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ transcript: result.transcript || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sarvam-transcribe error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
