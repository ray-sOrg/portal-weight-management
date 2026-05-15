import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { demoData } from './mock-data'
import {
  addServerWeightEntry,
  loadWeightAppData,
  readProfileHeight,
} from './server-api'
import type { AppData, NewWeightEntry, TrackedPerson } from './types'

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
    onSuccess: () => {
      toast.success('体重记录已保存')
      void queryClient.invalidateQueries({ queryKey: ['app-data'] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
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
  try {
    return await loadWeightAppData()
  } catch {
    return demoData
  }
}

async function addWeightEntry(input: NewWeightEntry) {
  try {
    await addServerWeightEntry(input, readProfileHeight())
  } catch {
    demoData.entries.push({
      id: crypto.randomUUID(),
      tracked_person_id: input.trackedPersonId,
      measured_on: input.measuredOn,
      weight_kg: input.weightKg,
      note: input.note ?? null,
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
    })
  }
}

async function upsertPerson(person: TrackedPerson) {
  const index = demoData.people.findIndex((item) => item.id === person.id)
  if (index >= 0) demoData.people[index] = person
  else demoData.people.push(person)
}
