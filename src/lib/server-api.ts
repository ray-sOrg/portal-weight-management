import { calculateBmi } from './metrics'
import type {
  AppData,
  FitnessBootstrap,
  FitnessExercise,
  FitnessExerciseInput,
  FitnessFeedbackInput,
  FitnessExportData,
  FitnessPlan,
  FitnessPlanInput,
  FitnessRecord,
  FitnessSession,
  FitnessSessionSummary,
  FitnessSetInput,
  NewTrackedPerson,
  NewWeightEntry,
  NewWeightGoal,
  TrackedPerson,
  WeightEntry,
  WeightGoal,
} from './types'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
  total?: number
}

type RequestOptions = {
  skipAuthRefresh?: boolean
  timeoutMs?: number
}

const AUTH_ERROR_CODES = new Set([5001, 5002, 5003, 5004, 5005])
const REFRESHABLE_AUTH_CODES = new Set([5001, 5003])
let refreshRequest: Promise<void> | null = null

export class ApiRequestError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export function isAuthenticationError(error: unknown) {
  return error instanceof ApiRequestError && AUTH_ERROR_CODES.has(error.code)
}

type ServerUser = {
  uuid: string
  username: string
  displayName?: string | null
  role: string
  heightCm?: number | null
  birthDate?: string | null
  create_time?: string
}

type ServerWeightRecord = {
  id: number
  trackedPersonId?: number | null
  weight: number
  recordDate: string
  bodyFat?: number | null
  bmi?: number | null
  note?: string | null
  createdAt?: string
  updatedAt?: string
}

type ServerTrackedPerson = {
  id: number
  name: string
  heightCm: number
  birthDate?: string | null
  relationship?: string | null
  createdAt?: string
}

type ServerWeightGoal = {
  id: number
  trackedPersonId?: number | null
  startWeight: number
  targetWeight: number
  targetDate?: string | null
  createdAt?: string
  updatedAt?: string
}

const runtimeConfig =
  typeof window === 'undefined' ? undefined : window.__APP_CONFIG__

