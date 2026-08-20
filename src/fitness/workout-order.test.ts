import { describe, expect, it } from 'vitest'
import { findNextActionableSetId } from './workout-order'

describe('findNextActionableSetId', () => {
  it('selects the first fresh unfinished set before deferred sets', () => {
    expect(findNextActionableSetId([{ sets: [
      { id: 1, completed: true, deferredAt: null },
      { id: 2, completed: false, deferredAt: '2026-08-20T02:00:00Z' },
      { id: 3, completed: false, deferredAt: null },
    ] }])).toBe(3)
  })

  it('returns to the oldest deferred set after fresh sets are done', () => {
    expect(findNextActionableSetId([{ sets: [
      { id: 4, completed: false, deferredAt: '2026-08-20T02:05:00Z' },
      { id: 5, completed: false, deferredAt: '2026-08-20T02:01:00Z' },
    ] }])).toBe(5)
  })

  it('returns undefined after every set is complete', () => {
    expect(findNextActionableSetId([{ sets: [
      { id: 6, completed: true, deferredAt: null },
    ] }])).toBeUndefined()
  })
})
