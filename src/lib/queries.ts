import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { demoData } from './mock-data'
import { isSupabaseConfigured, supabase } from './supabase'
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
  if (!isSupabaseConfigured || !supabase) return demoData

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) return demoData

  const { data: membership, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (memberError) throw memberError
  if (!membership) return demoData

  const [household, people, entries, goals] = await Promise.all([
    supabase
      .from('households')
      .select('*')
      .eq('id', membership.household_id)
      .single(),
    supabase
      .from('tracked_people')
      .select('*')
      .eq('household_id', membership.household_id)
      .order('created_at'),
    supabase
      .from('weight_entries')
      .select('*')
      .order('measured_on', { ascending: true }),
    supabase.from('weight_goals').select('*'),
  ])

  if (household.error) throw household.error
  if (people.error) throw people.error
  if (entries.error) throw entries.error
  if (goals.error) throw goals.error

  const peopleIds = new Set(people.data.map((person) => person.id))
  return {
    household: household.data,
    people: people.data,
    entries: entries.data.filter((entry) => peopleIds.has(entry.tracked_person_id)),
    goals: goals.data.filter((goal) => peopleIds.has(goal.tracked_person_id)),
  }
}

async function addWeightEntry(input: NewWeightEntry) {
  if (!isSupabaseConfigured || !supabase) {
    demoData.entries.push({
      id: crypto.randomUUID(),
      tracked_person_id: input.trackedPersonId,
      measured_on: input.measuredOn,
      weight_kg: input.weightKg,
      note: input.note ?? null,
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
    })
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录后再记录体重。')

  const { error } = await supabase.from('weight_entries').insert({
    tracked_person_id: input.trackedPersonId,
    measured_on: input.measuredOn,
    weight_kg: input.weightKg,
    note: input.note || null,
    created_by: user.id,
  })
  if (error) throw error
}

async function upsertPerson(person: TrackedPerson) {
  if (!isSupabaseConfigured || !supabase) {
    const index = demoData.people.findIndex((item) => item.id === person.id)
    if (index >= 0) demoData.people[index] = person
    else demoData.people.push(person)
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录后再管理家庭成员。')

  const { error } = await supabase.from('tracked_people').upsert({
    ...person,
    created_by: user.id,
  })
  if (error) throw error
}
