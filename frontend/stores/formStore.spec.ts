import { describe, it, expect, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { useFormStore } from './formStore'

// TEST-001 fix: formStore.ts had zero test coverage despite driving the
// entire wizard — including the one genuinely tricky piece of logic in
// the whole frontend, the conditional num_children step (STR-004).
//
// stubActions: false because we need the real action implementations to
// run here (setAnswer, nextStep, reset, ...) and assert on the resulting
// state — the default @pinia/testing behaviour of stubbing actions is
// meant for component tests that only care "was this action called",
// which isn't what we want for testing the store itself.
//
// Requires `@pinia/testing` as a devDependency:
//   npm install -D @pinia/testing

beforeEach(() => {
  setActivePinia(createTestingPinia({ stubActions: false }))
})

describe('useFormStore — conditional num_children step (STR-004)', () => {
  it('hides num_children for "single" household', () => {
    const store = useFormStore()
    store.setAnswer('household_situation', 'single')
    expect(store.visibleSteps.map((s) => s.id)).not.toContain('num_children')
  })

  it('hides num_children for "couple" household', () => {
    const store = useFormStore()
    store.setAnswer('household_situation', 'couple')
    expect(store.visibleSteps.map((s) => s.id)).not.toContain('num_children')
  })

  it('shows num_children for "single_parent" household', () => {
    const store = useFormStore()
    store.setAnswer('household_situation', 'single_parent')
    expect(store.visibleSteps.map((s) => s.id)).toContain('num_children')
  })

  it('shows num_children for "couple_with_children" household', () => {
    const store = useFormStore()
    store.setAnswer('household_situation', 'couple_with_children')
    expect(store.visibleSteps.map((s) => s.id)).toContain('num_children')
  })

  it('resets num_children to 0 when household changes away from having children', () => {
    const store = useFormStore()
    store.setAnswer('household_situation', 'single_parent')
    store.setAnswer('num_children', '3')
    expect(store.answers.num_children).toBe(3)

    store.setAnswer('household_situation', 'single')
    expect(store.answers.num_children).toBe(0)
  })

  it('does not reset num_children when switching between two "has children" households', () => {
    const store = useFormStore()
    store.setAnswer('household_situation', 'single_parent')
    store.setAnswer('num_children', '2')

    store.setAnswer('household_situation', 'couple_with_children')
    expect(store.answers.num_children).toBe(2)
  })

  it('totalSteps is 5 with no children, 6 with children', () => {
    const noChildren = useFormStore()
    noChildren.setAnswer('household_situation', 'single')
    expect(noChildren.totalSteps).toBe(5)

    setActivePinia(createTestingPinia({ stubActions: false }))
    const withChildren = useFormStore()
    withChildren.setAnswer('household_situation', 'single_parent')
    expect(withChildren.totalSteps).toBe(6)
  })
})

describe('useFormStore — step navigation', () => {
  it('starts at step 0 on employment_status', () => {
    const store = useFormStore()
    expect(store.currentStepIndex).toBe(0)
    expect(store.currentStep?.id).toBe('employment_status')
  })

  it('cannot go back from the first step', () => {
    const store = useFormStore()
    expect(store.canGoBack).toBe(false)
  })

  it('cannot go next until the current step has an answer', () => {
    const store = useFormStore()
    expect(store.canGoNext).toBe(false)
    store.setAnswer('employment_status', 'employed')
    expect(store.canGoNext).toBe(true)
  })

  it('advances through steps with nextStep()', () => {
    const store = useFormStore()
    store.setAnswer('employment_status', 'employed')
    store.nextStep()
    expect(store.currentStepIndex).toBe(1)
    expect(store.currentStep?.id).toBe('household_situation')
  })

  it('goes back with prevStep()', () => {
    const store = useFormStore()
    store.setAnswer('employment_status', 'employed')
    store.nextStep()
    store.prevStep()
    expect(store.currentStepIndex).toBe(0)
  })

  it('does not advance past the last visible step', () => {
    const store = useFormStore()
    store.setAnswer('household_situation', 'single') // no num_children step → 5 total steps
    const lastIndex = store.totalSteps - 1

    for (let i = 0; i < lastIndex; i++) {
      const step = store.currentStep!
      store.setAnswer(step.id, step.options[0]!.value)
      store.nextStep()
    }

    expect(store.currentStepIndex).toBe(lastIndex)
    expect(store.isLastStep).toBe(true)

    store.nextStep() // should be a no-op past the end
    expect(store.currentStepIndex).toBe(lastIndex)
  })

  it('does not retreat past the first step', () => {
    const store = useFormStore()
    store.prevStep()
    expect(store.currentStepIndex).toBe(0)
  })
})

describe('useFormStore — isComplete', () => {
  it('is false when no answers are given', () => {
    const store = useFormStore()
    expect(store.isComplete).toBe(false)
  })

  it('is true once all 5 base questions are answered for a childless household', () => {
    const store = useFormStore()
    store.setAnswer('employment_status', 'employed')
    store.setAnswer('household_situation', 'single')
    store.setAnswer('housing_situation', 'renting_privately')
    store.setAnswer('age_range', '25_to_60')
    store.setAnswer('health_disability', 'none')
    expect(store.isComplete).toBe(true)
  })

  it('is false for a "has children" household until num_children is set', () => {
    const store = useFormStore()
    store.setAnswer('employment_status', 'unemployed')
    store.setAnswer('household_situation', 'single_parent')
    store.setAnswer('housing_situation', 'renting_privately')
    store.setAnswer('age_range', '25_to_60')
    store.setAnswer('health_disability', 'none')
    expect(store.isComplete).toBe(false)

    store.setAnswer('num_children', '2')
    expect(store.isComplete).toBe(true)
  })
})

describe('useFormStore — reset', () => {
  it('clears all answers and returns to step 0', () => {
    const store = useFormStore()
    store.setAnswer('employment_status', 'employed')
    store.nextStep()
    store.reset()

    expect(store.currentStepIndex).toBe(0)
    expect(store.answers.employment_status).toBeNull()
    expect(store.answers.num_children).toBe(0)
  })
})
