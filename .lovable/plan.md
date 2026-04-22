

# Per-Hospital API Configuration — Razorpay, Sarvam, Hospital Registration

## What changes for the user

Each hospital admin will configure their own credentials inside **Settings → API Configuration Hub**. No global keys to paste, no popup asking you for secrets.

| Service | Where it's configured | Stored in |
|---|---|---|
| Razorpay (Key ID + Key Secret + Webhook Secret + UPI ID + Mode) | `Settings → Razorpay Payments` (rebuilt) and mirrored in `Settings → API Hub` | `api_configurations` table, scoped by `hospital_id`, RLS-protected |
| Sarvam (API Key) | `Settings → API Hub → Sarvam (Voice)` | Same table, same scoping |
| Hospital Registration token | **Per-hospital is impossible** (hospital doesn't exist yet at signup). See note below. | — |

## Why the existing setup almost works already

- The `api_configurations` table is already live with per-hospital RLS (one row per hospital × service).
- `APIConfigHubPage` already renders a generic "add key" drawer for any entry in `KNOWN_SERVICES` — Razorpay and Sarvam are already in that list.
- `aiProvider.ts` already reads AI keys from this table per hospital.

What's missing is: (a) a real Razorpay settings page wired to this table, and (b) edge functions reading the per-hospital row instead of a single platform secret.

## Files to change

### 1. `src/pages/settings/SettingsRazorpayPage.tsx` — rebuild
Replace the static stub with a real page that:
- Loads the hospital's existing Razorpay row from `api_configurations` (`service_key = 'razorpay'`).
- Fields: Mode (Test/Live), Key ID, Key Secret, **Webhook Secret**, UPI ID, Allow Part Payments, Auto-send Receipt.
- Save → upsert into `api_configurations`.
- "Test Connection" → calls Razorpay `/v1/payments` with the entered key (already pattern-matched in API Hub for other providers).
- Show webhook URL to paste into Razorpay dashboard: `https://<project>.functions.supabase.co/razorpay-webhook?hospital_id=<this hospital's id>`.

### 2. `supabase/functions/razorpay-webhook/index.ts` — read per-hospital secret
- Accept `hospital_id` from query string (or from the bill's `hospital_id` after lookup).
- Fetch that hospital's row from `api_configurations` using the service-role client.
- Verify the `X-Razorpay-Signature` header using **that hospital's webhook secret** (HMAC-SHA256 of raw body).
- Reject with 401 if signature fails. Then continue with the existing reconciliation logic.

### 3. `supabase/functions/sarvam-transcribe/index.ts` — read per-hospital key
- Require an authenticated user JWT (already passed by `supabase.functions.invoke`).
- Resolve the caller's `hospital_id` via the `users` table (service-role lookup by `auth_user_id`).
- Read that hospital's Sarvam row from `api_configurations`. Use `config.api_key`.
- Fall back to env `SARVAM_API_KEY` only if no hospital row exists (kept for backward compatibility; can be removed later).

### 4. `supabase/functions/bhashini-transcribe/index.ts` — same per-hospital pattern
Mirror the Sarvam change so Bhashini works the same way.

### 5. Hospital Registration token — **revised approach**
A registration secret can't be per-hospital because the hospital doesn't exist when the form is submitted. Two clean options:

- **Option A (recommended):** Drop the secret entirely and protect `register-hospital` with: Cloudflare Turnstile (invisible CAPTCHA) + IP rate-limit (5 signups / hour / IP) inside the edge function. Zero credentials for hospital admins to manage.
- **Option B:** Keep one platform-level `HOSPITAL_REGISTRATION_TOKEN` secret only you (the platform owner) hold, sent automatically by the public registration page. No hospital ever sees or configures it.

Default to **Option A** unless you tell me otherwise.

### 6. `src/components/voice/VoiceDictationButton.tsx` — no change needed
Already invokes the edge function; once #3 reads from `api_configurations`, this works hospital-by-hospital.

## Behavior after the fix

- Hospital A admin pastes their Razorpay test key → only Hospital A's bills use it.
- Hospital B admin pastes a different live key → only Hospital B's webhooks are verified with Hospital B's webhook secret.
- Sarvam voice scribe uses each hospital's own quota.
- New hospital signup is protected by CAPTCHA + IP rate limit, no secret to manage.

## Risk & rollback
- All 4 edge functions keep env-var fallback for one release so existing flows don't break mid-deploy.
- UI changes are isolated to one new page (`SettingsRazorpayPage`) and don't touch billing logic.
- If a hospital hasn't configured Razorpay yet, the `Pay` button shows "Razorpay not configured — go to Settings" instead of failing silently.

## Out of scope
- Migrating existing single-secret deployments — handled by the env-var fallback.
- AI keys (Claude/OpenAI/Gemini) — already per-hospital via this same table.

