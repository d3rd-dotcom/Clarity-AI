// Static step-by-step claim checklists per benefit.
// Sourced from GOV.UK eligibility pages. Verify these periodically.
// The API response doesn't return claim steps, so we maintain them here.

export interface ChecklistStep {
  id: string
  text: string
}

export const CLAIM_CHECKLISTS: Record<string, ChecklistStep[]> = {
  'Universal Credit': [
    { id: 'uc-1', text: 'Create a Universal Credit online account at gov.uk/apply-universal-credit' },
    { id: 'uc-2', text: 'Verify your identity — you can do this online or at a Jobcentre Plus' },
    { id: 'uc-3', text: 'Complete your Claimant Commitment with your work coach' },
    { id: 'uc-4', text: 'Your first payment arrives around 5 weeks after you apply' },
    { id: 'uc-5', text: 'If you need money sooner, ask for an Advance Payment to cover the wait' },
  ],
  'Child Benefit': [
    { id: 'cb-1', text: "Claim online at gov.uk/child-benefit or complete form CH2" },
    { id: 'cb-2', text: "You'll need your child's birth certificate or adoption papers" },
    { id: 'cb-3', text: "Claims can be backdated up to 3 months — claim as soon as possible" },
    { id: 'cb-4', text: "Payments usually begin within 3 weeks of a completed claim" },
  ],
  'Housing Benefit': [
    { id: 'hb-1', text: "If you are working age, claim housing costs through Universal Credit — not Housing Benefit" },
    { id: 'hb-2', text: "If you are State Pension age or in supported accommodation, contact your local council" },
    { id: 'hb-3', text: "You'll need proof of identity, your tenancy agreement, and income/savings details" },
  ],
  'Personal Independence Payment (PIP)': [
    { id: 'pip-1', text: "Call the PIP claim line on 0800 917 2222 (Mon–Fri, 8am–6pm) to start your claim" },
    { id: 'pip-2', text: "You'll be sent a PIP2 form — complete it with detailed examples of how your condition affects you" },
    { id: 'pip-3', text: "You may be invited to a face-to-face or telephone health assessment" },
    { id: 'pip-4', text: "Decisions can take 4–6 months — keep a diary of bad days to support your claim" },
  ],
  "Carer's Allowance": [
    { id: 'ca-1', text: "Apply online at gov.uk/carers-allowance/how-to-claim" },
    { id: 'ca-2', text: "You'll need your National Insurance number and the NI number of the person you care for" },
    { id: 'ca-3', text: "You'll need details of the disability benefit the person you care for receives" },
    { id: 'ca-4', text: "Decisions are usually made within 3 weeks" },
  ],
  'Child Tax Credit': [
    { id: 'ctc-1', text: "New claimants cannot start a new Child Tax Credit claim — apply for Universal Credit instead" },
    { id: 'ctc-2', text: "If you are an existing claimant, renew your claim each year by the deadline on your renewal pack" },
    { id: 'ctc-3', text: "Contact HMRC Tax Credits on 0345 300 3900 for help with your claim" },
  ],
  'Free School Meals': [
    { id: 'fsm-1', text: "Contact your child's school or apply through your local council's website" },
    { id: 'fsm-2', text: "Provide details of the benefit you receive, such as your Universal Credit award notice" },
    { id: 'fsm-3', text: "Your school or local council will check your eligibility and confirm quickly" },
  ],
}

// Normalised lookup map to make lookups case-insensitive and trim whitespace.
const NORMALISED_CHECKLISTS: Map<string, ChecklistStep[]> = new Map()
for (const key of Object.keys(CLAIM_CHECKLISTS)) {
  NORMALISED_CHECKLISTS.set(key.toLowerCase().trim(), CLAIM_CHECKLISTS[key])
}

// Fallback for any benefit not in the list
export const DEFAULT_CHECKLIST: ChecklistStep[] = [
  { id: 'default-1', text: 'Visit the GOV.UK claim page linked above to start your claim' },
  { id: 'default-2', text: 'Have proof of identity, income, and any relevant benefit letters ready' },
  { id: 'default-3', text: 'Consider contacting Citizens Advice (citizensadvice.org.uk) for free guidance' },
]

export function getChecklist(benefitName: string): ChecklistStep[] {
  if (!benefitName) return DEFAULT_CHECKLIST
  const normalized = benefitName.toLowerCase().trim()
  return NORMALISED_CHECKLISTS.get(normalized) ?? DEFAULT_CHECKLIST
}
