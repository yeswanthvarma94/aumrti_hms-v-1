

## Plan: Fix Voice Scribe Structured Output Not Displaying

### Root Cause Analysis

Three related issues traced to the same data flow problem:

1. **Panel shows empty fields**: The edge function uses `tool_choice` with Gemini via the Lovable AI gateway, which may not return tool_calls properly. The fallback parser catches this but may produce an empty object. The panel shows "100%" confidence because that's the default when `confidence` is not a number in the data — confirming `structuredOutput` is likely `{}` or has unexpected structure.

2. **Chief complaint not pre-filled**: `applyToCurrentScreen()` calls the registered fill function with `structuredOutput`, but if that object is empty, nothing gets filled.

3. **No drug cards**: Same root cause — `editableData.prescription` is undefined/empty because the AI response wasn't parsed correctly.

### Changes

**1. Fix edge function AI call (`supabase/functions/ai-clinical-voice/index.ts`)**
- Remove `tools` and `tool_choice` from the request — Gemini via the gateway doesn't reliably support forced tool calling
- Instead, rely on the system prompt to return raw JSON and parse the content directly
- Add `console.log` for the raw AI response to aid debugging
- Keep the markdown-stripping fallback parser

**2. Add client-side debug logging (`src/components/voice/VoiceDictationButton.tsx`)**
- Add `console.log("Voice AI response:", data)` after the edge function call so issues are visible in browser console
- Log the raw transcript before sending to the edge function

**3. Re-deploy the edge function**
- The edge function needs redeployment after the fix

### Technical Detail

Current broken flow:
```text
Gemini + tool_choice → no tool_calls in response → fallback to content parsing → content may be empty → structured = {}
```

Fixed flow:
```text
Gemini (no tool_choice) → returns JSON in content → strip markdown → parse JSON → structured data with all fields
```

