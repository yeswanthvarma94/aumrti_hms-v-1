import { supabase } from "@/integrations/supabase/client";

export interface AIRequest {
  featureKey: string;
  prompt: string;
  hospitalId: string;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  tokens_used?: number;
  error?: string;
}

interface ProviderCallParams {
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens: number;
  temperature: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Anthropic (Claude)",
  openai: "OpenAI",
  gemini: "Google Gemini",
  perplexity: "Perplexity AI",
  ollama: "Ollama (Local)",
};

export const getProviderLabel = (provider: string) =>
  PROVIDER_LABELS[provider] || provider;

export const FEATURE_LABELS: Record<string, string> = {
  global_default: "Global Default",
  voice_scribe: "Voice Scribe (SOAP)",
  radiology_impression: "Radiology AI Impression",
  ai_digest: "AI Executive Digest",
  appeal_letter: "Appeal Letter Writer",
  discharge_summary: "Discharge Summary",
  icd_coding: "ICD-10 Code Suggester",
};

export const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  claude: [
    { label: "Claude Opus 4.5 (Most powerful)", value: "claude-opus-4-5-20251001" },
    { label: "Claude Sonnet 4.6 (Recommended)", value: "claude-sonnet-4-6" },
    { label: "Claude Sonnet 4 (Balanced)", value: "claude-sonnet-4-20250514" },
    { label: "Claude Haiku 4.5 (Fastest)", value: "claude-haiku-4-5-20251001" },
  ],
  openai: [
    { label: "GPT-4o (Recommended)", value: "gpt-4o" },
    { label: "GPT-4o Mini (Faster)", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "o1-preview (Reasoning)", value: "o1-preview" },
  ],
  gemini: [
    { label: "Gemini 1.5 Pro (Recommended)", value: "gemini-1.5-pro" },
    { label: "Gemini 1.5 Flash (Faster)", value: "gemini-1.5-flash" },
    { label: "Gemini 2.0 Flash Exp", value: "gemini-2.0-flash-exp" },
  ],
  perplexity: [
    { label: "Sonar Large 128k Online", value: "llama-3.1-sonar-large-128k-online" },
    { label: "Sonar Small 128k Online", value: "llama-3.1-sonar-small-128k-online" },
    { label: "Llama 3.1 70B Instruct", value: "llama-3.1-70b-instruct" },
  ],
  ollama: [
    { label: "Llama 3", value: "llama3" },
    { label: "Mistral", value: "mistral" },
    { label: "CodeLlama", value: "codellama" },
    { label: "Phi 3", value: "phi3" },
  ],
};

export const KNOWN_SERVICES = [
  { service_key: "anthropic", service_name: "Anthropic (Claude)", emoji: "🤖", endpoint: "api.anthropic.com" },
  { service_key: "openai", service_name: "OpenAI", emoji: "💡", endpoint: "api.openai.com" },
  { service_key: "gemini", service_name: "Google Gemini", emoji: "✨", endpoint: "generativelanguage.googleapis.com" },
  { service_key: "perplexity", service_name: "Perplexity AI", emoji: "🔍", endpoint: "api.perplexity.ai" },
  { service_key: "razorpay", service_name: "Razorpay", emoji: "💳", endpoint: "api.razorpay.com" },
  { service_key: "wati", service_name: "WATI (WhatsApp)", emoji: "📱", endpoint: "live-mt-server.wati.io" },
  { service_key: "sarvam", service_name: "Sarvam (Voice)", emoji: "🎙️", endpoint: "api.sarvam.ai" },
  { service_key: "abdm", service_name: "ABDM / ABHA", emoji: "🏛️", endpoint: "abdm.gov.in" },
  { service_key: "nic_irp", service_name: "NIC IRP (GST e-Invoice)", emoji: "📄", endpoint: "einvoice1.gst.gov.in" },
];

// ── Provider implementations ──────────────────────────

