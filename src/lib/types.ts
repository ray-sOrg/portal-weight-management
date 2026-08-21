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
  permissions: {
    canManageMembers: boolean
  }
}

export type NewWeightEntry = {
  trackedPersonId: string
  measuredOn: string
  weightKg: number
  heightCm: number
  existingEntryId?: string
  note?: string
}

export type NewWeightGoal = {
  trackedPersonId: string
  startWeightKg: number
  targetWeightKg: number
  targetOn?: string | null
}

export type NewTrackedPerson = {
  name: string
  heightCm: number
  birthDate?: string | null
  relationship?: string | null
}

export type FitnessExerciseCategory =
  | 'strength'
  | 'skill'
  | 'cardio'
  | 'mobility'
  | 'recovery'

export type FitnessMetricType = 'reps' | 'duration' | 'distance' | 'check'

export type FitnessExerciseMedia = {
  matchType: 'exact' | 'related' | 'informational'
  note: string | null
  images: Array<{
    position: 'start' | 'finish' | 'overview'
    url: string
  }>
  manifestUrl: string
}

export type FitnessExercise = {
  id: number
  name: string
  category: FitnessExerciseCategory
  primaryMuscle: string | null
  secondaryMuscles: string | null
  equipment: string | null
  metricType: FitnessMetricType
  instructions: string | null
  cautions: string | null
  progressionNotes: string | null
  media: FitnessExerciseMedia | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type FitnessPlanExercise = {
  id?: number
  exerciseId: number
  sortOrder: number
  sets: number | null
  repsMin: number | null
  repsMax: number | null
  durationSecondsMin: number | null
  durationSecondsMax: number | null
  rirMin: number | null
  rirMax: number | null
  targetWeightKg: number | null
  weightNote: string | null
  restSeconds: number | null
  progressionType: string | null
  planNotes: string | null
  supersetGroup: string | null
  eachSide: boolean
  exercise?: FitnessExercise | null
}

export type FitnessPlanDay = {
  id?: number
  weekday: number
  name: string
  focus: string | null
  isRest: boolean
  estimatedMinutes: number | null
  notes: string | null
  exercises: FitnessPlanExercise[]
}

export type FitnessPlan = {
  id: number
  trackedPersonId: number | null
  name: string
  description: string | null
  durationWeeks: number
  startDate: string | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
  days: FitnessPlanDay[]
}

export type FitnessSessionStatus = 'in_progress' | 'completed' | 'partial' | 'skipped'

export type FitnessSet = {
  id: number
  setNumber: number
  actualReps: number | null
  actualDurationSeconds: number | null
  actualWeightKg: number | null
  rir: number | null
  completed: boolean
  completedAt: string | null
  deferredAt: string | null
  activatedAt: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type FitnessSessionExercise = {
  id: number
  sourcePlanExerciseId: number | null
  exerciseId: number | null
  sortOrder: number
  exerciseName: string
  category: FitnessExerciseCategory
  primaryMuscle: string | null
  equipment: string | null
  metricType: FitnessMetricType
  instructions: string | null
  cautions: string | null
  media: FitnessExerciseMedia | null
  targetSets: number | null
  repsMin: number | null
  repsMax: number | null
  durationSecondsMin: number | null
  durationSecondsMax: number | null
  rirMin: number | null
  rirMax: number | null
  targetWeightKg: number | null
  weightNote: string | null
  restSeconds: number | null
  progressionType: string | null
  planNotes: string | null
  supersetGroup: string | null
  eachSide: boolean
  completed: boolean
  notes: string | null
  sets: FitnessSet[]
  previousSets: FitnessSet[]
}

export type FitnessSession = {
  id: number
  trackedPersonId: number | null
  planId: number | null
  planDayId: number | null
  scheduledDate: string
  weekday: number
  name: string
  focus: string | null
  status: FitnessSessionStatus
  startedAt: string | null
  endedAt: string | null
  notes: string | null
  readinessScore: number | null
  effortScore: number | null
  painFlag: boolean
  painNotes: string | null
  createdAt: string | null
  updatedAt: string | null
  completedSets: number
  totalSets: number
  progressPercent: number
  totalVolumeKg: number
  exercises: FitnessSessionExercise[]
}

export type FitnessSessionSummary = Omit<FitnessSession, 'exercises'> & {
  exerciseCount: number
  durationMinutes: number | null
}

export type FitnessRecord = {
  exerciseId: number | null
  exerciseName: string
  primaryMuscle: string | null
  maxWeightKg: number | null
  maxReps: number | null
  estimatedOneRepMaxKg: number | null
  maxSetVolumeKg: number | null
  completedSets: number
  lastRecordDate: string | null
  trend: FitnessTrendPoint[]
}

export type FitnessTrendPoint = {
  date: string
  maxWeightKg: number | null
  maxReps: number | null
  estimatedOneRepMaxKg: number | null
  totalVolumeKg: number
}

export type FitnessSetInput = {
  id: number
  actualReps?: number | null
  actualDurationSeconds?: number | null
  actualWeightKg?: number | null
  rir?: number | null
  completed: boolean
  notes?: string | null
}

export type FitnessFeedbackInput = {
  id: number
  readinessScore: number | null
  effortScore: number | null
  painFlag: boolean
  painNotes?: string | null
  notes?: string | null
}

export type FitnessExportData = {
  exportedAt: string
  exercises: FitnessExercise[]
  plans: FitnessPlan[]
  sessions: FitnessSession[]
}

export type FitnessBootstrap = {
  today: string
  todayWeekday: number
  exercises: FitnessExercise[]
  plans: FitnessPlan[]
  activePlanId: number | null
  todaySession: FitnessSession | null
}

export type FitnessExerciseInput = Omit<
  FitnessExercise,
  'id' | 'createdAt' | 'updatedAt' | 'media'
> & { id?: number }

export type FitnessPlanInput = Omit<
  FitnessPlan,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: number }
