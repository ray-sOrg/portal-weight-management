import { Link, useRouterState } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
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
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react'
import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { Button, EmptyState, Input, Label, Panel } from '@/components/ui'
import {
  useActivateFitnessSet,
  useAddFitnessSet,
  useArchiveFitnessExercise,
  useActivateFitnessPlan,
  useCopyFitnessPlan,
  useDeleteFitnessPlan,
  useDeleteFitnessSession,
  useDeferFitnessSet,
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
  FitnessExerciseMedia,
  FitnessBootstrap,
  FitnessExerciseCategory,
  FitnessExerciseInput,
  FitnessFeedbackInput,
  FitnessMetricType,
  FitnessPlan,
  FitnessPlanDay,
  FitnessPlanExercise,
  FitnessPlanInput,
  FitnessSession,
  FitnessSessionExercise,
  FitnessSessionSummary,
  FitnessSet,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { downloadCsv, downloadJson, exportFitnessHistoryCsv } from '@/lib/csv'
import { FitnessTrendChart } from './trend-chart'
import { findNextActionableSetId } from './workout-order'

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

function createBlankPlanInput(name: string, durationWeeks: number): FitnessPlanInput {
  return {
    trackedPersonId: null,
    name,
    description: null,
    durationWeeks,
    startDate: null,
    isActive: true,
    days: WEEKDAYS.map((weekday, index) => ({
      weekday: index + 1,
      name: weekday,
      focus: null,
      isRest: true,
      estimatedMinutes: null,
      notes: null,
      exercises: [],
    })),
  }
}

function formatSavedTime(value: string | null) {
  if (!value) return '尚未保存'
  return `已保存于 ${new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}`
}

function readinessColor(score: number) {
  const colors = ['#d85a4f', '#df874e', '#c2a33f', '#6f9f62', '#2f765c']
  return colors[Math.min(colors.length - 1, Math.max(0, score - 1))]
}

function effortGradient() {
  return 'linear-gradient(to right, #4f9b70 0%, #d0a23e 55%, #e05e50 100%)'
}

function exerciseUsesExternalWeight(exercise: FitnessSessionExercise) {
  const equipment = exercise.equipment ?? ''
  return ['杠铃', '哑铃', '壶铃', '臂力棒'].some((item) => equipment.includes(item))
}

function weightInputLabel(exercise: FitnessSessionExercise) {
  const equipment = exercise.equipment ?? ''
  if (equipment.includes('哑铃')) return '单只重量 kg'
  if (equipment.includes('杠铃')) return '总重量 kg'
  return '重量 kg'
}

function weightRuleHint(exercise: FitnessSessionExercise) {
  const equipment = exercise.equipment ?? ''
  if (equipment.includes('哑铃')) return '哑铃记录单只重量'
  if (equipment.includes('杠铃')) return '杠铃记录含杆总重量'
  return undefined
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
  const currentPath = useRouterState({ select: (state) => state.location.pathname })
  const [pendingPath, setPendingPath] = useState<string | null>(null)

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

      <div className="relative">
        <nav className="no-scrollbar flex gap-0 overflow-x-auto rounded-xl border border-line bg-white/90 p-1.5 shadow-sm sm:gap-1">
          {FITNESS_NAV.map((item) => {
            const isPending = pendingPath === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-busy={isPending}
                onClick={() => {
                  if (currentPath !== item.to) setPendingPath(item.to)
                }}
                className="flex h-10 min-w-0 flex-1 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 text-[11px] font-medium text-sage-dark transition hover:bg-mist sm:flex-none sm:justify-start sm:gap-2 sm:px-3 sm:text-sm"
                activeProps={{
                  className:
                    'fitness-subnav-active bg-[#13251f] text-white shadow-sm',
                }}
                activeOptions={{ exact: item.to === '/fitness' }}
              >
                {isPending ? <LoaderCircle className="animate-spin" size={16} /> : <item.icon size={16} />}
                {isPending ? '加载中' : item.label}
              </Link>
            )
          })}
        </nav>
        <div
          className={cn(
            'pointer-events-none absolute inset-x-3 -bottom-px h-0.5 overflow-hidden rounded-full transition-opacity',
            pendingPath ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden="true"
        >
          <span className="fitness-tab-progress block h-full w-1/3 rounded-full bg-[#d8f96f]" />
        </div>
      </div>
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
  const deferSet = useDeferFitnessSet()
  const activateSet = useActivateFitnessSet()
  const addSet = useAddFitnessSet()
  const restTimer = useRestTimer()
  const [celebration, setCelebration] = useState<FitnessSession | null>(null)
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null)
  if (isLoading) return <FitnessLoading />
  if (error) return <FitnessError message={error.message} />
  if (!data) return <FitnessError message="训练数据读取失败。" />
  if (!activePlan) return <FitnessNoPlanPrompt />

  const displayWeekday = selectedWeekday ?? data.todayWeekday
  const selectedDay = activePlan.days.find((day) => day.weekday === displayWeekday)
  const isTodaySelected = displayWeekday === data.todayWeekday
  const session = data.todaySession
  const trainingDays = activePlan.days.filter((day) => !day.isRest).length
  const activeSetId = session?.status === 'in_progress'
    ? findNextActionableSetId(session.exercises)
    : undefined

  return (
    <FitnessShell
      eyebrow={`${data.today} · ${WEEKDAYS[data.todayWeekday - 1]}`}
      title={selectedDay?.name ?? '当天未安排训练'}
      body={selectedDay?.focus ?? '恢复也是计划的一部分。保持轻松活动，给下一次训练留出状态。'}
      action={
        <div className="grid grid-cols-3 gap-2 text-center">
          <HeroStat value={`${activePlan.durationWeeks}`} label="计划周数" />
          <HeroStat value={`${trainingDays}`} label="每周训练" />
          <HeroStat value={`${selectedDay?.estimatedMinutes ?? 0}`} label="预计分钟" />
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {activePlan.days.map((day) => (
          <button
            type="button"
            key={day.weekday}
            onClick={() => setSelectedWeekday(day.weekday)}
            aria-pressed={day.weekday === displayWeekday}
            className={cn(
              'rounded-xl border px-1.5 py-3 text-center transition sm:px-3',
              day.weekday === displayWeekday
                ? 'border-[#13251f] bg-[#13251f] text-white shadow-lg'
                : 'border-line bg-white text-sage-dark hover:border-sage hover:bg-mist',
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
          </button>
        ))}
      </div>

      {selectedDay?.exercises.length ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-dark">
                {isTodaySelected ? '今日清单' : `${WEEKDAYS[displayWeekday - 1]}安排`}
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold">按顺序完成</h2>
            </div>
            {isTodaySelected && session ? (
              <span className="rounded-full bg-[#eafbb5] px-3 py-1 text-xs font-semibold tabular-nums text-[#314017]">
                {session.completedSets}/{session.totalSets} 组
              </span>
            ) : null}
          </div>
          {isTodaySelected && session ? (
            <>
              <SessionProgress session={session} />
              <div className="grid gap-3">
                {session.exercises.map((exercise, index) => (
                  <WorkoutExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    activeSetId={activeSetId}
                    savingSetId={saveSet.isPending ? saveSet.variables?.id : undefined}
                    deferringSetId={deferSet.isPending ? deferSet.variables : undefined}
                    activatingSetId={activateSet.isPending ? activateSet.variables : undefined}
                    addingSet={addSet.isPending && addSet.variables === exercise.id}
                    canAddSet={session.status === 'in_progress'}
                    onAddSet={() => addSet.mutate(exercise.id)}
                    onSave={(input, restSeconds) =>
                      saveSet.mutate(input, {
                        onSuccess: () => {
                          if (input.completed && restSeconds) restTimer.start(restSeconds)
                        },
                      })
                    }
                    onDefer={(id) => deferSet.mutate(id)}
                    onActivate={(id) => activateSet.mutate(id)}
                  />
                ))}
              </div>
              <WorkoutFeedbackForm
                key={`${session.id}-${session.updatedAt}`}
                session={session}
                pending={finishSession.isPending || saveFeedback.isPending}
                onSubmit={(input) => session.status === 'in_progress'
                  ? finishSession.mutate(input, { onSuccess: setCelebration })
                  : saveFeedback.mutate(input)}
              />
            </>
          ) : isTodaySelected && startSession.isPending ? (
            <WorkoutStartingState exerciseCount={selectedDay.exercises.length} />
          ) : isTodaySelected ? (
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold">准备好就开始</h3>
                <p className="mt-1 text-sm leading-6 text-sage">开始后会锁定今天的动作快照，之后修改计划也不会改变这次记录。</p>
              </div>
              <Button type="button" onClick={() => startSession.mutate()} disabled={startSession.isPending}>
                <Play size={17} />{startSession.isPending ? '创建中' : '开始今日训练'}
              </Button>
            </Panel>
          ) : (
            <PlannedDayPreview day={selectedDay} />
          )}
        </section>
      ) : (
        <EmptyState title="当天没有安排" body={selectedDay?.notes || '走路、拉伸和睡眠同样属于训练计划。'} />
      )}
      {restTimer.visible ? <RestTimer {...restTimer} /> : null}
      {celebration ? <WorkoutCelebration session={celebration} onClose={() => setCelebration(null)} /> : null}
    </FitnessShell>
  )
}

function WorkoutStartingState({ exerciseCount }: { exerciseCount: number }) {
  return (
    <Panel className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-mint/50">
        <div className="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-[#355e4d] motion-reduce:animate-none" />
      </div>
      <div className="flex min-h-44 flex-col items-center justify-center px-4 text-center" role="status" aria-live="polite">
        <span className="relative flex size-12 items-center justify-center rounded-full bg-[#13251f] text-[#d8f96f] shadow-lg">
          <LoaderCircle className="animate-spin motion-reduce:animate-none" size={23} />
          <span className="absolute -inset-1 animate-ping rounded-full border border-[#8fad72]/40 motion-reduce:animate-none" />
        </span>
        <h3 className="mt-4 font-display text-2xl font-semibold">正在准备今日训练</h3>
        <p className="mt-1.5 text-sm leading-6 text-sage">正在生成 {exerciseCount} 个动作的组数和记录项，请稍候…</p>
      </div>
    </Panel>
  )
}

function PlannedDayPreview({ day }: { day: FitnessPlanDay }) {
  return (
    <div className="grid gap-2.5">
      {day.exercises.map((item, index) => (
        <article key={item.id ?? `${item.exerciseId}-${index}`} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-mist font-display font-semibold text-sage-dark">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-ink">{item.exercise?.name ?? '未命名动作'}</h3>
            <p className="mt-1 text-xs text-sage-dark">{formatPlanExerciseTarget(item)}{item.restSeconds ? ` · 休息 ${formatDuration(item.restSeconds)}` : ''}</p>
            {item.planNotes ? <p className="mt-1.5 text-xs leading-5 text-sage">{item.planNotes}</p> : null}
          </div>
        </article>
      ))}
      <p className="px-1 text-xs text-sage">这里只预览计划；回到今天才能开始或继续训练。</p>
    </div>
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
            {[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" onClick={() => setReadinessScore(score)} className={cn('h-10 rounded-lg border text-sm font-semibold transition', readinessScore === score ? 'border-transparent text-white shadow-sm' : 'border-line bg-mist text-sage-dark hover:border-sage')} style={readinessScore === score ? { background: readinessColor(score) } : undefined}>{score}</button>)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-sage"><span>很疲劳</span><span>状态很好</span></div>
        </fieldset>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-dark">本次难度 · {effortScore}/10</span>
          <input type="range" min="1" max="10" value={effortScore} onChange={(event) => setEffortScore(Number(event.target.value))} className="fitness-effort-range mt-4 w-full" style={{ background: effortGradient() }} />
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

function WorkoutCelebration({ session, onClose }: { session: FitnessSession; onClose: () => void }) {
  const completedAll = session.status === 'completed'
  const encouragement = completedAll
    ? '今天的每一组，都已经变成明天更强的底气。'
    : '懂得按状态调整，也是一种长期主义。今天已经做得很好。'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1914]/70 p-4 backdrop-blur-md" role="presentation">
      <section className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[#d8f96f]/30 bg-[#13251f] p-6 text-center text-white shadow-[0_32px_100px_rgba(0,0,0,0.4)] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="workout-complete-title">
        <div className="fitness-celebration-burst" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <span key={index} style={{ '--burst-index': index } as CSSProperties} />)}
        </div>
        <div className="relative">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-[#d8f96f]/30 bg-[#d8f96f]/10 text-[#d8f96f] shadow-[0_0_50px_rgba(216,249,111,0.18)]">
            {completedAll ? <Trophy size={36} /> : <Sparkles size={36} />}
          </div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d8f96f]">Workout complete</p>
          <h2 id="workout-complete-title" className="mt-2 font-display text-4xl font-semibold">训练完成</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/65">{encouragement}</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <CelebrationStat value={`${session.completedSets}`} label="完成组数" />
            <CelebrationStat value={`${session.progressPercent}%`} label="计划进度" />
            <CelebrationStat value={formatNumber(session.totalVolumeKg)} label="训练容量 kg" />
          </div>
          <Button type="button" className="mt-6 w-full bg-[#d8f96f] text-[#18220f] hover:bg-white" onClick={onClose}>
            <Check size={17} />收下今天的进步
          </Button>
        </div>
      </section>
    </div>
  )
}

function CelebrationStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-3">
      <p className="text-xl font-semibold tabular-nums text-[#d8f96f]">{value}</p>
      <p className="mt-1 text-[9px] text-white/45">{label}</p>
    </div>
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
  activeSetId,
  savingSetId,
  deferringSetId,
  activatingSetId,
  addingSet,
  canAddSet,
  onAddSet,
  onSave,
  onDefer,
  onActivate,
}: {
  exercise: FitnessSessionExercise
  index: number
  activeSetId?: number
  savingSetId?: number
  deferringSetId?: number
  activatingSetId?: number
  addingSet: boolean
  canAddSet: boolean
  onAddSet: () => void
  onSave: (input: Parameters<ReturnType<typeof useSaveFitnessSet>['mutate']>[0], restSeconds: number | null) => void
  onDefer: (id: number) => void
  onActivate: (id: number) => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const previousSetByNumber = useMemo(
    () => new Map(exercise.previousSets.map((item) => [item.setNumber, item])),
    [exercise.previousSets],
  )
  return <>
    <article className={cn('fitness-list-item overflow-hidden rounded-2xl border bg-white shadow-[0_12px_40px_rgba(25,32,31,0.05)] transition', activeSetId && exercise.sets.some((item) => item.id === activeSetId) ? 'border-sage/60 shadow-[0_16px_45px_rgba(53,94,77,0.12)]' : 'border-line')}>
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
        <button type="button" onClick={() => setShowDetails(true)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-mist px-2.5 text-xs font-semibold text-sage-dark transition hover:border-sage hover:bg-mint/30" aria-label={`查看${exercise.exerciseName}动作详解`}>
          <BookOpen size={15} />
          <span className="hidden sm:inline">详解</span>
        </button>
      </div>
      <div className="divide-y divide-line">
        {exercise.sets.map((fitnessSet) => (
          <WorkoutSetRow
            key={`${fitnessSet.id}-${fitnessSet.updatedAt}-${fitnessSet.deferredAt}`}
            fitnessSet={fitnessSet}
            exercise={exercise}
            previousSet={previousSetByNumber.get(fitnessSet.setNumber)}
            saving={savingSetId === fitnessSet.id}
            deferring={deferringSetId === fitnessSet.id}
            activating={activatingSetId === fitnessSet.id}
            active={activeSetId === fitnessSet.id}
            locked={!fitnessSet.completed && activeSetId !== fitnessSet.id}
            onSave={onSave}
            onDefer={onDefer}
            onActivate={onActivate}
          />
        ))}
      </div>
      {canAddSet ? (
        <div className="border-t border-line bg-mist/45 p-3 text-center">
          <button type="button" onClick={onAddSet} disabled={addingSet} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-sage-dark transition hover:bg-mint/45 disabled:cursor-wait disabled:opacity-60">
            {addingSet ? <LoaderCircle className="animate-spin" size={15} /> : <Plus size={15} />}
            {addingSet ? '正在加组' : '状态不错，加一组'}
          </button>
        </div>
      ) : null}
    </article>
    {showDetails ? <ExerciseDetailDialog exercise={exercise} onClose={() => setShowDetails(false)} /> : null}
  </>
}

function WorkoutSetRow({ fitnessSet, exercise, previousSet, saving, deferring, activating, active, locked, onSave, onDefer, onActivate }: {
  fitnessSet: FitnessSet
  exercise: FitnessSessionExercise
  previousSet?: FitnessSet
  saving: boolean
  deferring: boolean
  activating: boolean
  active: boolean
  locked: boolean
  onSave: (input: Parameters<ReturnType<typeof useSaveFitnessSet>['mutate']>[0], restSeconds: number | null) => void
  onDefer: (id: number) => void
  onActivate: (id: number) => void
}) {
  const [reps, setReps] = useState(() => String(fitnessSet.completed ? fitnessSet.actualReps ?? '' : fitnessSet.actualReps ?? previousSet?.actualReps ?? exercise.repsMin ?? ''))
  const [duration, setDuration] = useState(() => String(fitnessSet.completed ? fitnessSet.actualDurationSeconds ?? '' : fitnessSet.actualDurationSeconds ?? previousSet?.actualDurationSeconds ?? exercise.durationSecondsMin ?? ''))
  const [weight, setWeight] = useState(() => String(fitnessSet.completed ? fitnessSet.actualWeightKg ?? '' : fitnessSet.actualWeightKg ?? previousSet?.actualWeightKg ?? exercise.targetWeightKg ?? ''))
  const [rir, setRir] = useState(() => String(fitnessSet.rir ?? ''))
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(() => fitnessSet.actualDurationSeconds ?? 0)
  const [timerBaseSeconds, setTimerBaseSeconds] = useState(() => fitnessSet.actualDurationSeconds ?? 0)
  useEffect(() => {
    if (timerStartedAt === null) return
    const updateTimer = () => {
      const nextSeconds = timerBaseSeconds + Math.floor((Date.now() - timerStartedAt) / 1000)
      setElapsedSeconds(nextSeconds)
      if (exercise.metricType === 'duration') setDuration(String(nextSeconds))
    }
    updateTimer()
    const timer = window.setInterval(updateTimer, 250)
    return () => window.clearInterval(timer)
  }, [exercise.metricType, timerBaseSeconds, timerStartedAt])

  const toggleDurationTimer = () => {
    if (timerStartedAt === null) {
      setTimerBaseSeconds(elapsedSeconds)
      setTimerStartedAt(Date.now())
      return
    }
    setTimerBaseSeconds(elapsedSeconds)
    setTimerStartedAt(null)
  }
  const resetDurationTimer = () => {
    setTimerStartedAt(null)
    setTimerBaseSeconds(0)
    setElapsedSeconds(0)
    if (exercise.metricType === 'duration') setDuration('0')
  }
  const toggleSet = () => onSave({
    id: fitnessSet.id,
    actualReps: exercise.metricType === 'reps' ? nullableNumber(reps) : null,
    actualDurationSeconds: exercise.metricType === 'duration' ? nullableNumber(duration) : null,
    actualWeightKg: exerciseUsesExternalWeight(exercise) ? nullableNumber(weight) : null,
    rir: nullableNumber(rir),
    completed: !fitnessSet.completed,
  }, exercise.restSeconds)

  return (
    <div className={cn('relative grid gap-3 px-4 py-3 transition sm:grid-cols-[3rem_1fr_auto] sm:items-end', fitnessSet.completed && 'bg-mint/20', fitnessSet.deferredAt && !active && 'bg-amber-50/70', active && 'fitness-active-set bg-[#f2f9e4]', locked && !fitnessSet.deferredAt && 'opacity-55')}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">组</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-semibold tabular-nums">{fitnessSet.setNumber}</p>
          {active ? <span className="fitness-live-indicator" aria-label="当前正在进行"><span /><span /><span /></span> : null}
          {fitnessSet.deferredAt ? <span className="rounded-full bg-gold/25 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">{active ? '补做中' : '待补'}</span> : null}
        </div>
        {locked ? <p className="mt-1 text-[9px] font-semibold text-sage">{fitnessSet.deferredAt ? '已跳过，可随时回来补' : '等待上一组'}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {exercise.metricType === 'reps' ? <CompactInput label="次数" value={reps} onChange={setReps} disabled={locked || fitnessSet.completed} hint={previousSet?.actualReps != null ? `上次 ${previousSet.actualReps} 次` : undefined} /> : null}
        {exercise.metricType === 'duration' ? <CompactInput label="秒" value={duration} onChange={setDuration} disabled={locked || fitnessSet.completed} hint={previousSet?.actualDurationSeconds != null ? `上次 ${previousSet.actualDurationSeconds} 秒` : undefined} /> : null}
        {exerciseUsesExternalWeight(exercise) ? <CompactInput label={weightInputLabel(exercise)} value={weight} onChange={setWeight} step="0.5" disabled={locked || fitnessSet.completed} hint={previousSet?.actualWeightKg != null ? `上次 ${previousSet.actualWeightKg} kg` : weightRuleHint(exercise)} /> : null}
        {exercise.rirMin !== null ? <CompactInput label="RIR（可选）" value={rir} onChange={setRir} disabled={locked || fitnessSet.completed} placeholder="不必填" hint="还能再做几次；0=力竭，2=还能做2次" /> : null}
        {exercise.metricType === 'duration' ? (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">本组计时</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="min-w-14 font-display text-lg font-semibold tabular-nums text-ink">{formatClock(elapsedSeconds)}</span>
              <button type="button" onClick={toggleDurationTimer} disabled={locked || fitnessSet.completed} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#13251f] px-2.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">
                {timerStartedAt === null ? <Play size={12} /> : <Pause size={12} />}{timerStartedAt === null ? '开始' : '暂停'}
              </button>
              {elapsedSeconds > 0 ? <button type="button" onClick={resetDurationTimer} disabled={locked || fitnessSet.completed} className="h-8 rounded-lg bg-mist px-2.5 text-[10px] font-semibold text-sage-dark disabled:opacity-35">归零</button> : null}
            </div>
          </div>
        ) : null}
      </div>
      <div className={cn('grid w-full gap-2', active && !fitnessSet.completed ? 'grid-cols-2 sm:w-48' : 'sm:w-28')}>
        {active && !fitnessSet.completed ? (
          <Button type="button" variant="secondary" className="px-2" onClick={() => onDefer(fitnessSet.id)} disabled={saving || deferring}>
            {deferring ? <LoaderCircle className="animate-spin" size={15} /> : <SkipForward size={15} />}{deferring ? '跳过中' : '暂时跳过'}
          </Button>
        ) : null}
        {locked && fitnessSet.deferredAt ? (
          <Button type="button" variant="secondary" className="w-full border-amber-300 bg-amber-50 px-2 text-amber-900 hover:bg-amber-100" onClick={() => onActivate(fitnessSet.id)} disabled={activating || saving || deferring}>
            {activating ? <><LoaderCircle className="animate-spin" size={16} />切换中</> : <><Play size={16} />现在补</>}
          </Button>
        ) : (
          <Button
            type="button"
            variant={fitnessSet.completed ? 'secondary' : 'primary'}
            className="w-full px-2"
            onClick={toggleSet}
            disabled={saving || deferring || activating || locked}
          >
            {saving
              ? <><LoaderCircle className="animate-spin" size={16} />处理中</>
              : locked
                ? <><Clock3 size={16} />待解锁</>
                : fitnessSet.completed
                  ? <><Pause size={16} />撤销完成</>
                  : <><Check size={16} />完成</>}
          </Button>
        )}
      </div>
    </div>
  )
}

function ExerciseDetailDialog({ exercise, onClose }: {
  exercise: FitnessSessionExercise
  onClose: () => void
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0e1f19]/55 p-3 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={onClose}>
      <section className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white shadow-[0_32px_90px_rgba(9,23,18,0.35)] ring-1 ring-black/10" role="dialog" aria-modal="true" aria-labelledby={`exercise-detail-${exercise.id}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="relative overflow-hidden bg-[#13251f] p-5 text-white sm:p-6">
          <div className="absolute -right-10 -top-10 size-36 rounded-full border border-[#d8f96f]/25" />
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="关闭动作详解"><X size={18} /></button>
          <div className="relative">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8f96f]">Movement guide</p>
              <h2 id={`exercise-detail-${exercise.id}`} className="mt-2 font-display text-3xl font-semibold">{exercise.exerciseName}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/70">
                <span className="rounded-full bg-white/10 px-2.5 py-1">{CATEGORY_LABELS[exercise.category]}</span>
                {exercise.primaryMuscle ? <span className="rounded-full bg-white/10 px-2.5 py-1">{exercise.primaryMuscle}</span> : null}
                {exercise.equipment ? <span className="rounded-full bg-white/10 px-2.5 py-1">{exercise.equipment}</span> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:p-6">
          <ExerciseMediaGallery name={exercise.exerciseName} media={exercise.media} />
          <DetailSection number="01" title="动作要领" body={exercise.instructions || '保持动作稳定，在自己可控的活动范围内完成。'} />
          <DetailSection number="02" title="本次训练提示" body={exercise.planNotes || `完成 ${formatSessionExerciseTarget(exercise)}。`} />
          <DetailSection number="03" title="安全注意" body={exercise.cautions || '出现锐痛或关节不适时立即停止，不要为了完成次数牺牲动作质量。'} tone="warning" />
          {exercise.progressionType ? <DetailSection number="04" title="进阶方式" body={exercise.progressionType} /> : null}
        </div>
      </section>
    </div>
  )
}

function ExerciseMediaGallery({ name, media }: { name: string; media: FitnessExerciseMedia | null }) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set())
  const images = media?.images.filter((image) => !failedUrls.has(image.url)) ?? []

  if (images.length) {
    return (
      <section aria-label={`${name}动作示例`}>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">动作示例</h3>
          <span className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-semibold',
            media?.matchType === 'exact' ? 'bg-mint text-sage-dark' : 'bg-amber-100 text-amber-800',
          )}>
            {media?.matchType === 'exact' ? '标准示意' : media?.matchType === 'informational' ? '任务说明' : '相关示意'}
          </span>
        </div>
        <div className={cn('grid gap-2.5', images.length > 1 && 'grid-cols-2')}>
          {images.map((image) => (
            <figure key={image.url} className="overflow-hidden rounded-xl border border-line bg-white">
              <img
                src={image.url}
                alt={`${name}${image.position === 'start' ? '起始姿势' : image.position === 'finish' ? '结束姿势' : '示意图'}`}
                className="aspect-[4/3] w-full object-contain"
                loading="lazy"
                decoding="async"
                onError={() => setFailedUrls((current) => new Set(current).add(image.url))}
              />
              <figcaption className="border-t border-line bg-mist/60 px-2 py-1.5 text-center text-[10px] font-semibold text-sage">
                {image.position === 'start' ? '起始' : image.position === 'finish' ? '结束' : '说明'}
              </figcaption>
            </figure>
          ))}
        </div>
        {media?.note ? <p className="mt-2 text-xs leading-5 text-sage">{media.note}</p> : null}
      </section>
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-mist/60 px-4 py-6 text-center text-sm text-sage">
      暂无动作图片
    </div>
  )
}

function DetailSection({ number, title, body, tone = 'default' }: {
  number: string
  title: string
  body: string
  tone?: 'default' | 'warning'
}) {
  return (
    <div className={cn('grid grid-cols-[2rem_1fr] gap-3 rounded-xl border p-3.5', tone === 'warning' ? 'border-coral/25 bg-coral/5' : 'border-line bg-mist/55')}>
      <span className={cn('font-display text-lg font-semibold', tone === 'warning' ? 'text-coral' : 'text-sage')}>{number}</span>
      <div><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-sage">{body}</p></div>
    </div>
  )
}

function CompactInput({ label, value, onChange, step = '1', disabled = false, hint, placeholder }: { label: string; value: string; onChange: (value: string) => void; step?: string; disabled?: boolean; hint?: string; placeholder?: string }) {
  return (
    <label>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-sage">{label}</span>
      <Input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} className="mt-1 h-9" />
      {hint ? <span className="mt-1 block text-[9px] leading-4 text-sage">{hint}</span> : null}
    </label>
  )
}

function useRestTimer() {
  const [seconds, setSeconds] = useState(0)
  const [visible, setVisible] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  useEffect(() => {
    if (!visible || endsAt === null) return
    const updateRemaining = () => {
      setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    }
    updateRemaining()
    const timer = window.setInterval(updateRemaining, 500)
    return () => window.clearInterval(timer)
  }, [endsAt, visible])
  return {
    seconds,
    visible,
    start: (nextSeconds: number) => {
      setSeconds(nextSeconds)
      setEndsAt(Date.now() + nextSeconds * 1000)
      setVisible(true)
    },
    addThirty: () => setEndsAt((current) => Math.max(current ?? 0, Date.now()) + 30_000),
    skip: () => { setSeconds(0); setEndsAt(null); setVisible(false) },
  }
}

function RestTimer({ seconds, addThirty, skip }: ReturnType<typeof useRestTimer>) {
  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-[#13251f] p-3 text-white shadow-2xl sm:bottom-6">
      <div className="flex size-11 items-center justify-center rounded-xl bg-[#d8f96f] text-[#13251f]"><Clock3 size={20} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">组间休息</p>
        <p className={cn('font-display font-semibold tabular-nums', seconds > 0 ? 'text-2xl' : 'text-lg')}>{seconds > 0 ? formatClock(seconds) : '可以继续'}</p>
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
  if (!data) return <FitnessError message="训练数据读取失败。" />
  if (!activePlan) return <FitnessPlanEmptyState />
  return <FitnessPlanWorkspace data={data} activePlan={activePlan} />
}

function FitnessNoPlanPrompt() {
  return (
    <FitnessShell
      eyebrow="Training plan"
      title="还没有训练计划"
      body="创建计划后，今日页面会按照星期自动展示训练动作。"
    >
      <Panel>
        <EmptyState title="今天还没有安排" body="前往计划页创建一份空白计划，再按自己的节奏配置训练日和动作。" />
        <Link to="/fitness/plan" className="mt-4 flex h-11 items-center justify-center gap-2 rounded-md bg-sage-dark px-4 text-sm font-medium text-white">
          <Plus size={16} />
          创建训练计划
        </Link>
      </Panel>
    </FitnessShell>
  )
}

function FitnessPlanEmptyState() {
  const [showCreatePlan, setShowCreatePlan] = useState(false)

  return (
    <FitnessShell
      eyebrow="Plan builder"
      title="从一份空白计划开始"
      body="计划已经清空。新计划不会自动加入动作，创建后由你决定每周怎么练。"
    >
      <Panel>
        <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-mint text-sage-dark"><CalendarDays size={22} /></div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-ink">暂无训练计划</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-sage">创建后会生成周一到周日七个空白日期，你可以把任意一天设为训练日并添加动作。</p>
          <Button type="button" className="mt-6" onClick={() => setShowCreatePlan(true)}>
            <Plus size={16} />
            创建训练计划
          </Button>
        </div>
      </Panel>
      {showCreatePlan ? <PlanCreateDialog onClose={() => setShowCreatePlan(false)} /> : null}
    </FitnessShell>
  )
}

function PlanCreateDialog({
  sourcePlan,
  onClose,
  onCreated,
}: {
  sourcePlan?: FitnessPlan
  onClose: () => void
  onCreated?: (plan: FitnessPlan) => void
}) {
  const savePlan = useSaveFitnessPlan()
  const copyPlan = useCopyFitnessPlan()
  const [mode, setMode] = useState<'blank' | 'copy'>(sourcePlan ? 'copy' : 'blank')
  const [name, setName] = useState(sourcePlan ? `${sourcePlan.name} · 副本` : '我的训练计划')
  const [durationWeeks, setDurationWeeks] = useState(sourcePlan?.durationWeeks ?? 12)
  const isPending = savePlan.isPending || copyPlan.isPending

  const changeMode = (nextMode: 'blank' | 'copy') => {
    setMode(nextMode)
    setName(nextMode === 'copy' && sourcePlan ? `${sourcePlan.name} · 副本` : '我的训练计划')
    setDurationWeeks(sourcePlan?.durationWeeks ?? 12)
  }

  const createPlan = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    if (mode === 'copy' && sourcePlan) {
      copyPlan.mutate(
        { id: sourcePlan.id, name: trimmedName },
        { onSuccess: (plan) => { onCreated?.(plan); onClose() } },
      )
      return
    }
    savePlan.mutate(
      createBlankPlanInput(trimmedName, durationWeeks),
      { onSuccess: (plan) => { onCreated?.(plan); onClose() } },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#13251f]/45 p-4 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-lg rounded-2xl border border-white/60 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="create-plan-title" onMouseDown={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sage-dark">New training plan</p>
        <h2 id="create-plan-title" className="mt-2 font-display text-3xl font-semibold text-ink">新建训练计划</h2>
        <p className="mt-2 text-sm leading-6 text-sage">选择从空白星期开始，或者复制当前计划后再调整。</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => changeMode('blank')} className={cn('rounded-xl border p-3 text-left transition', mode === 'blank' ? 'border-sage-dark bg-mint/35' : 'border-line hover:border-sage')}>
            <CalendarDays size={18} />
            <span className="mt-2 block text-sm font-semibold text-ink">空白计划</span>
            <span className="mt-1 block text-xs leading-5 text-sage">生成七个空白日期，完全自行安排。</span>
          </button>
          {sourcePlan ? (
            <button type="button" onClick={() => changeMode('copy')} className={cn('rounded-xl border p-3 text-left transition', mode === 'copy' ? 'border-sage-dark bg-mint/35' : 'border-line hover:border-sage')}>
              <Copy size={18} />
              <span className="mt-2 block text-sm font-semibold text-ink">复制整份计划</span>
              <span className="mt-1 block text-xs leading-5 text-sage">保留所有星期、动作和组次配置。</span>
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={cn('space-y-2', mode === 'copy' ? 'sm:col-span-2' : '')}>
            <Label>计划名称</Label>
            <Input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} disabled={isPending} />
          </div>
          {mode === 'blank' ? (
            <div className="space-y-2">
              <Label>计划周数</Label>
              <Input type="number" min={1} max={104} value={durationWeeks} onChange={(event) => setDurationWeeks(Math.min(104, Math.max(1, Number(event.target.value) || 1)))} disabled={isPending} />
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>取消</Button>
          <Button type="button" onClick={createPlan} disabled={isPending || !name.trim()}>
            {isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}
            {isPending ? '创建中' : mode === 'copy' ? '创建副本' : '创建计划'}
          </Button>
        </div>
      </section>
    </div>
  )
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
  const deletePlan = useDeleteFitnessPlan()
  const activatePlan = useActivateFitnessPlan()
  const [draft, setDraft] = useState<FitnessPlan>(() => structuredClone(activePlan))
  const [selectedWeekday, setSelectedWeekday] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCreatePlan, setShowCreatePlan] = useState(false)

  const selectedDay = draft.days.find((day) => day.weekday === selectedWeekday)
  const activeExercises = data.exercises.filter((exercise) => exercise.isActive)
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(activePlan),
    [activePlan, draft],
  )

  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const handleLinkClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return
      const targetUrl = new URL(anchor.href, window.location.href)
      if (targetUrl.origin !== window.location.origin || targetUrl.pathname === window.location.pathname) return
      if (!window.confirm('这份计划还有未保存的修改，确定离开吗？')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleLinkClick, true)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [isDirty])

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

  const saveDraft = () => {
    savePlan.mutate(draft, {
      onSuccess: (plan) => setDraft(structuredClone(plan)),
    })
  }

  return (
    <FitnessShell
      eyebrow="Plan builder"
      title="训练计划编辑器"
      body="动作与星期安排分开维护。修改这里会影响后续训练，不会覆盖未来的历史训练快照。"
    >
      <Panel className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Field label="计划版本">
            <select value={selectedPlanId} onChange={(event) => { const nextId = Number(event.target.value); if (!isDirty || window.confirm('当前修改尚未保存，确定切换计划吗？')) onSelectPlan(nextId) }} className="fitness-select lg:min-w-64">
              {data.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.isActive ? '（当前）' : ''}</option>)}
            </select>
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
            <Button type="button" variant="secondary" onClick={() => setShowCreatePlan(true)} disabled={isDirty} title={isDirty ? '请先保存或放弃当前修改' : '新建或复制训练计划'}><Plus size={16} />新建计划</Button>
            <Button type="button" variant="secondary" className="border-coral/30 text-coral hover:border-coral hover:bg-coral/5" onClick={() => setShowDeleteConfirm(true)} disabled={deletePlan.isPending}><Trash2 size={16} />删除计划</Button>
            {!draft.isActive ? <Button type="button" onClick={() => activatePlan.mutate(draft.id)} disabled={activatePlan.isPending || isDirty} title={isDirty ? '请先保存或放弃当前修改' : undefined}>设为当前计划</Button> : <span className="inline-flex h-10 items-center justify-center rounded-md bg-mint px-4 text-sm font-semibold text-sage-dark">当前执行中</span>}
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-sage">“新建计划”可以从空白开始，也可以复制当前计划；删除只移除计划模板，已经完成的训练历史仍会保留。</p>
      </Panel>
      <Panel className="p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] md:items-end">
          <div>
            <Label>计划名称</Label>
            <Input value={draft.name} maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
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
          <Button
            type="button"
            className="w-full md:w-auto"
            onClick={saveDraft}
            disabled={savePlan.isPending || !isDirty || !draft.name.trim()}
          >
            {savePlan.isPending ? <LoaderCircle className="animate-spin" size={16} /> : isDirty ? <Save size={16} /> : <Check size={16} />}
            {savePlan.isPending ? '保存中' : isDirty ? '保存计划' : '已保存'}
          </Button>
        </div>
        <p className={cn('mt-3 text-xs leading-5', isDirty ? 'font-semibold text-sage-dark' : 'text-sage')} aria-live="polite">
          {isDirty ? '计划信息已修改，点击“保存计划”后才会生效。' : formatSavedTime(draft.updatedAt)}
        </p>
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
      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#13251f]/45 p-4 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={() => setShowDeleteConfirm(false)}>
          <section className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-plan-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex size-11 items-center justify-center rounded-full bg-coral/10 text-coral"><Trash2 size={20} /></div>
            <h2 id="delete-plan-title" className="mt-4 font-display text-2xl font-semibold text-ink">删除“{draft.name}”？</h2>
            <p className="mt-2 text-sm leading-6 text-sage">计划里的星期安排会被删除，但已经完成的训练记录和个人纪录不会受影响。此操作无法撤销。</p>
            {data.plans.length === 1 ? <p className="mt-3 rounded-lg bg-mist px-3 py-2 text-xs leading-5 text-sage-dark">这是最后一份计划。删除后会进入空状态，你可以随时重新创建。</p> : null}
            {draft.isActive && data.plans.length > 1 ? <p className="mt-3 rounded-lg bg-mist px-3 py-2 text-xs leading-5 text-sage-dark">这是当前执行计划，删除后会自动切换到另一份计划。</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deletePlan.isPending}>取消</Button>
              <Button type="button" className="bg-coral hover:bg-[#d85c49]" disabled={deletePlan.isPending} onClick={() => deletePlan.mutate(draft.id, { onSuccess: (result) => { setShowDeleteConfirm(false); if (result.activePlanId) onSelectPlan(result.activePlanId) } })}>{deletePlan.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}{deletePlan.isPending ? '删除中' : '确认删除'}</Button>
            </div>
          </section>
        </div>
      ) : null}
      {showCreatePlan ? <PlanCreateDialog sourcePlan={activePlan} onClose={() => setShowCreatePlan(false)} onCreated={(plan) => onSelectPlan(plan.id)} /> : null}
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
  const [editorOpen, setEditorOpen] = useState(false)

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

  const selectExercise = (exercise: FitnessExercise) => {
    setForm({ ...exercise })
    setEditorOpen(true)
  }
  const createExercise = () => {
    setForm({ ...EMPTY_EXERCISE })
    setEditorOpen(true)
  }
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    saveExercise.mutate(form, {
      onSuccess: (saved) => {
        setForm({ ...saved })
        setEditorOpen(false)
      },
    })
  }

  return (
    <FitnessShell
      eyebrow="Exercise library"
      title="动作库"
      body="动作名称、器械、注意事项和进阶方式只维护一次，所有训练计划都可以复用。"
      action={
        <Button className="bg-[#d8f96f] text-[#18220f] hover:bg-white" onClick={createExercise}>
          <Plus size={16} />新增动作
        </Button>
      }
    >
      <div className="grid gap-4">
        <Panel className="p-3 sm:p-4">
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
          <div className="mt-3 grid max-h-[42rem] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((exercise) => (
              <button
                type="button"
                key={exercise.id}
                onClick={() => selectExercise(exercise)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition hover:border-sage',
                  form.id === exercise.id && editorOpen ? 'border-[#13251f] bg-[#13251f] text-white' : 'border-line bg-white',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="mt-1 text-xs opacity-60">{exercise.primaryMuscle || '未分类'} · {exercise.equipment || '无器械'}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', form.id === exercise.id && editorOpen ? 'bg-white/10' : 'bg-mint/35 text-sage-dark')}>
                    {CATEGORY_LABELS[exercise.category]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

      </div>
      {editorOpen ? (
        <ExerciseEditorDialog
          form={form}
          media={data?.exercises.find((exercise) => exercise.id === form.id)?.media ?? null}
          saving={saveExercise.isPending}
          archiving={archiveExercise.isPending}
          onChange={setForm}
          onClose={() => setEditorOpen(false)}
          onSubmit={handleSubmit}
          onArchive={() => archiveExercise.mutate(form.id!, {
            onSuccess: () => {
              setForm({ ...EMPTY_EXERCISE })
              setEditorOpen(false)
            },
          })}
        />
      ) : null}
    </FitnessShell>
  )
}

function ExerciseEditorDialog({ form, media, saving, archiving, onChange, onClose, onSubmit, onArchive }: {
  form: FitnessExerciseInput
  media: FitnessExerciseMedia | null
  saving: boolean
  archiving: boolean
  onChange: (value: FitnessExerciseInput) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
  onArchive: () => void
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0e1f19]/60 sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
      <section
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_32px_100px_rgba(9,23,18,0.4)] ring-1 ring-black/10 sm:max-w-3xl sm:rounded-[1.75rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="relative shrink-0 overflow-hidden bg-[#13251f] px-5 py-5 text-white sm:px-6">
          <div className="absolute -right-8 -top-12 size-36 rounded-full border border-[#d8f96f]/25" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8f96f]"><Settings2 size={13} />Exercise profile</p>
              <h2 id="exercise-editor-title" className="mt-1.5 font-display text-2xl font-semibold sm:text-3xl">{form.id ? form.name : '新增动作'}</h2>
              <p className="mt-1 text-xs text-white/55">{form.id ? '查看示例并维护动作资料' : '创建一个可以在训练计划中复用的动作'}</p>
            </div>
            <button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="关闭动作弹窗"><X size={18} /></button>
          </div>
        </header>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            {form.id ? <ExerciseMediaGallery name={form.name} media={media} /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="动作名称"><Input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} required autoFocus={!form.id} /></Field>
              <Field label="主要部位"><Input value={form.primaryMuscle ?? ''} onChange={(event) => onChange({ ...form, primaryMuscle: event.target.value })} placeholder="例如 胸 / 三头" /></Field>
              <Field label="动作类型">
                <select className="fitness-select" value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value as FitnessExerciseCategory })}>
                  {(Object.keys(CATEGORY_LABELS) as FitnessExerciseCategory[]).map((key) => <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>)}
                </select>
              </Field>
              <Field label="记录方式">
                <select className="fitness-select" value={form.metricType} onChange={(event) => onChange({ ...form, metricType: event.target.value as FitnessMetricType })}>
                  {(Object.keys(METRIC_LABELS) as FitnessMetricType[]).map((key) => <option key={key} value={key}>{METRIC_LABELS[key]}</option>)}
                </select>
              </Field>
              <Field label="器械"><Input value={form.equipment ?? ''} onChange={(event) => onChange({ ...form, equipment: event.target.value })} /></Field>
              <Field label="辅助部位"><Input value={form.secondaryMuscles ?? ''} onChange={(event) => onChange({ ...form, secondaryMuscles: event.target.value })} /></Field>
            </div>
            <TextAreaField label="动作要点" value={form.instructions ?? ''} onChange={(value) => onChange({ ...form, instructions: value })} />
            <TextAreaField label="注意事项" value={form.cautions ?? ''} onChange={(value) => onChange({ ...form, cautions: value })} />
            <TextAreaField label="进阶规则" value={form.progressionNotes ?? ''} onChange={(value) => onChange({ ...form, progressionNotes: value })} />
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-white/95 p-4 backdrop-blur sm:px-6">
            {form.id ? (
              <Button type="button" variant="ghost" className="text-coral" onClick={onArchive} disabled={archiving}>
                <Trash2 size={16} />{archiving ? '处理中' : '停用动作'}
              </Button>
            ) : <span />}
            <Button type="submit" disabled={saving || !form.name.trim()}>
              <Save size={16} />{saving ? '保存中' : '保存动作'}
            </Button>
          </footer>
        </form>
      </section>
    </div>
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <HistoryStat label="训练次数" value={`${history.data.length}`} />
            <HistoryStat label="完成组数" value={`${history.data.reduce((sum, item) => sum + item.completedSets, 0)}`} />
            <HistoryStat
              className="col-span-2 sm:col-span-1"
              label="累计训练量"
              value={`${formatNumber(history.data.reduce((sum, item) => sum + item.totalVolumeKg, 0))} kg·次`}
              detail="只统计重量动作，等于每组重量 × 完成次数后相加"
            />
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
                  <span className="mt-1 block text-sm text-sage">{session.exerciseCount} 个动作 · {session.completedSets}/{session.totalSets} 组 · 训练量 {formatNumber(session.totalVolumeKg)} kg·次</span>
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
  const dateRange = `${formatShortCalendarDate(cells[0].date)} – ${formatShortCalendarDate(cells[cells.length - 1].date)}`
  return (
    <Panel className="overflow-hidden">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-dark">最近 12 周</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">训练日历</h2>
          <p className="text-xs tabular-nums text-sage">{dateRange}</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-sage">每个格子代表一天，数字是日期；有颜色表示当天留下了训练记录。</p>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-sage">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday.slice(1)}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((cell) => (
            <div
              key={cell.date}
              title={calendarCellDescription(cell)}
              aria-label={calendarCellDescription(cell)}
              className={cn(
                'relative flex h-9 min-w-0 items-center justify-center rounded-lg border text-[11px] tabular-nums sm:h-10 sm:text-xs',
                calendarTone(cell.session, cell.future),
                cell.today && 'ring-2 ring-[#13251f] ring-offset-1',
              )}
            >
              <span className={cn(cell.session?.status === 'completed' && 'font-bold')}>{Number(cell.date.slice(8, 10))}</span>
              {cell.date.slice(8, 10) === '01' ? <span className="absolute left-1 top-0.5 hidden text-[7px] font-semibold opacity-70 sm:block">{Number(cell.date.slice(5, 7))}月</span> : null}
            </div>
          ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-sage">
        <CalendarLegend tone="bg-[#355e4d]" label="完成" />
        <CalendarLegend tone="bg-[#d8f96f]" label="部分完成/进行中" />
        <CalendarLegend tone="bg-gold/50" label="跳过" />
        <CalendarLegend tone="bg-white" label="未训练" />
      </div>
    </Panel>
  )
}

