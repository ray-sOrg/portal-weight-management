export type OrderedWorkoutSet = {
  id: number
  completed: boolean
  deferredAt: string | null
  activatedAt: string | null
}

export function findNextActionableSetId(
  exercises: Array<{ sets: OrderedWorkoutSet[] }>,
) {
  let latestActivated: OrderedWorkoutSet | undefined
  let firstFresh: OrderedWorkoutSet | undefined
  let oldestDeferred: OrderedWorkoutSet | undefined
  for (const exercise of exercises) {
    for (const fitnessSet of exercise.sets) {
      if (fitnessSet.completed) continue
      if (
        fitnessSet.activatedAt
        && (!latestActivated || fitnessSet.activatedAt > (latestActivated.activatedAt ?? ''))
      ) {
        latestActivated = fitnessSet
      }
      if (!fitnessSet.deferredAt && !firstFresh) firstFresh = fitnessSet
      if (
        fitnessSet.deferredAt
        && (!oldestDeferred
        || fitnessSet.deferredAt < (oldestDeferred.deferredAt ?? '')
        )
      ) {
        oldestDeferred = fitnessSet
      }
    }
  }
  return latestActivated?.id ?? firstFresh?.id ?? oldestDeferred?.id
}
