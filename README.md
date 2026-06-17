# Clarity — Your Eligibility AI

> A benefits guidance tool powered by AI, built for the people who need it most.

**Team:** FluxCore
**Track:** Undergraduate — AI for Life & Work
**Challenge Direction:** Public Services — Fix Systems People Depend On
**Hackathon:** USAII Global AI Hackathon 2026
**Live Demo:** *(paste Vercel URL here)*

---

## The Person Behind This Project

Sarah is a 28-year-old single mother of two in Manchester.
She works part-time at a supermarket because childcare costs make full-time work financially impossible.
She rents a flat. She has heard of Universal Credit but assumed she earns too much to qualify.
She has never heard of Child Benefit as its own separate payment.
Nobody told her.

Every year, stories like Sarah's repeat across the UK — and £24 billion in benefits go unclaimed as a result.

Not because people are lazy.
Because the system was never built for them.

---

## The Problem

The UK benefits system has over 40 benefit types.
Each has its own eligibility page, written in bureaucratic language, cross-referenced with others, and updated without clear notification.

For someone like Sarah, understanding what she qualifies for means:

- Reading 6 to 8 separate government pages
- Decoding legal eligibility language
- Manually calculating income thresholds
- Starting over when she gets confused

Most people give up.
The result is a £24 billion gap between what Parliament allocates and what people actually receive.

Research also shows that showing benefit amounts in weekly or monthly terms instead of annual totals increases claiming rates by 16 to 26 percent.
The money is there. The language is the barrier.

---

## What Clarity Does

Clarity is a benefits guidance tool.
It asks five simple questions, identifies every benefit a person likely qualifies for, explains each one in plain English, and gives them a clear next step — in under two minutes.

It does not replace GOV.UK.
It makes GOV.UK accessible.

### The Five Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What is your current employment situation? | Determines Universal Credit and income support eligibility |
| 2 | Who do you live with? | Determines household benefit combinations |
| 3 | What is your housing situation? | Determines Housing Benefit eligibility |
| 4 | How old are you? | Affects Pension Credit and youth allowance thresholds |
| 5 | Do you or anyone in your household have a health condition or disability? | Determines PIP and Carer's Allowance eligibility |

### What the User Sees

After answering five questions, the user receives:

- A summary card showing the estimated total monthly amount they may be leaving unclaimed
- A list of benefits they likely qualify for, each with a confidence level
- A plain-language explanation of why they may qualify for each benefit
- A step-by-step claim checklist per benefit
- A direct link to the official GOV.UK page to verify and claim

### Example Result

> **Sarah, you may be leaving £1,240 per month unclaimed.**
>
> Universal Credit — £617/month — HIGH confidence
> Child Benefit — £190/month — HIGH confidence
> Housing Benefit — £433/month — MEDIUM confidence

That number — £1,240 per month — is the entire product.
Everything Clarity does exists to produce that number for that specific person.

---

## Benefits Covered

Clarity covers the seven most commonly unclaimed UK benefits in its first version.

| Benefit | Who It Helps | Typical Monthly Value |
|---|---|---|
| Universal Credit | Low income or unemployed | £265 to £617 |
| Child Benefit | Families with children under 16 | ~£190 |
| Housing Benefit | Low-income renters | Varies by area |
| Child Tax Credit | Low-income families with children | Varies |
| Free School Meals | Children in eligible households | ~£500/year per child |
| Personal Independence Payment (PIP) | Long-term health conditions or disability | £125 to £800 |
| Carer's Allowance | 35+ hours per week caring for someone | ~£356 |

All eligibility data is sourced directly from GOV.UK public pages.

---

## How the AI Works (Behind the Scenes)

Clarity is a benefits guidance tool first.
The AI is what makes it work at scale — but it stays in the background.

Here is what happens when a user submits their five answers:

### Step 1 — Situation Summary
The five answers are converted into a plain-language description of the user's situation.
Example: *"Single parent, unemployed, renting privately, age 28, two children, no health conditions."*

### Step 2 — RAG Retrieval
The situation is matched against a knowledge base built from GOV.UK eligibility data using semantic search.
The system retrieves the most relevant eligibility rules for that specific situation.

### Step 3 — AI Reasoning
A large language model reads the retrieved rules alongside the user's situation.
It identifies which benefits the user likely qualifies for, assigns a confidence level to each, and generates a plain-language explanation of why.

### Step 4 — Structured Output
The system returns a prioritized list of benefits with estimated weekly and monthly amounts, a confidence rating, an explanation, a claim checklist, and an official source link.

### What the AI Does Not Decide
The AI does not determine final eligibility.
That decision always belongs to GOV.UK and the relevant government agency.

---

## Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js (React) | 5-question UI, results display |
| Backend | Next.js API Routes | Connects frontend to AI pipeline |
| Embeddings | Cohere embed-english-v3.0 | Converts text into searchable vectors |
| Vector Store | Supabase pgvector | Stores and retrieves GOV.UK eligibility chunks |
| LLM | Cerebras | Fast inference for benefit reasoning and explanation |
| Deployment | Vercel | Live URL for judges and users |
| Data Source | GOV.UK public eligibility pages | Manually structured, openly licensed |

### Data Architecture

GOV.UK eligibility pages for each of the seven benefits are manually structured into JSON chunks covering eligibility rules, payment amounts, claim steps, who does not qualify, and source URL with date.

This produces approximately 28 to 35 chunks total, embedded using Cohere and stored in Supabase pgvector for semantic retrieval.

---

## AI Architecture (USAII Submission Answer)

**Input:** Five user answers covering employment status, household situation, housing type, age, and health or disability status.

