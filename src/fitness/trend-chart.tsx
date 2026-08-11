import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FitnessTrendPoint } from '@/lib/types'

export function FitnessTrendChart({ data }: { data: FitnessTrendPoint[] }) {
  const points = data.map((point) => ({
    ...point,
    label: `${point.date.slice(5, 7)}/${point.date.slice(8, 10)}`,
  }))

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 10, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="fitnessStrengthFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#d8f96f" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#d8f96f" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dfe6e1" strokeDasharray="4 8" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={42} />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)} kg`, '估算 1RM']}
            labelFormatter={(label) => `训练日期 ${label}`}
            contentStyle={{
              border: '1px solid #dfe6e1',
              borderRadius: 12,
              boxShadow: '0 12px 36px rgba(33,45,40,.12)',
            }}
          />
          <Area
            type="monotone"
            dataKey="estimatedOneRepMaxKg"
            name="估算 1RM"
            stroke="#355e4d"
            strokeWidth={2.5}
            fill="url(#fitnessStrengthFill)"
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
