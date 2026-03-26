

## Plan: Add Sarvam V3 Indian Language Support to Voice Scribe

### Answers to Your Questions

1. **API key storage**: Supabase Edge Function secret (already have the pattern). The key stays server-side, never exposed to the browser.
2. **Sarvam call location**: Via a new Supabase Edge Function (`sarvam-transcribe`). Audio is recorded client-side with MediaRecorder, sent as base64 to the edge function, which calls Sarvam API securely.
3. **Language selection UI**: A popover dropdown on the VoiceDictationButton. Selection persisted in localStorage. English uses Web Speech API (instant), all Indian languages route through Sarvam (batch after stop).

### Changes

**1. Add secret: `SARVAM_API_KEY`**
- Request the user to add their Sarvam API key as a Supabase edge function secret.

**2. Create edge function: `supabase/functions/sarvam-transcribe/index.ts`**
- Accepts `{ audio_base64, language_code, model }` in POST body
- Calls `https://api.sarvam.ai/speech-to-text` with `API-Subscription-Key` header
- Returns `{ transcript }` 
- CORS headers included
- Graceful error handling with status codes

**3. Update `src/contexts/VoiceScribeContext.tsx`**
- Add `selectedLanguage` state (default `"en-IN"`, persisted to localStorage key `vscribe_preferred_language`)
- Add `setSelectedLanguage` to context type and provider
- Expose in context value

**4. Update `src/components/voice/VoiceDictationButton.tsx`**
- Add language selector popover (using existing Popover component) next to the mic button
- Languages: English (en-IN), Hindi (hi-IN), Telugu (te-IN), Tamil (ta-IN), Kannada (kn-IN), Malayalam (ml-IN), Marathi (mr-IN), Bengali (bn-IN), Gujarati (gu-IN)
- Each shows label + badge ("Web Speech" vs "Sarvam AI")
- When language is `en-IN`: use existing Web Speech API flow (real-time transcript)
- When language is non-English: use MediaRecorder to capture audio blob → convert to base64 → call `sarvam-transcribe` edge function → get transcript → feed into existing `processTranscript` (AI structuring)
- During Sarvam recording: show "Recording in {language}..." instead of live transcript, since Sarvam is batch-only
- Fallback: if Sarvam fails, toast warning and switch to English Web Speech

**5. Update `src/components/voice/VoiceScribePanel.tsx`**
- Show selected language indicator in panel header during recording state
- During Sarvam recording, show "Transcript will appear after recording stops" instead of blank live transcript area
- After Sarvam transcription completes, show "Transcribing your {language} dictation..." processing state before Claude structuring kicks in

### Technical Details

- MediaRecorder uses `audio/webm;codecs=opus` mime type
- Audio converted to base64 via FileReader before sending to edge function
- Language selection stored in localStorage for persistence across sessions
- The Claude structuring pipeline is unchanged — it receives the transcript regardless of source (Web Speech or Sarvam)
- Sarvam model: `saaras:v2`

