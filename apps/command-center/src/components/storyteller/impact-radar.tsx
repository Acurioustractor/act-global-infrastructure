'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import type { ImpactRadarEntry } from '@/lib/api'

const DIMENSION_LABELS: Record<string, string> = {
  healing: 'Healing',
  identity: 'Identity',
  empowerment: 'Empowerment',
  capability: 'Capability',
  connection: 'Connection',
  sovereignty: 'Sovereignty',
  landConnection: 'Land',
  sustainability: 'Sustainability',
}

const PROJECT_COLORS = [
  '#f472b6',
  '#818cf8',
  '#34d399',
  '#fbbf24',
  '#60a5fa',
  '#a78bfa',
  '#f87171',
  '#2dd4bf',
]

export function ImpactRadar({ radarData }: { radarData: ImpactRadarEntry[] | undefined }) {
  if (!radarData || radarData.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-white/40 text-sm h-[400px] flex items-center justify-center">
        No impact data available
      </div>
    )
  }

  // Transform data for recharts radar format
  const dimensions = Object.keys(DIMENSION_LABELS)
  const chartData = dimensions.map((dim) => {
    const entry: Record<string, string | number> = {
      dimension: DIMENSION_LABELS[dim],
    }
    for (const project of radarData) {
      entry[project.project] = Number(
        (project[dim as keyof ImpactRadarEntry] as number || 0).toFixed(2)
      )
    }
    return entry
  })

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4">
        ALMA Impact by Project
      </h3>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#ffffff15" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#ffffff80', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1]}
              tick={{ fill: '#ffffff40', fontSize: 10 }}
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
            <Legend wrapperStyle={{ fontSize: '11px', color: '#ffffff80' }} />
            {radarData.map((project, i) => (
              <Radar
                key={project.project}
                name={project.project}
                dataKey={project.project}
                stroke={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                fill={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
