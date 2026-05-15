import { describe, expect, it } from 'vitest'
import { exportEntriesCsv } from './csv'
import type { TrackedPerson, WeightEntry } from './types'

describe('exportEntriesCsv', () => {
  it('quotes CSV values and escapes notes', () => {
    const people: TrackedPerson[] = [
      {
        id: 'p1',
        household_id: 'h1',
        profile_id: null,
        name: '林安',
        height_cm: 166,
        birth_year: null,
        created_by: 'u1',
        created_at: '2026-05-01T00:00:00Z',
      },
    ]
    const entries: WeightEntry[] = [
      {
        id: 'e1',
        tracked_person_id: 'p1',
        measured_on: '2026-05-15',
        weight_kg: 66.1,
        note: '晨起"空腹"',
        created_by: 'u1',
        created_at: '2026-05-15T00:00:00Z',
      },
    ]
    expect(exportEntriesCsv(entries, people)).toContain('"晨起""空腹"""')
  })
})