export const apiBaseUrl = (
  import.meta.env.DEV
    ? ''
    : runtimeConfig?.VITE_API_BASE_URL ||
      (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
      'https://api.tt829.cn'
).replace(/\/$/, '')

export async function getCurrentUser() {
  return request<ServerUser>('/api/user/login/info')
}

export async function loginWithPassword(username: string, password: string) {
  return request<ServerUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function logout() {
  return request<Record<string, never>>('/api/auth/logout', {
    method: 'POST',
  })
}

export async function updateProfile(profile: {
  displayName: string
  heightCm: number
  birthDate?: string | null
}) {
  return request<ServerUser>('/api/user/profile/update', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export async function createServerTrackedPerson(input: NewTrackedPerson) {
  return request<ServerTrackedPerson>('/api/weight/person/add', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function loadWeightAppData(): Promise<AppData> {
  const user = await getCurrentUser()
  const trackedPeople = await request<ServerTrackedPerson[]>('/api/weight/people')
  const records = await request<ServerWeightRecord[]>('/api/weight/records/all')
  let goals = await request<ServerWeightGoal[]>('/api/weight/goals')
  const heightCm = user.heightCm ?? 170
  const displayName = user.displayName || user.username
  const personId = `server-user-${user.username}`
  const extraPeople = trackedPeople.map((person) => mapTrackedPerson(person, user.username))
  const people = [
    {
      id: personId,
      household_id: 'server-console',
      profile_id: user.uuid,
      name: displayName,
      height_cm: heightCm,
      birth_date: user.birthDate ?? null,
      created_by: user.username,
      created_at: user.create_time ?? new Date().toISOString(),
    },
    ...extraPeople,
  ]

  const mappedGoals = goals.map((goal) => mapWeightGoal(goal, personId))
  const migratedGoals = await migrateLocalGoals(mappedGoals)
  if (migratedGoals) {
    goals = await request<ServerWeightGoal[]>('/api/weight/goals')
  }

  return {
    household: {
      id: 'server-console',
      name: '我的家庭',
      created_by: user.username,
      created_at: user.create_time ?? new Date().toISOString(),
    },
    people,
    entries: records.map((record) => mapWeightRecord(record, personId, user.username)),
    goals: goals.map((goal) => mapWeightGoal(goal, personId)),
    permissions: {
      canManageMembers: user.role === 'super_admin' || user.role === 'admin',
    },
  }
}

export async function upsertServerWeightGoal(input: NewWeightGoal) {
  const goal = await request<ServerWeightGoal>('/api/weight/goal/upsert', {
    method: 'POST',
    body: JSON.stringify({
      trackedPersonId: parseServerTrackedPersonId(input.trackedPersonId),
      startWeight: input.startWeightKg,
      targetWeight: input.targetWeightKg,
      targetDate: input.targetOn || undefined,
    }),
  })
  return goal
}

export async function addServerWeightEntry(input: NewWeightEntry) {
  const record = await request<ServerWeightRecord>('/api/weight/record/add', {
    method: 'POST',
    body: JSON.stringify({
      trackedPersonId: parseServerTrackedPersonId(input.trackedPersonId),
      weight: input.weightKg,
      recordDate: input.measuredOn,
      bmi: calculateBmi(input.weightKg, input.heightCm),
      note: input.note || undefined,
    }),
  })
  return record
}

export async function loadFitnessBootstrap() {
  return request<FitnessBootstrap>('/api/fitness/bootstrap')
}

export async function saveServerFitnessExercise(input: FitnessExerciseInput) {
  return request<FitnessExercise>('/api/fitness/exercise/save', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function archiveServerFitnessExercise(id: number) {
  return request<FitnessExercise>('/api/fitness/exercise/archive', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function saveServerFitnessPlan(input: FitnessPlanInput) {
  return request<FitnessPlan>('/api/fitness/plan/save', {
    method: 'POST',
    body: JSON.stringify(input),
  }, { timeoutMs: 30_000 })
}

export async function activateServerFitnessPlan(id: number) {
  return request<FitnessPlan>('/api/fitness/plan/activate', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function copyServerFitnessPlan(id: number, name?: string) {
  return request<FitnessPlan>('/api/fitness/plan/copy', {
    method: 'POST',
    body: JSON.stringify({ id, name }),
  })
}

export async function deleteServerFitnessPlan(id: number) {
  return request<{
    id: number
    activePlanId: number | null
    preservedSessionCount: number
  }>('/api/fitness/plan/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function startServerFitnessSession(input?: {
  scheduledDate?: string
  trackedPersonId?: number
}) {
  return request<FitnessSession>('/api/fitness/session/start', {
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  })
}

export async function saveServerFitnessSet(input: FitnessSetInput) {
  return request<FitnessSession>('/api/fitness/session/set/save', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deferServerFitnessSet(id: number) {
  return request<FitnessSession>('/api/fitness/session/set/defer', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function addServerFitnessSet(exerciseId: number) {
  return request<FitnessSession>('/api/fitness/session/exercise/set/add', {
    method: 'POST',
    body: JSON.stringify({ exerciseId }),
  })
}

export async function finishServerFitnessSession(input: FitnessFeedbackInput) {
  return request<FitnessSession>('/api/fitness/session/finish', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function saveServerFitnessFeedback(input: FitnessFeedbackInput) {
  return request<FitnessSession>('/api/fitness/session/feedback/save', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deleteServerFitnessSession(id: number) {
  return request<{ id: number }>('/api/fitness/session/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function loadFitnessHistory() {
  return request<FitnessSessionSummary[]>('/api/fitness/history?limit=100')
}

export async function loadFitnessSession(id: number) {
  return request<FitnessSession>(`/api/fitness/session/${id}`)
}

export async function loadFitnessRecords() {
  return request<FitnessRecord[]>('/api/fitness/records')
}

export async function loadFitnessExport() {
  return request<FitnessExportData>('/api/fitness/export')
}

export async function editServerWeightEntry(input: NewWeightEntry) {
  const record = await request<ServerWeightRecord>('/api/weight/record/edit', {
    method: 'POST',
    body: JSON.stringify({
      id: input.existingEntryId,
      trackedPersonId: parseServerTrackedPersonId(input.trackedPersonId),
      weight: input.weightKg,
      recordDate: input.measuredOn,
      bmi: calculateBmi(input.weightKg, input.heightCm),
      note: input.note || undefined,
    }),
  })
  return record
}

function mapTrackedPerson(person: ServerTrackedPerson, username: string): TrackedPerson {
  return {
    id: `server-person-${person.id}`,
    household_id: 'server-console',
    profile_id: null,
    name: person.name,
    height_cm: person.heightCm,
    birth_date: person.birthDate ?? null,
    created_by: username,
    created_at: person.createdAt ?? new Date().toISOString(),
  }
}

function mapWeightRecord(
  record: ServerWeightRecord,
  trackedPersonId: string,
  username: string,
): WeightEntry {
  return {
    id: String(record.id),
    tracked_person_id: record.trackedPersonId ? `server-person-${record.trackedPersonId}` : trackedPersonId,
    measured_on: record.recordDate,
    weight_kg: record.weight,
    note: record.note ?? null,
    created_by: username,
    created_at: record.createdAt ?? `${record.recordDate}T00:00:00Z`,
  }
}

function mapWeightGoal(goal: ServerWeightGoal, trackedPersonId: string): WeightGoal {
  return {
    id: String(goal.id),
    tracked_person_id: goal.trackedPersonId ? `server-person-${goal.trackedPersonId}` : trackedPersonId,
    start_weight_kg: goal.startWeight,
    target_weight_kg: goal.targetWeight,
    target_on: goal.targetDate ?? null,
    created_at: goal.createdAt ?? new Date().toISOString(),
  }
}

async function migrateLocalGoals(serverGoals: WeightGoal[]) {
  const localGoals = readLocalGoals()
  const missingGoals = localGoals.filter(
    (localGoal) =>
      !serverGoals.some((serverGoal) => serverGoal.tracked_person_id === localGoal.tracked_person_id),
  )
  if (missingGoals.length === 0) return false
  await Promise.all(
    missingGoals.map((goal) =>
      upsertServerWeightGoal({
        trackedPersonId: goal.tracked_person_id,
        startWeightKg: goal.start_weight_kg,
        targetWeightKg: goal.target_weight_kg,
        targetOn: goal.target_on,
      }),
    ),
  )
  localStorage.removeItem('weight-goals-v1')
  return true
}

function readLocalGoals(): WeightGoal[] {
  try {
    const raw = localStorage.getItem('weight-goals-v1')
    return raw ? JSON.parse(raw) as WeightGoal[] : []
  } catch {
    return []
  }
}

function parseServerTrackedPersonId(trackedPersonId: string) {
  return trackedPersonId.startsWith('server-person-')
    ? Number(trackedPersonId.replace('server-person-', ''))
    : undefined
}

async function request<T>(path: string, init: RequestInit = {}, options: RequestOptions = {}) {
  const payload = await sendRequest<T>(path, init, options.timeoutMs)
  if (REFRESHABLE_AUTH_CODES.has(payload.code) && !options.skipAuthRefresh) {
    await refreshAccessToken()
    const retryPayload = await sendRequest<T>(path, init, options.timeoutMs)
    if (retryPayload.code !== 200) {
      throw new ApiRequestError(
        retryPayload.code,
        normalizeApiMessage(retryPayload.message),
      )
    }
    return retryPayload.data
  }

  if (payload.code !== 200) {
    throw new ApiRequestError(payload.code, normalizeApiMessage(payload.message))
  }
  return payload.data
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = request<Record<string, never>>(
      '/api/auth/token/refresh',
      { method: 'POST' },
      { skipAuthRefresh: true },
    ).then(() => undefined).finally(() => {
      refreshRequest = null
    })
  }
  await refreshRequest
}

async function sendRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  const csrfToken = getCsrfToken(path, init.method)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      signal: init.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw new Error('网络连接失败，请检查网络后重试')
  } finally {
    window.clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new Error(`服务暂时不可用（${response.status}）`)
  }

  return (await response.json()) as ApiResponse<T>
}

function getCsrfToken(path: string, method = 'GET') {
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') return ''
  if (path === '/api/auth/token/refresh' || path === '/api/auth/logout') {
    return getCookie('csrf_refresh_token')
  }
  if (path.startsWith('/api/auth/')) return ''
  return getCookie('csrf_access_token')
}

function normalizeApiMessage(message?: string) {
  if (!message) return 'API 请求失败'
  if (message.toLowerCase().includes('csrf')) {
    return '登录状态校验失败，请退出后重新登录'
  }
  if (message.toLowerCase().includes('header')) {
    return '登录请求头校验失败，请重新登录'
  }
  return message
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return ''
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? ''
}
