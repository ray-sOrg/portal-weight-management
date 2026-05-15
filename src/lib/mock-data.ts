import type { AppData } from './types'

const householdId = 'demo-household'
const annaId = 'person-anna'
const benId = 'person-ben'

export const demoData: AppData = {
  household: {
    id: householdId,
    name: '家庭健康空间',
    created_by: 'demo-user',
    created_at: '2026-05-01T08:00:00Z',
  },
  people: [
    {
      id: annaId,
      household_id: householdId,
      profile_id: 'demo-user',
      name: '林安',
      height_cm: 166,
      birth_year: 1994,
      created_by: 'demo-user',
      created_at: '2026-05-01T08:00:00Z',
    },
    {
      id: benId,
      household_id: householdId,
      profile_id: null,
      name: '陈柏',
      height_cm: 178,
      birth_year: 1991,
      created_by: 'demo-user',
      created_at: '2026-05-01T08:00:00Z',
    },
  ],
  entries: [
    ['2026-04-21', 68.8],
    ['2026-04-24', 68.4],
    ['2026-04-27', 67.9],
    ['2026-04-30', 67.5],
    ['2026-05-03', 67.2],
    ['2026-05-06', 66.9],
    ['2026-05-09', 66.7],
    ['2026-05-12', 66.4],
    ['2026-05-15', 66.1],
  ].map(([date, weight], index) => ({
    id: `entry-anna-${index}`,
    tracked_person_id: annaId,
    measured_on: String(date),
    weight_kg: Number(weight),
    note: index === 8 ? '晨起空腹' : null,
    created_by: 'demo-user',
    created_at: `${date}T07:30:00Z`,
  })),
  goals: [
    {
      id: 'goal-anna',
      tracked_person_id: annaId,
      start_weight_kg: 68.8,
      target_weight_kg: 63,
      target_on: '2026-08-31',
      created_at: '2026-04-21T07:30:00Z',
    },
    {
      id: 'goal-ben',
      tracked_person_id: benId,
      start_weight_kg: 82,
      target_weight_kg: 78,
      target_on: '2026-09-30',
      created_at: '2026-05-01T08:00:00Z',
    },
  ],
}
