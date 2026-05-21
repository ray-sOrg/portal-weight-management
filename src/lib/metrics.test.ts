import { describe, expect, it } from 'vitest'
import {
  buildTrend,
  calculateBmi,
  filterEntriesByRange,
  getBmiLabel,
  getBestGoalProgressFromEntries,
  getGoalProgress,
  getGoalProgressFromEntries,
  getRangeSummary,
  getLatestEntry,
  getBmiDistribution,
  getLongestStreakDays,
  getPhaseComparison,
  getLargestDailySwing,
  getStreakDays,
  getStabilityLabel,
  getWeightChange,
} from './metrics'
import type { TrackedPerson, WeightEntry, WeightGoal } from './types'

const person: TrackedPerson = {
  id: 'p1',
  household_id: 'h1',
  profile_id: null,
  name: '测试成员',
  height_cm: 170,
  birth_date: null,
  created_by: 'u1',
  created_at: '2026-05-01T00:00:00Z',
}

const entries: WeightEntry[] = [
  entry('2026-05-01', 70),
  entry('2026-05-08', 69),
  entry('2026-05-15', 68.2),
]

function entry(date: string, weight: number): WeightEntry {
  return {
    id: date,
    tracked_person_id: 'p1',
    measured_on: date,
    weight_kg: weight,
    note: null,
    created_by: 'u1',
    created_at: `${date}T00:00:00Z`,
  }
}

describe('metrics', () => {
  it('calculates BMI and category labels', () => {
    expect(calculateBmi(68, 170)).toBe(23.5)
    expect(getBmiLabel(23.5)).toBe('健康')
    expect(getBmiLabel(27)).toBe('偏高')
  })

  it('sorts latest entry and computes weight deltas', () => {
    expect(getLatestEntry([...entries].reverse())?.weight_kg).toBe(68.2)
    expect(getWeightChange(entries, 7)).toBe(-0.8)
  })

  it('builds moving average trend points', () => {
    const trend = buildTrend(entries, person)
    expect(trend.at(-1)?.movingAverage).toBe(69.1)
    expect(trend.at(-1)?.bmi).toBe(23.6)
  })

  it('filters trend entries by recent range', () => {
    expect(filterEntriesByRange(entries, '30')).toHaveLength(3)
    expect(filterEntriesByRange(entries, 'all')).toHaveLength(3)
    expect(
      filterEntriesByRange(
        [
        entry('2026-01-01', 72),
        entry('2026-05-01', 70),
        entry('2026-05-15', 68),
        ],
        '30',
      ).map((item) => item.measured_on),
    ).toEqual(['2026-05-01', '2026-05-15'])
  })

  it('finds the largest daily swing', () => {
    expect(
      getLargestDailySwing([
        entry('2026-05-01', 70),
        entry('2026-05-02', 69.2),
        entry('2026-05-03', 71),
      ]),
    ).toEqual({ date: '2026-05-03', changeKg: 1.8 })
  })

  it('summarizes range quality and velocity', () => {
    const summary = getRangeSummary([
      entry('2026-05-01', 70),
      entry('2026-05-02', 69.5),
      entry('2026-05-04', 69),
    ], person)

    expect(summary?.count).toBe(3)
    expect(summary?.spanDays).toBe(4)
    expect(summary?.recordRate).toBe(75)
    expect(summary?.averageWeightKg).toBe(69.5)
    expect(summary?.changeKg).toBe(-1)
    expect(summary?.projected30DayChangeKg).toBe(-10)
  })

  it('builds interpretive report metrics', () => {
    const reportEntries = [
      entry('2026-05-01', 70),
      entry('2026-05-02', 69.5),
      entry('2026-05-04', 69),
      entry('2026-05-05', 68.5),
    ]

    expect(getLongestStreakDays(reportEntries)).toBe(2)
    expect(getPhaseComparison(reportEntries)).toEqual({
      firstAverageKg: 69.8,
      secondAverageKg: 68.8,
      changeKg: -1,
    })
    expect(getBmiDistribution(reportEntries, person).healthy).toBe(50)
    expect(getStabilityLabel(0.2)).toBe('很稳定')
  })

  it('calculates goal progress', () => {
    const goal: WeightGoal = {
      id: 'g1',
      tracked_person_id: 'p1',
      start_weight_kg: 70,
      target_weight_kg: 66,
      target_on: '2026-07-01',
      created_at: '2026-05-01T00:00:00Z',
    }
    expect(getGoalProgress(68, goal)).toBe(50)
    expect(getGoalProgressFromEntries([
      entry('2026-05-01', 72),
      entry('2026-05-20', 68),
    ], goal)).toBe(67)
    expect(getBestGoalProgressFromEntries([
      entry('2026-05-01', 72),
      entry('2026-05-10', 67),
      entry('2026-05-20', 68),
    ], goal)).toMatchObject({
      date: '2026-05-10',
      progress: 83,
    })
  })

  it('counts streak from the latest recorded day', () => {
    expect(
      getStreakDays([
        entry('2026-05-18', 68.4),
        entry('2026-05-19', 68.2),
        entry('2026-05-20', 68),
      ], '2026-05-21'),
    ).toBe(3)
  })

  it('stops streak at date gaps before the latest entry', () => {
    expect(
      getStreakDays([
        entry('2026-05-17', 68.6),
        entry('2026-05-19', 68.2),
        entry('2026-05-20', 68),
      ], '2026-05-21'),
    ).toBe(2)
  })

  it('keeps streak alive until a full day is missed', () => {
    expect(getStreakDays([entry('2026-05-20', 68)], '2026-05-21')).toBe(1)
    expect(getStreakDays([entry('2026-05-19', 68)], '2026-05-21')).toBe(0)
  })
})
