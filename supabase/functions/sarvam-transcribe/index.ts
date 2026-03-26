import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sarvamApiKey = Deno.env.get("SARVAM_API_KEY");
    if (!sarvamApiKey) {
      return new Response(
        JSON.stringify({ error: "SARVAM_API_KEY not configured" }),
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

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "API-Subscription-Key": sarvamApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "saaras:v2",
        language_code,
        audio: audio_base64,
        with_timestamps: false,
        with_disfluencies: false,
        debug_mode: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Sarvam API error: ${response.status}` }),
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
