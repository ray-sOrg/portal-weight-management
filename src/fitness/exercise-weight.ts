import type { FitnessSessionExercise } from '@/lib/types'

type WeightExercise = Pick<FitnessSessionExercise, 'exerciseName' | 'equipment'>

export function exerciseUsesExternalWeight(exercise: WeightExercise) {
  const equipment = exercise.equipment ?? ''
  return exercise.exerciseName === '实力推'
    || ['杠铃', '哑铃', '壶铃', '臂力棒'].some((item) => equipment.includes(item))
}

export function weightInputLabel(exercise: WeightExercise) {
  const equipment = exercise.equipment ?? ''
  if (exercise.exerciseName === '实力推') return '负重 kg'
  if (equipment.includes('哑铃')) return '单只重量 kg'
  if (equipment.includes('杠铃')) return '总重量 kg'
  return '重量 kg'
}

export function weightRuleHint(exercise: WeightExercise) {
  const equipment = exercise.equipment ?? ''
  if (exercise.exerciseName === '实力推') return '记录额外负重；自重完成可填 0'
  if (equipment.includes('哑铃')) return '哑铃记录单只重量'
  if (equipment.includes('杠铃')) return '杠铃记录含杆总重量'
  return undefined
}
