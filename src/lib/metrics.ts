import type { TrackedPerson, WeightEntry, WeightGoal } from './types'

export type TrendPoint = {
  date: string
  weight: number
  movingAverage: number
  bmi: number
}

export function calculateBmi(weightKg: number, heightCm: number) {
  if (heightCm <= 0) return 0
  const heightM = heightCm / 100
  return round(weightKg / (heightM * heightM), 1)
}

export function getBmiLabel(bmi: number) {
  if (bmi < 18.5) return '偏低'
  if (bmi < 24) return '健康'
  if (bmi < 28) return '偏高'
  return '肥胖'
}

export function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function sortEntries(entries: WeightEntry[]) {
  return [...entries].sort((a, b) =>
    a.measured_on.localeCompare(b.measured_on),
  )
}

export function getLatestEntry(entries: WeightEntry[]) {
  return sortEntries(entries).at(-1) ?? null
}

export function getWeightChange(entries: WeightEntry[], days: number) {
  const ordered = sortEntries(entries)
  const latest = ordered.at(-1)
  if (!latest) return null
  const latestTime = new Date(latest.measured_on).getTime()
  const boundary = latestTime - days * 24 * 60 * 60 * 1000
  const baseline =
    [...ordered]
      .reverse()
      .find((entry) => new Date(entry.measured_on).getTime() <= boundary) ??
    ordered[0]
  return round(latest.weight_kg - baseline.weight_kg, 1)
}

export type TrendRange = '30' | '90' | 'all'

export function filterEntriesByRange(entries: WeightEntry[], range: TrendRange) {
  const ordered = sortEntries(entries)
  if (range === 'all') return ordered
  const latest = ordered.at(-1)
  if (!latest) return []
  const latestTime = new Date(latest.measured_on).getTime()
  const boundary = latestTime - (Number(range) - 1) * 24 * 60 * 60 * 1000
  return ordered.filter((entry) => new Date(entry.measured_on).getTime() >= boundary)
}

export function getLargestDailySwing(entries: WeightEntry[]) {
  const ordered = sortEntries(entries)
  let largest: {
    date: string
    changeKg: number
  } | null = null
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]
    const previousTime = new Date(previous.measured_on).getTime()
    const currentTime = new Date(current.measured_on).getTime()
    const dayDiff = Math.round((currentTime - previousTime) / (24 * 60 * 60 * 1000))
    if (dayDiff !== 1) continue
    const changeKg = round(current.weight_kg - previous.weight_kg, 1)
    if (!largest || Math.abs(changeKg) > Math.abs(largest.changeKg)) {
      largest = { date: current.measured_on, changeKg }
    }
  }
  return largest
}

export function buildTrend(
  entries: WeightEntry[],
  person: TrackedPerson,
): TrendPoint[] {
  return sortEntries(entries).map((entry, index, ordered) => {
    const window = ordered.slice(Math.max(0, index - 2), index + 1)
    const average =
      window.reduce((total, item) => total + item.weight_kg, 0) / window.length
    return {
      date: entry.measured_on,
      weight: entry.weight_kg,
      movingAverage: round(average, 1),
      bmi: calculateBmi(entry.weight_kg, person.height_cm),
    }
  })
}

export function getGoalProgress(latestWeight: number, goal: WeightGoal | null) {
  if (!goal) return null
  const total = Math.abs(goal.start_weight_kg - goal.target_weight_kg)
  if (total === 0) return 100
  const remaining = Math.abs(latestWeight - goal.target_weight_kg)
  return Math.max(0, Math.min(100, round(((total - remaining) / total) * 100, 0)))
}

export function getStreakDays(entries: WeightEntry[], todayKey = getTodayDateKey()) {
  const days = new Set(entries.map((entry) => entry.measured_on))
  if (days.size === 0) return 0
  let streak = 0
  const latest = getLatestEntry(entries)
  if (!latest) return 0
  if (getDayDiff(latest.measured_on, todayKey) > 1) return 0
  let cursor = latest.measured_on
  for (;;) {
    if (!days.has(cursor)) break
    streak += 1
    cursor = getPreviousDateKey(cursor)
  }
  return streak
}

function getTodayDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPreviousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function getDayDiff(fromDateKey: string, toDateKey: string) {
  const [fromYear, fromMonth, fromDay] = fromDateKey.split('-').map(Number)
  const [toYear, toMonth, toDay] = toDateKey.split('-').map(Number)
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const to = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.floor((to - from) / (24 * 60 * 60 * 1000))
}

export function getInsights(
  entries: WeightEntry[],
  goal: WeightGoal | null,
  person: TrackedPerson,
) {
  const latest = getLatestEntry(entries)
  if (!latest) return ['还没有记录，先从今天的一次称重开始。']
  const bmi = calculateBmi(latest.weight_kg, person.height_cm)
  const change7 = getWeightChange(entries, 7)
  const daysSince =
    (Date.now() - new Date(latest.measured_on).getTime()) / (24 * 60 * 60 * 1000)
  const insights = [
    `当前 BMI 为 ${bmi.toFixed(1)}，处于${getBmiLabel(bmi)}区间。`,
  ]
  if (change7 !== null) {
    insights.push(
      `最近 7 天体重${change7 >= 0 ? '增加' : '减少'} ${Math.abs(change7 * 2).toFixed(
        1,
      )} 斤。`,
    )
  }
  if (goal) {
    const gap = round(latest.weight_kg - goal.target_weight_kg, 1)
    insights.push(`距离目标还差 ${Math.abs(gap * 2).toFixed(1)} 斤。`)
  }
  const swing = getLargestDailySwing(entries)
  if (swing && Math.abs(swing.changeKg) >= 1) {
    insights.push(
      `${swing.date} 单日波动 ${Math.abs(swing.changeKg * 2).toFixed(1)} 斤，可能受饮食、水分或称重时间影响。`,
    )
  }
  if (daysSince > 3) {
    insights.push('已经超过 3 天没有记录，趋势可能会变得不连续。')
  }
  return insights
}
