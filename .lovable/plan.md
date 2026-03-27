

## Telemedicine Module — Implementation Plan

### Overview
Build a `/telemedicine` page with 3-panel layout: consult queue, Jitsi Meet video embed, and patient/Rx panel. Uses free Jitsi Meet iframe (no API key needed).

### Database Migration

**New table: `teleconsult_sessions`**
- Columns: id, hospital_id, patient_id, doctor_id, encounter_id, room_id (unique), scheduled_at, duration_minutes, status, patient/doctor joined timestamps, ended_at, actual_duration, prescription_sent, bill_generated, patient_phone, notes, created_at
- Status validation trigger (scheduled, waiting, in_progress, completed, missed, cancelled)
- RLS policies scoped to hospital_id

### Files to Create

1. **`src/pages/telemedicine/TelemedicinePage.tsx`** — Main page with 3-panel layout:
   - **Left (300px)**: Queue with status tabs (Waiting/Scheduled/Completed), session cards with Join Call buttons
   - **Center (flex)**: Dark bg, Jitsi iframe embed (`https://meet.jit.si/HMS-{roomId}`), call info bar with duration timer and End Call
   - **Right (320px)**: Patient summary card, quick Rx editor (drug search + dose/freq/days), notes textarea, Complete & Bill button

2. **`src/components/telemedicine/ScheduleTeleconsultModal.tsx`** — Modal with patient search, doctor select, date/time pickers, duration pills (15/30/45 min), Send WhatsApp Invite button using existing `whatsapp-notifications.ts` utilities

### Files to Modify

3. **`src/App.tsx`** — Add route `/telemedicine` inside AppShell
4. **`src/components/layout/AppSidebar.tsx`** — Add "Telemedicine" entry (Video icon) to the "More" submenu

### Technical Details

- **Video**: Jitsi Meet iframe with `allow="camera; microphone; fullscreen; display-capture"`. Room ID = `HMS-{session.id}` for uniqueness. Doctor display name passed via URL param.
- **Duration timer**: `useEffect` interval counting seconds from `doctor_joined_at`, displayed as MM:SS in the call info bar.
- **Quick Rx**: Simple inline drug entry (name, dose, frequency, days) stored as local state array. "Send Rx on WhatsApp" formats as text message via `makeWaUrl`.
- **Complete & Bill**: Updates session status to `completed`, sets `ended_at`, then navigates to `/billing` with relevant params.
- **WhatsApp invite**: On schedule, generates a wa.me link with join URL pointing to `meet.jit.si/HMS-{roomId}` (patient joins directly via Jitsi, no portal auth needed).
- **Data fetching**: Supabase queries filtered by hospital_id and current date for the queue. Status tabs filter locally.

