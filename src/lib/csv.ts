import type { AppData, FitnessSessionSummary, TrackedPerson, WeightEntry } from './types'
import { kgToJin } from './utils'

export function exportEntriesCsv(
  entries: WeightEntry[],
  people: TrackedPerson[],
) {
  const names = new Map(people.map((person) => [person.id, person.name]))
  const rows = [
    ['member', 'date', 'weight_jin', 'weight_kg', 'note'],
    ...entries.map((entry) => [
      names.get(entry.tracked_person_id) ?? 'unknown',
      entry.measured_on,
      kgToJin(entry.weight_kg).toFixed(1),
      entry.weight_kg.toFixed(1),
      entry.note ?? '',
    ]),
  ]
  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(filename, blob)
}

export function exportBackupJson(data: AppData) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      household: data.household,
      people: data.people,
      entries: data.entries,
      goals: data.goals,
    },
    null,
    2,
  )
}

export function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  downloadBlob(filename, blob)
}

export function exportFitnessHistoryCsv(sessions: FitnessSessionSummary[]) {
  const rows = [
    ['date', 'name', 'status', 'exercises', 'completed_sets', 'total_sets', 'progress_percent', 'volume_kg', 'duration_minutes', 'readiness', 'effort', 'pain', 'notes', 'pain_notes'],
    ...sessions.map((session) => [
      session.scheduledDate,
      session.name,
      session.status,
      session.exerciseCount,
      session.completedSets,
      session.totalSets,
      session.progressPercent,
      session.totalVolumeKg,
      session.durationMinutes ?? '',
      session.readinessScore ?? '',
      session.effortScore ?? '',
      session.painFlag ? 'yes' : 'no',
      session.notes ?? '',
      session.painNotes ?? '',
    ]),
  ]
  return rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
