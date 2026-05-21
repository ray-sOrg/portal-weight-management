import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addServerWeightEntry,
  createServerTrackedPerson,
  editServerWeightEntry,
  loadWeightAppData,
  upsertServerWeightGoal,
} from './server-api'
import type { AppData, NewTrackedPerson, NewWeightEntry, NewWeightGoal } from './types'

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
  return loadWeightAppData()
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
  await upsertServerWeightGoal(input)
}
