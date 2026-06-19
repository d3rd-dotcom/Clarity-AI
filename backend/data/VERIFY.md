# Benefit Data Verification Guide

This file documents the process for keeping `backend/data/benefits/*.json`
accurate. UK benefit rates are reviewed by the Treasury every autumn and
new rates typically take effect **the following April** — so this file
should be the first thing checked each spring, and any time a person
reports a figure that looks wrong.

## Current data vintage

All seven benefit files currently carry `"last_updated": "2025-04-01"` —
i.e. the April 2025 uprating. **Treat any date older than ~11 months as
stale** and prioritise re-verifying it (see "Automated staleness check"
below).

## Annual review checklist (do this every April)

For each benefit file, open the corresponding GOV.UK page, compare the
`payment_amounts` chunk against the live figures, and update both the
`content` string and the file's `last_updated` field if anything changed.

| Benefit | File | GOV.UK source to check |
|---|---|---|
| Universal Credit | `universal-credit.json` | https://www.gov.uk/universal-credit/what-youll-get |
| Child Benefit | `child-benefit.json` | https://www.gov.uk/child-benefit/what-youll-get |
| Housing Benefit | `housing-benefit.json` | https://www.gov.uk/housing-benefit/what-youll-get |
| Child Tax Credit | `child-tax-credit.json` | https://www.gov.uk/child-tax-credit/what-youll-get |
| Free School Meals | `free-school-meals.json` | https://www.gov.uk/apply-free-school-meals |
| Personal Independence Payment (PIP) | `pip.json` | https://www.gov.uk/pip/what-youll-get |
| Carer's Allowance | `carers-allowance.json` | https://www.gov.uk/carers-allowance/what-youll-get |

Also worth checking outside the April cycle, since these change on their
own schedules:

- **Eligibility thresholds** — e.g. the £7,400 / £16,190 income limits for
  Free School Meals, the £16,000 savings limit for Universal Credit. Check
  the `/eligibility` page for each benefit, not just `/what-youll-get`.
- **Claim process details** in `frontend/data/claimChecklists.ts` (phone
  numbers, opening hours, form names, processing times). These aren't tied
  to the April uprating cycle and can change at any time — each entry now
  carries its own `source_url` and `last_verified` date (DOC-003), so
  check those dates independently of this file's checklist.

## After editing a benefit JSON file

Editing the JSON files alone does **not** change what the live app
returns — the RAG pipeline serves embeddings already stored in Supabase,
not the files directly. After any edit:

```bash
cd backend
npm run seed
```

This re-embeds every chunk via Cohere and replaces the `benefit_chunks`
table contents. In a deployed environment without shell access, use the
protected re-index endpoint instead (see `CONTRIBUTING.md`):

```bash
curl -X POST https://your-backend.example.com/api/index \
     -H "x-index-secret: $INDEX_SECRET"
```

## Automated staleness check (recommended follow-up — not yet implemented)

`GET /api/health` could read each benefit file's `last_updated` field and
flag a warning if any file is older than 11 months:

```ts
const staleThreshold = new Date()
staleThreshold.setMonth(staleThreshold.getMonth() - 11)

checks.benefit_data_fresh = benefitFiles.every(
  (f) => new Date(f.last_updated) > staleThreshold
)
```

This would surface staleness proactively — in a monitoring dashboard, or
as a failing health check judges/ops could notice — instead of relying on
someone remembering to open this file every April.

## Why this matters

The product's entire value proposition is a specific number — "you may be
leaving £X/month unclaimed." Showing a stale or wrong figure isn't a
cosmetic bug; it's giving someone inaccurate information they might act on
financially. Every result screen already carries a disclaimer pointing
users to GOV.UK to verify, but that disclaimer is a safety net, not a
substitute for keeping the underlying data current.
