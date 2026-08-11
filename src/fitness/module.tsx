import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Clock3,
  Dumbbell,
  Download,
  History,
  LibraryBig,
  LoaderCircle,
  Medal,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  Settings2,
  SkipForward,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { Button, EmptyState, Input, Label, Panel } from '@/components/ui'
import {
  useArchiveFitnessExercise,
  useActivateFitnessPlan,
  useCopyFitnessPlan,
  useDeleteFitnessSession,
  useFitnessData,
  useFitnessHistory,
  useFitnessExport,
  useFitnessRecords,
  useFitnessSession,
  useFinishFitnessSession,
  useSaveFitnessExercise,
  useSaveFitnessFeedback,
  useSaveFitnessPlan,
  useSaveFitnessSet,
  useStartFitnessSession,
} from '@/lib/queries'
import type {
  FitnessExercise,
  FitnessBootstrap,
  FitnessExerciseCategory,
  FitnessExerciseInput,
  FitnessFeedbackInput,
  FitnessMetricType,
  FitnessPlan,
  FitnessPlanDay,
  FitnessPlanExercise,
  FitnessSessionExercise,
  FitnessSessionSummary,
  FitnessSet,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { downloadCsv, downloadJson, exportFitnessHistoryCsv } from '@/lib/csv'
import { FitnessTrendChart } from './trend-chart'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const FITNESS_NAV = [
  { to: '/fitness', label: '今日', icon: Dumbbell },
  { to: '/fitness/plan', label: '计划', icon: CalendarDays },
  { to: '/fitness/exercises', label: '动作库', icon: LibraryBig },
  { to: '/fitness/history', label: '历史', icon: History },
  { to: '/fitness/records', label: '纪录', icon: Medal },
] as const

const CATEGORY_LABELS: Record<FitnessExerciseCategory, string> = {
  strength: '力量',
  skill: '技能',
  cardio: '有氧',
  mobility: '灵活性',
  recovery: '恢复',
}

const METRIC_LABELS: Record<FitnessMetricType, string> = {
  reps: '次数',
  duration: '时间',
  distance: '距离',
  check: '完成即可',
}

const EMPTY_EXERCISE: FitnessExerciseInput = {
  name: '',
  category: 'strength',
  primaryMuscle: '',
  secondaryMuscles: '',
  equipment: '',
  metricType: 'reps',
  instructions: '',
  cautions: '',
  progressionNotes: '',
  isActive: true,
}

function FitnessShell({
  eyebrow,
  title,
  body,
  action,
  children,
}: {
  eyebrow: string
  title: string
  body: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      <section className="fitness-hero relative overflow-hidden rounded-[1.6rem] bg-[#13251f] px-5 py-6 text-white shadow-[0_28px_80px_rgba(19,37,31,0.2)] sm:px-7 md:py-8">
        <div className="absolute -right-12 -top-16 size-48 rounded-full border border-white/10" />
        <div className="absolute -right-2 top-5 size-28 rounded-full border border-[#d8f96f]/25" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d8f96f]">
              {eyebrow}
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold leading-none sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 md:text-base">{body}</p>
          </div>
          {action}
        </div>
      </section>

      <nav className="no-scrollbar flex gap-0 overflow-x-auto rounded-xl border border-line bg-white/90 p-1.5 shadow-sm sm:gap-1">
        {FITNESS_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex h-10 min-w-0 flex-1 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 text-[11px] font-medium text-sage-dark transition hover:bg-mist sm:flex-none sm:justify-start sm:gap-2 sm:px-3 sm:text-sm"
            activeProps={{
              className:
                'fitness-subnav-active bg-[#13251f] text-white shadow-sm',
            }}
            activeOptions={{ exact: item.to === '/fitness' }}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}

function FitnessLoading() {
  return (
    <Panel>
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <LoaderCircle className="animate-spin text-sage-dark" size={28} />
        <p className="mt-4 font-display text-2xl font-semibold">正在读取训练计划</p>
        <p className="mt-2 text-sm text-sage">动作库与星期安排正在从后端同步。</p>
      </div>
    </Panel>
  )
}

function FitnessError({ message }: { message: string }) {
  return (
    <Panel>
      <div className="flex min-h-64 flex-col items-center justify-center text-center">
        <AlertTriangle className="text-coral" size={28} />
        <p className="mt-4 font-display text-2xl font-semibold">训练数据暂时不可用</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-sage">{message}</p>
        <Link to="/settings" className="mt-5 text-sm font-semibold text-sage-dark underline">
          检查登录状态
        </Link>
      </div>
    </Panel>
  )
}

function useActiveFitnessPlan() {
  const query = useFitnessData()
  const activePlan =
    query.data?.plans.find((plan) => plan.id === query.data?.activePlanId) ??
    query.data?.plans[0] ??
    null
  return { ...query, activePlan }
}

export function FitnessTodayPage() {
  const { data, activePlan, isLoading, error } = useActiveFitnessPlan()
  const startSession = useStartFitnessSession()
  const finishSession = useFinishFitnessSession()
  const saveFeedback = useSaveFitnessFeedback()
  const saveSet = useSaveFitnessSet()
  const restTimer = useRestTimer()
  if (isLoading) return <FitnessLoading />
  if (error) return <FitnessError message={error.message} />
  if (!data || !activePlan) return <FitnessError message="当前账号还没有训练计划。" />

  const todayDay = activePlan.days.find((day) => day.weekday === data.todayWeekday)
  const session = data.todaySession
  const trainingDays = activePlan.days.filter((day) => !day.isRest).length

  return (
    <FitnessShell
      eyebrow={`${data.today} · ${WEEKDAYS[data.todayWeekday - 1]}`}
      title={todayDay?.name ?? '今日未安排训练'}
      body={todayDay?.focus ?? '恢复也是计划的一部分。保持轻松活动，给下一次训练留出状态。'}
      action={
        <div className="grid grid-cols-3 gap-2 text-center">
          <HeroStat value={`${activePlan.durationWeeks}`} label="计划周数" />
          <HeroStat value={`${trainingDays}`} label="每周训练" />
          <HeroStat value={`${todayDay?.estimatedMinutes ?? 0}`} label="预计分钟" />
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {activePlan.days.map((day) => (
          <div
            key={day.weekday}
            className={cn(
              'rounded-xl border px-1.5 py-3 text-center transition sm:px-3',
              day.weekday === data.todayWeekday
                ? 'border-[#13251f] bg-[#13251f] text-white shadow-lg'
                : 'border-line bg-white text-sage-dark',
            )}
          >
            <p className="text-[10px] font-semibold sm:text-xs">{WEEKDAYS[day.weekday - 1]}</p>
            <div
              className={cn(
                'mx-auto mt-2 size-1.5 rounded-full',
                day.isRest ? 'bg-gold' : 'bg-[#d8f96f]',
              )}
            />
            <p className="mt-2 hidden truncate text-[11px] opacity-70 sm:block">{day.name}</p>
          </div>
        ))}
      </div>

      {todayDay?.exercises.length ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-dark">
                今日清单
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold">按顺序完成</h2>
            </div>
            {session ? (
              <span className="rounded-full bg-[#eafbb5] px-3 py-1 text-xs font-semibold tabular-nums text-[#314017]">
                {session.completedSets}/{session.totalSets} 组
              </span>
            ) : null}
          </div>
          {session ? (
            <>
              <SessionProgress session={session} />
              <div className="grid gap-3">
                {session.exercises.map((exercise, index) => (
                  <WorkoutExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    savingSetId={saveSet.variables?.id}
                    onSave={(input, restSeconds) =>
                      saveSet.mutate(input, {
                        onSuccess: () => {
                          if (input.completed && restSeconds) restTimer.start(restSeconds)
                        },
                      })
                    }
                  />
                ))}
              </div>
              <WorkoutFeedbackForm
                key={`${session.id}-${session.updatedAt}`}
                session={session}
                pending={finishSession.isPending || saveFeedback.isPending}
                onSubmit={(input) => session.status === 'in_progress' ? finishSession.mutate(input) : saveFeedback.mutate(input)}
              />
            </>
          ) : (
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold">准备好就开始</h3>
                <p className="mt-1 text-sm leading-6 text-sage">开始后会锁定今天的动作快照，之后修改计划也不会改变这次记录。</p>
              </div>
              <Button type="button" onClick={() => startSession.mutate()} disabled={startSession.isPending}>
                <Play size={17} />{startSession.isPending ? '创建中' : '开始今日训练'}
              </Button>
            </Panel>
          )}
        </section>
      ) : (
        <EmptyState title="今天是恢复日" body={todayDay?.notes || '走路、拉伸和睡眠同样属于训练计划。'} />
      )}
      {restTimer.visible ? <RestTimer {...restTimer} /> : null}
    </FitnessShell>
  )
}

function WorkoutFeedbackForm({ session, pending, onSubmit }: {
  session: NonNullable<FitnessBootstrap['todaySession']>
  pending: boolean
  onSubmit: (input: FitnessFeedbackInput) => void
}) {
  const [readinessScore, setReadinessScore] = useState(() => session.readinessScore ?? 3)
  const [effortScore, setEffortScore] = useState(() => session.effortScore ?? 7)
  const [painFlag, setPainFlag] = useState(() => session.painFlag)
  const [painNotes, setPainNotes] = useState(() => session.painNotes ?? '')
  const [notes, setNotes] = useState(() => session.notes ?? '')
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ id: session.id, readinessScore, effortScore, painFlag, painNotes, notes })
  }
  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-line bg-[#13251f] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d8f96f]">训练复盘</p><h3 className="mt-1 font-display text-2xl font-semibold">{session.status === 'in_progress' ? '结束前，记下身体反馈' : '本次训练反馈'}</h3></div>
        <p className="text-xs text-white/60">{session.completedSets}/{session.totalSets} 组 · {formatNumber(session.totalVolumeKg)} kg</p>
      </div>
      <div className="grid gap-5 p-4 lg:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-dark">训练前状态</legend>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" onClick={() => setReadinessScore(score)} className={cn('h-10 rounded-lg border text-sm font-semibold transition', readinessScore === score ? 'border-[#13251f] bg-[#13251f] text-[#d8f96f]' : 'border-line bg-mist text-sage-dark hover:border-sage')}>{score}</button>)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-sage"><span>很疲劳</span><span>状态很好</span></div>
        </fieldset>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-dark">本次难度 · {effortScore}/10</span>
          <input type="range" min="1" max="10" value={effortScore} onChange={(event) => setEffortScore(Number(event.target.value))} className="mt-4 w-full accent-[#355e4d]" />
          <span className="mt-1 flex justify-between text-[10px] text-sage"><span>轻松</span><span>接近极限</span></span>
        </label>
        <label className="lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-dark">训练备注</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="动作状态、重量调整、下次要注意的事情…" className="fitness-textarea mt-2" />
        </label>
        <div className="lg:col-span-2">
          <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition', painFlag ? 'border-coral bg-coral/5' : 'border-line bg-mist/50')}>
            <input type="checkbox" checked={painFlag} onChange={(event) => setPainFlag(event.target.checked)} className="mt-0.5 size-4 accent-coral" />
            <span><span className="block text-sm font-semibold text-ink">出现疼痛或异常不适</span><span className="mt-1 block text-xs text-sage">普通肌肉疲劳不用勾选；锐痛、关节痛或异常拉扯感建议记录。</span></span>
          </label>
          {painFlag ? <textarea value={painNotes} onChange={(event) => setPainNotes(event.target.value)} rows={2} placeholder="不适部位、动作和感觉…" className="fitness-textarea mt-2" required /> : null}
        </div>
      </div>
      <div className="flex justify-end border-t border-line p-4">
        <Button type="submit" disabled={pending || (painFlag && !painNotes.trim())}><Check size={17} />{pending ? '保存中' : session.status === 'in_progress' ? '保存复盘并结束训练' : '更新训练复盘'}</Button>
      </div>
    </form>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
      <p className="text-2xl font-semibold tabular-nums text-[#d8f96f]">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-white/50">{label}</p>
    </div>
  )
}

