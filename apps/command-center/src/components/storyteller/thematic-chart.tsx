'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ThemeChartEntry } from '@/lib/api'

const PROJECT_COLORS = [
  '#f472b6', // pink
  '#818cf8', // indigo
  '#34d399', // emerald
  '#fbbf24', // amber
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f87171', // red
  '#2dd4bf', // teal
  '#fb923c', // orange
  '#c084fc', // purple
]

export function ThematicChart({
  chartData,
  projectNames,
}: {
  chartData: ThemeChartEntry[] | undefined
  projectNames: string[] | undefined
}) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-white/40 text-sm h-[400px] flex items-center justify-center">
        No theme data available
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4">Themes by Project</h3>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <XAxis type="number" stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 11 }} />
            <YAxis
              dataKey="theme"
              type="category"
              width={160}
              tick={{ fill: '#ffffff80', fontSize: 11 }}
              stroke="#ffffff10"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#131928',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#ffffff80' }}
            />
            {(projectNames || []).map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="themes"
                fill={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                radius={i === (projectNames || []).length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
