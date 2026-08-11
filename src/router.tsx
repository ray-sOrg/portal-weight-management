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
} from '@tanstack/react-router'
import {
  Activity,
  ChartNoAxesCombined,
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
import { Button, EmptyState, Input, Label, Panel, Stat } from './components/ui'
import { downloadCsv, downloadJson, exportBackupJson, exportEntriesCsv } from './lib/csv'
import {
  calculateBmi,
  filterEntriesByRange,
  getBmiLabel,
  getFirstEntry,
  getBestGoalProgressFromEntries,
  getGoalProgressFromEntries,
  getInsights,
  getRangeSummary,
  getLatestEntry,
  getBmiDistribution,
  getLongestStreakDays,
  getPhaseComparison,
  getStreakDays,
  getStabilityLabel,
  getWeightChange,
  sortEntries,
  type TrendRange,
} from './lib/metrics'
import { useAddWeightEntry, useAppData, useUpsertGoal, useUpsertPerson } from './lib/queries'
import {
  isAuthenticationError,
  loginWithPassword,
  logout,
  updateProfile,
} from './lib/server-api'
import type { TrackedPerson } from './lib/types'
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
  path: '/entries',
  component: EntriesPage,
})

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
})

const householdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/household',
  component: HouseholdPage,
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
  householdRoute,
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
  { to: '/', label: '仪表盘', icon: Home },
  { to: '/fitness', label: '健身', icon: Dumbbell },
  { to: '/entries', label: '记录', icon: Plus },
  { to: '/reports', label: '报表', icon: ChartNoAxesCombined },
  { to: '/household', label: '家庭', icon: Users },
  { to: '/settings', label: '设置', icon: Settings },
] as const