**AI Processing:** Answers are converted to a natural-language situation summary, embedded using Cohere, and matched against a RAG knowledge base built from GOV.UK public eligibility data. A large language model processes the retrieved rules alongside the user's situation to assess each benefit, assign a confidence level, and generate a plain-language explanation with estimated amounts and claim steps.

**Output:** A prioritized list of qualifying benefits, estimated weekly and monthly amounts, a confidence rating per benefit, plain-language explanations, and a step-by-step claim checklist.

---

## Human-in-the-Loop Design (USAII Submission Answer)

Clarity does not determine final eligibility.

The AI identifies which benefits a person likely qualifies for and explains them in plain English. Final eligibility is always confirmed by the official GOV.UK system or a human advisor.

A visible "Verify with GOV.UK" button appears on every result. This is by design, not a disclaimer.

Humans must remain in control because benefits involve legal entitlements, personal financial circumstances the AI cannot fully verify, and real-world consequences that require official confirmation.

---

## Responsible AI Guardrail (USAII Submission Answer)

**Risk:** AI may misclassify eligibility for complex cases — overlapping disabilities, non-standard employment, or mixed household situations — causing users to expect benefits they do not qualify for.

**Mitigation:** Every result includes a confidence meter with three levels: HIGH, MEDIUM, and NEEDS REVIEW. Results rated NEEDS REVIEW automatically display the following message:

> *"This result is uncertain. Please verify with an official advisor or GOV.UK before making any financial decisions."*

Low-confidence results are never presented as confirmed eligibility.

---

## Responsible AI — Full Considerations

### Data Accuracy
All eligibility rules are sourced directly from GOV.UK public pages, manually transcribed and dated. Benefit amounts carry a timestamp noting the relevant tax year so users know to verify current rates.

### Harm Identification
- **Misclassification:** Confidence meter and NEEDS REVIEW flag manage cases where the AI is uncertain, particularly for health and disability benefits that require professional assessment.
- **Over-reliance:** Consistent use of "may qualify" and "likely qualifies" language throughout. The verify button is visible on every screen.
- **Outdated amounts:** Every figure is timestamped. Option to upgrade to live GOV.UK data in a future version.
- **Privacy exposure:** No data is stored. Answers are used only within the session to generate the result, then discarded. No account is required.

### Bias Awareness
The knowledge base is built from standard GOV.UK eligibility pages and performs best on common cases. Non-standard employment, complex household arrangements, or immigration-status edge cases are automatically flagged NEEDS REVIEW and routed to human advisors rather than generating a confident but potentially incorrect result.

### Explainability
Every result shows which GOV.UK eligibility rule triggered the match, the confidence level assigned, and a plain-language explanation of why the person may qualify. The AI does not produce a result without showing its reasoning.

---

## Impact

### For One Person
Sarah discovers she may be leaving £1,240 per month unclaimed. She now knows what she qualifies for, why, and how to start the claim. In two minutes. Without reading a single government page.

### For Families Like Hers
The £24 billion unclaimed benefits gap is not a fringe issue. It affects low-income families, single parents, people with disabilities, and carers — the groups Parliament designed these benefits to support.

### At Scale
If Clarity helped just one percent of unclaimed benefits reach the people they were meant for, that would return £240 million annually to the households that need it most.

### For the System
By surfacing eligibility in plain language and routing users to GOV.UK for confirmation, Clarity reduces pressure on Citizens Advice Bureau and similar services while increasing the effectiveness of existing government support.

---

## Future Roadmap

### Near-term (post-hackathon)
- Expand from 7 to all 40+ UK benefits with additional RAG coverage
- Live GOV.UK API integration for real-time benefit amounts
- Document upload — AI explains what each field on a benefits form means

### Long-term vision
- Devolved nations coverage: Scotland, Wales, and Northern Ireland benefit variations
- Multi-country expansion starting with similar systems globally
- Partnerships with Citizens Advice Bureau and social welfare organisations for direct human-handoff routing

---

## Team — FluxCore

| Role | Responsibilities |
|---|---|
| Product and Pitch | Problem research, user story, USAII submission answers, pitch deck, demo script, responsible AI narrative |
| Technical Lead | RAG pipeline, LLM integration, frontend UI, results display, deployment |

---

## Project Structure

```
clarity-eligibility-ai/
├── app/
│   ├── page.tsx              # Landing page
│   ├── assess/
│   │   └── page.tsx          # 5-question intake flow
│   └── results/
│       └── page.tsx          # Benefits results display
├── api/
│   └── assess/
│       └── route.ts          # RAG + LLM pipeline endpoint
├── data/
│   └── benefits/             # GOV.UK eligibility JSON chunks
├── lib/
│   ├── embed.ts              # Cohere embedding logic
│   ├── retrieve.ts           # Supabase vector retrieval
│   └── generate.ts           # Cerebras LLM generation
└── README.md
```

---

## Data Sources

All eligibility data is sourced from GOV.UK public pages under the Open Government Licence.

- gov.uk/universal-credit/eligibility
- gov.uk/child-benefit/eligibility
- gov.uk/housing-benefit/eligibility
- gov.uk/child-tax-credit/eligibility
- gov.uk/apply-free-school-meals
- gov.uk/pip/eligibility
- gov.uk/carers-allowance/eligibility

No private data is collected. No user data is stored. All processing is session-only.

---

## One Last Thing

Clarity is not an AI automation tool.
It is a benefits guidance tool, powered by AI.

The difference matters.

AI should not replace the systems designed to support people.
It should make those systems visible — in plain language, in pounds per month, in two minutes — to the people they were always meant to help.

---

*Clarity — Your Eligibility AI*
*Team FluxCore | USAII Global AI Hackathon 2026*
*Undergraduate Track — AI for Life & Work | Public Services*
