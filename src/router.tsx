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
  Home,
  LogIn,
  LogOut,
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
import { downloadCsv, exportEntriesCsv } from './lib/csv'
import {
  calculateBmi,
  getBmiLabel,
  getGoalProgress,
  getInsights,
  getLatestEntry,
  getStreakDays,
  getWeightChange,
  sortEntries,
} from './lib/metrics'
import { useAddWeightEntry, useAppData } from './lib/queries'
import {
  loginWithPassword,
  logout,
  readProfileHeight,
  writeProfileHeight,
} from './lib/server-api'
import type { TrackedPerson } from './lib/types'
import { formatFullDate, formatKg, todayISO } from './lib/utils'

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

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  entriesRoute,
  reportsRoute,
  householdRoute,
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
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_34px_rgba(33,45,40,0.08)] backdrop-blur md:hidden">
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

function DashboardPage() {
  const { data, error, isLoading, person, entries, goal, setPersonId } = useSelectedPerson()
  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data || !person) return <LoginPrompt />

  const latest = getLatestEntry(entries)
  const bmi = latest ? calculateBmi(latest.weight_kg, person.height_cm) : 0
  const progress = latest ? getGoalProgress(latest.weight_kg, goal) : null
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
          <Stat label="最新体重" value={latest ? formatKg(latest.weight_kg) : '--'} detail={latest ? formatFullDate(latest.measured_on) : '暂无记录'} />
          <Stat label="BMI" value={latest ? bmi.toFixed(1) : '--'} detail={latest ? getBmiLabel(bmi) : '需要身高和体重'} tone="good" />
          <Stat label="7 天变化" value={formatDelta(getWeightChange(entries, 7))} detail="相对最近可比记录" />
          <Stat label="目标进度" value={progress === null ? '--' : `${progress}%`} detail={goal ? `${formatKg(goal.target_weight_kg)} 目标` : '未设置目标'} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <Panel>
          <div className="mb-3 flex items-start justify-between md:mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold md:text-2xl">30 天体重趋势</h2>
              <p className="mt-1 text-sm text-sage">含三次记录移动均值，减少日波动误读。</p>
            </div>
            <Activity className="text-sage-dark" size={22} />
          </div>
          {entries.length ? <WeightTrendChart person={person} entries={entries} /> : <EmptyState title="暂无趋势" body="添加至少一条记录后开始绘图。" />}
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
    weightKg: '',
    note: '',
  })

  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data || !person) return <LoginPrompt />
  const selectedPerson = person

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const weight = Number(form.weightKg)
    if (!Number.isFinite(weight) || weight < 20 || weight > 300) return
    addEntry.mutate({
      trackedPersonId: selectedPerson.id,
      measuredOn: form.measuredOn,
      weightKg: weight,
      note: form.note,
    })
    setForm((current) => ({ ...current, weightKg: '', note: '' }))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr] lg:gap-6">
      <Panel>
        <PageSectionTitle title="快速记录" body="默认记录 kg，建议固定在同一时间段称重。" />
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
            <Label>体重 kg</Label>
            <Input inputMode="decimal" placeholder="66.1" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Input placeholder="晨起空腹、运动后等" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </div>
          <Button type="submit" disabled={addEntry.isPending} className="w-full">
            <Plus size={16} />
            保存记录
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
                    <td className="px-3 py-3 tabular-nums sm:px-4">{formatKg(entry.weight_kg)}</td>
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
  const { data, error, isLoading, person, entries, setPersonId } = useSelectedPerson()
  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data || !person) return <LoginPrompt />

  return (
    <div className="space-y-4 md:space-y-6">
      <PageIntro
        eyebrow="Reports"
        title="趋势、BMI 和家庭对比"
        body="用少量图表覆盖最重要的变化：方向、速度、区间和成员差异。"
        action={<PersonPicker people={data.people} value={person.id} onChange={setPersonId} />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PageSectionTitle title="体重趋势" body="原始记录与移动均值" />
          {entries.length ? <WeightTrendChart person={person} entries={entries} /> : <EmptyState title="暂无趋势" body="添加体重记录后，这里会显示变化曲线。" />}
        </Panel>
        <Panel>
          <PageSectionTitle title="BMI 区间变化" body="基于成员身高自动计算" />
          {entries.length ? <BmiChart person={person} entries={entries} /> : <EmptyState title="暂无 BMI 数据" body="BMI 会根据体重和身高自动计算。" />}
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
  if (isLoading) return <ScreenLoading />
  if (error) return <LoginPrompt />
  if (!data) return <LoginPrompt />

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr] lg:gap-6">
      <Panel>
        <PageSectionTitle title={data.household.name} body="成员资料用于 BMI、目标和报表计算。" />
        <div className="mt-5 grid gap-3">
          {data.people.map((person) => (
            <div key={person.id} className="flex items-center justify-between rounded-lg border border-line bg-white p-4">
              <div>
                <p className="font-medium text-ink">{person.name}</p>
                <p className="mt-1 text-sm text-sage">{person.height_cm} cm · {person.birth_year ?? '未填出生年'}</p>
              </div>
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-sage-dark">
                {person.profile_id ? '账号成员' : '家庭资料'}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <PageSectionTitle title="成员管理" body="后端当前提供个人体重接口；家庭成员接口接入后会在这里开放。" />
        <div className="mt-5 space-y-4 opacity-60">
          <div className="space-y-2">
            <Label>姓名</Label>
            <Input disabled placeholder="家庭成员" />
          </div>
          <div className="space-y-2">
            <Label>身高 cm</Label>
            <Input disabled inputMode="numeric" placeholder="170" />
          </div>
          <Button type="submit" className="w-full" disabled>
            <Users size={16} />
            等待后端接口
          </Button>
        </div>
      </Panel>
    </div>
  )
}

function SettingsPage() {
  const { data, error } = useAppData()
  const queryClient = useQueryClient()
  const isSignedIn = Boolean(data && !error)
  const currentPerson = data?.people[0]
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [heightCm, setHeightCm] = useState(String(readProfileHeight()))
  const [authMessage, setAuthMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const csv = useMemo(
    () => (data ? exportEntriesCsv(data.entries, data.people) : ''),
    [data],
  )

  async function signIn(event: FormEvent) {
    event.preventDefault()
    try {
      await loginWithPassword(username, password)
      setAuthMessage('登录成功。')
      setProfileMessage('')
      setUsername('')
      setPassword('')
      await queryClient.invalidateQueries({ queryKey: ['app-data'] })
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '登录失败')
    }
  }

  async function signOut() {
    await logout().catch(() => undefined)
    setAuthMessage('已退出登录。')
    setProfileMessage('')
    await queryClient.invalidateQueries({ queryKey: ['app-data'] })
  }

  function saveHeight(event: FormEvent) {
    event.preventDefault()
    const nextHeight = Number(heightCm)
    if (!Number.isFinite(nextHeight) || nextHeight < 80 || nextHeight > 250) {
      setProfileMessage('身高需要在 80-250 cm 之间。')
      return
    }
    writeProfileHeight(nextHeight)
    setProfileMessage('身高已保存，BMI 会按新身高计算。')
    void queryClient.invalidateQueries({ queryKey: ['app-data'] })
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
                <p className="text-xs text-sage">{data?.entries.length ?? 0} 条体重记录</p>
              </div>
            </div>
            <Button type="button" variant="secondary" className="w-full" onClick={signOut}>
              <LogOut size={16} />
              退出登录
            </Button>
          </div>
        ) : (
          <form className="mt-5 grid gap-3" onSubmit={signIn}>
            <Input
              autoComplete="username"
              placeholder="用户名"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <Input
              autoComplete="current-password"
              placeholder="密码"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={!username || !password}>
              <LogIn size={16} />
              登录
            </Button>
          </form>
        )}
        {authMessage ? <p className="mt-3 text-sm text-sage-dark">{authMessage}</p> : null}
      </Panel>
      <Panel>
        <PageSectionTitle title="个人参数" body="后端当前只存体重记录；身高先保存在本机，用于 BMI 计算。" />
        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={saveHeight}>
          <Input
            inputMode="numeric"
            placeholder="170"
            value={heightCm}
            onChange={(event) => setHeightCm(event.target.value)}
          />
          <Button type="submit">
            保存身高
          </Button>
        </form>
        {profileMessage ? <p className="mt-3 text-sm text-sage-dark">{profileMessage}</p> : null}
      </Panel>
      <Panel>
        <PageSectionTitle title="数据导出" body="导出家庭空间内所有体重记录，便于备份或迁移。" />
        <Button className="mt-5" variant="secondary" onClick={() => downloadCsv('weight-entries.csv', csv)} disabled={!data}>
          <Download size={16} />
          导出 CSV
        </Button>
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

function ScreenLoading() {
  return (
    <Panel>
      <div className="h-80 animate-pulse rounded-lg bg-mist" />
    </Panel>
  )
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
  if (value === 0) return '0.0 kg'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} kg`
}