function SessionProgress({ session }: { session: NonNullable<FitnessBootstrap['todaySession']> }) {
  return (
    <div className="rounded-2xl bg-[#13251f] p-4 text-white">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-[0.14em] text-white/60">今日进度</span>
        <span className="tabular-nums text-[#d8f96f]">{session.progressPercent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#d8f96f] transition-all" style={{ width: `${session.progressPercent}%` }} />
      </div>
    </div>
  )
}

function WorkoutExerciseCard({
  exercise,
  index,
  savingSetId,
  onSave,
}: {
  exercise: FitnessSessionExercise
  index: number
  savingSetId?: number
  onSave: (input: Parameters<ReturnType<typeof useSaveFitnessSet>['mutate']>[0], restSeconds: number | null) => void
}) {
  const previousSetByNumber = useMemo(
    () => new Map(exercise.previousSets.map((item) => [item.setNumber, item])),
    [exercise.previousSets],
  )
  return (
    <article className="fitness-list-item overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(25,32,31,0.05)]">
      <div className="flex gap-3 border-b border-line p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#13251f] font-display text-xl font-semibold text-[#d8f96f]">
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink">{exercise.exerciseName}</h3>
            {exercise.completed ? <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-sage-dark">已完成</span> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-sage">{exercise.planNotes || exercise.instructions}</p>
          <p className="mt-2 text-xs text-sage-dark">
            目标 {formatSessionExerciseTarget(exercise)}{exercise.restSeconds ? ` · 休息 ${formatDuration(exercise.restSeconds)}` : ''}
          </p>
        </div>
      </div>
      <div className="divide-y divide-line">
        {exercise.sets.map((fitnessSet) => (
          <WorkoutSetRow
            key={`${fitnessSet.id}-${fitnessSet.updatedAt}`}
            fitnessSet={fitnessSet}
            exercise={exercise}
            previousSet={previousSetByNumber.get(fitnessSet.setNumber)}
            pending={savingSetId === fitnessSet.id}
            onSave={onSave}
          />
        ))}
      </div>
    </article>
  )
}

function WorkoutSetRow({ fitnessSet, exercise, previousSet, pending, onSave }: {
  fitnessSet: FitnessSet
  exercise: FitnessSessionExercise
  previousSet?: FitnessSet
  pending: boolean
  onSave: (input: Parameters<ReturnType<typeof useSaveFitnessSet>['mutate']>[0], restSeconds: number | null) => void
}) {
  const [reps, setReps] = useState(() => String(fitnessSet.completed ? fitnessSet.actualReps ?? '' : fitnessSet.actualReps ?? previousSet?.actualReps ?? exercise.repsMin ?? ''))
  const [duration, setDuration] = useState(() => String(fitnessSet.completed ? fitnessSet.actualDurationSeconds ?? '' : fitnessSet.actualDurationSeconds ?? previousSet?.actualDurationSeconds ?? exercise.durationSecondsMin ?? ''))
  const [weight, setWeight] = useState(() => String(fitnessSet.completed ? fitnessSet.actualWeightKg ?? '' : fitnessSet.actualWeightKg ?? previousSet?.actualWeightKg ?? exercise.targetWeightKg ?? ''))
  const [rir, setRir] = useState(() => String(fitnessSet.completed ? fitnessSet.rir ?? '' : fitnessSet.rir ?? previousSet?.rir ?? exercise.rirMin ?? ''))
  const toggleSet = () => onSave({
    id: fitnessSet.id,
    actualReps: exercise.metricType === 'reps' ? nullableNumber(reps) : null,
    actualDurationSeconds: exercise.metricType === 'duration' ? nullableNumber(duration) : null,
    actualWeightKg: nullableNumber(weight),
    rir: nullableNumber(rir),
    completed: !fitnessSet.completed,
  }, exercise.restSeconds)

  return (
    <div className={cn('grid gap-3 px-4 py-3 sm:grid-cols-[3rem_1fr_auto] sm:items-end', fitnessSet.completed && 'bg-mint/20')}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">组</p>
        <p className="mt-1 font-semibold tabular-nums">{fitnessSet.setNumber}</p>
        {previousSet && !fitnessSet.completed ? <p className="mt-1 text-[9px] font-semibold text-sage-dark">沿用上次</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {exercise.metricType === 'reps' ? <CompactInput label="次数" value={reps} onChange={setReps} /> : null}
        {exercise.metricType === 'duration' ? <CompactInput label="秒" value={duration} onChange={setDuration} /> : null}
        {exercise.category === 'strength' ? <CompactInput label="重量 kg" value={weight} onChange={setWeight} step="0.5" /> : null}
        {exercise.rirMin !== null ? <CompactInput label="RIR" value={rir} onChange={setRir} /> : null}
      </div>
      <Button
        type="button"
        variant={fitnessSet.completed ? 'secondary' : 'primary'}
        className="w-full sm:w-24"
        onClick={toggleSet}
        disabled={pending}
      >
        {fitnessSet.completed ? <><Pause size={16} />撤销</> : <><Check size={16} />{pending ? '保存中' : '完成'}</>}
      </Button>
    </div>
  )
}

function CompactInput({ label, value, onChange, step = '1' }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  return (
    <label>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-sage">{label}</span>
      <Input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9" />
    </label>
  )
}

function useRestTimer() {
  const [seconds, setSeconds] = useState(0)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!visible || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [visible, seconds])
  return {
    seconds,
    visible,
    start: (nextSeconds: number) => { setSeconds(nextSeconds); setVisible(true) },
    addThirty: () => setSeconds((current) => current + 30),
    skip: () => { setSeconds(0); setVisible(false) },
  }
}

function RestTimer({ seconds, addThirty, skip }: ReturnType<typeof useRestTimer>) {
  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-[#13251f] p-3 text-white shadow-2xl sm:bottom-6">
      <div className="flex size-11 items-center justify-center rounded-xl bg-[#d8f96f] text-[#13251f]"><Clock3 size={20} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">组间休息</p>
        <p className="font-display text-2xl font-semibold tabular-nums">{seconds > 0 ? formatClock(seconds) : '可以继续'}</p>
      </div>
      <Button type="button" variant="ghost" className="px-2 text-white hover:bg-white/10" onClick={addThirty}>+30s</Button>
      <button type="button" className="flex size-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20" onClick={skip} aria-label="跳过休息"><SkipForward size={18} /></button>
    </div>
  )
}

export function FitnessPlanPage() {
  const { data, activePlan, isLoading, error } = useActiveFitnessPlan()
  if (isLoading) return <FitnessLoading />
  if (error) return <FitnessError message={error.message} />
  if (!data || !activePlan) return <FitnessError message="当前账号还没有训练计划。" />
  return <FitnessPlanWorkspace data={data} activePlan={activePlan} />
}

function FitnessPlanWorkspace({ data, activePlan }: { data: FitnessBootstrap; activePlan: FitnessPlan }) {
  const [selectedPlanId, setSelectedPlanId] = useState(activePlan.id)
  const selectedPlan = data.plans.find((plan) => plan.id === selectedPlanId) ?? activePlan
  return <FitnessPlanEditor key={selectedPlan.id} data={data} activePlan={selectedPlan} selectedPlanId={selectedPlan.id} onSelectPlan={setSelectedPlanId} />
}

function FitnessPlanEditor({
  data,
  activePlan,
  selectedPlanId,
  onSelectPlan,
}: {
  data: FitnessBootstrap
  activePlan: FitnessPlan
  selectedPlanId: number
  onSelectPlan: (id: number) => void
}) {
  const savePlan = useSaveFitnessPlan()
  const copyPlan = useCopyFitnessPlan()
  const activatePlan = useActivateFitnessPlan()
  const [draft, setDraft] = useState<FitnessPlan>(() => structuredClone(activePlan))
  const [selectedWeekday, setSelectedWeekday] = useState(1)

  const selectedDay = draft.days.find((day) => day.weekday === selectedWeekday)
  const activeExercises = data.exercises.filter((exercise) => exercise.isActive)

  const updateDay = (changes: Partial<FitnessPlanDay>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day) =>
              day.weekday === selectedWeekday ? { ...day, ...changes } : day,
            ),
          }
        : current,
    )
  }

  const updateItem = (index: number, changes: Partial<FitnessPlanExercise>) => {
    if (!selectedDay) return
    updateDay({
      exercises: selectedDay.exercises.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    })
  }

  const addItem = () => {
    if (!selectedDay || !activeExercises[0]) return
    const exercise = activeExercises[0]
    updateDay({
      exercises: [
        ...selectedDay.exercises,
        {
          exerciseId: exercise.id,
          sortOrder: selectedDay.exercises.length + 1,
          sets: exercise.metricType === 'check' ? null : 3,
          repsMin: exercise.metricType === 'reps' ? 8 : null,
          repsMax: exercise.metricType === 'reps' ? 12 : null,
          durationSecondsMin: exercise.metricType === 'duration' ? 30 : null,
          durationSecondsMax: exercise.metricType === 'duration' ? 60 : null,
          rirMin: exercise.category === 'strength' ? 1 : null,
          rirMax: exercise.category === 'strength' ? 2 : null,
          targetWeightKg: null,
          weightNote: null,
          restSeconds: 90,
          progressionType: null,
          planNotes: null,
          supersetGroup: null,
          eachSide: false,
          exercise,
        },
      ],
    })
  }

  const removeItem = (index: number) => {
    if (!selectedDay) return
    updateDay({ exercises: selectedDay.exercises.filter((_, itemIndex) => itemIndex !== index) })
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!selectedDay) return
    const target = index + direction
    if (target < 0 || target >= selectedDay.exercises.length) return
    const items = [...selectedDay.exercises]
    ;[items[index], items[target]] = [items[target], items[index]]
    updateDay({ exercises: items })
  }

  return (
    <FitnessShell
      eyebrow="Plan builder"
      title="训练计划编辑器"
      body="动作与星期安排分开维护。修改这里会影响后续训练，不会覆盖未来的历史训练快照。"
      action={
        <Button
          className="bg-[#d8f96f] text-[#18220f] hover:bg-white"
          onClick={() => savePlan.mutate(draft)}
          disabled={savePlan.isPending}
        >
          <Save size={16} />
          {savePlan.isPending ? '保存中' : '保存计划'}
        </Button>
      }
    >
      <Panel className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Field label="计划版本">
            <select value={selectedPlanId} onChange={(event) => onSelectPlan(Number(event.target.value))} className="fitness-select lg:min-w-64">
              {data.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.isActive ? '（当前）' : ''}</option>)}
            </select>
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
            <Button type="button" variant="secondary" onClick={() => copyPlan.mutate({ id: draft.id, name: `${draft.name} · 新版本` }, { onSuccess: (plan) => onSelectPlan(plan.id) })} disabled={copyPlan.isPending}><Copy size={16} />复制为新版本</Button>
            {!draft.isActive ? <Button type="button" onClick={() => activatePlan.mutate(draft.id)} disabled={activatePlan.isPending}>设为当前计划</Button> : <span className="inline-flex h-10 items-center justify-center rounded-md bg-mint px-4 text-sm font-semibold text-sage-dark">当前执行中</span>}
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-sage">复制后可单独修改新版本，再设为当前计划；旧训练历史不会改变。</p>
      </Panel>
      <Panel className="p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_9rem_9rem]">
          <div>
            <Label>计划名称</Label>
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </div>
          <div>
            <Label>计划周数</Label>
            <Input
              type="number"
              min={1}
              max={104}
              value={draft.durationWeeks}
              onChange={(event) => setDraft({ ...draft, durationWeeks: Number(event.target.value) || 1 })}
            />
          </div>
          <div>
            <Label>开始日期</Label>
            <Input
              type="date"
              value={draft.startDate ?? ''}
              onChange={(event) => setDraft({ ...draft, startDate: event.target.value || null })}
            />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <aside className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
          {draft.days.map((day) => (
            <button
              key={day.weekday}
              type="button"
              onClick={() => setSelectedWeekday(day.weekday)}
              className={cn(
                'rounded-xl border p-3 text-left transition',
                day.weekday === selectedWeekday
                  ? 'border-[#13251f] bg-[#13251f] text-white shadow-lg'
                  : 'border-line bg-white hover:border-sage',
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                {WEEKDAYS[day.weekday - 1]}
              </span>
              <span className="mt-1 block truncate text-sm font-semibold">{day.name}</span>
              <span className="mt-2 block text-xs opacity-60">
                {day.isRest ? '恢复日' : `${day.exercises.length} 个动作`}
              </span>
            </button>
          ))}
        </aside>

        {selectedDay ? (
          <div className="space-y-3">
            <Panel>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_8rem_auto]">
                <div>
                  <Label>训练日名称</Label>
                  <Input value={selectedDay.name} onChange={(event) => updateDay({ name: event.target.value })} />
                </div>
                <div>
                  <Label>训练重点</Label>
                  <Input value={selectedDay.focus ?? ''} onChange={(event) => updateDay({ focus: event.target.value })} />
                </div>
                <div>
                  <Label>预计分钟</Label>
                  <Input
                    type="number"
                    min={0}
                    value={selectedDay.estimatedMinutes ?? ''}
                    onChange={(event) => updateDay({ estimatedMinutes: nullableNumber(event.target.value) })}
                  />
                </div>
                <label className="flex h-10 items-center gap-2 self-end rounded-md border border-line bg-mist px-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={selectedDay.isRest}
                    onChange={(event) => updateDay({ isRest: event.target.checked })}
                  />
                  恢复日
                </label>
              </div>
            </Panel>

            {selectedDay.exercises.map((item, index) => (
              <PlanExerciseEditor
                key={`${item.id ?? 'new'}-${index}`}
                item={item}
                index={index}
                exercises={activeExercises}
                onChange={(changes) => updateItem(index, changes)}
                onRemove={() => removeItem(index)}
                onMoveUp={() => moveItem(index, -1)}
                onMoveDown={() => moveItem(index, 1)}
              />
            ))}
            <Button variant="secondary" className="w-full border-dashed" onClick={addItem}>
              <Plus size={16} />
              从动作库添加
            </Button>
          </div>
        ) : null}
      </div>
    </FitnessShell>
  )
}

