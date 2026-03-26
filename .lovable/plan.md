

## Plan: Fix Emergency Voice Scribe — Vitals, AMPLE & Field Mapping

### Root Cause

Two problems:

1. **The AI prompt for `emergency` context doesn't ask for vitals or AMPLE fields.** It only returns `history` as a single string — no BP, pulse, SpO2, GCS, and no structured A/M/P/L/E breakdown.

2. **The fill function in `EmergencyWorkspace.tsx` only maps `history` to `ample.e` (Events).** The other four AMPLE fields (Allergies, Medications, Past History, Last Meal) and all vitals are completely ignored.

### Changes

**1. Update emergency prompt in `supabase/functions/ai-clinical-voice/index.ts`**

Expand the emergency JSON schema to include vitals and AMPLE:

```json
{
  "presenting_complaint": "",
  "vitals_detected": {
    "bp_systolic": "", "bp_diastolic": "", "pulse": "", "spo2": "", "gcs": ""
  },
  "ample": {
    "allergies": "", "medications": "", "past_history": "", "last_meal": "", "events": ""
  },
  "examination": "",
  "working_diagnosis": "",
  "immediate_management": "",
  "triage_category": "P1/P2/P3/P4",
  "investigations_ordered": [],
  "disposition": "admit/discharge/observe/refer",
  "confidence": 0.85
}
```

Add instructional text telling the AI to extract vitals numbers and split history into AMPLE categories when possible.

**2. Update fill function in `src/components/emergency/EmergencyWorkspace.tsx`**

Map the new structured fields:

- `vitals_detected.bp_systolic` → `vitals.bp_s`, etc. for all 5 vitals
- `ample.allergies` → `ample.a`, `ample.medications` → `ample.m`, etc.
- Keep existing mappings for complaint, diagnosis, triage, disposition, investigations
- Fallback: if `ample` object not present but `history` string exists, put it in `ample.e` (backward compatible)

**3. Redeploy the edge function**

### Technical Detail

The key insight is that the AI prompt defines what the model returns. Currently the emergency prompt has no vitals or AMPLE structure, so the model never extracts them. Adding these fields to the schema and instructions will make the model parse "BP 120/80, pulse 88, SpO2 98" into the proper fields, and split history into AMPLE categories when the doctor uses that framework.

