

## HMS Platform v9.0 — Global Design System

### Overview
Replace the default shadcn color palette with the HMS clinical design system. Add Inter font, custom semantic colors, and create a `/design-system` showcase page.

### 1. Update `index.html`
- Add Google Fonts link for Inter (weights 400, 500, 600, 700)

### 2. Update `src/index.css`
- Convert all specified hex colors to HSL and set as CSS custom variables:
  - `--primary`: #1A2F5A → 220 54% 23%
  - `--secondary` (teal): #0E7B7B → 180 80% 27%
  - `--accent`: #F59E0B → 38 92% 50%
  - `--success`: #10B981 → 160 84% 39%
  - `--destructive`: #EF4444 → 0 84% 60%
  - `--background`: #F0F4F8 → 210 33% 96%
  - `--card`/`--surface`: #FFFFFF → 0 0% 100%
  - `--foreground`: #1E293B → 215 28% 17%
  - `--muted-foreground`: #64748B → 215 16% 47%
  - `--sidebar-background`: #1A2F5A (deep navy sidebar)
- Set `font-family: 'Inter', sans-serif` on body
- Set base font-size 14px, line-height 1.6
- Add global styles: no scrollbar on content area, card/button/input border-radius overrides
- Set `--radius: 0.5rem` (8px for cards)

### 3. Update `tailwind.config.ts`
- Add `hms-teal`, `hms-amber`, `hms-success` semantic color tokens
- Add `fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans] }`
- Add custom `boxShadow: { card: '0 1px 3px rgba(0,0,0,0.08)' }`

### 4. Update `src/App.css`
- Remove default Vite boilerplate styles (logo-spin, .card, .read-the-docs)

### 5. Create `src/pages/DesignSystem.tsx`
- Showcase page at `/design-system` displaying:
  - Color palette swatches (all 9 colors with hex + name)
  - Typography scale (h1-h4, body, muted, small)
  - Buttons (all variants: primary, secondary/teal, outline, ghost, destructive, accent)
  - Inputs, badges, cards, alerts
  - Layout spec reference (sidebar 240px, header 56px, content rules)
- All rendered using existing shadcn components with the new theme

### 6. Update `src/App.tsx`
- Add route `/design-system` → DesignSystem page

### Files Modified
- `index.html` — Inter font
- `src/index.css` — CSS variables, base styles
- `tailwind.config.ts` — semantic colors, font, shadow
- `src/App.css` — clean up
- `src/App.tsx` — new route
- `src/pages/DesignSystem.tsx` — new showcase page