function CalendarLegend({ tone, label }: { tone: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn('size-3 rounded border border-line', tone)} />{label}</span>
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

function HistoryStat({ label, value, detail, className }: { label: string; value: string; detail?: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-line bg-white p-3 sm:p-4', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">{label}</p>
      <p className="mt-1 break-words font-display text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      {detail ? <p className="mt-1.5 text-[10px] leading-4 text-sage">{detail}</p> : null}
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

function formatPlanExerciseTarget(item: FitnessPlanExercise) {
  const sets = item.sets ? `${item.sets}组 × ` : ''
  if (item.durationSecondsMin !== null) {
    return `${sets}${formatRange(item.durationSecondsMin, item.durationSecondsMax)}秒`
  }
  if (item.repsMin !== null) {
    return `${sets}${formatRange(item.repsMin, item.repsMax)}次${item.eachSide ? '/侧' : ''}`
  }
  return item.exercise?.metricType === 'check' ? '完成即可' : sets.replace(' × ', '') || '--'
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
  const today = formatLocalDate(new Date())
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
    return { date, session: sessionByDate.get(date), today: date === today, future: date > today }
  })
}

function calendarTone(session: FitnessSessionSummary | undefined, future: boolean) {
  if (future) return 'border-dashed border-line/70 bg-mist/30 text-sage/35'
  if (!session) return 'border-line bg-white text-sage'
  if (session.status === 'skipped') return 'border-gold/50 bg-gold/50 text-amber-900'
  if (session.progressPercent >= 100) return 'border-[#355e4d] bg-[#355e4d] text-white'
  return 'border-[#bad85f] bg-[#d8f96f] text-[#314017]'
}

function calendarCellDescription(cell: ReturnType<typeof buildCalendarCells>[number]) {
  if (cell.future) return `${cell.date} · 尚未到来`
  if (!cell.session) return `${cell.date} · 未训练`
  return `${cell.date} · ${cell.session.name} · ${cell.session.completedSets}/${cell.session.totalSets}组`
}

function formatShortCalendarDate(date: string) {
  return `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`
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
