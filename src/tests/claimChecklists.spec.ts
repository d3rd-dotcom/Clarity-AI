import { describe, it, expect } from 'vitest'
import { getChecklist, DEFAULT_CHECKLIST } from '../data/claimChecklists'

describe('getChecklist', () => {
  it('returns checklist for exact key', () => {
    const checklist = getChecklist('Universal Credit')
    expect(Array.isArray(checklist)).toBe(true)
    expect(checklist[0].id).toBe('uc-1')
  })

  it('is case-insensitive', () => {
    const lower = getChecklist('universal credit')
    const mixed = getChecklist('Universal credit')
    expect(lower[0].id).toBe('uc-1')
    expect(mixed[0].id).toBe('uc-1')
  })

  it('trims whitespace', () => {
    const spaced = getChecklist('  Universal Credit  ')
    expect(spaced[0].id).toBe('uc-1')
  })

  it('returns default checklist for unknown benefit', () => {
    const unknown = getChecklist('Nonexistent Benefit')
    expect(unknown).toBe(DEFAULT_CHECKLIST)
  })

  it('returns default checklist for falsy input', () => {
    // @ts-expect-error intentionally passing undefined
    const none = getChecklist(undefined)
    expect(none).toBe(DEFAULT_CHECKLIST)
  })
})
