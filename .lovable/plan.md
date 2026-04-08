

## Fix: Ward Rate Sync + IPD Room Charge Auto-Calculation

### Problem 1: Rate Per Day not loading on Edit Ward
The wards query in `SettingsWardsPage.tsx` (line 37) selects only `id, name, type, total_beds, is_active` — it does NOT include `rate_per_day`. When you click Edit Ward, the rate field is always empty even if it was saved previously.

### Problem 2: IPD billing ignores ward rate_per_day
In `BillingPage.tsx` (line 344), room charges use a `service_master` lookup and fall back to a hardcoded ₹500/day. The ward's actual `rate_per_day` column is never queried.

---

### Fix Plan

#### File 1: `src/pages/settings/SettingsWardsPage.tsx`

**Change A** (line 37): Add `rate_per_day` to the wards select query:
```
"id, name, type, total_beds, is_active, rate_per_day"
```

**Change B** (line 100): When rate is 0 or cleared, explicitly set it to 0 instead of skipping:
```typescript
updatePayload.rate_per_day = rate;  // always sync, even if 0
```

#### File 2: `src/pages/billing/BillingPage.tsx`

**Change** (lines 320-357): After fetching the admission with ward data, also fetch `rate_per_day` from the ward. Use it as the primary rate, falling back to `service_master` and then ₹500.

Updated logic:
```
1. Fetch admission with ward join (add rate_per_day to wards select)
2. wardRate = ward.rate_per_day (from DB)
3. If wardRate > 0, use it as ratePerDay
4. Else, try service_master lookup
5. Else, fallback to ₹500
```

Specifically, change the wards join at line 322 from:
```
wards(name, ward_type)
```
to:
```
wards(name, ward_type, rate_per_day)
```

Then at line 344, change the rate logic:
```typescript
const wardDbRate = Number((admission as any).wards?.rate_per_day) || 0;
const ratePerDay = wardDbRate > 0 ? wardDbRate : (roomRate?.fee ? Number(roomRate.fee) : 500);
```

This ensures the ward's configured rate is used first, service_master second, hardcoded last.

---

### Files Changed
1. `src/pages/settings/SettingsWardsPage.tsx` — fetch `rate_per_day` in query + always sync on save
2. `src/pages/billing/BillingPage.tsx` — use ward `rate_per_day` for IPD room charges

