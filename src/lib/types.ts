export type HouseholdRole = 'owner' | 'member'

export type Profile = {
  id: string
  display_name: string | null
  email: string | null
  created_at: string
}

export type Household = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export type HouseholdMember = {
  id: string
  household_id: string
  user_id: string
  role: HouseholdRole
  created_at: string
}

export type TrackedPerson = {
  id: string
  household_id: string
  profile_id: string | null
  name: string
  height_cm: number
  birth_date: string | null
  created_by: string
  created_at: string
}

export type WeightEntry = {
  id: string
  tracked_person_id: string
  measured_on: string
  weight_kg: number
  note: string | null
  created_by: string
  created_at: string
}

export type WeightGoal = {
  id: string
  tracked_person_id: string
  start_weight_kg: number
  target_weight_kg: number
  target_on: string | null
  created_at: string
}

export type AppData = {
  household: Household
  people: TrackedPerson[]
  entries: WeightEntry[]
  goals: WeightGoal[]
}

export type NewWeightEntry = {
  trackedPersonId: string
  measuredOn: string
  weightKg: number
  note?: string
}

export type NewTrackedPerson = {
  name: string
  heightCm: number
  birthDate?: string | null
  relationship?: string | null
}
