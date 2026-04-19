
Goal: restore the /schedule flow so scheduled doctors appear, slots render, booking works, and the patient lands in OPD with an APT token.

1. Fix the blocking schedule query error
- Update `src/pages/schedule/SchedulingPage.tsx` so the doctor schedule query no longer requests `users.specialty`.
- I confirmed from the live network trace that `/doctor_schedules` is failing with:
  `column users_1.specialty does not exist`
- Because that request returns HTTP 400, the page shows “No doctors scheduled…” even when schedules exist.

2. Make the doctor list resilient to the real user schema
- Keep the join to `users` for doctor name, but only select fields that exist.
- If specialty/department info is needed for display, fetch it from a valid source already used elsewhere in the app (likely `department_id -> departments.name`) or omit it rather than breaking the page.

3. Fix slot rendering for multi-session schedules
- The Doctor Schedules settings page supports multiple sessions per doctor per day.
- The current scheduling page uses `schedules.find(...)`, which only shows the first session for a doctor.
- Refactor the right panel to group schedules by doctor and render slots across all that doctor’s sessions for the selected day.

4. Harden booking → OPD token integration
- Keep the current booking flow, but correct the token insert details:
  - store the new appointment id on `opd_tokens.appointment_id`
  - avoid prefix duplication by matching `generate_token_number()` output with how `opd_tokens.token_number` and `token_prefix` are displayed elsewhere
- This prevents inconsistent token display like double `APT` and gives a reliable link between appointment and OPD queue.

5. Preserve cancellation consistency
- Update cancel logic to use the appointment linkage when available, instead of broad matching only by patient/doctor/date.
- Keep WhatsApp cancellation behavior unchanged.

6. End-to-end verification after implementation
- Open `/schedule`
- Select today’s date
- Confirm doctors with schedules appear in the left panel
- Click a doctor and confirm all configured session slots appear
- Book a test patient into an available slot
- Confirm the slot becomes booked
- Open `/opd`
- Confirm the patient appears in the queue with the expected APT token format

Technical details
- Root cause found: the schedule fetch in `SchedulingPage.tsx` selects `doctor:users!doctor_schedules_doctor_id_fkey(full_name, specialty)`, but `users.specialty` is not present in the current schema.
- Confirmed via network snapshot: the request returns 400, not an empty dataset.
- Secondary issue: multi-session schedules are currently flattened incorrectly for the right panel.
- Secondary data issue: booking currently inserts into `opd_tokens` without setting `appointment_id`, despite that column existing in the schema.

Files to update
- `src/pages/schedule/SchedulingPage.tsx`

Expected result
- Doctors will appear correctly on scheduled days.
- Reception can select a doctor, view valid slots, book an appointment, and see the patient in OPD queue immediately.
