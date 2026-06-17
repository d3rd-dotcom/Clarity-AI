# Clarity-Eligibility Frontend

Vue 3 + Vite + TypeScript + Tailwind v4 — UK Benefits Eligibility Navigator

---

## Zero to Running in 4 Steps

### Step 1 — Install

```bash
cd clarity-eligibility-frontend
npm install
```

### Step 2 — Configure

```bash
cp .env.example .env.local
```

Leave `VITE_API_URL` empty for local dev (Vite proxies `/api` to your backend on port 3001 automatically).

### Step 3 — Make sure the backend is running

```bash
# In a separate terminal:
cd clarity-eligibility-backend
npm run dev
# → Running on http://0.0.0.0:3001
```

### Step 4 — Start the frontend

```bash
npm run dev
# → http://localhost:5173
```

---

## Build for Production

```bash
npm run build
# Outputs to dist/
```

Then either:

**Option A — Same server (Express serves the frontend)**

Copy `dist/` to your backend, then add these 2 lines to your backend's `server.ts`:

```typescript
import path from 'path'

// After all /api routes, before app.listen():
app.use(express.static(path.join(process.cwd(), 'dist')))
app.get('*', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'))
})
```

**Option B — Separate deploy (Vercel frontend + Railway backend)**

1. Deploy backend to Railway, get its URL (e.g. `https://clarity-backend.railway.app`)
2. Set `VITE_API_URL=https://clarity-backend.railway.app` in Vercel environment variables
3. Update backend CORS to allow your Vercel domain (add `FRONTEND_URL` to backend `.env`)
4. Deploy frontend to Vercel — it reads from the built static files

---

## File Structure

```
src/
├── style.css                     ← Design tokens (Tailwind v4 @theme)
├── main.ts                       ← App entry point
├── App.vue                       ← Root component, health check on mount
├── router.ts                     ← 3 routes: / /check /results
├── types/
│   └── index.ts                  ← All TypeScript types
├── stores/
│   ├── formStore.ts              ← Wizard steps, answers, navigation
│   └── resultsStore.ts           ← API response, loading, error
├── composables/
│   ├── useAssess.ts              ← POST /api/assess
│   └── useHealth.ts              ← GET /api/health (cached singleton)
├── data/
│   └── claimChecklists.ts        ← Static step-by-step claim guides
├── components/
│   ├── ui/
│   │   ├── LogoMark.vue          ← Cupped hands SVG (inline)
│   │   ├── HealthIndicator.vue   ← Status dot
│   │   ├── LoadingScreen.vue     ← Full-screen during API call
│   │   └── ErrorScreen.vue       ← Network failure state
│   ├── form/
│   │   ├── ProgressDots.vue      ← Step X of Y
│   │   ├── OptionCard.vue        ← Large tap-target answer card
│   │   └── WizardNav.vue         ← Back / Next / Submit
│   └── results/
│       ├── MoneyCard.vue         ← The wow moment — total unclaimed
│       ├── BenefitCard.vue       ← One per benefit in response
│       ├── ConfidenceBadge.vue   ← HIGH / MEDIUM / NEEDS_REVIEW
│       ├── ClaimChecklist.vue    ← Step-by-step claim guide
│       ├── FallbackBanner.vue    ← Shown when data_source = "fallback"
│       └── Disclaimer.vue        ← Always shown at bottom of results
└── views/
    ├── HomeView.vue              ← Landing page
    ├── WizardView.vue            ← 6-step wizard
    └── ResultsView.vue           ← Results + loading + error states
```

---

## Design Decisions

**Colours**
- `brand-gold` (#F0A500) — logo gold. Backgrounds and accents only, never as text on white (fails WCAG contrast).
- `brand-gold-dark` (#C47D00) — for gold text on white (4.7:1 contrast ✓)
- `warm-50` (#FDFAF6) — page background. Warm, not clinical.
- `ink` (#1C1A17) — primary text. Near-black with a warm tint.

**Accessibility (WCAG 2.1 AA)**
- Focus moves to question heading on every wizard step change (screen readers follow automatically)
- Option cards use `role="radiogroup"` + `role="radio"` semantics
- Confidence levels shown with colour AND text — never colour alone
- `aria-live` regions for loading state and error messages
- All touch targets ≥ 56px height (exceeds 44px minimum)
- `prefers-reduced-motion` respected — all animations disabled

**The signature element**
The `MoneyCard` — gold background, Georgia display typeface, entrance animation, cupped-hands logo mark. The only animated element in the entire app. Everything else is still.

---

## ⚠️ Important Notes

1. **Never use `v-html` on API response data** — the LLM's strings go into `{{ }}` template interpolation, which Vue auto-escapes. XSS safe.

2. **No localStorage** — answers exist in Pinia only for the session. Pinia resets on page refresh. This matches the backend's "no data stored" promise.

3. **Benefit amounts in `claimChecklists.ts`** — verify these against GOV.UK before the demo submission.

4. **`num_children` step is conditional** — it only appears in the wizard if `household_situation` is `single_parent` or `couple_with_children`. The `formStore.visibleSteps` computed handles this automatically.
