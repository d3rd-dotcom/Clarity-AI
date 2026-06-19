import { describe, it, expect } from 'vitest'
import { buildSituationText } from './situationBuilder.js'
import type { AssessRequest } from '../middleware/validate.js'

// TEST-001 fix: situationBuilder.ts had zero test coverage despite being
// the very first step of the RAG pipeline — its output is exactly what
// gets embedded and sent to the LLM, so a wrong word here silently
// degrades every downstream result without ever throwing an error.
//
// Full-sentence combinations use toMatchSnapshot() rather than a
// hand-typed expected string: the existing join/trim logic in
// buildSituationText leaves a double space between the first sentence and
// "They have N children." when children are present (the childrenText
// template literal starts with its own leading space, then gets joined
// with another space). That's a pre-existing quirk, not something this
// test file is asked to fix — snapshotting captures the real current
// behaviour exactly, without anyone needing to hand-compute whitespace.

function buildInput(overrides: Partial<AssessRequest> = {}): AssessRequest {
  return {
    employment_status: 'unemployed',
    household_situation: 'single_parent',
    housing_situation: 'renting_privately',
    age_range: '25_to_60',
    health_disability: 'none',
    num_children: 2,
    ...overrides,
  }
}

describe('buildSituationText — demo profile snapshots', () => {
  it('Profile A — single parent, unemployed, 2 children, renting, no health conditions', () => {
    const text = buildSituationText(buildInput())
    expect(text).toMatchSnapshot()
  })

  it('Profile B — couple, employed, no children, renting, no health conditions', () => {
    const text = buildSituationText(
      buildInput({
        employment_status: 'employed',
        household_situation: 'couple',
        num_children: 0,
      })
    )
    expect(text).toMatchSnapshot()
  })

  it('Profile C — single, unable to work, disability affects work, renting', () => {
    const text = buildSituationText(
      buildInput({
        household_situation: 'single',
        employment_status: 'unable_to_work',
        health_disability: 'affects_work',
        num_children: 0,
      })
    )
    expect(text).toMatchSnapshot()
  })
})

describe('buildSituationText — employment_status (all 5 enum values)', () => {
  const cases: Array<[AssessRequest['employment_status'], string]> = [
    ['employed', 'who is employed.'],
    ['unemployed', 'who is unemployed and not working.'],
    ['self_employed', 'who is self-employed.'],
    ['unable_to_work', 'who is unable to work due to illness or disability.'],
    ['carer', 'who is a full-time carer.'],
  ]

  for (const [status, expectedPhrase] of cases) {
    it(`renders "${status}" correctly`, () => {
      const text = buildSituationText(buildInput({ employment_status: status, num_children: 0 }))
      expect(text).toContain(expectedPhrase)
    })
  }
})

describe('buildSituationText — household_situation (all 4 enum values)', () => {
  const cases: Array<[AssessRequest['household_situation'], string]> = [
    ['single', 'The person is a single person with no children'],
    ['couple', 'The person is a couple with no children'],
    ['single_parent', 'The person is a single parent'],
    ['couple_with_children', 'The person is a couple with children'],
  ]

  for (const [situation, expectedPhrase] of cases) {
    it(`renders "${situation}" correctly`, () => {
      const text = buildSituationText(buildInput({ household_situation: situation, num_children: 0 }))
      expect(text).toContain(expectedPhrase)
    })
  }
})

describe('buildSituationText — housing_situation (all 4 enum values)', () => {
  const cases: Array<[AssessRequest['housing_situation'], string]> = [
    ['renting_privately', 'They are renting a property privately.'],
    ['mortgage', 'They are paying a mortgage.'],
    ['living_with_family', 'They are living with family or friends.'],
    ['social_housing', 'They are living in social housing.'],
  ]

  for (const [housing, expectedPhrase] of cases) {
    it(`renders "${housing}" correctly`, () => {
      const text = buildSituationText(buildInput({ housing_situation: housing, num_children: 0 }))
      expect(text).toContain(expectedPhrase)
    })
  }
})

describe('buildSituationText — age_range (all 3 enum values)', () => {
  const cases: Array<[AssessRequest['age_range'], string]> = [
    ['under_25', 'They are under 25 years old.'],
    ['25_to_60', 'They are aged between 25 and 60.'],
    ['over_60', 'They are over 60 years old or approaching State Pension age.'],
  ]

  for (const [age, expectedPhrase] of cases) {
    it(`renders "${age}" correctly`, () => {
      const text = buildSituationText(buildInput({ age_range: age, num_children: 0 }))
      expect(text).toContain(expectedPhrase)
    })
  }
})

describe('buildSituationText — health_disability (all 4 enum values)', () => {
  const cases: Array<[AssessRequest['health_disability'], string]> = [
    ['affects_work', 'a long-term health condition or disability that affects their ability to work'],
    ['affects_daily_life', 'a long-term health condition or disability that affects their daily life activities'],
    ['carer_for_someone', 'caring for a family member or friend who has a disability or health condition'],
    ['none', 'no health conditions or disabilities'],
  ]

  for (const [health, expectedPhrase] of cases) {
    it(`renders "${health}" correctly`, () => {
      const text = buildSituationText(buildInput({ health_disability: health, num_children: 0 }))
      expect(text).toContain(expectedPhrase)
    })
  }
})

describe('buildSituationText — num_children', () => {
  it('omits the children sentence entirely when num_children is 0', () => {
    const text = buildSituationText(buildInput({ num_children: 0 }))
    expect(text).not.toContain('child')
  })

  it('uses singular "child" for exactly 1 child', () => {
    const text = buildSituationText(buildInput({ num_children: 1 }))
    expect(text).toContain('They have 1 child.')
  })

  it('uses plural "children" for more than 1 child', () => {
    const text = buildSituationText(buildInput({ num_children: 3 }))
    expect(text).toContain('They have 3 children.')
  })

  it('treats undefined num_children the same as 0 (no children sentence)', () => {
    const text = buildSituationText(buildInput({ num_children: undefined as unknown as number }))
    expect(text).not.toContain('child')
  })
})
