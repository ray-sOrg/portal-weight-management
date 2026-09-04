/* eslint-disable react-refresh/only-export-components --
 * TanStack Router needs the router instance exported from the same route tree
 * module; colocating first-pass pages keeps this small app easy to scan.
 */
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Download,
  Dumbbell,
  Home,
  LogIn,
  LogOut,
  LoaderCircle,
  Plus,
  Scale,
  Settings,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { FormEvent, type ReactNode, useMemo, useState } from 'react'
import { BmiChart, HouseholdCompareChart, WeightTrendChart } from './components/charts'
import { Button, EmptyState, Input, Label, Panel } from './components/ui'
import { downloadCsv, downloadJson, exportBackupJson, exportEntriesCsv } from './lib/csv'
import {
  calculateBmi,
  filterEntriesByRange,
  getFirstEntry,
  getGoalProgressFromEntries,
  getRangeSummary,
  getLatestEntry,
  getBmiDistribution,
  getLongestStreakDays,
  getPhaseComparison,
  getStabilityLabel,
  getWeightChange,
  sortEntries,
  type TrendRange,
} from './lib/metrics'
import {
  useAddWeightEntry,
  useAppData,
  useCurrentUser,
  useFitnessData,
  useFitnessHistory,
  useUpsertGoal,
  useUpsertPerson,
} from './lib/queries'
import {
  isAuthenticationError,
  loginWithPassword,
  logout,
  unifiedLoginUrl,
  updateProfile,
} from './lib/server-api'
import type { FitnessPlanDay, FitnessSession, FitnessSessionSummary, TrackedPerson } from './lib/types'
import { formatFullDate, formatJin, formatKg, jinToKg, kgToJin, todayISO } from './lib/utils'
import {
  FitnessExercisesPage,
  FitnessHistoryPage,
  FitnessPlanPage,
  FitnessRecordsPage,
  FitnessTodayPage,
} from './fitness/module'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const entriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weight',
  component: WeightEntriesPage,
})

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weight/trends',
  component: WeightTrendsPage,
})

const weightGoalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weight/goal',
  component: WeightGoalPage,
})

const legacyEntriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entries',
  beforeLoad: () => { throw redirect({ to: '/weight' }) },
})

const legacyReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  beforeLoad: () => { throw redirect({ to: '/weight/trends' }) },
})

const legacyHouseholdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/household',
  beforeLoad: () => { throw redirect({ to: '/settings' }) },
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const fitnessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fitness',
  component: FitnessTodayPage,
})

const fitnessPlanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fitness/plan',
  component: FitnessPlanPage,
})

const fitnessExercisesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fitness/exercises',
  component: FitnessExercisesPage,
})

const fitnessHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fitness/history',
  component: FitnessHistoryPage,
})

const fitnessRecordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fitness/records',
  component: FitnessRecordsPage,
})

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  entriesRoute,
  reportsRoute,
  weightGoalRoute,
  legacyEntriesRoute,
  legacyReportsRoute,
  legacyHouseholdRoute,
  fitnessRoute,
  fitnessPlanRoute,
  fitnessExercisesRoute,
  fitnessHistoryRoute,
  fitnessRecordsRoute,
  settingsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/fitness', label: '健身', icon: Dumbbell },
  { to: '/weight', label: '体重', icon: Scale },
  { to: '/settings', label: '设置', icon: Settings },
] as const

function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-mist/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 md:py-3 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 md:gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-sage-dark text-white md:size-10">
              <Activity size={18} />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-ink md:text-xl">
                身体管理
              </span>
              <span className="block text-[11px] text-sage md:text-xs">训练、状态与长期趋势</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-sage-dark transition hover:bg-white"
                activeProps={{ className: 'bg-white text-ink shadow-sm' }}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 md:pb-6 md:pt-6 lg:px-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_34px_rgba(33,45,40,0.08)] backdrop-blur md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium text-sage"
            activeProps={{ className: 'bg-mist text-sage-dark' }}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function useSelectedPerson() {
  const appData = useAppData()
  const [personId, setPersonId] = useState<string | null>(null)
  const data = appData.data
  const person =
    data?.people.find((item) => item.id === personId) ?? data?.people[0] ?? null
  const entries =
    data?.entries.filter((entry) => entry.tracked_person_id === person?.id) ?? []
  const goal = data?.goals.find((item) => item.tracked_person_id === person?.id) ?? null
  return { ...appData, person, entries, goal, setPersonId }
}

