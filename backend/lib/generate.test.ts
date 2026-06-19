import { describe, it, expect } from 'vitest'
import { parseAssessmentJSON } from './generate'

// TEST-001 fix: lib/generate.ts had zero coverage on LLM JSON parsing — the
// single most fragile part of the pipeline, since it depends entirely on
// an external LLM returning well-formed JSON on every call. These tests
// exercise parseAssessmentJSON directly against valid, truncated, and
// malformed responses without making any network calls.
//
// NOTE: parseAssessmentJSON was previously a module-private function.
// Per CQ-005 it now validates the full response shape with the project's
// existing Zod dependency; it has been given an `export` keyword here
// solely so it can be unit-tested in isolation from generateAssessment()
// (which would otherwise require mocking fetch + two provider API keys
// just to reach this logic). No runtime behaviour changes.

const VALID_RESPONSE = {
  benefits: [
    {
      name: 'Universal Credit',
      confidence: 'HIGH',
      reason: 'You are unemployed and renting privately.',
      weekly_estimate: 155.9,
      monthly_estimate: 675.56,
      claim_url: 'https://www.gov.uk/apply-universal-credit',
      gov_rule_reference: 'Universal Credit eligibility: single claimant aged 25+, unemployed',
    },
  ],
  total_weekly_estimate: 155.9,
  total_monthly_estimate: 675.56,
  disclaimer: 'These are estimates only. Always verify eligibility at GOV.UK.',
}

describe('parseAssessmentJSON — valid input', () => {
  it('parses a valid, well-formed LLM JSON response', () => {
    const result = parseAssessmentJSON(JSON.stringify(VALID_RESPONSE))

    expect(result.data_source).toBe('live_rag')
    expect(result.benefits).toHaveLength(1)
    expect(result.benefits[0].name).toBe('Universal Credit')
    expect(result.benefits[0].confidence).toBe('HIGH')
    expect(result.total_monthly_estimate).toBe(675.56)
    expect(result.disclaimer.length).toBeGreaterThan(0)
  })

  it('strips an accidental ```json markdown code fence before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(VALID_RESPONSE) + '\n```'
    const result = parseAssessmentJSON(fenced)
    expect(result.benefits).toHaveLength(1)
  })

  it('strips a fence with no language tag', () => {
    const fenced = '```\n' + JSON.stringify(VALID_RESPONSE) + '\n```'
    const result = parseAssessmentJSON(fenced)
    expect(result.benefits).toHaveLength(1)
  })

  it('defaults a missing confidence field to NEEDS_REVIEW', () => {
    const withMissingConfidence = {
      ...VALID_RESPONSE,
      benefits: [
        {
          name: "Carer's Allowance",
          // confidence intentionally omitted
          reason: 'You may be a carer for 35+ hours a week.',
          weekly_estimate: 81.9,
          monthly_estimate: 354.9,
          claim_url: 'https://www.gov.uk/carers-allowance/how-to-claim',
          gov_rule_reference: "Carer's Allowance: 35+ hours of care per week",
        },
      ],
    }

    const result = parseAssessmentJSON(JSON.stringify(withMissingConfidence))
    expect(result.benefits[0].confidence).toBe('NEEDS_REVIEW')
  })

  it('allows null weekly/monthly estimates when the LLM cannot estimate', () => {
    const withNulls = {
      ...VALID_RESPONSE,
      benefits: [{ ...VALID_RESPONSE.benefits[0], weekly_estimate: null, monthly_estimate: null }],
    }
    const result = parseAssessmentJSON(JSON.stringify(withNulls))
    expect(result.benefits[0].weekly_estimate).toBeNull()
    expect(result.benefits[0].monthly_estimate).toBeNull()
  })

  it('accepts multiple benefits in a single response', () => {
    const multi = {
      ...VALID_RESPONSE,
      benefits: [
        VALID_RESPONSE.benefits[0],
        {
          name: 'Child Benefit',
          confidence: 'HIGH',
          reason: 'You have children.',
          weekly_estimate: 42.55,
          monthly_estimate: 184.18,
          claim_url: 'https://www.gov.uk/child-benefit/overview',
          gov_rule_reference: 'Child Benefit: per-child weekly rate',
        },
      ],
    }
    const result = parseAssessmentJSON(JSON.stringify(multi))
    expect(result.benefits).toHaveLength(2)
  })
})

describe('parseAssessmentJSON — malformed / invalid input', () => {
  it('throws on truncated (syntactically invalid) JSON', () => {
    const truncated = JSON.stringify(VALID_RESPONSE).slice(0, -10) // cuts off mid-object
    expect(() => parseAssessmentJSON(truncated)).toThrow()
  })

  it('throws on a totally non-JSON string', () => {
    expect(() => parseAssessmentJSON('Sorry, I cannot help with that request.')).toThrow()
  })

  it('throws on an empty string', () => {
    expect(() => parseAssessmentJSON('')).toThrow()
  })

  it('throws on a response missing the benefits array entirely', () => {
    const { benefits, ...withoutBenefits } = VALID_RESPONSE
    expect(() => parseAssessmentJSON(JSON.stringify(withoutBenefits))).toThrow()
  })

  it('throws when benefits is present but not an array', () => {
    const malformed = { ...VALID_RESPONSE, benefits: 'not an array' }
    expect(() => parseAssessmentJSON(JSON.stringify(malformed))).toThrow()
  })

  it('throws when a benefit is missing a required field (claim_url)', () => {
    const missingUrl = {
      ...VALID_RESPONSE,
      benefits: [
        {
          name: 'Universal Credit',
          confidence: 'HIGH',
          reason: 'Some reason',
          weekly_estimate: 100,
          monthly_estimate: 433,
          // claim_url intentionally omitted
          gov_rule_reference: 'Some rule',
        },
      ],
    }
    expect(() => parseAssessmentJSON(JSON.stringify(missingUrl))).toThrow()
  })

  it('throws when claim_url is not a valid URL', () => {
    const badUrl = {
      ...VALID_RESPONSE,
      benefits: [{ ...VALID_RESPONSE.benefits[0], claim_url: 'not-a-url' }],
    }
    expect(() => parseAssessmentJSON(JSON.stringify(badUrl))).toThrow()
  })

  it('throws when total_weekly_estimate is missing', () => {
    const { total_weekly_estimate, ...withoutTotal } = VALID_RESPONSE
    expect(() => parseAssessmentJSON(JSON.stringify(withoutTotal))).toThrow()
  })

  it('throws when total_monthly_estimate is negative', () => {
    const negative = { ...VALID_RESPONSE, total_monthly_estimate: -50 }
    expect(() => parseAssessmentJSON(JSON.stringify(negative))).toThrow()
  })

  it('throws when disclaimer is an empty string', () => {
    const emptyDisclaimer = { ...VALID_RESPONSE, disclaimer: '' }
    expect(() => parseAssessmentJSON(JSON.stringify(emptyDisclaimer))).toThrow()
  })
})
