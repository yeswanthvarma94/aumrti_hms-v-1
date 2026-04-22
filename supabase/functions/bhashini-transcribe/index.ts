import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function resolveHospitalCredentials(req: Request): Promise<{ apiKey: string; userId: string } | null> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return null;

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
      .eq("service_key", "bhashini")
      .maybeSingle();

    const c = (cfg?.config as any) || {};
    if (!c.api_key || !c.user_id) return null;
    return { apiKey: c.api_key, userId: c.user_id };
  } catch (err) {
    console.error("resolveHospitalCredentials error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hospitalCreds = await resolveHospitalCredentials(req);
    const bhashiniApiKey = hospitalCreds?.apiKey || Deno.env.get("BHASHINI_API_KEY");
    const bhashiniUserId = hospitalCreds?.userId || Deno.env.get("BHASHINI_USER_ID");

    if (!bhashiniApiKey || !bhashiniUserId) {
      return new Response(
        JSON.stringify({
          error: "Bhashini credentials not configured for your hospital. Go to Settings → API Configuration Hub → Bhashini to add your credentials (api_key + user_id).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { audio_base64, language_code } = await req.json();

    if (!audio_base64 || !language_code) {
      return new Response(
        JSON.stringify({ error: "audio_base64 and language_code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langMap: Record<string, string> = {
      "hi-IN": "hi", "te-IN": "te", "ta-IN": "ta", "kn-IN": "kn",
      "ml-IN": "ml", "mr-IN": "mr", "bn-IN": "bn", "gu-IN": "gu",
      "or-IN": "or", "pa-IN": "pa", "as-IN": "as", "ur-IN": "ur",
      "sa-IN": "sa", "ne-IN": "ne", "sd-IN": "sd", "ks-IN": "ks",
      "doi-IN": "doi", "kok-IN": "kok", "mai-IN": "mai", "mni-IN": "mni",
      "sat-IN": "sat", "bo-IN": "bo", "en-IN": "en",
    };

    const bhashiniLang = langMap[language_code] || language_code.split("-")[0];

    const pipelineRes = await fetch(
      "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ulcaApiKey: bhashiniApiKey,
          userID: bhashiniUserId,
        },
        body: JSON.stringify({
          pipelineTasks: [{ taskType: "asr", config: { language: { sourceLanguage: bhashiniLang } } }],
          pipelineRequestConfig: { pipelineId: "64392f96daac500b55c543cd" },
        }),
      }
    );

    if (!pipelineRes.ok) {
      const errText = await pipelineRes.text();
      console.error("Bhashini pipeline error:", pipelineRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Bhashini pipeline error: ${pipelineRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pipelineData = await pipelineRes.json();
    const asrConfig = pipelineData?.pipelineResponseConfig?.[0]?.config?.[0];
    const serviceUrl = asrConfig?.serviceId
      ? pipelineData?.pipelineInferenceAPIEndPoint?.callbackUrl
      : null;
    const inferenceApiKey = pipelineData?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value;

    if (!serviceUrl || !inferenceApiKey) {
      return new Response(
        JSON.stringify({ error: "Could not resolve Bhashini ASR endpoint. Language may not be supported." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asrRes = await fetch(serviceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: inferenceApiKey },
      body: JSON.stringify({
        pipelineTasks: [{
          taskType: "asr",
          config: {
            language: { sourceLanguage: bhashiniLang },
            serviceId: asrConfig.serviceId,
            audioFormat: "webm",
            samplingRate: 16000,
          },
        }],
        inputData: { audio: [{ audioContent: audio_base64 }] },
      }),
    });

    if (!asrRes.ok) {
      const errText = await asrRes.text();
      console.error("Bhashini ASR error:", asrRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Bhashini ASR error: ${asrRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asrData = await asrRes.json();
    const transcript = asrData?.pipelineResponse?.[0]?.output?.[0]?.source || "";

    return new Response(
      JSON.stringify({ transcript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bhashini-transcribe error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
