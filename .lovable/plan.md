

## UX Fix — Unsaved Consultation Data Navigation Guard

### Problem
Doctors lose unsaved consultation data when accidentally navigating away or closing the browser tab mid-consultation.

### Changes

**File: `src/components/opd/ConsultationWorkspace.tsx`**

1. Add `isDirtyRef = useRef(false)` alongside existing refs (line ~103)

2. Set `isDirtyRef.current = true` inside `updateEncounter` (line 309) and `updatePrescription` (line 318) — these are the debounced update functions called whenever data changes

3. Set `isDirtyRef.current = false` after successful auto-save in `autoSaveEncounter` (line 271, after `setSaved(true)`) and `autoSavePrescription` (after successful upsert, line ~302)

4. Reset `isDirtyRef.current = false` when token changes and data is loaded fresh (line ~176, inside the token change useEffect)

5. Add `beforeunload` event listener useEffect — warns on browser close/refresh when dirty

6. Add `useBlocker` from react-router-dom v6.30 to block in-app navigation when dirty. React Router 6.30 supports `useBlocker` (stable). The blocker shows `window.confirm()` dialog:

```typescript
import { useBlocker } from "react-router-dom";

useBlocker(({ currentLocation, nextLocation }) => {
  return isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname;
});
```

When blocked, show a `window.confirm` prompt. If confirmed, allow navigation; if cancelled, stay.

### Technical Details
- `isDirtyRef` is a ref (not state) to avoid re-renders on every keystroke
- The existing auto-save debounce is 2 seconds — dirty flag clears after save completes
- `useBlocker` is stable in react-router-dom v6.4+ (this project uses v6.30)
- Only this one file is modified
- No changes to existing save logic, tab structure, or component behavior

