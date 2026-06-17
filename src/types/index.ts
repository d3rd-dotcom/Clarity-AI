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
  // If true, this step only shows under certain conditions (checked in formStore)
  conditional?: boolean
}
