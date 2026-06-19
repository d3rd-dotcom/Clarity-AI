# Contributing to Clarity-Eligibility AI

Thanks for digging into the codebase. This guide gets a fresh clone running
end-to-end and explains the parts of the monorepo that aren't obvious from
folder names alone.

## Project layout

This is a two-project monorepo:

```
.
├── backend/     Express + TypeScript RAG pipeline (API)
└── frontend/    Vue 3 + TypeScript wizard UI (was src/ — renamed, see STR-002)
```

They run as two separate processes in development and deploy
independently (backend → Railway/Render, frontend → Vercel) — or together,
if you choose to serve the built frontend as static files from the
backend (see `frontend/README.md` for that option).

## Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project (pgvector storage)
- API keys for:
  - [Cohere](https://dashboard.cohere.com) — embeddings + rerank (free trial tier works, no card needed)
  - [Cerebras](https://cloud.cerebras.ai) — primary LLM (free tier, 1M tokens/day)
  - [Groq](https://console.groq.com) — fallback LLM (free tier)

## First-time setup (do this once)

### 1. Create the Supabase table and RPC function

In your Supabase project: **SQL Editor → New query** → paste the contents
of `backend/setup.sql` → **Run**. This enables `pgvector`, creates the
`benefit_chunks` table, the `match_benefit_chunks` similarity-search
function, and locks the table down with Row Level Security (service-role
key only — the anon key is never used by this project).

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in all six values:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API
- `COHERE_API_KEY`
- `CEREBRAS_API_KEY`
- `GROQ_API_KEY`
- `INDEX_SECRET` — any random string, e.g.
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

In **production**, also set `FRONTEND_URL` to your deployed frontend's
origin. The server refuses to boot in production without it (SEC-002) —
this is intentional, to prevent the API silently falling back to a
placeholder CORS origin that nothing actually serves from.

### 3. Install backend dependencies and seed the knowledge base

```bash
npm install
npm run seed
```

Wait for `✅ Seeding complete! benefit_chunks table now has 35 rows.` This
reads every benefit JSON file in `backend/data/benefits/`, embeds each
chunk via Cohere, and stores the result in Supabase. You only need to run
this once per Supabase project — re-run it any time you edit the benefit
data files (see "Updating benefit data" below).

### 4. Configure the frontend

```bash
cd ../frontend
cp .env.example .env.local
```

Leave `VITE_API_URL` empty for local dev — Vite proxies `/api/*` to
`localhost:3001` automatically (see `frontend/vite.config.ts`).

### 5. Install frontend dependencies

```bash
npm install
```

## Running locally (two terminals)

```bash
# Terminal 1 — backend → http://localhost:3001
cd backend && npm run dev

# Terminal 2 — frontend → http://localhost:5173
cd frontend && npm run dev
```

Open `http://localhost:5173`. The `HealthIndicator` dot in the wizard
header turns green once the frontend can reach `GET /api/health`.

## The wizard, briefly

The intake form asks 5 required questions (employment status, household,
housing, age range, health/disability) plus a 6th *conditional* question —
"how many children?" — that only appears when the household answer
implies children (`single_parent` or `couple_with_children`).

This conditionality is implemented as a `show` predicate directly on the
step definition in `frontend/stores/formStore.ts` (see STR-004) rather
than being hardcoded separately in the visibility computed property. If
you add another conditional step in future, follow that same pattern —
attach a `show(answers)` function to the step itself, don't add a second
`if` branch elsewhere.

## Demo / fallback profiles

If the live RAG pipeline fails for any reason — embedding error, retrieval
error, LLM timeout, or zero chunks retrieved — the backend serves one of
three pre-verified fallback profiles instead of erroring. See
`backend/data/fallbacks/demo-profiles.json` and `buildFallback()` in
`backend/api/assess.ts`. Useful for manually exercising each path:

| Profile | Trigger condition | Situation | Returns |
|---|---|---|---|
| **A** | `household_situation` is `single_parent`/`couple_with_children`, or `num_children > 0` | Single parent, unemployed, 2 children, renting | Universal Credit + Child Benefit + Free School Meals |
| **B** | Everything else | Couple, one partner employed part-time, no children, renting | Universal Credit (means-tested) |
| **C** | `health_disability` is `affects_work` or `affects_daily_life` | Single, unable to work, renting | Universal Credit (LCWRA) + PIP |

## Protected re-indexing endpoint

`POST /api/index` re-embeds all benefit JSON files and replaces the
Supabase table contents. It's protected by the `x-index-secret` header
(must match `INDEX_SECRET` in your `.env`, compared with a constant-time
check per SEC-003) and rate-limited to 5 calls/hour. You generally won't
need this locally — `npm run seed` covers first-time setup — but it's how
you re-index a deployed environment without shell access:

```bash
curl -X POST https://your-backend.example.com/api/index \
     -H "x-index-secret: $INDEX_SECRET"
```

## Running tests

```bash
# Backend — situationBuilder, generate/parseAssessmentJSON
cd backend && npx vitest run

# Frontend — formStore, claimChecklists
cd frontend && npx vitest run
```

`.github/workflows/ci.yml` runs type-checking, tests, a production build,
and `npm audit --audit-level=high` for both projects on every push and
pull request.

## Updating benefit data

Benefit eligibility rules, payment amounts, and claim steps live in
`backend/data/benefits/*.json`. UK benefit rates typically change every
April. See `backend/data/VERIFY.md` for the annual review checklist and
the specific GOV.UK pages to check.

**Editing the JSON files alone does not update what the live app
returns.** The RAG pipeline serves embeddings stored in Supabase, not the
files directly — after any edit, re-run `npm run seed` locally, or hit the
protected `POST /api/index` endpoint in a deployed environment.

Claim-process details (phone numbers, opening hours, form names) live
separately in `frontend/data/claimChecklists.ts`, each now carrying its
own `source_url` and `last_verified` date (DOC-003) — these change on
their own schedule, independent of the April benefit-rate uprating.

## Code style notes

- **Shared clients**: lazily-initialised Cohere/Supabase clients live in
  `backend/lib/clients.ts` (`getCohere()`, `getSupabase()`). Import from
  there rather than instantiating a new SDK client in a route handler —
  this was previously duplicated across `embed.ts`, `retrieve.ts`, and
  `health.ts` (SEC-005, CQ-004).
- **Shared indexing logic**: `backend/lib/indexer.ts` (`indexBenefitData()`)
  is the single implementation of "read benefit JSON → embed → upsert to
  Supabase." Both `seed.ts` and `api/index.ts` call into it rather than
  maintaining two copies of the same pipeline (CQ-001).
- **Never log raw user input.** `situationText` and the free-text answers
  it's built from must never reach `console.log`/`console.error` — see
  SEC-001. Health and disability data is special-category personal data
  under UK GDPR.
- **Never use `v-html` on API or AI-generated strings** in the frontend.
  Vue's default `{{ }}` interpolation auto-escapes, which is what keeps
  the results view XSS-safe by design rather than by accident.

## Questions

Open an issue, or ping the team in the hackathon Slack channel.