function PlanExerciseEditor({
  item,
  index,
  exercises,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: FitnessPlanExercise
  index: number
  exercises: FitnessExercise[]
  onChange: (changes: Partial<FitnessPlanExercise>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const selectedExercise = exercises.find((exercise) => exercise.id === item.exerciseId)
  const isDuration = selectedExercise?.metricType === 'duration'
  return (
    <Panel className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-[#d8f96f]" />
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#13251f] text-sm font-semibold text-[#d8f96f]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(12rem,1.6fr)_repeat(4,minmax(5rem,.55fr))]">
            <Field label="动作">
              <select
                value={item.exerciseId}
                onChange={(event) => {
                  const exercise = exercises.find((candidate) => candidate.id === Number(event.target.value))
                  onChange({ exerciseId: Number(event.target.value), exercise })
                }}
                className="fitness-select"
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </select>
            </Field>
            <Field label="组数">
              <Input type="number" min={1} max={20} value={item.sets ?? ''} onChange={(event) => onChange({ sets: nullableNumber(event.target.value) })} />
            </Field>
            <Field label={isDuration ? '最少秒' : '最少次数'}>
              <Input
                type="number"
                min={0}
                value={isDuration ? item.durationSecondsMin ?? '' : item.repsMin ?? ''}
                onChange={(event) => onChange(isDuration ? { durationSecondsMin: nullableNumber(event.target.value) } : { repsMin: nullableNumber(event.target.value) })}
              />
            </Field>
            <Field label={isDuration ? '最多秒' : '最多次数'}>
              <Input
                type="number"
                min={0}
                value={isDuration ? item.durationSecondsMax ?? '' : item.repsMax ?? ''}
                onChange={(event) => onChange(isDuration ? { durationSecondsMax: nullableNumber(event.target.value) } : { repsMax: nullableNumber(event.target.value) })}
              />
            </Field>
            <Field label="休息秒">
              <Input type="number" min={0} value={item.restSeconds ?? ''} onChange={(event) => onChange({ restSeconds: nullableNumber(event.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-[6rem_6rem_7rem_1fr]">
            <Field label="RIR 下限">
              <Input type="number" min={0} max={10} value={item.rirMin ?? ''} onChange={(event) => onChange({ rirMin: nullableNumber(event.target.value) })} />
            </Field>
            <Field label="RIR 上限">
              <Input type="number" min={0} max={10} value={item.rirMax ?? ''} onChange={(event) => onChange({ rirMax: nullableNumber(event.target.value) })} />
            </Field>
            <Field label="超级组">
              <Input value={item.supersetGroup ?? ''} onChange={(event) => onChange({ supersetGroup: event.target.value || null })} placeholder="如 A" />
            </Field>
            <Field label="当天说明">
              <Input value={item.planNotes ?? ''} onChange={(event) => onChange({ planNotes: event.target.value || null })} />
            </Field>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-1 sm:grid-cols-1">
          <IconButton label="上移" onClick={onMoveUp}><ArrowUp size={15} /></IconButton>
          <IconButton label="下移" onClick={onMoveDown}><ArrowDown size={15} /></IconButton>
          <IconButton label="移除" onClick={onRemove} tone="danger"><Trash2 size={15} /></IconButton>
        </div>
      </div>
    </Panel>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>
}

function IconButton({ label, onClick, tone, children }: { label: string; onClick: () => void; tone?: 'danger'; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn('flex size-9 items-center justify-center rounded-lg border border-line bg-white text-sage-dark hover:bg-mist', tone === 'danger' && 'text-coral hover:bg-coral/10')}
    >
      {children}
    </button>
  )
}

export function FitnessExercisesPage() {
  const { data, isLoading, error } = useFitnessData()
  const saveExercise = useSaveFitnessExercise()
  const archiveExercise = useArchiveFitnessExercise()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | FitnessExerciseCategory>('all')
  const [form, setForm] = useState<FitnessExerciseInput>(EMPTY_EXERCISE)

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (data?.exercises ?? []).filter((exercise) =>
      exercise.isActive &&
      (category === 'all' || exercise.category === category) &&
      (!needle || `${exercise.name} ${exercise.primaryMuscle ?? ''} ${exercise.equipment ?? ''}`.toLowerCase().includes(needle)),
    )
  }, [category, data?.exercises, search])

  if (isLoading) return <FitnessLoading />
  if (error) return <FitnessError message={error.message} />

  const selectExercise = (exercise: FitnessExercise) => setForm({ ...exercise })
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    saveExercise.mutate(form, {
      onSuccess: (saved) => setForm({ ...saved }),
    })
  }

  return (
    <FitnessShell
      eyebrow="Exercise library"
      title="动作库"
      body="动作名称、器械、注意事项和进阶方式只维护一次，所有训练计划都可以复用。"
      action={
        <Button className="bg-[#d8f96f] text-[#18220f] hover:bg-white" onClick={() => setForm({ ...EMPTY_EXERCISE })}>
          <Plus size={16} />新增动作
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,.8fr)_minmax(25rem,1.2fr)]">
        <Panel className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" size={16} />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索动作、部位或器械" />
          </div>
          <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto">
            <FilterButton active={category === 'all'} onClick={() => setCategory('all')}>全部</FilterButton>
            {(Object.keys(CATEGORY_LABELS) as FitnessExerciseCategory[]).map((key) => (
              <FilterButton key={key} active={category === key} onClick={() => setCategory(key)}>{CATEGORY_LABELS[key]}</FilterButton>
            ))}
          </div>
          <div className="mt-3 max-h-[42rem] space-y-2 overflow-y-auto pr-1">
            {filtered.map((exercise) => (
              <button
                type="button"
                key={exercise.id}
                onClick={() => selectExercise(exercise)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition hover:border-sage',
                  form.id === exercise.id ? 'border-[#13251f] bg-[#13251f] text-white' : 'border-line bg-white',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="mt-1 text-xs opacity-60">{exercise.primaryMuscle || '未分类'} · {exercise.equipment || '无器械'}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', form.id === exercise.id ? 'bg-white/10' : 'bg-mint/35 text-sage-dark')}>
                    {CATEGORY_LABELS[exercise.category]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-dark">{form.id ? '编辑动作' : '新动作'}</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{form.name || '填写动作资料'}</h2>
              </div>
              <Settings2 className="text-sage" size={22} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="动作名称"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
              <Field label="主要部位"><Input value={form.primaryMuscle ?? ''} onChange={(event) => setForm({ ...form, primaryMuscle: event.target.value })} placeholder="例如 胸 / 三头" /></Field>
              <Field label="动作类型">
                <select className="fitness-select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as FitnessExerciseCategory })}>
                  {(Object.keys(CATEGORY_LABELS) as FitnessExerciseCategory[]).map((key) => <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>)}
                </select>
              </Field>
              <Field label="记录方式">
                <select className="fitness-select" value={form.metricType} onChange={(event) => setForm({ ...form, metricType: event.target.value as FitnessMetricType })}>
                  {(Object.keys(METRIC_LABELS) as FitnessMetricType[]).map((key) => <option key={key} value={key}>{METRIC_LABELS[key]}</option>)}
                </select>
              </Field>
              <Field label="器械"><Input value={form.equipment ?? ''} onChange={(event) => setForm({ ...form, equipment: event.target.value })} /></Field>
              <Field label="辅助部位"><Input value={form.secondaryMuscles ?? ''} onChange={(event) => setForm({ ...form, secondaryMuscles: event.target.value })} /></Field>
            </div>
            <TextAreaField label="动作要点" value={form.instructions ?? ''} onChange={(value) => setForm({ ...form, instructions: value })} />
            <TextAreaField label="注意事项" value={form.cautions ?? ''} onChange={(value) => setForm({ ...form, cautions: value })} />
            <TextAreaField label="进阶规则" value={form.progressionNotes ?? ''} onChange={(value) => setForm({ ...form, progressionNotes: value })} />
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
              {form.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-coral"
                  onClick={() => archiveExercise.mutate(form.id!, { onSuccess: () => setForm({ ...EMPTY_EXERCISE }) })}
                  disabled={archiveExercise.isPending}
                >
                  <Trash2 size={16} />停用动作
                </Button>
              ) : <span />}
              <Button type="submit" disabled={saveExercise.isPending || !form.name.trim()}>
                <Save size={16} />{saveExercise.isPending ? '保存中' : '保存动作'}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </FitnessShell>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={cn('h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition', active ? 'bg-[#13251f] text-white' : 'bg-mist text-sage-dark hover:bg-mint/40')}>{children}</button>
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="fitness-textarea" />
    </div>
  )
}

export function FitnessHistoryPage() {
  const history = useFitnessHistory()
  const exportData = useFitnessExport()
  const deleteSession = useDeleteFitnessSession()
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const selectedSession = useFitnessSession(selectedSessionId)
  return (
    <FitnessShell
      eyebrow="Training log"
      title="训练历史"
      body="从训练频率到每一组表现，完整保留当时的计划快照与实际完成情况。"
      action={history.data?.length ? <div className="flex gap-2"><Button type="button" variant="ghost" className="border border-white/15 text-white hover:bg-white/10" onClick={() => downloadCsv(`fitness-history-${formatLocalDate(new Date())}.csv`, exportFitnessHistoryCsv(history.data!))}><Download size={16} />CSV</Button><Button type="button" className="bg-[#d8f96f] text-[#18220f] hover:bg-white" onClick={() => exportData.mutate(undefined, { onSuccess: (data) => downloadJson(`fitness-backup-${formatLocalDate(new Date())}.json`, JSON.stringify(data, null, 2)) })} disabled={exportData.isPending}><Download size={16} />{exportData.isPending ? '导出中' : '完整备份'}</Button></div> : null}
    >
      {history.isLoading ? <FitnessLoading /> : history.error ? <FitnessError message={history.error.message} /> : history.data?.length ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <HistoryStat label="训练次数" value={`${history.data.length}`} />
            <HistoryStat label="完成组数" value={`${history.data.reduce((sum, item) => sum + item.completedSets, 0)}`} />
            <HistoryStat label="总容量" value={`${formatNumber(history.data.reduce((sum, item) => sum + item.totalVolumeKg, 0))} kg`} />
          </div>
          <RecoveryInsights sessions={history.data} />
          <TrainingCalendar sessions={history.data} />
          {history.data.map((session) => (
            <article key={session.id} className="fitness-list-item overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <button
                type="button"
                className="grid w-full gap-4 p-4 text-left transition hover:bg-mist/50 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
                onClick={() => setSelectedSessionId((current) => current === session.id ? null : session.id)}
                aria-expanded={selectedSessionId === session.id}
              >
                <span className="flex size-12 flex-col items-center justify-center rounded-xl bg-[#13251f] text-white">
                  <span className="text-[10px] text-white/60">{session.scheduledDate.slice(5, 7)}月</span>
                  <span className="font-display text-xl font-semibold text-[#d8f96f]">{session.scheduledDate.slice(8, 10)}</span>
                </span>
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{session.name}</span>
                    <StatusBadge status={session.status} />
                  </span>
                  <span className="mt-1 block text-sm text-sage">{session.exerciseCount} 个动作 · {session.completedSets}/{session.totalSets} 组 · {formatNumber(session.totalVolumeKg)} kg</span>
                </span>
                <span className="text-left sm:text-right">
                  <span className="block text-sm font-semibold tabular-nums text-ink">{session.progressPercent}%</span>
                  <span className="mt-1 block text-xs text-sage">{session.durationMinutes === null ? '未记录用时' : `${session.durationMinutes} 分钟`}</span>
                </span>
                <ChevronDown size={18} className={cn('text-sage transition-transform', selectedSessionId === session.id && 'rotate-180')} />
              </button>
              {selectedSessionId === session.id ? (
                <SessionDetail
                  session={selectedSession.data}
                  loading={selectedSession.isLoading}
                  error={selectedSession.error?.message}
                  deleting={deleteSession.isPending}
                  onDelete={(id) => {
                    if (!window.confirm('确定删除这次训练记录吗？删除后无法恢复。')) return
                    deleteSession.mutate(id, { onSuccess: () => setSelectedSessionId(null) })
                  }}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : <EmptyState title="还没有训练记录" body="从“今日”开始第一次训练，逐组完成后会自动出现在这里。" />}
    </FitnessShell>
  )
}

function RecoveryInsights({ sessions }: { sessions: FitnessSessionSummary[] }) {
  const insight = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 27)
    const recent = sessions.filter((session) => new Date(`${session.scheduledDate}T12:00:00`) >= cutoff)
    const completedSets = recent.reduce((sum, session) => sum + session.completedSets, 0)
    const totalSets = recent.reduce((sum, session) => sum + session.totalSets, 0)
    const effortValues = recent.flatMap((session) => session.effortScore === null ? [] : [session.effortScore])
    return {
      trainingCount: recent.length,
      completionRate: totalSets ? Math.round(completedSets / totalSets * 100) : 0,
      averageEffort: effortValues.length ? effortValues.reduce((sum, value) => sum + value, 0) / effortValues.length : null,
      painCount: recent.filter((session) => session.painFlag).length,
    }
  }, [sessions])
  const message = insight.painCount > 0
    ? `近四周有 ${insight.painCount} 次异常不适记录，建议优先检查动作与恢复。`
    : insight.averageEffort !== null && insight.averageEffort >= 8.5
      ? '近期平均难度偏高，可以考虑降低一周训练量。'
      : insight.trainingCount > 0
        ? '训练节奏平稳，继续观察睡眠、疼痛和动作质量。'
        : '完成训练复盘后，这里会给出恢复提示。'
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-[#13251f] p-4 text-white lg:grid-cols-[1fr_auto] lg:items-center">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d8f96f]">近四周恢复观察</p><p className="mt-2 text-sm leading-6 text-white/70">{message}</p></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniInsight value={`${insight.trainingCount}`} label="训练" />
        <MiniInsight value={`${insight.completionRate}%`} label="完成率" />
        <MiniInsight value={insight.averageEffort === null ? '--' : insight.averageEffort.toFixed(1)} label="平均难度" />
      </div>
    </div>
  )
}

function MiniInsight({ value, label }: { value: string; label: string }) {
  return <div className="min-w-20 rounded-xl bg-white/8 px-3 py-2"><p className="font-display text-xl font-semibold tabular-nums text-[#d8f96f]">{value}</p><p className="mt-0.5 text-[10px] text-white/50">{label}</p></div>
}

function TrainingCalendar({ sessions }: { sessions: FitnessSessionSummary[] }) {
  const sessionByDate = useMemo(
    () => new Map(sessions.map((session) => [session.scheduledDate, session])),
    [sessions],
  )
  const cells = useMemo(() => buildCalendarCells(sessionByDate), [sessionByDate])
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-dark">最近 12 周</p><h2 className="mt-1 font-display text-2xl font-semibold">训练节奏</h2></div>
        <div className="flex items-center gap-2 text-[10px] text-sage"><span>少</span><span className="size-3 rounded-sm bg-mist" /><span className="size-3 rounded-sm bg-[#d8f96f]" /><span className="size-3 rounded-sm bg-[#355e4d]" /><span>多</span></div>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid min-w-[580px] auto-cols-[0.875rem] grid-flow-col grid-rows-7 gap-1.5">
          {cells.map((cell) => (
            <div
              key={cell.date}
              title={`${cell.date}${cell.session ? ` · ${cell.session.name} · ${cell.session.completedSets}/${cell.session.totalSets}组` : ' · 未训练'}`}
              className={cn('size-3.5 rounded-[4px] border border-line/60', calendarTone(cell.session))}
            />
          ))}
        </div>
      </div>
    </Panel>
  )
}

function SessionDetail({ session, loading, error, deleting, onDelete }: {
  session?: NonNullable<FitnessBootstrap['todaySession']>
  loading: boolean
  error?: string
  deleting: boolean
  onDelete: (id: number) => void
}) {
  if (loading) return <div className="border-t border-line p-6 text-center text-sm text-sage">正在读取每组记录…</div>
  if (error || !session) return <div className="border-t border-line p-6 text-center text-sm text-coral">{error || '记录暂时不可用'}</div>
  return (
    <div className="border-t border-line bg-mist/40 p-3 sm:p-4">
      {session.readinessScore !== null || session.effortScore !== null || session.notes || session.painFlag ? (
        <div className={cn('mb-3 rounded-xl border bg-white p-3', session.painFlag ? 'border-coral/50' : 'border-line')}>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-sage-dark">
            {session.readinessScore !== null ? <span>训练前状态 <strong>{session.readinessScore}/5</strong></span> : null}
            {session.effortScore !== null ? <span>训练难度 <strong>{session.effortScore}/10</strong></span> : null}
            {session.painFlag ? <span className="font-semibold text-coral">记录了疼痛或异常不适</span> : null}
          </div>
          {session.notes ? <p className="mt-2 text-sm leading-6 text-sage">{session.notes}</p> : null}
          {session.painNotes ? <p className="mt-2 rounded-lg bg-coral/5 px-3 py-2 text-sm text-coral">{session.painNotes}</p> : null}
        </div>
      ) : null}
      <div className="space-y-3">
        {session.exercises.map((exercise) => (
          <div key={exercise.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{exercise.exerciseName}</h3><span className="text-xs text-sage">{exercise.primaryMuscle || exercise.category}</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {exercise.sets.map((fitnessSet) => (
                <div key={fitnessSet.id} className={cn('flex items-center justify-between rounded-lg px-3 py-2 text-xs', fitnessSet.completed ? 'bg-mint/40 text-sage-dark' : 'bg-mist text-sage')}>
                  <span>第 {fitnessSet.setNumber} 组</span>
                  <span className="font-semibold tabular-nums">{formatCompletedSet(fitnessSet, exercise.metricType)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end border-t border-line pt-3"><Button type="button" variant="ghost" className="text-coral" onClick={() => onDelete(session.id)} disabled={deleting}><Trash2 size={16} />{deleting ? '删除中' : '删除这次训练'}</Button></div>
    </div>
  )
}

export function FitnessRecordsPage() {
  const records = useFitnessRecords()
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | number | null>(null)
  const selectedRecord = records.data?.find((record) => (record.exerciseId ?? record.exerciseName) === selectedRecordKey) ?? records.data?.[0]
  return (
    <FitnessShell eyebrow="Personal best" title="个人纪录" body="从已完成训练组自动计算纪录，并用最近 12 次训练观察力量变化。">
      {records.isLoading ? <FitnessLoading /> : records.error ? <FitnessError message={records.error.message} /> : records.data?.length ? (
        <div className="space-y-4">
          {selectedRecord ? (
            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sage-dark"><TrendingUp size={14} />力量趋势</p><h2 className="mt-1 font-display text-3xl font-semibold">{selectedRecord.exerciseName}</h2></div>
                <p className="text-xs text-sage">估算 1RM · 最近 {selectedRecord.trend.length} 次有效训练</p>
              </div>
              {selectedRecord.trend.some((point) => point.estimatedOneRepMaxKg !== null) ? <FitnessTrendChart data={selectedRecord.trend} /> : <EmptyState title="暂无重量趋势" body="这个动作已有次数纪录，但还没有填写重量。" />}
            </Panel>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {records.data.map((record) => {
              const recordKey = record.exerciseId ?? record.exerciseName
              const active = selectedRecord === record
              return (
              <button key={recordKey} type="button" onClick={() => setSelectedRecordKey(recordKey)} className={cn('fitness-list-item overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5', active ? 'border-[#355e4d] ring-2 ring-mint/60' : 'border-line')}>
                <span className="flex items-start justify-between gap-3 p-4">
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-sage">{record.primaryMuscle || '综合训练'}</span>
                    <span className="mt-1 block font-display text-2xl font-semibold">{record.exerciseName}</span>
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#13251f] text-[#d8f96f]"><Medal size={19} /></span>
                </span>
                <span className="grid grid-cols-2 border-t border-line bg-mist/50">
                  <RecordMetric label="最大重量" value={record.maxWeightKg === null ? '--' : `${formatNumber(record.maxWeightKg)} kg`} />
                  <RecordMetric label="最多次数" value={record.maxReps === null ? '--' : `${record.maxReps} 次`} />
                  <RecordMetric label="估算 1RM" value={record.estimatedOneRepMaxKg === null ? '--' : `${formatNumber(record.estimatedOneRepMaxKg)} kg`} />
                  <RecordMetric label="单组容量" value={record.maxSetVolumeKg === null ? '--' : `${formatNumber(record.maxSetVolumeKg)} kg`} />
                </span>
                <span className="block border-t border-line px-4 py-3 text-xs text-sage">共 {record.completedSets} 个有效组{record.lastRecordDate ? ` · 更新于 ${record.lastRecordDate}` : ''}</span>
              </button>
              )
            })}
          </div>
        </div>
      ) : <EmptyState title="还没有个人纪录" body="完成至少一组训练后，纪录会从后端自动汇总，无需单独录入。" />}
    </FitnessShell>
  )
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: NonNullable<FitnessBootstrap['todaySession']>['status'] }) {
  const labels = { in_progress: '进行中', completed: '已完成', partial: '部分完成', skipped: '已跳过' }
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', status === 'completed' ? 'bg-mint text-sage-dark' : status === 'partial' ? 'bg-gold/20 text-amber-800' : status === 'skipped' ? 'bg-mist text-sage' : 'bg-[#eafbb5] text-[#314017]')}>{labels[status]}</span>
}

function RecordMetric({ label, value }: { label: string; value: string }) {
  return <span className="border-b border-r border-line p-3 even:border-r-0"><span className="block text-[10px] font-semibold uppercase tracking-wide text-sage">{label}</span><span className="mt-1 block font-semibold tabular-nums text-ink">{value}</span></span>
}

function nullableNumber(value: string) {
  return value === '' ? null : Number(value)
}

function formatRange(min: number | null, max: number | null) {
  if (min === null && max === null) return '--'
  if (min === max || max === null) return String(min)
  return `${min}–${max}`
}

function formatDuration(seconds: number) {
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}分钟`
  return `${seconds}秒`
}

function formatSessionExerciseTarget(item: FitnessSessionExercise) {
  const sets = item.targetSets ? `${item.targetSets}组 × ` : ''
  if (item.durationSecondsMin !== null) {
    return `${sets}${formatRange(item.durationSecondsMin, item.durationSecondsMax)}秒`
  }
  if (item.repsMin !== null) {
    return `${sets}${formatRange(item.repsMin, item.repsMax)}次${item.eachSide ? '/侧' : ''}`
  }
  return item.targetSets ? `${item.targetSets}组` : '完成'
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value)
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function buildCalendarCells(sessionByDate: Map<string, FitnessSessionSummary>) {
  const end = new Date()
  end.setHours(12, 0, 0, 0)
  const daysUntilSunday = (7 - end.getDay()) % 7
  end.setDate(end.getDate() + daysUntilSunday)
  const start = new Date(end)
  start.setDate(end.getDate() - 83)
  return Array.from({ length: 84 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    const date = formatLocalDate(current)
    return { date, session: sessionByDate.get(date) }
  })
}

function calendarTone(session?: FitnessSessionSummary) {
  if (!session) return 'bg-mist'
  if (session.status === 'skipped') return 'bg-gold/35'
  if (session.progressPercent >= 100) return 'bg-[#355e4d]'
  if (session.progressPercent >= 50) return 'bg-[#8fad72]'
  return 'bg-[#d8f96f]'
}

function formatLocalDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCompletedSet(fitnessSet: FitnessSet, metricType: FitnessMetricType) {
  if (!fitnessSet.completed) return '未完成'
  const parts = []
  if (fitnessSet.actualWeightKg !== null) parts.push(`${formatNumber(fitnessSet.actualWeightKg)}kg`)
  if (metricType === 'duration' && fitnessSet.actualDurationSeconds !== null) parts.push(`${fitnessSet.actualDurationSeconds}秒`)
  if (fitnessSet.actualReps !== null) parts.push(`${fitnessSet.actualReps}次`)
  if (fitnessSet.rir !== null) parts.push(`RIR ${fitnessSet.rir}`)
  return parts.join(' × ') || '已完成'
}
