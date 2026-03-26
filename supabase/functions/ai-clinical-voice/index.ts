import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTEXT_PROMPTS: Record<string, string> = {
  complaint: `Extract structured complaint data from this doctor's voice dictation. Return JSON:
{
  "chief_complaint": "main complaint in clinical terms",
  "duration": "e.g. 3 days, 1 week",
  "onset": "Sudden | Gradual | Insidious",
  "history_of_present_illness": "detailed HPI narrative"
}
Only include fields that are clearly mentioned. Use empty string for missing fields.`,

  examination: `Extract structured examination data from this doctor's voice dictation. Return JSON:
{
  "examination_notes": "general examination findings",
  "systemic_examination": "systemic/clinical findings",
  "diagnosis": "diagnosis or impression if mentioned",
  "icd10_code": "ICD-10 code if you can determine it, else empty string"
}
Only include fields that are clearly mentioned. Use empty string for missing fields.`,

  prescription: `Extract structured prescription data from this doctor's voice dictation. Return JSON:
{
  "drugs": [
    {
      "drug_name": "drug name with strength",
      "dose": "dosage",
      "route": "Oral|IV|IM|SC|Topical|Inhaled|Sublingual",
      "frequency": "OD|BD|TDS|QID|SOS|STAT|HS",
      "duration_days": "number of days",
      "instructions": "special instructions",
      "quantity": "total quantity"
    }
  ],
  "lab_orders": ["test name 1", "test name 2"],
  "radiology_orders": ["study name 1"],
  "advice_notes": "general advice if mentioned",
  "review_date": "follow-up date if mentioned, in YYYY-MM-DD format"
}
Only include items that are clearly mentioned. Use standard Indian drug names.`,

  ward_round: `Extract structured ward round SOAP note from this doctor's voice dictation. Return JSON:
{
  "subjective": "how patient is feeling, symptoms",
  "objective": "examination findings, vitals mentioned",
  "assessment": "clinical assessment/diagnosis",
  "plan": "today's plan, medication changes, orders"
}
Only include fields that are clearly mentioned. Use empty string for missing fields.`,

  notes: `Extract a clean clinical note from this voice dictation. Return JSON:
{
  "note_text": "cleaned up clinical note",
  "category": "nursing|progress|procedure|other"
}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcript, context_type, existing_data } = await req.json();

    if (!transcript?.trim()) {
      return new Response(JSON.stringify({ error: "Transcript is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextPrompt = CONTEXT_PROMPTS[context_type] || CONTEXT_PROMPTS.notes;

    const existingContext = existing_data
      ? `\n\nExisting data already in the form (merge with, don't overwrite unless corrected):\n${JSON.stringify(existing_data)}`
      : "";

    const prompt = `${contextPrompt}${existingContext}

Doctor's voice dictation transcript:
"${transcript}"

Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a clinical documentation assistant for Indian hospitals. Parse doctor voice dictations into structured medical data. Use standard Indian medical terminology. Always return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_clinical_data",
              description: "Return structured clinical data extracted from voice dictation",
              parameters: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    description: "The structured clinical data matching the requested format",
                  },
                },
                required: ["data"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structure_clinical_data" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();

    // Extract from tool call response
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let structured: Record<string, unknown>;

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      structured = parsed.data || parsed;
    } else {
      // Fallback: try parsing content as JSON
      const content = result.choices?.[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      structured = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify({ structured, context_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-clinical-voice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
