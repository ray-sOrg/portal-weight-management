export type OrderedWorkoutSet = {
  id: number
  completed: boolean
  deferredAt: string | null
}

export function findNextActionableSetId(
  exercises: Array<{ sets: OrderedWorkoutSet[] }>,
) {
  let oldestDeferred: OrderedWorkoutSet | undefined
  for (const exercise of exercises) {
    for (const fitnessSet of exercise.sets) {
      if (fitnessSet.completed) continue
      if (!fitnessSet.deferredAt) return fitnessSet.id
      if (
        !oldestDeferred
        || fitnessSet.deferredAt < (oldestDeferred.deferredAt ?? '')
      ) {
        oldestDeferred = fitnessSet
      }
    }
  }
  return oldestDeferred?.id
}
