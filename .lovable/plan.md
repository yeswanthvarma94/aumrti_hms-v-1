

## Add Multi-Engine Voice ASR (Sarvam + Bhashini + Web Speech)

### What
Allow hospital admins to choose their preferred speech-to-text engine from the API Hub. Add Bhashini (free Government of India ASR supporting 22 languages) as a second engine alongside Sarvam and Web Speech API.

### Changes

**File 1: `src/lib/aiProvider.ts`**
- Add Bhashini to `KNOWN_SERVICES` array: `{ service_key: "bhashini", service_name: "Bhashini (MeitY)", emoji: "🇮🇳", endpoint: "meity-auth.ulcacontrib.org" }`
- Add `bhashini: "VITE_BHASHINI_KEY"` to `ENV_KEYS`
- Add `voice_asr_engine: "Voice ASR Engine"` to `FEATURE_LABELS`

**File 2: `supabase/functions/bhashini-transcribe/index.ts`** (NEW)
- 2-step Bhashini ULCA pipeline: get ASR config → call inference endpoint
- Maps our language codes (hi-IN, te-IN, etc.) to ISO-639 codes for Bhashini
- Reads `BHASHINI_API_KEY` and `BHASHINI_USER_ID` from Deno env
- Returns `{ transcript }` same as sarvam-transcribe

**File 3: `src/contexts/VoiceScribeContext.tsx`**
- Add `"bhashini"` to the `LanguageOption.engine` union type
- Add 13 Bhashini-only languages (Odia, Punjabi, Assamese, Urdu, Sanskrit, etc.) to `SUPPORTED_LANGUAGES`

**File 4: `src/pages/settings/APIConfigHubPage.tsx`**
- Add "Voice ASR Engine" section between AI Providers and External API Keys
- 3-card selector: Sarvam (Recommended), Bhashini (Free), Web Speech (Built-in)
- Selection saved to `api_configurations` table with `service_key = "voice_asr_engine"`, `config = { engine: "sarvam"|"bhashini"|"web_speech" }`
- Add Bhashini-specific fields (User ID) in the API key drawer
- Load/save engine preference on mount

**File 5: `src/components/voice/VoiceDictationButton.tsx`**
- Fetch admin's engine preference from `api_configurations` on mount
- Add `resolveEngine()` that respects: English → web_speech always; admin preference for Indian languages; default to sarvam
- Add `sendToBhashini()` function (same pattern as `sendChunkToSarvam` but calls `bhashini-transcribe`)
- Use `activeEngineRef` to capture engine at recording start for consistent routing in `onstop`
- Filter language list: hide Bhashini-only languages when Bhashini isn't the active engine
- Update language badges to show active engine name

### Supabase Secrets Needed
After deployment, two secrets must be added for Bhashini (free from bhashini.gov.in):
- `BHASHINI_API_KEY`
- `BHASHINI_USER_ID`

### Technical Details
- No DB migration needed — uses existing `api_configurations` table with a new `service_key = "voice_asr_engine"` row
- Bhashini-only languages have `engine: "bhashini"` in the array, filtered out of the language selector when Bhashini isn't active
- The `activeEngineRef` pattern prevents race conditions between recording start and stop
- Auto-chunking (25s) applies to both Sarvam and Bhashini since both have duration limits

