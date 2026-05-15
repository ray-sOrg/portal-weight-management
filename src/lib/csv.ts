import type { TrackedPerson, WeightEntry } from './types'

export function exportEntriesCsv(
  entries: WeightEntry[],
  people: TrackedPerson[],
) {
  const names = new Map(people.map((person) => [person.id, person.name]))
  const rows = [
    ['member', 'date', 'weight_kg', 'note'],
    ...entries.map((entry) => [
      names.get(entry.tracked_person_id) ?? 'unknown',
      entry.measured_on,
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
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
