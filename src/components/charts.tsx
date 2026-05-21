import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrackedPerson, WeightEntry } from '@/lib/types'
import { buildTrend, calculateBmi, getLatestEntry } from '@/lib/metrics'
import { formatDate, kgToJin } from '@/lib/utils'

type ChartProps = {
  person: TrackedPerson
  entries: WeightEntry[]
}

export function WeightTrendChart({ person, entries }: ChartProps) {
  const data = buildTrend(entries, person).map((point) => ({
    ...point,
    weight: kgToJin(point.weight),
    movingAverage: kgToJin(point.movingAverage),
    label: formatDate(point.date),
  }))

  return (
    <div className="h-[230px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="weightFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#6f8f7c" stopOpacity={0.32} />
            <stop offset="95%" stopColor="#6f8f7c" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#dfe6e1" strokeDasharray="4 8" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
        <Tooltip
          formatter={(value, name) => [`${Number(value).toFixed(1)} 斤`, name]}
          labelFormatter={(label) => `${label}`}
          contentStyle={{
            border: '1px solid #dfe6e1',
            borderRadius: 8,
            boxShadow: '0 12px 36px rgba(33,45,40,.12)',
          }}
        />
        <Area type="monotone" dataKey="weight" name="体重 斤" stroke="#355e4d" strokeWidth={2.5} fill="url(#weightFill)" isAnimationActive={false} />
        <Line type="monotone" dataKey="movingAverage" name="移动均值 斤" stroke="#caa760" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BmiChart({ person, entries }: ChartProps) {
  const data = buildTrend(entries, person).map((point) => ({
    label: formatDate(point.date),
    bmi: point.bmi,
  }))

  return (
    <div className="h-[220px] sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#dfe6e1" strokeDasharray="4 8" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[18, 30]} />
        <Tooltip
          formatter={(value) => Number(value).toFixed(1)}
          contentStyle={{ border: '1px solid #dfe6e1', borderRadius: 8 }}
        />
        <Line type="monotone" dataKey="bmi" name="BMI" stroke="#f16f5b" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function HouseholdCompareChart({
  people,
  entries,
}: {
  people: TrackedPerson[]
  entries: WeightEntry[]
}) {
  const data = people.map((person) => {
    const latest = getLatestEntry(
      entries.filter((entry) => entry.tracked_person_id === person.id),
    )
    return {
      name: person.name,
      weight: latest ? kgToJin(latest.weight_kg) : 0,
      bmi: latest ? calculateBmi(latest.weight_kg, person.height_cm) : 0,
    }
  })

  return (
    <div className="h-[230px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="#dfe6e1" strokeDasharray="4 8" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip
          formatter={(value, name) => [
            name === '体重 斤' ? `${Number(value).toFixed(1)} 斤` : Number(value).toFixed(1),
            name,
          ]}
          contentStyle={{ border: '1px solid #dfe6e1', borderRadius: 8 }}
        />
        <Bar dataKey="weight" name="体重 斤" fill="#6f8f7c" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="bmi" name="BMI" fill="#caa760" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
