

## Dental Module (/dental) — Implementation Plan

### Overview
Build a complete dental module with an interactive FDI tooth chart as centerpiece, periodontal charting, treatment planning, and lab order management. Uses existing `dental_charts`, `periodontal_charts`, `dental_treatment_plans`, and `dental_lab_orders` tables.

### Architecture
- **Page**: `src/pages/dental/DentalPage.tsx` — split-panel layout (280px patient list + workspace)
- **Components** (6 new files in `src/components/dental/`):
  - `FDIToothChart.tsx` — Interactive SVG tooth chart (32 permanent teeth, FDI numbering)
  - `ToothSVG.tsx` — Single tooth component with 5 clickable triangular surface segments (M/D/B/L/O)
  - `PeriodontalTab.tsx` — Fast keyboard-entry grid for probing depths + auto-diagnosis
  - `TreatmentPlanTab.tsx` — Treatment plan builder with billing integration
  - `LabOrdersTab.tsx` — Dental lab order management (crown/bridge/denture tracking)
  - `ToothChartTab.tsx` — Wrapper tab combining FDIToothChart + oral hygiene section + save

### Key Technical Details

**Interactive FDI Tooth Chart (`FDIToothChart.tsx` + `ToothSVG.tsx`)**
- Each tooth rendered as an SVG square divided into 5 triangular segments (Mesial, Distal, Buccal, Lingual, Occlusal)
- Layout: 4 quadrants — UR(18-11) | UL(21-28) | LR(48-41) | LL(31-38)
- Click any surface segment → modal to set status (Normal/Caries/Filling/Crown/RCT/Missing/Implant)
- Colour coding: white=healthy, red=caries, blue=filling, gold=crown, pink=RCT, grey=missing, green=implant, orange=bridge
- Chart data stored as JSONB in `dental_charts.chart_data`
- Legend bar below chart

**Periodontal Tab**
- Grid: 32 rows (teeth) x columns for Buccal D/M/C probe + BOP, Palatal D/M/C + BOP
- Tab-key navigation for fast entry
- Colour: white (1-3mm), amber (4-5mm), red (6mm+)
- Auto-calculates plaque/bleeding index and suggests diagnosis
- Saves to `periodontal_charts` table

**Treatment Plan Tab**
- Add items: tooth number, procedure (from predefined list), priority, cost, sessions
- Table view with status tracking (Planned → In Progress → Completed)
- Patient consent toggle with date
- When item marked Completed → auto-creates bill line item via `bills` table insert

**Lab Orders Tab**
- CRUD for dental lab orders (crown, bridge, denture, etc.)
- Status workflow: Ordered → In Lab → Ready → Delivered

### Routing & Navigation Changes
- **`src/App.tsx`**: Add `/dental` route inside AppShell
- **`src/lib/modules.ts`**: Add Dental module under "Specialized" category with roles `["dentist", "super_admin"]`

### Files Created (7)
1. `src/pages/dental/DentalPage.tsx`
2. `src/components/dental/ToothSVG.tsx`
3. `src/components/dental/FDIToothChart.tsx`
4. `src/components/dental/ToothChartTab.tsx`
5. `src/components/dental/PeriodontalTab.tsx`
6. `src/components/dental/TreatmentPlanTab.tsx`
7. `src/components/dental/LabOrdersTab.tsx`

### Files Modified (2)
1. `src/App.tsx` — add route
2. `src/lib/modules.ts` — add module definition

### No Database Changes
All tables already exist from the previous migration.

