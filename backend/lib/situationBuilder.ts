import type { AssessRequest } from "../middleware/validate.js";

// ─── Maps enum values → readable English ────────────────────────────────────

const EMPLOYMENT_MAP: Record<AssessRequest["employment_status"], string> = {
  employed: "employed",
  unemployed: "unemployed and not working",
  self_employed: "self-employed",
  unable_to_work: "unable to work due to illness or disability",
  carer: "a full-time carer"
};

const HOUSEHOLD_MAP: Record<AssessRequest["household_situation"], string> = {
  single: "a single person with no children",
  couple: "a couple with no children",
  single_parent: "a single parent",
  couple_with_children: "a couple with children"
};

const HOUSING_MAP: Record<AssessRequest["housing_situation"], string> = {
  renting_privately: "renting a property privately",
  mortgage: "paying a mortgage",
  living_with_family: "living with family or friends",
  social_housing: "living in social housing"
};

const AGE_MAP: Record<AssessRequest["age_range"], string> = {
  under_25: "under 25 years old",
  "25_to_60": "aged between 25 and 60",
  over_60: "over 60 years old or approaching State Pension age"
};

const HEALTH_MAP: Record<AssessRequest["health_disability"], string> = {
  affects_work: "a long-term health condition or disability that affects their ability to work",
  affects_daily_life: "a long-term health condition or disability that affects their daily life activities",
  carer_for_someone: "caring for a family member or friend who has a disability or health condition",
  none: "no health conditions or disabilities"
};

// ─── Main builder function ───────────────────────────────────────────────────

/**
 * Turns the 5 intake answers into a single natural language paragraph.
 * This is what gets embedded and sent to the LLM.
 *
 * Example output:
 * "The person is a single parent who is unemployed and not working.
 *  They have 2 children. They are renting a property privately.
 *  They are aged between 25 and 60. They have no health conditions
 *  or disabilities."
 */
export function buildSituationText(input: AssessRequest): string {
  const employment = EMPLOYMENT_MAP[input.employment_status];
  const household = HOUSEHOLD_MAP[input.household_situation];
  const housing = HOUSING_MAP[input.housing_situation];
  const age = AGE_MAP[input.age_range];
  const health = HEALTH_MAP[input.health_disability];

  const childrenText =
    input.num_children && input.num_children > 0
      ? ` They have ${input.num_children} ${input.num_children === 1 ? "child" : "children"}.`
      : "";

  const situation = [
    `The person is ${household} who is ${employment}.`,
    childrenText,
    `They are ${housing}.`,
    `They are ${age}.`,
    `They have ${health}.`
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return situation;
}