function PersonPicker({
  people,
  value,
  onChange,
}: {
  people: TrackedPerson[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-md border border-line bg-white px-3 text-base text-ink outline-none focus:border-sage md:h-10 md:w-auto md:text-sm"
    >
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>
  )
}

function RangePicker({
  value,
  onChange,
}: {
  value: TrendRange
  onChange: (value: TrendRange) => void
}) {
  const items: Array<{ value: TrendRange; label: string }> = [
    { value: '30', label: '30天' },
    { value: '90', label: '90天' },
    { value: 'all', label: '全部' },
  ]
  return (
    <div className="inline-grid grid-cols-3 rounded-md border border-line bg-white p-1 text-xs font-medium text-sage-dark">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`h-8 rounded px-3 transition ${
            value === item.value ? 'bg-sage-dark text-white shadow-sm' : 'hover:bg-mist'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function DashboardPage() {
  const { data, error, isLoading, person, entries } = useSelectedPerson()
  const fitness = useFitnessData()
  const fitnessHistory = useFitnessHistory()
  if (isLoading || fitness.isLoading) return <ScreenLoading title="正在整理今天" body="训练安排与身体数据正在同步。" />
  if (error) return <LoginPrompt />
  if (!data || !person) return <LoginPrompt />

  const latest = getLatestEntry(entries)
  const fitnessData = fitness.data
  const activePlan = fitnessData?.plans.find((plan) => plan.id === fitnessData.activePlanId) ?? fitnessData?.plans[0]
  const todayPlan = activePlan?.days.find((day) => day.weekday === fitnessData?.todayWeekday)
  const todaySession = fitnessData?.todaySession
  const trainingDays = activePlan?.days.filter((day) => !day.isRest).length ?? 0
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const weekSessions = (fitnessHistory.data ?? []).filter((session) => new Date(`${session.scheduledDate}T00:00:00`) >= weekStart && session.status !== 'skipped')
  const weekCompletedSets = weekSessions.reduce((sum, session) => sum + session.completedSets, 0)
  const lastSession = fitnessHistory.data?.[0]
  const hour = new Date().getHours()
  const greeting = hour < 12
    ? '上午好，今天这样安排'
    : hour < 14
      ? '中午好，稍作休息再继续'
      : hour < 18
        ? '下午好，保持今天的节奏'
        : hour < 20
          ? '傍晚好，看看今天完成了什么'
          : '晚上好，看看今天完成了什么'
  const workoutAction = todaySession?.status === 'in_progress'
    ? '继续训练'
    : todaySession
      ? '查看今日训练'
      : todayPlan?.isRest
        ? '查看恢复安排'
        : '开始今日训练'

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="home-hero relative overflow-hidden rounded-[1.7rem] bg-[#13251f] px-5 py-6 text-white shadow-[0_28px_80px_rgba(19,37,31,0.2)] sm:px-7 md:py-8">
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d8f96f]">{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">{greeting}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">训练是今天的主线，体重只是帮助你观察长期方向。</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-[#29483b] bg-[#193229] p-5 text-white shadow-[0_20px_55px_rgba(19,37,31,0.16)] sm:p-6">
          <div className="absolute -right-12 -top-14 size-44 rounded-full border border-[#d8f96f]/20" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div>
              <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8f96f]">Today's training</p>{todaySession?.status === 'in_progress' ? <span className="rounded-full bg-[#d8f96f] px-2.5 py-1 text-[10px] font-bold text-[#18220f]">进行中</span> : null}</div>
              <h2 className="mt-3 font-display text-3xl font-semibold">{todayPlan?.name ?? '今天暂无训练安排'}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">{todayPlan?.focus ?? '恢复也是计划的一部分，保持轻松活动。'}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
                <span className="rounded-full bg-white/8 px-3 py-1.5">{todayPlan?.exercises.length ?? 0} 个动作</span>
                <span className="rounded-full bg-white/8 px-3 py-1.5">预计 {todayPlan?.estimatedMinutes ?? 0} 分钟</span>
                {todaySession ? <span className="rounded-full bg-white/8 px-3 py-1.5">{todaySession.completedSets}/{todaySession.totalSets} 组</span> : null}
              </div>
            </div>
            <Link to="/fitness" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d8f96f] px-4 text-sm font-semibold text-[#18220f] transition hover:bg-white sm:w-fit">
              {workoutAction}<ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <HomeMetric icon={CalendarCheck} value={`${weekSessions.length}/${trainingDays}`} label="本周训练" detail={`${weekCompletedSets} 组已完成`} />
          <HomeMetric icon={lastSession?.status === 'completed' ? CheckCircle2 : Activity} value={lastSession?.effortScore ? `${lastSession.effortScore}/10` : '--'} label="上次难度" detail={lastSession ? `${lastSession.name} · ${lastSession.completedSets} 组` : '完成训练后显示'} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[.72fr_1.28fr]">
        <Panel className="flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sage-dark">Body trend</p><h2 className="mt-2 font-display text-2xl font-semibold">最近身体状态</h2></div>
            <span className="flex size-10 items-center justify-center rounded-full bg-mist text-sage-dark"><Scale size={18} /></span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div><p className="text-3xl font-semibold tabular-nums text-ink">{latest ? formatJin(latest.weight_kg) : '--'}</p><p className="mt-1 text-xs text-sage">{latest ? formatFullDate(latest.measured_on) : '还没有体重记录'}</p></div>
            <div className="text-right"><p className="text-lg font-semibold tabular-nums text-sage-dark">{formatDelta(getWeightChange(entries, 7))}</p><p className="text-[10px] text-sage">7 天变化</p></div>
          </div>
          <Link to="/weight" className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-semibold text-sage-dark transition hover:border-sage hover:bg-mist">记录体重<ArrowRight size={15} /></Link>
        </Panel>

        <Panel className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-[#d8f96f] via-mint to-transparent" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sage-dark">Today’s note</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">今天的小建议</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-sage">{getDailyTrainingNote(todaySession, lastSession, todayPlan?.isRest ?? true)}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/fitness/history" className="rounded-lg bg-mist px-3 py-2 text-xs font-semibold text-sage-dark">查看训练历史</Link>
            <Link to="/fitness/records" className="rounded-lg bg-mist px-3 py-2 text-xs font-semibold text-sage-dark">查看个人纪录</Link>
          </div>
        </Panel>
      </section>
    </div>
  )
}

function HomeMetric({ icon: Icon, value, label, detail }: { icon: typeof Activity; value: string; label: string; detail: string }) {
  return <Panel className="flex min-h-32 flex-col justify-between"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-sage-dark">{label}</p><Icon size={18} className="text-sage" /></div><div><p className="text-3xl font-semibold tabular-nums text-ink">{value}</p><p className="mt-1 truncate text-[11px] text-sage">{detail}</p></div></Panel>
}

function getDailyTrainingNote(todaySession: FitnessSession | null | undefined, lastSession: FitnessSessionSummary | undefined, isRestDay: FitnessPlanDay['isRest']) {
  if (todaySession?.painFlag || lastSession?.painFlag) return '最近记录过疼痛或异常不适。今天优先检查动作感受，必要时降低重量、减少组数或改为恢复训练。'
  if (todaySession?.status === 'completed') return '今天的训练已经完成。补充水分和蛋白质，今晚把睡眠放在第一位。'
  if (isRestDay) return '今天是恢复日。轻松走路、活动肩髋并保证睡眠，会让下一次训练更有质量。'
  if ((lastSession?.effortScore ?? 0) >= 9) return '上次训练难度接近极限，今天建议保留 2 次左右余力，不需要连续两次拼到极限。'
  return '按照计划完成主要动作，工作组保持 1–2 RIR。状态好可以加一组，但动作质量始终优先。'
}

const WEIGHT_NAV = [
  { to: '/weight', label: '记录' },
  { to: '/weight/trends', label: '趋势' },
  { to: '/weight/goal', label: '目标' },
] as const

function WeightModuleHeader({ title, body }: { title: string; body: string }) {
  return <>
    <PageIntro eyebrow="Weight" title={title} body={body} />
    <nav className="grid grid-cols-3 rounded-xl border border-line bg-white/90 p-1.5 shadow-sm">
      {WEIGHT_NAV.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === '/weight' }} className="flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-sage transition hover:bg-mist" activeProps={{ className: 'bg-[#13251f] text-white shadow-sm' }}>{item.label}</Link>)}
    </nav>
  </>
}

function WeightEntriesPage() {
  return <div className="space-y-4 md:space-y-6"><WeightModuleHeader title="记录身体的长期变化" body="体重是趋势数据，不是每天的成绩单。保持相近条件记录即可。" /><EntriesPage /></div>
}

function WeightTrendsPage() {
  return <div className="space-y-4 md:space-y-6"><WeightModuleHeader title="看方向，不被日波动干扰" body="通过移动均值、区间变化和 BMI 观察长期趋势。" /><ReportsPage /></div>
}

function WeightGoalPage() {
  const { data, error, isLoading, person, entries, goal, setPersonId } = useSelectedPerson()
  const upsertGoal = useUpsertGoal()
  const [goalWeightJin, setGoalWeightJin] = useState('')
  const [goalDate, setGoalDate] = useState('')
  if (isLoading) return <ScreenLoading />
  if (error || !data || !person) return <LoginPrompt />
  const selectedPerson = person
  const firstEntry = getFirstEntry(entries)
  const latest = getLatestEntry(entries)
  const effectiveGoalWeight = goalWeightJin || (goal ? kgToJin(goal.target_weight_kg).toFixed(1) : '')
  const effectiveGoalDate = goalDate || goal?.target_on || ''
  const progress = getGoalProgressFromEntries(entries, goal)

  function saveGoal(event: FormEvent) {
    event.preventDefault()
    const targetWeightKg = jinToKg(Number(effectiveGoalWeight))
    if (!Number.isFinite(targetWeightKg) || targetWeightKg < 20 || targetWeightKg > 300) return
    upsertGoal.mutate({ trackedPersonId: selectedPerson.id, startWeightKg: firstEntry?.weight_kg ?? goal?.start_weight_kg ?? targetWeightKg, targetWeightKg, targetOn: effectiveGoalDate || null })
    setGoalWeightJin(kgToJin(targetWeightKg).toFixed(1))
    setGoalDate(effectiveGoalDate)
  }

  return <div className="space-y-4 md:space-y-6">
    <WeightModuleHeader title="给长期变化一个方向" body="目标用于观察趋势，不要求体重每天都向同一个方向移动。" />
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr] lg:gap-6">
      <Panel>
        <PageSectionTitle title="设置目标" body="为不同成员分别维护目标体重和日期。" />
        <form className="mt-5 grid gap-4" onSubmit={saveGoal}>
          <div className="space-y-2"><Label>成员</Label><PersonPicker people={data.people} value={selectedPerson.id} onChange={(value) => { setPersonId(value); setGoalWeightJin(''); setGoalDate('') }} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>目标体重</Label><div className="relative"><Input className="pr-14" inputMode="decimal" placeholder="130.0" value={effectiveGoalWeight} onChange={(event) => setGoalWeightJin(event.target.value)} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-sage-dark">斤</span></div></div>
            <div className="space-y-2"><Label>目标日期</Label><Input type="date" value={effectiveGoalDate} onChange={(event) => setGoalDate(event.target.value)} /></div>
          </div>
          <Button type="submit" disabled={upsertGoal.isPending || !effectiveGoalWeight}>{upsertGoal.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Scale size={16} />}{upsertGoal.isPending ? '保存中...' : '保存目标'}</Button>
        </form>
      </Panel>
      <Panel className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sage-dark via-mint to-[#d8f96f]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sage-dark">Goal progress</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">当前进度</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricTile label="当前体重" value={latest ? formatJin(latest.weight_kg) : '--'} detail={latest ? formatFullDate(latest.measured_on) : '暂无记录'} />
          <MetricTile label="目标体重" value={goal ? formatJin(goal.target_weight_kg) : '--'} detail={goal?.target_on || '尚未设置'} />
          <MetricTile label="目标进度" value={progress === null ? '--' : `${progress}%`} detail="从首次记录开始" tone="good" />
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-sage-dark transition-all" style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }} /></div>
        <p className="mt-4 text-sm leading-6 text-sage">关注 2–4 周的趋势，而不是单日变化。训练、饮食、睡眠和水分都会影响体重。</p>
      </Panel>
    </div>
  </div>
}

function EntriesPage() {
  const { data, error, isLoading, person, entries, setPersonId } = useSelectedPerson()
  const addEntry = useAddWeightEntry()
  const [form, setForm] = useState({
    measuredOn: todayISO(),
    weightJin: '',
    note: '',
  })

  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data || !person) return <LoginPrompt />
  const selectedPerson = person

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const weightJin = Number(form.weightJin)
    const weightKg = jinToKg(weightJin)
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) return
    const existingEntry = entries.find((entry) => entry.measured_on === form.measuredOn)
    if (existingEntry) {
      const shouldReplace = window.confirm(
        `${selectedPerson.name} 在 ${formatFullDate(form.measuredOn)} 已有记录，是否替换为 ${weightJin.toFixed(1)} 斤？`,
      )
      if (!shouldReplace) return
    }
    addEntry.mutate({
      trackedPersonId: selectedPerson.id,
      measuredOn: form.measuredOn,
      weightKg,
      heightCm: selectedPerson.height_cm,
      existingEntryId: existingEntry?.id,
      note: form.note,
    })
    setForm((current) => ({ ...current, weightJin: '', note: '' }))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr] lg:gap-6">
      <Panel>
        <PageSectionTitle title="快速记录" body="按斤输入，保存后自动换算用于 BMI 和趋势计算。" />
        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>成员</Label>
            <PersonPicker people={data.people} value={selectedPerson.id} onChange={setPersonId} />
          </div>
          <div className="space-y-2">
            <Label>日期</Label>
            <Input type="date" value={form.measuredOn} onChange={(event) => setForm({ ...form, measuredOn: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>体重</Label>
            <div className="relative">
              <Input
                className="pr-14"
                inputMode="decimal"
                placeholder="132.2"
                value={form.weightJin}
                onChange={(event) => setForm({ ...form, weightJin: event.target.value })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-sage-dark">
                斤
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Input placeholder="晨起空腹、运动后等" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </div>
          <Button type="submit" disabled={addEntry.isPending} className="w-full">
            {addEntry.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}
            {addEntry.isPending ? '保存中...' : '保存记录'}
          </Button>
        </form>
      </Panel>

      <Panel>
        <PageSectionTitle title="记录历史" body={`${selectedPerson.name} 的最近记录`} />
        <div className="mt-5 overflow-hidden rounded-lg border border-line">
          <table className="w-full border-collapse bg-white text-sm">
            <thead className="bg-mist text-left text-xs uppercase tracking-[0.08em] text-sage-dark">
              <tr>
                <th className="px-3 py-3 sm:px-4">日期</th>
                <th className="px-3 py-3 sm:px-4">体重</th>
                <th className="px-3 py-3 sm:px-4">BMI</th>
                <th className="hidden px-3 py-3 sm:table-cell sm:px-4">备注</th>
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                sortEntries(entries).reverse().map((entry) => (
                  <tr key={entry.id} className="border-t border-line">
                    <td className="px-3 py-3 sm:px-4">{formatFullDate(entry.measured_on)}</td>
                    <td className="px-3 py-3 tabular-nums sm:px-4">
                      <span className="block">{formatJin(entry.weight_kg)}</span>
                      <span className="mt-0.5 block text-xs text-sage">{formatKg(entry.weight_kg)}</span>
                    </td>
                    <td className="px-3 py-3 tabular-nums sm:px-4">{calculateBmi(entry.weight_kg, selectedPerson.height_cm).toFixed(1)}</td>
                    <td className="hidden px-3 py-3 text-sage sm:table-cell sm:px-4">{entry.note ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-line">
                  <td className="px-3 py-8 text-center text-sage sm:px-4" colSpan={4}>
                    还没有记录，保存第一条体重后这里会显示历史。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function ReportsPage() {
  const { data, error, isLoading, person, entries, goal, setPersonId } = useSelectedPerson()
  const [range, setRange] = useState<TrendRange>('30')
  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data || !person) return <LoginPrompt />
  const chartEntries = filterEntriesByRange(entries, range)
  const summary = getRangeSummary(chartEntries, person)
  const phase = getPhaseComparison(chartEntries)
  const bmiDistribution = getBmiDistribution(chartEntries, person)
  const longestStreak = getLongestStreakDays(chartEntries)
  const latest = getLatestEntry(entries)
  const goalRemainingKg =
    goal && latest ? Math.abs(latest.weight_kg - goal.target_weight_kg) : null

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"><RangePicker value={range} onChange={setRange} /><PersonPicker people={data.people} value={person.id} onChange={setPersonId} /></div>
      <Panel>
        <PageSectionTitle title="区间概览" body="把这一段时间的记录质量、波动和趋势速度拆开看。" />
        {summary ? (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MetricTile
              label="记录率"
              value={`${summary.recordRate}%`}
              detail={`${summary.count}/${summary.spanDays} 天`}
            />
            <MetricTile
              label="区间均重"
              value={formatJin(summary.averageWeightKg)}
              detail="记录平均值"
            />
            <MetricTile
              label="最高 / 最低"
              value={`${kgToJin(summary.maxWeightKg).toFixed(1)} / ${kgToJin(summary.minWeightKg).toFixed(1)}`}
              detail={`${summary.maxDate} / ${summary.minDate}`}
            />
            <MetricTile
              label="区间变化"
              value={formatDelta(summary.changeKg)}
              detail="首条到最新"
              tone={summary.changeKg <= 0 ? 'good' : 'warn'}
            />
            <MetricTile
              label="日均波动"
              value={formatJin(summary.averageSwingKg)}
              detail="相邻记录平均波动"
            />
            <MetricTile
              label="30天预测"
              value={formatDelta(summary.projected30DayChangeKg)}
              detail={`当前 BMI ${summary.latestBmi.toFixed(1)} · ${summary.bmiLabel}`}
              tone={summary.projected30DayChangeKg <= 0 ? 'good' : 'warn'}
            />
          </div>
        ) : (
          <EmptyState title="暂无概览" body="当前区间没有记录，换一个范围或先添加体重记录。" />
        )}
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PageSectionTitle title="体重趋势" body="原始记录与移动均值" />
          {chartEntries.length ? <WeightTrendChart person={person} entries={chartEntries} /> : <EmptyState title="暂无趋势" body="添加体重记录后，这里会显示变化曲线。" />}
        </Panel>
        <Panel>
          <PageSectionTitle title="BMI 区间变化" body="基于成员身高自动计算" />
          {chartEntries.length ? <BmiChart person={person} entries={chartEntries} /> : <EmptyState title="暂无 BMI 数据" body="BMI 会根据体重和身高自动计算。" />}
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PageSectionTitle title="趋势解读" body="把区间切成前后两段，看变化是不是真的在发生。" />
          {phase && summary ? (
            <div className="mt-5 space-y-3">
              <InsightRow
                label="前半段均重"
                value={formatJin(phase.firstAverageKg)}
                detail="区间前半部分记录均值"
              />
              <InsightRow
                label="后半段均重"
                value={formatJin(phase.secondAverageKg)}
                detail={`比前半段${phase.changeKg <= 0 ? '少' : '多'} ${Math.abs(phase.changeKg * 2).toFixed(1)} 斤`}
                tone={phase.changeKg <= 0 ? 'good' : 'warn'}
              />
              <InsightRow
                label="稳定性"
                value={getStabilityLabel(summary.averageSwingKg)}
                detail={`日均波动 ${kgToJin(summary.averageSwingKg).toFixed(1)} 斤`}
              />
              <InsightRow
                label="最长连续"
                value={`${longestStreak} 天`}
                detail="当前筛选区间内最长连续记录"
              />
            </div>
          ) : (
            <EmptyState title="数据还不够" body="至少 4 条记录后，可以看到前后阶段对比。" />
          )}
        </Panel>
        <Panel>
          <PageSectionTitle title="健康区间" body="看这段时间 BMI 分布，以及距离目标还差多少。" />
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <BmiBand label="偏低" value={bmiDistribution.low} />
              <BmiBand label="健康" value={bmiDistribution.healthy} tone="good" />
              <BmiBand label="偏高" value={bmiDistribution.high} tone="warn" />
              <BmiBand label="肥胖" value={bmiDistribution.obese} tone="danger" />
            </div>
            <div className="rounded-md border border-line bg-mist/60 p-3">
              <p className="text-xs font-medium text-sage-dark">目标剩余</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
                {goalRemainingKg === null ? '--' : `${(goalRemainingKg * 2).toFixed(1)} 斤`}
              </p>
              <p className="mt-1 text-xs text-sage">
                {goal ? `目标 ${formatJin(goal.target_weight_kg)}` : '还没有设置目标体重'}
              </p>
            </div>
          </div>
        </Panel>
      </div>
      <Panel>
        <PageSectionTitle title="家庭成员对比" body="展示每位成员的最新体重与 BMI。" />
        <HouseholdCompareChart people={data.people} entries={data.entries} />
      </Panel>
    </div>
  )
}

function HouseholdPage() {
  const { data, error, isLoading } = useAppData()
  const addPerson = useUpsertPerson()
  const [draft, setDraft] = useState({
    name: '',
    heightCm: '',
    birthDate: '',
    relationship: '',
  })
  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data) return <LoginPrompt />
  const canManageMembers = data.permissions.canManageMembers

  function submitPerson(event: FormEvent) {
    event.preventDefault()
    const heightCm = Number(draft.heightCm)
    if (!draft.name.trim() || !Number.isFinite(heightCm)) return
    addPerson.mutate(
      {
        name: draft.name.trim(),
        heightCm,
        birthDate: draft.birthDate || null,
        relationship: draft.relationship.trim() || null,
      },
      {
        onSuccess: () => {
          setDraft({ name: '', heightCm: '', birthDate: '', relationship: '' })
        },
      },
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr] lg:gap-6">
      <Panel>
        <PageSectionTitle title={data.household.name} body="成员资料用于区分记录对象，并参与 BMI 和报表计算。" />
        <div className="mt-5 grid gap-3">
          {data.people.map((person) => (
            <div key={person.id} className="flex items-center justify-between rounded-lg border border-line bg-white p-4">
              <div>
                <p className="font-medium text-ink">{person.name}</p>
                <p className="mt-1 text-sm text-sage">{person.height_cm} cm · {formatBirthDate(person.birth_date)}</p>
              </div>
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-sage-dark">
                {person.profile_id ? '账号成员' : '家庭资料'}
              </span>
            </div>
          ))}
        </div>
        <Link
          to="/settings"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink transition hover:border-sage hover:bg-mist"
        >
          编辑个人资料
        </Link>
      </Panel>
      {canManageMembers ? (
        <Panel>
          <PageSectionTitle title="添加成员" body="管理员可以把老婆或其他家庭成员加入同一账号下记录。" />
          <form className="mt-5 grid gap-3" onSubmit={submitPerson}>
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                placeholder="例如：王小雨"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>身高 cm</Label>
                <Input
                  inputMode="numeric"
                  placeholder="165"
                  value={draft.heightCm}
                  onChange={(event) => setDraft({ ...draft, heightCm: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>出生日期</Label>
                <Input
                  type="date"
                  value={draft.birthDate}
                  onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>关系</Label>
              <Input
                placeholder="例如：老婆"
                value={draft.relationship}
                onChange={(event) => setDraft({ ...draft, relationship: event.target.value })}
              />
            </div>
            <Button type="submit" disabled={addPerson.isPending || !draft.name.trim() || !draft.heightCm}>
              {addPerson.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Users size={16} />}
              {addPerson.isPending ? '添加中...' : '添加成员'}
            </Button>
          </form>
        </Panel>
      ) : null}
    </div>
  )
}

function SettingsPage() {
  const auth = useCurrentUser()
  const appData = useAppData(Boolean(auth.data))
  const { data } = appData
  const queryClient = useQueryClient()
  const [forceSignedOut, setForceSignedOut] = useState(false)
  const isSignedIn = Boolean(auth.data) && !forceSignedOut
  const isSignedOut = forceSignedOut || (!auth.data && isAuthenticationError(auth.error))
  const currentPerson = data?.people[0]
  const currentPersonEntryCount =
    data && currentPerson
      ? data.entries.filter((entry) => entry.tracked_person_id === currentPerson.id).length
      : 0
  const currentPersonEntries = useMemo(
    () =>
      data && currentPerson
        ? data.entries.filter((entry) => entry.tracked_person_id === currentPerson.id)
        : [],
    [data, currentPerson],
  )
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const effectiveHeightCm = heightCm || String(currentPerson?.height_cm ?? 170)
  const effectiveBirthDate = birthDate || currentPerson?.birth_date || ''
  const effectiveDisplayName = displayName || currentPerson?.name || ''
  const personalCsv = useMemo(
    () => (data && currentPerson ? exportEntriesCsv(currentPersonEntries, [currentPerson]) : ''),
    [currentPerson, currentPersonEntries, data],
  )
  const householdCsv = useMemo(
    () => (data ? exportEntriesCsv(data.entries, data.people) : ''),
    [data],
  )
  const backupJson = useMemo(
    () => (data ? exportBackupJson(data) : ''),
    [data],
  )

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setIsSigningIn(true)
    setAuthMessage('')
    try {
      queryClient.removeQueries({ queryKey: ['app-data'] })
      queryClient.removeQueries({ queryKey: ['current-user'] })
      await loginWithPassword(username, password)
      setForceSignedOut(false)
      setAuthMessage('登录成功。')
      setProfileMessage('')
      setDisplayName('')
      setHeightCm('')
      setBirthDate('')
      setUsername('')
      setPassword('')
      await Promise.all([
        auth.refetch(),
        appData.refetch(),
      ])
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '登录失败')
    } finally {
      setIsSigningIn(false)
    }
  }

  async function signOut() {
    setIsSigningOut(true)
    try {
      await logout().catch(() => undefined)
      queryClient.removeQueries({ queryKey: ['app-data'] })
      queryClient.removeQueries({ queryKey: ['current-user'] })
      setForceSignedOut(true)
      setAuthMessage('已退出登录。')
      setProfileMessage('')
      setDisplayName('')
      setHeightCm('')
      setBirthDate('')
    } finally {
      setIsSigningOut(false)
    }
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (!isSignedIn) {
      setProfileMessage('请先登录后再保存个人参数。')
      return
    }
    const nextHeight = Number(effectiveHeightCm)
    const nextDisplayName = effectiveDisplayName.trim()
    if (!nextDisplayName) {
      setProfileMessage('姓名不能为空。')
      return
    }
    if (!Number.isFinite(nextHeight) || nextHeight < 80 || nextHeight > 250) {
      setProfileMessage('身高需要在 80-250 cm 之间。')
      return
    }
    setIsSavingProfile(true)
    setProfileMessage('')
    updateProfile({
      displayName: nextDisplayName,
      heightCm: nextHeight,
      birthDate: effectiveBirthDate || null,
    })
      .then(() => {
        setDisplayName(nextDisplayName)
        setHeightCm(String(nextHeight))
        setBirthDate(effectiveBirthDate)
        setProfileMessage('个人参数已保存到账号，BMI 会按新资料计算。')
        void queryClient.invalidateQueries({ queryKey: ['app-data'] })
      })
      .catch((error: unknown) => {
        setProfileMessage(error instanceof Error ? error.message : '身高保存失败')
      })
      .finally(() => {
        setIsSavingProfile(false)
      })
  }

  if (auth.isLoading || (isSignedIn && appData.isLoading)) {
    return (
      <ScreenLoading
        title="正在确认登录状态"
        body="正在读取你的账号信息，确认完成前不会显示登录表单。"
      />
    )
  }

  if (!isSignedIn && !isSignedOut) {
    return (
      <Panel className="mx-auto max-w-xl">
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-mist text-sage-dark">
            <UserRoundCheck size={22} />
          </div>
          <p className="mt-5 font-display text-2xl font-semibold text-ink">暂时无法确认登录状态</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-sage">
            {auth.error instanceof Error ? auth.error.message : '账号信息读取失败，请稍后重试。'}
          </p>
          <div className="mt-6 grid w-full max-w-xs gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => void auth.refetch()}>
              重新检查
            </Button>
            <Button type="button" onClick={() => void signOut()} disabled={isSigningOut}>
              {isSigningOut ? <LoaderCircle className="animate-spin" size={16} /> : <LogOut size={16} />}
              {isSigningOut ? '清除中' : '重新登录'}
            </Button>
          </div>
        </div>
      </Panel>
    )
  }

  if (isSignedIn && (appData.error || !data)) {
    return (
      <Panel className="mx-auto max-w-xl">
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-gold/20 text-amber-800">
            <UserRoundCheck size={22} />
          </div>
          <p className="mt-5 font-display text-2xl font-semibold text-ink">账号已登录，资料暂未加载</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-sage">
            当前账号：{auth.data?.displayName || auth.data?.username}。你可以重试资料加载，或清除当前状态后改用其他账号登录。
          </p>
          <div className="mt-6 grid w-full max-w-xs gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => void appData.refetch()}>
              重新加载
            </Button>
            <Button type="button" onClick={() => void signOut()} disabled={isSigningOut}>
              {isSigningOut ? <LoaderCircle className="animate-spin" size={16} /> : <LogOut size={16} />}
              {isSigningOut ? '清除中' : '切换账号'}
            </Button>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <Panel>
        <PageSectionTitle
          title="账号"
          body={isSignedIn ? '训练与身体数据会保存在你的账号下。' : '登录后，训练计划和身体趋势会跟随账号保存。'}
        />
        {isSignedIn ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-sage-dark">
                <UserRoundCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{currentPerson?.name ?? auth.data?.displayName ?? auth.data?.username ?? '已登录账号'}</p>
                <p className="text-xs text-sage">{currentPersonEntryCount} 条体重记录</p>
              </div>
            </div>
            <Button type="button" variant="secondary" className="w-full" onClick={signOut} disabled={isSigningOut}>
              {isSigningOut ? <LoaderCircle className="animate-spin" size={16} /> : <LogOut size={16} />}
              {isSigningOut ? '退出中...' : '退出登录'}
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            <Button
              type="button"
              onClick={() => window.location.assign(unifiedLoginUrl('weight'))}
            >
              <LogIn size={16} />
              使用统一账号登录
            </Button>
            <div className="flex items-center gap-3 py-1 text-xs text-sage">
              <span className="h-px flex-1 bg-line" />
              迁移期间旧账号登录
              <span className="h-px flex-1 bg-line" />
            </div>
            <form className="grid gap-3" onSubmit={signIn}>
            <Input
              autoComplete="username"
              disabled={isSigningIn}
              placeholder="用户名"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <Input
              autoComplete="current-password"
              disabled={isSigningIn}
              placeholder="密码"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={!username || !password || isSigningIn}>
              {isSigningIn ? <LoaderCircle className="animate-spin" size={16} /> : <LogIn size={16} />}
              {isSigningIn ? '登录中...' : '使用旧账号登录'}
            </Button>
            </form>
          </div>
        )}
        {authMessage ? <p className="mt-3 text-sm text-sage-dark">{authMessage}</p> : null}
      </Panel>
      <Panel>
        <PageSectionTitle
          title="个人参数"
          body={isSignedIn ? '姓名、身高和出生日期会保存到当前账号。' : '登录后再设置个人参数，资料会保存到账号。'}
        />
        {isSignedIn ? (
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={saveProfile}>
            <div className="space-y-2 sm:col-span-2">
              <Label>姓名</Label>
              <Input
                placeholder="例如：唐涛"
                disabled={isSavingProfile}
                value={effectiveDisplayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>身高 cm</Label>
              <Input
                inputMode="numeric"
                disabled={isSavingProfile}
                placeholder="170"
                value={effectiveHeightCm}
                onChange={(event) => setHeightCm(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>出生日期</Label>
              <Input
                type="date"
                disabled={isSavingProfile}
                value={effectiveBirthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>
            <Button type="submit" className="sm:col-span-2" disabled={isSavingProfile}>
              {isSavingProfile ? <LoaderCircle className="animate-spin" size={16} /> : null}
              {isSavingProfile ? '保存中...' : '保存资料'}
            </Button>
          </form>
        ) : (
          <EmptyState title="请先登录" body="登录后可以保存身高和出生日期。" />
        )}
        {profileMessage ? <p className="mt-3 text-sm text-sage-dark">{profileMessage}</p> : null}
      </Panel>
      {isSignedIn ? <div className="lg:col-span-2"><HouseholdPage /></div> : null}
      <Panel>
        <PageSectionTitle title="数据管理" body="本人和家庭数据分开导出，避免成员记录混在一起。" />
        <div className="mt-5 grid gap-3">
          <div className="rounded-md border border-line bg-mist/50 p-3">
            <p className="text-sm font-semibold text-ink">本人数据</p>
            <p className="mt-1 text-xs text-sage">{currentPersonEntryCount} 条记录，CSV 包含斤和 kg。</p>
            <Button className="mt-3 w-full" variant="secondary" onClick={() => downloadCsv('my-weight-entries.csv', personalCsv)} disabled={!data || !currentPerson}>
              <Download size={16} />
              导出本人 CSV
            </Button>
          </div>
          <div className="rounded-md border border-line bg-white p-3">
            <p className="text-sm font-semibold text-ink">家庭数据</p>
            <p className="mt-1 text-xs text-sage">{data?.entries.length ?? 0} 条记录，包含所有家庭成员。</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => downloadCsv('household-weight-entries.csv', householdCsv)} disabled={!data}>
                <Download size={16} />
                导出家庭 CSV
              </Button>
              <Button variant="secondary" onClick={() => downloadJson('weight-backup.json', backupJson)} disabled={!data}>
                <Download size={16} />
                导出备份
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-sage">
          CSV 适合表格分析；备份文件包含家庭成员、记录和目标数据。
        </p>
      </Panel>
    </div>
  )
}

function PageIntro({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-4 md:gap-5 md:pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-dark md:text-xs md:tracking-[0.18em]">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl font-display text-[2.35rem] font-semibold leading-[1.05] text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-sage md:text-base">{body}</p>
      </div>
      {action}
    </div>
  )
}

function PageSectionTitle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-sage">{body}</p>
    </div>
  )
}

function MetricTile({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string
  value: string
  detail: string
  tone?: 'default' | 'good' | 'warn'
}) {
  return (
    <div className="min-h-28 rounded-md border border-line bg-white p-3">
      <p className="text-xs font-medium text-sage-dark">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold leading-tight tabular-nums ${
          tone === 'good' ? 'text-sage-dark' : tone === 'warn' ? 'text-coral' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-4 text-sage">{detail}</p>
    </div>
  )
}

function InsightRow({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string
  value: string
  detail: string
  tone?: 'default' | 'good' | 'warn'
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-line bg-white p-3">
      <div>
        <p className="text-xs font-medium text-sage-dark">{label}</p>
        <p className="mt-1 text-xs leading-5 text-sage">{detail}</p>
      </div>
      <p
        className={`shrink-0 text-right text-lg font-semibold tabular-nums ${
          tone === 'good' ? 'text-sage-dark' : tone === 'warn' ? 'text-coral' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function BmiBand({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'good' | 'warn' | 'danger'
}) {
  const color =
    tone === 'good'
      ? 'bg-sage-dark'
      : tone === 'warn'
        ? 'bg-gold'
        : tone === 'danger'
          ? 'bg-coral'
          : 'bg-sage'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-sage-dark">{label}</span>
        <span className="tabular-nums text-sage">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mist">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ScreenLoading({
  title = '正在同步数据',
  body = '正在读取账号、成员和体重记录，网络慢时请稍等一下。',
}: {
  title?: string
  body?: string
} = {}) {
  return (
    <Panel className="mx-auto max-w-xl">
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-mint text-sage-dark">
          <LoaderCircle className="animate-spin" size={22} />
        </div>
        <p className="mt-5 font-display text-2xl font-semibold text-ink">{title}</p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-sage">{body}</p>
        <div className="mt-6 grid w-full max-w-xs gap-2">
          <div className="h-2 animate-pulse rounded-full bg-mist" />
          <div className="mx-auto h-2 w-2/3 animate-pulse rounded-full bg-mist" />
        </div>
      </div>
    </Panel>
  )
}

function formatBirthDate(birthDate: string | null) {
  return birthDate ? `出生 ${birthDate}` : '未填出生日期'
}

function LoginPrompt() {
  return (
    <Panel className="mx-auto max-w-xl">
      <div className="py-6 text-center">
        <p className="font-display text-3xl font-semibold text-ink">先登录，再开始</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-sage">
          训练计划、训练记录与体重趋势会同步到你的账号。
        </p>
        <Link
          to="/settings"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sage-dark px-5 text-sm font-medium text-white shadow-sm"
        >
          <LogIn size={16} />
          去登录
        </Link>
      </div>
    </Panel>
  )
}

function formatDelta(value: number | null) {
  if (value === null) return '--'
  const jin = value * 2
  if (jin === 0) return '0.0 斤'
  return `${jin > 0 ? '+' : ''}${jin.toFixed(1)} 斤`
}
