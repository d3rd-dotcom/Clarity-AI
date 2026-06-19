// ─── Intake form types ────────────────────────────────────────────────────────
// These mirror the backend's Zod AssessRequestSchema exactly.
// If you change the backend schema, update these too.

export type EmploymentStatus =
  | 'employed'
  | 'unemployed'
  | 'self_employed'
  | 'unable_to_work'
  | 'carer'

export type HouseholdSituation =
  | 'single'
  | 'couple'
  | 'single_parent'
  | 'couple_with_children'

export type HousingSituation =
  | 'renting_privately'
  | 'mortgage'
  | 'living_with_family'
  | 'social_housing'

export type AgeRange = 'under_25' | '25_to_60' | 'over_60'

export type HealthDisability =
  | 'affects_work'
  | 'affects_daily_life'
  | 'carer_for_someone'
  | 'none'

export interface FormAnswers {
  employment_status: EmploymentStatus | null
  household_situation: HouseholdSituation | null
  housing_situation: HousingSituation | null
  age_range: AgeRange | null
  health_disability: HealthDisability | null
  num_children: number
}

export interface AssessRequest extends Omit<FormAnswers, 'employment_status' | 'household_situation' | 'housing_situation' | 'age_range' | 'health_disability'> {
  employment_status: EmploymentStatus
  household_situation: HouseholdSituation
  housing_situation: HousingSituation
  age_range: AgeRange
  health_disability: HealthDisability
}

// ─── API response types ───────────────────────────────────────────────────────

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW'

export interface BenefitResult {
  name: string
  confidence: ConfidenceLevel
  reason: string
  weekly_estimate: number | null
  monthly_estimate: number | null
  claim_url: string
  gov_rule_reference: string
}

export interface AssessResponse {
  success: boolean
  situation: string
  benefits: BenefitResult[]
  total_weekly_estimate: number
  total_monthly_estimate: number
  disclaimer: string
  data_source: 'live_rag' | 'fallback'
  fallback_note?: string
}

// ─── Health check types ───────────────────────────────────────────────────────

export interface HealthResponse {
  status: 'ok' | 'degraded'
  checks: Record<string, boolean | string>
  timestamp: string
}

// ─── Wizard step types ────────────────────────────────────────────────────────

export interface WizardOption {
  value: string
  label: string
  description: string
  emoji: string
}

export interface WizardStep {
  id: keyof FormAnswers
  question: string
  hint?: string
  options: WizardOption[]
  /**
   * Determines whether this step should be visible, given the current
   * answers. If omitted, the step is always shown.
   *
   * STR-004 fix: this replaces the old `conditional?: boolean` flag, which
   * was declared on the type but never actually read anywhere — the real
   * visibility logic lived separately, hardcoded inside formStore.ts's
   * `visibleSteps` computed (`if (step.id === 'num_children') return
   * hasChildren`). That disconnect meant a developer adding a second
   * conditional step could set `conditional: true` and have it silently do
   * nothing. The predicate now lives directly on the step definition that
   * declares itself conditional, so the "this is conditional" flag and
   * "here is the condition" logic can never drift apart again.
   */
  show?: (answers: FormAnswers) => boolean
}
