

## Fix: AI Provider — API Key Lookup, Models, and Test Button

### Problems

1. **API key not found for Gemini**: The `api_key_ref` in `ai_provider_config` stores the service_key of the API Key Source dropdown (e.g., "anthropic"). But in the screenshots, the Global Default is set to provider "gemini" with API Key Source showing "Anthropic" — meaning `api_key_ref = "anthropic"`. The `callAI` function then queries `api_configurations WHERE service_key = "anthropic"`, which has no key configured. The real key is stored under `service_key = "gemini"`. **Fix**: Auto-set `api_key_ref` to match the selected provider when provider changes, and add a provider-to-service_key mapping.

2. **Models are hardcoded**: `PROVIDER_MODELS` in `aiProvider.ts` has outdated models. Users can't add custom models. **Fix**: Update the model lists to current versions and add an "Other" option allowing custom model entry.

3. **Feature "Test" button doesn't test**: Clicking "Test" on a feature row only sets `playFeature` and `playPrompt` — it doesn't scroll to the playground or auto-run. **Fix**: After setting feature/prompt, auto-scroll to playground and auto-run the test.

4. **API Key "Test Connection" is fake**: `testApiKey()` uses `Math.random()` instead of actually testing the API. **Fix**: Make a real lightweight API call to verify the key works.

### Changes

**File 1: `src/lib/aiProvider.ts`**
- Add `PROVIDER_TO_SERVICE_KEY` mapping: `{ claude: "anthropic", openai: "openai", gemini: "gemini", perplexity: "perplexity" }`
- Update `PROVIDER_MODELS` with current model names (Gemini 2.5 Pro/Flash, Claude 4 Sonnet, GPT-4o, etc.)
- In `callAI`: if `api_key_ref` is not set, auto-resolve using `PROVIDER_TO_SERVICE_KEY[provider]` before falling back to env vars

**File 2: `src/pages/settings/APIConfigHubPage.tsx`**
- When provider changes in Global Default or feature rows, auto-set `api_key_ref` to the matching service_key via the mapping
- Feature "Test" button: after setting `playFeature`/`playPrompt`, scroll to playground section and trigger `runPlayground()` automatically
- Replace fake `testApiKey()` with real API calls per provider (e.g., Gemini: call `generateContent` with a tiny prompt; OpenAI: call `chat/completions` with `max_tokens: 1`)

### Technical Details
- The core bug is that `api_key_ref` determines where to look up the API key, but changing the provider doesn't update `api_key_ref`. A user selects Gemini as provider but `api_key_ref` still points to "anthropic" (from a previous selection or default)
- The fix in `callAI` adds a fallback: if `api_key_ref` is null/missing, derive it from the provider name using the mapping, so even misconfigured records still find the right key
- Real API key testing uses minimal token calls to verify connectivity without incurring significant cost

