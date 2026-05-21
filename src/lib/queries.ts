import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addServerWeightEntry,
  createServerTrackedPerson,
  editServerWeightEntry,
  loadWeightAppData,
} from './server-api'
import type { AppData, NewTrackedPerson, NewWeightEntry, NewWeightGoal, WeightGoal } from './types'

export function useAppData() {
  return useQuery({
    queryKey: ['app-data'],
    queryFn: loadAppData,
  })
}

export function useAddWeightEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addWeightEntry,
    onSuccess: (_, input) => {
      toast.success(input.existingEntryId ? '今日记录已替换' : '体重记录已保存')
      void queryClient.invalidateQueries({ queryKey: ['app-data'] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUpsertGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: upsertGoal,
    onSuccess: () => {
      toast.success('目标已保存')
      void queryClient.invalidateQueries({ queryKey: ['app-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpsertPerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: upsertPerson,
    onSuccess: () => {
      toast.success('成员资料已更新')
      void queryClient.invalidateQueries({ queryKey: ['app-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

async function loadAppData(): Promise<AppData> {
  const data = await loadWeightAppData()
  return {
    ...data,
    goals: readLocalGoals().filter((goal) =>
      data.people.some((person) => person.id === goal.tracked_person_id),
    ),
  }
}

async function addWeightEntry(input: NewWeightEntry) {
  if (input.existingEntryId) {
    await editServerWeightEntry(input)
    return
  }
  await addServerWeightEntry(input)
}

async function upsertPerson(input: NewTrackedPerson) {
  await createServerTrackedPerson(input)
}

async function upsertGoal(input: NewWeightGoal) {
  const goals = readLocalGoals()
  const nextGoal: WeightGoal = {
    id: `local-goal-${input.trackedPersonId}`,
    tracked_person_id: input.trackedPersonId,
    start_weight_kg: input.startWeightKg,
    target_weight_kg: input.targetWeightKg,
    target_on: input.targetOn ?? null,
    created_at: new Date().toISOString(),
  }
  writeLocalGoals([
    ...goals.filter((goal) => goal.tracked_person_id !== input.trackedPersonId),
    nextGoal,
  ])
}

function readLocalGoals(): WeightGoal[] {
  try {
    const raw = localStorage.getItem('weight-goals-v1')
    return raw ? JSON.parse(raw) as WeightGoal[] : []
  } catch {
    return []
  }
}

function writeLocalGoals(goals: WeightGoal[]) {
  localStorage.setItem('weight-goals-v1', JSON.stringify(goals))
}
