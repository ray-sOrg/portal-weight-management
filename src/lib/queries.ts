import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  activateServerFitnessSet,
  addServerFitnessSet,
  addServerWeightEntry,
  activateServerFitnessPlan,
  archiveServerFitnessExercise,
  copyServerFitnessPlan,
  createServerTrackedPerson,
  deleteServerFitnessPlan,
  deleteServerFitnessSession,
  deferServerFitnessSet,
  editServerWeightEntry,
  finishServerFitnessSession,
  loadFitnessBootstrap,
  loadFitnessHistory,
  loadFitnessExport,
  loadFitnessRecords,
  loadFitnessSession,
  loadWeightAppData,
  saveServerFitnessExercise,
  saveServerFitnessFeedback,
  saveServerFitnessPlan,
  saveServerFitnessSet,
  startServerFitnessSession,
  upsertServerWeightGoal,
} from './server-api'
import type {
  AppData,
  FitnessBootstrap,
  FitnessExerciseInput,
  FitnessFeedbackInput,
  FitnessPlanInput,
  FitnessSetInput,
  NewTrackedPerson,
  NewWeightEntry,
  NewWeightGoal,
} from './types'

export function useAppData() {
  return useQuery({
    queryKey: ['app-data'],
    queryFn: loadAppData,
    placeholderData: keepPreviousData,
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

export function useFitnessData() {
  return useQuery({
    queryKey: ['fitness-data'],
    queryFn: loadFitnessBootstrap,
  })
}

export function useSaveFitnessExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FitnessExerciseInput) => saveServerFitnessExercise(input),
    onSuccess: () => {
      toast.success('动作已保存')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useArchiveFitnessExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => archiveServerFitnessExercise(id),
    onSuccess: () => {
      toast.success('动作已停用')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useSaveFitnessPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FitnessPlanInput) => saveServerFitnessPlan(input),
    onSuccess: () => {
      toast.success('训练计划已保存')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useActivateFitnessPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => activateServerFitnessPlan(id),
    onSuccess: () => {
      toast.success('当前计划已切换')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCopyFitnessPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name?: string }) => copyServerFitnessPlan(id, name),
    onSuccess: () => {
      toast.success('计划副本已创建')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteFitnessPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteServerFitnessPlan(id),
    onSuccess: (result) => {
      const historyMessage = result.preservedSessionCount
        ? `，${result.preservedSessionCount} 次训练历史已保留`
        : ''
      toast.success(`计划已删除${historyMessage}`)
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useStartFitnessSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startServerFitnessSession(),
    onSuccess: (session) => {
      queryClient.setQueryData<FitnessBootstrap>(['fitness-data'], (current) => (
        current ? { ...current, todaySession: session } : current
      ))
      toast.success('今日训练已开始')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useSaveFitnessSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FitnessSetInput) => saveServerFitnessSet(input),
    onSuccess: (session) => {
      queryClient.setQueryData(['fitness-data'], (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        return { ...current, todaySession: session }
      })
      void queryClient.invalidateQueries({ queryKey: ['fitness-history'] })
      void queryClient.invalidateQueries({ queryKey: ['fitness-records'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeferFitnessSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deferServerFitnessSet(id),
    onSuccess: (session) => {
      queryClient.setQueryData(['fitness-data'], (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        return { ...current, todaySession: session }
      })
      toast.success('已放到本次训练末尾，稍后回来补')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useActivateFitnessSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => activateServerFitnessSet(id),
    onSuccess: (session) => {
      queryClient.setQueryData(['fitness-data'], (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        return { ...current, todaySession: session }
      })
      toast.success('已切换回来，完成这组后继续')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useAddFitnessSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (exerciseId: number) => addServerFitnessSet(exerciseId),
    onSuccess: (session) => {
      queryClient.setQueryData(['fitness-data'], (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        return { ...current, todaySession: session }
      })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useFinishFitnessSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FitnessFeedbackInput) => finishServerFitnessSession(input),
    onSuccess: () => {
      toast.success('本次训练已保存')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
      void queryClient.invalidateQueries({ queryKey: ['fitness-history'] })
      void queryClient.invalidateQueries({ queryKey: ['fitness-records'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useSaveFitnessFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FitnessFeedbackInput) => saveServerFitnessFeedback(input),
    onSuccess: (session) => {
      toast.success('训练复盘已保存')
      queryClient.setQueryData(['fitness-data'], (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        return { ...current, todaySession: session }
      })
      queryClient.setQueryData(['fitness-session', session.id], session)
      void queryClient.invalidateQueries({ queryKey: ['fitness-history'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteFitnessSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteServerFitnessSession(id),
    onSuccess: () => {
      toast.success('训练记录已删除')
      void queryClient.invalidateQueries({ queryKey: ['fitness-data'] })
      void queryClient.invalidateQueries({ queryKey: ['fitness-history'] })
      void queryClient.invalidateQueries({ queryKey: ['fitness-records'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useFitnessHistory() {
  return useQuery({
    queryKey: ['fitness-history'],
    queryFn: loadFitnessHistory,
  })
}

export function useFitnessSession(id: number | null) {
  return useQuery({
    queryKey: ['fitness-session', id],
    queryFn: () => loadFitnessSession(id!),
    enabled: id !== null,
  })
}

export function useFitnessRecords() {
  return useQuery({
    queryKey: ['fitness-records'],
    queryFn: loadFitnessRecords,
  })
}

export function useFitnessExport() {
  return useMutation({
    mutationFn: loadFitnessExport,
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
