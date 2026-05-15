import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addServerWeightEntry,
  loadWeightAppData,
  readProfileHeight,
} from './server-api'
import type { AppData, NewWeightEntry } from './types'

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
  return loadWeightAppData()
}

async function addWeightEntry(input: NewWeightEntry) {
  await addServerWeightEntry(input, readProfileHeight())
}

async function upsertPerson() {
  throw new Error('家庭成员管理接口还没有接入后端。')
}
