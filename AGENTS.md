# Aumrti HMS — Agent Context File
## Lovable reads this file automatically every session from GitHub root.

---

## PROJECT IDENTITY

Name: Aumrti Hospital Management System
Version: v9.0
Builder: Lovable.dev + Supabase
Hospital ID: 8f3d08b3-8835-42a7-920e-fdf5a78260bc
Region: ap-south-1 Mumbai (Indian data residency)

---

## STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| State | TanStack Query v5 + Zustand |
| Backend | Supabase PostgreSQL 16 |
| Auth | Supabase Auth + RLS |
| AI | callAI() in src/lib/aiProvider.ts |
| Payments | Razorpay |
| WhatsApp | WATI API |
| Voice | Sarvam Saaras V3 |

---

## DESIGN TOKENS

Primary:     #1A2F5A
Teal:        #0E7B7B
Background:  #F8FAFC
Border:      #E2E8F0
Text:        #0F172A
Muted:       #94A3B8
Danger:      #EF4444
Success:     #10B981
Warning:     #F59E0B
Font UI:     Inter
Font Mono:   JetBrains Mono (UHIDs, barcodes, codes)

---

## MODULES STATUS

### COMPLETE — DO NOT REBUILD

| Route | Module |
|-------|--------|
| /dashboard | CEO Command Center |
| /opd | OPD Queue + Consultation |
| /ipd | IPD Bed Management + Ward Rounds |
| /emergency | Emergency Triage (NEWS2/P1-P4) |
| /nursing | MAR + Handover + Care Plans |
| /ot | Operation Theatre + WHO Checklist |
| /lab | Laboratory LIS |
| /radiology | Radiology RIS + DICOM |
| /pharmacy | IP Dispensing + NDPS |
| /pharmacy/retail | Retail POS |
| /billing | Billing + GST IRN |
| /insurance | TPA/PMJAY Claims |
| /hr | HR + Payroll |
| /inventory | Central Stores + GRN |
| /quality | NABH Quality |
| /analytics | BI Dashboards |
| /portal | Patient Portal PWA |
| /inbox | Communication Inbox |
| /telemedicine | Video Consultation |
| /accounts | Financial Accounting ERP |
| /blood-bank | Blood Bank (ABO hard block) |
| /cssd | CSSD (flash sterilization block) |
| /dialysis | Dialysis (HBV/HCV machine block) |
| /oncology | Oncology (5-step chemo block) |
| /mrd | Medical Records + ICD Coding |
| /modules | All Modules Hub (role-filtered) |
| /settings | Settings Hub + 24 sub-pages |
| /admin/go-live | Go-Live Checklist |

---

## CUSTOM LOGIC — READ BEFORE MODIFYING THESE FILES

### src/components/opd/WalkInModal.tsx
- Has 2-step flow: patient details → payment → token
- Step 2 collects consultation fee BEFORE creating opd_tokens
- Bills INSERT: hospital_id, patient_id, bill_type='opd', bill_number (unique), bill_date
- Pay Later: bill payment_status='pending', token still issued
- DO NOT change the step flow or remove the billing step

### src/components/ipd/tabs/IPDOverviewTab.tsx
- Has 4-step discharge stepper: Medical → Billing → Pharmacy → Summary
- Steps are sequential (N+1 disabled until N complete)
- Reads REAL billing data: bills WHERE admission_id AND payment_status='paid'
- Reads REAL pharmacy data: pharmacy_dispensing WHERE admission_id AND status='pending'
- DO NOT replace stepper with a simple button

### src/components/ipd/IPDWorkspace.tsx
- Initiate Discharge: switches to Overview tab, highlights stepper
- Transfer: opens BedTransferModal, updates admission + both bed statuses
- Escalate: inserts clinical_alerts (severity='critical', type='escalation')
- DO NOT make these buttons show toast-only responses

### src/components/billing/tabs/PaymentsTab.tsx
- After marking bill paid: if bill.admission_id exists → UPDATE admissions SET billing_cleared=true
- DO NOT remove this sync

