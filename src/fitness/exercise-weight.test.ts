import { describe, expect, it } from 'vitest'
import {
  exerciseUsesExternalWeight,
  weightInputLabel,
  weightRuleHint,
} from './exercise-weight'

describe('workout weight fields', () => {
  it('allows additional weight to be recorded for 实力推', () => {
    const exercise = { exerciseName: '实力推', equipment: '单杠' }

    expect(exerciseUsesExternalWeight(exercise)).toBe(true)
    expect(weightInputLabel(exercise)).toBe('负重 kg')
    expect(weightRuleHint(exercise)).toBe('记录额外负重；自重完成可填 0')
  })

  it('keeps the dumbbell and barbell recording rules', () => {
    expect(weightInputLabel({ exerciseName: '哑铃飞鸟', equipment: '哑铃' })).toBe('单只重量 kg')
    expect(weightInputLabel({ exerciseName: '杠铃深蹲', equipment: '杠铃' })).toBe('总重量 kg')
  })
})
