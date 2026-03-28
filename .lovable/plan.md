

# Fix: Bank Reconciliation, AI Analysis, and Bank Account Settings

## Issues Found

1. **AI Financial Analysis** — The button and logic exist in `ReportsTab.tsx` (line 560), but it requires an AI provider configured in `ai_provider_config` with a valid API key. If none is configured, it silently returns "No AI provider configured". The error message is swallowed and shows "AI analysis failed."
2. **CSV Upload** — The upload zone and CSV parsing logic exist in `BankTab.tsx` (lines 98-137), but the file input only accepts `.csv,.xlsx` and the `onChange` handler only parses CSV text. It should work for CSV files.
3. **No Bank Accounts Settings page** — There is no `/settings/bank-accounts` page for configuring bank accounts. The BankTab shows "No bank accounts configured. Add in Settings." but there's no corresponding settings page.
4. **Auto-match / Manual match / Reconciliation** — The code logic exists but may not work because there are no bank accounts configured (prerequisite), so no transactions can be loaded or matched.

## Plan

### Step 1: Create Settings → Bank Accounts page
- New file: `src/pages/settings/SettingsBankAccountsPage.tsx`
- CRUD for `bank_accounts` table (add/edit/deactivate)
- Fields: account_name, bank_name, account_number, ifsc_code, opening_balance, is_active
- Uses `SettingsPageWrapper` component for consistent layout
- Add route in `App.tsx`

### Step 2: Add Bank Accounts card to Settings hub
- In `src/pages/settings/SettingsPage.tsx`, add a new card under the "Structure" group:
  `{ icon: Landmark, title: "Bank Accounts", desc: "Configure bank accounts for reconciliation", route: "/settings/bank-accounts" }`

### Step 3: Fix AI Financial Analysis error display
- In `ReportsTab.tsx`, update `runAIAnalysis` to show the actual error from `callAI` response (e.g., "No AI provider configured") instead of generic "AI analysis failed"
- Show a helpful message directing user to Settings → API Hub

### Step 4: Fix CSV upload feedback
- The CSV upload code looks functional. Ensure the drag-drop zone is clearly visible and the column mapping modal works when no bank account is selected (show validation).

### Step 5: Fix auto-match to handle edge cases
- The auto-match logic in `BankTab.tsx` works but compares `debit+credit` totals which is incorrect — a debit bank txn should match a credit journal line and vice versa. Fix the matching logic.

## Technical Details

**New files:**
- `src/pages/settings/SettingsBankAccountsPage.tsx` — Bank account CRUD with table listing

**Modified files:**
- `src/pages/settings/SettingsPage.tsx` — Add bank accounts card (1 line in Structure group)
- `src/App.tsx` — Add route for `/settings/bank-accounts`
- `src/components/accounts/ReportsTab.tsx` — Fix AI analysis error display (lines 346-348)
- `src/components/accounts/BankTab.tsx` — Fix auto-match amount comparison logic (lines 201-206)