function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-mist/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 md:py-3 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 md:gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-sage-dark text-white md:size-10">
              <Scale size={18} />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-ink md:text-xl">
                体重管理
              </span>
              <span className="block text-[11px] text-sage md:text-xs">家庭趋势与目标追踪</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
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
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line bg-white/96 px-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_34px_rgba(33,45,40,0.08)] backdrop-blur md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
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
  const { data, error, isLoading, person, entries, goal, setPersonId } = useSelectedPerson()
  const [range, setRange] = useState<TrendRange>('30')
  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data || !person) return <LoginPrompt />

  const chartEntries = filterEntriesByRange(entries, range)
  const latest = getLatestEntry(entries)
  const bmi = latest ? calculateBmi(latest.weight_kg, person.height_cm) : 0
  const first = getFirstEntry(entries)
  const progress = getGoalProgressFromEntries(entries, goal)
  const bestProgress = getBestGoalProgressFromEntries(entries, goal)
  const goalDetail = goal && latest && first
    ? `${formatJin(Math.abs(first.weight_kg - latest.weight_kg))} / ${formatJin(Math.abs(first.weight_kg - goal.target_weight_kg))}`
    : goal
      ? `${formatJin(goal.target_weight_kg)} 目标`
      : '未设置目标'
  const insights = getInsights(entries, goal, person)

  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        eyebrow={data.household.name}
        title="今天的身体趋势，一眼看清"
        body="记录保持轻量，趋势保持可靠。家庭成员的数据在同一个空间里有序呈现。"
        action={
          <PersonPicker
            people={data.people}
            value={person.id}
            onChange={setPersonId}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link
          to="/entries"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sage-dark px-4 text-sm font-medium text-white shadow-sm"
        >
          <Plus size={16} />
          记一笔
        </Link>
        <Link
          to="/reports"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-sage-dark"
        >
          <ChartNoAxesCombined size={16} />
          看趋势
        </Link>
      </div>

      <Panel>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          <Stat label="最新体重" value={latest ? formatJin(latest.weight_kg) : '--'} detail={latest ? formatFullDate(latest.measured_on) : '暂无记录'} />
          <Stat label="BMI" value={latest ? bmi.toFixed(1) : '--'} detail={latest ? getBmiLabel(bmi) : '需要身高和体重'} tone="good" />
          <Stat label="7 天变化" value={formatDelta(getWeightChange(entries, 7))} detail="相对最近可比记录" />
          <GoalProgressStat
            label="目标进度"
            value={progress === null ? '--' : `${progress}%`}
            detail={goalDetail}
            best={bestProgress ? `历史最佳 ${bestProgress.progress}%` : undefined}
          />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <Panel>
          <div className="mb-3 flex items-start justify-between md:mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold md:text-2xl">体重趋势</h2>
              <p className="mt-1 text-sm text-sage">含三次记录移动均值，减少日波动误读。</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Activity className="text-sage-dark" size={22} />
              <RangePicker value={range} onChange={setRange} />
            </div>
          </div>
          {chartEntries.length ? <WeightTrendChart person={person} entries={chartEntries} /> : <EmptyState title="暂无趋势" body="添加至少一条记录后开始绘图。" />}
        </Panel>

        <Panel>
          <h2 className="font-display text-xl font-semibold md:text-2xl">洞察提醒</h2>
          <div className="mt-4 space-y-3">
            {insights.map((insight) => (
              <div key={insight} className="rounded-md border border-line bg-mist/60 p-3 text-sm leading-6 text-ink">
                {insight}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md bg-sage-dark p-4 text-white">
            <p className="text-xs opacity-80">连续记录</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{getStreakDays(entries)} 天</p>
          </div>
        </Panel>
      </div>
    </div>
  )
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
      <PageIntro
        eyebrow="Reports"
        title="趋势、BMI 和家庭对比"
        body="用少量图表覆盖最重要的变化：方向、速度、区间和成员差异。"
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <RangePicker value={range} onChange={setRange} />
            <PersonPicker people={data.people} value={person.id} onChange={setPersonId} />
          </div>
        }
      />
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
  const { data, error, isLoading, refetch } = useAppData()
  const queryClient = useQueryClient()
  const isSignedIn = Boolean(data)
  const isSignedOut = !data && isAuthenticationError(error)
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
  const [goalPersonId, setGoalPersonId] = useState('')
  const [goalWeightJin, setGoalWeightJin] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const upsertGoal = useUpsertGoal()
  const effectiveHeightCm = heightCm || String(currentPerson?.height_cm ?? 170)
  const effectiveBirthDate = birthDate || currentPerson?.birth_date || ''
  const effectiveDisplayName = displayName || currentPerson?.name || ''
  const selectedGoalPerson =
    data?.people.find((person) => person.id === goalPersonId) ?? currentPerson
  const selectedGoal = selectedGoalPerson
    ? data?.goals.find((goal) => goal.tracked_person_id === selectedGoalPerson.id)
    : null
  const selectedGoalEntries = selectedGoalPerson
    ? data?.entries.filter((entry) => entry.tracked_person_id === selectedGoalPerson.id) ?? []
    : []
  const firstGoalEntry = getFirstEntry(selectedGoalEntries)
  const effectiveGoalWeightJin =
    goalWeightJin || (selectedGoal ? kgToJin(selectedGoal.target_weight_kg).toFixed(1) : '')
  const effectiveGoalDate = goalDate || selectedGoal?.target_on || ''
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
      await loginWithPassword(username, password)
      setAuthMessage('登录成功。')
      setProfileMessage('')
      setDisplayName('')
      setHeightCm('')
      setBirthDate('')
      setUsername('')
      setPassword('')
      await queryClient.refetchQueries({ queryKey: ['app-data'] })
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

  function saveGoal(event: FormEvent) {
    event.preventDefault()
    if (!selectedGoalPerson) return
    const targetWeightKg = jinToKg(Number(effectiveGoalWeightJin))
    if (!Number.isFinite(targetWeightKg) || targetWeightKg < 20 || targetWeightKg > 300) return
    upsertGoal.mutate({
      trackedPersonId: selectedGoalPerson.id,
      startWeightKg: firstGoalEntry?.weight_kg ?? selectedGoal?.start_weight_kg ?? targetWeightKg,
      targetWeightKg,
      targetOn: effectiveGoalDate || null,
    })
    setGoalWeightJin(targetWeightKg ? kgToJin(targetWeightKg).toFixed(1) : '')
    setGoalDate(effectiveGoalDate)
  }

  if (isLoading) {
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
            {error instanceof Error ? error.message : '账号信息读取失败，请稍后重试。'}
          </p>
          <Button type="button" className="mt-6" onClick={() => void refetch()}>
            重新检查
          </Button>
        </div>
      </Panel>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <Panel>
        <PageSectionTitle
          title="账号"
          body={isSignedIn ? '体重记录会保存在你的账号下。' : '登录后开始记录体重，历史数据会跟随账号保存。'}
        />
        {isSignedIn ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-sage-dark">
                <UserRoundCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{currentPerson?.name ?? '已登录账号'}</p>
                <p className="text-xs text-sage">{currentPersonEntryCount} 条体重记录</p>
              </div>
            </div>
            <Button type="button" variant="secondary" className="w-full" onClick={signOut} disabled={isSigningOut}>
              {isSigningOut ? <LoaderCircle className="animate-spin" size={16} /> : <LogOut size={16} />}
              {isSigningOut ? '退出中...' : '退出登录'}
            </Button>
          </div>
        ) : (
          <form className="mt-5 grid gap-3" onSubmit={signIn}>
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
              {isSigningIn ? '登录中...' : '登录'}
            </Button>
          </form>
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
      <Panel>
        <PageSectionTitle
          title="目标设置"
          body={isSignedIn ? '给自己或家庭成员设置目标体重，仪表盘会自动计算进度。' : '登录后可以设置目标体重。'}
        />
        {isSignedIn && data && selectedGoalPerson ? (
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={saveGoal}>
            <div className="space-y-2 sm:col-span-2">
              <Label>成员</Label>
              <PersonPicker
                people={data.people}
                value={selectedGoalPerson.id}
                onChange={(value) => {
                  setGoalPersonId(value)
                  setGoalWeightJin('')
                  setGoalDate('')
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>目标体重</Label>
              <div className="relative">
                <Input
                  className="pr-14"
                  inputMode="decimal"
                  placeholder="130.0"
                  value={effectiveGoalWeightJin}
                  onChange={(event) => setGoalWeightJin(event.target.value)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-sage-dark">
                  斤
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>目标日期</Label>
              <Input
                type="date"
                value={effectiveGoalDate}
                onChange={(event) => setGoalDate(event.target.value)}
              />
            </div>
            <Button className="sm:col-span-2" type="submit" disabled={upsertGoal.isPending || !effectiveGoalWeightJin}>
              {upsertGoal.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Scale size={16} />}
              {upsertGoal.isPending ? '保存中...' : '保存目标'}
            </Button>
          </form>
        ) : (
          <EmptyState title="请先登录" body="登录后可以为家庭成员设置目标体重。" />
        )}
      </Panel>
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

function GoalProgressStat({
  label,
  value,
  detail,
  best,
}: {
  label: string
  value: string
  detail: string
  best?: string
}) {
  return (
    <div className="rounded-md border border-line bg-white p-3 shadow-sm md:border-l md:border-y-0 md:border-r-0 md:bg-transparent md:p-0 md:pl-4 md:shadow-none">
      <p className="text-xs font-medium text-sage-dark">{label}</p>
      <p className="mt-1 text-[1.65rem] font-semibold leading-none tabular-nums text-ink md:text-2xl md:leading-normal">
        {value}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2 text-xs leading-4 md:mt-1">
        <span className="min-w-0 text-sage">{detail}</span>
        {best ? <span className="shrink-0 text-right text-sage">{best}</span> : null}
      </div>
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
        <p className="font-display text-3xl font-semibold text-ink">先登录，再记录</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-sage">
          体重数据会同步到你的账号。登录后可以查看趋势、历史记录和导出数据。
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
