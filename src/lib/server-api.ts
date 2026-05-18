import { calculateBmi } from './metrics'
import type { AppData, NewWeightEntry, WeightEntry } from './types'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
  total?: number
}

type ServerUser = {
  uuid: string
  username: string
  role: string
  heightCm?: number | null
  create_time?: string
}

type ServerWeightRecord = {
  id: number
  weight: number
  recordDate: string
  bodyFat?: number | null
  bmi?: number | null
  note?: string | null
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

export async function updateProfileHeight(heightCm: number) {
  const user = await request<ServerUser>('/api/user/profile/update', {
    method: 'POST',
    body: JSON.stringify({ heightCm }),
  })
  writeProfileHeight(heightCm)
  return user
}

export async function loadWeightAppData(): Promise<AppData> {
  const user = await getCurrentUser()
  const records = await request<ServerWeightRecord[]>('/api/weight/records/all')
  const heightCm = user.heightCm ?? readProfileHeight()
  writeProfileHeight(heightCm)
  const personId = `server-user-${user.username}`

  return {
    household: {
      id: 'server-console',
      name: `${user.username} 的体重记录`,
      created_by: user.username,
      created_at: user.create_time ?? new Date().toISOString(),
    },
    people: [
      {
        id: personId,
        household_id: 'server-console',
        profile_id: user.uuid,
        name: user.username,
        height_cm: heightCm,
        birth_year: null,
        created_by: user.username,
        created_at: user.create_time ?? new Date().toISOString(),
      },
    ],
    entries: records.map((record) => mapWeightRecord(record, personId, user.username)),
    goals: [],
  }
}

export async function addServerWeightEntry(input: NewWeightEntry, heightCm: number) {
  const record = await request<ServerWeightRecord>('/api/weight/record/add', {
    method: 'POST',
    body: JSON.stringify({
      weight: input.weightKg,
      recordDate: input.measuredOn,
      bmi: calculateBmi(input.weightKg, heightCm),
      note: input.note || undefined,
    }),
  })
  return record
}

export function readProfileHeight() {
  const raw = localStorage.getItem('weight-profile-height-cm')
  const value = raw ? Number(raw) : 170
  return Number.isFinite(value) && value >= 80 && value <= 250 ? value : 170
}

export function writeProfileHeight(heightCm: number) {
  localStorage.setItem('weight-profile-height-cm', String(heightCm))
}

function mapWeightRecord(
  record: ServerWeightRecord,
  trackedPersonId: string,
  username: string,
): WeightEntry {
  return {
    id: String(record.id),
    tracked_person_id: trackedPersonId,
    measured_on: record.recordDate,
    weight_kg: record.weight,
    note: record.note ?? null,
    created_by: username,
    created_at: record.createdAt ?? `${record.recordDate}T00:00:00Z`,
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 8_000)
  const csrfToken = getCookie('csrf_access_token')

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    signal: init.signal ?? controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      ...init.headers,
    },
  }).finally(() => window.clearTimeout(timeoutId))

  if (!response.ok) {
    throw new Error(`API 请求失败：${response.status}`)
  }

  const payload = (await response.json()) as ApiResponse<T>
  if (payload.code !== 200) {
    throw new Error(payload.message || 'API 请求失败')
  }
  return payload.data
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
