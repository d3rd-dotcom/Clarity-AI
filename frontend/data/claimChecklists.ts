// Static step-by-step claim checklists per benefit.
// Sourced from GOV.UK eligibility pages. Verify these periodically.
// The API response doesn't return claim steps, so we maintain them here.
//
// DOC-003 fix: unlike the backend benefit JSON files (which carry gov_url
// and last_updated), these claim-process steps previously had no source
// attribution or verification date — yet they describe exactly the kind
// of detail that changes without notice (phone numbers, opening hours,
// form names, waiting times). Each entry now carries `source_url` and
// `last_verified`. `getChecklist()` keeps returning a plain steps array
// for backward compatibility with existing callers (ClaimChecklist.vue,
// the existing test suite); use `getChecklistEntry()` when the source/date
// metadata itself is needed (e.g. an admin review view).

export interface ChecklistStep {
  id: string
  text: string
}

export interface ChecklistEntry {
  steps: ChecklistStep[]
  source_url: string
  last_verified: string // ISO date (YYYY-MM-DD)
}

export const CLAIM_CHECKLISTS: Record<string, ChecklistEntry> = {
  'Universal Credit': {
    steps: [
      { id: 'uc-1', text: 'Create a Universal Credit online account at gov.uk/apply-universal-credit' },
      { id: 'uc-2', text: 'Verify your identity — you can do this online or at a Jobcentre Plus' },
      { id: 'uc-3', text: 'Complete your Claimant Commitment with your work coach' },
      { id: 'uc-4', text: 'Your first payment arrives around 5 weeks after you apply' },
      { id: 'uc-5', text: 'If you need money sooner, ask for an Advance Payment to cover the wait' },
    ],
    source_url: 'https://www.gov.uk/universal-credit/how-to-claim',
    last_verified: '2025-04-01',
  },
  'Child Benefit': {
    steps: [
      { id: 'cb-1', text: 'Claim online at gov.uk/child-benefit or complete form CH2' },
      { id: 'cb-2', text: "You'll need your child's birth certificate or adoption papers" },
      { id: 'cb-3', text: 'Claims can be backdated up to 3 months — claim as soon as possible' },
      { id: 'cb-4', text: 'Payments usually begin within 3 weeks of a completed claim' },
    ],
    source_url: 'https://www.gov.uk/child-benefit/how-to-claim',
    last_verified: '2025-04-01',
  },
  'Housing Benefit': {
    steps: [
      { id: 'hb-1', text: 'If you are working age, claim housing costs through Universal Credit — not Housing Benefit' },
      { id: 'hb-2', text: 'If you are State Pension age or in supported accommodation, contact your local council' },
      { id: 'hb-3', text: "You'll need proof of identity, your tenancy agreement, and income/savings details" },
    ],
    source_url: 'https://www.gov.uk/housing-benefit/how-to-claim',
    last_verified: '2025-04-01',
  },
  'Personal Independence Payment (PIP)': {
    steps: [
      { id: 'pip-1', text: 'Call the PIP claim line on 0800 917 2222 (Mon–Fri, 8am–6pm) to start your claim' },
      { id: 'pip-2', text: "You'll be sent a PIP2 form — complete it with detailed examples of how your condition affects you" },
      { id: 'pip-3', text: 'You may be invited to a face-to-face or telephone health assessment' },
      { id: 'pip-4', text: 'Decisions can take 4–6 months — keep a diary of bad days to support your claim' },
    ],
    source_url: 'https://www.gov.uk/pip/how-to-claim',
    last_verified: '2025-04-01',
  },
  "Carer's Allowance": {
    steps: [
      { id: 'ca-1', text: 'Apply online at gov.uk/carers-allowance/how-to-claim' },
      { id: 'ca-2', text: "You'll need your National Insurance number and the NI number of the person you care for" },
      { id: 'ca-3', text: "You'll need details of the disability benefit the person you care for receives" },
      { id: 'ca-4', text: 'Decisions are usually made within 3 weeks' },
    ],
    source_url: 'https://www.gov.uk/carers-allowance/how-to-claim',
    last_verified: '2025-04-01',
  },
  'Child Tax Credit': {
    steps: [
      { id: 'ctc-1', text: 'New claimants cannot start a new Child Tax Credit claim — apply for Universal Credit instead' },
      { id: 'ctc-2', text: 'If you are an existing claimant, renew your claim each year by the deadline on your renewal pack' },
      { id: 'ctc-3', text: 'Contact HMRC Tax Credits on 0345 300 3900 for help with your claim' },
    ],
    source_url: 'https://www.gov.uk/child-tax-credit/how-to-claim',
    last_verified: '2025-04-01',
  },
  'Free School Meals': {
    steps: [
      { id: 'fsm-1', text: "Contact your child's school or apply through your local council's website" },
      { id: 'fsm-2', text: 'Provide details of the benefit you receive, such as your Universal Credit award notice' },
      { id: 'fsm-3', text: 'Your school or local council will check your eligibility and confirm quickly' },
    ],
    source_url: 'https://www.gov.uk/apply-free-school-meals',
    last_verified: '2025-04-01',
  },
}

// Normalised lookup map to make lookups case-insensitive and trim whitespace.
const NORMALISED_CHECKLISTS: Map<string, ChecklistEntry> = new Map()
for (const key of Object.keys(CLAIM_CHECKLISTS)) {
  NORMALISED_CHECKLISTS.set(key.toLowerCase().trim(), CLAIM_CHECKLISTS[key])
}

// Fallback for any benefit not in the list
const DEFAULT_ENTRY: ChecklistEntry = {
  steps: [
    { id: 'default-1', text: 'Visit the GOV.UK claim page linked above to start your claim' },
    { id: 'default-2', text: 'Have proof of identity, income, and any relevant benefit letters ready' },
    { id: 'default-3', text: 'Consider contacting Citizens Advice (citizensadvice.org.uk) for free guidance' },
  ],
  source_url: 'https://www.gov.uk/browse/benefits',
  last_verified: '2025-04-01',
}

export const DEFAULT_CHECKLIST: ChecklistStep[] = DEFAULT_ENTRY.steps

/**
 * Returns just the ordered claim steps for a benefit. Kept as the primary
 * export for backward compatibility — existing callers (ClaimChecklist.vue,
 * the pre-existing test suite) expect a plain ChecklistStep[] shape.
 */
export function getChecklist(benefitName: string): ChecklistStep[] {
  return getChecklistEntry(benefitName).steps
}

/**
 * Returns the full checklist entry — steps plus source attribution and
 * last-verified date (DOC-003). Use this wherever the source/staleness
 * metadata itself needs to be surfaced, e.g. an internal review screen or
 * a "verified as of" label.
 */
export function getChecklistEntry(benefitName: string): ChecklistEntry {
  if (!benefitName) return DEFAULT_ENTRY
  const normalized = benefitName.toLowerCase().trim()
  return NORMALISED_CHECKLISTS.get(normalized) ?? DEFAULT_ENTRY
}