const callClaude = async (params: ProviderCallParams): Promise<AIResponse> => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
      messages: [{ role: "user", content: params.prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return {
    text: data.content?.[0]?.text || "",
    provider: "claude",
    model: params.model,
    tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
};

const callOpenAI = async (params: ProviderCallParams): Promise<AIResponse> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages: [
        ...(params.systemPrompt ? [{ role: "system" as const, content: params.systemPrompt }] : []),
        { role: "user" as const, content: params.prompt },
      ],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return {
    text: data.choices?.[0]?.message?.content || "",
    provider: "openai",
    model: params.model,
    tokens_used: data.usage?.total_tokens,
  };
};

const callGemini = async (params: ProviderCallParams): Promise<AIResponse> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: params.prompt }] }],
      generationConfig: {
        maxOutputTokens: params.maxTokens,
        temperature: params.temperature,
      },
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    provider: "gemini",
    model: params.model,
    tokens_used: data.usageMetadata?.totalTokenCount,
  };
};

const callPerplexity = async (params: ProviderCallParams): Promise<AIResponse> => {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return {
    text: data.choices?.[0]?.message?.content || "",
    provider: "perplexity",
    model: params.model,
  };
};

// ── ENV fallback keys ──────────────────────────

const ENV_KEYS: Record<string, string> = {
  claude: "VITE_ANTHROPIC_KEY",
  openai: "VITE_OPENAI_KEY",
  gemini: "VITE_GEMINI_KEY",
  perplexity: "VITE_PERPLEXITY_KEY",
  sarvam: "VITE_SARVAM_KEY",
};

const getEnvKey = (provider: string): string | undefined => {
  const envVar = ENV_KEYS[provider];
  if (!envVar) return undefined;
  return (import.meta.env as Record<string, string>)[envVar] || undefined;
};

// ── Main callAI function ──────────────────────────

export const callAI = async (request: AIRequest): Promise<AIResponse> => {
  try {
    // Step 1: Look up feature-specific config
    const { data: featureConfig } = await supabase
      .from("ai_provider_config")
      .select("*")
      .eq("hospital_id", request.hospitalId)
      .eq("feature_key", request.featureKey)
      .eq("is_active", true)
      .maybeSingle();

    // Fall back to global_default
    let activeConfig = featureConfig;
    if (!activeConfig) {
      const { data: defaultConfig } = await supabase
        .from("ai_provider_config")
        .select("*")
        .eq("hospital_id", request.hospitalId)
        .eq("feature_key", "global_default")
        .eq("is_active", true)
        .maybeSingle();
      activeConfig = defaultConfig;
    }

    if (!activeConfig) {
      return { text: "", provider: "none", model: "none", error: "No AI provider configured" };
    }

    const { provider, model_name, temperature, max_tokens } = activeConfig;

    // Step 2: Resolve API key — DB first, then env fallback
    let apiKey: string | undefined;
    if (activeConfig.api_key_ref) {
      const { data: apiConf } = await supabase
        .from("api_configurations")
        .select("config")
        .eq("hospital_id", request.hospitalId)
        .eq("service_key", activeConfig.api_key_ref)
        .eq("is_active", true)
        .maybeSingle();
      apiKey = (apiConf?.config as Record<string, string>)?.api_key;
    }
    if (!apiKey) {
      apiKey = getEnvKey(provider);
    }
    if (!apiKey) {
      return {
        text: "",
        provider,
        model: model_name,
        error: `No API key found for ${provider}. Configure it in Settings → API Hub.`,
      };
    }

    const callParams: ProviderCallParams = {
      apiKey,
      model: model_name,
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      maxTokens: request.maxTokens || max_tokens || 1000,
      temperature: Number(temperature) || 0.3,
    };

    // Step 3: Route to provider
    switch (provider) {
      case "claude":
        return await callClaude(callParams);
      case "openai":
        return await callOpenAI(callParams);
      case "gemini":
        return await callGemini(callParams);
      case "perplexity":
        return await callPerplexity(callParams);
      default:
        return { text: "", provider, model: model_name, error: `Unknown provider: ${provider}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    return { text: "", provider: "unknown", model: "unknown", error: message };
  }
};