### src/components/pharmacy/ip/DispensingWorkspace.tsx
- After dispense: auto-creates bills record (bill_type='pharmacy', payment_status='unpaid')
- After all dispensed: UPDATE admissions SET pharmacy_cleared=true
- DO NOT remove bill auto-creation

### src/components/pharmacy/retail/RetailPOS.tsx + RetailCart.tsx
- Phone search shows: spinner → found (green) → not found ([+ Register New Patient])
- Not found: inline form creates patient then links to cart
- Walk-in guest: patient_id = null is valid
- DO NOT require patient_id as mandatory for retail bills

### src/pages/patients/PatientsPage.tsx
- Reads ?id= param on mount → auto-opens PatientDetailDrawer for that patient
- DO NOT remove this deep link behaviour

---

## DATABASE — CRITICAL RELATIONSHIPS

```sql
-- IPD discharge gates (all must be true before final discharge)
admissions.medical_cleared   BOOLEAN
admissions.billing_cleared   BOOLEAN  -- auto-set by PaymentsTab
admissions.pharmacy_cleared  BOOLEAN  -- auto-set by DispensingWorkspace

-- Bill linking
bills.admission_id → admissions.id
bills.patient_id   → patients.id
bills.hospital_id  → hospitals.id (ALWAYS required)
bills.bill_number  TEXT UNIQUE (format: TYPE-YYYYMMDD-XXXX)

-- Safety hard blocks
blood_units: NEVER issue without compatible cross_match_records
dialysis_sessions: machine.machine_type MUST match patient.machine_type_required
chemo_orders: dispensing_allowed=false until ALL 5 v1-v5 flags = true
sterilization_cycles: load_type='flash' requires justification + IC alert

-- Multi-tenant isolation
ALL tables with hospital_id use RLS:
  USING (hospital_id = (SELECT hospital_id FROM users WHERE id = auth.uid()))
```

---

## AI CALLS — ALWAYS USE THIS PATTERN

```typescript
// CORRECT — always use the abstraction layer
import { callAI } from '@/lib/aiProvider'
const result = await callAI({
  featureKey: 'voice_scribe',  // or: icd_coding, ai_digest, appeal_letter
  hospitalId: currentHospitalId,
  prompt: yourPrompt,
  maxTokens: 500
})

// WRONG — never do this in components
import Anthropic from '@anthropic-ai/sdk'
```

---

## ERROR HANDLING — REQUIRED PATTERN

```typescript
// ALWAYS destructure error from Supabase
const { data, error } = await supabase.from('table').select('*')
if (error) {
  console.error('Failed:', error.message)
  toast.error('Failed to load. Please try again.')
  return
}
if (!data || data.length === 0) {
  setItems([])
  return
}
setItems(data)
```

---

## SIDEBAR RULES

- FLAT navigation only — no dropdown submenus
- "⊞ All Modules" link between Dashboard and Patients
- Role-filtered: show only relevant modules per logged-in role
- New modules: add to /modules grid AND sidebar under correct group
- Groups: Clinical | Diagnostics | Surgical | Pharmacy | Finance | Operations | Specialized | Settings

---

## WHEN ADDING A NEW MODULE

1. Run Plan Mode first
2. Prompt A: Tables only → verify in Supabase
3. Prompt B: Page shell → verify loads
4. Prompt C: Logic + hard blocks
5. Add route to App router
6. Add to ALL_MODULES array in /modules page
7. Add to sidebar under correct group
8. Add RLS policy: hospital_id isolation

---

## INDIAN COMPLIANCE RULES

- NDPS: ndps_register immutable (no UPDATE/DELETE policy)
- PCPNDT: Form F required before radiology status → 'reported' for USG
- GST: IRN-locked bills cannot be edited (status='irn_locked')
- DPDP: patient_consents table, consent required before data collection
- NABH: auto-log evidence on: discharge, critical value, 5-rights, incident, hand hygiene
- All dates: DD/MM/YYYY display, store as ISO 8601 in DB
- All currency: ₹ with Indian numbering (1,00,000 not 100,000)

